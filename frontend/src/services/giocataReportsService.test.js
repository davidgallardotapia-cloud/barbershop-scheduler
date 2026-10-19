import test from "node:test";
import assert from "node:assert/strict";
import { getGiocataReport } from "./giocataReportsService.js";

test("superseded reports cancel before sending an API request", async t => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls++; return new Response("{}"); });
  const controller = new AbortController();
  const pending = getGiocataReport("/admin/giocata/reports", { range: "today" }, controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(calls, 0);
});

test("only busy reports retry, with the same period and bounded attempts", async t => {
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    requests.push({ url: new URL(url), options });
    return requests.length === 1
      ? new Response(JSON.stringify({ code: "REPORT_BUSY" }), { status: 503 })
      : new Response(JSON.stringify({ range: { start: "2024-02-29", end: "2024-02-29" } }));
  });
  const controller = new AbortController();
  const result = await getGiocataReport("/admin/giocata/reports", { range: "today", date: "2024-02-29" }, controller.signal);
  assert.equal(result.data.range.start, "2024-02-29");
  assert.equal(requests.length, 2);
  assert.ok(requests.every(r => r.options.signal === controller.signal && r.options.method === "GET"));
  assert.ok(requests.every(r => r.url.searchParams.get("date") === "2024-02-29"));
});

test("authentication failures and timeouts are not retried as public requests", async t => {
  for (const status of [401, 403, 500, 503]) {
    let calls = 0;
    t.mock.method(globalThis, "fetch", async () => { calls++; return new Response("{}", { status }); });
    await assert.rejects(getGiocataReport("/admin/giocata/reports", { range: "week" }));
    assert.equal(calls, 1);
  }
});

test("canceling during the busy wait prevents another request", async t => {
  const controller = new AbortController();
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    setTimeout(() => controller.abort(), 20);
    return new Response(JSON.stringify({ code: "REPORT_BUSY" }), { status: 503 });
  });
  await assert.rejects(getGiocataReport("/admin/giocata/reports", { range: "month" }, controller.signal), { name: "AbortError" });
  assert.equal(calls, 1);
});

test("a persistently busy report stops after four attempts", async t => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return new Response(JSON.stringify({ code: "REPORT_BUSY" }), { status: 503 });
  });
  await assert.rejects(getGiocataReport("/admin/giocata/reports", { range: "today" }));
  assert.equal(calls, 4);
});
