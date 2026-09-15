const assert = require('node:assert/strict');
const { ensureGiocataHolidayBlocks } = require('../src/utils/giocataHolidayBlocks');
const { QUINCHO } = require('../src/utils/giocataQuincho');

module.exports = async (t, { request, payload, admin, pool }) => {
  await t.test('Giocata holiday blocks cover all resources without duplication or deleting bookings', async () => {
    const before = (await pool.query('SELECT COUNT(*)::int AS count FROM appointments')).rows[0].count;
    assert.equal((await ensureGiocataHolidayBlocks(pool)).rowCount, 0);
    const blocks = await request('/schedule-blocks?businessId=giocata&startDate=2026-09-18&endDate=2026-09-19');
    assert.equal(blocks.status, 200);
    for (const resource of ['Cancha 1','Cancha 2','Cancha 3','Cancha 4','Cancha 5','Cancha 6','Cancha 7','Quincho']) {
      assert.ok(blocks.data.some(b => b.barber === resource && b.all_day && b.start_date === '2026-09-18' && b.end_date === '2026-09-19'));
    }
    assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM appointments')).rows[0].count, before);
    assert.equal((await pool.query("SELECT COUNT(*)::int AS count FROM schedule_blocks WHERE business_id <> 'giocata' AND reason = 'Cierre por Fiestas Patrias 2026'")).rows[0].count, 0);
    for (const date of ['2026-09-18','2026-09-19']) {
      for (const token of [null, admin]) {
        for (const resource of ['Cancha 1','Quincho']) {
          const response = await request('/appointments', token, payload({date, barber:resource,
            ...(resource === 'Quincho' ? {service:QUINCHO.service,time:QUINCHO.start,totalAmount:QUINCHO.price} : {})}));
          assert.ok([400,409].includes(response.status), JSON.stringify(response.data));
          assert.match(response.data.message, /bloquead/i);
        }
      }
    }
    for (const recurrenceType of ['monthly','quarterly']) {
      const response = await request('/appointments/monthly', admin, payload({date:'2026-09-11',recurrenceType,barber:'Cancha 7',service:'Cancha 7 (6v6 - $24.000)',totalAmount:24000}));
      assert.ok([400,409].includes(response.status), JSON.stringify(response.data));
      assert.ok(response.data.conflicts.some(row => JSON.stringify(row).includes('2026-09-18')));
    }
    const appointment = await request('/appointments', admin, payload({date:'2026-09-20',barber:'Cancha 7',service:'Cancha 7 (6v6 - $24.000)',totalAmount:24000}));
    assert.equal(appointment.status, 200);
    const blockedEdit = await request(`/appointments/${appointment.data.data.id}`, admin, payload({date:'2026-09-18',barber:'Cancha 7',service:'Cancha 7 (6v6 - $24.000)',totalAmount:24000}), 'PUT');
    assert.equal(blockedEdit.status, 400);
    await pool.query('DELETE FROM appointments WHERE id=$1', [appointment.data.data.id]);
  });
};
