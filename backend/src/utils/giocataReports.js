const moment = require("moment-timezone");
const { getAppointmentActor } = require("./appointmentAudit");

const REPORT_TIMEZONE = "America/Santiago";
const REPORT_RANGES = ["today", "week", "month", "last30"];
const PENDING_ATTENDANCE_SQL = `LOWER(TRIM(COALESCE(status, 'reservada'))) = 'reservada'
  AND (CASE WHEN barber = 'Quincho' THEN date + TIME '23:30'
    ELSE date + time + INTERVAL '1 hour' END) <= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')`;

function getReportRange(range = "today", now = new Date()) {
  if (!REPORT_RANGES.includes(range)) return null;
  const today = moment(now).tz(REPORT_TIMEZONE).startOf("day");
  const start = today.clone();
  const end = today.clone();
  if (range === "week") {
    start.startOf("isoWeek");
    end.endOf("isoWeek");
  } else if (range === "month") {
    start.startOf("month");
    end.endOf("month");
  } else if (range === "last30") {
    start.subtract(29, "days");
  }
  return { key: range, start: start.format("YYYY-MM-DD"), end: end.format("YYYY-MM-DD") };
}

// Payment totals are joined only after aggregation, so installments never multiply bookings.
// Income is attributed to the reservation date, not the payment's timezone-less created_at.
const REPORT_SQL = `
  WITH selected AS (
    SELECT id, date, time, barber, COALESCE(total_amount, 0) AS total_amount,
      LOWER(TRIM(COALESCE(status, 'reservada'))) AS status
    FROM appointments
    WHERE business_id = 'giocata' AND date BETWEEN $1::date AND $2::date
  ), paid AS (
    SELECT p.appointment_id, SUM(p.amount) AS amount
    FROM appointment_payments p JOIN selected s ON s.id = p.appointment_id
    GROUP BY p.appointment_id
  ), bookings AS (
    SELECT s.*, COALESCE(p.amount, 0) AS collected,
      status IN ('cancelada', 'cancelled', 'eliminada', 'deleted') AS cancelled,
      GREATEST(s.total_amount - COALESCE(p.amount, 0), 0) AS balance
    FROM selected s LEFT JOIN paid p ON p.appointment_id = s.id
  ), days AS (
    SELECT d::date AS date FROM generate_series($1::timestamp, $2::timestamp, '1 day') d
  ), daily AS (
    SELECT d.date, COUNT(b.id)::int AS reservations, COALESCE(SUM(b.collected), 0) AS income
    FROM days d LEFT JOIN bookings b ON b.date = d.date GROUP BY d.date
  ), hours AS (
    SELECT TO_CHAR(time, 'HH24:00') AS label, COUNT(*)::int AS count
    FROM bookings WHERE NOT cancelled GROUP BY 1 ORDER BY count DESC, label LIMIT 24
  ), resources AS (
    SELECT barber AS label, COUNT(*)::int AS count
    FROM bookings WHERE NOT cancelled GROUP BY barber ORDER BY count DESC, barber LIMIT 12
  )
  SELECT json_build_object(
    'summary', (SELECT json_build_object(
      'income', COALESCE(SUM(collected), 0),
      'reservations', COUNT(*)::int,
      'attended', COUNT(*) FILTER (WHERE status = 'atendida')::int,
      'pendingAttendance', COUNT(*) FILTER (WHERE ${PENDING_ATTENDANCE_SQL})::int,
      'pendingPayment', COUNT(*) FILTER (WHERE NOT cancelled AND balance > 0)::int,
      'pendingBalance', COALESCE(SUM(balance) FILTER (WHERE NOT cancelled), 0),
      'cancelled', COUNT(*) FILTER (WHERE cancelled)::int,
      'noShow', COUNT(*) FILTER (WHERE status IN ('no_asistio', 'no asistio'))::int
    ) FROM bookings),
    'daily', (SELECT json_agg(json_build_object('date', TO_CHAR(date, 'YYYY-MM-DD'),
      'reservations', reservations, 'income', income) ORDER BY date) FROM daily),
    'hours', COALESCE((SELECT json_agg(hours ORDER BY count DESC, label) FROM hours), '[]'::json),
    'resources', COALESCE((SELECT json_agg(resources ORDER BY count DESC, label) FROM resources), '[]'::json)
  ) AS report
`;

