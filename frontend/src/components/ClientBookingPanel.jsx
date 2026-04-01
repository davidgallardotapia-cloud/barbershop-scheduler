import React from "react";

function ClientBookingPanel({
  styles,
  name,
  setName,
  phone,
  setPhone,
  service,
  setService,
  barber,
  setBarber,
  date,
  time,
  SERVICES,
  BARBERS,
  createAppointment,
  submitting,
  isClientFormComplete,
  message,
}) {
  return (
    <div style={styles.card}>
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ marginTop: 0 }}>Agenda tu hora</h2>
        <p style={{ color: "#4b5563", lineHeight: 1.5, marginBottom: "8px" }}>
          Elige tu barbero, selecciona un bloque disponible y confirma tu
          reserva en segundos.
        </p>
        <p
          style={{
            color: "#2563eb",
            fontWeight: "bold",
            margin: 0,
            fontSize: "14px",
          }}
        >
          Para reservar, primero selecciona un bloque disponible en el
          calendario.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <input
          style={styles.input}
          placeholder="Tu nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          style={styles.input}
          placeholder="Tu teléfono"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <select
          style={styles.select}
          value={service}
          onChange={(e) => setService(e.target.value)}
        >
          <option value="">Selecciona un servicio</option>
          {SERVICES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          style={styles.select}
          value={barber}
          onChange={(e) => setBarber(e.target.value)}
        >
          <option value="">Selecciona un barbero</option>
          {BARBERS.map((barberName) => (
            <option key={barberName} value={barberName}>
              {barberName}
            </option>
          ))}
        </select>

        <div
          style={{
            backgroundColor: "#f9fafb",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            padding: "12px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            minHeight: "44px",
          }}
        >
          <span
            style={{ fontSize: "12px", color: "#6b7280", fontWeight: "bold" }}
          >
            Fecha seleccionada
          </span>
          <span style={{ fontSize: "14px", color: "#111827" }}>
            {date || "Selecciona un bloque disponible"}
          </span>
        </div>

        <div
          style={{
            backgroundColor: "#f9fafb",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            padding: "12px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            minHeight: "44px",
          }}
        >
          <span
            style={{ fontSize: "12px", color: "#6b7280", fontWeight: "bold" }}
          >
            Hora seleccionada
          </span>
          <span style={{ fontSize: "14px", color: "#111827" }}>
            {time || "Selecciona un bloque disponible"}
          </span>
        </div>

        <button
          style={{
            ...styles.button,
            ...styles.primaryButton,
            ...((submitting || !isClientFormComplete)
              ? styles.disabledButton
              : {}),
          }}
          onClick={createAppointment}
          disabled={submitting || !isClientFormComplete}
        >
          {submitting ? "Reservando..." : "Confirmar reserva"}
        </button>
      </div>

      {message && <p style={styles.message}>{message}</p>}
    </div>
  );
}

export default ClientBookingPanel;