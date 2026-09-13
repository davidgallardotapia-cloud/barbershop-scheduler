const assert = require("node:assert/strict");
const { getReportRange, REPORT_SQL, PENDING_ATTENDANCE_SQL } = require("../src/utils/giocataReports");

module.exports = async (t, { request, admin, veronica, urban, pool, jwt, secret }) => {
  const route = "/admin/giocata/reports";
  await t.test("balances are owner-only, paginated and disappear after full payment", async () => {
    const path = `${route}/balances?range=last30`;
    assert.equal((await request(path)).status, 401);
    assert.equal((await request(path, admin)).status, 403);
    assert.equal((await request(path, urban)).status, 403);
    assert.equal((await request(`${path}&page=0`, veronica)).status, 400);
    assert.equal((await request(`${path}&page=201`, veronica)).status, 400);
    assert.equal((await request(`${path}&businessId=barberia-james`, veronica)).status, 403);
    const ids = [];
    try {
      for (let i=0; i<28; i++) {
        const row=await pool.query(`INSERT INTO appointments(name,date,time,barber,service,business_id,total_amount,status,phone)
          VALUES($1,(CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date - 1,'19:00',$1,'Balance QA',$2,32000,$3,'912345678') RETURNING id`,
        [`Balance QA ${i}`,i===27?'barberia-james':'giocata',i===26?'cancelada':'reservada']);
        ids.push(row.rows[0].id);
      }
      await pool.query("INSERT INTO appointment_payments(appointment_id,amount,method,payment_stage) VALUES($1,32000,'efectivo','full')",[ids[25]]);
      const all = async () => {
        const items=[];
        for(let page=1;page<=200;page++){
          const response=await request(`${path}&page=${page}`,veronica);
          assert.equal(response.status,200);
          assert.ok(response.data.items.length<=20);
          items.push(...response.data.items);
          if(!response.data.hasMore)break;
        }
        return items;
      };
      const before=await all();
      assert.ok(ids.slice(0,25).every(id=>before.some(row=>row.id===id)));
      assert.ok(ids.slice(25).every(id=>!before.some(row=>row.id===id)));
      const original=before.find(row=>row.id===ids[0]);
      assert.match(original.date,/^\d{4}-\d{2}-\d{2}$/);
      assert.equal(original.time,'19:00');
      assert.equal(Number(original.balance),32000);
      for(const [amount,expected] of [[12000,20000],[20000,0]]){
        const paid=await request(`/appointments/${ids[0]}/payments`,veronica,{
          businessId:'giocata',amount,method:'efectivo',paymentStage:expected?'deposit':'balance',
        });
        assert.equal(paid.status,200,JSON.stringify(paid.data));
        const rows=await all();
        const booking=rows.find(row=>row.id===ids[0]);
        if(expected){assert.equal(Number(booking.balance),expected);assert.equal(Number(booking.total_paid),12000)}
        else assert.equal(booking,undefined);
        const report=(await request(`${route}?range=last30`,veronica)).data.summary;
        assert.equal(rows.reduce((sum,row)=>sum+Number(row.balance),0),report.pendingBalance);
        assert.equal(rows.length,report.pendingPayment);
      }
      const stored=(await pool.query("SELECT status,barber,total_amount FROM appointments WHERE id=$1",[ids[0]])).rows[0];
      assert.equal(stored.status,'reservada');assert.equal(stored.barber,original.barber);assert.equal(Number(stored.total_amount),32000);
    } finally {await pool.query('DELETE FROM appointments WHERE id=ANY($1::int[])',[ids])}
  });
  await t.test("an empty report returns numeric zero totals and an inclusive daily series", async () => {
    const result = await pool.query(REPORT_SQL, ["1999-01-01", "1999-01-03"]);
    const report = result.rows[0].report;
    assert.deepEqual(report.summary, { income: 0, reservations: 0, attended: 0, pendingAttendance: 0,
      pendingPayment: 0, pendingBalance: 0, cancelled: 0, noShow: 0 });
    assert.deepEqual(report.hours, []);
    assert.deepEqual(report.resources, []);
    assert.equal(report.daily.length, 3);
    assert.ok(report.daily.every((day) => day.reservations === 0 && day.income === 0));
  });
  await t.test("attendance follows Chile end times, including the full quincho block and midnight", async () => {
    const predicate = PENDING_ATTENDANCE_SQL.replace("CURRENT_TIMESTAMP", "$4::timestamptz");
    for (const [date, time, barber, now, expected] of [
      ["2026-09-12", "19:00", "Cancha 1", "2026-09-12T22:59:00Z", false],
      ["2026-09-12", "19:00", "Cancha 1", "2026-09-12T23:00:00Z", true],
      ["2026-09-12", "20:00", "Cancha 1", "2026-09-12T23:15:00Z", false],
      ["2026-09-12", "20:00", "Quincho", "2026-09-13T02:29:00Z", false],
      ["2026-09-12", "20:00", "Quincho", "2026-09-13T02:30:00Z", true],
      ["2026-09-11", "23:00", "Cancha 1", "2026-09-12T03:00:00Z", true],
      ["2026-09-13", "19:00", "Cancha 1", "2026-09-12T23:00:00Z", false],
    ]) {
      const result = await pool.query(`SELECT (${predicate}) AS pending FROM
        (SELECT $1::date AS date, $2::time AS time, $3::text AS barber, 'reservada'::text AS status) a`, [date,time,barber,now]);
      assert.equal(result.rows[0].pending, expected, `${barber} ${date} ${now}`);
    }
  });
  await t.test("pending attendance is private, paginated and updates only status plus owner audit", async () => {
    const listRoute = `${route}/attendance?range=last30`;
    const update = (id) => `${route}/attendance/${id}`;
    assert.equal((await request(listRoute)).status, 401);
    assert.equal((await request(listRoute, admin)).status, 403);
    assert.equal((await request(listRoute, urban)).status, 403);
    assert.equal((await request(`${listRoute}&page=0`, veronica)).status, 400);
    assert.equal((await request(`${listRoute}&page=201`, veronica)).status, 400);
    assert.equal((await request(update(1), null, {status:"atendida"}, "PATCH")).status, 401);
    assert.equal((await request(update(1), admin, {status:"atendida"}, "PATCH")).status, 403);
    assert.equal((await request(update(1), urban, {status:"atendida"}, "PATCH")).status, 403);
    assert.equal((await request(update(1), veronica, {status:"atendida",totalAmount:0}, "PATCH")).status, 400);
    assert.equal((await request(update(1), veronica, {status:"reservada"}, "PATCH")).status, 400);
    const baseline = (await request(`${route}?range=last30`, veronica)).data.summary;
    const ids = [];
    try {
      for (let i = 0; i < 28; i++) {
        const row = await pool.query(`INSERT INTO appointments
          (name,date,time,barber,service,business_id,total_amount,status,phone,created_by_role,payment_status)
          VALUES ($1,(CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date + $2::int,
          '19:00',$3,'Attendance QA', $4, 32000, $5, '912345678','client',$6) RETURNING id`,
        [`Attendance QA ${i}`, i === 25 ? 1 : -1, `Attendance QA ${i}`,
          i === 27 ? 'barberia-james' : 'giocata', i === 26 ? 'cancelada' : 'reservada', i === 0 ? 'paid' : 'unpaid']);
        ids.push(row.rows[0].id);
      }
      await pool.query("INSERT INTO appointment_payments(appointment_id,amount,method,payment_stage) VALUES($1,32000,'efectivo','full')", [ids[0]]);
      const summary = (await request(`${route}?range=last30`, veronica)).data.summary;
      assert.equal(summary.pendingAttendance - baseline.pendingAttendance, 25);
      const all = [];
      for (let page = 1; page <= 200; page++) {
        const response = await request(`${listRoute}&page=${page}`, veronica);
        assert.equal(response.status, 200);
        assert.ok(response.data.items.length <= 20);
        all.push(...response.data.items);
        if (!response.data.hasMore) break;
      }
      assert.ok(ids.slice(0,25).every((id) => all.some((row) => row.id === id)));
      assert.ok(ids.slice(25).every((id) => !all.some((row) => row.id === id)));
      assert.ok(all.every((row) => !Object.hasOwn(row, 'phone') && !Object.hasOwn(row, 'client_email')));
      for (const id of ids.slice(25)) assert.equal((await request(update(id), veronica, {status:'atendida'}, 'PATCH')).status, 409);
      const before = (await pool.query('SELECT * FROM appointments WHERE id=$1', [ids[0]])).rows[0];
      const paidBefore = (await pool.query('SELECT * FROM appointment_payments WHERE appointment_id=$1', [ids[0]])).rows;
      const result = await request(update(ids[0]), veronica, {status:'atendida'}, 'PATCH');
      assert.equal(result.status, 200);
      const after = (await pool.query('SELECT * FROM appointments WHERE id=$1', [ids[0]])).rows[0];
      assert.equal(after.status, 'atendida');
      assert.equal(after.updated_by_role, 'veronica');
      assert.equal(after.updated_by_username, 'veronica_giocata');
      assert.ok(after.last_action_at);
      const unchanged = (row) => Object.fromEntries(Object.entries(row).filter(([key]) =>
        !['status','updated_by_role','updated_by_username','last_action_at'].includes(key)));
      assert.deepEqual(unchanged(after), unchanged(before));
      assert.deepEqual((await pool.query('SELECT * FROM appointment_payments WHERE appointment_id=$1', [ids[0]])).rows, paidBefore);
      assert.equal((await request(update(ids[0]), veronica, {status:'no_asistio'}, 'PATCH')).status, 409);
      const race = await Promise.all(['atendida','no_asistio'].map((status) => request(update(ids[1]), veronica, {status}, 'PATCH')));
      assert.deepEqual(race.map((item) => item.status).sort(), [200,409]);
      const final = (await request(`${route}?range=last30`, veronica)).data.summary;
      assert.equal(final.pendingAttendance, summary.pendingAttendance - 2);
      assert.equal(final.income, summary.income);
    } finally { await pool.query('DELETE FROM appointments WHERE id = ANY($1::int[])', [ids]); }
  });
  await t.test("reports deny public, other admins, other businesses and spoofed owner identities", async () => {
    assert.equal((await request(route)).status, 401);
    assert.equal((await request(route, admin)).status, 403);
    assert.equal((await request(route, urban)).status, 403);
    const forged = jwt.sign({ id: 8001, username: "veronica_giocata", business_id: "giocata" }, secret);
    assert.equal((await request(route, forged)).status, 403);
    const expired = jwt.sign({ id: 8002, username: "veronica_giocata", business_id: "giocata" }, secret, { expiresIn: -1 });
    assert.equal((await request(route, expired)).status, 401);
    assert.equal((await request(`${route}?businessId=barberia-james`, veronica)).status, 403);
    assert.equal((await request(`${route}?range=all`, veronica)).status, 400);
    assert.equal((await request(`${route}?range=month&from=2000-01-01`, veronica)).status, 400);
    assert.equal((await request(`${route}?range=today&range=month`, veronica)).status, 400);
    await pool.query("UPDATE users SET username='owner_renamed_qa' WHERE id=8002");
    try { assert.equal((await request(route, veronica)).status, 403); }
    finally { await pool.query("UPDATE users SET username='veronica_giocata' WHERE id=8002"); }
  });

  await t.test("SQL aggregates installments once, excludes other businesses and retains zero days", async () => {
    const before = await request(route, veronica);
    assert.equal(before.status, 200, JSON.stringify(before.data));
    const ids = [];
    const today = getReportRange("today").start;
    const insert = async (status, total, payments, business = "giocata", date = today) => {
      const row = await pool.query(`INSERT INTO appointments
        (name, phone, date, time, service, barber, business_id, total_amount, status)
        VALUES ('Private QA', '999999999', $1, '17:00', 'Reporte QA', $2, $3, $4, $5) RETURNING id`,
      [date, `Reporte QA ${ids.length}`, business, total, status]);
      const id = row.rows[0].id;
      ids.push(id);
      for (const amount of payments) await pool.query(`INSERT INTO appointment_payments
        (appointment_id, amount, method, payment_stage, created_at)
        VALUES ($1, $2, 'efectivo', 'deposit', '2020-01-01')`, [id, amount]);
    };
    try {
      await insert("atendida", 32000, [10000, 22000]);
      await insert("reservada", 36000, [10000, 6000]);
      await insert("no_asistio", 20000, []);
      await insert("cancelada", 20000, [5000]);
      await insert("atendida", 20000, [21000]); // Overpayment never creates a negative balance.
      await insert("reservada", 999999, [999999], "barberia-james");
      await insert("reservada", 888888, [888888], "giocata", "2000-01-01");
      const result = await request(route, veronica);
      assert.equal(result.status, 200, JSON.stringify(result.data));
      const a = before.data.summary;
      const b = result.data.summary;
      assert.equal(b.reservations - a.reservations, 5);
      assert.equal(b.income - a.income, 74000);
      assert.equal(b.attended - a.attended, 2);
      assert.equal(b.pendingPayment - a.pendingPayment, 2);
      assert.equal(b.pendingBalance - a.pendingBalance, 40000);
      assert.equal(b.cancelled - a.cancelled, 1);
      assert.equal(b.noShow - a.noShow, 1);
      assert.equal(result.data.daily.length, 1);
      assert.equal(result.data.daily[0].income, b.income);
      assert.equal(result.data.incomeBasis, "reservation_date");
      const hourCount = (data) => data.hours.find((row) => row.label === "17:00")?.count || 0;
      assert.equal(hourCount(result.data) - hourCount(before.data), 4);
      assert.ok(!JSON.stringify(result.data).includes("Private QA"));
      assert.ok(!JSON.stringify(result.data).includes("999999999"));
      const last30 = await request(`${route}?range=last30`, veronica);
      assert.equal(last30.status, 200);
      assert.equal(last30.data.daily.length, 30);
      assert.equal(last30.data.daily.reduce((sum, day) => sum + day.reservations, 0), last30.data.summary.reservations);
      assert.equal(last30.data.daily.reduce((sum, day) => sum + day.income, 0), last30.data.summary.income);
      assert.ok(last30.data.daily.some((day) => day.reservations === 0 && day.income === 0));
      for (const range of ["week", "month"]) {
        const report = await request(`${route}?range=${range}`, veronica);
        assert.equal(report.status, 200);
        assert.ok(report.data.daily.length <= 31);
      }
    } finally {
      await pool.query("DELETE FROM appointments WHERE id = ANY($1::int[])", [ids]);
    }
  });
};
