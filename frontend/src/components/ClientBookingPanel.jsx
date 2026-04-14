import React from "react";

function ClientBookingPanel({
  styles,
  business,
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
  whatsappUrl,
}) {
  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ marginTop: 0 }}>
          {business?.bookingPanelTitle || "Reserva online"}
        </h2>

        <p style={{ color: "#4b5563", lineHeight: 1.5, marginBottom: "8px" }}>
          {business?.bookingPanelDescription ||
            "Selecciona un bloque disponible y confirma tu reserva en segundos."}
        </p>

        <p
          style={{
            color: "#2563eb",
            fontWeight: "bold",
            margin: 0,
            fontSize: "14px",
          }}
        >
          {business?.calendarHelpText ||
            "Para reservar, primero selecciona un bloque disponible en el calendario."}
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
          placeholder={business?.clientNamePlaceholder || "Tu nombre"}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          style={styles.input}
          placeholder={business?.clientPhonePlaceholder || "Tu teléfono"}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <select
          style={styles.select}
          value={service}
          onChange={(e) => setService(e.target.value)}
        >
          <option value="">
            {business?.serviceSelectOption || "Selecciona un servicio"}
          </option>
          {SERVICES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        {!business?.hideResourceSelector && (
  <select
    style={styles.select}
    value={barber}
    onChange={(e) => setBarber(e.target.value)}
  >
    <option value="">
      {business?.resourceSelectOption || "Selecciona un recurso"}
    </option>
    {BARBERS.map((barberName) => (
      <option key={barberName} value={barberName}>
        {barberName}
      </option>
    ))}
  </select>
)}

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
          {submitting
            ? business?.submittingLabel || "Procesando..."
            : business?.submitButtonLabel || "Confirmar reserva"}
        </button>
      </div>

      {message && <p style={styles.message}>{message}</p>}

      {whatsappUrl && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            marginTop: "12px",
            marginBottom: "24px",
            padding: "12px 16px",
            backgroundColor: "#25D366",
            color: "#fff",
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: "bold",
          }}
        >
          {business?.whatsappButtonLabel || "Abrir WhatsApp"}
        </a>
      )}
    </div>
  );
}

export default ClientBookingPanel;