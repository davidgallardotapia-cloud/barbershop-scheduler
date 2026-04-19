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
  fontSize: "44px",
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

function PrimaryButton() {
  return (
    <a
      href="https://wa.me/56912345678?text=Hola,%20quiero%20una%20demo%20de%20AgendaSmart"
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
        gap: "10px",
        boxShadow: "0 10px 24px rgba(34,197,94,0.22)",
      }}
    >
      <FaWhatsapp size={20} />
      Comunícate con nosotros
    </a>
  );
}

function SecondaryButton() {
  return (
    <a
      href="/urban-district-barber"
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
        gap: "10px",
      }}
    >
      Ver ejemplo real
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

function StatCard({ title, value }) {
  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "16px",
        padding: "16px",
        boxShadow: "0 8px 20px rgba(15,23,42,0.04)",
      }}
    >
      <div
        style={{
          fontSize: "13px",
          color: "#6b7280",
          marginBottom: "8px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: "26px",
          fontWeight: "bold",
          color: "#111827",
        }}
      >
        {value}
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

function BrowserMockup() {
  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "28px",
        border: "1px solid #e5e7eb",
        boxShadow: "0 28px 70px rgba(15,23,42,0.12)",
        padding: "18px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", gap: "8px" }}>
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: "#ef4444",
            }}
          />
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: "#f59e0b",
            }}
          />
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: "#22c55e",
            }}
          />
        </div>

        <div
          style={{
            fontSize: "13px",
            color: "#6b7280",
            fontWeight: "bold",
          }}
        >
          AgendaSmart
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "220px 1fr",
          gap: "16px",
        }}
      >
        <div
          style={{
            backgroundColor: "#f8fafc",
            border: "1px solid #e5e7eb",
            borderRadius: "20px",
            padding: "16px",
          }}
        >
          <div
            style={{
              fontWeight: "bold",
              fontSize: "18px",
              marginBottom: "18px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <FaStore color="#22c55e" />
            AgendaSmart
          </div>

          {[
            "Panel principal",
            "Calendario",
            "Clientes",
            "Servicios",
            "Reportes",
            "Configuración",
          ].map((item) => (
            <div
              key={item}
              style={{
                padding: "12px 12px",
                borderRadius: "12px",
                color: item === "Calendario" ? "#111827" : "#6b7280",
                backgroundColor:
                  item === "Calendario" ? "#ffffff" : "transparent",
                fontWeight: item === "Calendario" ? "bold" : 500,
                marginBottom: "8px",
                border: item === "Calendario" ? "1px solid #e5e7eb" : "none",
              }}
            >
              {item}
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gap: "16px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "12px",
            }}
          >
            <StatCard title="Reservas" value="1.205" />
            <StatCard title="Clientes" value="320" />
            <StatCard title="Ingresos" value="$3.250.000" />
            <StatCard title="Turnos hoy" value="44" />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.15fr 0.85fr",
              gap: "16px",
            }}
          >
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
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <div style={{ fontWeight: "bold", fontSize: "18px" }}>
                  Agenda del día
                </div>
                <div style={{ color: "#6b7280", fontSize: "14px" }}>
                  Abril 2026
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, 1fr)",
                  gap: "8px",
                  marginBottom: "16px",
                }}
              >
                {["Lun", "Mar", "Mié", "Jue", "Vie"].map((day) => (
                  <div
                    key={day}
                    style={{
                      backgroundColor: "#f8fafc",
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                      padding: "10px 6px",
                      textAlign: "center",
                      fontWeight: "bold",
                      fontSize: "13px",
                    }}
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gap: "10px" }}>
                {[
                  "10:00 Corte premium - Matías",
                  "11:30 Barba - Cristian",
                  "13:00 Reserva cancha - Giocata",
                  "16:00 Corte + Barba - James",
                ].map((item, index) => (
                  <div
                    key={item}
                    style={{
                      backgroundColor: index % 2 === 0 ? "#eefbf2" : "#eff6ff",
                      border:
                        index % 2 === 0
                          ? "1px solid #bbf7d0"
                          : "1px solid #bfdbfe",
                      color: "#1f2937",
                      borderRadius: "14px",
                      padding: "12px 14px",
                      fontSize: "14px",
                      fontWeight: 500,
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gap: "16px" }}>
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
                    fontWeight: "bold",
                    marginBottom: "14px",
                    fontSize: "17px",
                  }}
                >
                  Ingresos mensuales
                </div>

                <div
                  style={{
                    height: "150px",
                    display: "flex",
                    alignItems: "flex-end",
                    gap: "10px",
                  }}
                >
                  {[38, 56, 48, 72, 84, 92, 110].map((h, index) => (
                    <div
                      key={index}
                      style={{
                        flex: 1,
                        height: `${h}px`,
                        borderRadius: "10px 10px 0 0",
                        background:
                          index === 6
                            ? "linear-gradient(180deg, #22c55e 0%, #16a34a 100%)"
                            : "linear-gradient(180deg, #c7d2fe 0%, #93c5fd 100%)",
                      }}
                    />
                  ))}
                </div>
              </div>

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
                    fontWeight: "bold",
                    marginBottom: "12px",
                    fontSize: "17px",
                  }}
                >
                  Top clientes
                </div>

                {["Valentina Soto", "Joaquín Herrera", "Camila Rojas"].map(
                  (name) => (
                    <div
                      key={name}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "10px 0",
                        borderBottom: "1px solid #f3f4f6",
                        fontSize: "14px",
                        color: "#374151",
                      }}
                    >
                      <span>{name}</span>
                      <span style={{ color: "#16a34a", fontWeight: "bold" }}>
                        Activo
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PhoneMockup() {
  return (
    <div
      style={{
        width: "280px",
        maxWidth: "100%",
        backgroundColor: "#111827",
        borderRadius: "34px",
        padding: "10px",
        boxShadow: "0 30px 60px rgba(15,23,42,0.16)",
        margin: "0 auto",
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "26px",
          padding: "16px 14px",
          minHeight: "540px",
        }}
      >
        <div
          style={{
            width: "90px",
            height: "8px",
            borderRadius: "999px",
            backgroundColor: "#d1d5db",
            margin: "0 auto 16px",
          }}
        />

        <div
          style={{
            fontWeight: "bold",
            fontSize: "22px",
            marginBottom: "12px",
            color: "#111827",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <FaCalendarAlt color="#22c55e" />
          AgendaSmart
        </div>

        <div
          style={{
            backgroundColor: "#f8fafc",
            border: "1px solid #e5e7eb",
            borderRadius: "18px",
            padding: "14px",
            marginBottom: "14px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "12px",
              color: "#374151",
              fontWeight: "bold",
            }}
          >
            <span>Abril 2026</span>
            <span style={{ color: "#22c55e" }}>Hoy</span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "6px",
            }}
          >
            {[21, 22, 23, 24, 25, 26, 27].map((day) => (
              <div
                key={day}
                style={{
                  aspectRatio: "1 / 1",
                  borderRadius: "10px",
                  backgroundColor: day === 24 ? "#22c55e" : "#ffffff",
                  color: day === 24 ? "#ffffff" : "#374151",
                  border: day === 24 ? "none" : "1px solid #e5e7eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  fontSize: "13px",
                }}
              >
                {day}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: "10px", marginBottom: "14px" }}>
          {["Corte de pelo", "Barba", "Reserva cancha"].map((item, index) => (
            <div
              key={item}
              style={{
                padding: "14px",
                borderRadius: "14px",
                border: "1px solid #e5e7eb",
                backgroundColor: index === 0 ? "#eefbf2" : "#ffffff",
                fontWeight: index === 0 ? "bold" : 500,
                color: "#111827",
              }}
            >
              {item}
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gap: "10px", marginBottom: "16px" }}>
          {["09:00", "10:30", "11:00"].map((time, index) => (
            <div
              key={time}
              style={{
                padding: "12px 14px",
                borderRadius: "14px",
                border: "1px solid #e5e7eb",
                backgroundColor: index === 1 ? "#eff6ff" : "#ffffff",
                color: "#111827",
                fontWeight: index === 1 ? "bold" : 500,
              }}
            >
              {time}
            </div>
          ))}
        </div>

        <div
          style={{
            backgroundColor: "#22c55e",
            color: "#ffffff",
            borderRadius: "14px",
            textAlign: "center",
            padding: "14px",
            fontWeight: "bold",
          }}
        >
          Reservar turno
        </div>
      </div>
    </div>
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

function HomeLanding() {
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
      <section
        style={{
          ...containerStyle,
          paddingTop: "68px",
          paddingBottom: "70px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "36px",
            alignItems: "center",
          }}
        >
          <div>
            <Badge>Plataforma de reservas para negocios</Badge>

            <h1 style={titleStyle}>
              Simplifica la gestión de tu negocio con AgendaSmart
            </h1>

            <p
              style={{
                ...textStyle,
                maxWidth: "580px",
                marginBottom: "26px",
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
              <PrimaryButton />
              <SecondaryButton />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
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
            <BrowserMockup />
          </div>
        </div>
      </section>

      <section
        style={{
          ...containerStyle,
          paddingTop: "20px",
          paddingBottom: "80px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "36px",
            alignItems: "center",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "42px",
                lineHeight: 1.1,
                margin: "0 0 18px 0",
              }}
            >
              Reserva fácil para clientes
            </h2>

            <p
              style={{
                ...textStyle,
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
              <StepItem number="3" text="Reserva y confirma" />
            </div>
          </div>

          <div
            style={{
              position: "relative",
              minHeight: "620px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                position: "absolute",
                width: "100%",
                maxWidth: "520px",
                height: "420px",
                borderRadius: "40px",
                background:
                  "radial-gradient(circle at center, rgba(34,197,94,0.10) 0%, rgba(255,255,255,0) 70%)",
              }}
            />

            <div
              style={{
                position: "absolute",
                left: "8%",
                bottom: "18%",
                width: "120px",
                height: "120px",
                borderRadius: "24px",
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                boxShadow: "0 18px 40px rgba(15,23,42,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#6b7280",
                fontSize: "34px",
              }}
            >
              <FaClock />
            </div>

            <div
              style={{
                position: "absolute",
                right: "5%",
                bottom: "12%",
                width: "140px",
                height: "140px",
                borderRadius: "28px",
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                boxShadow: "0 18px 40px rgba(15,23,42,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#22c55e",
                fontSize: "40px",
              }}
            >
              <FaCalendarAlt />
            </div>

            <PhoneMockup />
          </div>
        </div>
      </section>

      <section
        style={{
          ...containerStyle,
          paddingTop: "20px",
          paddingBottom: "80px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "36px",
            alignItems: "center",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "42px",
                lineHeight: 1.1,
                margin: "0 0 18px 0",
              }}
            >
              Gestión simple para administradores
            </h2>

            <p
              style={{
                ...textStyle,
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
            <BrowserMockup />
          </div>
        </div>
      </section>

      <section
        style={{
          ...containerStyle,
          paddingTop: "10px",
          paddingBottom: "80px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "18px",
            alignItems: "stretch",
            marginBottom: "22px",
          }}
        >
          <div style={{ gridColumn: "1 / -1", marginBottom: "4px" }}>
            <h2
              style={{
                fontSize: "42px",
                lineHeight: 1.1,
                margin: "0 0 14px 0",
              }}
            >
              Reportes para tomar decisiones
            </h2>

            <p
              style={{
                ...textStyle,
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
            borderRadius: "24px",
            padding: "22px",
            boxShadow: "0 18px 40px rgba(15,23,42,0.06)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 0.9fr",
              gap: "18px",
            }}
          >
            <div
              style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #e5e7eb",
                borderRadius: "18px",
                padding: "20px",
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
                  height: "220px",
                  display: "flex",
                  alignItems: "flex-end",
                  gap: "14px",
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
                  padding: "20px",
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
                  padding: "20px",
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
                    gridTemplateColumns: "1fr 1fr",
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
        style={{
          ...containerStyle,
          paddingTop: "10px",
          paddingBottom: "90px",
        }}
      >
        <div
          style={{
            background:
              "linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #166534 100%)",
            borderRadius: "28px",
            padding: "42px 28px",
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
                fontSize: "40px",
                fontWeight: "bold",
                lineHeight: 1.15,
                marginBottom: "16px",
              }}
            >
              Lleva tu negocio a una experiencia de reservas más profesional
            </div>

            <div
              style={{
                fontSize: "18px",
                lineHeight: 1.7,
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
              <PrimaryButton />
              <SecondaryButton />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomeLanding;