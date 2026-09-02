import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  formatDateToInput,
  getMonday,
  isPastDayOnly,
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
  clientFirstName = "",
  setClientFirstName = () => {},
  clientLastName = "",
  setClientLastName = () => {},
  phone,
  setPhone,
  clientRut = "",
  setClientRut = () => {},
  clientEmail = "",
  setClientEmail = () => {},
  availableDays = [],
  availableTimes = [],
  blockedWeekdays = [],
  createAppointment,
  submitting,
  isClientFormComplete,
  message,
  whatsappUrl,
  whatsappButtonText = "Abrir WhatsApp",
  allowReservationWithoutPayment = false,
  reserveWithoutPayment = false,
  setReserveWithoutPayment = () => {},
  onJoinWaitlist = null,
}) {
  const showResourceStep = !business?.hideResourceSelector;
  const resourceFirstFlow = Boolean(
    showResourceStep && business?.resourceFirstBookingFlow
  );
  const getResourceFromServiceName = (serviceName) => {
    if (!serviceName) return "";

    const match = String(serviceName).match(/Cancha\s+\d+/i);
    return match ? match[0] : "";
  };

  const isMobile = window.innerWidth < 768;

  const wizardRef = useRef(null);
  const serviceStepRef = useRef(null);
  const resourceStepRef = useRef(null);
  const dayStepRef = useRef(null);
  const timeStepRef = useRef(null);
  const reservationWithoutPaymentStepRef = useRef(null);
  const dataStepRef = useRef(null);
  const messageRef = useRef(null);

  const [showProgress, setShowProgress] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  const normalizedMessage = String(message || "").trim();
  const isWarningMessage = /ya tienes|error|completa|ingresa|no se pudo/i.test(
    normalizedMessage
  );

  const resolvedBarber =
    showResourceStep && BARBERS.length === 1 ? BARBERS[0] : barber;

  const allowedDateValues = useMemo(() => {
    return new Set((availableDays || []).map((day) => day.value));
  }, [availableDays]);

  const hasBookingWindow = allowedDateValues.size > 0;

  const weekHasAllowedDay = (weekStart) => {
    if (!hasBookingWindow) return true;

    return Array.from({ length: 7 }, (_, index) => {
      return formatDateToInput(addDays(weekStart, index));
    }).some((value) => allowedDateValues.has(value));
  };

  const legacySteps = showResourceStep
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

  const serviceStepNumber = resourceFirstFlow ? 2 : 1;
  const resourceStepNumber = resourceFirstFlow ? 1 : 2;
  const resourceStepLabel = business?.resourceLabelSingle || "Profesional";
  const resourceStepTitle =
    business?.resourceStepTitle || "Elige un profesional";
  const dayStepNumber = showResourceStep ? 3 : 2;
  const timeStepNumber = showResourceStep ? 4 : 3;
  const reservationWithoutPaymentStepNumber = allowReservationWithoutPayment
    ? timeStepNumber + 1
    : null;
  const dataStepNumber = allowReservationWithoutPayment
    ? timeStepNumber + 2
    : timeStepNumber + 1;
  const steps = [
    ...(resourceFirstFlow
      ? [
          { number: resourceStepNumber, label: resourceStepLabel },
          { number: serviceStepNumber, label: "Servicio" },
        ]
      : [
          { number: serviceStepNumber, label: "Servicio" },
          ...(showResourceStep
            ? [{ number: resourceStepNumber, label: resourceStepLabel }]
            : []),
        ]),
    { number: dayStepNumber, label: "Dia" },
    { number: timeStepNumber, label: "Hora" },
    ...(allowReservationWithoutPayment
      ? [
          {
            number: reservationWithoutPaymentStepNumber,
            label: "Sin pago",
          },
        ]
      : []),
    { number: dataStepNumber, label: "Datos" },
  ];

  const hasResourceSelection = showResourceStep ? Boolean(resolvedBarber) : true;
  let activeStep = resourceFirstFlow ? resourceStepNumber : serviceStepNumber;

  if (resourceFirstFlow) {
    if (hasResourceSelection) activeStep = serviceStepNumber;

    if (hasResourceSelection && service) {
      activeStep = dayStepNumber;
    }
  } else {
    if (service) activeStep = showResourceStep ? resourceStepNumber : dayStepNumber;

    if (hasResourceSelection && service) {
      activeStep = dayStepNumber;
    }
  }

  if (date && service && hasResourceSelection) {
    activeStep = timeStepNumber;
  }

  if (time && date && service && hasResourceSelection) {
    activeStep = allowReservationWithoutPayment
      ? reservationWithoutPaymentStepNumber
      : dataStepNumber;
  }

  if (
    time &&
    date &&
    service &&
    (name.trim() || phone.trim()) &&
    hasResourceSelection
  ) {
    activeStep = dataStepNumber;
  }

  const activeStepLabel =
    steps.find((step) => step.number === activeStep)?.label || "Reserva";

  const progressPercent = (activeStep / steps.length) * 100;
  const baseSubmitLabel =
    business?.onlinePaymentsEnabled && business?.paymentGateway?.buttonLabel
      ? business.paymentGateway.buttonLabel
      : business?.submitButtonLabel || "Confirmar reserva";
  const submitLabel =
    allowReservationWithoutPayment && reserveWithoutPayment
      ? "Crear reserva demo sin pago"
      : baseSubmitLabel;

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
        isBlocked: blockedWeekdays.includes(day.getDay()),
        isPast: isPastDayOnly(day),
        isOutsideBookingWindow:
          hasBookingWindow && !allowedDateValues.has(value),
        labelShort: day.toLocaleDateString("es-CL", {
          weekday: "short",
        }),
        dayNumber: day.toLocaleDateString("es-CL", {
          day: "2-digit",
        }),
      };
    });
  }, [currentWeekStart, blockedWeekdays, hasBookingWindow, allowedDateValues]);

  const canGoPreviousWeek = weekOffset > 0;
  const canGoNextWeek = weekHasAllowedDay(addDays(currentWeekStart, 7));

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
    if (!normalizedMessage || !messageRef.current) return;

    messageRef.current.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [normalizedMessage]);

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
          <section
            id="client-booking-service-step"
            ref={serviceStepRef}
            style={{ order: resourceFirstFlow ? 2 : 1 }}
          >
            <h3 style={{ marginTop: 0, marginBottom: "12px" }}>
              {serviceStepNumber}. Elige un servicio
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
                        if (showResourceStep && !resourceFirstFlow) {
                          setBarber("");
                        }
                        if (!showResourceStep && business?.hideResourceSelector) {
                          setBarber("");
                        }
                        setTimeout(() => {
                          scrollToStep(serviceStepRef);
                        }, 120);
                        return;
                      }

                      setService(item);
                      if (!showResourceStep && business?.hideResourceSelector) {
                        setBarber(getResourceFromServiceName(item));
                      }

                      if (showResourceStep) {
                        setDate("");
                        setTime("");
                        if (!resourceFirstFlow) {
                          setBarber(BARBERS.length === 1 ? BARBERS[0] : "");
                        }
                        setTimeout(() => {
                          scrollToStep(
                            resourceFirstFlow && resolvedBarber
                              ? dayStepRef
                              : resourceStepRef
                          );
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
            <section
              id="client-booking-resource-step"
              ref={resourceStepRef}
              style={{ order: resourceFirstFlow ? 1 : 2 }}
            >
              <h3 style={{ marginTop: 0, marginBottom: "12px" }}>
                {resourceStepNumber}. {resourceStepTitle}
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
                              scrollToStep(
                                resourceFirstFlow ? resourceStepRef : serviceStepRef
                              );
                            }, 120);
                            return;
                          }

                          setBarber(item);
                          setDate("");
                          setTime("");
                          setTimeout(() => {
                            scrollToStep(
                              resourceFirstFlow && !service
                                ? serviceStepRef
                                : dayStepRef
                            );
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

          <section
            id="client-booking-day-step"
            ref={dayStepRef}
            style={{ order: dayStepNumber }}
          >
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
                  disabled={!canGoPreviousWeek}
                  onClick={() => {
                    if (!canGoPreviousWeek) return;
                    setWeekOffset((prev) => prev - 1);
                  }}
                  style={{
                    ...styles.button,
                    ...styles.secondaryButton,
                    ...(!canGoPreviousWeek ? styles.disabledButton : {}),
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
                  disabled={!canGoNextWeek}
                  onClick={() => {
                    if (!canGoNextWeek) return;
                    setWeekOffset((prev) => prev + 1);
                  }}
                  style={{
                    ...styles.button,
                    ...styles.secondaryButton,
                    ...(!canGoNextWeek ? styles.disabledButton : {}),
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
                  const isDisabled =
                    day.isBlocked ||
                    day.isPast ||
                    day.isOutsideBookingWindow;

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

          <section ref={timeStepRef} style={{ order: timeStepNumber }}>
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
const isWaitlistSlot =
      Boolean(slot.isTaken) &&
      slot.status === "taken" &&
      typeof onJoinWaitlist === "function";
const isDisabled = slot.disabled && !isWaitlistSlot;
const isLookingForOpponent = slot.status === "looking_opponent";
const isBlocked = slot.status === "blocked";

    return (
      <button
        key={slot.value}
        type="button"
        disabled={isDisabled}
        onClick={() => {
          if (isDisabled) return;

          if (isWaitlistSlot) {
            onJoinWaitlist(slot);
            return;
          }

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
  : isLookingForOpponent
  ? "#dbeafe"
  : isBlocked
  ? "#f1f5f9"
  : slot.status === "taken"
  ? "#f3f4f6"
  : slot.status === "past"
  ? "#f9fafb"
  : "#ffffff",
          color: isSelected
  ? "#111827"
  : isLookingForOpponent
  ? "#1e40af"
  : isBlocked
  ? "#64748b"
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
          opacity: slot.status === "past" || isBlocked ? 0.75 : 1,
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
  isLookingForOpponent
    ? "#1d4ed8"
    : isBlocked
    ? "#64748b"
    : slot.status === "taken"
    ? "#6b7280"
    : slot.status === "past"
    ? "#9ca3af"
    : "#16a34a",
            textTransform: "uppercase",
            letterSpacing: "0.02em",
          }}
        >
          {isLookingForOpponent
  ? "Se busca rival"
  : isBlocked
  ? "Bloqueado"
  : slot.status === "taken"
  ? isWaitlistSlot
    ? "Lista de espera"
    : business?.takenSlotLabel || "Reservado"
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

          {allowReservationWithoutPayment && (
            <section
              ref={reservationWithoutPaymentStepRef}
              style={{ order: reservationWithoutPaymentStepNumber }}
            >
              <h3 style={{ marginTop: 0, marginBottom: "12px" }}>
                {reservationWithoutPaymentStepNumber}. Reserva sin pago
              </h3>

              <label
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr",
                  gap: "14px",
                  alignItems: "flex-start",
                  border: reserveWithoutPayment
                    ? "2px solid #16a34a"
                    : "1px solid #d1d5db",
                  borderRadius: "16px",
                  padding: "16px",
                  backgroundColor: reserveWithoutPayment ? "#dcfce7" : "#ffffff",
                  cursor: "pointer",
                  marginBottom: "18px",
                }}
              >
                <input
                  type="checkbox"
                  checked={reserveWithoutPayment}
                  onChange={(event) =>
                    setReserveWithoutPayment(event.target.checked)
                  }
                  style={{
                    width: "22px",
                    height: "22px",
                    marginTop: "2px",
                    accentColor: "#16a34a",
                  }}
                />

                <div>
                  <div
                    style={{
                      fontWeight: "900",
                      color: "#111827",
                      fontSize: "18px",
                      marginBottom: "6px",
                    }}
                  >
                    Reserva sin pago
                  </div>

                  <div
                    style={{
                      color: "#374151",
                      lineHeight: 1.45,
                      fontSize: "14px",
                    }}
                  >
                    Activa esta opción para probar la demo sin pasar por Mercado
                    Pago. La reserva se creará normalmente y podrás enviar la
                    confirmación por WhatsApp.
                  </div>
                </div>
              </label>
            </section>
          )}

          <section
            id="client-booking-data-step"
            ref={dataStepRef}
            style={{ order: dataStepNumber }}
          >
            <h3 style={{ marginTop: 0, marginBottom: "12px" }}>
              {dataStepNumber}. Completa tus datos
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
                placeholder="Nombre"
                value={clientFirstName}
                onChange={(e) => setClientFirstName(e.target.value)}
                autoComplete="given-name"
              />

              <input
                style={styles.input}
                placeholder="Apellido"
                value={clientLastName}
                onChange={(e) => setClientLastName(e.target.value)}
                autoComplete="family-name"
              />

              <input
                style={styles.input}
                placeholder={business?.clientPhonePlaceholder || "Tu teléfono"}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              {business?.clinicalRecordsEnabled && (
                <input
                  style={styles.input}
                  placeholder="RUT paciente"
                  value={clientRut}
                  onChange={(e) => setClientRut(e.target.value)}
                />
              )}

              <input
                style={styles.input}
                type="email"
                name="email"
                autoComplete="email"
                placeholder={
                  business?.clinicalRecordsEnabled
                    ? "Correo paciente"
                    : "Correo para confirmación (opcional)"
                }
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                required={business?.clinicalRecordsEnabled}
              />
            </div>

            {business?.clinicalRecordsEnabled && (
              <p
                style={{
                  margin: "-4px 0 14px",
                  color: "#64748b",
                  fontSize: "13px",
                  lineHeight: 1.45,
                }}
              >
                Estos datos crean una ficha inicial para que la profesional la
                complete durante la atencion.
              </p>
            )}

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
                : submitLabel}
            </button>
          </section>

          {message && (
            <p
              ref={messageRef}
              role="alert"
              style={{
                ...styles.message,
                marginTop: "12px",
                padding: "14px 16px",
                borderRadius: "12px",
                border: isWarningMessage
                  ? "1px solid #facc15"
                  : "1px solid #86efac",
                backgroundColor: isWarningMessage ? "#fef9c3" : "#dcfce7",
                color: isWarningMessage ? "#713f12" : "#14532d",
                fontWeight: "800",
                whiteSpace: "pre-line",
              }}
            >
              {message}
            </p>
          )}

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
              {whatsappButtonText}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default ClientBookingWizard;



