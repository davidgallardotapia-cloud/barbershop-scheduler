import test from "node:test";
import assert from "node:assert/strict";
import {
  createAppointment,
  getAppointments,
  getScheduleBlocks,
  getBusinessBySlug,
  getAdminAppointments,
  updateAppointment,
  loginUser,
} from "./appointmentsService.js";

test("public booking requests stay separate from administrative credentials", async (t) => {
  const savedWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  let storedToken = "expired-session-token";
  const calls = [];
  globalThis.window = {
    localStorage: {
      getItem: (key) => key === "authToken" ? storedToken : null,
      removeItem: () => assert.fail("public requests must not log out other tabs"),
    },
  };
  t.after(() => {
    if (savedWindow) Object.defineProperty(globalThis, "window", savedWindow);
    else delete globalThis.window;
  });
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url: new URL(url), ...options });
    const expired = options.headers?.Authorization === "Bearer expired-session-token";
    return new Response(JSON.stringify(expired
      ? { message: "Token invalido o expirado" }
      : { data: { id: 123 } }), {
      status: expired ? 401 : 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  for (const token of ["expired-session-token", "valid-session-for-another-business", ""]) {
    await t.test(`client requests do not send tokens or cookies: ${token || "no token"}`, async () => {
      storedToken = token;
      const start = calls.length;
      await getBusinessBySlug("urban-district-barber");
      await getAppointments("barberia-james", { from: "2026-10-19" });
      await getScheduleBlocks("barberia-james");
      const payload = { businessId: "barberia-james", name: "Cliente de prueba" };
      await createAppointment(payload, { auth: false });
      for (const request of calls.slice(start)) {
        assert.equal(request.credentials, "omit", request.url.pathname);
        assert.equal(request.headers?.Authorization, undefined, request.url.pathname);
      }
      assert.equal(calls[start + 1].url.searchParams.get("businessId"), "barberia-james");
      assert.equal(calls[start + 1].url.searchParams.get("from"), "2026-10-19");
      assert.equal(calls.at(-1).method, "POST");
      assert.equal(calls.at(-1).headers["Content-Type"], "application/json");
      assert.deepEqual(JSON.parse(calls.at(-1).body), payload);
    });
  }

  await t.test("admin reads and writes still send a valid session", async () => {
    storedToken = "valid-admin-token";
    const start = calls.length;
    await getAdminAppointments();
    await createAppointment({ name: "Reserva administrativa" }, { auth: true });
    await createAppointment({ name: "Reserva administrativa por defecto" });
    await updateAppointment(123, { status: "atendida" });
    for (const request of calls.slice(start)) {
      assert.equal(request.credentials, "include");
      assert.equal(request.headers.Authorization, "Bearer valid-admin-token");
    }
  });

  await t.test("expired admin sessions are rejected without retrying as a client", async () => {
    storedToken = "expired-session-token";
    const start = calls.length;
    await assert.rejects(createAppointment({ name: "Admin" }, { auth: true }), error => {
      assert.equal(error.response.status, 401);
      return true;
    });
    assert.equal(calls.length, start + 1);
    assert.equal(calls.at(-1).credentials, "include");
  });

  await t.test("cookie-only admin sessions and login retain credential support", async () => {
    storedToken = "";
    await getAdminAppointments();
    assert.equal(calls.at(-1).credentials, "include");
    assert.equal(calls.at(-1).headers?.Authorization, undefined);
    await loginUser({ username: "test", password: "not-a-real-password" });
    assert.equal(calls.at(-1).credentials, "include");
  });
});
