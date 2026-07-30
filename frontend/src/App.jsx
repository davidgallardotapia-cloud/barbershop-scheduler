import React, { useEffect, useMemo, useState } from "react";
import LoginScreen from "./components/LoginScreen";
import AdminBookingPanel from "./components/AdminBookingPanel";
import ClinicalRecordsPanel from "./components/ClinicalRecordsPanel";
import WeeklyCalendar from "./components/WeeklyCalendar";
import BusinessHeader from "./components/BusinessHeader";
import HomeLanding from "./components/HomeLanding";
import ClientBookingWizard from "./components/ClientBookingWizard";
import {
  FaCalendarAlt,
  FaFacebookF,
  FaInstagram,
  FaMapMarkerAlt,
  FaWhatsapp,
} from "react-icons/fa";
import {
  getMonday,
  formatDateToInput,
  formatHourLabel,
  addDays,
  sameDate,
  isPastSlot,
  isPastDayOnly,
} from "./utils/dateUtils";
import {
  buildBarberWhatsappUrl,
  buildOpponentWhatsappUrl,
} from "./utils/whatsapp";
import {
  getAppointments as fetchAppointments,
  getAdminAppointments,
  getAdminClientSuggestions,
  getScheduleBlocks,
  getAdminScheduleBlocks,
  createScheduleBlock as createScheduleBlockService,
  deleteScheduleBlock as deleteScheduleBlockService,
  createAppointment as createAppointmentService,
  createMonthlyAppointment as createMonthlyAppointmentService,
  joinOpponentAppointment,
  updateAppointment as updateAppointmentService,
  deleteAppointment as deleteAppointmentService,
  loginUser,
  logoutUser,
  getBusinessBySlug,
  getAppointmentPayments,
  addAppointmentPayment,
  updateAppointmentPayment,
  deleteAppointmentPayment,
  createMercadoPagoPreference,
  syncGoogleSheets as syncGoogleSheetsService,
} from "./services/appointmentsService";
import { businessConfigBySlug } from "./config/businessConfigBySlug";

