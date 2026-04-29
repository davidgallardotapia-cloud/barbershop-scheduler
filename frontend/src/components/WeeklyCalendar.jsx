import React from "react";
import { isSunday } from "../utils/dateUtils";

function WeeklyCalendar({
  styles,
  business,
  loading,
  isMobile,
  weekDays,
  selectedMobileDay,
  setSelectedMobileDay,
  formatDateToInput,
  formatHourLabel,
  sameDate,
  date,
  time,
  hours,
  mobileSlots,
  isBarberSelected,
  selectSlot,
  setDate,
  setTime,
  getAppointmentsForSlot,
  getBarberColors,
  isClientMode,
  barber,
  editAppointment,
  deleteAppointment,
  markAppointmentAsAttended,
  markAppointmentAsNoShow,
  submitting,
  isPastSlot,
  isPastDayOnly,
  openPaymentPanel,
}) {
  const resourcePrompt = business?.hideResourceSelector
    ? "Disponible"
    : business?.resourceSelectPrompt || "Selecciona un recurso arriba";

  const isGiocata = business?.id === "giocata";
  const isSportsBusiness = ["giocata", "pinguino-club"].includes(business?.id);

  const getPaymentStatusInfo = (paymentStatus) => {
    switch (paymentStatus) {
      case "paid":
        return {
          label: "Pagado",
          icon: "✅",
          background: "#dcfce7",
          border: "#86efac",
          color: "#166534",
        };

      case "partially_paid":
        return {
          label: "Parcial",
          icon: "🟡",
          background: "#fef9c3",
          border: "#fde047",
          color: "#854d0e",
        };

      case "deposit_paid":
        return {
          label: "Abono",
          icon: "🟠",
          background: "#ffedd5",
          border: "#fdba74",
          color: "#9a3412",
        };

      case "deposit_pending":
        return {
          label: "Pendiente",
          icon: "⏳",
          background: "#e0f2fe",
          border: "#7dd3fc",
          color: "#075985",
        };

      case "unpaid":
      default:
        return {
          label: "Sin pago",
          icon: "🔴",
          background: "#fee2e2",
          border: "#fecaca",
          color: "#991b1b",
        };
    }
  };

  const renderPaymentStatus = (appointment, extraStyle = {}) => {
    if (!business?.paymentsEnabled) return null;

    const paymentInfo = getPaymentStatusInfo(appointment.payment_status);

    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          width: "fit-content",
          maxWidth: "100%",
          padding: "4px 7px",
          borderRadius: "999px",
          backgroundColor: paymentInfo.background,
          border: `1px solid ${paymentInfo.border}`,
          color: paymentInfo.color,
          fontWeight: "800",
          fontSize: "11px",
          lineHeight: 1,
          marginTop: "4px",
          whiteSpace: "nowrap",
          ...extraStyle,
        }}
      >
        <span style={{ fontSize: "10px", lineHeight: 1 }}>
          {paymentInfo.icon}
        </span>
        <span>{paymentInfo.label}</span>
      </div>
    );
  };

  const mobileGroupedSlots =
    !isClientMode && isMobile
      ? mobileSlots.map((slot) => ({
          ...slot,
          appointments: slot.appointments || [],
        }))
      : [];

  return (
    <>
      {isMobile && (
        <div style={{ marginBottom: "14px", overflowX: "auto" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            {weekDays.map((day) => {
              const isActive =
                selectedMobileDay &&
                formatDateToInput(day) === formatDateToInput(selectedMobileDay);

              const isPastDay = isClientMode
                ? isPastDayOnly(day) || isSunday(day)
                : false;

              return (
                <button
                  key={formatDateToInput(day)}
                  onClick={() => {
                    if (isPastDay) return;
                    setSelectedMobileDay(day);
                  }}
                  disabled={isPastDay}
                  style={{
                    ...styles.button,
                    backgroundColor: isPastDay
                      ? "#e5e7eb"
                      : isActive
                      ? "#111827"
                      : "#ffffff",
                    color: isPastDay
                      ? "#9ca3af"
                      : isActive
                      ? "#ffffff"
                      : "#111827",
                    border: isActive
                      ? "1px solid #111827"
                      : "1px solid #d1d5db",
                    borderRadius: "10px",
                    minWidth: "74px",
                    padding: "10px 12px",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    cursor: isPastDay ? "not-allowed" : "pointer",
                    opacity: isPastDay ? 0.8 : 1,
                  }}
                >
                  <div style={{ textTransform: "capitalize", fontSize: "13px" }}>
                    {day.toLocaleDateString("es-CL", { weekday: "short" })}
                  </div>

                  <div style={{ fontSize: "12px", opacity: 0.9 }}>
                    {day.getDate()}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={styles.calendarWrapper}>
        {loading ? (
          <div style={styles.spinnerBox}>
            <div style={styles.spinner}></div>
          </div>
        ) : isMobile ? (
          isClientMode ? (
            <div style={styles.mobileSlotsWrapper}>
              {mobileSlots.map((slot) => {
                const normalizedSlotTime =
                  typeof slot.hour === "string"
                    ? slot.hour
                    : `${String(slot.hour).padStart(2, "0")}:00`;

                const isSelected =
                  selectedMobileDay &&
                  date &&
                  sameDate(date, selectedMobileDay) &&
                  time &&
                  time.startsWith(normalizedSlotTime.slice(0, 2)) &&
                  time.slice(0, 5) === normalizedSlotTime;

                const isDisabled =
                  slot.isOccupied || slot.isPast || !isBarberSelected;

                return (
                  <button
                    key={slot.hour}
                    type="button"
                    onClick={() => {
                      if (isDisabled) return;
                      setDate(formatDateToInput(selectedMobileDay));
                      setTime(normalizedSlotTime);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    disabled={isDisabled}
                    style={{
                      ...styles.mobileSlotButton,
                      ...(slot.isOccupied || slot.isPast || !isBarberSelected
                        ? styles.mobileSlotOccupied
                        : {}),
                      ...(isSelected ? styles.mobileSlotSelected : {}),
                    }}
                  >
                    <div style={styles.mobileSlotTime}>{slot.label}</div>

                    <div style={styles.mobileSlotStatus}>
                      {!isBarberSelected
                        ? resourcePrompt
                        : slot.isPast
                        ? "No disponible"
                        : slot.isOccupied
                        ? "Ocupado"
                        : "Disponible"}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              {mobileGroupedSlots.map((slot) => (
                <div
                  key={slot.hour}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "20px",
                      fontWeight: "700",
                      color: "#0f172a",
                      padding: "4px 2px",
                    }}
                  >
                    {slot.label}
                  </div>

                  {slot.isOccupied ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      {slot.appointments.map((appointment) => (
                        <div
                          key={appointment.id}
                          style={{
                            ...styles.mobileSlotButton,
                            textAlign: "left",
                            padding: "14px",
                            borderRadius: "14px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                            background: isGiocata
                              ? business?.theme?.primary || "#166534"
                              : "#ffffff",
                            color: isGiocata ? "#ffffff" : "#111827",
                            border: isGiocata
                              ? `1px solid ${
                                  business?.theme?.primaryDark || "#14532d"
                                }`
                              : "1px solid #e5e7eb",
                            cursor: "default",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "15px",
                              fontWeight: "600",
                              marginBottom: "2px",
                              color: isGiocata ? "#ffffff" : "#111827",
                            }}
                          >
                            {appointment.name}
                          </div>

                          <div
                            style={{
                              fontSize: "12px",
                              marginBottom: "2px",
                              color: isGiocata
                                ? "rgba(255,255,255,0.92)"
                                : "#374151",
                            }}
                          >
                            {appointment.service}
                          </div>

                          {!isSportsBusiness && (
                            <div
                              style={{
                                fontSize: "12px",
                                marginBottom: "2px",
                                color: isGiocata
                                  ? "rgba(255,255,255,0.92)"
                                  : "#374151",
                              }}
                            >
                              {appointment.barber}
                            </div>
                          )}

                          <div
                            style={{
                              fontSize: "12px",
                              marginBottom: "8px",
                              color: isGiocata ? "#ffffff" : "#374151",
                            }}
                          >
                            {!appointment?.status ||
                            appointment?.status === "reservada"
                              ? "🟡 Reservada"
                              : appointment?.status === "atendida"
                              ? "🟢 Atendida"
                              : appointment?.status === "no_asistio"
                              ? "🔴 No asistió"
                              : ""}
                          </div>

                          {renderPaymentStatus(appointment, {
                            marginBottom: "8px",
                          })}

                          <div
                            style={{
                              display: "flex",
                              gap: "8px",
                              marginTop: "10px",
                              flexWrap: "wrap",
                            }}
                          >
                            <button
                              type="button"
                              title="Marcar como atendida"
                              style={{
                                ...styles.tinyButton,
                                minWidth: "38px",
                                width: "38px",
                                height: "38px",
                                padding: 0,
                                backgroundColor: "#dcfce7",
                                color: "#166534",
                                border: "1px solid #bbf7d0",
                                fontWeight: "700",
                                fontSize: "18px",
                                ...(submitting ? styles.disabledButton : {}),
                              }}
                              onClick={() =>
                                markAppointmentAsAttended(appointment)
                              }
                              disabled={submitting}
                            >
                              ✓
                            </button>

                            <button
                              type="button"
                              title="Marcar como no asistió"
                              style={{
                                ...styles.tinyButton,
                                minWidth: "38px",
                                width: "38px",
                                height: "38px",
                                padding: 0,
                                backgroundColor: "#fee2e2",
                                color: "#991b1b",
                                border: "1px solid #fecaca",
                                fontWeight: "700",
                                fontSize: "18px",
                                ...(submitting ? styles.disabledButton : {}),
                              }}
                              onClick={() =>
                                markAppointmentAsNoShow(appointment)
                              }
                              disabled={submitting}
                            >
                              ✕
                            </button>

                            <button
                              type="button"
                              style={{
                                ...styles.tinyButton,
                                ...styles.editButton,
                                flex: 1,
                                minWidth: "90px",
                                ...(submitting ? styles.disabledButton : {}),
                              }}
                              onClick={() => editAppointment(appointment)}
                              disabled={submitting}
                            >
                              Editar
                            </button>

                            {business?.paymentsEnabled && (
                              <button
                                type="button"
                                style={{
                                  ...styles.tinyButton,
                                  ...styles.secondaryButton,
                                  flex: 1,
                                  minWidth: "90px",
                                  ...(submitting ? styles.disabledButton : {}),
                                }}
                                onClick={() => openPaymentPanel?.(appointment)}
                                disabled={submitting}
                              >
                                Pago
                              </button>
                            )}

                            <button
                              type="button"
                              style={{
                                ...styles.tinyButton,
                                ...styles.dangerButton,
                                flex: 1,
                                minWidth: "90px",
                                ...(submitting ? styles.disabledButton : {}),
                              }}
                              onClick={() => deleteAppointment(appointment.id)}
                              disabled={submitting}
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        border: "1px solid #d1d5db",
                        borderRadius: "14px",
                        padding: "16px",
                        textAlign: "center",
                        fontWeight: "600",
                        background: "#ffffff",
                        color: "#111827",
                      }}
                    >
                      Disponible
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          <div style={styles.calendarGrid}>
            <div style={styles.timeHeaderCell}>Hora</div>

            {weekDays.map((day, index) => (
              <div key={index} style={styles.headerCell}>
                <div>{day.toLocaleDateString("es-CL", { weekday: "long" })}</div>
                <div>{day.toLocaleDateString("es-CL")}</div>
              </div>
            ))}

            {hours.map((hour) => (
              <React.Fragment key={hour}>
                <div style={styles.timeCell}>{formatHourLabel(hour)}</div>

                {weekDays.map((day, index) => {
                  const slotAppointments = getAppointmentsForSlot(day, hour);

                  const normalizedHour =
                    typeof hour === "string"
                      ? hour
                      : `${String(hour).padStart(2, "0")}:00`;

                  const isPast = isClientMode
                    ? isPastSlot(day, normalizedHour) || isSunday(day)
                    : false;

                  return (
                    <div key={`${hour}-${index}`} style={styles.slotCell}>
                      {slotAppointments.length > 0 ? (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                          }}
                        >
                          {slotAppointments.map((appointment) => (
                            <div
                              key={appointment.id}
                              style={{
                                ...styles.appointmentBlock,
                                ...getBarberColors(appointment.barber),
                              }}
                            >
                              {isClientMode ? (
                                <>
                                  <div
                                    style={{
                                      ...styles.appointmentTitle,
                                      color: isGiocata ? "#ffffff" : "#111827",
                                    }}
                                  >
                                    Ocupado
                                  </div>

                                  <div
                                    style={{
                                      ...styles.appointmentMeta,
                                      color: isGiocata ? "#ffffff" : "#374151",
                                    }}
                                  >
                                    {appointment.barber}
                                  </div>

                                  <div
                                    style={{
                                      ...styles.appointmentMeta,
                                      color: isGiocata ? "#ffffff" : "#374151",
                                    }}
                                  >
                                    {String(appointment.time).slice(0, 5)}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div
                                    style={{
                                      ...styles.appointmentTitle,
                                      color: isGiocata ? "#ffffff" : "#111827",
                                    }}
                                  >
                                    {appointment.name}
                                  </div>

                                  <div
                                    style={{
                                      ...styles.appointmentMeta,
                                      color: isGiocata
                                        ? "rgba(255,255,255,0.92)"
                                        : "#374151",
                                    }}
                                  >
                                    {appointment.service}
                                  </div>

                                  {!isSportsBusiness && (
                                    <div
                                      style={{
                                        ...styles.appointmentMeta,
                                        color: isGiocata
                                          ? "rgba(255,255,255,0.92)"
                                          : "#374151",
                                      }}
                                    >
                                      {appointment.barber}
                                    </div>
                                  )}

                                  <div
                                    style={{
                                      ...styles.appointmentMeta,
                                      color: isGiocata
                                        ? "rgba(255,255,255,0.92)"
                                        : "#374151",
                                    }}
                                  >
                                    {String(appointment.time).slice(0, 5)}
                                  </div>

                                  <div
                                    style={{
                                      ...styles.appointmentMeta,
                                      color: isGiocata ? "#ffffff" : "#374151",
                                    }}
                                  >
                                    {!appointment.status ||
                                    appointment.status === "reservada"
                                      ? "🟡 Reservada"
                                      : appointment.status === "atendida"
                                      ? "🟢 Atendida"
                                      : appointment.status === "no_asistio"
                                      ? "🔴 No asistió"
                                      : ""}
                                  </div>

                                  {renderPaymentStatus(appointment, {
                                    marginTop: "2px",
                                    marginBottom: "6px",
                                  })}

                                  <div
                                    style={{
                                      ...styles.actionRow,
                                      flexWrap: "wrap",
                                      gap: "8px",
                                    }}
                                  >
                                    <button
                                      type="button"
                                      title="Marcar como atendida"
                                      style={{
                                        ...styles.tinyButton,
                                        minWidth: "38px",
                                        width: "38px",
                                        height: "38px",
                                        padding: 0,
                                        backgroundColor: "#dcfce7",
                                        color: "#166534",
                                        border: "1px solid #bbf7d0",
                                        fontWeight: "700",
                                        fontSize: "18px",
                                        ...(submitting
                                          ? styles.disabledButton
                                          : {}),
                                      }}
                                      onClick={() =>
                                        markAppointmentAsAttended(appointment)
                                      }
                                      disabled={submitting}
                                    >
                                      ✓
                                    </button>

                                    <button
                                      type="button"
                                      title="Marcar como no asistió"
                                      style={{
                                        ...styles.tinyButton,
                                        minWidth: "38px",
                                        width: "38px",
                                        height: "38px",
                                        padding: 0,
                                        backgroundColor: "#fee2e2",
                                        color: "#991b1b",
                                        border: "1px solid #fecaca",
                                        fontWeight: "700",
                                        fontSize: "18px",
                                        ...(submitting
                                          ? styles.disabledButton
                                          : {}),
                                      }}
                                      onClick={() =>
                                        markAppointmentAsNoShow(appointment)
                                      }
                                      disabled={submitting}
                                    >
                                      ✕
                                    </button>

                                    <button
                                      type="button"
                                      style={{
                                        ...styles.tinyButton,
                                        ...styles.editButton,
                                        ...(submitting
                                          ? styles.disabledButton
                                          : {}),
                                      }}
                                      onClick={() => editAppointment(appointment)}
                                      disabled={submitting}
                                    >
                                      Editar
                                    </button>

                                    {business?.paymentsEnabled && (
                                      <button
                                        type="button"
                                        style={{
                                          ...styles.tinyButton,
                                          ...styles.secondaryButton,
                                          ...(submitting
                                            ? styles.disabledButton
                                            : {}),
                                        }}
                                        onClick={() =>
                                          openPaymentPanel?.(appointment)
                                        }
                                        disabled={submitting}
                                      >
                                        Pago
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      style={{
                                        ...styles.tinyButton,
                                        ...styles.dangerButton,
                                        ...(submitting
                                          ? styles.disabledButton
                                          : {}),
                                      }}
                                      onClick={() =>
                                        deleteAppointment(appointment.id)
                                      }
                                      disabled={submitting}
                                    >
                                      Eliminar
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : isClientMode ? (
                        <button
                          style={{
                            ...styles.tinyButton,
                            backgroundColor:
                              business?.theme?.primarySoft || "#e5e7eb",
                            color: business?.theme?.primaryDark || "#111827",
                            border: `1px solid ${
                              business?.theme?.border || "#d1d5db"
                            }`,
                            width: "100%",
                            ...(!isBarberSelected || isPast
                              ? styles.disabledButton
                              : {}),
                            ...(isPast
                              ? {
                                  backgroundColor: "#e5e7eb",
                                  color: "#9ca3af",
                                  cursor: "not-allowed",
                                }
                              : {}),
                          }}
                          onClick={() => {
                            if (!isBarberSelected || isPast) return;
                            selectSlot(day, hour);
                          }}
                          disabled={!isBarberSelected || isPast}
                        >
                          {!isBarberSelected
                            ? resourcePrompt
                            : isPast
                            ? "No disponible"
                            : "Disponible"}
                        </button>
                      ) : (
                        <button
                          style={{
                            ...styles.tinyButton,
                            ...styles.secondaryButton,
                            width: "100%",
                          }}
                          onClick={() => selectSlot(day, hour)}
                        >
                          Disponible
                        </button>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default WeeklyCalendar;