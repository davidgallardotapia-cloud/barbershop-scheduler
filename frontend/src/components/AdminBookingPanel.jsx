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
  clientSuggestions = [],
  loadingClientSuggestions = false,
  clientSuggestionQuery = "",
  clientSuggestionError = "",
  onClientSuggestionSelect = () => {},
  clientRut = "",
  setClientRut = () => {},
  clientEmail = "",
  setClientEmail = () => {},
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
  lockedResourceName = "",
  customServiceName,
  setCustomServiceName,
  customServicePrice,
  setCustomServicePrice,

  needsOpponent,
  setNeedsOpponent,
  opponentName,
  setOpponentName,
  opponentPhone,
  setOpponentPhone,
  isSportsBusiness,
  isCustomServiceBusiness,
  isCustomPriceBusiness,

  isMonthlyReservation,
  setIsMonthlyReservation,
  createMonthlyAppointment,

  updateAppointment,
  createAppointment,
  resetForm,
  submitting,
  message,
}) {
  const applyCustomPriceToSelectedService = () => {
    if (!service || !customServicePrice.trim()) return;

    const serviceWithoutPrice = service
      .replace(/\s*\(\$[\d.,]+\)\s*$/g, "")
      .trim();

    const formattedPrice = Number(customServicePrice).toLocaleString("es-CL");

    setService(`${serviceWithoutPrice} ($${formattedPrice})`);
  };


  const hasClientSuggestions = clientSuggestions.length > 0;
  const shouldShowClientSuggestions = clientSuggestionQuery.trim().length >= 2;
  const formatSuggestionPhone = (value) => {
    const digits = String(value || "").replace(/\D/g, "");

    if (digits.startsWith("569") && digits.length === 11) {
      return `+56 9 ${digits.slice(3, 7)} ${digits.slice(7)}`;
    }

    return value || "Sin telefono";
  };

  const handleCreateClick = () => {
    if (isMonthlyReservation && createMonthlyAppointment) {
      createMonthlyAppointment();
      return;
    }

    createAppointment();
  };

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

        {shouldShowClientSuggestions && (
          <div
            style={{
              border: "1px solid #bbf7d0",
              borderRadius: "12px",
              backgroundColor: "#f0fdf4",
              padding: "10px",
            }}
          >
            <div
              style={{
                color: "#14532d",
                fontSize: "13px",
                fontWeight: "800",
                marginBottom: hasClientSuggestions || clientSuggestionError ? "8px" : 0,
              }}
            >
              {loadingClientSuggestions
                ? "Buscando clientes..."
                : "Clientes encontrados"}
            </div>

            {hasClientSuggestions && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {clientSuggestions.map((client) => (
                  <button
                    key={`${client.phone || client.name}-${client.clientRut || ""}`}
                    type="button"
                    onClick={() => onClientSuggestionSelect(client)}
                    style={{
                      border: "1px solid #86efac",
                      borderRadius: "10px",
                      backgroundColor: "#ffffff",
                      color: "#052e16",
                      cursor: "pointer",
                      padding: "10px 12px",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ fontWeight: "900" }}>{client.name}</div>
                    <div style={{ color: "#166534", fontSize: "13px", marginTop: "2px" }}>
                      {formatSuggestionPhone(client.phone)}
                    </div>
                    <div style={{ color: "#64748b", fontSize: "12px", marginTop: "2px" }}>
                      {client.reservationsCount || 1} reserva(s) previas
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {business?.clinicalRecordsEnabled && (
          <>
            <input
              style={styles.input}
              placeholder="RUT paciente"
              value={clientRut}
              onChange={(e) => setClientRut(e.target.value)}
            />

            <input
              style={styles.input}
              type="email"
              placeholder="Correo paciente"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
            />
          </>
        )}

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

        {isCustomPriceBusiness && (
          <div
            style={{
              border: "1px solid #bbf7d0",
              borderRadius: "12px",
              padding: "12px",
              backgroundColor: "#f0fdf4",
            }}
          >
            <div
              style={{
                fontWeight: "bold",
                marginBottom: "6px",
                color: "#14532d",
              }}
            >
              Precio personalizado
            </div>

            <p
              style={{
                margin: "0 0 10px 0",
                color: "#166534",
                fontSize: "13px",
                lineHeight: 1.4,
              }}
            >
              Mantiene el tipo de cancha seleccionado, pero permite cambiar el
              precio solo para esta reserva.
            </p>

            <input
              style={styles.input}
              placeholder="Nuevo precio ejemplo: 18000"
              value={customServicePrice}
              onChange={(e) =>
                setCustomServicePrice(e.target.value.replace(/\D/g, ""))
              }
            />

            <button
              type="button"
              style={{
                ...styles.button,
                ...styles.secondaryButton,
                width: "100%",
              }}
              onClick={applyCustomPriceToSelectedService}
            >
              Aplicar precio personalizado
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
                Servicio final: {service}
              </div>
            )}
          </div>
        )}

        {isCustomServiceBusiness && (
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
              style={{
                ...styles.button,
                ...styles.secondaryButton,
                width: "100%",
              }}
              onClick={() => {
                if (!customServiceName.trim() || !customServicePrice.trim()) {
                  return;
                }

                setService(
                  `${customServiceName.trim()} ($${Number(
                    customServicePrice
                  ).toLocaleString("es-CL")})`
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
        )}

        {!business?.hideResourceSelector && lockedResourceName && (
          <select style={styles.select} value={lockedResourceName} disabled>
            <option value={lockedResourceName}>{lockedResourceName}</option>
          </select>
        )}

        {!business?.hideResourceSelector && !lockedResourceName && (
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

        {isSportsBusiness && (
          <div
            style={{
              border: "1px solid #bfdbfe",
              borderRadius: "12px",
              padding: "12px",
              backgroundColor: "#eff6ff",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontWeight: "bold",
                color: "#1e3a8a",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={needsOpponent}
                onChange={(e) => {
                  setNeedsOpponent(e.target.checked);

                  if (!e.target.checked) {
                    setOpponentName("");
                    setOpponentPhone("");
                  }
                }}
                style={{
                  width: "18px",
                  height: "18px",
                  cursor: "pointer",
                }}
              />

              Se busca rival
            </label>

            <p
              style={{
                margin: "8px 0 0 0",
                color: "#1e40af",
                fontSize: "13px",
                lineHeight: 1.4,
              }}
            >
              Activa esta opción cuando un equipo reserve la cancha y quiera
              encontrar rival. En la vista cliente aparecerá como partido
              abierto.
            </p>

            {needsOpponent && (
              <div style={{ marginTop: "12px" }}>
                <input
                  style={styles.input}
                  placeholder="Nombre del rival si ya está confirmado (opcional)"
                  value={opponentName}
                  onChange={(e) => setOpponentName(e.target.value)}
                />

                <input
                  style={styles.input}
                  placeholder="Celular del rival si ya está confirmado (opcional)"
                  value={opponentPhone}
                  onChange={(e) => setOpponentPhone(e.target.value)}
                />
              </div>
            )}
          </div>
        )}

        {isSportsBusiness && !editingId && (
          <div
            style={{
              border: "1px solid #fde68a",
              borderRadius: "12px",
              padding: "12px",
              backgroundColor: "#fffbeb",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontWeight: "bold",
                color: "#92400e",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={Boolean(isMonthlyReservation)}
                onChange={(e) => setIsMonthlyReservation(e.target.checked)}
                style={{
                  width: "18px",
                  height: "18px",
                  cursor: "pointer",
                }}
              />

              Reserva mensual
            </label>

            <p
              style={{
                margin: "8px 0 0 0",
                color: "#92400e",
                fontSize: "13px",
                lineHeight: 1.4,
              }}
            >
              Crea reservas semanales para el mismo día, hora y cancha durante
              un mes. Si alguna fecha está ocupada, no se creará la reserva
              mensual.
            </p>
          </div>
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
            onClick={handleCreateClick}
            disabled={submitting}
          >
            {submitting
              ? isMonthlyReservation
                ? "Creando reserva mensual..."
                : business?.creatingLabel || "Creando..."
              : isMonthlyReservation
              ? "Crear reserva mensual"
              : business?.createButtonLabel || "Crear reserva"}
          </button>
        )}

        {message && <p style={styles.message}>{message}</p>}
      </div>
    </div>
  );
}

export default AdminBookingPanel;
