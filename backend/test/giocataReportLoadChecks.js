const assert = require("node:assert/strict");
const { performance } = require("node:perf_hooks");
const { createGiocataReportsHandler } = require("../src/utils/giocataReports");
const { createGiocataReportWorkload } = require("../src/utils/giocataReportWorkload");

const stats = values => {
  const sorted = [...values].sort((a, b) => a - b);
  return { n: sorted.length, medianMs: +sorted[Math.floor(sorted.length / 2)].toFixed(1),
    maxMs: +sorted.at(-1).toFixed(1) };
};

module.exports = async (t, { request, veronica, pool }) => {
  await t.test("report traffic leaves public availability and bookings working in both businesses", async () => {
    const ids = [];
    let running = false;
    let workers = [];
    let reportSuccesses = 0;
    let reportBusy = 0;
    try {
      const seeded = await pool.query(`INSERT INTO appointments
        (name,phone,date,time,service,barber,business_id,total_amount,status)
        SELECT 'Report load QA','912345678',DATE '2024-08-01' + (g % 61),
          TIME '19:00','Report load QA','Report load QA','giocata',32000,'reservada'
        FROM generate_series(1,6000) g RETURNING id`);
      ids.push(...seeded.rows.map(row => row.id));
      const results = {};
      let day = 0;
      for (const phase of ["baseline", "reportsRunning"]) {
        if (phase === "reportsRunning") {
          running = true;
          workers = Array.from({ length: 2 }, async (_, worker) => {
            for (let i = 0; running && i < 60; i++) {
              const response = await request(`/admin/giocata/reports?range=month&month=2024-${(i + worker) % 2 ? "08" : "09"}`, veronica);
              if (response.status === 200) reportSuccesses++;
              else {
                assert.equal(response.status, 503);
                assert.equal(response.data.code, "REPORT_BUSY");
                reportBusy++;
              }
            }
          });
          // Attach rejection handlers immediately; the final await still propagates failures.
          workers.forEach(worker => worker.catch(() => {}));
        }
        results[phase] = {};
        for (const businessId of ["giocata", "barberia-james"]) {
          const availability = [];
          const booking = [];
          for (let sample = 0; sample < 6; sample++) {
            const date = `2027-02-${String(++day).padStart(2, "0")}`;
            let start = performance.now();
            const slots = await request(`/appointments?businessId=${businessId}&startDate=${date}&endDate=${date}`);
            availability.push(performance.now() - start);
            assert.equal(slots.status, 200);
            start = performance.now();
            const created = await request("/appointments", null, {
              name: "Public load QA", phone: String(945000000 + day), date, time: "19:00", businessId,
              service: businessId === "giocata" ? "Cancha 2 (7v7 - $32.000)" : "Corte (30 min - $10.000)",
              barber: businessId === "giocata" ? "Cancha 2" : "James",
            });
            booking.push(performance.now() - start);
            assert.equal(created.status, 200, JSON.stringify(created.data));
            ids.push(created.data.data.id);
            assert.ok(booking.at(-1) < 3000, "A local public booking must not wait for report work");
          }
          results[phase][businessId] = { availability: stats(availability), booking: stats(booking) };
        }
      }
      running = false;
      await Promise.all(workers);
      assert.ok(reportSuccesses > 0);
      assert.ok(reportBusy > 0, "Excess report requests must be rejected instead of queued");
      console.log("LOCAL_REPORT_ISOLATION", JSON.stringify({ seededReservations: 6000,
        reportSuccesses, reportBusy, results }));
    } finally {
      running = false;
      await Promise.allSettled(workers);
      await pool.query("DELETE FROM appointments WHERE id=ANY($1::int[])", [ids]);
    }
  });

  await t.test("PostgreSQL cancels a slow report after two seconds while operational reads continue", async () => {
    const { Pool } = require("pg");
    const reportPool = new Pool({ ...pool.options, password: pool.options.password,
      max: 1, connectionTimeoutMillis: 500, application_name: "agendasmart-reports-timeout-test" });
    let started;
    const queryStarted = new Promise(resolve => { started = resolve; });
    const slowPool = { connect: async () => {
      const client = await reportPool.connect();
      return { release: () => client.release(), query: async (sql, values) => {
        if (sql.includes("WITH selected")) { started(); await client.query("SELECT pg_sleep(3)"); }
        return client.query(sql, values);
      } };
    } };
    const workload = createGiocataReportWorkload();
    const res = { set() {}, status(code) { this.code = code; return this; }, json(data) { this.data = data; } };
    const startedAt = performance.now();
    const pending = createGiocataReportsHandler(slowPool, { workload })({
      user: { id: 8002, username: "veronica_giocata", business_id: "giocata" },
      query: { range: "month", month: "2024-08" },
    }, res);
    try {
      await queryStarted;
      for (const business of ["giocata", "barberia-james"]) {
        const before = performance.now();
        const availability = await request(`/appointments?businessId=${business}&startDate=2027-03-01&endDate=2027-03-01`);
        assert.equal(availability.status, 200);
        assert.ok(performance.now() - before < 1000);
      }
      await pending;
      const elapsedMs = performance.now() - startedAt;
      assert.equal(res.code, 503);
      assert.ok(elapsedMs >= 1800 && elapsedMs < 3000, `Report timeout took ${elapsedMs}ms`);
      assert.equal(reportPool.waitingCount, 0);
      assert.equal(typeof workload.acquire(), "function");
      console.log("LOCAL_REPORT_TIMEOUT", JSON.stringify({ elapsedMs: +elapsedMs.toFixed(1), publicReadsSucceeded: 2 }));
    } finally { await pending; await reportPool.end(); }
  });
};
