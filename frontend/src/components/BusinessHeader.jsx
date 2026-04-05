import React from "react";
import { businessConfig } from "../config/business";

function BusinessHeader({ isMobile }) {
  return (
      <div
      style={{
  display: "grid",
  gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.8fr) minmax(320px, 1fr)",
  gap: isMobile ? "16px" : "24px",
  marginBottom: "24px",
  alignItems: "stretch",
}}
    >
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: "24px",
          overflow: "hidden",
          border: "1px solid #e5e7eb",
          boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            width: "100%",
            height: isMobile ? "220px" : "420px",
            overflow: "hidden",
            backgroundColor: "#ddd",
          }}
        >
          <img
            src={businessConfig.image}
            alt={businessConfig.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
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
              width: "140px",
              height: "110px",
              borderRadius: "12px",
              overflow: "hidden",
              backgroundColor: "#111",
              margin: isMobile ? "0 auto" : "0",
            }}
          >
            <img
              src={businessConfig.logo}
              alt={`${businessConfig.name} logo`}
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
                color: "#172554",
              }}
            >
              {businessConfig.name}
            </h2>

            <p
              style={{
                margin: 0,
                fontSize: isMobile ? "16px" : "18px",
                lineHeight: 1.5,
                color: "#1f2937",
              }}
            >
              {businessConfig.description}
            </p>
          </div>
        </div>
      </div>

      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: "24px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
          padding: "22px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div>
          <p style={{ margin: "0 0 14px", fontSize: "18px", color: "#374151" }}>
            📍 {businessConfig.location}
          </p>

          <div style={{ margin: "0 0 14px" }}>
  <iframe
    src="https://www.google.com/maps?q=Anibal+Pinto+1601+Coquimbo&output=embed"
    width="100%"
    height="180"
    style={{
      border: 0,
      borderRadius: "12px",
    }}
    loading="lazy"
  ></iframe>

  <a
    href={businessConfig.mapLink}
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
    📍 Aníbal Pinto 1601, Coquimbo
  </a>
</div>

          <p style={{ margin: "0 0 14px", fontSize: "18px", color: "#374151" }}>
            📞 {businessConfig.phone}
          </p>

          <p style={{ margin: "0 0 14px", fontSize: "18px", color: "#374151" }}>
            💬 {businessConfig.whatsappLabel}
          </p>

          <div style={{ margin: "0 0 24px" }}>
  <p style={{ margin: "0 0 6px", fontSize: "18px", color: "#374151" }}>
    🕒 Abierto hoy hasta las 21:00
  </p>
  <p style={{ margin: 0, fontSize: "14px", color: "#6b7280" }}>
    Lunes a Sábado: 10:30 – 21:00
  </p>
</div>
        </div>

        <div
          style={{
            borderTop: "1px solid #e5e7eb",
            paddingTop: "18px",
          }}
        >
          <h3 style={{ margin: "0 0 16px", fontSize: "18px", color: "#111827" }}>
            Barberos
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "16px",
              textAlign: "center",
            }}
          >
            {businessConfig.professionals.map((pro) => (
              <div key={pro.name}>
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
                    src={pro.image}
                    alt={pro.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </div>
                <div style={{ fontSize: "14px", color: "#374151" }}>{pro.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BusinessHeader;