import React from "react";

function AdminBookingPanel({
  styles,
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
  updateAppointment,
  createAppointment,
  resetForm,
  submitting,
  message,
}) {
  return (
    <div style={{ ...styles.card, maxWidth: isCompactAdmin ? "100%" : "320px" }}>
      <h2 style={styles.sectionTitle}>
        {editingId ? "Editar cita" : "Nueva cita"}
      </h2>

      <div style={styles.formGroup}>
        <input
          style={styles.input}
          placeholder="Nombre cliente"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          style={styles.input}
          placeholder="Teléfono cliente"
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
>  <option value="">Selecciona un servicio</option>
<option value="Corte tradicional ($8.000)">Corte tradicional ($8.000)</option>
<option value="Degradado premium ($10.000)">Degradado premium ($10.000)</option>
<option value="Corte + barba premium ($15.000)">Corte + barba premium ($15.000)</option>
<option value="Perfilado de cejas ($2.000)">Perfilado de cejas ($2.000)</option>
<option value="Servicio completo ($17.000)">Servicio completo ($17.000)</option>
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
              {submitting ? "Actualizando..." : "Actualizar cita"}
            </button>

            <button
              style={{ ...styles.button, ...styles.secondaryButton }}
              onClick={resetForm}
            >
              Cancelar edición
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
            {submitting ? "Creando..." : "Crear cita"}
          </button>
        )}

        {message && <p style={styles.message}>{message}</p>}
      </div>
    </div>
  );
}

export default AdminBookingPanel;