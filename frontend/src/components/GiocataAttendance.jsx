import React, { useEffect, useRef, useState } from "react";
import { FaCheck, FaTimes, FaChevronLeft, FaChevronRight, FaSyncAlt } from "react-icons/fa";
import api from "../services/api";

export default function GiocataAttendance({ range, onUpdated, onBusyChange }) {
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [saving, setSaving] = useState(null);
  const inFlight = useRef(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setResult(null);
    api.get("/admin/giocata/reports/attendance", { params: { range, page } })
      .then(({ data }) => { if (active) setResult(data); })
      .catch(() => { if (active) setError("No se pudo cargar la lista. Intenta nuevamente."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [range, page, revision]);

  const mark = async (appointment, status) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSaving(appointment.id);
    onBusyChange(true);
    setActionError("");
    try {
      const response = await api.patch(`/admin/giocata/reports/attendance/${appointment.id}`, { status });
      onUpdated(response.data.data, appointment.name);
    } catch (failure) {
      setActionError(failure.response?.status === 409
        ? "La reserva ya cambió o todavía no finaliza. Actualiza la lista."
        : failure.response?.status === 401 || failure.response?.status === 403
          ? "Tu sesión no permite registrar asistencia. Vuelve a iniciar sesión."
          : "No se confirmó el cambio. Actualiza la lista antes de intentarlo nuevamente.");
    } finally {
      setSaving(null);
      inFlight.current = false;
      onBusyChange(false);
    }
  };

  return <section id="gr-attendance" className="gr-attendance" aria-labelledby="gr-attendance-title">
    <header className="gr-heading">
      <div><h3 id="gr-attendance-title">Asistencia por registrar</h3><p className="gr-muted">Reservas finalizadas del período seleccionado</p></div>
      <button type="button" className="gr-refresh" disabled={loading || saving !== null}
        onClick={() => { setPage(1); setRevision((value) => value + 1); }}><FaSyncAlt aria-hidden="true" /> Actualizar lista</button>
    </header>
    {loading && <p role="status">Cargando reservas...</p>}
    {error && <p role="alert" className="gr-error">{error}</p>}
    {actionError && <p role="alert" className="gr-error">{actionError}</p>}
    {result && <>
      {!result.items.length && <p className="gr-status">No hay asistencias pendientes en esta página.</p>}
      <ul className="gr-attendance-list">{result.items.map((appointment) => <li key={appointment.id}>
        <div className="gr-attendance-person"><strong>{appointment.name}</strong>
          <span>{appointment.barber} · {appointment.date.split("-").reverse().join("-")} · {appointment.time}{appointment.barber === "Quincho" ? " a 23:30" : ""}</span>
        </div>
        <div className="gr-attendance-actions" role="group" aria-label={`Asistencia de ${appointment.name}`}>
          <button type="button" className="gr-attended" disabled={saving !== null} onClick={() => mark(appointment, "atendida")}><FaCheck aria-hidden="true" /> Atendida</button>
          <button type="button" className="gr-no-show" disabled={saving !== null} onClick={() => mark(appointment, "no_asistio")}><FaTimes aria-hidden="true" /> No asistió</button>
        </div>
        {saving === appointment.id && <span role="status">Guardando asistencia...</span>}
      </li>)}</ul>
      <nav className="gr-pagination" aria-label="Páginas de asistencias">
        <button type="button" title="Página anterior" aria-label="Página anterior" disabled={page === 1 || saving !== null} onClick={() => setPage((value) => value - 1)}><FaChevronLeft /></button>
        <span>Página {page}</span>
        <button type="button" title="Página siguiente" aria-label="Página siguiente" disabled={!result.hasMore || saving !== null || page >= 200} onClick={() => setPage((value) => value + 1)}><FaChevronRight /></button>
      </nav>
    </>}
  </section>;
}
