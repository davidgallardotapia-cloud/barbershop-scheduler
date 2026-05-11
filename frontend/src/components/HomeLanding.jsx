import React from "react";
import {
  FaWhatsapp,
  FaArrowRight,
  FaCalendarAlt,
  FaCheckCircle,
  FaChartLine,
  FaUsers,
  FaClock,
  FaStore,
  FaLaptop,
  FaCut,
  FaFutbol,
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

const exampleBusinesses = [
  {
    name: "Canchas Giocata",
    category: "Canchas deportivas",
    description: "Reserva de canchas, pagos, estados y partidos abiertos.",
    href: "/giocata",
    logo: "/giocata-logo-optimized.jpg",
  },
  {
    name: "Urban District Barber",
    category: "Barbería",
    description: "Flujo de reserva para servicios, horarios y clientes.",
    href: "/urban-district-barber",
    logo: "/logo-james.jpg",
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
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "18px",
        padding: "18px",
        boxShadow: "0 8px 20px rgba(15,23,42,0.04)",
      }}
    >
      <div
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
  src = "/agendasmart-hero-right.png",
  alt = "Vista de AgendaSmart",
  isMobile = false,
}) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: "620px",
        margin: "0 auto",
      }}
    >
      <div
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
          src={src}
          alt={alt}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            objectFit: "cover",
          }}
        />
      </div>
    </div>
  );
}

function PhoneMockup({ isMobile = false }) {
  return (
    <img
      src="/agendasmart-booking-preview.svg"
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
        {value}
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
            src="/agendasmart-horizontal.png"
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
          <div>
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
          </div>

          <div>
            <BrowserMockup isMobile={isMobile} />
          </div>
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

            <PhoneMockup isMobile={isMobile} />
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
              src="/agendasmart-payments-laptop.png"
              alt="Vista del panel de pagos de AgendaSmart"
              isMobile={isMobile}
            />
          </div>
        </div>
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
              Analiza el rendimiento de tu negocio con métricas claras para
              entender demanda, reservas, clientes frecuentes e ingresos.
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
                  Rendimiento semanal
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
                  En alza
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
                  { name: "Corte degradado", percent: "82%" },
                  { name: "Barba premium", percent: "64%" },
                  { name: "Reserva cancha", percent: "57%" },
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

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                    gap: "10px",
                  }}
                >
                  {[
                    { icon: <FaCut />, label: "Barberías" },
                    { icon: <FaFutbol />, label: "Canchas" },
                    { icon: <FaStore />, label: "Servicios" },
                    { icon: <FaCheckCircle />, label: "Más rubros" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "14px",
                        padding: "14px",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        color: "#374151",
                        fontWeight: "bold",
                      }}
                    >
                      <span style={{ color: "#16a34a" }}>{item.icon}</span>
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
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
      </section>

      <section
        style={{
          ...pageContainerStyle,
          paddingTop: "10px",
          paddingBottom: isMobile ? "64px" : "90px",
        }}
      >
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
      </section>
    </div>
  );
}

export default HomeLanding;
