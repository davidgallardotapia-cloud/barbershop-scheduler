import React from "react";
import {
  FaWhatsapp,
  FaCalendarAlt,
  FaCogs,
  FaLayerGroup,
  FaMobileAlt,
} from "react-icons/fa";

function HomeLanding() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
        fontFamily: "Arial, sans-serif",
        color: "#111827",
      }}
    >
      <section
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "64px 20px 40px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "32px",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-block",
                backgroundColor: "#e0e7ff",
                color: "#3730a3",
                padding: "8px 14px",
                borderRadius: "999px",
                fontWeight: "bold",
                fontSize: "14px",
                marginBottom: "18px",
              }}
            >
              AgendaSmart
            </div>

            <h1
              style={{
                fontSize: "44px",
                lineHeight: 1.1,
                margin: "0 0 18px 0",
              }}
            >
              Sistema de reservas online para negocios que quieren vender más
            </h1>

            <p
              style={{
                fontSize: "18px",
                lineHeight: 1.6,
                color: "#4b5563",
                marginBottom: "26px",
                maxWidth: "620px",
              }}
            >
              Crea una experiencia profesional para tus clientes con agenda
              online, panel de administración, confirmación por WhatsApp y una
              solución adaptable para barberías, canchas, centros de estética y
              más.
            </p>

            <div
              style={{
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <a
                href="https://wa.me/56912345678?text=Hola,%20quiero%20una%20demo%20de%20AgendaSmart"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  backgroundColor: "#25D366",
                  color: "#ffffff",
                  textDecoration: "none",
                  padding: "14px 18px",
                  borderRadius: "10px",
                  fontWeight: "bold",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <FaWhatsapp size={20} />
                Comunícate con nosotros
              </a>

              <a
                href="/urban-district-barber"
                style={{
                  backgroundColor: "#ffffff",
                  color: "#111827",
                  textDecoration: "none",
                  padding: "14px 18px",
                  borderRadius: "10px",
                  fontWeight: "bold",
                  border: "1px solid #d1d5db",
                }}
              >
                Ver ejemplo real
              </a>
            </div>
          </div>

          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "24px",
              boxShadow: "0 18px 40px rgba(15,23,42,0.08)",
              padding: "24px",
            }}
          >
            <div
              style={{
                borderRadius: "20px",
                overflow: "hidden",
                marginBottom: "18px",
                background: "linear-gradient(135deg, #0f172a 0%, #312e81 100%)",
                padding: "18px",
                minHeight: "320px",
                color: "#ffffff",
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
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <div
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      backgroundColor: "#22c55e",
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
                      backgroundColor: "#ef4444",
                    }}
                  />
                </div>

                <div
                  style={{
                    fontSize: "13px",
                    opacity: 0.9,
                    fontWeight: "bold",
                  }}
                >
                  Vista AgendaSmart
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 0.8fr",
                  gap: "16px",
                }}
              >
                <div
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "18px",
                    padding: "16px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "bold",
                      marginBottom: "14px",
                    }}
                  >
                    Agenda semanal
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: "8px",
                      marginBottom: "14px",
                    }}
                  >
                    {["Lun", "Mar", "Mié", "Jue"].map((day) => (
                      <div
                        key={day}
                        style={{
                          background: "rgba(255,255,255,0.12)",
                          borderRadius: "10px",
                          padding: "10px 6px",
                          textAlign: "center",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "grid", gap: "8px" }}>
                    {[
                      "10:00 Corte premium",
                      "11:30 Barba",
                      "13:00 Reserva cancha",
                    ].map((item) => (
                      <div
                        key={item}
                        style={{
                          background: "rgba(255,255,255,0.1)",
                          borderRadius: "12px",
                          padding: "10px 12px",
                          fontSize: "13px",
                        }}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: "#ffffff",
                    color: "#111827",
                    borderRadius: "18px",
                    padding: "16px",
                    boxShadow: "0 12px 28px rgba(0,0,0,0.16)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: "bold",
                        marginBottom: "12px",
                      }}
                    >
                      Reserva confirmada
                    </div>

                    <div
                      style={{
                        backgroundColor: "#f3f4f6",
                        borderRadius: "12px",
                        padding: "12px",
                        marginBottom: "10px",
                        fontSize: "13px",
                      }}
                    >
                      Urban District Barber
                    </div>

                    <div
                      style={{
                        backgroundColor: "#f9fafb",
                        border: "1px solid #e5e7eb",
                        borderRadius: "12px",
                        padding: "12px",
                        marginBottom: "10px",
                        fontSize: "13px",
                      }}
                    >
                      Miércoles · 11:30
                    </div>

                    <div
                      style={{
                        backgroundColor: "#f9fafb",
                        border: "1px solid #e5e7eb",
                        borderRadius: "12px",
                        padding: "12px",
                        fontSize: "13px",
                      }}
                    >
                      Servicio: Corte degradado
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: "14px",
                      backgroundColor: "#25D366",
                      color: "#ffffff",
                      borderRadius: "12px",
                      padding: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      fontWeight: "bold",
                      fontSize: "13px",
                    }}
                  >
                    <FaWhatsapp />
                    Confirmación por WhatsApp
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
              }}
            >
              {[
                {
                  icon: <FaCalendarAlt size={18} />,
                  title: "Reservas online",
                  text: "Tus clientes reservan en segundos desde su celular.",
                },
                {
                  icon: <FaCogs size={18} />,
                  title: "Panel admin",
                  text: "Gestiona horarios, citas y servicios fácilmente.",
                },
                {
                  icon: <FaMobileAlt size={18} />,
                  title: "WhatsApp integrado",
                  text: "Confirma reservas y mejora la atención.",
                },
                {
                  icon: <FaLayerGroup size={18} />,
                  title: "Multi negocio",
                  text: "Personalizable para distintos rubros.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  style={{
                    backgroundColor: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: "14px",
                    padding: "14px",
                  }}
                >
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      backgroundColor: "#eef2ff",
                      color: "#3730a3",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "10px",
                    }}
                  >
                    {item.icon}
                  </div>

                  <div style={{ fontWeight: "bold", marginBottom: "6px" }}>
                    {item.title}
                  </div>

                  <div style={{ color: "#6b7280", fontSize: "14px" }}>
                    {item.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "20px 20px 70px",
        }}
      >
        <h2 style={{ fontSize: "32px", marginBottom: "18px" }}>
          Ideal para distintos tipos de negocio
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "16px",
          }}
        >
          {[
            "Barberías",
            "Canchas deportivas",
            "Centros de estética",
            "Consultas y servicios",
          ].map((item) => (
            <div
              key={item}
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "18px",
                padding: "20px",
                boxShadow: "0 4px 14px rgba(0,0,0,0.05)",
                fontWeight: "bold",
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default HomeLanding;