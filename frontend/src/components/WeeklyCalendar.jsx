import React from "react";

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
}) {
  const resourcePrompt = business?.hideResourceSelector
  ? "Disponible"
  : business?.resourceSelectPrompt || "Selecciona un recurso arriba";

  return (
    <>
      {isMobile && (
        <div style={{ marginBottom: "14px", overflowX: "auto" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            {weekDays.map((day) => {
              const isActive =
                selectedMobileDay &&
                formatDateToInput(day) === formatDateToInput(selectedMobileDay);

              const isPastDay = isClientMode ? isPastDayOnly(day) : false;

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
                    color: isPastDay ? "#9ca3af" : isActive ? "#ffffff" : "#111827",
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
          <div style={styles.mobileSlotsWrapper}>
            {mobileSlots.map((slot) => {
              const firstAppointment = slot.appointments[0];

              if (isClientMode) {
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
              }

              return slot.isOccupied ? (
                <div
                  key={slot.hour}
                  style={{
                    ...styles.mobileSlotButton,
                    textAlign: "left",
                    padding: "14px",
                    borderRadius: "14px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    background: "#ffffff",
                    color: "#111827",
                    cursor: "default",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      marginBottom: "6px",
                    }}
                  >
                    {slot.label}
                  </div>

                  <div
                    style={{
                      fontSize: "15px",
                      fontWeight: "600",
                      marginBottom: "2px",
                    }}
                  >
                    {firstAppointment?.name}
                  </div>

                  <div style={{ fontSize: "12px", marginBottom: "2px" }}>
                    {firstAppointment?.service}
                  </div>

                  <div style={{ fontSize: "12px", marginBottom: "2px" }}>
                    {firstAppointment?.barber}
                  </div>

                  <div style={{ fontSize: "12px", marginBottom: "8px" }}>
                    {!firstAppointment?.status || firstAppointment?.status === "reservada"
                      ? "🟡 Reservada"
                      : firstAppointment?.status === "atendida"
                      ? "🟢 Atendida"
                      : firstAppointment?.status === "no_asistio"
                      ? "🔴 No asistió"
                      : ""}
                  </div>

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
                      style={{
                        ...styles.tinyButton,
                        backgroundColor: "#dcfce7",
                        color: "#166534",
                        border: "1px solid #bbf7d0",
                        flex: 1,
                        ...(submitting ? styles.disabledButton : {}),
                      }}
                      onClick={() => markAppointmentAsAttended(firstAppointment)}
                      disabled={submitting}
                    >
                      Atendida
                    </button>

                    <button
                      type="button"
                      style={{
                        ...styles.tinyButton,
                        backgroundColor: "#fee2e2",
                        color: "#991b1b",
                        border: "1px solid #fecaca",
                        flex: 1,
                        ...(submitting ? styles.disabledButton : {}),
                      }}
                      onClick={() => markAppointmentAsNoShow(firstAppointment)}
                      disabled={submitting}
                    >
                      No asistió
                    </button>

                    <button
                      type="button"
                      style={{
                        ...styles.tinyButton,
                        ...styles.editButton,
                        flex: 1,
                        ...(submitting ? styles.disabledButton : {}),
                      }}
                      onClick={() => editAppointment(firstAppointment)}
                      disabled={submitting}
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      style={{
                        ...styles.tinyButton,
                        ...styles.dangerButton,
                        flex: 1,
                        ...(submitting ? styles.disabledButton : {}),
                      }}
                      onClick={() => deleteAppointment(firstAppointment.id)}
                      disabled={submitting}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  key={slot.hour}
                  type="button"
                  onClick={() => selectSlot(selectedMobileDay, slot.hour)}
                  style={{
                    ...styles.mobileSlotButton,
                    textAlign: "center",
                  }}
                >
                  <div style={styles.mobileSlotTime}>{slot.label}</div>
                  <div style={styles.mobileSlotStatus}>Disponible</div>
                </button>
              );
            })}
          </div>
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
                  const isPast = isClientMode ? isPastSlot(day, normalizedHour) : false;

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
                                  <div style={styles.appointmentTitle}>Ocupado</div>
                                  <div style={styles.appointmentMeta}>
                                    {appointment.barber}
                                  </div>
                                  <div style={styles.appointmentMeta}>
                                    {String(appointment.time).slice(0, 5)}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div style={styles.appointmentTitle}>
                                    {appointment.name}
                                  </div>
                                  <div style={styles.appointmentMeta}>
                                    {appointment.service}
                                  </div>
                                  <div style={styles.appointmentMeta}>
                                    {appointment.barber}
                                  </div>
                                  <div style={styles.appointmentMeta}>
                                    {String(appointment.time).slice(0, 5)}
                                  </div>
                                  <div style={styles.appointmentMeta}>
                                    {!appointment.status || appointment.status === "reservada"
                                      ? "🟡 Reservada"
                                      : appointment.status === "atendida"
                                      ? "🟢 Atendida"
                                      : appointment.status === "no_asistio"
                                      ? "🔴 No asistió"
                                      : ""}
                                  </div>

                                  <div
                                    style={{
                                      ...styles.actionRow,
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    <button
                                      style={{
                                        ...styles.tinyButton,
                                        backgroundColor: "#dcfce7",
                                        color: "#166534",
                                        border: "1px solid #bbf7d0",
                                        ...(submitting ? styles.disabledButton : {}),
                                      }}
                                      onClick={() => markAppointmentAsAttended(appointment)}
                                      disabled={submitting}
                                    >
                                      Atendida
                                    </button>

                                    <button
                                      style={{
                                        ...styles.tinyButton,
                                        backgroundColor: "#fee2e2",
                                        color: "#991b1b",
                                        border: "1px solid #fecaca",
                                        ...(submitting ? styles.disabledButton : {}),
                                      }}
                                      onClick={() => markAppointmentAsNoShow(appointment)}
                                      disabled={submitting}
                                    >
                                      No asistió
                                    </button>

                                    <button
                                      style={{
                                        ...styles.tinyButton,
                                        ...styles.editButton,
                                        ...(submitting ? styles.disabledButton : {}),
                                      }}
                                      onClick={() => editAppointment(appointment)}
                                      disabled={submitting}
                                    >
                                      Editar
                                    </button>

                                    <button
                                      style={{
                                        ...styles.tinyButton,
                                        ...styles.dangerButton,
                                        ...(submitting ? styles.disabledButton : {}),
                                      }}
                                      onClick={() => deleteAppointment(appointment.id)}
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
                            ...styles.secondaryButton,
                            width: "100%",
                            ...((!isBarberSelected || isPast)
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