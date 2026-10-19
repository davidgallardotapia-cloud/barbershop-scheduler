const test = require("node:test");
const assert = require("node:assert/strict");
const { getReportRange, createGiocataReportsHandler } = require("../src/utils/giocataReports");

test("report presets use Chile dates, ISO weeks and inclusive 30 days", () => {
  const now = new Date("2026-09-13T01:00:00Z"); // Still Saturday in Chile.
  assert.deepEqual(getReportRange("today", now), { key: "today", start: "2026-09-12", end: "2026-09-12" });
  assert.deepEqual(getReportRange("week", now), { key: "week", start: "2026-09-07", end: "2026-09-13" });
  assert.deepEqual(getReportRange("month", now), { key: "month", start: "2026-09-01", end: "2026-09-30" });
  assert.deepEqual(getReportRange("last30", now), { key: "last30", start: "2026-08-14", end: "2026-09-12" });
});

test("range boundaries survive DST, leap years and year changes", () => {
  assert.deepEqual(getReportRange("today", new Date("2026-09-06T04:30:00Z")),
    { key: "today", start: "2026-09-06", end: "2026-09-06" });
  assert.equal(getReportRange("month", new Date("2024-02-20T12:00:00Z")).end, "2024-02-29");
  assert.deepEqual(getReportRange("week", new Date("2027-01-01T12:00:00Z")),
    { key: "week", start: "2026-12-28", end: "2027-01-03" });
  for (const value of ["all", "", "2026-01-01", ["today", "month"], {}, null]) {
    assert.equal(getReportRange(value), null);
  }
});

test("historical months resolve complete months across leap years and year changes", () => {
  const now = new Date("2026-10-19T12:00:00Z");
  for (const [month, end] of [["2026-08", "2026-08-31"], ["2026-09", "2026-09-30"],
    ["2024-02", "2024-02-29"], ["2025-02", "2025-02-28"], ["2025-12", "2025-12-31"]]) {
    assert.deepEqual(getReportRange("month", now, month), { key: "month", start: `${month}-01`, end });
  }
});

test("historical days and ISO weeks accept valid Chile dates without month overflow", () => {
  const now = new Date("2026-10-31T12:00:00Z");
  for (const date of ["2024-02-29", "2026-09-06", "2025-12-31", "2026-10-31"]) {
    assert.deepEqual(getReportRange("today", now, undefined, date), { key: "today", start: date, end: date });
  }
  for (const [date, start, end] of [["2024-02-29", "2024-02-26", "2024-03-03"],
    ["2026-09-06", "2026-08-31", "2026-09-06"], ["2026-01-01", "2025-12-29", "2026-01-04"],
    ["2026-10-31", "2026-10-26", "2026-11-01"]]) {
    assert.deepEqual(getReportRange("week", now, undefined, date), { key: "week", start, end });
  }
  for (const date of ["2025-02-29", "2026-02-30", "2026-13-01", "2026-00-01", "2026-09-31",
    "2026-11-01", "0000-01-01", "2026-9-01", "", null, {}, ["2024-02-29"]]) {
    for (const range of ["today", "week"]) assert.equal(getReportRange(range, now, undefined, date), null);
  }
  assert.equal(getReportRange("today", new Date("2026-11-01T01:00:00Z"), undefined, "2026-11-01"), null);
  for (const range of ["month", "last30"]) assert.equal(getReportRange(range, now, undefined, "2024-02-29"), null);
  assert.equal(getReportRange("week", now, "2024-02", "2024-02-29"), null);
});

test("all report views forward historical day and week dates and preserve pagination", async () => {
  for (const range of ["today", "week"]) {
    for (const view of ["summary", "balances", "attendance"]) {
      const queries = [];
      let released = false;
      const client = { query: async (sql, values) => {
        queries.push({ sql, values });
        if (sql.startsWith("SELECT id FROM users")) return { rowCount: 1 };
        return { rows: sql.includes("WITH selected") ? [{ report: {} }] : [] };
      }, release: () => { released = true; } };
      const response = { set() {}, status(code) { this.code = code; return this; }, json(data) { this.data = data; } };
      await createGiocataReportsHandler({ connect: async () => client }, { view })({
        user: { id: 8002, username: "veronica_giocata", business_id: "giocata" },
        query: { range, date: "2024-02-29", ...(view === "summary" ? {} : { page: "2" }) },
      }, response);
      const start = range === "today" ? "2024-02-29" : "2024-02-26";
      const end = range === "today" ? "2024-02-29" : "2024-03-03";
      assert.equal(response.code, undefined);
      assert.deepEqual(response.data.range, { key: range, start, end });
      assert.deepEqual(queries.find(({ values }) => values?.[0] === start).values,
        view === "summary" ? [start, end] : [start, end, 20]);
      assert.ok(released);
    }
  }
});

