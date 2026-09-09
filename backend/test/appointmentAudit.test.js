const test = require("node:test");
const assert = require("node:assert/strict");
const { getAppointmentActor, withAppointmentCreator } = require("../src/utils/appointmentAudit");

test("actors come from a session belonging to the business", () => {
  assert.deepEqual(getAppointmentActor(null, "giocata"), { role: "client", username: null });
  assert.equal(getAppointmentActor({ username: "veronica_giocata", business_id: "giocata" }, "giocata").role, "veronica");
  assert.equal(getAppointmentActor({ username: "admin_giocata", business_id: "giocata" }, "giocata").role, "admin");
  assert.equal(getAppointmentActor({ username: "veronica_giocata", business_id: "other" }, "giocata").role, "client");
  assert.equal(getAppointmentActor({ username: "veronica_giocata", business_id: "other" }, "other").role, "admin");
});

test("legacy creators can be resolved without inventing modifications", () => {
  const legacy = { business_id: "giocata", created_by: 42, created_via: "admin", creator_username: "veronica_giocata" };
  const result = withAppointmentCreator(legacy);
  assert.equal(result.created_by_role, "veronica");
  assert.equal(result.created_by_username, "veronica_giocata");
  assert.equal(result.updated_by_role, undefined);
  assert.equal(result.creator_username, undefined);
  assert.equal(legacy.created_by_role, undefined);
  assert.equal(withAppointmentCreator({ business_id: "giocata", created_via: "admin" }).created_by_role, "admin");
  assert.equal(withAppointmentCreator({ business_id: "giocata" }).created_by_role, "client");
});

test("stored creator snapshots and other businesses remain unchanged", () => {
  const saved = { business_id: "giocata", created_by_role: "client", created_by_username: null, updated_by_role: "admin" };
  assert.deepEqual(withAppointmentCreator(saved), saved);
  assert.deepEqual(withAppointmentCreator({ business_id: "barberia-james", created_by: 3 }), { business_id: "barberia-james", created_by: 3 });
});
