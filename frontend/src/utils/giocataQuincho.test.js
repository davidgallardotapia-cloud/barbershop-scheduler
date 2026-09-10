import test from "node:test";
import assert from "node:assert/strict";
import { QUINCHO, getSportsResource, isGiocataQuincho, hasQuinchoBookingEnded } from "./giocataQuincho.js";
import { buildBarberWhatsappUrl } from "./whatsapp.js";

test("only Giocata resolves the quincho and courts keep their numbers", () => {
  assert.equal(getSportsResource(QUINCHO.service, "giocata"), "Quincho");
  assert.equal(getSportsResource(QUINCHO.service, "barberia-james"), "");
  assert.equal(getSportsResource("Cancha 2 (7v7 - $32.000)", "giocata"), "Cancha 2");
  assert.equal(isGiocataQuincho("centro-ama", "Quincho"), false);
});

test("a free quincho remains bookable until 23:30 in Chile, not just until 20:00", () => {
  for (const instant of ["2026-09-10T22:59:00Z", "2026-09-10T23:15:00Z", "2026-09-11T02:29:59Z"]) {
    assert.equal(hasQuinchoBookingEnded("2026-09-10", new Date(instant)), false);
  }
  for (const instant of ["2026-09-11T02:30:00Z", "2026-09-11T03:00:00Z"]) {
    assert.equal(hasQuinchoBookingEnded("2026-09-10", new Date(instant)), true);
  }
  assert.equal(hasQuinchoBookingEnded("2026-09-09", new Date("2026-09-10T23:15:00Z")), true);
  assert.equal(hasQuinchoBookingEnded("2026-09-11", new Date("2026-09-10T23:15:00Z")), false);
});

test("WhatsApp quincho confirmation includes the full block and total, not a court or rival", () => {
  const message = new URL(buildBarberWhatsappUrl({ business: { id: "giocata" }, barberPhone: "56993239412", name: "QA", phone: "912345678", date: "2026-11-01", time: QUINCHO.start, service: QUINCHO.service, barber: QUINCHO.resource })).searchParams.get("text");
  assert.match(message, /Nueva reserva de quincho/);
  assert.match(message, /20:00 a 23:30/);
  assert.match(message, /\$20\.000/);
  assert.match(message, /3 horas 30 minutos/);
  assert.doesNotMatch(message, /cancha|rival/i);
});

test("court and professional WhatsApp messages remain unchanged", () => {
  for (const [business, barber, expected] of [[{ id: "giocata" }, "Cancha 1", "Nueva reserva de cancha"], [{ id: "eu-curaciones-avanzadas", resourceLabelSingle: "Profesional" }, "Leslie", "Nueva cita agendada"]]) {
    const message = new URL(buildBarberWhatsappUrl({ business, barberPhone: "56993239412", barber, time: "19:00", date: "2026-11-01", name: "QA", phone: "912345678", service: "Servicio QA" })).searchParams.get("text");
    assert.ok(message.startsWith(expected));
    assert.match(message, /Hora: 19:00/);
    assert.doesNotMatch(message, /23:30/);
  }
});