test("historical month validation rejects malformed, duplicate and future values in Chile", () => {
  const now = new Date("2026-11-01T01:00:00Z"); // Still October in Chile.
  assert.equal(getReportRange("month", now, "2026-10").end, "2026-10-31");
  for (const month of ["2026-11", "9999-12", "2026-00", "2026-13", "2026-8", "26-08",
    "2026-08-01", " 2026-08", "0000-01", "", null, {}, ["2026-08", "2026-09"]]) {
    assert.equal(getReportRange("month", now, month), null, JSON.stringify(month));
  }
  for (const range of ["today", "week", "last30"]) {
    assert.equal(getReportRange(range, now, "2026-08"), null, range);
  }
});

test("summary, balances and attendance forward only the chosen month's dates", async () => {
  for (const view of ["summary", "balances", "attendance"]) {
    const queries = [];
    let released = false;
    const client = { query: async (sql, values) => {
      queries.push({ sql, values });
      if (sql.startsWith("SELECT id FROM users")) return { rowCount: 1 };
      return { rows: sql.includes("WITH selected") ? [{ report: { summary: {}, daily: [] } }] : [] };
    }, release: () => { released = true; } };
    const response = { set() {}, status(code) { this.code = code; return this; }, json(data) { this.data = data; } };
    await createGiocataReportsHandler({ connect: async () => client }, { view })({
      user: { id: 8002, username: "veronica_giocata", business_id: "giocata" },
      query: { range: "month", month: "2024-02", ...(view === "summary" ? {} : { page: "2" }) },
    }, response);
    assert.equal(response.code, undefined);
    assert.deepEqual(response.data.range, { key: "month", start: "2024-02-01", end: "2024-02-29" });
    const reportQuery = queries.find(({ values }) => values?.[0] === "2024-02-01");
    assert.deepEqual(reportQuery.values, view === "summary"
      ? ["2024-02-01", "2024-02-29"] : ["2024-02-01", "2024-02-29", 20]);
    assert.ok(queries.some(({ sql }) => sql === "BEGIN READ ONLY"));
    assert.ok(queries.some(({ sql }) => sql === "SET LOCAL statement_timeout = '2s'"));
    if (view !== "summary") assert.ok(reportQuery.sql.includes("LIMIT 21 OFFSET $3"));
    assert.equal(released, true);
  }
});

test("invalid history queries and non-owner accounts never connect to the database", async () => {
  const owner = { id: 8002, username: "veronica_giocata", business_id: "giocata" };
  for (const [user, query, expected] of [
    [owner, { range: "month", month: "9999-12" }, 400],
    [owner, { range: "today", date: "2025-02-29" }, 400],
    [owner, { range: "week", date: ["2024-02-29", "2024-03-01"] }, 400],
    [owner, { range: "week", date: "9999-12-01" }, 400],
    [owner, { range: "last30", date: "2024-02-29" }, 400],
    [owner, { range: "today", month: "2024-02" }, 400],
    [owner, { range: "month", month: ["2024-02", "2024-03"] }, 400],
    [owner, { range: "month", month: "2024-02", startDate: "2000-01-01" }, 400],
    [null, { range: "month", month: "2024-02" }, 403],
    [{ ...owner, username: "admin_giocata" }, { range: "month", month: "2024-02" }, 403],
    [{ ...owner, business_id: "barberia-james" }, { range: "month", month: "2024-02" }, 403],
  ]) {
    const response = { set() {}, status(code) { this.code = code; return this; }, json() {} };
    await createGiocataReportsHandler({ connect: () => assert.fail("must not query") })({ user, query }, response);
    assert.equal(response.code, expected);
  }
});

test("report query timeout rolls back and releases the connection", async () => {
  const queries = [];
  let released = false;
  const client = { query: async (sql) => {
    queries.push(sql);
    if (sql.startsWith("SELECT id")) return { rowCount: 1 };
    if (sql.includes("WITH selected")) throw Object.assign(new Error("timeout"), { code: "57014" });
    return {};
  }, release: () => { released = true; } };
  const response = { set() {}, status(code) { this.code = code; return this; }, json(data) { this.data = data; } };
  await createGiocataReportsHandler({ connect: async () => client })({
    user: { id: 8002, username: "veronica_giocata", business_id: "giocata" }, query: { range: "month" },
  }, response);
  assert.equal(response.code, 503);
  assert.ok(queries.includes("SET LOCAL statement_timeout = '2s'"));
  assert.equal(queries.at(-1), "ROLLBACK");
  assert.ok(released);
});
