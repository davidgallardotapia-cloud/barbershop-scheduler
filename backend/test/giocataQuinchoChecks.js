const assert = require("node:assert/strict");
const { QUINCHO } = require("../src/utils/giocataQuincho");

module.exports = async function checkQuincho(t, { request, payload, admin, veronica, pool }) {
  const booking = (overrides = {}) => payload({ date: "2026-11-01", barber: QUINCHO.resource, service: QUINCHO.service, time: QUINCHO.start, totalAmount: QUINCHO.price, ...overrides });
  const stored = async (id) => (await pool.query("SELECT * FROM appointments WHERE id=$1", [id])).rows[0];
  const remove = async (id) => request(`/appointments/${id}?businessId=giocata`, admin, undefined, "DELETE");

  await t.test("quincho and court can be booked by the same public customer in either order", async () => {
    for (const [date, quinchoFirst] of [["2026-11-01", false], ["2026-11-02", true]]) {
      const court = payload({ date });
      const quincho = booking({ date, totalAmount: 1 });
      const first = await request("/appointments", null, quinchoFirst ? quincho : court);
      const second = await request("/appointments", null, quinchoFirst ? court : quincho);
      assert.equal(first.status, 200, JSON.stringify(first.data));
      assert.equal(second.status, 200, JSON.stringify(second.data));
      const row = await stored((quinchoFirst ? first : second).data.data.id);
      assert.equal(Number(row.total_amount), 20000);
      assert.equal(row.time, "20:00:00");
      assert.equal(row.created_by_role, "client");
      assert.equal(row.needs_opponent, false);
      const duplicate = await request("/appointments", null, payload({ date, barber: "Cancha 1", service: "Cancha 1 (7v7 - $32.000)", time: "19:00" }));
      assert.equal(duplicate.status, 409, "Second court must still be rejected");
      const duplicateQuincho = await request("/appointments", null, quincho);
      assert.equal(duplicateQuincho.status, 409);
      assert.match(duplicateQuincho.data.message, /quincho/i);
    }
  });

  await t.test("fixed block rejects altered times, prices in service, mismatched resources and rivals", async () => {
    const variants = [
      { time: "21:00" }, { time: "20:00:30" }, { barber: "Cancha 3" },
      { service: "Cancha 2 (7v7 - $32.000)" }, { service: "Quincho ($1)" },
      { barber: "quincho" }, { needsOpponent: true }, { opponentName: "Equipo" },
    ];
    for (const variant of variants) {
      const response = await request("/appointments", admin, booking({ date: "2026-11-03", ...variant }));
      assert.equal(response.status, 400, JSON.stringify({ variant, response }));
    }
    const created = await request("/appointments", admin, booking({ date: "2026-11-03" }));
    assert.equal(created.status, 200);
    const id = created.data.data.id;
    for (const variant of variants) {
      assert.equal((await request(`/appointments/${id}`, admin, booking({ date: "2026-11-03", ...variant }), "PUT")).status, 400);
    }
    assert.equal((await stored(id)).time, "20:00:00");
  });

  await t.test("simultaneous public requests allow exactly one quincho and return a useful conflict", async () => {
    const results = await Promise.all([
      request("/appointments", null, booking({ date: "2026-11-04", phone: "945678901" })),
      request("/appointments", null, booking({ date: "2026-11-04", phone: "956789012" })),
    ]);
    assert.equal(results.filter((result) => result.status === 200).length, 1, JSON.stringify(results));
    const rejected = results.find((result) => result.status !== 200);
    assert.ok([400, 409].includes(rejected.status));
    assert.match(rejected.data.message, /reservado/);
    const rows = (await pool.query("SELECT id FROM appointments WHERE business_id='giocata' AND barber='Quincho' AND date='2026-11-04'")).rows;
    assert.equal(rows.length, 1);
    await assert.rejects(pool.query("INSERT INTO appointments (name,phone,date,time,service,barber,business_id) VALUES ($1,$2,$3,$4,$5,$6,$7)", ["Collision QA", "967890123", "2026-11-04", "21:00", QUINCHO.service, QUINCHO.resource, "giocata"]), (error) => error.constraint === QUINCHO.uniqueIndex);
  });

  await t.test("schedule blocks intersecting the end of the quincho block prevent booking", async () => {
    await pool.query("INSERT INTO schedule_blocks (business_id,barber,start_date,end_date,all_day,start_time,end_time,reason) VALUES ('giocata','Quincho','2026-11-05','2026-11-05',false,'23:00','23:30','QA')");
    const blocked = await request("/appointments", admin, booking({ date: "2026-11-05" }));
    assert.equal(blocked.status, 400, JSON.stringify(blocked.data));
    assert.match(blocked.data.message, /bloqueado/);
    const court = await request("/appointments", null, payload({ date: "2026-11-05" }));
    assert.equal(court.status, 200, "Quincho block must not block courts");
  });

  await t.test("owner can edit quincho, payments total 20000, deletion releases the day", async () => {
    const created = await request("/appointments", admin, booking({ date: "2026-11-06" }));
    assert.equal(created.status, 200);
    const id = created.data.data.id;
    const edited = await request(`/appointments/${id}`, veronica, booking({ date: "2026-11-07", totalAmount: 500 }), "PUT");
    assert.equal(edited.status, 200, JSON.stringify(edited.data));
    assert.equal(Number(edited.data.data.total_amount), 20000);
    assert.equal(edited.data.data.updated_by_role, "veronica");
    const payment = await request(`/appointments/${id}/payments`, admin, { businessId: "giocata", amount: 20000, method: "efectivo", paymentStage: "full" });
    assert.equal(payment.status, 200, JSON.stringify(payment.data));
    assert.equal((await stored(id)).payment_status, "paid");
    const other = await request("/appointments", admin, booking({ date: "2026-11-06" }));
    const conflict = await request(`/appointments/${other.data.data.id}`, admin, booking({ date: "2026-11-07" }), "PUT");
    assert.ok([400, 409].includes(conflict.status));
    assert.equal((await remove(id)).status, 200);
    assert.equal((await request("/appointments", null, booking({ date: "2026-11-07" }))).status, 200);
  });

  await t.test("monthly and quarterly series allow court plus quincho and keep all-or-nothing conflicts", async () => {
    for (const [date, recurrenceType] of [["2027-01-04", "monthly"], ["2027-03-02", "quarterly"]]) {
      const court = await request("/appointments/monthly", admin, payload({ date, recurrenceType }));
      assert.equal(court.status, 200, JSON.stringify(court.data));
      const response = await request("/appointments/monthly", veronica, booking({ date, recurrenceType }));
      assert.equal(response.status, 200, JSON.stringify(response.data));
      assert.equal(response.data.data.length, court.data.data.length);
      assert.ok(response.data.data.every((row) => Number(row.total_amount) === 20000 && row.created_by_role === "veronica" && row.barber === "Quincho"));
      assert.equal((await request("/appointments/monthly", admin, booking({ date, recurrenceType, phone: "978901234" }))).status, 409);
    }
    const one = await request("/appointments", admin, booking({ date: "2027-08-11" }));
    assert.equal(one.status, 200);
    const series = await request("/appointments/monthly", admin, booking({ date: "2027-08-04", recurrenceType: "monthly", phone: "989012345" }));
    assert.equal(series.status, 409);
    const count = await pool.query("SELECT count(*)::int AS total FROM appointments WHERE business_id='giocata' AND barber='Quincho' AND date BETWEEN '2027-08-01' AND '2027-08-31'");
    assert.equal(count.rows[0].total, 1);
  });
};
