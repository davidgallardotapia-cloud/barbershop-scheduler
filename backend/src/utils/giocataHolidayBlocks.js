async function ensureGiocataHolidayBlocks(db) {
  return db.query(`
    INSERT INTO schedule_blocks (business_id, barber, start_date, end_date, all_day, reason)
    SELECT 'giocata', resource, DATE '2026-09-18', DATE '2026-09-19', TRUE,
      'Cierre por Fiestas Patrias 2026'
    FROM unnest(ARRAY['Cancha 1','Cancha 2','Cancha 3','Cancha 4',
      'Cancha 5','Cancha 6','Cancha 7','Quincho']) AS resources(resource)
    WHERE NOT EXISTS (
      SELECT 1 FROM schedule_blocks b
      WHERE b.business_id = 'giocata' AND b.barber = resource AND b.all_day
        AND b.start_date <= DATE '2026-09-18' AND b.end_date >= DATE '2026-09-19'
    )
    RETURNING id
  `);
}

module.exports = { ensureGiocataHolidayBlocks };
