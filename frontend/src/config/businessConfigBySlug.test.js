import test from "node:test";
import assert from "node:assert/strict";
import { businessConfigBySlug } from "./businessConfigBySlug.js";
import { QUINCHO } from "../utils/giocataQuincho.js";

test("Giocata only offers 19:00, 20:00 and 21:00 on Saturdays and Sundays", () => {
  const giocata = businessConfigBySlug.giocata;
  for (const weekday of [0, 6]) {
    assert.deepEqual(giocata.scheduleSlotsByWeekday[weekday], ["19:00", "20:00", "21:00"]);
  }
  assert.ok(giocata.hours.includes("19:00, 20:00 y 21:00"));
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
