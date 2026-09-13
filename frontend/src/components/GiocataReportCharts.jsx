import React, { useState } from "react";

const money = (value) => new Intl.NumberFormat("es-CL", {
  style: "currency", currency: "CLP", maximumFractionDigits: 0,
}).format(value);
const compactMoney = (value) => `$${new Intl.NumberFormat("es-CL", {
  notation: "compact", maximumFractionDigits: 1,
}).format(value)}`;

function Chart({ title, rows, kind }) {
  const [selected, setSelected] = useState(null);
  const isIncome = kind === "line";
  const horizontal = kind === "horizontal";
  const maximum = Math.max(1, ...rows.map((row) => row.value));
  const magnitude = 10 ** Math.floor(Math.log10(maximum / 4));
  const step = Math.max(1, Math.ceil(maximum / 4 / magnitude) * magnitude);
  const ceiling = step * 4;
  const ticks = Array.from({ length: 5 }, (_, index) => index * step);
  const left = horizontal ? 50 : isIncome ? 62 : 30;
  const right = 334;
  const top = 24;
  const bottom = 210;
  const plotWidth = right - left;
  const plotHeight = bottom - top;
  const x = (index) => left + (rows.length === 1 ? plotWidth / 2 : index * plotWidth / (rows.length - 1));
  const y = (value) => bottom - value / ceiling * plotHeight;
  const valueLabel = (value) => isIncome ? money(value) : `${value} reservas`;
  const activeRow = selected === null ? null : rows[selected];
  const activate = (index) => ({
    tabIndex: 0, role: "img", "aria-label": `${rows[index].label}: ${valueLabel(rows[index].value)}`,
    onFocus: () => setSelected(index), onBlur: () => setSelected(null),
    onMouseEnter: () => setSelected(index), onMouseLeave: () => setSelected(null),
    onClick: () => setSelected(index),
  });
  const labelIndices = new Set([0, Math.floor((rows.length - 1) / 2), rows.length - 1]);

  return <section className={`gr-chart gr-chart-${kind}`} aria-label={title}>
    <h3>{title}</h3>
    <p className="gr-chart-unit">{isIncome ? "CLP · Fecha de reserva" : "Reservas no canceladas"}</p>
    {!rows.length ? <div className="gr-chart-empty">Sin reservas en este período.</div> :
      <svg viewBox="0 0 360 264" className="gr-chart-svg" role="group" aria-label={title}>
        {ticks.map((value) => <g key={value} className="gr-chart-axis">
          {horizontal ? <>
            <line x1={left + value / ceiling * plotWidth} x2={left + value / ceiling * plotWidth} y1={top} y2={bottom} />
            <text x={left + value / ceiling * plotWidth} y={bottom + 22} textAnchor="middle">{value}</text>
          </> : <>
            <line x1={left} x2={right} y1={y(value)} y2={y(value)} />
            <text x={left - 8} y={y(value) + 4} textAnchor="end">{isIncome ? compactMoney(value) : value}</text>
          </>}
        </g>)}
        {kind === "vertical" && rows.map((row, index) => {
          const band = plotWidth / rows.length;
          const center = left + band * (index + 0.5);
          return <g key={row.label}>
            <rect {...activate(index)} x={center - band * 0.32} y={y(row.value)}
              width={band * 0.64} height={bottom - y(row.value)} rx="2" className="gr-chart-bar">
              <title>{row.label}: {row.value} reservas</title>
            </rect>
            <text x={center} y={y(row.value) - 7} textAnchor="middle" className="gr-chart-value">{row.value}</text>
            <text x={center} y={bottom + 22} textAnchor="middle" className="gr-chart-label">
              {row.label.match(/^Cancha\s+(\d+)$/i) ? `C${row.label.match(/\d+/)[0]}` : row.label === "Quincho" ? "Q" : `S${index + 1}`}
            </text>
          </g>;
        })}
        {horizontal && rows.map((row, index) => {
          const band = plotHeight / rows.length;
          const center = top + band * (index + 0.5);
          return <g key={row.label}>
            <text x={left - 8} y={center + 4} textAnchor="end" className="gr-chart-label">{row.label}</text>
            <rect {...activate(index)} x={left} y={center - band * 0.3} width={row.value / ceiling * plotWidth}
              height={band * 0.6} rx="2" className="gr-chart-bar"><title>{row.label}: {row.value} reservas</title></rect>
            <text x={left + row.value / ceiling * plotWidth + 5} y={center + 4} className="gr-chart-value">{row.value}</text>
          </g>;
        })}
        {isIncome && <>
          <polyline points={rows.map((row, index) => `${x(index)},${y(row.value)}`).join(" ")}
            fill="none" stroke="#258355" strokeWidth="2.5" strokeLinejoin="round" />
          {rows.map((row, index) => <g key={row.label}>
            <circle cx={x(index)} cy={y(row.value)} r={selected === index ? 5 : 3} fill="#258355" />
            <circle {...activate(index)} cx={x(index)} cy={y(row.value)} r="9" fill="transparent">
              <title>{row.label}: {money(row.value)}</title>
            </circle>
            {labelIndices.has(index) && <text x={x(index)} y={bottom + 22} textAnchor="middle" className="gr-chart-label">{row.shortLabel}</text>}
          </g>)}
        </>}
      </svg>}
    <div className="gr-chart-detail" aria-live="polite">
      {activeRow ? <><strong>{activeRow.label}</strong><span>{valueLabel(activeRow.value)}</span></> :
        <span>{kind === "vertical" ? "C: cancha · Q: quincho" : isIncome ? "Cobros de las reservas del período" : "Cantidad de reservas por hora"}</span>}
    </div>
  </section>;
}

export default function GiocataReportCharts({ data }) {
  return <div className="gr-charts">
    <Chart title="Reservas por cancha" kind="vertical" rows={data.resources.map((row) => ({ label: row.label, value: row.count }))} />
    <Chart title="Ingresos por día" kind="line" rows={data.daily.map((row) => ({
      label: row.date.split("-").reverse().join("-"), shortLabel: row.date.slice(5).split("-").reverse().join("/"), value: row.income,
    }))} />
    <Chart title="Reservas por horario" kind="horizontal" rows={data.hours.map((row) => ({ label: row.label, value: row.count }))} />
  </div>;
}
