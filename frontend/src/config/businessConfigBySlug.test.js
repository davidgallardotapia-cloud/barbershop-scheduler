import test from "node:test";
import assert from "node:assert/strict";
import { businessConfigBySlug } from "./businessConfigBySlug.js";
import { QUINCHO } from "../utils/giocataQuincho.js";

test("Giocata adds 22:00 on Sundays while Saturdays still end at 21:00", () => {
  const giocata = businessConfigBySlug.giocata;
  assert.deepEqual(giocata.scheduleSlotsByWeekday[0], ["19:00", "20:00", "21:00", "22:00"]);
  assert.deepEqual(giocata.scheduleSlotsByWeekday[6], ["19:00", "20:00", "21:00"]);
  assert.ok(giocata.hours.includes("Sábados: 19:00, 20:00 y 21:00"));
  assert.ok(giocata.hours.includes("Domingos: 19:00, 20:00, 21:00 y 22:00"));
});

test("Giocata weekday starts and the quincho block remain unchanged", () => {
  const giocata = businessConfigBySlug.giocata;
  assert.deepEqual(giocata.scheduleSlots, ["19:00", "20:00", "21:00", "22:00", "23:00"]);
  for (const weekday of [1, 2, 3, 4, 5]) {
    assert.equal(giocata.scheduleSlotsByWeekday[weekday], undefined);
  }
  assert.ok(giocata.services.includes(QUINCHO.service));
  assert.ok(giocata.barbers.includes(QUINCHO.resource));
  assert.equal(QUINCHO.timeLabel, "20:00 a 23:30");
});
