const test = require("node:test");
const assert = require("node:assert/strict");
const { getReservationReplyTo } = require("../src/utils/reservationEmail");

test("Giocata replies go to the business regardless of the global default", () => {
  assert.equal(getReservationReplyTo("giocata", "platform@example.com"), "complejogiocata@gmail.com");
  assert.equal(getReservationReplyTo("giocata", null), "complejogiocata@gmail.com");
});

test("other businesses retain their configured reply address", () => {
  for (const id of ["barberia-james", "centro-ama", "eu-curaciones-avanzadas", undefined]) {
    assert.equal(getReservationReplyTo(id, "platform@example.com"), "platform@example.com");
    assert.equal(getReservationReplyTo(id, null), null);
  }
});
