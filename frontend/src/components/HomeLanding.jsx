import React from "react";
import {
  FaWhatsapp,
  FaArrowRight,
  FaCalendarAlt,
  FaCheckCircle,
  FaChartLine,
  FaUsers,
  FaClock,
  FaLaptop,
  FaCut,
  FaCog,
} from "react-icons/fa";

const containerStyle = {
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "0 20px",
};

const titleStyle = {
  fontSize: "40px",
  lineHeight: 1.08,
  margin: "0 0 18px 0",
  color: "#111827",
};

const textStyle = {
  fontSize: "18px",
  lineHeight: 1.65,
  color: "#4b5563",
  margin: 0,
};

const mobileMediaQuery = "(max-width: 767px)";

function LandingMotionStyles() {
  return (
    <style>{`
      @keyframes landingMockupFloat {
        0%, 100% {
          transform: translate3d(0, 0, 0);
        }

        50% {
          transform: translate3d(0, -8px, 0);
        }
      }

      @keyframes landingGlowPulse {
        0%, 100% {
          opacity: 0.7;
          transform: scale(1);
        }

        50% {
          opacity: 1;
          transform: scale(1.04);
        }
      }

      @keyframes landingWhatsappPulse {
        0%, 100% {
          box-shadow:
            0 10px 24px rgba(34, 197, 94, 0.22),
            0 0 0 0 rgba(34, 197, 94, 0.28);
        }

        50% {
          box-shadow:
            0 14px 30px rgba(34, 197, 94, 0.28),
            0 0 0 10px rgba(34, 197, 94, 0);
        }
      }

      .landing-reveal {
        opacity: 0;
        transform: translateY(24px);
        transition: opacity 680ms ease, transform 680ms ease;
        will-change: opacity, transform;
      }

      .landing-reveal.is-visible {
        opacity: 1;
        transform: translateY(0);
      }

      .landing-mockup-motion {
        animation: landingMockupFloat 7s ease-in-out infinite;
        will-change: transform;
      }

      .landing-mockup-motion-delay {
        animation-delay: 900ms;
      }

      .landing-mockup-glow {
        animation: landingGlowPulse 7s ease-in-out infinite;
        transform-origin: center;
      }

      .landing-card-hover {
        transition:
          transform 190ms ease,
          box-shadow 190ms ease,
          border-color 190ms ease,
          background-color 190ms ease;
      }

      .landing-card-hover:hover {
        transform: translateY(-5px);
        border-color: #bbf7d0 !important;
        box-shadow: 0 18px 38px rgba(15, 23, 42, 0.10) !important;
      }

      .landing-card-hover:focus-visible {
        outline: 3px solid rgba(34, 197, 94, 0.28);
        outline-offset: 4px;
      }

      .landing-feature-icon,
      .landing-business-logo,
      .landing-card-arrow,
      .landing-compatible-card {
        transition:
          transform 190ms ease,
          background-color 190ms ease,
          border-color 190ms ease,
          color 190ms ease;
      }

      .landing-card-hover:hover .landing-feature-icon {
        transform: scale(1.06);
        background-color: #dcfce7 !important;
        color: #16a34a !important;
      }

      .landing-card-hover:hover .landing-business-logo {
        transform: scale(1.06);
      }

      .landing-card-hover:hover .landing-card-arrow {
        transform: translateX(4px);
      }

      .landing-compatible-card:hover {
        transform: translateY(-3px);
        border-color: #bbf7d0 !important;
        background-color: #ffffff !important;
      }

      .landing-compatible-card.is-selected:hover {
        background-color: #dcfce7 !important;
        border-color: #86efac !important;
      }

      .landing-preview-button {
        transition:
          transform 160ms ease,
          background-color 160ms ease,
          border-color 160ms ease,
          color 160ms ease;
      }

      .landing-preview-button:hover {
        transform: translateY(-2px);
      }

      .landing-whatsapp-pulse {
        animation: landingWhatsappPulse 2.8s ease-in-out infinite;
      }

      .landing-whatsapp-pulse:hover {
        animation-play-state: paused;
      }

      @media (prefers-reduced-motion: reduce) {
        .landing-reveal {
          opacity: 1;
          transform: none;
          transition: none;
        }

        .landing-mockup-motion,
        .landing-mockup-glow,
        .landing-whatsapp-pulse {
          animation: none;
          transform: none;
        }

        .landing-card-hover,
        .landing-feature-icon,
        .landing-business-logo,
        .landing-card-arrow,
        .landing-compatible-card,
        .landing-preview-button {
          transition: none;
        }

        .landing-card-hover:hover,
        .landing-card-hover:hover .landing-feature-icon,
        .landing-card-hover:hover .landing-business-logo,
        .landing-card-hover:hover .landing-card-arrow,
        .landing-compatible-card:hover,
        .landing-preview-button:hover {
          transform: none;
        }
      }
    `}</style>
  );
}

