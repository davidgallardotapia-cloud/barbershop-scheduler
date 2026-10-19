const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { createGiocataReportWorkload, invalidateGiocataReportsOnWrite } = require("../src/utils/giocataReportWorkload");
const { createGiocataReportsHandler } = require("../src/utils/giocataReports");

const owner = { id: 8002, username: "veronica_giocata", business_id: "giocata" };
const req = (query = { range: "month", month: "2024-02" }) => ({ user: owner, query });
const response = () => ({ headers: {}, set(key, value) { this.headers[key] = value; },
  status(code) { this.code = code; return this; }, json(data) { this.data = data; } });

test("report workload allows one operation, expires cache and bounds memory", () => {
  let now = 0;
  const workload = createGiocataReportWorkload({ now: () => now, ttlMs: 120000, maxEntries: 2 });
  const release = workload.acquire();
  assert.equal(workload.acquire(), null);
  release();
  assert.equal(typeof workload.acquire(), "function");
  workload.put("a", 1, workload.generation);
  workload.put("b", 2, workload.generation);
  workload.put("c", 3, workload.generation);
  assert.equal(workload.get("a"), null);
  assert.equal(workload.get("b"), 2);
  now = 120000;
  assert.equal(workload.get("b"), null);
  assert.equal(workload.get("c"), null);
});

test("writes clear cached summaries and discard in-flight old snapshots", () => {
  const workload = createGiocataReportWorkload();
  const generation = workload.generation;
  workload.put("old", {}, generation);
  workload.invalidate();
  workload.put("late", {}, generation);
  assert.equal(workload.get("old"), null);
  assert.equal(workload.get("late"), null);
  workload.put("fresh", 42, workload.generation);
  assert.equal(workload.get("fresh"), 42);
});

test("booking, series, payment, webhook and attendance successes invalidate reports", () => {
  const workload = createGiocataReportWorkload();
  const middleware = invalidateGiocataReportsOnWrite(workload);
  for (const path of ["/appointments", "/appointments/monthly", "/appointments/1",
    "/appointments/1/opponent", "/appointments/1/payments", "/appointments/1/payments/2",
    "/payments/mercadopago/webhook", "/admin/giocata/reports/attendance/1"]) {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      const res = new EventEmitter();
      res.statusCode = 200;
      let next = false;
      workload.put("summary", 1, workload.generation);
      middleware({ path, method }, res, () => { next = true; });
      assert.equal(next, true);
      assert.equal(workload.get("summary"), 1);
      res.emit("finish");
      assert.equal(workload.get("summary"), null, `${method} ${path}`);
    }
  }
  for (const [method, path, statusCode] of [["GET", "/appointments", 200],
    ["POST", "/appointments", 409], ["POST", "/login", 200], ["GET", "/admin/giocata/reports", 200]]) {
    const res = new EventEmitter();
    res.statusCode = statusCode;
    workload.put("summary", 1, workload.generation);
    middleware({ method, path }, res, () => {});
    res.emit("finish");
    assert.equal(workload.get("summary"), 1);
  }
});

test("summary cache always rechecks the current owner and preserves calculation time", async () => {
  const workload = createGiocataReportWorkload();
  let accountExists = true;
  let summaries = 0;
  let accounts = 0;
  let released = 0;
  const queries = [];
  const pool = { connect: async () => ({ query: async sql => {
    queries.push(sql);
    if (sql.startsWith("SELECT id FROM users")) { accounts++; return { rowCount: accountExists ? 1 : 0 }; }
    if (sql.includes("WITH selected")) { summaries++; return { rows: [{ report: { summary: { reservations: 1 } } }] }; }
    return {};
  }, release: () => { released++; } }) };
  const handler = createGiocataReportsHandler(pool, { workload });
  const first = response();
  await handler(req(), first);
  const cached = response();
  await handler(req(), cached);
  assert.deepEqual(cached.data, first.data);
  assert.equal(summaries, 1);
  assert.equal(accounts, 2);
  assert.equal(cached.headers["Cache-Control"], "private, no-store");
  accountExists = false;
  const revoked = response();
  await handler(req(), revoked);
  assert.equal(revoked.code, 403);
  assert.equal(accounts, 3);
  assert.equal(summaries, 1);
  assert.equal(released, 3);
  accountExists = true;
  workload.invalidate();
  await handler(req(), response());
  assert.equal(summaries, 2);
  for (const sql of ["BEGIN READ ONLY", "SET LOCAL statement_timeout = '2s'", "SET LOCAL lock_timeout = '200ms'",
    "SET LOCAL max_parallel_workers_per_gather = 0", "SET LOCAL jit = off"]) assert.ok(queries.includes(sql));
});

test("all read views share one slot, reject excess without queueing and leave writes independent", async () => {
  const workload = createGiocataReportWorkload();
  let finish;
  const pending = new Promise(resolve => { finish = resolve; });
  let entered;
  const started = new Promise(resolve => { entered = resolve; });
  let reportConnections = 0;
  const reportPool = { connect: async () => {
    reportConnections++;
    return { query: async sql => {
      if (sql.startsWith("SELECT id FROM users")) return { rowCount: 1 };
      if (sql.includes("WITH selected")) { entered(); await pending; return { rows: [{ report: {} }] }; }
      return {};
    }, release() {} };
  } };
  const first = createGiocataReportsHandler(reportPool, { workload })(req(), response());
  await started;
  for (const view of ["summary", "balances", "attendance"]) {
    const res = response();
    await createGiocataReportsHandler(reportPool, { workload, view })(req(), res);
    assert.equal(res.code, 503);
    assert.equal(res.data.code, "REPORT_BUSY");
    assert.equal(res.headers["Retry-After"], "1");
  }
  assert.equal(reportConnections, 1);
  let operationalWrites = 0;
  const operationalPool = { connect: async () => ({ query: async sql => {
    if (sql.startsWith("SELECT id FROM users")) return { rowCount: 1 };
    if (sql.startsWith("UPDATE appointments")) {
      operationalWrites++;
      return { rowCount: 1, rows: [{ id: 1, status: "atendida" }] };
    }
    return {};
  }, release() {} }) };
  const updated = response();
  await createGiocataReportsHandler(operationalPool, { workload, view: "updateAttendance" })({
    user: owner, query: {}, params: { id: "1" }, body: { status: "atendida" },
  }, updated);
  assert.equal(operationalWrites, 1);
  assert.equal(updated.code, undefined);
  finish();
  await first;
  // The calculation that overlapped a write must not be cached.
  assert.equal(workload.get("8002:month:2024-02-01:2024-02-29"), null);
});

test("failed acquisition and timed-out queries free the report slot for retries", async () => {
  for (const code of ["57014", "55P03", "CONNECT_FAILED"]) {
    const workload = createGiocataReportWorkload();
    let released = false;
    const pool = { connect: async () => {
      if (code === "CONNECT_FAILED") throw new Error("Connection timeout");
      return { query: async sql => {
        if (sql.startsWith("SELECT id FROM users")) return { rowCount: 1 };
        if (sql.includes("WITH selected")) throw Object.assign(new Error("timeout"), { code });
        return {};
      }, release: () => { released = true; } };
    } };
    const res = response();
    await createGiocataReportsHandler(pool, { workload })(req(), res);
    assert.equal(res.code, 503);
    assert.equal(released, code !== "CONNECT_FAILED");
    assert.equal(typeof workload.acquire(), "function");
  }
});
