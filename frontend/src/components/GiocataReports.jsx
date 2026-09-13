import React, { useEffect, useState } from "react";
import { FaSyncAlt } from "react-icons/fa";
import api from "../services/api";
import GiocataReportCharts from "./GiocataReportCharts";
import GiocataAttendance from "./GiocataAttendance";
import GiocataBalances from "./GiocataBalances";
import "./GiocataReports.css";

const ranges = [["today", "Hoy"], ["week", "Semana"], ["month", "Mes"], ["last30", "Últimos 30 días"]];
const money = (value) => new Intl.NumberFormat("es-CL", {
  style: "currency", currency: "CLP", maximumFractionDigits: 0,
}).format(value);
const dateLabel = (value) => value.split("-").reverse().join("-");

export default function GiocataReports({ onAttendanceUpdated, onOpenPayment, paymentRevision = 0 }) {
  const [range, setRange] = useState("today");
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [balancesOpen, setBalancesOpen] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [notice, setNotice] = useState("");

  const handleAttendanceUpdated = (appointment, name) => {
    setNotice(`${name}: ${appointment.status === "atendida" ? "marcada como atendida" : "marcada como no asistió"}.`);
    setRevision((value) => value + 1);
    onAttendanceUpdated?.(appointment);
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setData(null);
    api.get("/admin/giocata/reports", { params: { range } })
      .then((response) => { if (active) setData(response.data); })
      .catch((failure) => {
        if (active) setError(failure.response?.status === 401
          ? "Tu sesión caducó. Inicia sesión nuevamente."
          : failure.response?.status === 403
            ? "Tu cuenta no tiene acceso a estos reportes."
            : "No se pudieron cargar los reportes. Intenta nuevamente.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [range, revision, paymentRevision]);

  const summary = data?.summary;
  const maxReservations = Math.max(1, ...(data?.daily || []).map((day) => day.reservations));
  const maxIncome = Math.max(1, ...(data?.daily || []).map((day) => day.income));
  return <section className="giocata-reports" id="giocata-reports" aria-labelledby="gr-title">
    <header className="gr-heading">
      <div><h2 id="gr-title">Reportes de Giocata</h2><p className="gr-muted">Centro Deportivo La Giocata</p></div>
      <button type="button" className="gr-refresh" disabled={loading || savingAttendance} onClick={() => setRevision((value) => value + 1)}>
        <FaSyncAlt aria-hidden="true" /> Actualizar
      </button>
    </header>
    <div className="gr-ranges" role="group" aria-label="Período del reporte">
      {ranges.map(([key, label]) => <button type="button" key={key} aria-pressed={range === key} disabled={savingAttendance}
        onClick={() => { setRange(key); setNotice(""); }}>{label}</button>)}
    </div>
    {loading && <p role="status" className="gr-status">Cargando reportes...</p>}
    {error && <p role="alert" className="gr-error">{error}</p>}
    {notice && <p role="status" className="gr-success">{notice}</p>}
    {data && !loading && <>
      <div className="gr-period">
        <strong>{dateLabel(data.range.start)} al {dateLabel(data.range.end)}</strong>
        <span>Hora de Chile · Actualizado {new Date(data.generatedAt).toLocaleTimeString("es-CL", { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit" })}</span>
      </div>
      <div className="gr-metrics">
        {[
          ["Ingresos cobrados", money(summary.income), "income"],
          ["Reservas totales", summary.reservations, ""],
          ["Atendidas", summary.attended, ""],
          ["Con saldo pendiente", summary.pendingPayment, ""],
          ["Saldo pendiente", money(summary.pendingBalance), "balance"],
          ["Canceladas registradas", summary.cancelled, ""],
          ["No asistidas", summary.noShow, ""],
        ].map(([label, value, tone]) => tone === "balance" ?
          <button type="button" className="gr-metric gr-balance-toggle balance" key={label}
            aria-expanded={balancesOpen} aria-controls="gr-balances" disabled={savingAttendance}
            onClick={() => { setBalancesOpen((open) => !open); setAttendanceOpen(false); }}>
            <span>{label}</span><strong>{value}</strong>
          </button> : <div className={`gr-metric ${tone}`} key={label}>
          <span>{label}</span><strong>{value}</strong>
        </div>)}
        <button type="button" className="gr-metric gr-attendance-toggle" aria-expanded={attendanceOpen}
          aria-controls="gr-attendance" disabled={savingAttendance} onClick={() => { setAttendanceOpen((open) => !open); setBalancesOpen(false); }}>
          <span>Asistencia por registrar</span><strong>{summary.pendingAttendance ?? 0}</strong>
        </button>
      </div>
      {balancesOpen && <GiocataBalances key={`balances-${range}-${paymentRevision}`} range={range} onOpenPayment={onOpenPayment} />}
      {attendanceOpen && <GiocataAttendance key={`attendance-${range}`} range={range}
        onUpdated={handleAttendanceUpdated} onBusyChange={setSavingAttendance} />}
      <p className="gr-note">Cobros y saldos correspondientes a las reservas del período, no a la fecha del pago. Los saldos excluyen las canceladas.</p>
      {summary.reservations === 0 && <p className="gr-status">No hay reservas registradas para este período.</p>}
      <GiocataReportCharts key={`charts-${range}-${revision}`} data={data} />
      <section className="gr-daily">
        <h3>Reservas e ingresos por día</h3>
        <div className="gr-table-scroll" tabIndex={0} role="region" aria-label="Detalle diario">
        <table>
          <caption className="gr-muted">Fecha de la reserva · Montos en CLP</caption>
          <thead><tr><th scope="col">Día</th><th scope="col">Reservas</th><th scope="col">Cobrado</th></tr></thead>
          <tbody>{data.daily.map((day) => <tr key={day.date}>
            <th scope="row">{dateLabel(day.date).slice(0, 5)}</th>
            <td><strong>{day.reservations}</strong><div className="gr-track" aria-hidden="true"><span style={{ width: `${day.reservations / maxReservations * 100}%` }} /></div></td>
            <td><strong>{money(day.income)}</strong><div className="gr-track gr-income-track" aria-hidden="true"><span style={{ width: `${day.income / maxIncome * 100}%` }} /></div></td>
          </tr>)}</tbody>
        </table>
        </div>
      </section>
      <p className="gr-note">Horarios y espacios: reservas no canceladas. El historial no incluye reservas ni pagos eliminados.</p>
    </>}
  </section>;
}
