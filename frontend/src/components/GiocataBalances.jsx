import React, { useEffect, useState } from "react";
import { FaChevronLeft, FaChevronRight, FaMoneyBillWave, FaSyncAlt } from "react-icons/fa";
import api from "../services/api";

const money = (value) => new Intl.NumberFormat("es-CL", {
  style: "currency", currency: "CLP", maximumFractionDigits: 0,
}).format(Number(value || 0));

export default function GiocataBalances({ range, onOpenPayment }) {
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setResult(null);
    api.get("/admin/giocata/reports/balances", { params: { range, page } })
      .then(({ data }) => { if (active) setResult(data); })
      .catch((failure) => { if (active) setError(
        [401, 403].includes(failure.response?.status)
          ? "Tu sesión no permite ver estos saldos. Vuelve a iniciar sesión."
          : "No se pudieron cargar los saldos. Intenta nuevamente."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [range, page, revision]);

  return <section id="gr-balances" className="gr-attendance" aria-labelledby="gr-balances-title">
    <header className="gr-heading">
      <div><h3 id="gr-balances-title">Saldos pendientes</h3><p className="gr-muted">Reservas no canceladas del período seleccionado</p></div>
      <button type="button" className="gr-refresh" disabled={loading}
        onClick={() => { setPage(1); setRevision((value) => value + 1); }}><FaSyncAlt aria-hidden="true" /> Actualizar lista</button>
    </header>
    {loading && <p role="status">Cargando saldos...</p>}
    {error && <p role="alert" className="gr-error">{error}</p>}
    {result && <>
      {!result.items.length && <p className="gr-status">No hay reservas con saldo pendiente en esta página.</p>}
      <ul className="gr-balance-list">{result.items.map((appointment) => <li key={appointment.id}>
        <div className="gr-attendance-person"><strong>{appointment.name}</strong>
          <span>{appointment.barber} · {appointment.date.split("-").reverse().join("-")} · {appointment.time}</span>
        </div>
        <dl className="gr-balance-amounts">
          <div><dt>Total</dt><dd>{money(appointment.total_amount)}</dd></div>
          <div><dt>Pagado</dt><dd>{money(appointment.total_paid)}</dd></div>
          <div><dt>Saldo</dt><dd>{money(appointment.balance)}</dd></div>
        </dl>
        <button type="button" className="gr-balance-pay" aria-label={`Registrar pago de ${appointment.name}`}
          onClick={() => onOpenPayment(appointment)}><FaMoneyBillWave aria-hidden="true" /> Registrar pago</button>
      </li>)}</ul>
      <nav className="gr-pagination" aria-label="Páginas de saldos">
        <button type="button" title="Página anterior" aria-label="Página anterior" disabled={page === 1} onClick={() => setPage((value) => value - 1)}><FaChevronLeft /></button>
        <span>Página {page}</span>
        <button type="button" title="Página siguiente" aria-label="Página siguiente" disabled={!result.hasMore || page >= 200} onClick={() => setPage((value) => value + 1)}><FaChevronRight /></button>
      </nav>
    </>}
  </section>;
}
