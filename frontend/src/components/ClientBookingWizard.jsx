import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  formatDateToInput,
  getMonday,
  isPastDayOnly,
  isSunday,
} from "../utils/dateUtils";

function ClientBookingWizard({
  styles,
  business,
  SERVICES,
  BARBERS,
  service,
  setService,
  barber,
  setBarber,
  date,
  setDate,
  time,
  setTime,
  name,
  setName,
  phone,
  setPhone,
  availableTimes = [],
  createAppointment,
  submitting,
  isClientFormComplete,
  message,
  whatsappUrl,
}) {
  const showResourceStep = !business?.hideResourceSelector;
  const isMobile = window.innerWidth < 768;

  const wizardRef = useRef(null);
  const serviceStepRef = useRef(null);
  const resourceStepRef = useRef(null);
  const dayStepRef = useRef(null);
  const timeStepRef = useRef(null);
  const dataStepRef = useRef(null);

  const [showProgress, setShowProgress] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  const resolvedBarber =
    showResourceStep && BARBERS.length === 1 ? BARBERS[0] : barber;

  const steps = showResourceStep
    ? [
        { number: 1, label: "Servicio" },
        { number: 2, label: "Profesional" },
        { number: 3, label: "Día" },
        { number: 4, label: "Hora" },
        { number: 5, label: "Datos" },
      ]
    : [
        { number: 1, label: "Servicio" },
        { number: 2, label: "Día" },
        { number: 3, label: "Hora" },
        { number: 4, label: "Datos" },
      ];

  let activeStep = 1;

  if (service) activeStep = 2;

  if ((showResourceStep ? resolvedBarber : true) && service) {
    activeStep = showResourceStep ? 3 : 2;
  }

  if (date && service && (showResourceStep ? resolvedBarber : true)) {
    activeStep = showResourceStep ? 4 : 3;
  }

  if (time && date && service && (showResourceStep ? resolvedBarber : true)) {
    activeStep = showResourceStep ? 5 : 4;
  }

  const activeStepLabel =
    steps.find((step) => step.number === activeStep)?.label || "Reserva";

  const progressPercent = (activeStep / steps.length) * 100;

  const scrollToStep = (ref) => {
    if (!ref?.current) return;

    const yOffset = isMobile ? -90 : -120;
    const y =
      ref.current.getBoundingClientRect().top + window.pageYOffset + yOffset;

    window.scrollTo({
      top: y,
      behavior: "smooth",
    });
  };

  const currentWeekStart = useMemo(() => {
    const monday = getMonday(new Date());
    return addDays(monday, weekOffset * 7);
  }, [weekOffset]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const day = addDays(currentWeekStart, index);
      const value = formatDateToInput(day);

      return {
        date: day,
        value,
        isSunday: isSunday(day),
        isPast: isPastDayOnly(day),
        labelShort: day.toLocaleDateString("es-CL", {
          weekday: "short",
        }),
        dayNumber: day.toLocaleDateString("es-CL", {
          day: "2-digit",
        }),
      };
    });
  }, [currentWeekStart]);

  useEffect(() => {
    if (!date) return;

    const selectedDate = new Date(`${date}T00:00:00`);
    const selectedMonday = getMonday(selectedDate);
    const todayMonday = getMonday(new Date());

    const diffMs = selectedMonday.getTime() - todayMonday.getTime();
    const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));

    if (diffWeeks !== weekOffset) {
      setWeekOffset(diffWeeks);
    }
  }, [date, weekOffset]);

  useEffect(() => {
    const handleScroll = () => {
      if (!wizardRef.current) return;

      const rect = wizardRef.current.getBoundingClientRect();
      const hasEnteredWizard = rect.top <= (isMobile ? 8 : 16);
      const hasNotFinishedWizard = rect.bottom > (isMobile ? 140 : 180);

      setShowProgress(hasEnteredWizard && hasNotFinishedWizard);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [isMobile]);

  return (
    <div
      ref={wizardRef}
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        position: "relative",
      }}
    >
      {showProgress && (
        <div
          style={{
            position: "fixed",
            top: isMobile ? "8px" : "16px",
            left: isMobile ? "12px" : "32px",
            right: isMobile ? "12px" : "32px",
            zIndex: 9999,
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "14px",
            padding: isMobile ? "10px 14px 12px" : "14px 18px 16px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            maxWidth: isMobile ? "none" : "1100px",
            margin: "0 auto",
          }}
        >
          {isMobile ? (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    color: "#6b7280",
                    fontWeight: "bold",
                  }}
                >
                  Paso {activeStep} de {steps.length}
                </span>

                <span
                  style={{
                    fontSize: "13px",
                    color: "#111827",
                    fontWeight: "bold",
                  }}
                >
                  {activeStepLabel}
                </span>
              </div>

              <div
                style={{
                  width: "100%",
                  height: "8px",
                  borderRadius: "999px",
                  backgroundColor: "#e5e7eb",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${progressPercent}%`,
                    height: "100%",
                    backgroundColor: business?.theme?.primary || "#111827",
                    borderRadius: "999px",
                    transition: "width 0.25s ease",
                  }}
                />
              </div>
            </>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`,
                gap: "10px",
              }}
            >
              {steps.map((step) => {
                const isActive = step.number === activeStep;
                const isCompleted = step.number < activeStep;

                return (
                  <div
                    key={step.number}
                    style={{
                      borderRadius: "14px",
                      padding: "12px 10px",
                      border: isActive
                        ? `2px solid ${business?.theme?.primary || "#111827"}`
                        : "1px solid #d1d5db",
                      backgroundColor: isCompleted
                        ? business?.theme?.primarySoft || "#ecfdf5"
                        : isActive
                        ? business?.theme?.primarySoft || "#f3f4f6"
                        : "#ffffff",
                      textAlign: "center",
                      boxShadow: isActive
                        ? "0 6px 18px rgba(0,0,0,0.06)"
                        : "none",
                    }}
                  >
                    <div
                      style={{
                        width: "30px",
                        height: "30px",
                        margin: "0 auto 6px",
                        borderRadius: "999px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isCompleted
                          ? business?.theme?.primary || "#111827"
                          : isActive
                          ? business?.theme?.primary || "#111827"
                          : "#e5e7eb",
                        color: isCompleted || isActive ? "#ffffff" : "#6b7280",
                        fontWeight: "bold",
                        fontSize: "13px",
                      }}
                    >
                      {isCompleted ? "✓" : step.number}
                    </div>

                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: "bold",
                        color: isActive || isCompleted ? "#111827" : "#6b7280",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {step.label}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div
        style={{
          ...styles.card,
          padding: isMobile ? "18px" : "28px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ marginBottom: isMobile ? "16px" : "24px" }}>
          <h2 style={{ marginTop: 0 }}>
            {business?.bookingTitle || "Reserva online"}
          </h2>

          <p style={{ color: "#4b5563", lineHeight: 1.5, marginBottom: 0 }}>
            Sigue los pasos para completar tu reserva de forma rápida.
          </p>
        </div>

        <div style={{ display: "grid", gap: "24px" }}>
          <section ref={serviceStepRef}>
            <h3 style={{ marginTop: 0, marginBottom: "12px" }}>
              1. Elige un servicio
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "12px",
              }}
            >
              {SERVICES.map((item) => {
                const isSelected = service === item;

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      const isSame = service === item;

                      if (isSame) {
                        setService("");
                        setDate("");
                        setTime("");
                        if (showResourceStep) {
                          setBarber("");
                        }
                        setTimeout(() => {
                          scrollToStep(serviceStepRef);
                        }, 120);
                        return;
                      }

                      setService(item);

                      if (showResourceStep) {
                        setDate("");
                        setTime("");
                        setBarber(BARBERS.length === 1 ? BARBERS[0] : "");
                        setTimeout(() => {
                          scrollToStep(resourceStepRef);
                        }, 120);
                      } else {
                        // Giocata: mantener fecha, limpiar solo hora
                        setTime("");
                        setTimeout(() => {
                          scrollToStep(dayStepRef);
                        }, 120);
                      }
                    }}
                    style={{
                      ...styles.button,
                      textAlign: "left",
                      padding: "16px 18px",
                      borderRadius: "14px",
                      border: isSelected
                        ? `2px solid ${business?.theme?.primary || "#111827"}`
                        : "1px solid #d1d5db",
                      backgroundColor: isSelected
                        ? business?.theme?.primarySoft || "#f3f4f6"
                        : "#ffffff",
                      color: "#111827",
                      fontWeight: "bold",
                      minHeight: isMobile ? "60px" : "72px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      boxShadow: isSelected
                        ? "0 6px 18px rgba(0,0,0,0.06)"
                        : "none",
                      fontSize: isMobile ? "14px" : "15px",
                    }}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </section>

          {showResourceStep && (
            <section ref={resourceStepRef}>
              <h3 style={{ marginTop: 0, marginBottom: "12px" }}>
                2. Elige un profesional
              </h3>

              {BARBERS.length === 1 ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    border: "1px solid #d1d5db",
                    borderRadius: "16px",
                    padding: "16px 18px",
                    backgroundColor: business?.theme?.primarySoft || "#f9fafb",
                    maxWidth: "360px",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
                  }}
                >
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "999px",
                      backgroundColor: business?.theme?.primary || "#111827",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold",
                      fontSize: "18px",
                      flexShrink: 0,
                    }}
                  >
                    {BARBERS[0]?.charAt(0) || "P"}
                  </div>

                  <div style={{ display: "grid", gap: "2px" }}>
                    <span
                      style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        fontWeight: "bold",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      Profesional asignado
                    </span>

                    <span
                      style={{
                        fontSize: "18px",
                        color: "#111827",
                        fontWeight: "bold",
                        lineHeight: 1.2,
                      }}
                    >
                      {BARBERS[0]}
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "12px",
                  }}
                >
                  {BARBERS.map((item) => {
                    const isSelected = barber === item;

                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          const isSame = barber === item;

                          if (isSame) {
                            setBarber("");
                            setDate("");
                            setTime("");
                            setTimeout(() => {
                              scrollToStep(serviceStepRef);
                            }, 120);
                            return;
                          }

                          setBarber(item);
                          setDate("");
                          setTime("");
                          setTimeout(() => {
                            scrollToStep(dayStepRef);
                          }, 120);
                        }}
                        style={{
                          ...styles.button,
                          padding: "14px",
                          borderRadius: "12px",
                          border: isSelected
                            ? `2px solid ${business?.theme?.primary || "#111827"}`
                            : "1px solid #d1d5db",
                          backgroundColor: isSelected
                            ? business?.theme?.primarySoft || "#f3f4f6"
                            : "#ffffff",
                          color: "#111827",
                        }}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          <section ref={dayStepRef}>
            <h3 style={{ marginTop: 0, marginBottom: "12px" }}>
              {showResourceStep ? "3. Elige un día" : "2. Elige un día"}
            </h3>

            <div style={{ display: "grid", gap: "12px" }}>
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: isMobile ? "wrap" : "nowrap",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setWeekOffset((prev) => prev - 1);
                  }}
                  style={{
                    ...styles.button,
                    ...styles.secondaryButton,
                    flex: isMobile ? "1 1 calc(50% - 5px)" : "0 0 auto",
                    minHeight: "48px",
                    borderRadius: "12px",
                  }}
                >
                  ← Semana anterior
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setWeekOffset(0);
                  }}
                  style={{
                    ...styles.button,
                    ...(weekOffset === 0
                      ? styles.primaryButton
                      : styles.secondaryButton),
                    flex: isMobile ? "1 1 calc(50% - 5px)" : "0 0 auto",
                    minHeight: "48px",
                    borderRadius: "12px",
                  }}
                >
                  Semana actual
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setWeekOffset((prev) => prev + 1);
                  }}
                  style={{
                    ...styles.button,
                    ...styles.secondaryButton,
                    flex: isMobile ? "1 1 100%" : "0 0 auto",
                    minHeight: "48px",
                    borderRadius: "12px",
                  }}
                >
                  Semana siguiente →
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "repeat(4, minmax(0, 1fr))"
                    : "repeat(7, minmax(0, 1fr))",
                  gap: "10px",
                }}
              >
                {weekDays.map((day) => {
                  const isSelected = date === day.value;
                  const isDisabled = day.isSunday || day.isPast;

                  return (
                    <button
                      key={day.value}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => {
                        if (isDisabled) return;

                        const isSame = date === day.value;

                        if (isSame) {
                          setDate("");
                          setTime("");
                          setTimeout(() => {
                            scrollToStep(
                              showResourceStep ? resourceStepRef : serviceStepRef
                            );
                          }, 120);
                          return;
                        }

                        setDate(day.value);
                        setTime("");
                        setTimeout(() => {
                          scrollToStep(timeStepRef);
                        }, 120);
                      }}
                      style={{
                        ...styles.button,
                        borderRadius: "14px",
                        minHeight: isMobile ? "60px" : "70px",
                        padding: "10px 8px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px",
                        border: isSelected
                          ? `2px solid ${business?.theme?.primary || "#111827"}`
                          : "1px solid #d1d5db",
                        backgroundColor: isDisabled
                          ? "#f3f4f6"
                          : isSelected
                          ? business?.theme?.primary || "#111827"
                          : "#ffffff",
                        color: isDisabled
                          ? "#9ca3af"
                          : isSelected
                          ? "#ffffff"
                          : "#111827",
                        boxShadow: isSelected
                          ? "0 6px 18px rgba(0,0,0,0.06)"
                          : "none",
                        opacity: isDisabled ? 0.6 : 1,
                      }}
                    >
                      <span
                        style={{
                          fontSize: isMobile ? "12px" : "13px",
                          fontWeight: "bold",
                          textTransform: "capitalize",
                          lineHeight: 1,
                        }}
                      >
                        {day.labelShort.replace(".", "")}
                      </span>

                      <span
                        style={{
                          fontSize: isMobile ? "20px" : "22px",
                          fontWeight: "bold",
                          lineHeight: 1,
                        }}
                      >
                        {day.dayNumber}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section ref={timeStepRef}>
            <h3 style={{ marginTop: 0, marginBottom: "12px" }}>
              {showResourceStep ? "4. Elige una hora" : "3. Elige una hora"}
            </h3>

            {!date ? (
              <p style={{ color: "#6b7280", margin: 0 }}>
                Primero selecciona una fecha.
              </p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                  gap: "12px",
                }}
              >
                {availableTimes.length === 0 ? (
  <p style={{ color: "#6b7280", margin: 0 }}>
    No hay horas configuradas para ese día.
  </p>
) : (
  availableTimes.map((slot) => {
    const isSelected = time === slot.value;
    const isDisabled = slot.disabled;

    return (
      <button
        key={slot.value}
        type="button"
        disabled={isDisabled}
        onClick={() => {
          if (isDisabled) return;

          const isSame = time === slot.value;

          if (isSame) {
            setTime("");
            setTimeout(() => {
              scrollToStep(dayStepRef);
            }, 120);
            return;
          }

          setTime(slot.value);
          setTimeout(() => {
            scrollToStep(dataStepRef);
          }, 120);
        }}
        style={{
          ...styles.button,
          padding: isMobile ? "12px 10px" : "14px 16px",
          borderRadius: "14px",
          border: isSelected
            ? `2px solid ${business?.theme?.primary || "#111827"}`
            : "1px solid #d1d5db",
          backgroundColor: isSelected
            ? business?.theme?.primarySoft || "#f3f4f6"
            : slot.status === "taken"
            ? "#f3f4f6"
            : slot.status === "past"
            ? "#f9fafb"
            : "#ffffff",
          color: isSelected
            ? "#111827"
            : slot.status === "taken"
            ? "#6b7280"
            : slot.status === "past"
            ? "#9ca3af"
            : "#111827",
          fontWeight: "bold",
          minHeight: isMobile ? "58px" : "64px",
          boxShadow: isSelected
            ? "0 6px 18px rgba(0,0,0,0.06)"
            : "none",
          fontSize: isMobile ? "14px" : "15px",
          opacity: slot.status === "past" ? 0.75 : 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "4px",
          cursor: isDisabled ? "not-allowed" : "pointer",
        }}
      >
        <span>{slot.value}</span>
        <span
          style={{
            fontSize: "11px",
            fontWeight: "bold",
            color:
              slot.status === "taken"
                ? "#6b7280"
                : slot.status === "past"
                ? "#9ca3af"
                : "#16a34a",
            textTransform: "uppercase",
            letterSpacing: "0.02em",
          }}
        >
          {slot.status === "taken"
  ? business?.takenSlotLabel || "Reservado"
  : slot.status === "past"
  ? business?.pastSlotLabel || "Pasó"
  : business?.availableSlotLabel || "Disponible"}
        </span>
      </button>
    );
  })
)}  
              </div>
            )}
          </section>

          <section ref={dataStepRef}>
            <h3 style={{ marginTop: 0, marginBottom: "12px" }}>
              {showResourceStep ? "5. Completa tus datos" : "4. Completa tus datos"}
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "12px",
                marginBottom: "16px",
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
            </div>

            <div
              style={{
                border: `1px solid ${business?.theme?.border || "#d1d5db"}`,
                borderRadius: "16px",
                padding: "18px",
                backgroundColor: business?.theme?.primarySoft || "#f9fafb",
                marginBottom: "18px",
                boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
              }}
            >
              <div
                style={{
                  fontWeight: "bold",
                  fontSize: "18px",
                  marginBottom: "14px",
                  color: "#111827",
                }}
              >
                Resumen de tu reserva
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "1fr"
                    : "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    padding: "12px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      fontWeight: "bold",
                      marginBottom: "4px",
                    }}
                  >
                    SERVICIO
                  </div>
                  <div style={{ color: "#111827", fontWeight: "bold" }}>
                    {service || "-"}
                  </div>
                </div>

                {showResourceStep && (
                  <div
                    style={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                      padding: "12px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        fontWeight: "bold",
                        marginBottom: "4px",
                      }}
                    >
                      PROFESIONAL
                    </div>
                    <div style={{ color: "#111827", fontWeight: "bold" }}>
                      {resolvedBarber || "-"}
                    </div>
                  </div>
                )}

                <div
                  style={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    padding: "12px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      fontWeight: "bold",
                      marginBottom: "4px",
                    }}
                  >
                    FECHA
                  </div>
                  <div style={{ color: "#111827", fontWeight: "bold" }}>
                    {date || "-"}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    padding: "12px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      fontWeight: "bold",
                      marginBottom: "4px",
                    }}
                  >
                    HORA
                  </div>
                  <div style={{ color: "#111827", fontWeight: "bold" }}>
                    {time || "-"}
                  </div>
                </div>
              </div>
            </div>

            <button
              style={{
                ...styles.button,
                ...styles.primaryButton,
                ...(submitting || !isClientFormComplete
                  ? styles.disabledButton
                  : {}),
                width: "100%",
                padding: isMobile ? "16px 18px" : "14px 18px",
                fontSize: isMobile ? "15px" : "14px",
              }}
              onClick={createAppointment}
              disabled={submitting || !isClientFormComplete}
            >
              {submitting
                ? business?.submittingLabel || "Reservando..."
                : business?.submitButtonLabel || "Confirmar reserva"}
            </button>
          </section>

          {message && <p style={styles.message}>{message}</p>}

          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                marginTop: "4px",
                padding: "12px 16px",
                backgroundColor: "#25D366",
                color: "#fff",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: "bold",
              }}
            >
              Abrir WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default ClientBookingWizard;