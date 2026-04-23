import React from "react";

function AdminBookingPanel({
  styles,
  business,
  isCompactAdmin,
  editingId,
  name,
  setName,
  phone,
  setPhone,
  date,
  setDate,
  time,
  setTime,
  service,
  setService,
  barber,
  setBarber,
  BARBERS,
  SERVICES,
  customServiceName,
  setCustomServiceName,
  customServicePrice,
  setCustomServicePrice,
  updateAppointment,
  createAppointment,
  resetForm,
  submitting,
  message,
}) {
  return (
    <div style={{ ...styles.card, maxWidth: isCompactAdmin ? "100%" : "320px" }}>
      <h2 style={styles.sectionTitle}>
        {editingId
          ? business?.editItemTitle || "Editar reserva"
          : business?.newItemTitle || "Nueva reserva"}
      </h2>

      <div style={styles.formGroup}>
        <input
          style={styles.input}
          placeholder={business?.clientNamePlaceholder || "Nombre cliente"}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          style={styles.input}
          placeholder={business?.clientPhonePlaceholder || "Teléfono cliente"}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <input
          style={styles.input}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <input
          style={styles.input}
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
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
        
        <div
  style={{
    border: "1px solid #d1d5db",
    borderRadius: "10px",
    padding: "12px",
    backgroundColor: "#f9fafb",
  }}
>
  <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
    Servicio personalizado
  </div>

  <input
    style={styles.input}
    placeholder="Nombre del servicio especial"
    value={customServiceName}
    onChange={(e) => setCustomServiceName(e.target.value)}
  />

  <input
    style={styles.input}
    placeholder="Precio ejemplo: 18000"
    value={customServicePrice}
    onChange={(e) =>
      setCustomServicePrice(e.target.value.replace(/\D/g, ""))
    }
  />

  <button
    type="button"
    style={{ ...styles.button, ...styles.secondaryButton, width: "100%" }}
    onClick={() => {
      if (!customServiceName.trim() || !customServicePrice.trim()) return;

      setService(
        `${customServiceName.trim()} ($${Number(customServicePrice).toLocaleString("es-CL")})`
      );
    }}
  >
    Usar servicio personalizado
  </button>

  {service && (
  <div
    style={{
      marginTop: "10px",
      backgroundColor: "#ecfdf5",
      border: "1px solid #86efac",
      color: "#166534",
      borderRadius: "8px",
      padding: "10px 12px",
      fontWeight: "bold",
      fontSize: "14px",
    }}
  >
    Servicio seleccionado: {service}
  </div>
)}

</div>

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

        {editingId ? (
          <>
            <button
              style={{
                ...styles.button,
                ...styles.editButton,
                ...(submitting ? styles.disabledButton : {}),
              }}
              onClick={updateAppointment}
              disabled={submitting}
            >
              {submitting
                ? business?.updatingLabel || "Actualizando..."
                : business?.updateButtonLabel || "Actualizar reserva"}
            </button>

            <button
              style={{ ...styles.button, ...styles.secondaryButton }}
              onClick={resetForm}
            >
              {business?.cancelEditLabel || "Cancelar edición"}
            </button>
          </>
        ) : (
          <button
            style={{
              ...styles.button,
              ...styles.primaryButton,
              ...(submitting ? styles.disabledButton : {}),
            }}
            onClick={createAppointment}
            disabled={submitting}
          >
            {submitting
              ? business?.creatingLabel || "Creando..."
              : business?.createButtonLabel || "Crear reserva"}
          </button>
        )}

        {message && <p style={styles.message}>{message}</p>}
      </div>
    </div>
  );
}

export default AdminBookingPanel;