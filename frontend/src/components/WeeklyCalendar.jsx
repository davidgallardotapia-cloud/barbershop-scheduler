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
  clientSearch = "",
  mobileClientSearchResults = [],
  isBarberSelected,
  selectSlot,
  setDate,
  setTime,
  setBarber,
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
  isScheduleSlotAvailable = () => true,
  openPaymentPanel,
}) {
  const resourcePrompt = business?.hideResourceSelector
    ? "Disponible"
    : business?.resourceSelectPrompt || "Selecciona un recurso arriba";

  const isGiocata = business?.id === "giocata";
  const isSportsBusiness = ["giocata", "pinguino-club"].includes(business?.id);
  const scheduleTheme = business?.theme || {};
  const useSchedulePalette = business?.id === "centro-ama";

  const themedAvailableSlotStyle = useSchedulePalette
    ? {
        backgroundColor: scheduleTheme.primarySoft || "#f7f0df",
        color: scheduleTheme.primaryDark || "#2f5562",
        border: `1px solid ${scheduleTheme.border || "#e7dcc4"}`,
        boxShadow: `inset 4px 0 0 ${scheduleTheme.primary || "#b08a3c"}`,
      }
    : {};

  const themedAvailableCardStyle = useSchedulePalette
    ? {
        background:
          "linear-gradient(135deg, rgba(247,240,223,0.96), rgba(255,255,255,0.98))",
        color: scheduleTheme.primaryDark || "#2f5562",
        border: `1px solid ${scheduleTheme.border || "#e7dcc4"}`,
        boxShadow: `inset 4px 0 0 ${scheduleTheme.primary || "#b08a3c"}`,
      }
    : {};

  const sportsResources =
    business?.barbers && business.barbers.length > 0
      ? business.barbers
      : ["Cancha 1", "Cancha 2", "Cancha 3", "Cancha 4", "Cancha 5", "Cancha 6"];

  const activeClientSearch = String(clientSearch || "").trim();
  const showGiocataClientResults =
    isGiocata && !isClientMode && activeClientSearch;

  const skeletonBlock = (style = {}) => ({
    borderRadius: "12px",
    background:
      "linear-gradient(90deg, #eef2f7 0%, #f8fafc 45%, #e5e7eb 80%)",
    backgroundSize: "220% 100%",
    animation: "loadingShimmer 1.45s ease-in-out infinite",
    ...style,
  });

  const renderCalendarLoadingSkeleton = () => {
    if (isMobile) {
      return (
        <div
          style={{
            display: "grid",
            gap: "12px",
            padding: "4px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "10px",
            }}
          >
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                style={skeletonBlock({ height: "68px" })}
              />
            ))}
          </div>

          <div style={styles.mobileSlotsWrapper}>
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                style={{
                  ...styles.mobileSlotButton,
                  border: "1px solid #e5e7eb",
                  cursor: "default",
                }}
              >
                <div style={skeletonBlock({ height: "16px", marginBottom: "10px" })} />
                <div style={skeletonBlock({ height: "12px", width: "62%", margin: "0 auto" })} />
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div
        style={{
          ...styles.calendarGrid,
          minWidth: "860px",
          backgroundColor: "#ffffff",
        }}
      >
        <div style={styles.timeHeader}>Hora</div>

        {[0, 1, 2, 3, 4, 5, 6].map((day) => (
          <div key={day} style={styles.dayHeader}>
            <div style={skeletonBlock({ height: "18px", width: "52%", marginBottom: "10px" })} />
            <div style={skeletonBlock({ height: "12px", width: "38%" })} />
          </div>
        ))}

        {[0, 1, 2, 3].map((row) => (
          <React.Fragment key={row}>
            <div style={styles.timeCell}>
              <div style={skeletonBlock({ height: "18px", width: "58%" })} />
            </div>

            {[0, 1, 2, 3, 4, 5, 6].map((cell) => (
              <div key={`${row}-${cell}`} style={styles.slotCell}>
                <div style={skeletonBlock({ height: "44px", marginBottom: "8px" })} />
                <div style={skeletonBlock({ height: "12px", width: "66%" })} />
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const getPaymentStatusInfo = (paymentStatus) => {
    switch (paymentStatus) {
      case "paid":
        return {
          label: "Pagado",
          shortLabel: "OK",
          icon: "✅",
          background: "#dcfce7",
          border: "#86efac",
          color: "#166534",
          dot: "#22c55e",
        };

      case "partially_paid":
        return {
          label: "Parcial",
          shortLabel: "Parc.",
          icon: "🟡",
          background: "#fef9c3",
          border: "#fde047",
          color: "#854d0e",
          dot: "#eab308",
        };

      case "deposit_paid":
        return {
          label: "Abono",
          shortLabel: "Ab.",
          icon: "🟠",
          background: "#ffedd5",
          border: "#fdba74",
          color: "#9a3412",
          dot: "#f97316",
        };

      case "deposit_pending":
        return {
          label: "Pendiente",
          shortLabel: "Pend.",
          icon: "⏳",
          background: "#e0f2fe",
          border: "#7dd3fc",
          color: "#075985",
          dot: "#0ea5e9",
        };

      case "unpaid":
      default:
        return {
          label: "Sin pago",
          shortLabel: "S/P",
          icon: "🔴",
          background: "#fee2e2",
          border: "#fecaca",
          color: "#991b1b",
          dot: "#ef4444",
        };
    }
  };

  const getReservationStatusInfo = (status) => {
    if (!status || status === "reservada") {
      return {
        label: "Reservada",
        icon: "🟡",
        background: "#fef3c7",
        border: "#fcd34d",
        color: "#92400e",
        dot: "#eab308",
      };
    }

    if (status === "atendida") {
      return {
        label: "Atendida",
        icon: "🟢",
        background: "#dcfce7",
        border: "#86efac",
        color: "#166534",
        dot: "#22c55e",
      };
    }

    if (status === "no_asistio") {
      return {
        label: "No asistió",
        icon: "🔴",
        background: "#fee2e2",
        border: "#fecaca",
        color: "#991b1b",
        dot: "#ef4444",
      };
    }

    return {
      label: "",
      icon: "",
      background: "#f3f4f6",
      border: "#d1d5db",
      color: "#374151",
      dot: "#94a3b8",
    };
  };

  const renderPaymentStatus = (appointment, extraStyle = {}) => {
    if (!business?.paymentsEnabled) return null;

    const paymentInfo = getPaymentStatusInfo(appointment.payment_status);

    return (
      <div
        title={`Pago: ${paymentInfo.label}`}
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
        <span>{paymentInfo.shortLabel}</span>
      </div>
    );
  };

  const renderReservationStatus = (appointment, extraStyle = {}) => {
    const statusInfo = getReservationStatusInfo(appointment?.status);

    if (!statusInfo.label) return null;

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
          backgroundColor: statusInfo.background,
          border: `1px solid ${statusInfo.border}`,
          color: statusInfo.color,
          fontWeight: "800",
          fontSize: "11px",
          lineHeight: 1,
          whiteSpace: "nowrap",
          ...extraStyle,
        }}
      >
        <span style={{ fontSize: "10px", lineHeight: 1 }}>
          {statusInfo.icon}
        </span>
        <span>{statusInfo.label}</span>
      </div>
    );
  };

  const getShortResourceName = (resourceName) => {
    const match = String(resourceName || "").match(/cancha\s*(\d+)/i);
    return match ? `C${match[1]}` : String(resourceName || "");
  };

  const getAppointmentDisplayName = (appointment) => {
    if (!appointment) return "";

    if (appointment.opponent_name) {
      return `${appointment.name || "Equipo 1"} vs ${appointment.opponent_name}`;
    }

    return appointment.name || "Reservado";
  };

  const isLookingForOpponent = (appointment) => {
    return Boolean(appointment?.needs_opponent);
  };

  const getSportsAppointmentForResource = (appointments, resourceName) => {
    return appointments.find(
      (appointment) =>
        String(appointment.barber || "").trim().toLowerCase() ===
        String(resourceName || "").trim().toLowerCase()
    );
  };

  const handleSportsOccupiedClick = (appointment) => {
    if (!appointment) return;

    if (business?.paymentsEnabled && openPaymentPanel) {
      openPaymentPanel(appointment);
      return;
    }

    editAppointment(appointment);
  };

  const handleSportsAvailableClick = (day, hour, resourceName) => {
  if (isClientMode) return;

  selectSlot(day, hour, resourceName);

  window.scrollTo({ top: 0, behavior: "smooth" });
};

  const renderSportsMobileClientSearchResults = () => {
    return (
      <div
        style={{
          display: "grid",
          gap: "12px",
        }}
      >
        <div
          style={{
            border: "1px solid #d1fae5",
            borderRadius: "14px",
            padding: "14px",
            backgroundColor: "#ffffff",
            boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: "900",
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: "4px",
            }}
          >
            Busqueda por cliente
          </div>

          <div
            style={{
              fontSize: "18px",
              fontWeight: "900",
              color: business?.theme?.primaryDark || "#14532d",
            }}
          >
            {mobileClientSearchResults.length} reserva(s) para "{activeClientSearch}"
          </div>
        </div>

        {mobileClientSearchResults.length === 0 ? (
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "16px",
              padding: "18px",
              backgroundColor: "#ffffff",
              color: "#64748b",
              fontWeight: "800",
              textAlign: "center",
            }}
          >
            No hay reservas de ese cliente en esta semana.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
              gap: "12px",
            }}
          >
            {mobileClientSearchResults.map((appointment) => {
            const reservationInfo = getReservationStatusInfo(appointment.status);
            const paymentInfo = getPaymentStatusInfo(appointment.payment_status);
            const appointmentDate = String(appointment.date || "").slice(0, 10);
            const dateLabel = appointmentDate
              ? new Date(`${appointmentDate}T00:00:00`).toLocaleDateString(
                  "es-CL",
                  {
                    weekday: "short",
                    day: "2-digit",
                    month: "2-digit",
                  }
                )
              : "";

            return (
              <button
                key={appointment.id}
                type="button"
                onClick={() => handleSportsOccupiedClick(appointment)}
                style={{
                  width: "100%",
                  border: `1px solid ${paymentInfo.border}`,
                  borderLeft: `6px solid ${reservationInfo.dot}`,
                  borderRadius: "16px",
                  padding: "14px",
                  backgroundColor: "#ffffff",
                  color: "#0f172a",
                  textAlign: "left",
                  boxShadow: "0 5px 16px rgba(15, 23, 42, 0.08)",
                  display: "grid",
                  gap: "10px",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "10px",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "18px",
                        fontWeight: "900",
                        color: "#111827",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {getAppointmentDisplayName(appointment)}
                    </div>

                    <div
                      style={{
                        marginTop: "3px",
                        fontSize: "13px",
                        fontWeight: "800",
                        color: "#64748b",
                      }}
                    >
                      {appointment.phone || "Sin telefono"}
                    </div>
                  </div>

                  <span
                    title={`Reserva: ${reservationInfo.label}`}
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "999px",
                      backgroundColor: reservationInfo.dot,
                      boxShadow: `0 0 0 3px ${reservationInfo.background}`,
                      flexShrink: 0,
                      marginTop: "5px",
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                  }}
                >
                  <div
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                      padding: "10px",
                      backgroundColor: "#f8fafc",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#64748b",
                        fontWeight: "900",
                      }}
                    >
                      Fecha
                    </div>
                    <div style={{ fontWeight: "900" }}>{dateLabel}</div>
                  </div>

                  <div
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                      padding: "10px",
                      backgroundColor: "#f8fafc",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#64748b",
                        fontWeight: "900",
                      }}
                    >
                      Hora
                    </div>
                    <div style={{ fontWeight: "900" }}>
                      {String(appointment.time || "").slice(0, 5)}
                    </div>
                  </div>

                  <div
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                      padding: "10px",
                      backgroundColor: "#f8fafc",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#64748b",
                        fontWeight: "900",
                      }}
                    >
                      Cancha
                    </div>
                    <div style={{ fontWeight: "900" }}>
                      {appointment.barber || "-"}
                    </div>
                  </div>

                  <div
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                      padding: "10px",
                      backgroundColor: paymentInfo.background,
                      borderColor: paymentInfo.border,
                    }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        color: paymentInfo.color,
                        fontWeight: "900",
                      }}
                    >
                      Pago
                    </div>
                    <div style={{ fontWeight: "900", color: paymentInfo.color }}>
                      {paymentInfo.label}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: "800",
                    color: "#475569",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {appointment.service}
                </div>
              </button>
            );
          })}
          </div>
        )}
      </div>
    );
  };

  const renderSportsResourceBox = ({ resourceName, appointment, day, hour }) => {
    const paymentInfo = getPaymentStatusInfo(appointment?.payment_status);
    const reservationInfo = getReservationStatusInfo(appointment?.status);
    const occupied = Boolean(appointment);
    const lookingOpponent = isLookingForOpponent(appointment);

    return (
      <button
        key={resourceName}
        type="button"
        onClick={() =>
          occupied
            ? handleSportsOccupiedClick(appointment)
            : handleSportsAvailableClick(day, hour, resourceName)
        }
        title={
          occupied
            ? `${resourceName} - ${getAppointmentDisplayName(appointment)}`
            : `${resourceName} libre`
        }
        style={{
          width: "100%",
          border: occupied
            ? `1px solid ${paymentInfo.border}`
            : "1px solid #e5e7eb",
          borderLeft: occupied
            ? `5px solid ${reservationInfo.dot}`
            : "5px solid #d1d5db",
          backgroundColor: occupied ? "#ffffff" : "#f8fafc",
          color: "#0f172a",
          borderRadius: "10px",
          padding: "7px 8px",
          minHeight: "38px",
          textAlign: "left",
          cursor: "pointer",
          boxShadow: occupied
            ? "0 3px 10px rgba(15, 23, 42, 0.08)"
            : "none",
          display: "grid",
          gridTemplateColumns: "34px minmax(0, 1fr) auto",
          alignItems: "center",
          gap: "8px",
          overflow: "hidden",
        }}
      >
        <span
          style={{
            fontWeight: "900",
            fontSize: "12px",
            color: occupied ? "#064e3b" : "#475569",
          }}
        >
          {getShortResourceName(resourceName)}
        </span>

        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            minWidth: 0,
            fontSize: "12px",
            fontWeight: occupied ? "800" : "700",
            color: occupied ? "#111827" : "#64748b",
          }}
        >
          {occupied && (
            <span
              title={reservationInfo.label}
              aria-label={`Estado: ${reservationInfo.label}`}
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "999px",
                backgroundColor: reservationInfo.dot,
                boxShadow: `0 0 0 2px ${reservationInfo.background}`,
                flexShrink: 0,
              }}
            />
          )}

          <span
            style={{
              minWidth: 0,
              flex: 1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {occupied ? getAppointmentDisplayName(appointment) : "Libre"}
          </span>
        </span>

        {occupied ? (
          <span
            title={`Pago: ${paymentInfo.label}`}
            style={{
              fontSize: "10px",
              fontWeight: "900",
              color: paymentInfo.color,
              backgroundColor: paymentInfo.background,
              border: `1px solid ${paymentInfo.border}`,
              borderRadius: "999px",
              padding: "3px 6px",
              whiteSpace: "nowrap",
            }}
          >
            {paymentInfo.shortLabel}
          </span>
        ) : lookingOpponent ? (
          <span
            style={{
              fontSize: "10px",
              fontWeight: "900",
              color: "#1d4ed8",
              backgroundColor: "#dbeafe",
              border: "1px solid #93c5fd",
              borderRadius: "999px",
              padding: "3px 6px",
              whiteSpace: "nowrap",
            }}
          >
            Rival
          </span>
        ) : (
          <span />
        )}
      </button>
    );
  };

  const renderSportsAdminMatrix = () => {
    return (
      <div
        style={{
          overflowX: "auto",
          width: "100%",
          border: "1px solid #d1fae5",
          borderRadius: "14px",
          backgroundColor: "#ffffff",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "72px repeat(7, minmax(230px, 1fr))"
              : "82px repeat(7, minmax(210px, 1fr))",
            minWidth: isMobile ? "1680px" : "1550px",
          }}
        >
          <div
            style={{
              position: "sticky",
              left: 0,
              zIndex: 4,
              backgroundColor: business?.theme?.primary || "#166534",
              color: "#ffffff",
              padding: "12px",
              fontWeight: "900",
              borderRight: "1px solid rgba(255,255,255,0.18)",
              borderBottom: "1px solid rgba(255,255,255,0.18)",
            }}
          >
            Hora
          </div>

          {weekDays.map((day) => (
            <div
              key={formatDateToInput(day)}
              style={{
                backgroundColor: business?.theme?.primaryDark || "#14532d",
                color: "#ffffff",
                padding: "12px",
                fontWeight: "900",
                borderRight: "1px solid rgba(255,255,255,0.18)",
                borderBottom: "1px solid rgba(255,255,255,0.18)",
                textTransform: "capitalize",
              }}
            >
              <div>
                {day.toLocaleDateString("es-CL", { weekday: "long" })}
              </div>
              <div style={{ fontSize: "12px", opacity: 0.9 }}>
                {day.toLocaleDateString("es-CL")}
              </div>
            </div>
          ))}

          {hours.map((hour) => (
            <React.Fragment key={hour}>
              <div
                style={{
                  position: "sticky",
                  left: 0,
                  zIndex: 3,
                  backgroundColor: "#ecfdf5",
                  color: "#064e3b",
                  padding: "12px",
                  fontWeight: "900",
                  borderRight: "1px solid #d1fae5",
                  borderBottom: "1px solid #e5e7eb",
                  minHeight: "275px",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "center",
                }}
              >
                {formatHourLabel(hour)}
              </div>

              {weekDays.map((day) => {
                const slotAppointments = getAppointmentsForSlot(day, hour);
                const isAvailableForDay = isScheduleSlotAvailable(day, hour);

                return (
                  <div
                    key={`${formatDateToInput(day)}-${hour}`}
                    style={{
                      padding: "10px",
                      borderRight: "1px solid #e5e7eb",
                      borderBottom: "1px solid #e5e7eb",
                      backgroundColor: "#ffffff",
                      minHeight: "275px",
                    }}
                  >
                    {isAvailableForDay ? (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr",
                          gap: "6px",
                        }}
                      >
                        {sportsResources.map((resourceName) => {
                          const appointment = getSportsAppointmentForResource(
                            slotAppointments,
                            resourceName
                          );

                          return renderSportsResourceBox({
                            resourceName,
                            appointment,
                            day,
                            hour,
                          });
                        })}
                      </div>
                    ) : (
                      <div
                        style={{
                          border: "1px dashed #cbd5e1",
                          borderRadius: "12px",
                          padding: "18px 12px",
                          backgroundColor: "#f8fafc",
                          color: "#64748b",
                          fontWeight: "900",
                          textAlign: "center",
                        }}
                      >
                        No disponible
                      </div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  const renderSportsAdminMobileDayView = () => {
    const activeDay = selectedMobileDay || weekDays[0];

    if (!activeDay) return null;

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        <div
          style={{
            border: "1px solid #d1fae5",
            borderRadius: "14px",
            padding: "14px",
            backgroundColor: "#ffffff",
            boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: "900",
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: "4px",
            }}
          >
            Día seleccionado
          </div>

          <div
            style={{
              fontSize: "20px",
              fontWeight: "900",
              color: business?.theme?.primaryDark || "#14532d",
              textTransform: "capitalize",
            }}
          >
            {activeDay.toLocaleDateString("es-CL", {
              weekday: "long",
              day: "2-digit",
              month: "2-digit",
            })}
          </div>
        </div>

        {mobileGroupedSlots.map((slot) => {
          const hour = slot.hour;
          const slotAppointments = slot.appointments || [];

          return (
            <div
              key={hour}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "16px",
                backgroundColor: "#ffffff",
                overflow: "hidden",
                boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)",
              }}
            >
              <div
                style={{
                  padding: "12px 14px",
                  backgroundColor: "#ecfdf5",
                  borderBottom: "1px solid #d1fae5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: "900",
                    color: "#064e3b",
                  }}
                >
                  {formatHourLabel(hour)}
                </div>

                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: "800",
                    color: "#64748b",
                  }}
                >
                  {slotAppointments.length} ocupada(s)
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: "7px",
                  padding: "10px",
                }}
              >
                {sportsResources.map((resourceName) => {
                  const appointment = getSportsAppointmentForResource(
                    slotAppointments,
                    resourceName
                  );

                  return renderSportsResourceBox({
                    resourceName,
                    appointment,
                    day: activeDay,
                    hour,
                  });
                })}
              </div>
            </div>
          );
        })}
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
      {isMobile && !showGiocataClientResults && (
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
          renderCalendarLoadingSkeleton()
        ) : showGiocataClientResults ? (
          renderSportsMobileClientSearchResults()
        ) : isSportsBusiness && !isClientMode && isMobile ? (
          renderSportsAdminMobileDayView()
        ) : isSportsBusiness && !isClientMode ? (
          renderSportsAdminMatrix()
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
                      ...(!slot.isOccupied && !slot.isPast && isBarberSelected
                        ? themedAvailableSlotStyle
                        : {}),
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
                        ...themedAvailableCardStyle,
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
                            ...themedAvailableSlotStyle,
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
                            ...themedAvailableSlotStyle,
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
