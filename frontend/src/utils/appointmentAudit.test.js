import test from "node:test";
import assert from "node:assert/strict";
import { getAppointmentAudit, getBookingOriginInfo } from "./appointmentAudit.js";

test("calendar distinguishes all three creators", () => {
  for (const [role, badge] of [["client", "C"], ["admin", "A"], ["veronica", "V"]]) {
    assert.equal(getBookingOriginInfo({ business_id: "giocata", created_by_role: role }).shortLabel, badge);
  }
});

test("modification badge preserves the creator in the details", () => {
  const appointment = { business_id: "giocata", created_by_role: "client", updated_by_role: "veronica", last_action_at: "2026-09-08T23:15:00Z" };
  assert.equal(getBookingOriginInfo(appointment).shortLabel, "M(V)");
  assert.match(getBookingOriginInfo(appointment).title, /Creada por Cliente/);
  assert.equal(getAppointmentAudit(appointment).creator.shortLabel, "C");
  assert.ok(getAppointmentAudit(appointment).modifiedAt);
  assert.equal(getBookingOriginInfo({ ...appointment, updated_by_role: "admin" }).shortLabel, "M(A)");
  assert.equal(getBookingOriginInfo({ ...appointment, updated_by_role: "client" }).shortLabel, "M(C)");
});

test("legacy data, bad timestamps and other businesses render safely", () => {
  assert.equal(getBookingOriginInfo(null).shortLabel, "C");
  assert.equal(getBookingOriginInfo({ created_via: "admin" }).shortLabel, "A");
  assert.equal(getBookingOriginInfo({ created_by: 12 }).shortLabel, "A");
  assert.equal(getBookingOriginInfo({ business_id: "other", created_by: 12, updated_by_role: "veronica" }).shortLabel, "A");
  assert.equal(getAppointmentAudit({ business_id: "giocata", last_action_at: "invalid" }).modifiedAt, "");
});