function ReservationVoucherModal({ voucher, business, theme, isMobile, onClose }) {
  if (!voucher) return null;

  const primary = theme?.primary || "#166534";
  const primarySoft = theme?.primarySoft || "#dcfce7";
  const border = theme?.border || "#bbf7d0";
  const logo = business?.logo || "/agendasmart/agendasmart-favicon.png";

  const printReservationVoucher = () => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const voucherElement = document.querySelector(".reservation-voucher-print-card");

    if (!voucherElement) {
      window.print();
      return;
    }

    const printWindow = window.open("", "_blank", "width=820,height=900");

    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Comprobante de reserva</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 24px;
              background: #ffffff;
              color: #0f172a;
              font-family: Arial, sans-serif;
            }
            .reservation-voucher-print-card {
              width: 100% !important;
              max-width: 760px !important;
              max-height: none !important;
              overflow: visible !important;
              margin: 0 auto !important;
              box-shadow: none !important;
            }
            .reservation-voucher-no-print { display: none !important; }
            @page { margin: 14mm; }
          </style>
        </head>
        <body>${voucherElement.outerHTML}</body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };
  const rows = [
    { label: "Servicio", value: voucher.service, icon: "S" },
    { label: voucher.resourceLabel || "Profesional", value: voucher.resource, icon: "R" },
    { label: "Fecha y hora", value: `${voucher.dateLabel} - ${voucher.timeLabel}`, icon: "F" },
    { label: "Duración", value: voucher.durationLabel, icon: "D" },
    { label: "Ubicación", value: voucher.locationLabel, icon: "U" },
    { label: "Precio", value: voucher.priceLabel, icon: "$" },
  ].filter((row) => row.value);

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }

          .reservation-voucher-print-card,
          .reservation-voucher-print-card * {
            visibility: visible !important;
          }

          .reservation-voucher-print-overlay {
            position: static !important;
            inset: auto !important;
            display: block !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          .reservation-voucher-print-card {
            position: static !important;
            width: 100% !important;
            max-width: 760px !important;
            max-height: none !important;
            overflow: visible !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border-radius: 18px !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .reservation-voucher-no-print {
            display: none !important;
          }

          @page {
            margin: 14mm;
          }
        }
      `}</style>

      <div
        className="reservation-voucher-print-overlay"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10000,
          backgroundColor: "rgba(15, 23, 42, 0.55)",
          display: "flex",
          alignItems: isMobile ? "flex-end" : "center",
          justifyContent: "center",
          padding: isMobile ? "12px" : "24px",
        }}
        onClick={onClose}
      >
        <div
          className="reservation-voucher-print-card"
          style={{
            width: "100%",
            maxWidth: "520px",
            maxHeight: isMobile ? "92vh" : "86vh",
            overflowY: "auto",
            backgroundColor: "#ffffff",
            borderRadius: isMobile ? "24px 24px 18px 18px" : "24px",
            border: `1px solid ${border}`,
            boxShadow: "0 24px 70px rgba(15, 23, 42, 0.28)",
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <div
            style={{
              padding: isMobile ? "20px" : "24px",
              background: `linear-gradient(135deg, ${primarySoft}, #ffffff 62%)`,
              borderBottom: `1px solid ${border}`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <img
                  src={logo}
                  alt={business?.name || "AgendaSmart"}
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "16px",
                    objectFit: "cover",
                    backgroundColor: "#ffffff",
                    border: `1px solid ${border}`,
                  }}
                />
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 800, color: primary }}>
                    Comprobante de reserva
                  </div>
                  <h2 style={{ margin: "3px 0 0", fontSize: isMobile ? "23px" : "28px" }}>
                    {business?.name || "AgendaSmart"}
                  </h2>
                </div>
              </div>

              <button
                className="reservation-voucher-no-print"
                type="button"
                onClick={onClose}
                style={{
                  border: "0",
                  borderRadius: "12px",
                  padding: "10px 13px",
                  fontWeight: 800,
                  cursor: "pointer",
                  backgroundColor: "#e5e7eb",
                  color: "#111827",
                }}
              >
                Cerrar
              </button>
            </div>

            <div
              style={{
                marginTop: "18px",
                padding: "14px 16px",
                borderRadius: "16px",
                backgroundColor: "#ffffff",
                border: `1px solid ${border}`,
              }}
            >
              <div style={{ fontSize: "13px", color: "#64748b", fontWeight: 700 }}>
                {voucher.clientLabel || "Cliente"}
              </div>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#0f172a" }}>
                {voucher.clientName}
              </div>
            </div>
          </div>

          <div style={{ padding: isMobile ? "8px 20px 22px" : "12px 24px 24px" }}>
            {rows.map((row) => (
              <div
                key={row.label}
                style={{
                  display: "grid",
                  gridTemplateColumns: "44px 1fr",
                  gap: "14px",
                  padding: "18px 0",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: primarySoft,
                    color: primary,
                    fontWeight: 900,
                    border: `1px solid ${border}`,
                  }}
                >
                  {row.icon}
                </div>
                <div>
                  <div style={{ fontSize: "18px", fontWeight: 900, color: "#374151" }}>
                    {row.label}
                  </div>
                  <div style={{ marginTop: "6px", fontSize: "20px", lineHeight: 1.35, color: "#4b5563" }}>
                    {row.value}
                  </div>
                </div>
              </div>
            ))}

            <div
              className="reservation-voucher-no-print"
              style={{
                display: "flex",
                gap: "10px",
                marginTop: "20px",
                flexDirection: isMobile ? "column" : "row",
              }}
            >
              <button
                type="button"
                onClick={printReservationVoucher}
                style={{
                  flex: 1,
                  border: `1px solid ${border}`,
                  borderRadius: "14px",
                  padding: "14px 16px",
                  fontWeight: 900,
                  cursor: "pointer",
                  backgroundColor: primary,
                  color: "#ffffff",
                }}
              >
                Imprimir / guardar
              </button>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  border: "1px solid #d1d5db",
                  borderRadius: "14px",
                  padding: "14px 16px",
                  fontWeight: 900,
                  cursor: "pointer",
                  backgroundColor: "#ffffff",
                  color: "#111827",
                }}
              >
                Volver a la agenda
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
function BusinessLoadingState({ styles, business }) {
  const logo = business?.logo || "/agendasmart/agendasmart-favicon.png";
  const businessName = business?.name || "AgendaSmart";

  return (
    <div style={styles.loadingStateCard}>
      <div style={styles.loadingLogoWrap}>
        <img
          src={logo}
          alt={businessName}
          style={styles.loadingLogo}
        />
      </div>

      <div>
        <div style={styles.loadingTitle}>Preparando agenda</div>
        <div style={styles.loadingText}>
          Cargando horarios, servicios y disponibilidad de {businessName}.
        </div>
      </div>

      <div style={styles.loadingBar}>
        <div style={styles.loadingBarFill} />
      </div>

      <div style={styles.loadingSkeletonGrid}>
        {[0, 1, 2].map((item) => (
          <div key={item} style={styles.loadingSkeletonCard}>
            <div style={{ ...styles.loadingSkeletonLine, width: "52%" }} />
            <div style={{ ...styles.loadingSkeletonLine, width: "82%" }} />
            <div style={{ ...styles.loadingSkeletonLine, width: "66%" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function AgendaSmartFooter({ isMobile, theme }) {
  return (
    <footer
      style={{
        marginTop: isMobile ? "22px" : "30px",
        padding: isMobile ? "16px 0 6px" : "22px 0 4px",
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <a
        href="/"
        aria-label="Ir a AgendaSmart"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "9px",
          color: theme?.primaryDark || "#0f172a",
          textDecoration: "none",
          fontSize: isMobile ? "13px" : "14px",
          fontWeight: "800",
          opacity: 0.78,
        }}
      >
        <img
          src="/agendasmart/agendasmart-favicon.png"
          alt=""
          aria-hidden="true"
          style={{
            width: "26px",
            height: "26px",
            objectFit: "contain",
            borderRadius: "6px",
          }}
        />
        <span>AgendaSmart</span>
      </a>
    </footer>
  );
}

function BusinessLinkPage({ business, isMobile, slug }) {
  const theme = business?.linkTheme || business?.theme || {};
  const primary = theme.primary || "#166534";
  const primaryDark = theme.primaryDark || "#14532d";
  const primarySoft = theme.primarySoft || "#dcfce7";
  const border = theme.border || "#bbf7d0";
  const whatsappColor = theme.whatsapp || "#16a34a";
  const whatsappHref =
    business?.whatsappUrl ||
    `https://wa.me/${String(business?.phone || "").replace(/\D/g, "")}`;
  const businessRoute = slug || business?.slug || business?.id || "";
  const bookingHref = `/${businessRoute}#booking-form-section`;
  const facebookHref = business?.socialLinks?.facebook || "";
  const instagramHref = business?.socialLinks?.instagram || "";
  const socialHref = facebookHref || instagramHref;
  const SocialIcon = instagramHref && !facebookHref ? FaInstagram : FaFacebookF;
  const isSportsBusiness = ["giocata", "pinguino-club"].includes(
    business?.id || businessRoute
  );
  const bookingLabel =
    business?.linkBookingLabel ||
    (isSportsBusiness
      ? "Reserva tu cancha"
      : business?.bookingPanelTitle || business?.bookingTitle || "Agenda tu hora");
  const linkHero = business?.linkHero || {};
  const linkLogo = business?.linkLogo || {};

  const linkButtonStyle = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    width: "100%",
    padding: "15px 16px",
    borderRadius: "14px",
    border: `1px solid ${border}`,
    backgroundColor: primary,
    color: "#ffffff",
    textDecoration: "none",
    fontSize: "15px",
    fontWeight: "900",
    boxSizing: "border-box",
    boxShadow: "0 10px 22px rgba(15, 23, 42, 0.14)",
  };

  const iconBoxStyle = {
    width: "42px",
    height: "42px",
    borderRadius: "12px",
    backgroundColor: "#ffffff",
    color: primary,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    fontSize: "18px",
  };

  return (
    <>
      <AppAnimationStyles />

      <main
        style={{
          minHeight: "100vh",
          background: `linear-gradient(180deg, ${primarySoft} 0%, #ffffff 44%, ${primarySoft} 100%)`,
          fontFamily: "Arial, sans-serif",
          color: "#0f172a",
          padding: isMobile ? "12px" : "28px",
          boxSizing: "border-box",
        }}
      >
        <section
          style={{
            width: "100%",
            maxWidth: "430px",
            margin: "0 auto",
            borderRadius: "28px",
            overflow: "hidden",
            backgroundColor: "#ffffff",
            border: `1px solid ${border}`,
            boxShadow: "0 18px 50px rgba(15, 23, 42, 0.16)",
          }}
        >
          <div
            style={{
              position: "relative",
              minHeight: linkHero.height || "170px",
              backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.42)), url(${business?.image})`,
              backgroundSize: linkHero.backgroundSize || "cover",
              backgroundPosition: linkHero.backgroundPosition || "center",
            }}
          >
            <a
              href="/"
              aria-label="Ir a AgendaSmart"
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                padding: "8px 10px",
                borderRadius: "999px",
                backgroundColor: "rgba(255,255,255,0.92)",
                color: primaryDark,
                fontSize: "12px",
                fontWeight: "900",
                textDecoration: "none",
              }}
            >
              <img
                src="/agendasmart/agendasmart-favicon.png"
                alt=""
                aria-hidden="true"
                style={{ width: "18px", height: "18px", borderRadius: "4px" }}
              />
              AgendaSmart
            </a>
          </div>

          <div
            style={{
              padding: "0 22px 24px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: linkLogo.size || "112px",
                height: linkLogo.size || "112px",
                borderRadius: "999px",
                backgroundColor: "#ffffff",
                border: "5px solid #ffffff",
                margin: linkLogo.margin || "-56px auto 14px",
                overflow: "hidden",
                position: "relative",
                boxShadow: "0 12px 28px rgba(15, 23, 42, 0.18)",
              }}
            >
              <img
                src={business?.logo}
                alt={`${business?.name || "Negocio"} logo`}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </div>

            <h1
              style={{
                margin: "0 0 6px",
                color: primaryDark,
                fontSize: "23px",
                lineHeight: 1.15,
              }}
            >
              {business?.name}
            </h1>

            <p
              style={{
                margin: "0 0 18px",
                color: "#475569",
                fontSize: "14px",
                lineHeight: 1.45,
                fontWeight: "700",
              }}
            >
              {business?.subtitle || "Reserva tu hora online"}
            </p>

            <div style={{ display: "grid", gap: "12px", textAlign: "left" }}>
              <a href={bookingHref} style={linkButtonStyle}>
                <span style={iconBoxStyle}>
                  <FaCalendarAlt />
                </span>
                <span>{bookingLabel}</span>
              </a>

              {business?.phone && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    ...linkButtonStyle,
                    backgroundColor: whatsappColor,
                  }}
                >
                  <span style={{ ...iconBoxStyle, color: whatsappColor }}>
                    <FaWhatsapp />
                  </span>
                  <span>Hablar por WhatsApp</span>
                </a>
              )}

              {business?.mapLink && (
                <a
                  href={business.mapLink}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    ...linkButtonStyle,
                    backgroundColor: primaryDark,
                  }}
                >
                  <span style={{ ...iconBoxStyle, color: primaryDark }}>
                    <FaMapMarkerAlt />
                  </span>
                  <span>Nuestra ubicacion</span>
                </a>
              )}

              {socialHref && (
                <a
                  href={socialHref}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    ...linkButtonStyle,
                    backgroundColor: "#ffffff",
                    color: primaryDark,
                    border: `1px solid ${border}`,
                    boxShadow: "0 6px 16px rgba(15, 23, 42, 0.08)",
                  }}
                >
                  <span
                    style={{
                      ...iconBoxStyle,
                      backgroundColor: primarySoft,
                      color: primary,
                    }}
                  >
                    <SocialIcon />
                  </span>
                  <span>Siguenos en redes</span>
                </a>
              )}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function AppAnimationStyles() {
  return (
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      @keyframes loadingShimmer {
        0% { background-position: 180% 0; }
        100% { background-position: -180% 0; }
      }

      @keyframes loadingBarSlide {
        0% { transform: translateX(-110%); }
        55% { transform: translateX(85%); }
        100% { transform: translateX(240%); }
      }

      @keyframes loadingFloat {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }

      @media (prefers-reduced-motion: reduce) {
        * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          scroll-behavior: auto !important;
        }
      }
    `}</style>
  );
}

function appointmentMatchesClientSearch(appointment, normalizedSearch) {
  if (!normalizedSearch) return true;

  const searchableText = [
    appointment?.name,
    appointment?.phone,
    appointment?.opponent_name,
    appointment?.opponent_phone,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchableText.includes(normalizedSearch);
}

const DEFAULT_SCHEDULE_SLOTS = Array.from(
  { length: 12 },
  (_, index) => `${String(index + 9).padStart(2, "0")}:00`
);

function normalizeScheduleSlotValue(slot) {
  return typeof slot === "string"
    ? slot.slice(0, 5)
    : `${String(slot).padStart(2, "0")}:00`;
}

function scheduleSlotToMinutes(slot) {
  const [hoursPart, minutesPart = "0"] = normalizeScheduleSlotValue(slot).split(
    ":"
  );
  const parsedHours = Number(hoursPart);
  const parsedMinutes = Number(minutesPart);

  if (Number.isNaN(parsedHours) || Number.isNaN(parsedMinutes)) return 0;

  return parsedHours * 60 + parsedMinutes;
}

function sortScheduleSlots(slots) {
  return Array.from(new Set(slots.map(normalizeScheduleSlotValue))).sort(
    (left, right) => scheduleSlotToMinutes(left) - scheduleSlotToMinutes(right)
  );
}

function getWeekdayFromDateValue(dateValue) {
  const date =
    dateValue instanceof Date ? dateValue : new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) return null;

  return date.getDay();
}

function App() {
  const getRouteInfoFromUrl = () => {
    if (typeof window === "undefined") {
      return {
        slug: "urban-district-barber",
        isBusinessLinkPage: false,
      };
    }

    const segments = window.location.pathname
      .replace(/^\/+|\/+$/g, "")
      .split("/")
      .filter(Boolean);

    if (segments[0] === "l" && segments[1]) {
      return {
        slug: segments[1],
        isBusinessLinkPage: true,
      };
    }

    return {
      slug: segments[0] || "",
      isBusinessLinkPage: segments[1] === "link",
    };
  };

  const [routeInfo] = useState(getRouteInfoFromUrl);
  const slug = routeInfo.slug;
  const isBusinessLinkPage = routeInfo.isBusinessLinkPage;

  const [business, setBusiness] = useState(null);
  const [businessId, setBusinessId] = useState("");
  const [businessLoading, setBusinessLoading] = useState(true);
  const [businessError, setBusinessError] = useState("");

  const [appointments, setAppointments] = useState([]);
  const [scheduleBlocks, setScheduleBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [clientRut, setClientRut] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [service, setService] = useState("");
  const [customServiceName, setCustomServiceName] = useState("");
const [customServicePrice, setCustomServicePrice] = useState("");

const [needsOpponent, setNeedsOpponent] = useState(false);
const [opponentName, setOpponentName] = useState("");
const [opponentPhone, setOpponentPhone] = useState("");

const [barber, setBarber] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [paymentAppointment, setPaymentAppointment] = useState(null);
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [whatsappButtonText, setWhatsappButtonText] = useState("Abrir WhatsApp");
  const [reserveWithoutPayment, setReserveWithoutPayment] = useState(false);
  const [reservationVoucher, setReservationVoucher] = useState(null);

  const [selectedWeekStart, setSelectedWeekStart] = useState(
    getMonday(new Date())
  );
  const [weeklyBarberFilter, setWeeklyBarberFilter] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [clientSuggestions, setClientSuggestions] = useState([]);
  const [loadingClientSuggestions, setLoadingClientSuggestions] = useState(false);
  const [clientSuggestionQuery, setClientSuggestionQuery] = useState("");
  const [clientSuggestionError, setClientSuggestionError] = useState("");

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [appMode, setAppMode] = useState("client");
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  const [isCompactAdmin, setIsCompactAdmin] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 1180 : false
  );
  const [selectedMobileDay, setSelectedMobileDay] = useState(null);
  const [isDailyDashboardOpen, setIsDailyDashboardOpen] = useState(false);

  const [selectedAppointmentPayments, setSelectedAppointmentPayments] = useState(
    []
  );
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("transferencia");
  const [paymentStage, setPaymentStage] = useState("deposit");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [paymentPanelError, setPaymentPanelError] = useState("");
  const [isMonthlyReservation, setIsMonthlyReservation] = useState(false);
  const [blockResource, setBlockResource] = useState("");
  const [blockStartDate, setBlockStartDate] = useState(() =>
    formatDateToInput(new Date())
  );
  const [blockEndDate, setBlockEndDate] = useState(() =>
    formatDateToInput(new Date())
  );
  const [blockAllDay, setBlockAllDay] = useState(false);
  const [blockStartTime, setBlockStartTime] = useState("");
  const [blockEndTime, setBlockEndTime] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [scheduleBlockMessage, setScheduleBlockMessage] = useState("");

  const currentBusinessConfig = useMemo(() => {
    return businessConfigBySlug[slug] || null;
  }, [slug]);

  const BARBERS = currentBusinessConfig?.barbers || [];
  const servicesByResource = currentBusinessConfig?.servicesByResource || {};
  const selectedResourceServices =
    barber && servicesByResource[barber] ? servicesByResource[barber] : null;
  const SERVICES = selectedResourceServices || currentBusinessConfig?.services || [];
  const BARBER_PHONES = currentBusinessConfig?.phones || {};

  const mergedBusiness = useMemo(() => {
    if (!business && !currentBusinessConfig) return null;

    return {
      ...(currentBusinessConfig || {}),
      ...(business || {}),
    };
  }, [business, currentBusinessConfig]);

  const theme = mergedBusiness?.theme || {};

  const baseScheduleSlots =
    currentBusinessConfig?.scheduleSlots || DEFAULT_SCHEDULE_SLOTS;
  const scheduleSlotsByWeekday =
    currentBusinessConfig?.scheduleSlotsByWeekday || {};

  const hours = useMemo(() => {
    const weekdaySpecificSlots = Object.values(scheduleSlotsByWeekday).flat();

    return sortScheduleSlots([...baseScheduleSlots, ...weekdaySpecificSlots]);
  }, [baseScheduleSlots, scheduleSlotsByWeekday]);

  const getScheduleSlotsForDate = (dateValue) => {
    const weekday = getWeekdayFromDateValue(dateValue);
    const weekdaySchedule =
      weekday === null ? null : scheduleSlotsByWeekday[String(weekday)];

    return sortScheduleSlots(weekdaySchedule || baseScheduleSlots);
  };

  const isScheduleSlotAvailable = (day, hour) => {
    const dayScheduleSlots = new Set(
      getScheduleSlotsForDate(day).map(normalizeScheduleSlotValue)
    );

    return dayScheduleSlots.has(normalizeScheduleSlotValue(hour));
  };

  const usesServiceDurations = Boolean(mergedBusiness?.usesServiceDurations);
  const slotIntervalMinutes = Number(mergedBusiness?.slotIntervalMinutes || 30);
  const blockedWeekdays = mergedBusiness?.blockedWeekdays || [];
  const paymentsEnabled = mergedBusiness?.paymentsEnabled || false;
  const depositFeatureEnabled = mergedBusiness?.depositFeatureEnabled || false;
  const depositOptional = mergedBusiness?.depositOptional || false;
  const defaultDepositRate = mergedBusiness?.defaultDepositRate || 0.5;
  const paymentGateway = mergedBusiness?.paymentGateway || null;
  const onlinePaymentsEnabled =
    Boolean(mergedBusiness?.onlinePaymentsEnabled) &&
    paymentGateway?.provider === "mercadopago";
  const allowReservationWithoutPayment =
    mergedBusiness?.id === "agendasmart-demo" && onlinePaymentsEnabled;
  const shouldUseOnlinePayment =
    onlinePaymentsEnabled &&
    !(allowReservationWithoutPayment && reserveWithoutPayment);
  const paymentMethods = mergedBusiness?.paymentMethods || [
    "transferencia",
    "efectivo",
    "debito",
  ];

  useEffect(() => {
    if (!service || !barber) return;

    const resourceServices = currentBusinessConfig?.servicesByResource?.[barber];

    if (resourceServices && !resourceServices.includes(service)) {
      setService("");
      setDate("");
      setTime("");
    }
  }, [barber, currentBusinessConfig, service]);

  const getServicePrices = (serviceName) => {
    return Array.from(String(serviceName || "").matchAll(/\$([\d\.]+)/g))
      .map((match) => Number(match[1].replace(/\./g, "")))
      .filter((price) => Number.isFinite(price) && price > 0);
  };

  const getServicePrice = (serviceName) => {
    const prices = getServicePrices(serviceName);

    return prices.length > 0 ? prices[prices.length - 1] : 0;
  };

  const getAppointmentTotalAmount = (appointment) => {
    const servicePrices = getServicePrices(appointment?.service);
    const customServicePrice =
      servicePrices.length > 1 ? servicePrices[servicePrices.length - 1] : 0;
    const storedTotal = Number(appointment?.total_amount || 0);

    if (customServicePrice > 0) {
      return customServicePrice;
    }

    if (storedTotal > 0) {
      return storedTotal;
    }

    return servicePrices.length > 0 ? servicePrices[0] : 0;
  };

  const getAppointmentPaidAmount = (appointment) => {
    const directPaidAmount = Number(
      appointment?.total_paid ??
        appointment?.totalPaid ??
        appointment?.paid_amount ??
        0
    );

    if (Number.isFinite(directPaidAmount) && directPaidAmount > 0) {
      return directPaidAmount;
    }

    const paymentStatus = String(appointment?.payment_status || "").toLowerCase();
    const totalAmount = getAppointmentTotalAmount(appointment);

    if (paymentStatus === "paid") {
      return totalAmount;
    }

    const requiredDepositAmount = Number(
      appointment?.required_deposit_amount || 0
    );

    if (
      ["deposit_paid", "partially_paid"].includes(paymentStatus) &&
      requiredDepositAmount > 0
    ) {
      return Math.min(requiredDepositAmount, totalAmount);
    }

    return 0;
  };

  const isAppointmentFullyPaid = (appointment) => {
    const totalAmount = getAppointmentTotalAmount(appointment);
    const paidAmount = getAppointmentPaidAmount(appointment);
    const paymentStatus = String(appointment?.payment_status || "").toLowerCase();

    return totalAmount > 0 && (paymentStatus === "paid" || paidAmount >= totalAmount);
  };

  const getEffectiveAppointmentPaymentStatus = (appointment) => {
    const currentStatus = String(
      appointment?.payment_status || "unpaid"
    ).toLowerCase();
    const totalAmount = getAppointmentTotalAmount(appointment);
    const paidAmount = getAppointmentPaidAmount(appointment);
    const depositRequired = Boolean(appointment?.deposit_required);
    const requiredDepositAmount = Number(
      appointment?.required_deposit_amount || 0
    );

    if (totalAmount > 0 && paidAmount >= totalAmount) {
      return "paid";
    }

    if (paidAmount > 0) {
      if (
        depositRequired &&
        requiredDepositAmount > 0 &&
        paidAmount < requiredDepositAmount
      ) {
        return "deposit_pending";
      }

      if (
        depositRequired &&
        requiredDepositAmount > 0 &&
        paidAmount === requiredDepositAmount
      ) {
        return "deposit_paid";
      }

      return "partially_paid";
    }

    return currentStatus || "unpaid";
  };

  const normalizeAppointmentPaymentState = (appointment) => {
    if (!appointment || !paymentsEnabled) return appointment;

    const paymentStatus = getEffectiveAppointmentPaymentStatus(appointment);
    const paidAmount = getAppointmentPaidAmount({
      ...appointment,
      payment_status: paymentStatus,
    });

    return {
      ...appointment,
      payment_status: paymentStatus,
      total_paid: paidAmount,
    };
  };

  const normalizeAppointmentsPaymentState = (items) => {
    return Array.isArray(items) ? items.map(normalizeAppointmentPaymentState) : [];
  };

  const applyPaymentSummaryToAppointment = (appointmentId, summary = {}) => {
    const hasPaymentStatus = typeof summary.paymentStatus === "string";
    const hasTotalPaid =
      summary.totalPaid !== undefined && summary.totalPaid !== null;

    if (!hasPaymentStatus && !hasTotalPaid) return;

    const patchAppointment = (appointment) => {
      if (!appointment || String(appointment.id) !== String(appointmentId)) {
        return appointment;
      }

      return normalizeAppointmentPaymentState({
        ...appointment,
        ...(hasPaymentStatus ? { payment_status: summary.paymentStatus } : {}),
        ...(hasTotalPaid ? { total_paid: Number(summary.totalPaid || 0) } : {}),
      });
    };

    setAppointments((currentAppointments) =>
      currentAppointments.map(patchAppointment)
    );
    setPaymentAppointment((currentAppointment) =>
      patchAppointment(currentAppointment)
    );
  };

  const timeToMinutes = (timeValue) => {
    const text = String(timeValue || "").slice(0, 5);
    const [hoursPart, minutesPart = "0"] = text.split(":");
    const parsedHours = Number(hoursPart);
    const parsedMinutes = Number(minutesPart);

    if (
      Number.isNaN(parsedHours) ||
      Number.isNaN(parsedMinutes) ||
      parsedHours < 0 ||
      parsedMinutes < 0
    ) {
      return null;
    }

    return parsedHours * 60 + parsedMinutes;
  };

  const normalizeScheduleTime = (hour) => {
    return typeof hour === "string"
      ? hour
      : `${String(hour).padStart(2, "0")}:00`;
  };

  const parseServiceDurationMinutes = (serviceName) => {
    const match = String(serviceName || "").match(/(\d+)\s*min/i);
    return match ? Number(match[1]) : null;
  };

  const getServiceDurationMinutes = (serviceName) => {
    return (
      parseServiceDurationMinutes(serviceName) ||
      (usesServiceDurations ? slotIntervalMinutes : 0)
    );
  };

  const rangesOverlap = (startA, endA, startB, endB) => {
    if ([startA, endA, startB, endB].some((value) => value === null)) {
      return false;
    }

    return startA < endB && startB < endA;
  };

  const getScheduleEndMinutes = (scheduleSlots = hours) => {
    if (!scheduleSlots.length) return null;

    const lastSlotMinutes = timeToMinutes(
      normalizeScheduleTime(scheduleSlots[scheduleSlots.length - 1])
    );
    return lastSlotMinutes === null ? null : lastSlotMinutes + slotIntervalMinutes;
  };

  const normalizeDateOnlyValue = (dateValue) => {
    if (dateValue instanceof Date) {
      return formatDateToInput(dateValue);
    }

    return String(dateValue || "").slice(0, 10);
  };

  const getScheduleBlockTimeRangeMinutes = (block) => {
    if (Boolean(block?.all_day)) {
      return {
        startMinutes: 0,
        endMinutes: 24 * 60,
      };
    }

    return {
      startMinutes: timeToMinutes(block?.start_time),
      endMinutes: timeToMinutes(block?.end_time),
    };
  };

  const scheduleBlockOverlapsRange = ({
    block,
    dateValue,
    startMinutes,
    endMinutes,
    resourceName = "",
  }) => {
    const slotDate = normalizeDateOnlyValue(dateValue);
    const blockStartDate = normalizeDateOnlyValue(block?.start_date);
    const blockEndDate = normalizeDateOnlyValue(block?.end_date);

    if (
      !slotDate ||
      !blockStartDate ||
      !blockEndDate ||
      slotDate < blockStartDate ||
      slotDate > blockEndDate
    ) {
      return false;
    }

    if (resourceName && block?.barber !== resourceName) {
      return false;
    }

    if (Boolean(block?.all_day)) {
      return true;
    }

    const {
      startMinutes: blockStartMinutes,
      endMinutes: blockEndMinutes,
    } = getScheduleBlockTimeRangeMinutes(block);

    return rangesOverlap(
      startMinutes,
      endMinutes,
      blockStartMinutes,
      blockEndMinutes
    );
  };

  const getBlocksForSlot = (day, hour, resourceName = "") => {
    const normalizedHour = normalizeScheduleTime(hour);
    const startMinutes = timeToMinutes(normalizedHour);
    const endMinutes =
      startMinutes === null ? null : startMinutes + slotIntervalMinutes;

    return scheduleBlocks.filter((block) =>
      scheduleBlockOverlapsRange({
        block,
        dateValue: day,
        startMinutes,
        endMinutes,
        resourceName,
      })
    );
  };

  const getBlocksForReservationCandidate = ({
    dateValue,
    resourceName,
    timeValue,
    serviceName,
  }) => {
    const startMinutes = timeToMinutes(timeValue);
    const durationMinutes = usesServiceDurations
      ? getServiceDurationMinutes(serviceName)
      : slotIntervalMinutes;
    const endMinutes =
      startMinutes === null ? null : startMinutes + durationMinutes;

    return scheduleBlocks.filter((block) =>
      scheduleBlockOverlapsRange({
        block,
        dateValue,
        startMinutes,
        endMinutes,
        resourceName,
      })
    );
  };

  const selectedPaymentTotal = selectedAppointmentPayments.reduce(
    (acc, payment) => acc + Number(payment.amount || 0),
    0
  );

  const selectedReservationTotal = getAppointmentTotalAmount(paymentAppointment);

  const selectedRequiredDeposit = Math.max(
    Number(paymentAppointment?.required_deposit_amount || 0),
    depositFeatureEnabled
      ? Math.round(selectedReservationTotal * defaultDepositRate)
      : 0
  );

  const selectedPendingBalance = Math.max(
    selectedReservationTotal - selectedPaymentTotal,
    0
  );

  const paymentStatusLabelMap = {
    unpaid: "Sin pago",
    deposit_pending: "Abono pendiente",
    deposit_paid: "Abono registrado",
    partially_paid: "Pago parcial",
    paid: "Pagado completo",
    cancelled: "Cancelado",
  };

  const effectivePaymentStatus =
  selectedPaymentTotal <= 0
    ? "unpaid"
    : selectedPaymentTotal >= selectedReservationTotal
    ? "paid"
    : depositFeatureEnabled && selectedPaymentTotal === selectedRequiredDeposit
    ? "deposit_paid"
    : "partially_paid";

  const selectedPaymentStatusLabel =
    paymentStatusLabelMap[effectivePaymentStatus] || "Sin estado";


  const formatCurrency = (value) => {
    return `$${Number(value || 0).toLocaleString("es-CL")}`;
  };

  const formatVoucherDate = (value) => {
    if (!value) return "Sin fecha";

    const [year, month, day] = String(value).slice(0, 10).split("-");
    const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));

    if (Number.isNaN(parsedDate.getTime())) {
      return String(value);
    }

    return parsedDate.toLocaleDateString("es-CL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getVoucherDurationLabel = (serviceName) => {
    const explicitDuration = String(serviceName || "").match(/(\d+)\s*min/i);

    if (explicitDuration) {
      return `${explicitDuration[1]} minutos`;
    }

    return "60 minutos";
  };

  const openReservationVoucher = ({
    appointment,
    clientName,
    serviceName,
    resourceName,
    reservationDate,
    reservationTime,
    totalAmount,
  }) => {
    const locationParts = [mergedBusiness?.address, mergedBusiness?.location].filter(Boolean);
    const isSportsBusiness = ["giocata", "pinguino-club"].includes(mergedBusiness?.id);
    const resourceLabel = mergedBusiness?.resourceLabelSingle || "Profesional";

    setReservationVoucher({
      id: appointment?.id || "",
      clientLabel: isSportsBusiness
        ? "Cliente / Equipo"
        : mergedBusiness?.clinicalRecordsEnabled
        ? "Paciente"
        : "Cliente",
      clientName: clientName || appointment?.name || "Cliente",
      service: serviceName || appointment?.service || "Reserva",
      resourceLabel,
      resource: resourceName || appointment?.barber || resourceLabel,
      dateLabel: formatVoucherDate(reservationDate || appointment?.date),
      timeLabel: String(reservationTime || appointment?.time || "").slice(0, 5),
      durationLabel: getVoucherDurationLabel(serviceName || appointment?.service),
      locationLabel: locationParts.join(", ") || "Ubicación por confirmar",
      priceLabel: formatCurrency(totalAmount || getAppointmentTotalAmount(appointment)),
      statusLabel: "Reserva registrada",
    });
  };
  const getReservationStatusMeta = (status) => {
    const normalized = String(status || "reservada").toLowerCase();

    if (normalized === "atendida") {
      return {
        label: "Atendida",
        icon: "ðŸŸ¢",
        background: "#dcfce7",
        border: "#86efac",
        color: "#166534",
      };
    }

    if (normalized === "no_asistio" || normalized === "no asistio") {
      return {
        label: "No asistió",
        icon: "ðŸ”´",
        background: "#fee2e2",
        border: "#fca5a5",
        color: "#991b1b",
      };
    }

    if (normalized === "cancelada" || normalized === "cancelled") {
      return {
        label: "Cancelada",
        icon: "⚪",
        background: "#f3f4f6",
        border: "#d1d5db",
        color: "#374151",
      };
    }

    return {
      label: "Reservada",
      icon: "ðŸŸ¡",
      background: "#fef3c7",
      border: "#fcd34d",
      color: "#92400e",
    };
  };

  const getPaymentStatusMeta = (paymentStatus) => {
    const normalized = String(paymentStatus || "unpaid").toLowerCase();

    if (normalized === "paid") {
      return {
        label: "Pagado completo",
        icon: "✅",
        background: "#dcfce7",
        border: "#86efac",
        color: "#166534",
      };
    }

    if (normalized === "partially_paid") {
      return {
        label: "Pago parcial",
        icon: "ðŸŸ¡",
        background: "#fef3c7",
        border: "#fcd34d",
        color: "#92400e",
      };
    }

    if (normalized === "deposit_paid") {
      return {
        label: "Abono registrado",
        icon: "ðŸŸ ",
        background: "#ffedd5",
        border: "#fdba74",
        color: "#9a3412",
      };
    }

    if (normalized === "deposit_pending") {
      return {
        label: "Abono pendiente",
        icon: "⏳",
        background: "#e0f2fe",
        border: "#7dd3fc",
        color: "#075985",
      };
    }

    if (normalized === "cancelled") {
      return {
        label: "Cancelado",
        icon: "⚪",
        background: "#f3f4f6",
        border: "#d1d5db",
        color: "#374151",
      };
    }

    return {
      label: "Sin pago",
      icon: "ðŸ”´",
      background: "#fee2e2",
      border: "#fca5a5",
      color: "#991b1b",
    };
  };

  const getPaymentMethodLabel = (method) => {
    const normalized = String(method || "").toLowerCase();

    if (normalized === "transferencia") return "Transferencia";
    if (normalized === "efectivo") return "Efectivo";
    if (normalized === "debito") return "Débito";
    if (normalized === "mercadopago") return "Mercado Pago";

    return method || "Método";
  };

  const getPaymentStageLabel = (stage) => {
    const normalized = String(stage || "").toLowerCase();

    if (normalized === "deposit") return "Abono";
    if (normalized === "balance") return "Saldo";
    if (normalized === "full") return "Pago completo";

    return stage || "Pago";
  };
  async function syncToGoogleSheets(payload) {
    try {
      await syncGoogleSheetsService({
        ...payload,
        businessId,
      });
    } catch (error) {
      if (error.response?.status === 401) {
        return;
      }

      console.error("Error guardando en Sheets:", error);
    }
  }


  useEffect(() => {
    const loadBusiness = async () => {
      setBusinessLoading(true);
      setBusinessError("");

      try {
        const res = await getBusinessBySlug(slug);
        const businessData = res.data;

        setBusiness(businessData);
        setBusinessId(businessData.id);
      } catch (error) {
        console.error("Error cargando negocio:", error);
        setBusinessError("No se pudo cargar el negocio.");
      } finally {
        setBusinessLoading(false);
      }
    };

    loadBusiness();
  }, [slug]);

  useEffect(() => {
    if (!slug) {
      document.title = "AgendaSmart";

      const favicon = document.querySelector("link[rel='icon']");
      if (favicon) {
        favicon.href = "/agendasmart/agendasmart-favicon.png";
      }

      return;
    }

    if (mergedBusiness) {
      document.title =
        mergedBusiness.tabTitle || mergedBusiness.name || "AgendaSmart";

      const favicon = document.querySelector("link[rel='icon']");
      const faviconHref =
        mergedBusiness.favicon ||
        mergedBusiness.logo ||
        "/agendasmart/agendasmart-favicon.png";

      if (favicon) {
        favicon.href = faviconHref;
      }
    }
  }, [slug, mergedBusiness]);

  const openWhatsappOrShowButton = (
    url,
    buttonText = "Abrir WhatsApp"
  ) => {
    if (!url || typeof window === "undefined") {
      return false;
    }

    const whatsappWindow = window.open(url, "_blank");
    const wasBlocked =
      !whatsappWindow ||
      whatsappWindow.closed ||
      typeof whatsappWindow.closed === "undefined";

    if (wasBlocked) {
      setWhatsappUrl(url);
      setWhatsappButtonText(buttonText);
      return false;
    }

    setWhatsappUrl("");
    setWhatsappButtonText("Abrir WhatsApp");
    return true;
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const paymentResult = params.get("payment_result");

    if (!paymentResult) return;

    const returnedAppointmentId = params.get("payment_appointment_id");
    const pendingWhatsappUrl = window.sessionStorage.getItem(
      "pendingPaymentWhatsappUrl"
    );
    const pendingAppointmentId = window.sessionStorage.getItem(
      "pendingPaymentAppointmentId"
    );
    const shouldShowWhatsappButton =
      pendingWhatsappUrl &&
      (!returnedAppointmentId ||
        !pendingAppointmentId ||
        returnedAppointmentId === pendingAppointmentId);

    if (paymentResult === "success") {
      if (shouldShowWhatsappButton) {
        const whatsappOpened = openWhatsappOrShowButton(
          pendingWhatsappUrl,
          "Enviar confirmacion por WhatsApp"
        );

        setMessage(
          whatsappOpened
            ? "Pago aprobado. Abrimos WhatsApp para enviar la confirmacion."
            : "Pago aprobado. Reserva registrada. Si WhatsApp no se abrio, usa el boton para enviar la confirmacion."
        );
      } else {
        setMessage("Pago aprobado. La reserva quedo registrada correctamente.");
      }
    } else if (paymentResult === "pending") {
      if (shouldShowWhatsappButton) {
        const whatsappOpened = openWhatsappOrShowButton(
          pendingWhatsappUrl,
          "Enviar confirmacion por WhatsApp"
        );

        setMessage(
          whatsappOpened
            ? "El pago quedo pendiente. Abrimos WhatsApp para enviar la confirmacion."
            : "El pago quedo pendiente. Si WhatsApp no se abrio, usa el boton para enviar la confirmacion."
        );
      } else {
        setMessage("El pago quedo pendiente. Revisaremos la confirmacion.");
      }
    } else {
      setMessage("El pago no fue completado. Puedes intentar nuevamente.");
    }

    window.sessionStorage.removeItem("pendingPaymentWhatsappUrl");
    window.sessionStorage.removeItem("pendingPaymentAppointmentId");

    params.delete("payment_result");
    params.delete("payment_appointment_id");
    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${
      nextSearch ? `?${nextSearch}` : ""
    }`;

    window.history.replaceState({}, "", nextUrl);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsCompactAdmin(window.innerWidth < 1180);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(selectedWeekStart, i));
  }, [selectedWeekStart]);

  const getAppointmentsDateRange = (shouldUseAdminRoute) => {
    if (shouldUseAdminRoute) {
      return {
        startDate: formatDateToInput(selectedWeekStart),
        endDate: formatDateToInput(addDays(selectedWeekStart, 6)),
      };
    }

    const today = new Date();
    const publicReservationDays = ["giocata", "pinguino-club"].includes(
      mergedBusiness?.id
    )
      ? 7
      : 14;

    return {
      startDate: formatDateToInput(today),
      endDate: formatDateToInput(addDays(today, publicReservationDays - 1)),
    };
  };

  useEffect(() => {
    if (weekDays.length > 0) {
      const stillExists = weekDays.some(
        (day) =>
          selectedMobileDay &&
          formatDateToInput(day) === formatDateToInput(selectedMobileDay)
      );

      if (!selectedMobileDay || !stillExists) {
        const today = new Date();
        const todayInCurrentWeek = weekDays.find(
          (day) => formatDateToInput(day) === formatDateToInput(today)
        );

        setSelectedMobileDay(todayInCurrentWeek || weekDays[0]);
      }
    }
  }, [weekDays, selectedMobileDay]);

  const getAppointments = async (mode = "auto") => {
    if (!businessId) return;

    setLoading(true);

    const shouldUseAdminRoute =
      mode === "admin"
        ? true
        : mode === "public"
        ? false
        : appMode === "admin" && isLoggedIn;

    try {
      const dateRange = getAppointmentsDateRange(shouldUseAdminRoute);

      const [appointmentsRes, scheduleBlocksRes] = shouldUseAdminRoute
        ? await Promise.all([
            getAdminAppointments(dateRange),
            getAdminScheduleBlocks(dateRange),
          ])
        : await Promise.all([
            fetchAppointments(businessId, dateRange),
            getScheduleBlocks(businessId, dateRange),
          ]);

      setAppointments(normalizeAppointmentsPaymentState(appointmentsRes.data));
      setScheduleBlocks(
        Array.isArray(scheduleBlocksRes.data) ? scheduleBlocksRes.data : []
      );
    } catch (err) {
      console.error(err);

      if (shouldUseAdminRoute && err.response?.status === 401) {
        localStorage.removeItem("user");
        localStorage.removeItem("authToken");
        setIsLoggedIn(false);
        setAppMode("client");
        setScheduleBlocks([]);
        setMessage("Tu sesion expiro. Inicia sesion nuevamente.");

        try {
          const publicDateRange = getAppointmentsDateRange(false);
          const [publicRes, publicBlocksRes] = await Promise.all([
            fetchAppointments(businessId, publicDateRange),
            getScheduleBlocks(businessId, publicDateRange),
          ]);

          setAppointments(normalizeAppointmentsPaymentState(publicRes.data));
          setScheduleBlocks(
            Array.isArray(publicBlocksRes.data) ? publicBlocksRes.data : []
          );
        } catch (publicErr) {
          console.error(publicErr);
          setMessage("Error al cargar reservas");
        }

        return;
      }

      setMessage("Error al cargar reservas");
    } finally {
      setLoading(false);
    }
  };

  const loadAppointmentPayments = async (appointmentId) => {
    if (!paymentsEnabled || !businessId || !appointmentId) return;

    setLoadingPayments(true);
    setPaymentPanelError("");

    try {
      const res = await getAppointmentPayments(appointmentId, businessId);
      setSelectedAppointmentPayments(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setSelectedAppointmentPayments([]);
      setPaymentPanelError(
        err.response?.data?.message || "No se pudieron cargar los pagos"
      );
    } finally {
      setLoadingPayments(false);
    }
  };

  const resetPaymentForm = () => {
  setEditingPaymentId(null);
  setPaymentAmount("");
  setPaymentMethod(paymentMethods[0] || "transferencia");
  setPaymentStage(depositFeatureEnabled ? "deposit" : "full");
  setPaymentNotes("");
};

const handleEditPaymentClick = (payment) => {
  setEditingPaymentId(payment.id);
  setPaymentAmount(String(Number(payment.amount || 0)));
  setPaymentMethod(payment.method || paymentMethods[0] || "transferencia");
  setPaymentStage(payment.payment_stage || (depositFeatureEnabled ? "deposit" : "full"));
  setPaymentNotes(payment.notes || "");
  setPaymentPanelError("");
};

const handleCancelPaymentEdit = () => {
  resetPaymentForm();
};

const handleSavePayment = async () => {
  if (!paymentAppointment?.id || !businessId) return;

  if (!paymentAmount || Number(paymentAmount) <= 0) {
    setMessage("Ingresa un monto válido para el pago");
    return;
  }

  try {
    let paymentResponse = null;

    if (editingPaymentId) {
      console.log("ENTRÓ A EDITAR PAGO", {
        editingPaymentId,
        paymentAppointmentId: paymentAppointment?.id,
        paymentAmount,
        paymentMethod,
        paymentStage,
        paymentNotes,
      });

      paymentResponse = await updateAppointmentPayment(paymentAppointment.id, editingPaymentId, {
        amount: Number(paymentAmount),
        method: paymentMethod,
        paymentStage,
        notes: paymentNotes || null,
        receiptUrl: null,
        businessId,
      });

      setMessage("Pago actualizado correctamente");
    } else {
      paymentResponse = await addAppointmentPayment(paymentAppointment.id, {
        amount: Number(paymentAmount),
        method: paymentMethod,
        paymentStage,
        notes: paymentNotes || null,
        businessId,
      });

      setMessage("Pago registrado correctamente");
    }

    resetPaymentForm();
    setPaymentPanelError("");

    applyPaymentSummaryToAppointment(paymentAppointment.id, paymentResponse?.data);
    await loadAppointmentPayments(paymentAppointment.id);
    await getAppointments();
  } catch (err) {
    console.error(err);
    setMessage(
      err.response?.data?.message ||
        (editingPaymentId ? "Error al actualizar pago" : "Error al registrar pago")
    );
  }
};

const handleDeletePayment = async (payment) => {
  if (!paymentAppointment?.id || !businessId || !payment?.id) return;

  const confirmed = window.confirm("¿Seguro que quieres eliminar este pago?");
  if (!confirmed) return;

  try {
    const paymentResponse = await deleteAppointmentPayment(
      paymentAppointment.id,
      payment.id,
      businessId
    );

    if (editingPaymentId === payment.id) {
      resetPaymentForm();
    }

    setPaymentPanelError("");
    setMessage("Pago eliminado correctamente");

    applyPaymentSummaryToAppointment(paymentAppointment.id, paymentResponse?.data);
    await loadAppointmentPayments(paymentAppointment.id);
    await getAppointments();
  } catch (err) {
    console.error(err);
    setMessage(err.response?.data?.message || "Error al eliminar pago");
  }
};

const closePaymentPanel = () => {
  setPaymentAppointment(null);
  setSelectedAppointmentPayments([]);
  setPaymentPanelError("");
  resetPaymentForm();
};


const handleReservationStatusFromPaymentPanel = async (nextStatus) => {
  if (!paymentAppointment?.id || !businessId || submitting) return;

  try {
    setSubmitting(true);
    setMessage("");

    const response = await updateAppointmentService(paymentAppointment.id, {
      name: paymentAppointment.name || "",
      phone: paymentAppointment.phone || "",
      date: paymentAppointment.date
        ? String(paymentAppointment.date).slice(0, 10)
        : "",
      time: String(paymentAppointment.time || "").slice(0, 5),
      service: paymentAppointment.service || "",
      barber: paymentAppointment.barber || "",
      businessId,
      status: nextStatus,
      totalAmount: getAppointmentTotalAmount(paymentAppointment),
      depositRequired: Boolean(paymentAppointment.deposit_required),
      requiredDepositAmount: Number(
        paymentAppointment.required_deposit_amount || 0
      ),
      paymentStatus: effectivePaymentStatus || paymentAppointment.payment_status || "unpaid",
      depositReceiptUrl: paymentAppointment.deposit_receipt_url || null,
      notes: paymentAppointment.notes || null,
      needsOpponent: Boolean(paymentAppointment.needs_opponent),
      opponentName: paymentAppointment.opponent_name || null,
      opponentPhone: paymentAppointment.opponent_phone || null,
    });

    const updatedAppointment = response?.data?.data || {
      ...paymentAppointment,
      status: nextStatus,
    };

    await syncToGoogleSheets({
      id: paymentAppointment.id,
      date: paymentAppointment.date,
      time: paymentAppointment.time,
      name: paymentAppointment.name,
      phone: paymentAppointment.phone || "",
      barber: paymentAppointment.barber,
      service: paymentAppointment.service,
      status: nextStatus,
    });

    setPaymentAppointment(updatedAppointment);
    setMessage(
      nextStatus === "atendida"
        ? "Reserva marcada como atendida ✅"
        : "Reserva marcada como no asistió ❌"
    );

    await getAppointments();
  } catch (err) {
    console.error(err);
    setMessage("Error al actualizar estado de la reserva");
  } finally {
    setSubmitting(false);
  }
};

const handleEditReservationFromPaymentPanel = () => {
  if (!paymentAppointment) return;
  editAppointment(paymentAppointment);
};

const handleDeleteReservationFromPaymentPanel = async () => {
  if (!paymentAppointment?.id || !businessId || submitting) return;

  const confirmed = window.confirm("¿Seguro que quieres eliminar esta reserva?");
  if (!confirmed) return;

  try {
    setSubmitting(true);
    await deleteAppointmentService(paymentAppointment.id, businessId);
    closePaymentPanel();
    setMessage("Reserva eliminada correctamente ✅");
    await getAppointments();
  } catch (err) {
    console.error(err);
    setMessage(err.response?.data?.message || "Error al eliminar reserva");
  } finally {
    setSubmitting(false);
  }
};
  useEffect(() => {
  if (paymentAppointment) {
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = "";
  }

  return () => {
    document.body.style.overflow = "";
  };
}, [paymentAppointment]);

  useEffect(() => {
    if (!businessId) return;

    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);

        if (!parsedUser.business_id || parsedUser.business_id === businessId) {
          const savedResourceName = mergedBusiness?.professionalSessionsEnabled
            ? String(parsedUser.resource_name || "").trim()
            : "";

          setCurrentUser(parsedUser);
          setIsLoggedIn(true);
          setAppMode("admin");
          setBarber(savedResourceName);
          setWeeklyBarberFilter(savedResourceName);
          getAppointments("admin");
        } else {
          setCurrentUser(null);
          setWeeklyBarberFilter("");
          localStorage.removeItem("user");
          getAppointments("public");
        }
      } catch {
        setCurrentUser(null);
        setWeeklyBarberFilter("");
        localStorage.removeItem("user");
        getAppointments("public");
      }
    } else {
      setCurrentUser(null);
      setWeeklyBarberFilter("");
      getAppointments("public");
    }

  }, [
    businessId,
    selectedWeekStart,
    mergedBusiness?.id,
    mergedBusiness?.professionalSessionsEnabled,
  ]);

  useEffect(() => {
    if (!isLoggedIn || appMode !== "admin" || !businessId || editingId) {
      setClientSuggestions([]);
      setLoadingClientSuggestions(false);
      setClientSuggestionQuery("");
      setClientSuggestionError("");
      return undefined;
    }

    const searchValue = `${name} ${phone}`.trim();
    setClientSuggestionQuery(searchValue);

    if (searchValue.length < 2) {
      setClientSuggestions([]);
      setLoadingClientSuggestions(false);
      setClientSuggestionError("");
      return undefined;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        setLoadingClientSuggestions(true);
        setClientSuggestionError("");
        const response = await getAdminClientSuggestions({ search: searchValue });

        if (!cancelled) {
          setClientSuggestions(Array.isArray(response.data) ? response.data : []);
        }
      } catch (error) {
        console.error("Error al buscar clientes para autorrelleno", error);
        if (!cancelled) {
          setClientSuggestions([]);
          setClientSuggestionError("No se pudo consultar clientes guardados");
        }
      } finally {
        if (!cancelled) {
          setLoadingClientSuggestions(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [appMode, businessId, editingId, isLoggedIn, name, phone]);

  const handleClientSuggestionSelect = (client) => {
    if (!client) return;

    setName(client.name || "");
    setPhone(client.phone || "");
    setClientRut(client.clientRut || "");
    setClientEmail(client.clientEmail || "");
    setClientSuggestions([]);
  };
  const resetForm = () => {
    setName("");
    setPhone("");
    setClientRut("");
    setClientEmail("");
    setDate("");
    setTime("");
    setService("");
    setBarber(
      mergedBusiness?.professionalSessionsEnabled
        ? String(currentUser?.resource_name || "").trim()
        : ""
    );
    setCustomServiceName("");
setCustomServicePrice("");

setNeedsOpponent(false);
setOpponentName("");
setOpponentPhone("");
setIsMonthlyReservation(false);
setReserveWithoutPayment(false);
setWhatsappButtonText("Abrir WhatsApp");

setEditingId(null);
    setSelectedAppointmentPayments([]);
    setPaymentAmount("");
    setPaymentMethod(paymentMethods[0] || "transferencia");
    setPaymentStage(depositFeatureEnabled ? "deposit" : "full");
    setPaymentNotes("");
    setEditingPaymentId(null);
    setPaymentAppointment(null);
    setPaymentPanelError("");
  };

  const getResourceFromService = (serviceName) => {
    if (!serviceName) return "";

    const match = String(serviceName).match(/Cancha\s+\d+/i);
    return match ? match[0] : "";
  };

  const getResolvedClientResource = () => {
    if (mergedBusiness?.hideResourceSelector) {
      return getResourceFromService(service) || barber;
    }

    return barber;
  };

  const normalizeChilePhone = (rawPhone) => {
    const digits = String(rawPhone || "").replace(/\D/g, "");

    if (!digits) return "";

    if (digits.startsWith("569") && digits.length === 11) {
      return digits;
    }

    if (digits.startsWith("56") && digits.length === 11) {
      return digits;
    }

    if (digits.startsWith("9") && digits.length === 9) {
      return `56${digits}`;
    }

    if (digits.length === 8) {
      return `569${digits}`;
    }

    return digits;
  };

  const isValidChileMobilePhone = (rawPhone) => {
    const normalized = normalizeChilePhone(rawPhone);
    return /^569\d{8}$/.test(normalized);
  };

  const isValidEmail = (value) => {
    const email = String(value || "").trim();

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const createAppointment = async () => {
    if (submitting || !businessId) return;

    const resolvedBarber = mergedBusiness?.hideResourceSelector
      ? barber || getResourceFromService(service)
      : barber;

    if (
      !name.trim() ||
      !phone.trim() ||
      !date ||
      !time ||
      !service.trim() ||
      !resolvedBarber
    ) {
      setMessage("Completa todos los campos para reservar.");
      return;
    }

    if (!isValidChileMobilePhone(phone)) {
      setMessage("Ingresa un celular chileno válido. Ejemplo: 912345678");
      return;
    }

    if (clinicalRecordsEnabled && !clientRut.trim()) {
      setMessage("Ingresa el RUT del paciente.");
      return;
    }

    if (clinicalRecordsEnabled && !isValidEmail(clientEmail)) {
      setMessage("Ingresa un correo valido del paciente.");
      return;
    }

    setSubmitting(true);
    setMessage("");
    setWhatsappUrl("");

    const normalizedPhone = normalizeChilePhone(phone);

    try {
  const isSportsBusiness = ["giocata", "pinguino-club"].includes(
    mergedBusiness?.id
  );

  const openOpponentAppointment = isSportsBusiness
    ? appointments.find((appointment) => {
        const appointmentDate = String(appointment.date || "").slice(0, 10);
        const appointmentTime = String(appointment.time || "").slice(0, 5);

        return (
          appointmentDate === date &&
          appointmentTime === String(time || "").slice(0, 5) &&
          appointment.barber === resolvedBarber &&
          Boolean(appointment.needs_opponent)
        );
      })
    : null;

  if (openOpponentAppointment) {
  await joinOpponentAppointment(openOpponentAppointment.id, {
    businessId,
    opponentName: name.trim(),
    opponentPhone: normalizedPhone,
  });

    const barberPhone = BARBER_PHONES[resolvedBarber] || "";

const generatedOpponentWhatsappUrl = barberPhone
  ? buildOpponentWhatsappUrl({
      barberPhone,
      teamOneName: openOpponentAppointment.name,
      teamOnePhone: openOpponentAppointment.phone,
      opponentName: name.trim(),
      opponentPhone: normalizedPhone,
      date,
      time,
      service: openOpponentAppointment.service || service.trim(),
      barber: resolvedBarber,
      business: mergedBusiness,
    })
  : "";

if (generatedOpponentWhatsappUrl) {
  openWhatsappOrShowButton(generatedOpponentWhatsappUrl, "Abrir WhatsApp");
}

    await syncToGoogleSheets({
      id: openOpponentAppointment.id,
      date,
      time,
      name: `${openOpponentAppointment.name || "Equipo 1"} vs ${name.trim()}`,
      phone: openOpponentAppointment.phone || "",
      barber: resolvedBarber,
      service: openOpponentAppointment.service || service.trim(),
      status: openOpponentAppointment.status || "reservada",
    });

    setSelectedWeekStart(getMonday(new Date()));
    await getAppointments();

    setMessage(`✅ Te sumaste como rival correctamente

ðŸ“… ${date} a las ${time}
${mergedBusiness?.resourceLabelSingle || "Cancha"}: ${resolvedBarber}

⚽ Partido completado`);

    resetForm();
    return;
  }

  const finalService = service.trim();
const finalTotalAmount = getServicePrice(finalService) || 0;

const createdAppointment = await createAppointmentService({
  name: name.trim(),
  phone: normalizedPhone,
  clientRut: clinicalRecordsEnabled ? clientRut.trim() : null,
  clientEmail: clinicalRecordsEnabled
    ? clientEmail.trim().toLowerCase()
    : null,
  date,
  time,
  service: finalService,
  barber: resolvedBarber,
  businessId,
  status: "reservada",

  totalAmount: finalTotalAmount,
  depositRequired: false,
  requiredDepositAmount: 0,
  paymentStatus: "unpaid",
  depositReceiptUrl: null,
  notes: null,

  needsOpponent,
  opponentName: opponentName.trim() || null,
  opponentPhone: opponentPhone.trim()
    ? normalizeChilePhone(opponentPhone)
    : null,
});

      const barberPhone = BARBER_PHONES[resolvedBarber] || "";

const generatedWhatsappUrl = barberPhone
  ? buildBarberWhatsappUrl({
      barberPhone,
      name: name.trim(),
      phone: normalizedPhone,
      date,
      time,
      service: finalService,
      barber: resolvedBarber,
      business: mergedBusiness,
      needsOpponent,
    })
  : "";

      await syncToGoogleSheets({
        id: createdAppointment.data.data.id,
        date,
        time,
        name: name.trim(),
        phone: normalizedPhone,
        barber: resolvedBarber,
        service: finalService,
        status: "reservada",
      });

      setSelectedWeekStart(getMonday(new Date()));
      await getAppointments();

      openReservationVoucher({
        appointment: createdAppointment?.data?.data,
        clientName: name.trim(),
        serviceName: finalService,
        resourceName: resolvedBarber,
        reservationDate: date,
        reservationTime: time,
        totalAmount: finalTotalAmount,
      });
      if (shouldUseOnlinePayment) {
        const response = await createMercadoPagoPreference({
          appointmentId: createdAppointment.data.data.id,
          businessId,
          returnUrl:
            typeof window !== "undefined"
              ? `${window.location.origin}${window.location.pathname}`
              : undefined,
        });

        const checkoutUrl =
          response.data?.checkoutUrl ||
          response.data?.initPoint ||
          response.data?.sandboxInitPoint;

        if (!checkoutUrl) {
          setMessage("Reserva creada, pero no se pudo iniciar el pago online.");
          return;
        }

        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem("pendingPaymentWhatsappUrl");
          window.sessionStorage.removeItem("pendingPaymentAppointmentId");
        }

        if (generatedWhatsappUrl && typeof window !== "undefined") {
          window.sessionStorage.setItem(
            "pendingPaymentWhatsappUrl",
            generatedWhatsappUrl
          );
          window.sessionStorage.setItem(
            "pendingPaymentAppointmentId",
            String(createdAppointment.data.data.id)
          );
        }

        setMessage("Reserva creada. Te estamos llevando a Mercado Pago...");
        window.location.href = checkoutUrl;
        return;
      }

      if (generatedWhatsappUrl) {
        const whatsappOpened = openWhatsappOrShowButton(
          generatedWhatsappUrl,
          "Abrir WhatsApp"
        );

        if (!whatsappOpened) {
          setMessage(`${
            mergedBusiness?.submitButtonLabel || "Reserva"
          } registrada correctamente

Fecha: ${date}
Hora: ${time}
${mergedBusiness?.resourceLabelSingle || "Recurso"}: ${resolvedBarber}

${mergedBusiness?.whatsappLabel || "Confirma por WhatsApp"}`);
        } else {
          setMessage(`${
            mergedBusiness?.submitButtonLabel || "Reserva"
          } registrada correctamente

Fecha: ${date}
Hora: ${time}
${mergedBusiness?.resourceLabelSingle || "Recurso"}: ${resolvedBarber}`);
        }
      } else {
        setMessage(`${
          mergedBusiness?.submitButtonLabel || "Reserva"
        } registrada correctamente

Fecha: ${date}
Hora: ${time}
${mergedBusiness?.resourceLabelSingle || "Recurso"}: ${resolvedBarber}`);
      }
      resetForm();
    } catch (err) {
      if (err.response?.data?.message) {
        setMessage(err.response.data.message);
      } else {
        setMessage("Error al crear reserva");
      }
    } finally {
      setSubmitting(false);
    }
  };


  const createMonthlyAppointment = async () => {
    if (submitting || !businessId) return;

    const isSportsBusiness = ["giocata", "pinguino-club"].includes(
      mergedBusiness?.id
    );

    if (!isSportsBusiness) {
      setMessage("La reserva mensual solo está disponible para negocios deportivos.");
      return;
    }

    if (editingId) {
      setMessage("Termina o cancela la edición antes de crear una reserva mensual.");
      return;
    }

    const resolvedBarber = mergedBusiness?.hideResourceSelector
      ? barber || getResourceFromService(service)
      : barber;

    if (
      !name.trim() ||
      !phone.trim() ||
      !date ||
      !time ||
      !service.trim() ||
      !resolvedBarber
    ) {
      setMessage("Completa todos los campos para crear la reserva mensual.");
      return;
    }

    if (!isValidChileMobilePhone(phone)) {
      setMessage("Ingresa un celular chileno válido. Ejemplo: 912345678");
      return;
    }

    if (opponentPhone.trim() && !isValidChileMobilePhone(opponentPhone)) {
      setMessage("Ingresa un celular chileno válido para el rival.");
      return;
    }

    const confirmed = window.confirm(
      `Se crearán reservas semanales durante un mes para ${resolvedBarber}, todos los mismos días a las ${time}.\n\nSi alguna fecha está ocupada, no se creará ninguna reserva mensual.\n\n¿Quieres continuar?`
    );

    if (!confirmed) return;

    setSubmitting(true);
    setMessage("");
    setWhatsappUrl("");

    const normalizedPhone = normalizeChilePhone(phone);

    try {
      const finalService = service.trim();
      const finalTotalAmount = getServicePrice(finalService) || 0;

      const response = await createMonthlyAppointmentService({
        name: name.trim(),
        phone: normalizedPhone,
        date,
        time,
        service: finalService,
        barber: resolvedBarber,
        businessId,
        status: "reservada",

        totalAmount: finalTotalAmount,
        depositRequired: false,
        requiredDepositAmount: 0,
        paymentStatus: "unpaid",
        depositReceiptUrl: null,
        notes: null,

        needsOpponent,
        opponentName: opponentName.trim() || null,
        opponentPhone: opponentPhone.trim()
          ? normalizeChilePhone(opponentPhone)
          : null,
      });

      const createdAppointments = Array.isArray(response?.data?.data)
        ? response.data.data
        : [];

      for (const appointment of createdAppointments) {
        await syncToGoogleSheets({
          id: appointment.id,
          date: String(appointment.date || "").slice(0, 10),
          time: String(appointment.time || "").slice(0, 5),
          name: appointment.name || name.trim(),
          phone: appointment.phone || normalizedPhone,
          barber: appointment.barber || resolvedBarber,
          service: appointment.service || finalService,
          status: appointment.status || "reservada",
        });
      }

      const monthlyDates = createdAppointments.length
        ? createdAppointments.map((appointment) =>
            String(appointment.date || "").slice(0, 10)
          )
        : Array.isArray(response?.data?.dates)
        ? response.data.dates
        : [];

      const selectedDate = new Date(`${date}T00:00:00`);
      setSelectedWeekStart(getMonday(selectedDate));
      setSelectedMobileDay(selectedDate);

      await getAppointments("admin");

      setMessage(`✅ Reserva mensual creada correctamente

${
        response?.data?.totalCreated || createdAppointments.length
      } reservas creadas para ${resolvedBarber}:
• ${monthlyDates.join("\n• ")}`);

      resetForm();
    } catch (err) {
      console.error(err);

      if (err.response?.status === 409 && Array.isArray(err.response?.data?.conflicts)) {
        const conflictsText = err.response.data.conflicts
          .map((conflict) => {
            const conflictDate = String(conflict.date || "").slice(0, 10);
            const conflictTime = String(conflict.time || "").slice(0, 5);
            const conflictClient = conflict.name || "Reserva existente";

            return `• ${conflictDate} ${conflictTime} - ${conflictClient}`;
          })
          .join("\n");

        setMessage(`⚠️ No se pudo crear la reserva mensual porque hay horarios ocupados:\n\n${conflictsText}`);
      } else if (err.response?.data?.message) {
        setMessage(err.response.data.message);
      } else {
        setMessage("Error al crear reserva mensual");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const updateAppointment = async () => {
    if (submitting || !editingId || !businessId) return;

    if (
      !name.trim() ||
      !phone.trim() ||
      !date ||
      !time ||
      !service.trim() ||
      !barber
    ) {
      setMessage("Completa todos los campos para actualizar.");
      return;
    }

    if (!isValidChileMobilePhone(phone)) {
      setMessage("Ingresa un celular chileno válido. Ejemplo: 912345678");
      return;
    }

    if (clinicalRecordsEnabled && clientEmail.trim() && !isValidEmail(clientEmail)) {
      setMessage("Ingresa un correo valido del paciente.");
      return;
    }

    setSubmitting(true);
    setMessage("");
    setWhatsappUrl("");

    const normalizedPhone = normalizeChilePhone(phone);

    try {
     const finalService = service.trim();
const finalTotalAmount = getServicePrice(finalService) || 0;
const currentAppointment = appointments.find((a) => a.id === editingId);

await updateAppointmentService(editingId, {
  name: name.trim(),
  phone: normalizedPhone,
  clientRut: clinicalRecordsEnabled ? clientRut.trim() || null : null,
  clientEmail: clinicalRecordsEnabled
    ? clientEmail.trim().toLowerCase() || null
    : null,
  date,
  time,
  service: finalService,
  barber,
  businessId,
  status: currentAppointment?.status || "reservada",

  totalAmount: finalTotalAmount,
  depositRequired: Boolean(currentAppointment?.deposit_required),
  requiredDepositAmount:
    Number(currentAppointment?.required_deposit_amount || 0),
  paymentStatus: currentAppointment?.payment_status || "unpaid",
  depositReceiptUrl: currentAppointment?.deposit_receipt_url || null,
  notes: currentAppointment?.notes || null,

  needsOpponent,
  opponentName: opponentName.trim() || null,
  opponentPhone: opponentPhone.trim()
    ? normalizeChilePhone(opponentPhone)
    : null,
});

      await syncToGoogleSheets({
        id: editingId,
        date,
        time,
        name: name.trim(),
        phone: normalizedPhone,
        barber,
        service: finalService,
        status:
          appointments.find((a) => a.id === editingId)?.status || "reservada",
      });

      resetForm();
      setMessage("Reserva actualizada correctamente ✅");
      await getAppointments();
    } catch (err) {
      if (err.response?.data?.message) {
        setMessage(err.response.data.message);
      } else {
        setMessage("Error al actualizar reserva");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const deleteAppointment = async (id) => {
    if (submitting || !businessId) return;

    const confirmed = window.confirm("¿Seguro que quieres eliminar esta reserva?");
    if (!confirmed) return;

    setSubmitting(true);

    try {
      await deleteAppointmentService(id, businessId);
      setMessage("Reserva eliminada correctamente ✅");
      await getAppointments();
    } catch (err) {
      console.error(err);
      if (err.response?.data?.message) {
        setMessage(err.response.data.message);
      } else {
        setMessage("Error al eliminar reserva");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const buildReservationStatusUpdatePayload = (appointment, nextStatus) => {
    return {
      name: appointment.name || "",
      phone: appointment.phone || "",
      date: appointment.date ? String(appointment.date).slice(0, 10) : "",
      time: String(appointment.time || "").slice(0, 5),
      service: appointment.service || "",
      barber: appointment.barber || "",
      businessId,
      status: nextStatus,
      totalAmount: getAppointmentTotalAmount(appointment),
      depositRequired: Boolean(appointment.deposit_required),
      requiredDepositAmount: Number(appointment.required_deposit_amount || 0),
      paymentStatus: appointment.payment_status || "unpaid",
      depositReceiptUrl: appointment.deposit_receipt_url || null,
      notes: appointment.notes || null,
      needsOpponent: Boolean(appointment.needs_opponent),
      opponentName: appointment.opponent_name || null,
      opponentPhone: appointment.opponent_phone || null,
    };
  };

  const markAppointmentAsAttended = async (appointment) => {
    if (submitting || !businessId) return;

    try {
      setSubmitting(true);
      setMessage("");
      setWhatsappUrl("");

      await updateAppointmentService(
        appointment.id,
        buildReservationStatusUpdatePayload(appointment, "atendida")
      );

      await syncToGoogleSheets({
        id: appointment.id,
        date: appointment.date,
        time: appointment.time,
        name: appointment.name,
        phone: appointment.phone || "",
        barber: appointment.barber,
        service: appointment.service,
        status: "atendida",
      });

      setMessage("Reserva marcada como atendida ✅");
      await getAppointments();
    } catch (err) {
      console.error(err);
      setMessage("Error al marcar reserva como atendida");
    } finally {
      setSubmitting(false);
    }
  };

  const markAppointmentAsNoShow = async (appointment) => {
    if (submitting || !businessId) return;

    try {
      setSubmitting(true);
      setMessage("");
      setWhatsappUrl("");

      await updateAppointmentService(
        appointment.id,
        buildReservationStatusUpdatePayload(appointment, "no_asistio")
      );

      await syncToGoogleSheets({
        id: appointment.id,
        date: appointment.date,
        time: appointment.time,
        name: appointment.name,
        phone: appointment.phone || "",
        barber: appointment.barber,
        service: appointment.service,
        status: "no_asistio",
      });

      setMessage("Reserva marcada como no asistió ❌");
      await getAppointments();
    } catch (err) {
      console.error(err);
      setMessage("Error al marcar reserva como no asistió");
    } finally {
      setSubmitting(false);
    }
  };

  const editAppointment = (appointment) => {
    setName(appointment.name || "");
    setPhone(appointment.phone || "");
    setClientRut(appointment.client_rut || "");
    setClientEmail(appointment.client_email || "");
    setDate(String(appointment.date || "").slice(0, 10));
    setTime(String(appointment.time || "").slice(0, 5));
    setService(appointment.service || "");
setBarber(appointment.barber || "");

setNeedsOpponent(Boolean(appointment.needs_opponent));
setOpponentName(appointment.opponent_name || "");
setOpponentPhone(appointment.opponent_phone || "");
setIsMonthlyReservation(false);

setEditingId(appointment.id);
    setPaymentAppointment(null);
    setMessage("Editando reserva ✏️");
    setWhatsappUrl("");
    setPaymentPanelError("");
    setSelectedAppointmentPayments([]);

    if (appointment.date) {
      const appointmentDate = new Date(
        String(appointment.date).slice(0, 10) + "T00:00:00"
      );
      setSelectedWeekStart(getMonday(appointmentDate));
      setSelectedMobileDay(appointmentDate);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openPaymentPanel = async (appointment) => {
    setPaymentAppointment(appointment);
    setEditingId(null);
    setMessage("");
    setWhatsappUrl("");
    setPaymentPanelError("");

    setPaymentAmount("");
    setPaymentMethod(paymentMethods[0] || "transferencia");
    setPaymentStage(depositFeatureEnabled ? "deposit" : "full");
    setPaymentNotes("");
    setEditingPaymentId(null);

    if (paymentsEnabled) {
      await loadAppointmentPayments(appointment.id);
    } else {
      setSelectedAppointmentPayments([]);
    }
  };

 const selectSlot = (day, hour, selectedResource = "") => {
  const scopedProfessionalResourceName = mergedBusiness?.professionalSessionsEnabled
    ? String(currentUser?.resource_name || "").trim()
    : "";
  const resolvedSelectedResource =
    selectedResource || (!isClientMode ? scopedProfessionalResourceName : "");

  setDate(formatDateToInput(day));

  if (typeof hour === "string") {
    setTime(hour);
  } else {
    setTime(`${String(hour).padStart(2, "0")}:00`);
  }

  if (resolvedSelectedResource) {
    setBarber(resolvedSelectedResource);

    if (mergedBusiness?.hideResourceSelector) {
      const normalizeText = (value) =>
        String(value || "")
          .toLowerCase()
          .replace(/^c(\d+)$/, "cancha $1")
          .replace(/\s+/g, " ")
          .trim();

      const normalizedResource = normalizeText(resolvedSelectedResource);

      const matchedService = SERVICES.find((serviceOption) =>
        normalizeText(serviceOption).includes(normalizedResource)
      );

      if (matchedService) {
        setService(matchedService);
      }
    }
  }

  setEditingId(null);
  setMessage(
    resolvedSelectedResource
      ? `Bloque seleccionado: ${resolvedSelectedResource}`
      : "Bloque horario seleccionado."
  );
  setWhatsappUrl("");
};

  const handleLogin = async () => {
    if (loggingIn || !businessId) return;

    if (!username.trim() || !password.trim()) {
      setLoginError("Ingresa usuario y contraseña");
      return;
    }

    setLoggingIn(true);
    setLoginError("");

    try {
      const res = await loginUser({
        username: username.trim(),
        password,
        businessId,
      });

      const loggedUser = res.data.user;

      if (!loggedUser) {
        setLoginError("No se recibio usuario desde el backend.");
        setLoggingIn(false);
        return;
      }

      if (loggedUser.business_id && loggedUser.business_id !== businessId) {
        setLoginError("Este usuario no pertenece a este negocio");
        setLoggingIn(false);
        return;
      }

      setIsLoggedIn(true);
      setCurrentUser(loggedUser);
      setLoginError("");
      setAppMode("admin");
      const loginResourceName = mergedBusiness?.professionalSessionsEnabled
        ? String(loggedUser.resource_name || "").trim()
        : "";
      setBarber(loginResourceName);
      setWeeklyBarberFilter(loginResourceName);
      localStorage.setItem("user", JSON.stringify(loggedUser));

      if (res.data?.token) {
        localStorage.setItem("authToken", res.data.token);
      } else {
        localStorage.removeItem("authToken");
      }

      await getAppointments("admin");
    } catch (err) {
      if (err.response?.data?.message) {
        setLoginError(err.response.data.message);
      } else {
        setLoginError("Error al iniciar sesión");
      }
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error(err);
    }

    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
    setIsLoggedIn(false);
    setCurrentUser(null);
    setUsername("");
    setPassword("");
    setLoginError("");
    setWeeklyBarberFilter("");
    setAppMode("client");

    await getAppointments("public");
  };

  const getBarberColors = (barberName) => {
    if (mergedBusiness?.id === "giocata") {
      return {
        backgroundColor: theme.primary || "#166534",
        border: `1px solid ${theme.primaryDark || "#14532d"}`,
      };
    }

    switch (barberName) {
      case "James":
        return {
          backgroundColor: "#dbeafe",
          border: "1px solid #60a5fa",
        };
      case "Jesús":
        return {
          backgroundColor: "#dcfce7",
          border: "1px solid #4ade80",
        };
      default:
        return {
          backgroundColor: "#e5e7eb",
          border: "1px solid #d1d5db",
        };
    }
  };

  const goToPreviousWeek = () => {
    setSelectedWeekStart((prev) => addDays(prev, -7));
  };

  const goToNextWeek = () => {
    setSelectedWeekStart((prev) => addDays(prev, 7));
  };

  const goToCurrentWeek = () => {
    const today = new Date();
    const currentMonday = getMonday(today);
    setSelectedWeekStart(currentMonday);
    setSelectedMobileDay(today);
  };

  const isClientMode = appMode === "client";
  const isAdminMode = appMode === "admin" && isLoggedIn;
  const clinicalRecordsEnabled = Boolean(mergedBusiness?.clinicalRecordsEnabled);
  const professionalSessionsEnabled = Boolean(
    mergedBusiness?.professionalSessionsEnabled
  );
  const professionalResourceName = isAdminMode
    ? professionalSessionsEnabled
      ? String(currentUser?.resource_name || "").trim()
      : ""
    : "";
  const isProfessionalSession = Boolean(professionalResourceName);
  const currentUsername = String(currentUser?.username || "")
    .trim()
    .toLowerCase();
  const dailyDashboardOwnerUsersByBusiness = {
    giocata: ["veronica_giocata", "admin_giocata"],
  };
  const dailyDashboardOwnerUsers =
    dailyDashboardOwnerUsersByBusiness[mergedBusiness?.id] || null;
  const dailyDashboardEnabled =
    isAdminMode &&
    (!dailyDashboardOwnerUsers ||
      dailyDashboardOwnerUsers.includes(currentUsername));
  const adminBarbers = isProfessionalSession ? [professionalResourceName] : BARBERS;
  const scheduleBlockingEnabled =
    professionalSessionsEnabled && adminBarbers.length > 0;
  const effectiveWeeklyBarberFilter = isProfessionalSession
    ? professionalResourceName
    : weeklyBarberFilter;

  useEffect(() => {
    if (!isProfessionalSession) return;

    setBarber(professionalResourceName);
    setWeeklyBarberFilter(professionalResourceName);
    setBlockResource(professionalResourceName);
  }, [isProfessionalSession, professionalResourceName]);

  useEffect(() => {
    if (isProfessionalSession) return;
    if (blockResource || adminBarbers.length === 0) return;

    setBlockResource(adminBarbers[0]);
  }, [adminBarbers, blockResource, isProfessionalSession]);

  const visibleScheduleBlocks = useMemo(() => {
    const weekStart = formatDateToInput(selectedWeekStart);
    const weekEnd = formatDateToInput(addDays(selectedWeekStart, 6));

    return scheduleBlocks
      .filter((block) => {
        const blockStart = normalizeDateOnlyValue(block.start_date);
        const blockEnd = normalizeDateOnlyValue(block.end_date);

        if (blockEnd < weekStart || blockStart > weekEnd) return false;
        if (effectiveWeeklyBarberFilter) {
          return block.barber === effectiveWeeklyBarberFilter;
        }

        return true;
      })
      .sort((firstBlock, secondBlock) => {
        const firstValue = `${normalizeDateOnlyValue(
          firstBlock.start_date
        )} ${String(firstBlock.start_time || "00:00").slice(0, 5)} ${
          firstBlock.barber || ""
        }`;
        const secondValue = `${normalizeDateOnlyValue(
          secondBlock.start_date
        )} ${String(secondBlock.start_time || "00:00").slice(0, 5)} ${
          secondBlock.barber || ""
        }`;

        return firstValue.localeCompare(secondValue);
      });
  }, [
    scheduleBlocks,
    selectedWeekStart,
    effectiveWeeklyBarberFilter,
  ]);

  const resetScheduleBlockForm = () => {
    setBlockStartDate(formatDateToInput(new Date()));
    setBlockEndDate(formatDateToInput(new Date()));
    setBlockAllDay(false);
    setBlockStartTime("");
    setBlockEndTime("");
    setBlockReason("");
    setBlockResource(professionalResourceName || blockResource || adminBarbers[0] || "");
  };

  const formatScheduleBlockLabel = (block) => {
    const startDate = normalizeDateOnlyValue(block.start_date);
    const endDate = normalizeDateOnlyValue(block.end_date);
    const dateText = startDate === endDate ? startDate : `${startDate} a ${endDate}`;

    if (block.all_day) {
      return `${dateText} - Todo el dia`;
    }

    return `${dateText} - ${String(block.start_time || "").slice(
      0,
      5
    )} a ${String(block.end_time || "").slice(0, 5)}`;
  };

  const handleCreateScheduleBlock = async () => {
    if (submitting || !businessId) return;

    const selectedResource = professionalResourceName || blockResource;
    const selectedEndDate = blockEndDate || blockStartDate;

    if (!selectedResource) {
      setScheduleBlockMessage("Selecciona un profesional o recurso.");
      return;
    }

    if (!blockStartDate || !selectedEndDate) {
      setScheduleBlockMessage("Selecciona fecha de inicio y termino.");
      return;
    }

    if (selectedEndDate < blockStartDate) {
      setScheduleBlockMessage("La fecha de termino no puede ser anterior.");
      return;
    }

    if (!blockAllDay) {
      if (!blockStartTime || !blockEndTime) {
        setScheduleBlockMessage("Selecciona hora de inicio y termino.");
        return;
      }

      if (blockEndTime <= blockStartTime) {
        setScheduleBlockMessage("La hora de termino debe ser posterior.");
        return;
      }
    }

    setSubmitting(true);
    setScheduleBlockMessage("");

    try {
      await createScheduleBlockService({
        businessId,
        barber: selectedResource,
        startDate: blockStartDate,
        endDate: selectedEndDate,
        allDay: blockAllDay,
        startTime: blockAllDay ? null : blockStartTime,
        endTime: blockAllDay ? null : blockEndTime,
        reason: blockReason.trim() || null,
      });

      setScheduleBlockMessage("Bloqueo creado correctamente.");
      resetScheduleBlockForm();
      await getAppointments("admin");
    } catch (err) {
      console.error(err);
      setScheduleBlockMessage(
        err.response?.data?.message || "No se pudo crear el bloqueo."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteScheduleBlock = async (blockId) => {
    if (submitting || !businessId || !blockId) return;

    setSubmitting(true);
    setScheduleBlockMessage("");

    try {
      await deleteScheduleBlockService(blockId, businessId);
      setScheduleBlockMessage("Bloqueo eliminado correctamente.");
      await getAppointments("admin");
    } catch (err) {
      console.error(err);
      setScheduleBlockMessage(
        err.response?.data?.message || "No se pudo eliminar el bloqueo."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const adminCalendarBusiness = useMemo(() => {
    if (!isProfessionalSession || !mergedBusiness) {
      return mergedBusiness;
    }

    return {
      ...mergedBusiness,
      barbers: [professionalResourceName],
    };
  }, [isProfessionalSession, mergedBusiness, professionalResourceName]);

  const handleHeaderResourceSelect = (item) => {
  if (!item) return;

  if (mergedBusiness?.headerSelectionMode === "service") {
    const selectedService = item.service || item.name || "";
    const selectedResource =
      item.resource || getResourceFromService(selectedService);

    setService(selectedService);

    if (selectedResource) {
      setBarber(selectedResource);
    }

    setMessage(`Seleccionaste: ${selectedService}`);
  } else {
    const selectedProfessional = item.name || "";

    setBarber(selectedProfessional);
    setMessage(`Seleccionaste: ${selectedProfessional}`);
  }

  setWhatsappUrl("");

  setTimeout(() => {
  const headerSelectionMode =
    mergedBusiness?.headerSelectionMode || "professional";
  const scrollTargetId =
    mergedBusiness?.id === "giocata" &&
    mergedBusiness?.headerSelectionMode === "service"
      ? "client-booking-day-step"
      : mergedBusiness?.resourceFirstBookingFlow &&
        headerSelectionMode !== "service"
      ? "client-booking-service-step"
      : "booking-form-section";
  const bookingSection = document.getElementById(scrollTargetId);

  if (bookingSection) {
    bookingSection.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
}, 120);
};

  const handleOpponentAppointmentSelect = (appointment) => {
    if (!appointment) return;

    const nextDate = String(appointment.date || "").slice(0, 10);
    const nextTime = String(appointment.time || "").slice(0, 5);
    const nextService = appointment.service || "";
    const nextResource = appointment.barber || getResourceFromService(nextService);
    const selectedDay = new Date(`${nextDate}T00:00:00`);

    if (!nextDate || !nextTime || !nextService || !nextResource) return;

    setName("");
    setPhone("");
    setService(nextService);
    setBarber(nextResource);
    setDate(nextDate);
    setTime(nextTime);
    setCustomServiceName("");
    setCustomServicePrice("");
    setNeedsOpponent(false);
    setOpponentName("");
    setOpponentPhone("");
    setIsMonthlyReservation(false);
    setEditingId(null);
    setPaymentAppointment(null);
    setSelectedAppointmentPayments([]);
    setPaymentPanelError("");
    setWhatsappUrl("");
    setMessage("Completa tus datos como equipo 2 para unirte al partido.");

    if (!Number.isNaN(selectedDay.getTime())) {
      setSelectedWeekStart(getMonday(selectedDay));
      setSelectedMobileDay(selectedDay);
    }

    setTimeout(() => {
      const bookingSection = document.getElementById("booking-form-section");

      if (bookingSection) {
        bookingSection.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 120);
  };

  const todayStr = formatDateToInput(new Date());
  const dashboardDate = selectedMobileDay
    ? formatDateToInput(selectedMobileDay)
    : date || todayStr;
  const dashboardDateLabel = new Date(`${dashboardDate}T00:00:00`).toLocaleDateString(
    "es-CL",
    {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
    }
  );

  const dashboardAppointments = useMemo(() => {
    const normalizedClientSearch = clientSearch.trim().toLowerCase();

    return appointments.filter((appointment) => {
      const appointmentDate = String(appointment.date || "").slice(0, 10);

      const matchesDashboardDate = appointmentDate === dashboardDate;
      const matchesBarber = effectiveWeeklyBarberFilter
        ? appointment.barber === effectiveWeeklyBarberFilter
        : true;
      const matchesClient = appointmentMatchesClientSearch(
        appointment,
        normalizedClientSearch
      );

      return matchesDashboardDate && matchesBarber && matchesClient;
    });
  }, [appointments, dashboardDate, effectiveWeeklyBarberFilter, clientSearch]);

  const totalDashboardDay = dashboardAppointments.length;

  const attendedDashboardDay = dashboardAppointments.filter(
    (appointment) => appointment.status === "atendida"
  ).length;

  const noShowDashboardDay = dashboardAppointments.filter(
    (appointment) => appointment.status === "no_asistio"
  ).length;

  const reservedDashboardDay = dashboardAppointments.filter(
    (appointment) => !appointment.status || appointment.status === "reservada"
  ).length;

  const revenueDashboardDay = dashboardAppointments
    .filter((appointment) => appointment.status === "atendida")
    .reduce((total, appointment) => {
      return total + getAppointmentTotalAmount(appointment);
    }, 0);

  const paymentDistributionDashboardDay = dashboardAppointments.reduce(
    (summary, appointment) => {
      const totalAmount = getAppointmentTotalAmount(appointment);
      const paidAmount = Math.min(
        getAppointmentPaidAmount(appointment),
        totalAmount
      );
      const paymentStatus = String(
        appointment.payment_status || "unpaid"
      ).toLowerCase();
      const isPaid =
        paymentStatus === "paid" || (totalAmount > 0 && paidAmount >= totalAmount);
      const isPartial = !isPaid && paidAmount > 0;

      summary.totalAmount += totalAmount;
      summary.totalPaidAmount += paidAmount;
      summary.pendingAmount += Math.max(totalAmount - paidAmount, 0);
      summary.transferenciaAmount += Number(appointment.transferencia_paid || 0);
      summary.debitoAmount += Number(appointment.debito_paid || 0);
      summary.efectivoAmount += Number(appointment.efectivo_paid || 0);

      if (isPaid) {
        summary.paidCount += 1;
        summary.fullPaidAmount += totalAmount;
      } else if (isPartial) {
        summary.partialCount += 1;
        summary.partialPaidAmount += paidAmount;
      } else {
        summary.unpaidCount += 1;
        summary.unpaidAmount += totalAmount;
      }

      return summary;
    },
    {
      totalAmount: 0,
      totalPaidAmount: 0,
      pendingAmount: 0,
      paidCount: 0,
      partialCount: 0,
      unpaidCount: 0,
      fullPaidAmount: 0,
      partialPaidAmount: 0,
      unpaidAmount: 0,
      transferenciaAmount: 0,
      debitoAmount: 0,
      efectivoAmount: 0,
    }
  );

  const paidReservationsPendingAttention = dashboardAppointments
    .filter((appointment) => {
      const reservationStatus = String(
        appointment.status || "reservada"
      ).toLowerCase();
      const appointmentDate = String(appointment.date || "").slice(0, 10);
      const appointmentTime = String(appointment.time || "").slice(0, 5);
      const appointmentDay = new Date(`${appointmentDate}T00:00:00`);

      if (reservationStatus !== "reservada") return false;
      if (!appointmentDate || !appointmentTime) return false;
      if (Number.isNaN(appointmentDay.getTime())) return false;
      if (!isAppointmentFullyPaid(appointment)) return false;

      return isPastSlot(appointmentDay, appointmentTime);
    })
    .sort((left, right) => {
      return String(left.time || "").localeCompare(String(right.time || ""));
    });

  const filteredAppointments = useMemo(() => {
    const activeBarberFilter = isClientMode
      ? barber
      : effectiveWeeklyBarberFilter;
    const normalizedClientSearch = clientSearch.trim().toLowerCase();

    return appointments.filter((appointment) => {
      const matchesBarber = activeBarberFilter
        ? appointment.barber === activeBarberFilter
        : true;

      const matchesClient = appointmentMatchesClientSearch(
        appointment,
        normalizedClientSearch
      );

      return matchesBarber && matchesClient;
    });
  }, [
    appointments,
    isClientMode,
    barber,
    effectiveWeeklyBarberFilter,
    clientSearch,
  ]);

  const mobileClientSearchResults = useMemo(() => {
    const normalizedClientSearch = clientSearch.trim().toLowerCase();

    if (
      isClientMode ||
      mergedBusiness?.id !== "giocata" ||
      !normalizedClientSearch
    ) {
      return [];
    }

    const visibleWeekDates = new Set(
      weekDays.map((day) => formatDateToInput(day))
    );

    return filteredAppointments
      .filter((appointment) => {
        const appointmentDate = String(appointment.date || "").slice(0, 10);
        return visibleWeekDates.has(appointmentDate);
      })
      .sort((firstAppointment, secondAppointment) => {
        const firstDateTime = `${String(firstAppointment.date || "").slice(
          0,
          10
        )} ${String(firstAppointment.time || "").slice(0, 5)}`;
        const secondDateTime = `${String(secondAppointment.date || "").slice(
          0,
          10
        )} ${String(secondAppointment.time || "").slice(0, 5)}`;

        return firstDateTime.localeCompare(secondDateTime);
      });
  }, [
    clientSearch,
    filteredAppointments,
    isClientMode,
    mergedBusiness?.id,
    weekDays,
  ]);

  const appointmentsBySlot = useMemo(() => {
    const map = new Map();

    filteredAppointments.forEach((appointment) => {
      const dayKey = formatDateToInput(
        new Date(String(appointment.date).slice(0, 10) + "T00:00:00")
      );
      const rawTime = String(appointment.time || "").slice(0, 5);

      const hourKey =
        typeof hours[0] === "string" ? rawTime : Number(rawTime.slice(0, 2));

      const key = `${dayKey}-${hourKey}`;

      if (!map.has(key)) {
        map.set(key, []);
      }

      map.get(key).push(appointment);
    });

    return map;
  }, [filteredAppointments, hours]);

  const getAppointmentsForSlot = (day, hour) => {
    const key = `${formatDateToInput(day)}-${hour}`;
    return appointmentsBySlot.get(key) || [];
  };

  const resolvedClientResource = getResolvedClientResource();

  const mobileSlots = useMemo(() => {
    if (!selectedMobileDay) return [];

    const selectedDayHours = getScheduleSlotsForDate(selectedMobileDay);
    const mobileSlotResource = isClientMode
      ? resolvedClientResource
      : effectiveWeeklyBarberFilter;

    return selectedDayHours.map((hour) => {
      const slotAppointments = getAppointmentsForSlot(selectedMobileDay, hour);
      const slotBlocks = getBlocksForSlot(
        selectedMobileDay,
        hour,
        mobileSlotResource
      );

      const normalizedHour =
        typeof hour === "string"
          ? hour
          : `${String(hour).padStart(2, "0")}:00`;

      const isPast = isClientMode
        ? isPastSlot(selectedMobileDay, normalizedHour)
        : false;

      return {
        hour,
        label: typeof hour === "string" ? hour : formatHourLabel(hour),
        appointments: slotAppointments,
        blocks: slotBlocks,
        isOccupied: slotAppointments.length > 0,
        isBlocked: slotBlocks.length > 0,
        isPast,
      };
    });
  }, [
    selectedMobileDay,
    hours,
    appointmentsBySlot,
    scheduleBlocks,
    resolvedClientResource,
    effectiveWeeklyBarberFilter,
    isClientMode,
    currentBusinessConfig,
  ]);

  const availableDays = useMemo(() => {
    const days = [];
    const today = new Date();
    const clientReservationDays = ["giocata", "pinguino-club"].includes(
      mergedBusiness?.id
    )
      ? 7
      : 14;

    for (let i = 0; i < clientReservationDays; i += 1) {
      const day = addDays(today, i);
      const dateValue = formatDateToInput(day);

      if (blockedWeekdays.includes(day.getDay())) continue;
      if (isPastDayOnly(day)) continue;

      days.push({
        value: dateValue,
        label: day.toLocaleDateString("es-CL", {
          weekday: "short",
          day: "2-digit",
          month: "2-digit",
        }),
      });
    }

    return days;
  }, [blockedWeekdays, mergedBusiness?.id]);

  const openOpponentAppointments = useMemo(() => {
    const isSportsBusiness = ["giocata", "pinguino-club"].includes(
      mergedBusiness?.id
    );

    if (!isSportsBusiness) return [];

    const allowedDateValues = new Set(
      (availableDays || []).map((day) => day.value)
    );

    return appointments
      .filter((appointment) => {
        const appointmentDate = String(appointment.date || "").slice(0, 10);
        const appointmentTime = String(appointment.time || "").slice(0, 5);

        if (!Boolean(appointment.needs_opponent)) return false;
        if (!appointmentDate || !appointmentTime) return false;
        if (allowedDateValues.size > 0 && !allowedDateValues.has(appointmentDate)) {
          return false;
        }

        const slotDate = new Date(`${appointmentDate}T00:00:00`);

        if (Number.isNaN(slotDate.getTime())) return false;

        return !isPastSlot(slotDate, appointmentTime);
      })
      .sort((left, right) => {
        const leftValue = `${String(left.date || "").slice(0, 10)} ${String(
          left.time || ""
        ).slice(0, 5)} ${left.barber || ""}`;
        const rightValue = `${String(right.date || "").slice(0, 10)} ${String(
          right.time || ""
        ).slice(0, 5)} ${right.barber || ""}`;

        return leftValue.localeCompare(rightValue);
      })
      .slice(0, 6);
  }, [appointments, availableDays, mergedBusiness?.id]);

  const availableTimes = useMemo(() => {
  if (!date) return [];

  const selectedDay = new Date(`${date}T00:00:00`);

  if (blockedWeekdays.includes(selectedDay.getDay())) return [];

  const isSportsBusiness = ["giocata", "pinguino-club"].includes(
    mergedBusiness?.id
  );

  const selectedDayHours = getScheduleSlotsForDate(selectedDay);

  return selectedDayHours.map((hour) => {
    const formattedHour =
      typeof hour === "string" ? hour : formatHourLabel(hour);

    const normalizedHour = normalizeScheduleTime(hour);

    const isPast = isPastSlot(selectedDay, normalizedHour);
    const slotAppointments = getAppointmentsForSlot(selectedDay, hour);
    const candidateStartMinutes = timeToMinutes(normalizedHour);
    const selectedDurationMinutes = getServiceDurationMinutes(service);
    const candidateEndMinutes =
      candidateStartMinutes === null
        ? null
        : candidateStartMinutes + selectedDurationMinutes;
    const scheduleEndMinutes = getScheduleEndMinutes(selectedDayHours);
    const exceedsSchedule =
      usesServiceDurations &&
      scheduleEndMinutes !== null &&
      candidateEndMinutes !== null &&
      candidateEndMinutes > scheduleEndMinutes;
    const blockingBlocks =
      resolvedClientResource && candidateEndMinutes !== null
        ? getBlocksForReservationCandidate({
            dateValue: date,
            resourceName: resolvedClientResource,
            timeValue: normalizedHour,
            serviceName: service,
          })
        : [];

    const durationOverlaps =
      usesServiceDurations && resolvedClientResource && candidateEndMinutes !== null
        ? appointments.filter((appointment) => {
            const appointmentDate = String(appointment.date || "").slice(0, 10);
            const appointmentTime = String(appointment.time || "").slice(0, 5);

            if (appointmentDate !== date) return false;
            if (appointment.barber !== resolvedClientResource) return false;

            const appointmentStartMinutes = timeToMinutes(appointmentTime);
            const appointmentEndMinutes =
              appointmentStartMinutes === null
                ? null
                : appointmentStartMinutes +
                  getServiceDurationMinutes(appointment.service);

            return rangesOverlap(
              candidateStartMinutes,
              candidateEndMinutes,
              appointmentStartMinutes,
              appointmentEndMinutes
            );
          })
        : [];

    const relevantAppointments = usesServiceDurations
      ? durationOverlaps
      : resolvedClientResource
      ? slotAppointments.filter(
          (appointment) => appointment.barber === resolvedClientResource
        )
      : slotAppointments;

    const opponentAppointment = relevantAppointments.find(
      (appointment) => Boolean(appointment.needs_opponent)
    );

    const isTaken = relevantAppointments.length > 0;
    const isLookingForOpponent = isSportsBusiness && Boolean(opponentAppointment);
    const isBlocked = blockingBlocks.length > 0;

    return {
      value: formattedHour,
      isPast,
      isTaken,
      isBlocked,
      isLookingForOpponent,
      opponentAppointment: opponentAppointment || null,
      disabled:
        isPast ||
        exceedsSchedule ||
        isBlocked ||
        (isTaken && !isLookingForOpponent),
      status: isPast
        ? "past"
        : isBlocked
        ? "blocked"
        : exceedsSchedule
        ? "taken"
        : isLookingForOpponent
        ? "looking_opponent"
        : isTaken
        ? "taken"
        : "available",
    };
  });
}, [
  date,
  hours,
  resolvedClientResource,
  appointmentsBySlot,
  appointments,
  scheduleBlocks,
  blockedWeekdays,
  mergedBusiness?.id,
  service,
  usesServiceDurations,
  slotIntervalMinutes,
  currentBusinessConfig,
]);

  const styles = {
    page: {
      minHeight: "100vh",
      backgroundColor: theme.pageBackground || "#f3f4f6",
      padding: isMobile ? "12px" : "24px",
      fontFamily: "Arial, sans-serif",
      color: "#111827",
      boxSizing: "border-box",
      width: "100%",
      overflowX: "hidden",
    },
    title: {
      marginBottom: "20px",
      fontSize: "28px",
      fontWeight: "bold",
    },
    layout: {
      display: "grid",
      gridTemplateColumns: isCompactAdmin ? "1fr" : "320px minmax(0, 1fr)",
      gap: "20px",
      alignItems: "start",
      width: "100%",
    },
    card: {
      backgroundColor: theme.cardBackground || "#fff",
      borderRadius: "14px",
      padding: isMobile ? "16px" : "20px",
      boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
      border: `1px solid ${theme.border || "#e5e7eb"}`,
      boxSizing: "border-box",
      width: "100%",
      minWidth: 0,
    },
    dashboardToggleButton: {
      width: "100%",
      border: `1px solid ${theme.border || "#bbf7d0"}`,
      backgroundColor: isDailyDashboardOpen
        ? theme.primary || "#16a34a"
        : theme.primarySoft || "#dcfce7",
      color: isDailyDashboardOpen ? "#ffffff" : theme.primaryDark || "#14532d",
      borderRadius: "12px",
      padding: isMobile ? "13px 14px" : "14px 18px",
      marginBottom: isDailyDashboardOpen ? "16px" : "6px",
      cursor: "pointer",
      fontWeight: "900",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "12px",
      boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)",
      textAlign: "left",
    },
    dashboardToggleMeta: {
      fontSize: isMobile ? "11px" : "12px",
      fontWeight: "800",
      opacity: 0.82,
      whiteSpace: isMobile ? "normal" : "nowrap",
      textAlign: "right",
    },
    dashboardGrid: {
      display: "grid",
      gridTemplateColumns: isMobile
        ? "1fr 1fr"
        : "repeat(5, minmax(140px, 1fr))",
      gap: "12px",
      marginBottom: "18px",
    },
    dashboardCard: {
      backgroundColor: theme.cardBackground || "#fff",
      borderRadius: "12px",
      padding: "14px",
      border: `1px solid ${theme.border || "#e5e7eb"}`,
      boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
    },
    dashboardPaymentSummary: {
      borderRadius: "14px",
      padding: isMobile ? "12px" : "14px",
      border: `1px solid ${theme.border || "#bbf7d0"}`,
      backgroundColor: theme.primarySoft || "#f0fdf4",
      marginTop: "-4px",
      marginBottom: "18px",
    },
    dashboardPaymentHeader: {
      display: "flex",
      justifyContent: "space-between",
      gap: "10px",
      flexWrap: "wrap",
      alignItems: "baseline",
      marginBottom: "10px",
    },
    dashboardPaymentGrid: {
      display: "grid",
      gridTemplateColumns: isMobile
        ? "1fr"
        : "repeat(3, minmax(160px, 1fr))",
      gap: "10px",
    },
    dashboardPaymentCard: {
      backgroundColor: theme.cardBackground || "#fff",
      borderRadius: "12px",
      padding: "12px",
      border: `1px solid ${theme.border || "#d1fae5"}`,
      boxShadow: "0 3px 10px rgba(15, 23, 42, 0.05)",
    },
    dashboardPaymentLabel: {
      fontSize: "12px",
      color: "#64748b",
      marginBottom: "4px",
      fontWeight: "700",
    },
    dashboardPaymentAmount: {
      fontSize: "20px",
      fontWeight: "900",
      color: "#111827",
    },
    dashboardPaymentMeta: {
      marginTop: "4px",
      fontSize: "12px",
      color: "#64748b",
    },
    dashboardReviewPanel: {
      marginTop: "12px",
      paddingTop: "12px",
      borderTop: `1px solid ${theme.border || "#bbf7d0"}`,
    },
    dashboardReviewList: {
      display: "grid",
      gap: "10px",
    },
    dashboardReviewItem: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) auto",
      gap: "10px",
      alignItems: "center",
      backgroundColor: "#ffffff",
      borderRadius: "12px",
      padding: "12px",
      border: "1px solid #dbeafe",
      boxShadow: "0 3px 10px rgba(15, 23, 42, 0.05)",
    },
    dashboardReviewActions: {
      display: "flex",
      gap: "8px",
      flexWrap: "wrap",
      justifyContent: isMobile ? "stretch" : "flex-end",
    },
    dashboardReviewButton: {
      padding: "9px 10px",
      borderRadius: "8px",
      border: "none",
      cursor: "pointer",
      fontWeight: "900",
      fontSize: "12px",
      flex: isMobile ? "1 1 130px" : "0 0 auto",
    },
    dashboardLabel: {
      fontSize: "13px",
      color: "#6b7280",
      marginBottom: "6px",
    },
    dashboardValue: {
      fontSize: "24px",
      fontWeight: "700",
      color: "#111827",
    },
    dashboardValueSuccess: {
      fontSize: "24px",
      fontWeight: "700",
      color: "#166534",
    },
    dashboardValueDanger: {
      fontSize: "24px",
      fontWeight: "700",
      color: "#991b1b",
    },
    dashboardValueWarning: {
      fontSize: "24px",
      fontWeight: "700",
      color: "#92400e",
    },
    sectionTitle: {
      marginTop: 0,
      marginBottom: "16px",
      fontSize: "20px",
    },
    formGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "10px",
    },
    input: {
      padding: "10px 12px",
      borderRadius: "8px",
      border: "1px solid #d1d5db",
      fontSize: "14px",
      marginBottom: "10px",
      width: "100%",
      boxSizing: "border-box",
    },
    select: {
      padding: "10px 12px",
      borderRadius: "8px",
      border: "1px solid #d1d5db",
      fontSize: "14px",
      backgroundColor: "#fff",
      width: "100%",
      boxSizing: "border-box",
    },
    button: {
      padding: "10px 14px",
      border: "none",
      borderRadius: "8px",
      cursor: "pointer",
      fontWeight: "bold",
    },
    primaryButton: {
      backgroundColor: theme.primary || "#111827",
      color: "#fff",
    },
    secondaryButton: {
      backgroundColor: "#e5e7eb",
      color: "#111827",
    },
    editButton: {
      backgroundColor: "#2563eb",
      color: "#fff",
    },
    dangerButton: {
      backgroundColor: "#dc2626",
      color: "#fff",
    },
    message: {
      marginTop: "10px",
      fontWeight: "bold",
      whiteSpace: "pre-line",
    },
    topBar: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "16px",
      gap: "10px",
      flexWrap: "wrap",
    },
    weekActions: {
      display: "flex",
      gap: "8px",
      flexWrap: "wrap",
    },
    calendarWrapper: {
      overflowX: "auto",
      width: "100%",
      minWidth: 0,
    },
    calendarGrid: {
      display: "grid",
      gridTemplateColumns: isMobile
        ? "80px minmax(180px, 1fr)"
        : "90px repeat(7, minmax(140px, 1fr))",
      border: "1px solid #e5e7eb",
      borderRadius: "12px",
      overflow: "hidden",
      backgroundColor: "#fff",
      minWidth: isMobile ? "100%" : "1070px",
    },
    headerCell: {
      backgroundColor: theme.primary || "#1f2937",
      color: "#fff",
      padding: "12px",
      fontWeight: "bold",
      borderRight: "1px solid #374151",
      minHeight: "70px",
      textTransform: "capitalize",
    },
    timeHeaderCell: {
      backgroundColor: theme.primary || "#1f2937",
      color: "#fff",
      padding: "12px",
      fontWeight: "bold",
      borderRight: "1px solid #374151",
      minHeight: "70px",
    },
    timeCell: {
      padding: "12px",
      borderRight: "1px solid #e5e7eb",
      borderTop: "1px solid #e5e7eb",
      backgroundColor: theme.primarySoft || "#f9fafb",
      fontWeight: "bold",
      fontSize: "14px",
      minHeight: "90px",
    },
    slotCell: {
      padding: "8px",
      borderRight: "1px solid #e5e7eb",
      borderTop: "1px solid #e5e7eb",
      minHeight: "90px",
      backgroundColor: "#fff",
      position: "relative",
    },
    appointmentBlock: {
      borderRadius: "10px",
      padding: "8px",
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      fontSize: "12px",
      boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
    },
    appointmentTitle: {
      fontWeight: "bold",
      fontSize: "13px",
    },
    appointmentMeta: {
      color: "#374151",
    },
    actionRow: {
      display: "flex",
      gap: "6px",
      flexWrap: "wrap",
      marginTop: "4px",
    },
    tinyButton: {
      padding: "6px 8px",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "12px",
      fontWeight: "bold",
    },
    spinnerBox: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "30px",
    },
    spinner: {
      width: "42px",
      height: "42px",
      border: "4px solid #e5e7eb",
      borderTop: "4px solid #111827",
      borderRadius: "50%",
      animation: "spin 1s linear infinite",
    },
    loadingStateCard: {
      ...{
        backgroundColor: theme.cardBackground || "#ffffff",
        border: `1px solid ${theme.border || "#e5e7eb"}`,
        borderRadius: "22px",
        padding: isMobile ? "22px" : "30px",
        boxShadow: "0 18px 44px rgba(15,23,42,0.10)",
        width: "100%",
        maxWidth: "680px",
        margin: "10vh auto 0",
        display: "grid",
        gap: "18px",
        overflow: "hidden",
        position: "relative",
      },
    },
    loadingLogoWrap: {
      width: "78px",
      height: "78px",
      borderRadius: "22px",
      border: `1px solid ${theme.border || "#d1fae5"}`,
      background:
        "linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(255,255,255,0.96) 70%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      animation: "loadingFloat 2.8s ease-in-out infinite",
    },
    loadingLogo: {
      width: "54px",
      height: "54px",
      objectFit: "contain",
      borderRadius: "16px",
    },
    loadingTitle: {
      fontSize: isMobile ? "24px" : "30px",
      fontWeight: "bold",
      color: theme.text || "#111827",
      marginBottom: "8px",
    },
    loadingText: {
      color: theme.mutedText || "#4b5563",
      lineHeight: 1.6,
      fontSize: "15px",
    },
    loadingBar: {
      position: "relative",
      height: "8px",
      borderRadius: "999px",
      backgroundColor: theme.primarySoft || "#dcfce7",
      overflow: "hidden",
    },
    loadingBarFill: {
      position: "absolute",
      inset: 0,
      width: "42%",
      borderRadius: "999px",
      background: `linear-gradient(90deg, transparent 0%, ${
        theme.primary || "#22c55e"
      } 50%, transparent 100%)`,
      animation: "loadingBarSlide 1.6s ease-in-out infinite",
    },
    loadingSkeletonGrid: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
      gap: "12px",
    },
    loadingSkeletonCard: {
      border: "1px solid #e5e7eb",
      borderRadius: "16px",
      padding: "14px",
      backgroundColor: "#ffffff",
      display: "grid",
      gap: "10px",
    },
    loadingSkeletonLine: {
      height: "12px",
      borderRadius: "999px",
      background:
        "linear-gradient(90deg, #eef2f7 0%, #f8fafc 45%, #e5e7eb 80%)",
      backgroundSize: "220% 100%",
      animation: "loadingShimmer 1.45s ease-in-out infinite",
    },
    disabledButton: {
      opacity: 0.6,
      cursor: "not-allowed",
    },
    paymentModalOverlay: {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: isMobile ? "12px" : "24px",
  zIndex: 9999,
},

paymentModalCard: {
  backgroundColor: theme.cardBackground || "#fff",
  borderRadius: "18px",
  padding: isMobile ? "16px" : "24px",
  boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
  border: `1px solid ${theme.border || "#e5e7eb"}`,
  width: "100%",
  maxWidth: "980px",
  maxHeight: "88vh",
  overflowY: "auto",
  boxSizing: "border-box",
},

paymentSummaryGrid: {
  display: "grid",
  gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, minmax(0, 1fr))",
  gap: "10px",
  marginBottom: "16px",
},

paymentSummaryCard: {
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "12px",
  backgroundColor: "#ffffff",
},

paymentHistoryItem: {
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "12px",
  backgroundColor: "#ffffff",
},
    mobileSlotsWrapper: {
      display: "grid",
      gridTemplateColumns:
        isMobile && !isClientMode && mergedBusiness?.id === "giocata"
          ? "1fr"
          : "repeat(2, minmax(0, 1fr))",
      gap: "12px",
    },
    mobileSlotButton: {
      padding: "14px 10px",
      borderRadius: "12px",
      border: "1px solid #d1d5db",
      backgroundColor: "#ffffff",
      color: "#111827",
      cursor: "pointer",
      textAlign: "center",
      minHeight: "72px",
    },
    mobileSlotOccupied: {
      backgroundColor: "#e5e7eb",
      color: "#9ca3af",
      cursor: "not-allowed",
      border: "1px solid #d1d5db",
    },
    mobileSlotSelected: {
      backgroundColor: theme.primaryDark || "#111827",
      color: "#ffffff",
      border: `1px solid ${theme.primaryDark || "#111827"}`,
    },
    mobileSlotTime: {
      fontSize: "15px",
      fontWeight: "600",
      marginBottom: "4px",
    },
    mobileSlotStatus: {
      fontSize: "12px",
    },
  };

  const activeReservationStatusMeta = getReservationStatusMeta(
    paymentAppointment?.status
  );

  const activePaymentStatusMeta = getPaymentStatusMeta(effectivePaymentStatus);

  const paymentAppointmentPhone = paymentAppointment?.phone
    ? normalizeChilePhone(paymentAppointment.phone)
    : "";

  const paymentAppointmentPhoneDisplay = paymentAppointmentPhone
    ? paymentAppointmentPhone.startsWith("56") && paymentAppointmentPhone.length === 11
      ? `+${paymentAppointmentPhone.slice(0, 2)} ${paymentAppointmentPhone.slice(2, 3)} ${paymentAppointmentPhone.slice(3, 7)} ${paymentAppointmentPhone.slice(7)}`
      : paymentAppointmentPhone
    : "";

  const paymentAppointmentWhatsappUrl = paymentAppointmentPhone
    ? `https://wa.me/${paymentAppointmentPhone}`
    : "";

  const isClientFormComplete =
    name.trim() &&
    phone.trim() &&
    (!clinicalRecordsEnabled ||
      (clientRut.trim() && isValidEmail(clientEmail))) &&
    date &&
    time &&
    service.trim() &&
    (mergedBusiness?.hideResourceSelector ? true : barber);

  const isBarberSelected = mergedBusiness?.hideResourceSelector
    ? true
    : Boolean(barber);

  const isHomePage = !slug;

  if (isHomePage) {
    return <HomeLanding />;
  }

  if (businessLoading) {
    return (
      <div style={styles.page}>
        <AppAnimationStyles />
        <BusinessLoadingState
          styles={styles}
          business={mergedBusiness || currentBusinessConfig}
        />
      </div>
    );
  }

  if (businessError || !businessId) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          {businessError || "No se encontró el negocio solicitado."}
        </div>
      </div>
    );
  }

  if (isBusinessLinkPage) {
    return (
      <BusinessLinkPage
        business={mergedBusiness}
        isMobile={isMobile}
        slug={slug}
      />
    );
  }

  if (appMode === "admin" && !isLoggedIn) {
    return (
      <LoginScreen
        styles={styles}
        username={username}
        password={password}
        loginError={loginError}
        loggingIn={loggingIn}
        setUsername={setUsername}
        setPassword={setPassword}
        handleLogin={handleLogin}
        setAppMode={setAppMode}
      />
    );
  }

  return (
    <>
      <AppAnimationStyles />

      <div style={styles.page}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <h1
            style={{
              ...styles.title,
              marginBottom: 0,
              fontSize: isMobile ? "24px" : "28px",
              lineHeight: 1.2,
            }}
          >
            {isClientMode
              ? mergedBusiness?.bookingTitle || "Reserva online"
              : mergedBusiness?.adminTitle || "Panel de reservas"}
          </h1>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {isAdminMode ? (
              <button
                style={{ ...styles.button, ...styles.dangerButton }}
                onClick={handleLogout}
              >
                Cerrar sesión
              </button>
            ) : (
              <button
                style={{
                  ...styles.button,
                  backgroundColor: theme.primarySoft || "#e5e7eb",
                  color: theme.primaryDark || "#111827",
                  border: `1px solid ${theme.border || "#d1d5db"}`,
                }}
                onClick={() => setAppMode("admin")}
              >
                Iniciar sesión
              </button>
            )}
          </div>
        </div>

        {isClientMode ? (
          <div>
            <BusinessHeader
  isMobile={isMobile}
  business={mergedBusiness}
  onHeaderResourceSelect={handleHeaderResourceSelect}
  openOpponentAppointments={openOpponentAppointments}
  onOpponentAppointmentSelect={handleOpponentAppointmentSelect}
  selectedBarber={barber}
  selectedService={service}
  selectedDate={date}
  selectedTime={time}
/>

            <div id="booking-form-section" style={styles.card}>
              <ClientBookingWizard
                styles={styles}
                business={mergedBusiness}
                SERVICES={SERVICES}
                BARBERS={BARBERS}
                service={service}
                setService={setService}
                barber={barber}
                setBarber={setBarber}
                date={date}
                setDate={setDate}
                time={time}
                setTime={setTime}
                name={name}
                setName={setName}
                phone={phone}
                setPhone={setPhone}
                clientSuggestions={clientSuggestions}
                loadingClientSuggestions={loadingClientSuggestions}
                clientSuggestionQuery={clientSuggestionQuery}
                clientSuggestionError={clientSuggestionError}
                onClientSuggestionSelect={handleClientSuggestionSelect}
                clientRut={clientRut}
                setClientRut={setClientRut}
                clientEmail={clientEmail}
                setClientEmail={setClientEmail}
                availableDays={availableDays}
                availableTimes={availableTimes}
                blockedWeekdays={blockedWeekdays}
                createAppointment={createAppointment}
                submitting={submitting}
                isClientFormComplete={isClientFormComplete}
                message={message}
                whatsappUrl={whatsappUrl}
                whatsappButtonText={whatsappButtonText}
                allowReservationWithoutPayment={allowReservationWithoutPayment}
                reserveWithoutPayment={reserveWithoutPayment}
                setReserveWithoutPayment={setReserveWithoutPayment}
              />
              {false && (
                <>
                  <div style={styles.topBar}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      <h2 style={{ marginTop: "32px", marginBottom: "12px" }}>
                        Disponibilidad semanal
                      </h2>

                      {!mergedBusiness?.hideResourceSelector && (
                        <div
                          style={{
                            ...styles.select,
                            minWidth: "220px",
                            backgroundColor: "#f9fafb",
                            display: "flex",
                            alignItems: "center",
                            color: barber ? "#111827" : "#6b7280",
                          }}
                        >
                          {barber
                            ? `${
                                mergedBusiness?.resourceSelectedLabel ||
                                "Recurso seleccionado"
                              }: ${barber}`
                            : mergedBusiness?.resourceSelectPrompt ||
                              "Selecciona un recurso arriba"}
                        </div>
                      )}
                    </div>

                    <div style={styles.weekActions}>
                      <button
                        style={{ ...styles.button, ...styles.secondaryButton }}
                        onClick={goToPreviousWeek}
                      >
                        {"← Semana anterior"}
                      </button>
                      <button
                        style={{ ...styles.button, ...styles.primaryButton }}
                        onClick={goToCurrentWeek}
                      >
                        Semana actual
                      </button>
                      <button
                        style={{ ...styles.button, ...styles.secondaryButton }}
                        onClick={goToNextWeek}
                      >
                        {"Semana siguiente →"}
                      </button>
                    </div>
                  </div>

                  <WeeklyCalendar
                    styles={styles}
                    business={mergedBusiness}
                    loading={loading}
                    isMobile={isMobile}
                    weekDays={weekDays}
                    selectedMobileDay={selectedMobileDay}
                    setSelectedMobileDay={setSelectedMobileDay}
                    formatDateToInput={formatDateToInput}
                    formatHourLabel={(hour) =>
                      typeof hour === "string" ? hour : formatHourLabel(hour)
                    }
                    sameDate={sameDate}
                    date={date}
                    time={time}
                    hours={hours}
                    mobileSlots={mobileSlots}
                    isBarberSelected={isBarberSelected}
                    selectSlot={selectSlot}
                    setDate={setDate}
                    setTime={setTime}
                    setBarber={setBarber}
                    getAppointmentsForSlot={getAppointmentsForSlot}
                    getBlocksForSlot={(dayValue, hourValue, resourceName) =>
                      getBlocksForSlot(
                        dayValue,
                        hourValue,
                        resourceName || barber || resolvedClientResource
                      )
                    }
                    getBarberColors={getBarberColors}
                    isClientMode={true}
                    barber={barber}
                    editAppointment={editAppointment}
                    deleteAppointment={deleteAppointment}
                    submitting={submitting}
                    isPastSlot={isPastSlot}
                    isPastDayOnly={isPastDayOnly}
                    isScheduleSlotAvailable={isScheduleSlotAvailable}
                  />
                </>
              )}
            </div>
          </div>
        ) : (
          <div style={styles.layout}>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <AdminBookingPanel
                styles={styles}
                business={mergedBusiness}
                isCompactAdmin={isCompactAdmin}
                editingId={editingId}
                name={name}
                setName={setName}
                phone={phone}
                setPhone={setPhone}
                clientSuggestions={clientSuggestions}
                loadingClientSuggestions={loadingClientSuggestions}
                clientSuggestionQuery={clientSuggestionQuery}
                clientSuggestionError={clientSuggestionError}
                onClientSuggestionSelect={handleClientSuggestionSelect}
                clientRut={clientRut}
                setClientRut={setClientRut}
                clientEmail={clientEmail}
                setClientEmail={setClientEmail}
                date={date}
                setDate={setDate}
                time={time}
                setTime={setTime}
                service={service}
                setService={setService}
                barber={barber}
                setBarber={setBarber}
                BARBERS={adminBarbers}
                SERVICES={SERVICES}
                lockedResourceName={professionalResourceName}
                customServiceName={customServiceName}
setCustomServiceName={setCustomServiceName}
customServicePrice={customServicePrice}
setCustomServicePrice={setCustomServicePrice}

needsOpponent={needsOpponent}
setNeedsOpponent={setNeedsOpponent}
opponentName={opponentName}
setOpponentName={setOpponentName}
opponentPhone={opponentPhone}
setOpponentPhone={setOpponentPhone}
isSportsBusiness={["giocata", "pinguino-club"].includes(mergedBusiness?.id)}
isCustomServiceBusiness={["barberia-james", "barberia-junior"].includes(
  mergedBusiness?.id
)}
isCustomPriceBusiness={["giocata", "pinguino-club"].includes(
  mergedBusiness?.id
)}
isMonthlyReservation={isMonthlyReservation}
setIsMonthlyReservation={setIsMonthlyReservation}
createMonthlyAppointment={createMonthlyAppointment}

updateAppointment={updateAppointment}
                createAppointment={createAppointment}
                resetForm={resetForm}
                submitting={submitting}
                message={message}
              />

              {scheduleBlockingEnabled && (
              <div style={styles.card}>
                <h2 style={{ marginTop: 0, marginBottom: "12px" }}>
                  Bloquear horarios
                </h2>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <select
                    style={styles.select}
                    value={professionalResourceName || blockResource}
                    onChange={(event) => setBlockResource(event.target.value)}
                    disabled={isProfessionalSession}
                  >
                    <option value="">Selecciona profesional</option>
                    {adminBarbers.map((barberName) => (
                      <option key={barberName} value={barberName}>
                        {barberName}
                      </option>
                    ))}
                  </select>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                      gap: "10px",
                    }}
                  >
                    <input
                      style={styles.input}
                      type="date"
                      value={blockStartDate}
                      onChange={(event) => {
                        setBlockStartDate(event.target.value);
                        if (!blockEndDate || blockEndDate < event.target.value) {
                          setBlockEndDate(event.target.value);
                        }
                      }}
                    />

                    <input
                      style={styles.input}
                      type="date"
                      value={blockEndDate}
                      onChange={(event) => setBlockEndDate(event.target.value)}
                    />
                  </div>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      fontWeight: "800",
                      color: "#334155",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={blockAllDay}
                      onChange={(event) => setBlockAllDay(event.target.checked)}
                      style={{ width: "18px", height: "18px" }}
                    />
                    Todo el dia
                  </label>

                  {!blockAllDay && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                        gap: "10px",
                      }}
                    >
                      <input
                        style={styles.input}
                        type="time"
                        value={blockStartTime}
                        onChange={(event) => setBlockStartTime(event.target.value)}
                      />

                      <input
                        style={styles.input}
                        type="time"
                        value={blockEndTime}
                        onChange={(event) => setBlockEndTime(event.target.value)}
                      />
                    </div>
                  )}

                  <input
                    style={styles.input}
                    type="text"
                    value={blockReason}
                    onChange={(event) => setBlockReason(event.target.value)}
                    placeholder="Motivo opcional"
                  />

                  <button
                    type="button"
                    style={{
                      ...styles.button,
                      ...styles.primaryButton,
                      ...(submitting ? styles.disabledButton : {}),
                    }}
                    onClick={handleCreateScheduleBlock}
                    disabled={submitting}
                  >
                    Crear bloqueo
                  </button>

                  {scheduleBlockMessage && (
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: "800",
                        color: scheduleBlockMessage.includes("correctamente")
                          ? theme.primaryDark || "#166534"
                          : "#991b1b",
                      }}
                    >
                      {scheduleBlockMessage}
                    </div>
                  )}
                </div>

                <div style={{ marginTop: "18px" }}>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: "900",
                      color: "#334155",
                      marginBottom: "10px",
                    }}
                  >
                    Bloqueos de la semana
                  </div>

                  {visibleScheduleBlocks.length === 0 ? (
                    <div
                      style={{
                        border: "1px dashed #cbd5e1",
                        borderRadius: "12px",
                        padding: "12px",
                        color: "#64748b",
                        fontSize: "13px",
                        fontWeight: "700",
                      }}
                    >
                      Sin bloqueos para esta semana.
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      {visibleScheduleBlocks.map((block) => (
                        <div
                          key={block.id}
                          style={{
                            border: "1px solid #e2e8f0",
                            borderRadius: "12px",
                            padding: "10px",
                            backgroundColor: "#f8fafc",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: "10px",
                              alignItems: "flex-start",
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontWeight: "900",
                                  color: "#0f172a",
                                  fontSize: "13px",
                                }}
                              >
                                {block.barber}
                              </div>
                              <div
                                style={{
                                  color: "#475569",
                                  fontSize: "12px",
                                  fontWeight: "700",
                                  marginTop: "3px",
                                }}
                              >
                                {formatScheduleBlockLabel(block)}
                              </div>
                              {block.reason && (
                                <div
                                  style={{
                                    color: "#64748b",
                                    fontSize: "12px",
                                    marginTop: "3px",
                                  }}
                                >
                                  {block.reason}
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              style={{
                                ...styles.tinyButton,
                                ...styles.dangerButton,
                                minWidth: "72px",
                                ...(submitting ? styles.disabledButton : {}),
                              }}
                              onClick={() => handleDeleteScheduleBlock(block.id)}
                              disabled={submitting}
                            >
                              Quitar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              )}
            </div>

            <div style={styles.card}>
              {dailyDashboardEnabled && (
                <>
                  <button
                    type="button"
                    style={styles.dashboardToggleButton}
                    onClick={() =>
                      setIsDailyDashboardOpen((currentValue) => !currentValue)
                    }
                  >
                    <span>
                      {isDailyDashboardOpen
                        ? "Ocultar resumen del día"
                        : "Ver resumen del día"}
                    </span>
                    <span style={styles.dashboardToggleMeta}>
                      {totalDashboardDay} reservas ·{" "}
                      {formatCurrency(revenueDashboardDay)}
                    </span>
                  </button>

                  {isDailyDashboardOpen && (
                    <>
              <div style={styles.dashboardGrid}>
                <div style={styles.dashboardCard}>
                  <div style={styles.dashboardLabel}>
                    Citas del día
                    <span style={{ display: "block", fontSize: "11px" }}>
                      {dashboardDateLabel}
                    </span>
                  </div>
                  <div style={styles.dashboardValue}>{totalDashboardDay}</div>
                </div>

                <div style={styles.dashboardCard}>
                  <div style={styles.dashboardLabel}>Atendidas</div>
                  <div style={styles.dashboardValueSuccess}>
                    {attendedDashboardDay}
                  </div>
                </div>

                <div style={styles.dashboardCard}>
                  <div style={styles.dashboardLabel}>No asistió</div>
                  <div style={styles.dashboardValueDanger}>
                    {noShowDashboardDay}
                  </div>
                </div>

                <div style={styles.dashboardCard}>
                  <div style={styles.dashboardLabel}>Pendientes</div>
                  <div style={styles.dashboardValueWarning}>
                    {reservedDashboardDay}
                  </div>
                </div>

                <div style={styles.dashboardCard}>
                  <div style={styles.dashboardLabel}>Ingreso real del día</div>
                  <div style={styles.dashboardValue}>
                    ${revenueDashboardDay.toLocaleString("es-CL")}
                  </div>
                </div>
              </div>

              {paymentsEnabled && (
                <div style={styles.dashboardPaymentSummary}>
                  <div style={styles.dashboardPaymentHeader}>
                    <div style={{ fontWeight: "900", fontSize: "15px" }}>
                      Pagos del día
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                      Total esperado:{" "}
                      <strong style={{ color: "#111827" }}>
                        {formatCurrency(
                          paymentDistributionDashboardDay.totalAmount
                        )}
                      </strong>
                    </div>
                  </div>

                  <div style={styles.dashboardPaymentGrid}>
                    <div
                      style={{
                        ...styles.dashboardPaymentCard,
                        borderColor: "#bbf7d0",
                      }}
                    >
                      <div style={styles.dashboardPaymentLabel}>
                        Pagado completo
                      </div>
                      <div
                        style={{
                          ...styles.dashboardPaymentAmount,
                          color: "#166534",
                        }}
                      >
                        {formatCurrency(
                          paymentDistributionDashboardDay.fullPaidAmount
                        )}
                      </div>
                      <div style={styles.dashboardPaymentMeta}>
                        {paymentDistributionDashboardDay.paidCount} reservas
                      </div>
                    </div>

                    <div
                      style={{
                        ...styles.dashboardPaymentCard,
                        borderColor: "#fde68a",
                      }}
                    >
                      <div style={styles.dashboardPaymentLabel}>
                        Abonos y parciales
                      </div>
                      <div
                        style={{
                          ...styles.dashboardPaymentAmount,
                          color: "#92400e",
                        }}
                      >
                        {formatCurrency(
                          paymentDistributionDashboardDay.partialPaidAmount
                        )}
                      </div>
                      <div style={styles.dashboardPaymentMeta}>
                        {paymentDistributionDashboardDay.partialCount} reservas
                      </div>
                    </div>

                    <div
                      style={{
                        ...styles.dashboardPaymentCard,
                        borderColor: "#fecaca",
                      }}
                    >
                      <div style={styles.dashboardPaymentLabel}>
                        Saldo pendiente
                      </div>
                      <div
                        style={{
                          ...styles.dashboardPaymentAmount,
                          color: "#991b1b",
                        }}
                      >
                        {formatCurrency(
                          paymentDistributionDashboardDay.pendingAmount
                        )}
                      </div>
                      <div style={styles.dashboardPaymentMeta}>
                        {paymentDistributionDashboardDay.partialCount +
                          paymentDistributionDashboardDay.unpaidCount}{" "}
                        reservas con saldo
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: "12px",
                      paddingTop: "12px",
                      borderTop: `1px solid ${theme.border || "#bbf7d0"}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: "900",
                        marginBottom: "10px",
                      }}
                    >
                      Métodos de pago
                    </div>

                    <div style={styles.dashboardPaymentGrid}>
                      <div style={styles.dashboardPaymentCard}>
                        <div style={styles.dashboardPaymentLabel}>
                          Transferencia
                        </div>
                        <div style={styles.dashboardPaymentAmount}>
                          {formatCurrency(
                            paymentDistributionDashboardDay.transferenciaAmount
                          )}
                        </div>
                      </div>

                      <div style={styles.dashboardPaymentCard}>
                        <div style={styles.dashboardPaymentLabel}>Débito</div>
                        <div style={styles.dashboardPaymentAmount}>
                          {formatCurrency(
                            paymentDistributionDashboardDay.debitoAmount
                          )}
                        </div>
                      </div>

                      <div style={styles.dashboardPaymentCard}>
                        <div style={styles.dashboardPaymentLabel}>Efectivo</div>
                        <div style={styles.dashboardPaymentAmount}>
                          {formatCurrency(
                            paymentDistributionDashboardDay.efectivoAmount
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={styles.dashboardReviewPanel}>
                    <div style={styles.dashboardPaymentHeader}>
                      <div style={{ fontWeight: "900", fontSize: "13px" }}>
                        Pagadas pendientes de atencion
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>
                        {paidReservationsPendingAttention.length} por revisar
                      </div>
                    </div>

                    {paidReservationsPendingAttention.length === 0 ? (
                      <div
                        style={{
                          backgroundColor: "#ffffff",
                          border: "1px dashed #cbd5e1",
                          borderRadius: "12px",
                          color: "#64748b",
                          fontSize: "13px",
                          fontWeight: "700",
                          padding: "12px",
                        }}
                      >
                        Sin reservas pagadas pendientes de atencion para este dia.
                      </div>
                    ) : (
                      <div style={styles.dashboardReviewList}>
                        {paidReservationsPendingAttention.map((appointment) => {
                          const appointmentDate = String(
                            appointment.date || ""
                          ).slice(0, 10);
                          const appointmentTime = String(
                            appointment.time || ""
                          ).slice(0, 5);

                          return (
                            <div
                              key={appointment.id}
                              style={styles.dashboardReviewItem}
                            >
                              <div style={{ minWidth: 0 }}>
                                <div
                                  style={{
                                    fontWeight: "900",
                                    fontSize: "14px",
                                    color: "#111827",
                                  }}
                                >
                                  {appointment.name || "Cliente sin nombre"}
                                </div>
                                <div
                                  style={{
                                    color: "#475569",
                                    fontSize: "12px",
                                    fontWeight: "700",
                                    marginTop: "3px",
                                  }}
                                >
                                  {appointmentTime} · {appointment.barber || "-"}
                                </div>
                                <div
                                  style={{
                                    color: "#64748b",
                                    fontSize: "12px",
                                    marginTop: "3px",
                                  }}
                                >
                                  {appointmentDate} ·{" "}
                                  {formatCurrency(
                                    getAppointmentTotalAmount(appointment)
                                  )}
                                </div>
                              </div>

                              <div style={styles.dashboardReviewActions}>
                                <button
                                  type="button"
                                  style={{
                                    ...styles.dashboardReviewButton,
                                    backgroundColor:
                                      theme.primary || "#16a34a",
                                    color: "#ffffff",
                                    opacity: submitting ? 0.7 : 1,
                                  }}
                                  onClick={() =>
                                    markAppointmentAsAttended(appointment)
                                  }
                                  disabled={submitting}
                                >
                                  Marcar atendida
                                </button>

                                <button
                                  type="button"
                                  style={{
                                    ...styles.dashboardReviewButton,
                                    backgroundColor: "#e5e7eb",
                                    color: "#111827",
                                  }}
                                  onClick={() => openPaymentPanel(appointment)}
                                >
                                  Ver pago
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
                    </>
                  )}
                  </>
              )}

              {clinicalRecordsEnabled && (
                <ClinicalRecordsPanel
                  styles={styles}
                  business={mergedBusiness}
                  appointments={appointments}
                  currentUser={currentUser}
                  isMobile={isMobile}
                />
              )}

              <div style={styles.topBar}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <h2 style={{ margin: 0 }}>Vista semanal</h2>

                  <input
                    style={{ ...styles.input, minWidth: "220px" }}
                    type="text"
                    placeholder="Buscar por cliente"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                  />

                  {isProfessionalSession ? (
                    <select
                      style={{ ...styles.select, minWidth: "220px" }}
                      value={professionalResourceName}
                      disabled
                    >
                      <option value={professionalResourceName}>
                        {professionalResourceName}
                      </option>
                    </select>
                  ) : (
                    <select
                      style={{ ...styles.select, minWidth: "220px" }}
                      value={weeklyBarberFilter}
                      onChange={(e) => setWeeklyBarberFilter(e.target.value)}
                    >
                      <option value="">
                        {`Todos los ${(
                          mergedBusiness?.resourceLabelPlural || "recursos"
                        ).toLowerCase()}`}
                      </option>
                      {BARBERS.map((barberName) => (
                        <option key={barberName} value={barberName}>
                          {barberName}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div style={styles.weekActions}>
                  <button
                    style={{ ...styles.button, ...styles.secondaryButton }}
                    onClick={goToPreviousWeek}
                  >
                    {"← Semana anterior"}
                  </button>
                  <button
                    style={{ ...styles.button, ...styles.primaryButton }}
                    onClick={goToCurrentWeek}
                  >
                    Semana actual
                  </button>
                  <button
                    style={{ ...styles.button, ...styles.secondaryButton }}
                    onClick={goToNextWeek}
                  >
                    {"Semana siguiente →"}
                  </button>
                </div>
              </div>

              <WeeklyCalendar
                styles={styles}
                business={adminCalendarBusiness}
                loading={loading}
                isMobile={isMobile}
                weekDays={weekDays}
                selectedMobileDay={selectedMobileDay}
                setSelectedMobileDay={setSelectedMobileDay}
                formatDateToInput={formatDateToInput}
                formatHourLabel={(hour) =>
                  typeof hour === "string" ? hour : formatHourLabel(hour)
                }
                sameDate={sameDate}
                date={date}
                time={time}
                hours={hours}
                mobileSlots={mobileSlots}
                clientSearch={clientSearch}
                mobileClientSearchResults={mobileClientSearchResults}
                isBarberSelected={true}
                selectSlot={selectSlot}
                setDate={setDate}
                setTime={setTime}
                setBarber={setBarber}
                getAppointmentsForSlot={getAppointmentsForSlot}
                getBlocksForSlot={(dayValue, hourValue, resourceName) =>
                  getBlocksForSlot(
                    dayValue,
                    hourValue,
                    resourceName || effectiveWeeklyBarberFilter || barber
                  )
                }
                getBarberColors={getBarberColors}
                isClientMode={false}
                barber={barber}
                editAppointment={editAppointment}
                deleteAppointment={deleteAppointment}
                markAppointmentAsAttended={markAppointmentAsAttended}
                markAppointmentAsNoShow={markAppointmentAsNoShow}
                submitting={submitting}
                isPastSlot={isPastSlot}
                isPastDayOnly={isPastDayOnly}
                isScheduleSlotAvailable={isScheduleSlotAvailable}
                openPaymentPanel={openPaymentPanel}
              />
            </div>
          </div>
        )}

        <AgendaSmartFooter isMobile={isMobile} theme={theme} />

        {reservationVoucher && (
          <ReservationVoucherModal
            voucher={reservationVoucher}
            business={mergedBusiness}
            theme={theme}
            isMobile={isMobile}
            onClose={() => setReservationVoucher(null)}
          />
        )}

        {isAdminMode && paymentsEnabled && paymentAppointment && (
          <div style={styles.paymentModalOverlay} onClick={closePaymentPanel}>
            <div
              style={styles.paymentModalCard}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "16px",
                  marginBottom: "18px",
                  flexWrap: "wrap",
                  ...(isMobile && mergedBusiness?.id === "giocata"
                    ? {
                        position: "sticky",
                        top: "-16px",
                        zIndex: 5,
                        margin: "-16px -16px 18px",
                        padding: "14px 16px 12px",
                        backgroundColor: theme.cardBackground || "#fff",
                        borderBottom: `1px solid ${
                          theme.border || "#bbf7d0"
                        }`,
                      }
                    : {}),
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "22px",
                      fontWeight: "900",
                      color: "#111827",
                    }}
                  >
                    Pagos de la reserva
                  </h3>

                  {isMobile && mergedBusiness?.id === "giocata" && (
                    <p
                      style={{
                        margin: "8px 0 0",
                        color: "#64748b",
                        fontSize: "15px",
                        lineHeight: 1.35,
                      }}
                    >
                      <strong style={{ color: "#111827" }}>
                        {paymentAppointment?.name}
                      </strong>{" "}
                      ·{" "}
                      {paymentAppointment?.date
                        ? new Date(paymentAppointment.date).toLocaleDateString(
                            "es-CL"
                          )
                        : ""}{" "}
                      · {String(paymentAppointment?.time || "").slice(0, 5)}
                    </p>
                  )}

                  <p
                    style={{
                      display:
                        isMobile && mergedBusiness?.id === "giocata"
                          ? "none"
                          : "block",
                      margin: "8px 0 0",
                      color: "#64748b",
                      fontSize: "15px",
                      lineHeight: 1.35,
                    }}
                  >
                    <strong style={{ color: "#111827" }}>
                      {paymentAppointment?.name}
                    </strong>{" "}
                    · {paymentAppointment?.service} ·{" "}
                    {paymentAppointment?.date
                      ? new Date(paymentAppointment.date).toLocaleDateString(
                          "es-CL"
                        )
                      : ""}{" "}
                    · {String(paymentAppointment?.time || "").slice(0, 5)}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                      marginTop: "12px",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        backgroundColor: activeReservationStatusMeta.background,
                        border: `1px solid ${activeReservationStatusMeta.border}`,
                        color: activeReservationStatusMeta.color,
                        borderRadius: "999px",
                        padding: "6px 10px",
                        fontSize: "12px",
                        fontWeight: "900",
                      }}
                    >
                      <span>{activeReservationStatusMeta.icon}</span>
                      Reserva: {activeReservationStatusMeta.label}
                    </span>

                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        backgroundColor: activePaymentStatusMeta.background,
                        border: `1px solid ${activePaymentStatusMeta.border}`,
                        color: activePaymentStatusMeta.color,
                        borderRadius: "999px",
                        padding: "6px 10px",
                        fontSize: "12px",
                        fontWeight: "900",
                      }}
                    >
                      <span>{activePaymentStatusMeta.icon}</span>
                      Pago: {activePaymentStatusMeta.label}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  style={{
                    ...styles.button,
                    ...(isMobile && mergedBusiness?.id === "giocata"
                      ? {
                          width: "100%",
                          minHeight: "48px",
                          padding: "12px 16px",
                          borderRadius: "12px",
                          border: `2px solid ${
                            theme.primaryDark || "#14532d"
                          }`,
                          backgroundColor: theme.primaryDark || "#14532d",
                          color: "#fff",
                          fontSize: "16px",
                          fontWeight: "900",
                          boxShadow: "0 10px 24px rgba(20, 83, 45, 0.22)",
                        }
                      : styles.secondaryButton),
                  }}
                  onClick={closePaymentPanel}
                >
                  X Cerrar
                </button>
              </div>

              {paymentPanelError && (
                <p
                  style={{
                    marginTop: 0,
                    marginBottom: "16px",
                    color: "#b42318",
                    fontWeight: "800",
                  }}
                >
                  {paymentPanelError}
                </p>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "1fr"
                    : "repeat(4, minmax(0, 1fr))",
                  gap: "10px",
                  marginBottom: "14px",
                }}
              >
                <div style={styles.paymentSummaryCard}>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      marginBottom: "4px",
                      fontWeight: "700",
                    }}
                  >
                    Total
                  </div>
                  <div style={{ fontWeight: "900", fontSize: "20px" }}>
                    {formatCurrency(selectedReservationTotal)}
                  </div>
                </div>

                <div style={styles.paymentSummaryCard}>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      marginBottom: "4px",
                      fontWeight: "700",
                    }}
                  >
                    Pagado
                  </div>
                  <div style={{ fontWeight: "900", fontSize: "20px" }}>
                    {formatCurrency(selectedPaymentTotal)}
                  </div>
                </div>

                <div style={styles.paymentSummaryCard}>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      marginBottom: "4px",
                      fontWeight: "700",
                    }}
                  >
                    Saldo
                  </div>
                  <div style={{ fontWeight: "900", fontSize: "20px" }}>
                    {formatCurrency(selectedPendingBalance)}
                  </div>
                </div>

                <div style={styles.paymentSummaryCard}>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      marginBottom: "4px",
                      fontWeight: "700",
                    }}
                  >
                    Estado
                  </div>
                  <div
                    style={{
                      fontWeight: "900",
                      fontSize: "16px",
                      color: activePaymentStatusMeta.color,
                    }}
                  >
                    {selectedPaymentStatusLabel}
                  </div>
                </div>
              </div>

              {depositFeatureEnabled && (
                <p
                  style={{
                    marginTop: 0,
                    marginBottom: "16px",
                    color: "#64748b",
                    fontSize: "14px",
                  }}
                >
                  Abono sugerido/requerido:{" "}
                  <strong>{formatCurrency(selectedRequiredDeposit)}</strong>
                </p>
              )}

              <div
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "14px",
                  padding: "12px",
                  backgroundColor: "#f8fafc",
                  marginBottom: "16px",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile
                      ? "1fr"
                      : "repeat(5, minmax(0, 1fr))",
                    gap: "10px",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>
                      Cliente
                    </div>
                    <div style={{ fontWeight: "900", color: "#111827" }}>
                      {paymentAppointment?.name || "-"}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>
                      Celular
                    </div>
                    {paymentAppointmentWhatsappUrl ? (
                      <a
                        href={paymentAppointmentWhatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontWeight: "900",
                          color: "#166534",
                          textDecoration: "none",
                          display: "inline-block",
maxWidth: "100%",
whiteSpace: "normal",
wordBreak: "break-word",
lineHeight: 1.2,
                        }}
                      >
                        {paymentAppointmentPhoneDisplay}
                      </a>
                    ) : (
                      <div style={{ fontWeight: "900", color: "#111827" }}>
                        -
                      </div>
                    )}
                  </div>

                  {isMobile && (
  <div>
    <div style={{ fontSize: "11px", color: "#64748b" }}>
      Fecha · Hora
    </div>

    <div style={{ fontWeight: "900", color: "#111827" }}>
      {paymentAppointment?.date
        ? new Date(paymentAppointment.date).toLocaleDateString("es-CL")
        : "—"}{" "}
      · {String(paymentAppointment?.time || "").slice(0, 5) || "—"}
    </div>
  </div>
)}

                  {!isMobile && (
  <div>
    <div style={{ fontSize: "11px", color: "#64748b" }}>
      Fecha
    </div>

    <div style={{ fontWeight: "900", color: "#111827" }}>
      {paymentAppointment?.date
        ? new Date(paymentAppointment.date).toLocaleDateString("es-CL")
        : "—"}
    </div>
  </div>
)}

                  {!isMobile && (
  <div>
    <div style={{ fontSize: "11px", color: "#64748b" }}>
      Hora
    </div>

    <div style={{ fontWeight: "900", color: "#111827" }}>
      {String(paymentAppointment?.time || "").slice(0, 5) || "—"}
    </div>
  </div>
)}

                  <div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>
                      Servicio
                    </div>
                    <div
                      style={{
                        fontWeight: "900",
                        color: "#111827",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {paymentAppointment?.service || "-"}
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "1fr 1fr"
                    : "repeat(4, minmax(0, 1fr))",
                  gap: "10px",
                  marginBottom: "18px",
                }}
              >
                <button
                  type="button"
                  style={{
                    ...styles.button,
                    backgroundColor: "#dcfce7",
                    color: "#166534",
                    border: "1px solid #86efac",
                    opacity: submitting ? 0.7 : 1,
                  }}
                  onClick={() =>
                    handleReservationStatusFromPaymentPanel("atendida")
                  }
                  disabled={submitting}
                >
                  ✓ Atendida
                </button>

                <button
                  type="button"
                  style={{
                    ...styles.button,
                    backgroundColor: "#fee2e2",
                    color: "#991b1b",
                    border: "1px solid #fca5a5",
                    opacity: submitting ? 0.7 : 1,
                  }}
                  onClick={() =>
                    handleReservationStatusFromPaymentPanel("no_asistio")
                  }
                  disabled={submitting}
                >
                  ✕ No asistió
                </button>

                <button
                  type="button"
                  style={{
                    ...styles.button,
                    ...styles.editButton,
                    opacity: submitting ? 0.7 : 1,
                  }}
                  onClick={handleEditReservationFromPaymentPanel}
                  disabled={submitting}
                >
                  Editar reserva
                </button>

                <button
                  type="button"
                  style={{
                    ...styles.button,
                    ...styles.dangerButton,
                    opacity: submitting ? 0.7 : 1,
                  }}
                  onClick={handleDeleteReservationFromPaymentPanel}
                  disabled={submitting}
                >
                  Eliminar reserva
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1.05fr 0.95fr",
                  gap: "18px",
                  alignItems: "start",
                }}
              >
                <div>
                  <h4 style={{ margin: "0 0 10px", fontSize: "17px" }}>
                    Historial de pagos
                  </h4>

                  {loadingPayments ? (
                    <p style={{ marginTop: 0 }}>Cargando pagos...</p>
                  ) : selectedAppointmentPayments.length === 0 ? (
                    <div
                      style={{
                        border: "1px dashed #cbd5e1",
                        borderRadius: "14px",
                        padding: "16px",
                        backgroundColor: "#f8fafc",
                        color: "#64748b",
                        fontWeight: "700",
                      }}
                    >
                      Aún no hay pagos registrados para esta reserva.
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: "10px" }}>
                      {selectedAppointmentPayments.map((payment) => {
                        const isEditingThisPayment =
                          editingPaymentId === payment.id;
                        const stageLabel = getPaymentStageLabel(
                          payment.payment_stage
                        );
                        const isDeposit = payment.payment_stage === "deposit";

                        return (
                          <div
                            key={payment.id}
                            style={{
                              ...styles.paymentHistoryItem,
                              border: isEditingThisPayment
                                ? "2px solid #2563eb"
                                : "1px solid #e2e8f0",
                              backgroundColor: isEditingThisPayment
                                ? "#eff6ff"
                                : "#ffffff",
                              boxShadow: "0 4px 14px rgba(15,23,42,0.05)",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: "10px",
                                alignItems: "flex-start",
                                flexWrap: "wrap",
                              }}
                            >
                              <div>
                                <div
                                  style={{
                                    fontWeight: "900",
                                    fontSize: "22px",
                                    lineHeight: 1,
                                    color: "#111827",
                                  }}
                                >
                                  {formatCurrency(payment.amount)}
                                </div>

                                <div
                                  style={{
                                    display: "flex",
                                    gap: "7px",
                                    flexWrap: "wrap",
                                    marginTop: "10px",
                                  }}
                                >
                                  <span
                                    style={{
                                      backgroundColor: "#eff6ff",
                                      border: "1px solid #bfdbfe",
                                      color: "#1d4ed8",
                                      borderRadius: "999px",
                                      padding: "4px 9px",
                                      fontSize: "12px",
                                      fontWeight: "900",
                                    }}
                                  >
                                    {getPaymentMethodLabel(payment.method)}
                                  </span>

                                  <span
                                    style={{
                                      backgroundColor: isDeposit
                                        ? "#fef3c7"
                                        : "#dcfce7",
                                      border: isDeposit
                                        ? "1px solid #fcd34d"
                                        : "1px solid #86efac",
                                      color: isDeposit ? "#92400e" : "#166534",
                                      borderRadius: "999px",
                                      padding: "4px 9px",
                                      fontSize: "12px",
                                      fontWeight: "900",
                                    }}
                                  >
                                    {stageLabel}
                                  </span>
                                </div>
                              </div>

                              {payment.created_at && (
                                <div
                                  style={{
                                    fontSize: "11px",
                                    color: "#94a3b8",
                                    fontWeight: "800",
                                    textAlign: "right",
                                  }}
                                >
                                  {String(payment.created_at).slice(0, 10)}
                                </div>
                              )}
                            </div>

                            {payment.notes ? (
                              <div
                                style={{
                                  marginTop: "10px",
                                  color: "#475569",
                                  fontSize: "14px",
                                  lineHeight: 1.3,
                                }}
                              >
                                ðŸ“ {payment.notes}
                              </div>
                            ) : null}

                            <div
                              style={{
                                display: "flex",
                                gap: "8px",
                                marginTop: "12px",
                                flexWrap: "wrap",
                              }}
                            >
                              <button
                                type="button"
                                style={{
                                  ...styles.tinyButton,
                                  ...styles.editButton,
                                  flex: 1,
                                  minWidth: "90px",
                                }}
                                onClick={() => handleEditPaymentClick(payment)}
                              >
                                Editar pago
                              </button>

                              <button
                                type="button"
                                style={{
                                  ...styles.tinyButton,
                                  ...styles.dangerButton,
                                  flex: 1,
                                  minWidth: "90px",
                                }}
                                onClick={() => handleDeletePayment(payment)}
                              >
                                Eliminar pago
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "16px",
                    padding: "16px",
                    backgroundColor: "#ffffff",
                    boxShadow: "0 4px 14px rgba(15,23,42,0.05)",
                  }}
                >
                  <h4 style={{ margin: "0 0 12px", fontSize: "17px" }}>
                    {editingPaymentId ? "Editar pago" : "Registrar nuevo pago"}
                  </h4>

                  <div style={{ display: "grid", gap: "10px" }}>
                    <input
                      style={styles.input}
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Monto del pago"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                    />

                    <select
                      style={styles.select}
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      {paymentMethods.map((method) => (
                        <option key={method} value={method}>
                          {getPaymentMethodLabel(method)}
                        </option>
                      ))}
                    </select>

                    <select
                      style={styles.select}
                      value={paymentStage}
                      onChange={(e) => setPaymentStage(e.target.value)}
                    >
                      {depositFeatureEnabled ? (
                        <>
                          <option value="deposit">
                            {depositOptional ? "Abono (opcional)" : "Abono"}
                          </option>
                          <option value="balance">Saldo</option>
                          <option value="full">Pago completo</option>
                        </>
                      ) : (
                        <option value="full">Pago completo</option>
                      )}
                    </select>

                    <input
                      style={styles.input}
                      placeholder="Observación del pago"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                    />

                    <button
                      type="button"
                      style={{ ...styles.button, ...styles.primaryButton }}
                      onClick={handleSavePayment}
                    >
                      {editingPaymentId ? "Actualizar pago" : "Registrar pago"}
                    </button>

                    {editingPaymentId && (
                      <button
                        type="button"
                        style={{ ...styles.button, ...styles.secondaryButton }}
                        onClick={handleCancelPaymentEdit}
                      >
                        Cancelar edición
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}


      </div>
    </>
  );
}

export default App;