function createGiocataReportsHandler(pool, { view = "summary", onStatusChanged = () => {} } = {}) {
  return async (req, res) => {
    res.set("Cache-Control", "private, no-store");
    const user = req.user;
    if (user?.business_id !== "giocata" || user?.username !== "veronica_giocata" ||
        !Number.isInteger(user?.id)) {
      return res.status(403).json({ message: "No tienes acceso a estos reportes." });
    }
    const range = getReportRange(req.query.range);
    const isUpdate = view === "updateAttendance";
    const isList = ["attendance", "balances"].includes(view);
    const allowedQuery = isUpdate ? [] : isList ? ["range", "page"] : ["range"];
    if (!range || Object.keys(req.query).some((key) => !allowedQuery.includes(key))) {
      return res.status(400).json({ message: "Selecciona hoy, semana, mes o los \u00faltimos 30 d\u00edas." });
    }
    const page = req.query.page === undefined ? 1 : Number(req.query.page);
    if (isList && (!/^\d+$/.test(String(req.query.page ?? "1")) || !Number.isInteger(page) || page < 1 || page > 200)) {
      return res.status(400).json({ message: "P\u00e1gina no v\u00e1lida." });
    }
    const appointmentId = Number(req.params?.id);
    if (isUpdate && (!Number.isInteger(appointmentId) || appointmentId <= 0 || appointmentId > 2147483647 ||
        !["atendida", "no_asistio"].includes(req.body?.status) ||
        Object.keys(req.body || {}).some((key) => key !== "status"))) {
      return res.status(400).json({ message: "Selecciona atendida o no asisti\u00f3 para una reserva v\u00e1lida." });
    }

    let client;
    try {
      client = await pool.connect();
      await client.query(isUpdate ? "BEGIN" : "BEGIN READ ONLY");
      await client.query("SET LOCAL statement_timeout = '5s'");
      // Recheck the current account, rather than trusting browser state or an old JWT alone.
      const account = await client.query(
        "SELECT id FROM users WHERE id = $1 AND username = 'veronica_giocata' AND business_id = 'giocata'",
        [user.id]
      );
      if (!account.rowCount) {
        await client.query("ROLLBACK");
        return res.status(403).json({ message: "No tienes acceso a estos reportes." });
      }
      if (view === "balances") {
        // Keep the booking snapshot required by the existing payment/edit panel, capped at 20 rows.
        const result = await client.query(`SELECT a.*, TO_CHAR(a.date, 'YYYY-MM-DD') AS date,
          TO_CHAR(a.time, 'HH24:MI') AS time, COALESCE(p.total_paid, 0) AS total_paid,
          GREATEST(COALESCE(a.total_amount, 0) - COALESCE(p.total_paid, 0), 0) AS balance
          FROM appointments a LEFT JOIN LATERAL (
            SELECT SUM(amount) AS total_paid FROM appointment_payments WHERE appointment_id = a.id
          ) p ON TRUE
          WHERE a.business_id = 'giocata' AND a.date BETWEEN $1::date AND $2::date
          AND LOWER(TRIM(COALESCE(a.status, 'reservada'))) NOT IN ('cancelada','cancelled','eliminada','deleted')
          AND COALESCE(a.total_amount, 0) > COALESCE(p.total_paid, 0)
          ORDER BY a.date, a.time, a.id LIMIT 21 OFFSET $3`, [range.start, range.end, (page - 1) * 20]);
        await client.query("COMMIT");
        return res.json({ items: result.rows.slice(0, 20), hasMore: result.rows.length > 20, page, range });
      }
      if (view === "attendance") {
        const result = await client.query(`SELECT id, name, barber,
          TO_CHAR(date, 'YYYY-MM-DD') AS date, TO_CHAR(time, 'HH24:MI') AS time
          FROM appointments WHERE business_id = 'giocata' AND date BETWEEN $1::date AND $2::date
          AND ${PENDING_ATTENDANCE_SQL} ORDER BY date, time, id LIMIT 21 OFFSET $3`,
        [range.start, range.end, (page - 1) * 20]);
        await client.query("COMMIT");
        return res.json({ items: result.rows.slice(0, 20), hasMore: result.rows.length > 20, page, range });
      }
      if (isUpdate) {
        const actor = getAppointmentActor(user, "giocata");
        // Atomic conditional update: never overwrite an attendance already recorded by someone else.
        const result = await client.query(`UPDATE appointments SET status = $2,
          updated_by_role = $3, updated_by_username = $4, last_action_at = NOW()
          WHERE id = $1 AND business_id = 'giocata' AND ${PENDING_ATTENDANCE_SQL} RETURNING *`,
        [appointmentId, req.body.status, actor.role, actor.username]);
        if (!result.rowCount) {
          await client.query("ROLLBACK");
          return res.status(409).json({ message: "La reserva ya cambi\u00f3 o todav\u00eda no finaliza. Actualiza la lista." });
        }
        await client.query("COMMIT");
        const appointment = result.rows[0];
        Promise.resolve().then(() => onStatusChanged(appointment)).catch(() => {});
        return res.json({ data: { id: appointment.id, status: appointment.status,
          updated_by_role: appointment.updated_by_role, updated_by_username: appointment.updated_by_username,
          last_action_at: appointment.last_action_at } });
      }
      const result = await client.query(REPORT_SQL, [range.start, range.end]);
      await client.query("COMMIT");
      return res.json({ ...result.rows[0].report, range, timezone: REPORT_TIMEZONE,
        incomeBasis: "reservation_date", generatedAt: new Date().toISOString() });
    } catch (error) {
      if (client) await client.query("ROLLBACK").catch(() => {});
      return res.status(error.code === "57014" ? 503 : 500).json({
        message: "No se pudieron cargar los reportes. Intenta nuevamente.",
      });
    } finally {
      client?.release();
    }
  };
}

module.exports = { getReportRange, createGiocataReportsHandler, REPORT_SQL, PENDING_ATTENDANCE_SQL };
