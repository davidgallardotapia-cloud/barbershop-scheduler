import React, { useEffect, useMemo, useState } from "react";
import {
  FaWhatsapp,
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaRegClock,
  FaUsers,
} from "react-icons/fa";

function BusinessHeader({
  isMobile,
  business,
  onHeaderResourceSelect,
  openOpponentAppointments = [],
  availabilitySummary = [],
  onOpponentAppointmentSelect,
  selectedBarber,
  selectedService,
  selectedDate,
  selectedTime,
}) {
  if (!business) return null;

  const hasSocialLinks =
    Boolean(business?.socialLinks?.instagram) ||
    Boolean(business?.socialLinks?.facebook);

  const headerSelectionMode = business?.headerSelectionMode || "professional";

  const getInstagramHandle = (url) => {
    if (!url) return "";

    const cleanUrl = url.replace(/\/+$/, "");
    const parts = cleanUrl.split("/");
    return parts[parts.length - 1]
      ? `@${parts[parts.length - 1]}`
      : "@instagram";
  };

  const getFacebookLabel = (url) => {
    if (!url) return "Facebook";

    const cleanUrl = url.replace(/\/+$/, "");
    const parts = cleanUrl.split("/");
    const lastPart = parts[parts.length - 1];

    return lastPart ? lastPart.replace(/-/g, " ") : "Facebook";
  };

  const parseServiceCard = (serviceName) => {
    const text = String(serviceName || "");
    const match = text.match(/^(.*?)\s*\((.*?)\)$/);

    return {
      title: match?.[1] || text,
      subtitle: match?.[2] || "",
    };
  };

  const isSportsBusiness = ["giocata", "pinguino-club"].includes(
    business?.id
  );

  const visibleOpponentAppointments = isSportsBusiness
    ? openOpponentAppointments.slice(0, 4)
    : [];

  const [showAvailabilitySummary, setShowAvailabilitySummary] = useState(false);

  const availabilityDayOptions = availabilitySummary || [];
  const [availabilitySelectedDate, setAvailabilitySelectedDate] = useState("");

  const availabilityDateValues = useMemo(() => {
    return availabilityDayOptions
      .map((day) => String(day?.value || ""))
      .filter(Boolean)
      .sort();
  }, [availabilityDayOptions]);

  const availabilityMinDate = availabilityDateValues[0] || "";
  const availabilityMaxDate =
    availabilityDateValues[availabilityDateValues.length - 1] || "";

  useEffect(() => {
    if (!availabilityDateValues.length) {
      setAvailabilitySelectedDate("");
      return;
    }

    setAvailabilitySelectedDate((currentDate) => {
      const selectedDateIsAvailable =
        selectedDate && availabilityDateValues.includes(selectedDate);

      if (selectedDateIsAvailable && currentDate !== selectedDate) {
        return selectedDate;
      }

      const currentDateIsInRange =
        currentDate &&
        (!availabilityMinDate || currentDate >= availabilityMinDate) &&
        (!availabilityMaxDate || currentDate <= availabilityMaxDate);

      if (currentDateIsInRange) return currentDate;

      return availabilityDateValues[0] || "";
    });
  }, [
    availabilityDateValues,
    availabilityMinDate,
    availabilityMaxDate,
    selectedDate,
  ]);

  const selectedAvailabilityDay = useMemo(() => {
    if (!availabilityDayOptions.length) return null;

    const matchedDay = availabilityDayOptions.find(
      (day) => day.value === availabilitySelectedDate
    );

    if (matchedDay) return matchedDay;

    if (availabilitySelectedDate) {
      return {
        value: availabilitySelectedDate,
        label: availabilitySelectedDate,
        slots: [],
        totalAvailable: 0,
      };
    }

    return availabilityDayOptions[0] || null;
  }, [availabilityDayOptions, availabilitySelectedDate]);

  const hasSelectedAvailabilitySlots = Boolean(
    selectedAvailabilityDay?.slots?.length
  );
  const availabilityTypes = useMemo(() => {
    const types = new Set();

    (business?.services || []).forEach((serviceName) => {
      const match = String(serviceName || "").match(/\(([^)-]+?)\s*-/);
      if (match?.[1]) types.add(match[1].trim());
    });

    availabilityDayOptions.forEach((day) => {
      (day.slots || []).forEach((slot) => {
        Object.keys(slot.availableByType || {}).forEach((typeLabel) =>
          types.add(typeLabel)
        );
      });
    });

    return Array.from(types).sort((a, b) => a.localeCompare(b, "es"));
  }, [availabilityDayOptions, business?.services]);

  const formatAvailabilityCell = (slot, typeLabel) => {
    const count = Number(slot?.availableByType?.[typeLabel] || 0);

    if (count <= 0) return "No";
    if (isMobile) return String(count);

    return count === 1 ? "1 disponible" : `${count} disponibles`;
  };

  const shouldShowSportsAvailabilitySummary = Boolean(
    business?.hideResourceSelector && availabilityDayOptions.length > 0
  );

  const capitalize = (value) => {
    const text = String(value || "");
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
  };

  const formatOpponentDate = (dateValue) => {
    const normalizedDate = String(dateValue || "").slice(0, 10);
    const parts = normalizedDate.split("-");

    if (parts.length !== 3) return "";

    const [year, month, day] = parts.map(Number);
    const localDate = new Date(year, month - 1, day);

    if (Number.isNaN(localDate.getTime())) return "";

    const weekday = capitalize(
      localDate.toLocaleDateString("es-CL", { weekday: "long" })
    );
    const monthLabel = localDate.toLocaleDateString("es-CL", {
      month: "long",
    });

    return `${weekday} ${String(day).padStart(2, "0")} de ${monthLabel}`;
  };

  const formatOpponentTime = (timeValue) => String(timeValue || "").slice(0, 5);

  const getOpponentResourceLabel = (appointment) => {
    const serviceResource = String(appointment?.service || "").match(
      /Cancha\s+\d+/i
    );

    return appointment?.barber || serviceResource?.[0] || "Cancha";
  };

  const headerItems =
    headerSelectionMode === "service"
      ? (business?.services || []).map((serviceName) => {
          const parsed = parseServiceCard(serviceName);
          const resourceMatch = String(serviceName).match(/Cancha\s+\d+/i);

          return {
            key: serviceName,
            name: parsed.title,
            subtitle: parsed.subtitle,
            image: business?.logo || business?.image || "",
            service: serviceName,
            resource: resourceMatch ? resourceMatch[0] : "",
          };
        })
      : (business?.professionals || [])
          .slice(
            0,
            business?.headerProfessionalsLimit ||
              business?.professionals?.length ||
              0
          )
          .map((pro) => ({
            key: pro.name,
            name: pro.name,
            subtitle: pro.subtitle || "",
            image: pro.image || business?.logo || business?.image || "",
            resource: pro.name,
          }));

  return (
    <>
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile
          ? "1fr"
          : "minmax(0, 1.8fr) minmax(320px, 1fr)",
        gap: isMobile ? "16px" : "24px",
        marginBottom: "24px",
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: "24px",
          overflow: "hidden",
          border: `1px solid ${business?.theme?.border || "#e5e7eb"}`,
          boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: isMobile ? "220px" : "420px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${business.image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              filter: "blur(18px)",
              transform: "scale(1.08)",
              opacity: 0.7,
            }}
          />

          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.20)",
            }}
          />

          <img
            src={business.image}
            alt={business.name}
            style={{
              position: "relative",
              zIndex: 1,
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "140px 1fr",
            gap: isMobile ? "16px" : "24px",
            alignItems: "start",
            padding: isMobile ? "16px" : "24px",
          }}
        >
          <div
            style={{
              width: business?.logoWidth || "140px",
              height: business?.logoHeight || "110px",
              borderRadius: "12px",
              overflow: "hidden",
              backgroundColor: "#111",
              margin: isMobile ? "0 auto" : "0",
            }}
          >
            <img
              src={business.logo}
              alt={`${business.name} logo`}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>

          <div>
            <h2
              style={{
                margin: "0 0 10px",
                fontSize: isMobile ? "22px" : "28px",
                lineHeight: 1.15,
                color: business?.theme?.primaryDark || "#172554",
              }}
            >
              {business.name}
            </h2>

            <p
              style={{
                margin: 0,
                fontSize: isMobile ? "16px" : "18px",
                lineHeight: 1.5,
                color: "#1f2937",
              }}
            >
              {business.description}
            </p>
          </div>
        </div>
      </div>

      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: "24px",
          border: `1px solid ${business?.theme?.border || "#e5e7eb"}`,
          boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
          padding: "22px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div>
          <p style={{ margin: "0 0 14px", fontSize: "18px", color: "#374151" }}>
            <FaMapMarkerAlt style={{ color: "#e11d48", fontSize: "18px" }} />{" "}
            {business.location}
          </p>

          <div style={{ margin: "0 0 14px" }}>
            <iframe
              src={business.mapEmbedUrl}
              width="100%"
              height="180"
              style={{
                border: 0,
                borderRadius: "12px",
              }}
              loading="lazy"
              title={`Mapa de ${business.name}`}
            ></iframe>

            <a
              href={business.mapLink}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "block",
                marginTop: "8px",
                fontSize: "14px",
                color: "#2563eb",
                textDecoration: "none",
              }}
            >
              <FaMapMarkerAlt style={{ color: "#e11d48", fontSize: "18px" }} />{" "}
              {business.address}
            </a>
          </div>

          {business?.phone && (
            <a
              href={
                business?.whatsappUrl ||
                `https://wa.me/${String(business.phone).replace(/\D/g, "")}`
              }
              target="_blank"
              rel="noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                margin: "0 0 14px",
                fontSize: "18px",
                color: "#374151",
                textDecoration: "none",
              }}
            >
              <FaPhoneAlt style={{ color: "#16a34a", fontSize: "19px" }} />
              <span>{business.phone}</span>
            </a>
          )}

          {business?.whatsappLabel && (
            <a
              href={
                business?.whatsappUrl ||
                `https://wa.me/${String(business.phone || "").replace(
                  /\D/g,
                  ""
                )}`
              }
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                margin: "0 0 14px",
                padding: "10px 14px",
                borderRadius: "999px",
                backgroundColor: "#dcfce7",
                border: "1px solid #86efac",
                color: "#166534",
                textDecoration: "none",
                fontSize: "16px",
                fontWeight: "800",
                width: "fit-content",
              }}
            >
              <FaWhatsapp style={{ color: "#16a34a", fontSize: "22px" }} />
              <span>{business.whatsappLabel}</span>
            </a>
          )}

          <div style={{ margin: "0 0 18px" }}>
            <p
              style={{
                margin: "0 0 6px",
                fontSize: "18px",
                color: "#374151",
              }}
            >
              <FaRegClock style={{ color: "#64748b", fontSize: "19px" }} />{" "}
              {business.hours || "Horario por confirmar"}
            </p>
          </div>

          {shouldShowSportsAvailabilitySummary && (
            <button
              type="button"
              onClick={() => setShowAvailabilitySummary(true)}
              style={{
                width: "100%",
                margin: "0 0 18px",
                border: `1px solid ${business?.theme?.border || "#bbf7d0"}`,
                borderRadius: "999px",
                backgroundColor: business?.theme?.primarySoft || "#dcfce7",
                color: business?.theme?.primaryDark || "#14532d",
                padding: isMobile ? "13px 16px" : "14px 18px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
                fontFamily: "inherit",
                fontWeight: "900",
                fontSize: "16px",
                boxShadow: "0 8px 18px rgba(15, 23, 42, 0.08)",
              }}
            >
              Ver disponibilidad
            </button>
          )}
          {visibleOpponentAppointments.length > 0 && (
            <div
              style={{
                margin: "0 0 24px",
                padding: "16px",
                borderRadius: "16px",
                backgroundColor: "#fff7ed",
                border: "1px solid #fed7aa",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  alignItems: "flex-start",
                  marginBottom: "12px",
                }}
              >
                <span
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "999px",
                    backgroundColor: "#ffedd5",
                    color: "#9a3412",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <FaUsers />
                </span>

                <div>
                  <div
                    style={{
                      fontWeight: "900",
                      color: "#9a3412",
                      fontSize: "18px",
                      lineHeight: 1.2,
                    }}
                  >
                    Se busca rival
                  </div>

                  <div
                    style={{
                      marginTop: "4px",
                      color: "#7c2d12",
                      fontSize: "13px",
                      lineHeight: 1.35,
                      fontWeight: "700",
                    }}
                  >
                    Elige un partido abierto y completa tus datos como equipo 2.
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gap: "10px" }}>
                {visibleOpponentAppointments.map((appointment) => {
                  const appointmentDate = String(
                    appointment.date || ""
                  ).slice(0, 10);
                  const appointmentTime = formatOpponentTime(appointment.time);
                  const dateLabel = formatOpponentDate(appointmentDate);
                  const resourceLabel = getOpponentResourceLabel(appointment);
                  const isSelected =
                    selectedDate === appointmentDate &&
                    String(selectedTime || "").slice(0, 5) ===
                      appointmentTime &&
                    selectedBarber === appointment.barber &&
                    (!appointment.service ||
                      selectedService === appointment.service);

                  return (
                    <button
                      key={
                        appointment.id ||
                        `${appointmentDate}-${appointmentTime}-${resourceLabel}`
                      }
                      type="button"
                      onClick={() => onOpponentAppointmentSelect?.(appointment)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                        border: isSelected
                          ? `2px solid ${business?.theme?.primary || "#166534"}`
                          : "1px solid #fdba74",
                        backgroundColor: isSelected ? "#ecfdf5" : "#ffffff",
                        borderRadius: "12px",
                        padding: "12px",
                        cursor: onOpponentAppointmentSelect
                          ? "pointer"
                          : "default",
                        fontFamily: "inherit",
                        textAlign: "left",
                        boxShadow: isSelected
                          ? "0 6px 16px rgba(22, 101, 52, 0.14)"
                          : "0 3px 10px rgba(154, 52, 18, 0.08)",
                      }}
                    >
                      <span style={{ minWidth: 0 }}>
                        <span
                          style={{
                            display: "block",
                            color: "#111827",
                            fontWeight: "900",
                            lineHeight: 1.25,
                          }}
                        >
                          {resourceLabel} el {dateLabel} a las{" "}
                          {appointmentTime} hrs
                        </span>

                        <span
                          style={{
                            display: "block",
                            marginTop: "4px",
                            color: "#7c2d12",
                            fontSize: "12px",
                            fontWeight: "800",
                            lineHeight: 1.25,
                          }}
                        >
                          Completar como equipo 2
                        </span>
                      </span>

                      <span
                        style={{
                          flexShrink: 0,
                          borderRadius: "999px",
                          backgroundColor:
                            business?.theme?.primary || "#166534",
                          color: "#ffffff",
                          fontWeight: "900",
                          fontSize: "12px",
                          padding: "7px 10px",
                        }}
                      >
                        Unirme
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {hasSocialLinks && (
            <div
              style={{
                margin: "0 0 24px",
                padding: "16px",
                borderRadius: "16px",
                backgroundColor: "#f8fafc",
                border: "1px solid #e5e7eb",
              }}
            >
              <div
                style={{
                  fontWeight: "900",
                  color: business?.theme?.text || "#111827",
                  marginBottom: "12px",
                  fontSize: "17px",
                }}
              >
                {"S\u00edguenos en redes"}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                {business?.socialLinks?.instagram && (
                  <a
                    href={business.socialLinks.instagram}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "10px",
                      textDecoration: "none",
                      padding: "10px 16px",
                      borderRadius: "999px",
                      background:
                        "linear-gradient(135deg, rgba(253,242,248,1) 0%, rgba(252,231,243,1) 100%)",
                      border: "1px solid #f9a8d4",
                      color: "#be185d",
                      fontWeight: "900",
                      fontSize: "14px",
                      boxShadow: "0 4px 12px rgba(190, 24, 93, 0.10)",
                    }}
                  >
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="22"
                        height="22"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <defs>
                          <linearGradient
                            id="igGradientHeader"
                            x1="0%"
                            y1="100%"
                            x2="100%"
                            y2="0%"
                          >
                            <stop offset="0%" stopColor="#f58529" />
                            <stop offset="35%" stopColor="#dd2a7b" />
                            <stop offset="70%" stopColor="#8134af" />
                            <stop offset="100%" stopColor="#515bd4" />
                          </linearGradient>
                        </defs>

                        <rect
                          x="3"
                          y="3"
                          width="18"
                          height="18"
                          rx="5"
                          stroke="url(#igGradientHeader)"
                          strokeWidth="2"
                        />

                        <circle
                          cx="12"
                          cy="12"
                          r="4.2"
                          stroke="url(#igGradientHeader)"
                          strokeWidth="2"
                        />

                        <circle
                          cx="17.2"
                          cy="6.8"
                          r="1.2"
                          fill="url(#igGradientHeader)"
                        />
                      </svg>
                    </span>

                    <span
                      style={{
                        color: "#db2777",
                        fontWeight: "900",
                      }}
                    >
                      {getInstagramHandle(business.socialLinks.instagram)}
                    </span>
                  </a>
                )}

                {business?.socialLinks?.facebook && (
                  <a
                    href={business.socialLinks.facebook}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "10px",
                      textDecoration: "none",
                      padding: "10px 16px",
                      borderRadius: "999px",
                      backgroundColor: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      color: "#1d4ed8",
                      fontWeight: "900",
                      fontSize: "14px",
                      boxShadow: "0 4px 12px rgba(29, 78, 216, 0.08)",
                    }}
                  >
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "999px",
                        backgroundColor: "#1877f2",
                        color: "#ffffff",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: "900",
                        fontSize: "16px",
                        fontFamily: "Arial, sans-serif",
                        flexShrink: 0,
                      }}
                    >
                      f
                    </span>

                    <span>{getFacebookLabel(business.socialLinks.facebook)}</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            borderTop: "1px solid #e5e7eb",
            paddingTop: "18px",
          }}
        >
          <h3
            style={{
              margin: "0 0 16px",
              fontSize: "18px",
              color: "#111827",
            }}
          >
            {business.headerResourceSectionTitle ||
              business.resourceLabelPlural ||
              "Recursos"}
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "repeat(2, minmax(0, 1fr))"
                : "repeat(2, 1fr)",
              gap: "16px",
              textAlign: "center",
            }}
          >
            {headerItems.map((item) => {
              const isSelected =
                headerSelectionMode === "service"
                  ? selectedService === item.service
                  : selectedBarber === item.name;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onHeaderResourceSelect?.(item)}
                  style={{
                    border: isSelected
                      ? `2px solid ${business?.theme?.primary || "#166534"}`
                      : "1px solid #e5e7eb",
                    backgroundColor: isSelected
                      ? business?.theme?.primarySoft || "#dcfce7"
                      : "#ffffff",
                    borderRadius: "16px",
                    padding: "10px 8px",
                    cursor: onHeaderResourceSelect ? "pointer" : "default",
                    boxShadow: isSelected
                      ? "0 6px 16px rgba(22, 101, 52, 0.14)"
                      : "0 3px 10px rgba(15,23,42,0.05)",
                    fontFamily: "inherit",
                  }}
                >
                  {item.image && (
                    <div
                      style={{
                        width: "58px",
                        height: "58px",
                        borderRadius: "999px",
                        overflow: "hidden",
                        margin: "0 auto 8px",
                        backgroundColor: "#ddd",
                      }}
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    </div>
                  )}

                  <div
                    style={{
                      fontSize: "14px",
                      color: "#374151",
                      fontWeight: "900",
                      lineHeight: 1.2,
                    }}
                  >
                    {item.name}
                  </div>

                  {item.subtitle && (
                    <div
                      style={{
                        marginTop: "4px",
                        fontSize: "12px",
                        color: business?.theme?.mutedText || "#64748b",
                        fontWeight: "700",
                        lineHeight: 1.2,
                      }}
                    >
                      {item.subtitle}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>

    {showAvailabilitySummary && selectedAvailabilityDay && (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Disponibilidad de canchas"
        onClick={() => setShowAvailabilitySummary(false)}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          backgroundColor: "rgba(15, 23, 42, 0.52)",
          padding: isMobile ? "18px" : "32px",
          display: "flex",
          alignItems: isMobile ? "flex-start" : "center",
          justifyContent: "center",
          overflowY: "auto",
        }}
      >
        <div
          onClick={(event) => event.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: "620px",
            borderRadius: "22px",
            backgroundColor: "#ffffff",
            border: `1px solid ${business?.theme?.border || "#bbf7d0"}`,
            boxShadow: "0 24px 70px rgba(15, 23, 42, 0.28)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: isMobile ? "16px" : "20px",
              backgroundColor: business?.theme?.primarySoft || "#dcfce7",
              borderBottom: `1px solid ${business?.theme?.border || "#bbf7d0"}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "14px",
            }}
          >
            <div>
              <div
                style={{
                  color: business?.theme?.primaryDark || "#14532d",
                  fontSize: isMobile ? "20px" : "24px",
                  fontWeight: "900",
                  lineHeight: 1.1,
                }}
              >
                Disponibilidad de canchas
              </div>
              <div
                style={{
                  marginTop: "5px",
                  color: "#475569",
                  fontSize: "13px",
                  fontWeight: "800",
                }}
              >
                {business.name}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAvailabilitySummary(false)}
              style={{
                border: 0,
                borderRadius: "999px",
                backgroundColor: "#ffffff",
                color: "#111827",
                padding: "9px 12px",
                cursor: "pointer",
                fontFamily: "inherit",
                fontWeight: "900",
                whiteSpace: "nowrap",
              }}
            >
              Cerrar
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gap: "12px",
              padding: isMobile ? "14px" : "18px",
            }}
          >
            <label
              style={{
                display: "grid",
                gap: "6px",
                width: "100%",
                maxWidth: isMobile ? "100%" : "300px",
              }}
            >
              <div
                style={{
                  color: "#64748b",
                  fontSize: "12px",
                  fontWeight: "900",
                }}
              >
                Día de disponibilidad
              </div>
              <input
                type="date"
                value={availabilitySelectedDate}
                min={availabilityMinDate}
                max={availabilityMaxDate}
                onChange={(event) =>
                  setAvailabilitySelectedDate(event.target.value)
                }
                style={{
                  width: "100%",
                  minHeight: "46px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "10px",
                  backgroundColor: "#ffffff",
                  color: "#111827",
                  padding: "0 12px",
                  fontFamily: "inherit",
                  fontSize: "15px",
                  fontWeight: "800",
                }}
              />
            </label>

            <div
              style={{
                overflowX: "auto",
                border: "1px solid #e5e7eb",
                borderRadius: "16px",
              }}
            >
              <table
                style={{
                  width: "100%",
                  minWidth: isMobile
                    ? "100%"
                    : availabilityTypes.length > 1
                    ? "420px"
                    : "300px",
                  borderCollapse: "collapse",
                  tableLayout: isMobile ? "fixed" : "auto",
                  fontSize: isMobile ? "13px" : "14px",
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        textAlign: "left",
                        padding: isMobile ? "10px 8px" : "11px 12px",
                        width: isMobile ? "66px" : "auto",
                        backgroundColor: business?.theme?.primary || "#166534",
                        color: "#ffffff",
                        fontWeight: "900",
                      }}
                    >
                      Hora
                    </th>
                    {availabilityTypes.map((typeLabel) => (
                      <th
                        key={typeLabel}
                        style={{
                          textAlign: "center",
                          padding: isMobile ? "10px 6px" : "11px 12px",
                          backgroundColor: business?.theme?.primary || "#166534",
                          color: "#ffffff",
                          fontWeight: "900",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isMobile ? typeLabel : `Cancha ${typeLabel}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!hasSelectedAvailabilitySlots ? (
                    <tr>
                      <td
                        colSpan={Math.max(1, availabilityTypes.length + 1)}
                        style={{
                          padding: isMobile ? "18px 12px" : "20px 16px",
                          borderTop: "1px solid #e5e7eb",
                          color: "#64748b",
                          fontWeight: "900",
                          textAlign: "center",
                        }}
                      >
                        No hay disponibilidad configurada para este día.
                      </td>
                    </tr>
                  ) : (
                    selectedAvailabilityDay.slots.map((slot) => (
                      <tr key={slot.time}>
                        <td
                          style={{
                            padding: isMobile ? "10px 8px" : "10px 12px",
                            borderTop: "1px solid #e5e7eb",
                            fontWeight: "900",
                            color: "#111827",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {slot.time}
                        </td>
                        {availabilityTypes.map((typeLabel) => {
                          const hasAvailability =
                            Number(slot?.availableByType?.[typeLabel] || 0) > 0;

                          return (
                            <td
                              key={`${slot.time}-${typeLabel}`}
                              style={{
                                padding: isMobile ? "10px 6px" : "10px 12px",
                                borderTop: "1px solid #e5e7eb",
                                color: hasAvailability ? "#166534" : "#991b1b",
                                fontWeight: "900",
                                textAlign: "center",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {formatAvailabilityCell(slot, typeLabel)}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
export default BusinessHeader;
