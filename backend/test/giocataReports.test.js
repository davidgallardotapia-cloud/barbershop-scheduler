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
  assert.ok(queries.includes("SET LOCAL statement_timeout = '5s'"));
  assert.equal(queries.at(-1), "ROLLBACK");
  assert.ok(released);
});