function useLandingIsMobile() {
  const [isMobile, setIsMobile] = React.useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia(mobileMediaQuery).matches
      : false
  );

  React.useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const mediaQuery = window.matchMedia(mobileMediaQuery);
    const handleChange = (event) => setIsMobile(event.matches);

    setIsMobile(mediaQuery.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  return isMobile;
}

function Reveal({ children, delay = 0, style }) {
  const ref = React.useRef(null);
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const node = ref.current;

    if (!node) return undefined;

    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setIsVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -60px 0px" }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`landing-reveal${isVisible ? " is-visible" : ""}`}
      style={{
        transitionDelay: `${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function parseMetricValue(value) {
  const text = String(value);
  const prefix = text.startsWith("$") || text.startsWith("+") ? text[0] : "";
  const suffix = text.endsWith("%") ? "%" : "";
  const target = Number(text.replace(/[^\d]/g, "")) || 0;

  return { prefix, suffix, target };
}

function formatMetricValue(value, { prefix, suffix }) {
  return `${prefix}${Math.round(value).toLocaleString("es-CL")}${suffix}`;
}

function AnimatedMetricValue({ value }) {
  const ref = React.useRef(null);
  const metric = React.useMemo(() => parseMetricValue(value), [value]);
  const [displayValue, setDisplayValue] = React.useState(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return String(value);
    }

    return formatMetricValue(0, metric);
  });

  React.useEffect(() => {
    const node = ref.current;

    if (!node) return undefined;

    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    ) {
      setDisplayValue(String(value));
      return undefined;
    }

    let frameId;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;

        observer.unobserve(entry.target);

        const duration = 1150;
        const startTime = window.performance.now();

        const animate = (time) => {
          const progress = Math.min((time - startTime) / duration, 1);
          const easedProgress = 1 - Math.pow(1 - progress, 3);

          setDisplayValue(
            formatMetricValue(metric.target * easedProgress, metric)
          );

          if (progress < 1) {
            frameId = window.requestAnimationFrame(animate);
          }
        };

        frameId = window.requestAnimationFrame(animate);
      },
      { threshold: 0.45 }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();

      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [metric, value]);

  return <span ref={ref}>{displayValue}</span>;
}

const exampleBusinesses = [
  {
    name: "Canchas Giocata",
    category: "Canchas deportivas",
    description: "Reserva de canchas, pagos, estados y partidos abiertos.",
    href: "/giocata",
    logo: "/giocata/giocata-logo-optimized.jpg",
  },
  {
    name: "Urban District Barber",
    category: "Barbería",
    description: "Flujo de reserva para servicios, horarios y clientes.",
    href: "/urban-district-barber",
    logo: "/urban-district-barber/logo-james.jpg",
  },
];

const compatibleIndustries = [
  {
    id: "medical",
    icon: <FaUsers />,
    label: "Centros médicos",
    description:
      "Agenda por profesional, box o especialidad, con servicios de distinta duración y control de asistencia.",
    items: ["Profesionales y recursos", "Duración por prestación", "Historial de pacientes"],
  },
  {
    id: "sports",
    icon: <FaCalendarAlt />,
    label: "Complejos deportivos",
    description:
      "Reservas por cancha, horario y tipo de espacio, incluyendo pagos, estados y partidos abiertos.",
    items: ["Canchas y horarios", "Pagos y saldos", "Búsqueda de rival"],
  },
  {
    id: "barbers",
    icon: <FaCut />,
    label: "Barberías",
    description:
      "Agenda simple para servicios por barbero, clientes frecuentes y administración diaria del negocio.",
    items: ["Servicios por barbero", "Clientes frecuentes", "Estados de atención"],
  },
  {
    id: "more",
    icon: <FaCheckCircle />,
    label: "Más rubros",
    description:
      "El flujo puede adaptarse a negocios que trabajan con horarios, servicios, recursos o reservas recurrentes.",
    items: ["Servicios personalizados", "Reglas por negocio", "Reportes operativos"],
  },
];

function Badge({ children }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        backgroundColor: "#e8f7ee",
        color: "#15803d",
        padding: "8px 14px",
        borderRadius: "999px",
        fontWeight: "bold",
        fontSize: "14px",
        marginBottom: "18px",
      }}
    >
      <FaCheckCircle size={14} />
      {children}
    </div>
  );
}

function PrimaryButton({ isMobile = false }) {
  return (
    <a
      className="landing-whatsapp-pulse"
      href="https://wa.me/56988287547?text=Hola,%20quiero%20una%20demo%20de%20AgendaSmart"
      target="_blank"
      rel="noopener noreferrer"
      style={{
        backgroundColor: "#22c55e",
        color: "#ffffff",
        textDecoration: "none",
        padding: "15px 20px",
        borderRadius: "12px",
        fontWeight: "bold",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        boxShadow: "0 10px 24px rgba(34,197,94,0.22)",
        width: isMobile ? "100%" : "auto",
        boxSizing: "border-box",
        textAlign: "center",
      }}
    >
      <FaWhatsapp size={20} />
      Comunícate con nosotros
    </a>
  );
}

function SecondaryButton({ isMobile = false }) {
  const scrollToExamples = (event) => {
    const section = document.getElementById("negocios");

    if (section) {
      event.preventDefault();
      section.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  return (
    <a
      href="#negocios"
      onClick={scrollToExamples}
      style={{
        backgroundColor: "#ffffff",
        color: "#111827",
        textDecoration: "none",
        padding: "15px 20px",
        borderRadius: "12px",
        fontWeight: "bold",
        border: "1px solid #d1d5db",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        width: isMobile ? "100%" : "auto",
        boxSizing: "border-box",
        textAlign: "center",
      }}
    >
      Ver ejemplos reales
      <FaArrowRight size={14} />
    </a>
  );
}

function FeatureMini({ icon, title, text }) {
  return (
    <div
      className="landing-card-hover"
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "18px",
        padding: "18px",
        boxShadow: "0 8px 20px rgba(15,23,42,0.04)",
      }}
    >
      <div
        className="landing-feature-icon"
        style={{
          width: "42px",
          height: "42px",
          borderRadius: "12px",
          backgroundColor: "#e8f0ff",
          color: "#1d4ed8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "12px",
        }}
      >
        {icon}
      </div>

      <div
        style={{
          fontWeight: "bold",
          fontSize: "18px",
          marginBottom: "8px",
          color: "#111827",
        }}
      >
        {title}
      </div>

      <div
        style={{
          color: "#6b7280",
          fontSize: "15px",
          lineHeight: 1.6,
        }}
      >
        {text}
      </div>
    </div>
  );
}

function StepItem({ number, text }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "14px",
      }}
    >
      <div
        style={{
          width: "38px",
          height: "38px",
          minWidth: "38px",
          borderRadius: "50%",
          backgroundColor: "#f3f4f6",
          color: "#374151",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: "bold",
          fontSize: "16px",
        }}
      >
        {number}
      </div>

      <div
        style={{
          fontSize: "18px",
          color: "#374151",
          fontWeight: 500,
        }}
      >
        {text}
      </div>
    </div>
  );
}

function AdminPoint({ icon, title, text }) {
  return (
    <div
      style={{
        display: "flex",
        gap: "14px",
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          minWidth: "40px",
          borderRadius: "50%",
          backgroundColor: "#edfdf3",
          color: "#16a34a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: "2px",
        }}
      >
        {icon}
      </div>

      <div>
        <div
          style={{
            fontWeight: "bold",
            color: "#111827",
            fontSize: "17px",
            marginBottom: "4px",
          }}
        >
          {title}
        </div>

        <div
          style={{
            color: "#6b7280",
            lineHeight: 1.6,
            fontSize: "15px",
          }}
        >
          {text}
        </div>
      </div>
    </div>
  );
}

function BrowserMockup({
  src = "/agendasmart/agendasmart-hero-right.png",
  alt = "Vista de AgendaSmart",
  isMobile = false,
  animated = false,
  previewOptions,
}) {
  const [activePreviewIndex, setActivePreviewIndex] = React.useState(0);
  const hasPreviewOptions = Array.isArray(previewOptions) && previewOptions.length > 0;
  const activePreview = hasPreviewOptions
    ? previewOptions[activePreviewIndex] || previewOptions[0]
    : { src, alt };

  return (
    <div
      className={animated ? "landing-mockup-motion" : undefined}
      style={{
        position: "relative",
        width: "100%",
        maxWidth: "620px",
        margin: "0 auto",
      }}
    >
      <div
        className={animated ? "landing-mockup-glow" : undefined}
        style={{
          position: "absolute",
          inset: "6% 4% auto 4%",
          height: "82%",
          borderRadius: "40px",
          background:
            "radial-gradient(circle at center, rgba(34,197,94,0.14) 0%, rgba(255,255,255,0) 72%)",
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          backgroundColor: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: isMobile ? "18px" : "28px",
          boxShadow: isMobile
            ? "0 18px 40px rgba(15,23,42,0.10)"
            : "0 28px 70px rgba(15,23,42,0.12)",
          overflow: "hidden",
          aspectRatio: "4 / 3",
        }}
      >
        <img
          key={activePreview.src}
          src={activePreview.src}
          alt={activePreview.alt}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            objectFit: "cover",
          }}
        />
      </div>

      {hasPreviewOptions && (
        <div
          style={{
            position: "absolute",
            left: isMobile ? "12px" : "18px",
            right: isMobile ? "12px" : "18px",
            bottom: isMobile ? "12px" : "18px",
            zIndex: 2,
            display: "flex",
            justifyContent: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          {previewOptions.map((option, index) => {
            const isActive = index === activePreviewIndex;

            return (
              <button
                key={option.label}
                type="button"
                className="landing-preview-button"
                onClick={() => setActivePreviewIndex(index)}
                aria-pressed={isActive}
                style={{
                  border: isActive
                    ? "1px solid rgba(22,101,52,0.32)"
                    : "1px solid rgba(229,231,235,0.92)",
                  backgroundColor: isActive
                    ? "rgba(220,252,231,0.94)"
                    : "rgba(255,255,255,0.88)",
                  color: isActive ? "#166534" : "#374151",
                  borderRadius: "999px",
                  padding: isMobile ? "7px 10px" : "8px 12px",
                  fontWeight: 800,
                  fontSize: isMobile ? "12px" : "13px",
                  boxShadow: "0 8px 22px rgba(15,23,42,0.10)",
                  cursor: "pointer",
                  backdropFilter: "blur(10px)",
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PhoneMockup({ isMobile = false, animated = false }) {
  return (
    <img
      className={
        animated
          ? "landing-mockup-motion landing-mockup-motion-delay"
          : undefined
      }
      src="/agendasmart/agendasmart-booking-preview.svg"
      alt="Vista previa del flujo de reserva AgendaSmart"
      style={{
        width: isMobile ? "min(100%, 340px)" : "330px",
        maxWidth: "100%",
        display: "block",
        margin: "0 auto",
        borderRadius: "28px",
        boxShadow: "0 30px 70px rgba(15,23,42,0.16)",
      }}
    />
  );
}

function BusinessExampleCard({ business }) {
  return (
    <a
      className="landing-card-hover"
      href={business.href}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        minHeight: "210px",
        padding: "22px",
        borderRadius: "18px",
        border: "1px solid #e5e7eb",
        backgroundColor: "#ffffff",
        textDecoration: "none",
        color: "#111827",
        boxShadow: "0 10px 26px rgba(15,23,42,0.05)",
      }}
    >
      <div
        style={{
          width: "62px",
          height: "62px",
          borderRadius: "14px",
          backgroundColor: "#f8fafc",
          border: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <img
          className="landing-business-logo"
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
        <div
          style={{
            fontSize: "13px",
            color: "#16a34a",
            fontWeight: "bold",
            marginBottom: "8px",
          }}
        >
          {business.category}
        </div>

        <div
          style={{
            fontSize: "21px",
            fontWeight: "bold",
            marginBottom: "8px",
          }}
        >
          {business.name}
        </div>

        <p
          style={{
            margin: 0,
            color: "#6b7280",
            lineHeight: 1.55,
            fontSize: "15px",
          }}
        >
          {business.description}
        </p>
      </div>

      <span
        className="landing-card-arrow"
        style={{
          marginTop: "auto",
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          color: "#111827",
          fontWeight: "bold",
        }}
      >
        Abrir agenda <FaArrowRight size={13} />
      </span>
    </a>
  );
}

function AnalyticsCard({ title, text, value }) {
  return (
    <div
      className="landing-card-hover"
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "18px",
        padding: "22px",
        boxShadow: "0 8px 20px rgba(15,23,42,0.04)",
      }}
    >
      <div
        style={{
          fontSize: "14px",
          color: "#6b7280",
          marginBottom: "10px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontWeight: "bold",
          fontSize: "28px",
          color: "#111827",
          marginBottom: "10px",
        }}
      >
        <AnimatedMetricValue value={value} />
      </div>

      <div
        style={{
          color: "#6b7280",
          lineHeight: 1.6,
          fontSize: "15px",
        }}
      >
        {text}
      </div>
    </div>
  );
}

function IndustryTabs({ isMobile = false }) {
  const [selectedId, setSelectedId] = React.useState(compatibleIndustries[0].id);
  const selectedIndustry =
    compatibleIndustries.find((industry) => industry.id === selectedId) ||
    compatibleIndustries[0];

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: "10px",
          marginBottom: "14px",
        }}
      >
        {compatibleIndustries.map((industry) => {
          const isSelected = industry.id === selectedIndustry.id;

          return (
            <button
              key={industry.id}
              type="button"
              onClick={() => setSelectedId(industry.id)}
              className={`landing-compatible-card${
                isSelected ? " is-selected" : ""
              }`}
              style={{
                backgroundColor: isSelected ? "#dcfce7" : "#ffffff",
                border: isSelected ? "1px solid #86efac" : "1px solid #e5e7eb",
                borderRadius: "14px",
                padding: "14px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                color: isSelected ? "#166534" : "#374151",
                fontWeight: "bold",
                cursor: "pointer",
                textAlign: "left",
                font: "inherit",
              }}
            >
              <span style={{ color: "#16a34a", display: "inline-flex" }}>
                {industry.icon}
              </span>
              {industry.label}
            </button>
          );
        })}
      </div>

      <div
        style={{
          background:
            "linear-gradient(135deg, rgba(34,197,94,0.10) 0%, rgba(255,255,255,0.96) 72%)",
          border: "1px solid #bbf7d0",
          borderRadius: "16px",
          padding: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            color: "#166534",
            fontWeight: "bold",
            marginBottom: "8px",
          }}
        >
          <span style={{ display: "inline-flex" }}>{selectedIndustry.icon}</span>
          {selectedIndustry.label}
        </div>

        <p
          style={{
            margin: "0 0 12px 0",
            color: "#4b5563",
            lineHeight: 1.55,
            fontSize: "14px",
          }}
        >
          {selectedIndustry.description}
        </p>

        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          {selectedIndustry.items.map((item) => (
            <span
              key={item}
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #d1fae5",
                borderRadius: "999px",
                color: "#166534",
                fontWeight: 700,
                fontSize: "12px",
                padding: "7px 10px",
              }}
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function FixedHeader({ isMobile = false }) {
  const scrollToSection = (sectionId) => (event) => {
    event.preventDefault();
    const section = document.getElementById(sectionId);

    if (section) {
      section.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        zIndex: 999,
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(229,231,235,0.9)",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: isMobile ? "10px 16px" : "14px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: isMobile ? "center" : "space-between",
          gap: isMobile ? "10px" : "16px",
          flexWrap: "wrap",
        }}
      >
        <a
          href="/"
          style={{
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
          }}
        >
          <img
            src="/agendasmart/agendasmart-horizontal.png"
            alt="AgendaSmart"
            style={{
              height: isMobile ? "44px" : "58px",
              width: "auto",
              display: "block",
              objectFit: "contain",
            }}
          />
        </a>

        <nav
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: isMobile ? "center" : "flex-start",
            gap: isMobile ? "10px" : "18px",
            flexWrap: "wrap",
            width: isMobile ? "100%" : "auto",
          }}
        >
          <a
            href="#clientes"
            onClick={scrollToSection("clientes")}
            style={{
              textDecoration: "none",
              color: "#4b5563",
              fontWeight: 600,
              fontSize: isMobile ? "13px" : "15px",
            }}
          >
            Clientes
          </a>

          <a
            href="#admin"
            onClick={scrollToSection("admin")}
            style={{
              textDecoration: "none",
              color: "#4b5563",
              fontWeight: 600,
              fontSize: isMobile ? "13px" : "15px",
            }}
          >
            Admin
          </a>

          <a
            href="#reportes"
            onClick={scrollToSection("reportes")}
            style={{
              textDecoration: "none",
              color: "#4b5563",
              fontWeight: 600,
              fontSize: isMobile ? "13px" : "15px",
            }}
          >
            Reportes
          </a>

          <a
            href="/agendasmart-demo"
            style={{
              backgroundColor: "#22c55e",
              color: "#ffffff",
              textDecoration: "none",
              padding: isMobile ? "8px 12px" : "10px 16px",
              borderRadius: "10px",
              fontWeight: "bold",
              fontSize: isMobile ? "13px" : "15px",
              boxShadow: "0 8px 18px rgba(34,197,94,0.18)",
            }}
          >
            Ver demo
          </a>
        </nav>
      </div>
    </header>
  );
}

function HomeLanding() {
  const isMobile = useLandingIsMobile();

  const pageContainerStyle = {
    ...containerStyle,
    padding: isMobile ? "0 16px" : containerStyle.padding,
  };

  const heroTitleStyle = {
    ...titleStyle,
    fontSize: isMobile ? "33px" : titleStyle.fontSize,
  };

  const sectionTitleStyle = {
    fontSize: isMobile ? "30px" : "42px",
    lineHeight: 1.1,
    margin: "0 0 18px 0",
  };

  const smallSectionTitleStyle = {
    fontSize: isMobile ? "29px" : "38px",
    lineHeight: 1.12,
    margin: "0 0 14px 0",
  };

  const responsiveTextStyle = {
    ...textStyle,
    fontSize: isMobile ? "16px" : textStyle.fontSize,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #f8fafc 0%, #f8fafc 18%, #ffffff 45%, #f8fafc 100%)",
        fontFamily: "Arial, sans-serif",
        color: "#111827",
      }}
    >
      <LandingMotionStyles />
      <FixedHeader isMobile={isMobile} />

      <section
        style={{
          ...pageContainerStyle,
          paddingTop: isMobile ? "138px" : "118px",
          paddingBottom: isMobile ? "42px" : "56px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1.05fr",
            gap: isMobile ? "30px" : "44px",
            alignItems: "center",
          }}
        >
          <Reveal>
            <Badge>Plataforma de reservas para negocios</Badge>

            <h1 style={heroTitleStyle}>
              Simplifica la gestión de tu negocio con AgendaSmart
            </h1>

            <p
              style={{
                ...responsiveTextStyle,
                maxWidth: "560px",
                marginBottom: "22px",
              }}
            >
              Administra reservas, horarios, clientes y servicios desde una
              plataforma moderna, adaptable a barberías, canchas deportivas,
              centros de estética y más.
            </p>

            <div
              style={{
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
                marginBottom: "26px",
              }}
            >
              <PrimaryButton isMobile={isMobile} />
              <SecondaryButton isMobile={isMobile} />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "12px",
                maxWidth: "620px",
              }}
            >
              <FeatureMini
                icon={<FaCalendarAlt size={18} />}
                title="Reservas online"
                text="Tus clientes reservan en segundos desde cualquier dispositivo."
              />
              <FeatureMini
                icon={<FaLaptop size={18} />}
                title="Panel admin"
                text="Gestiona agenda, citas y servicios en un solo lugar."
              />
            </div>
          </Reveal>

          <Reveal delay={120}>
            <BrowserMockup
              isMobile={isMobile}
              animated
              previewOptions={[
                {
                  label: "Reservas",
                  src: "/agendasmart/agendasmart-hero-right.png",
                  alt: "Vista de reservas online de AgendaSmart",
                },
                {
                  label: "Pagos",
                  src: "/agendasmart/agendasmart-payments-laptop.png",
                  alt: "Vista del panel de pagos de AgendaSmart",
                },
              ]}
            />
          </Reveal>
        </div>
      </section>

      <section
        id="clientes"
        style={{
          ...pageContainerStyle,
          paddingTop: "20px",
          paddingBottom: isMobile ? "56px" : "80px",
          scrollMarginTop: "110px",
        }}
      >
        <Reveal>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(auto-fit, minmax(320px, 1fr))",
              gap: isMobile ? "28px" : "36px",
              alignItems: "center",
            }}
          >
          <div
            style={{
              position: "relative",
              minHeight: isMobile ? "350px" : "500px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              order: isMobile ? 2 : 1,
            }}
          >
            <div
              style={{
                position: "absolute",
                width: "100%",
                maxWidth: "520px",
                height: "320px",
                borderRadius: "40px",
                background:
                  "radial-gradient(circle at center, rgba(34,197,94,0.10) 0%, rgba(255,255,255,0) 70%)",
              }}
            />

            <div
              style={{
                position: "absolute",
                left: "12%",
                bottom: "16%",
                width: "92px",
                height: "92px",
                borderRadius: "20px",
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                boxShadow: "0 18px 40px rgba(15,23,42,0.08)",
                display: isMobile ? "none" : "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#6b7280",
                fontSize: "28px",
              }}
            >
              <FaClock />
            </div>

            <div
              style={{
                position: "absolute",
                right: "10%",
                bottom: "14%",
                width: "104px",
                height: "104px",
                borderRadius: "22px",
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                boxShadow: "0 18px 40px rgba(15,23,42,0.08)",
                display: isMobile ? "none" : "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#22c55e",
                fontSize: "30px",
              }}
            >
              <FaCalendarAlt />
            </div>

            <PhoneMockup isMobile={isMobile} animated />
          </div>

          <div style={{ order: isMobile ? 1 : 2 }}>
            <h2
              style={sectionTitleStyle}
            >
              Reserva fácil para clientes
            </h2>

            <p
              style={{
                ...responsiveTextStyle,
                maxWidth: "520px",
                marginBottom: "28px",
              }}
            >
              Tus clientes pueden reservar en segundos desde su teléfono,
              eligiendo servicio, fecha y hora de forma simple y rápida.
            </p>

            <div style={{ display: "grid", gap: "18px" }}>
              <StepItem number="1" text="Elige el servicio" />
              <StepItem number="2" text="Selecciona la fecha" />
              <StepItem number="3" text="Elige la hora" />
              <StepItem number="4" text="Llena tus datos" />
              <StepItem number="5" text="Reserva y confirma" />
            </div>
          </div>
          </div>
        </Reveal>
      </section>

      <section
        id="admin"
        style={{
          ...pageContainerStyle,
          paddingTop: "20px",
          paddingBottom: isMobile ? "56px" : "80px",
          scrollMarginTop: "110px",
        }}
      >
        <Reveal>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(auto-fit, minmax(320px, 1fr))",
              gap: isMobile ? "28px" : "36px",
              alignItems: "center",
            }}
          >
          <div>
            <h2
              style={sectionTitleStyle}
            >
              Gestión simple para administradores
            </h2>

            <p
              style={{
                ...responsiveTextStyle,
                maxWidth: "520px",
                marginBottom: "28px",
              }}
            >
              Controla reservas, clientes, servicios y horarios desde un panel
              intuitivo pensado para operar rápido y sin complicaciones.
            </p>

            <div style={{ display: "grid", gap: "20px" }}>
              <AdminPoint
                icon={<FaCalendarAlt size={18} />}
                title="Calendario visual"
                text="Visualiza tu agenda diaria o semanal y organiza cada bloque con claridad."
              />
              <AdminPoint
                icon={<FaUsers size={18} />}
                title="Lista de clientes"
                text="Accede al historial de reservas y administra la atención de forma ordenada."
              />
              <AdminPoint
                icon={<FaCog size={18} />}
                title="Estados personalizados"
                text="Ajusta horarios, servicios y lógica de reserva según el tipo de negocio."
              />
            </div>
          </div>

          <div>
            <BrowserMockup
              src="/agendasmart/agendasmart-payments-laptop.png"
              alt="Vista del panel de pagos de AgendaSmart"
              isMobile={isMobile}
            />
          </div>
          </div>
        </Reveal>
      </section>

      <section
        id="reportes"
        style={{
          ...pageContainerStyle,
          paddingTop: "10px",
          paddingBottom: isMobile ? "56px" : "80px",
          scrollMarginTop: "110px",
        }}
      >
        <Reveal>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "18px",
              alignItems: "stretch",
              marginBottom: "22px",
            }}
          >
          <div style={{ gridColumn: "1 / -1", marginBottom: "4px" }}>
            <h2
              style={{
                ...sectionTitleStyle,
                margin: "0 0 14px 0",
              }}
            >
              Reportes para tomar decisiones
            </h2>

            <p
              style={{
                ...responsiveTextStyle,
                maxWidth: "720px",
              }}
            >
              Visualiza reservas, pagos, servicios frecuentes a través de reportes semanales y cierres diarios
              con información clara para operar mejor. Entregando indicadores para la toma de decisiones, como por ejemplo:
            </p>
          </div>

          <AnalyticsCard
            title="Reservas confirmadas"
            value="1.305"
            text="Mide la actividad real de tu negocio y detecta los días de mayor demanda."
          />
          <AnalyticsCard
            title="Crecimiento mensual"
            value="+18%"
            text="Compara períodos y entiende si tu operación está mejorando semana a semana."
          />
          <AnalyticsCard
            title="Ingresos estimados"
            value="$3.250.000"
            text="Ten una visión rápida del impacto comercial de las reservas realizadas."
          />
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: isMobile ? "18px" : "24px",
              padding: isMobile ? "14px" : "22px",
              boxShadow: "0 18px 40px rgba(15,23,42,0.06)",
            }}
          >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1.1fr 0.9fr",
              gap: "18px",
            }}
          >
            <div
              style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #e5e7eb",
                borderRadius: "18px",
                padding: isMobile ? "16px" : "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "18px",
                }}
              >
                <div style={{ fontWeight: "bold", fontSize: "18px" }}>
                  Resumen semanal
                </div>
                <div
                  style={{
                    color: "#16a34a",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <FaChartLine />
                  Al día
                </div>
              </div>

              <div
                style={{
                  height: isMobile ? "170px" : "220px",
                  display: "flex",
                  alignItems: "flex-end",
                  gap: isMobile ? "8px" : "14px",
                }}
              >
                {[52, 78, 96, 84, 110, 138, 160].map((height, index) => (
                  <div
                    key={index}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: `${height}px`,
                        borderRadius: "16px 16px 0 0",
                        background:
                          index === 6
                            ? "linear-gradient(180deg, #22c55e 0%, #16a34a 100%)"
                            : "linear-gradient(180deg, #dbeafe 0%, #93c5fd 100%)",
                      }}
                    />
                    <span
                      style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        fontWeight: "bold",
                      }}
                    >
                      {["L", "M", "M", "J", "V", "S", "D"][index]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gap: "18px" }}>
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e5e7eb",
                  borderRadius: "18px",
                  padding: isMobile ? "16px" : "20px",
                }}
              >
                <div
                  style={{
                    fontWeight: "bold",
                    marginBottom: "14px",
                    fontSize: "17px",
                  }}
                >
                  Servicios más populares
                </div>

                {[
                  { name: "Servicio 1", percent: "82%" },
                  { name: "Servicio 2", percent: "64%" },
                  { name: "Servicio 3", percent: "57%" },
                ].map((item) => (
                  <div key={item.name} style={{ marginBottom: "14px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "14px",
                        marginBottom: "6px",
                        color: "#374151",
                      }}
                    >
                      <span>{item.name}</span>
                      <span style={{ fontWeight: "bold" }}>{item.percent}</span>
                    </div>

                    <div
                      style={{
                        width: "100%",
                        height: "10px",
                        borderRadius: "999px",
                        backgroundColor: "#e5e7eb",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: item.percent,
                          height: "100%",
                          background:
                            "linear-gradient(90deg, #22c55e 0%, #16a34a 100%)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e5e7eb",
                  borderRadius: "18px",
                  padding: isMobile ? "16px" : "20px",
                }}
              >
                <div
                  style={{
                    fontWeight: "bold",
                    marginBottom: "12px",
                    fontSize: "17px",
                  }}
                >
                  Negocios compatibles
                </div>

                <IndustryTabs isMobile={isMobile} />
              </div>
            </div>
          </div>
          </div>
        </Reveal>
      </section>

      <section
        id="negocios"
        style={{
          ...pageContainerStyle,
          paddingTop: "10px",
          paddingBottom: isMobile ? "56px" : "80px",
          scrollMarginTop: "110px",
        }}
      >
        <Reveal>
          <div
            style={{
              maxWidth: "760px",
              marginBottom: "24px",
            }}
          >
          <Badge>Negocios en AgendaSmart</Badge>

          <h2
            style={smallSectionTitleStyle}
          >
            Explora agendas reales y demos
          </h2>

          <p style={{ ...responsiveTextStyle, maxWidth: "680px" }}>
            Revisa cómo se ve AgendaSmart aplicado a distintos tipos de negocio.
            Cada ejemplo abre una agenda independiente.
          </p>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "18px",
            }}
          >
            {exampleBusinesses.map((business) => (
              <BusinessExampleCard key={business.href} business={business} />
            ))}
          </div>
        </Reveal>
      </section>

      <section
        style={{
          ...pageContainerStyle,
          paddingTop: "10px",
          paddingBottom: isMobile ? "64px" : "90px",
        }}
      >
        <Reveal>
          <div
            style={{
              background:
                "linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #166534 100%)",
              borderRadius: "28px",
              padding: isMobile ? "32px 18px" : "42px 28px",
              color: "#ffffff",
              textAlign: "center",
              boxShadow: "0 24px 60px rgba(15,23,42,0.16)",
            }}
          >
          <div
            style={{
              maxWidth: "760px",
              margin: "0 auto",
            }}
          >
            <div
              style={{
                fontSize: isMobile ? "27px" : "34px",
                fontWeight: "bold",
                lineHeight: 1.18,
                marginBottom: "14px",
              }}
            >
              Lleva tu negocio a una experiencia de reservas más profesional
            </div>

            <div
              style={{
                fontSize: isMobile ? "15px" : "17px",
                lineHeight: 1.6,
                color: "rgba(255,255,255,0.82)",
                marginBottom: "24px",
              }}
            >
              AgendaSmart te permite mostrar una imagen más moderna, ordenar tu
              operación y mejorar la atención de tus clientes.
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <PrimaryButton isMobile={isMobile} />
              <SecondaryButton isMobile={isMobile} />
            </div>
          </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

export default HomeLanding;
