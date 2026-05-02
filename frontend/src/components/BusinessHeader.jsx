import React from "react";
import {
  FaWhatsapp,
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaRegClock,
} from "react-icons/fa";

function BusinessHeader({ isMobile, business }) {
  if (!business) return null;

  const hasSocialLinks =
    Boolean(business?.socialLinks?.instagram) ||
    Boolean(business?.socialLinks?.facebook);

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

  return (
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
          <FaMapMarkerAlt style={{ color: "#e11d48", fontSize: "18px" }} /> {business.location}
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
              <FaMapMarkerAlt style={{ color: "#e11d48", fontSize: "18px" }} /> {business.address}
            </a>
          </div>

          {business?.phone && (
  <a
    href={business?.whatsappUrl || `https://wa.me/${String(business.phone).replace(/\D/g, "")}`}
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
    href={business?.whatsappUrl || `https://wa.me/${String(business.phone || "").replace(/\D/g, "")}`}
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
            <p style={{ margin: "0 0 6px", fontSize: "18px", color: "#374151" }}>
              <FaRegClock style={{ color: "#64748b", fontSize: "19px" }} /> {business.hours || "Horario por confirmar"}
            </p>
          </div>

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
                Síguenos en redes
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
          <h3 style={{ margin: "0 0 16px", fontSize: "18px", color: "#111827" }}>
            {business.headerResourceSectionTitle ||
              business.resourceLabelPlural ||
              "Recursos"}
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "16px",
              textAlign: "center",
            }}
          >
            {(business.professionals || [])
              .slice(
                0,
                business?.headerProfessionalsLimit ||
                  business?.professionals?.length ||
                  0
              )
              .map((pro) => (
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

                  <div style={{ fontSize: "14px", color: "#374151" }}>
                    {pro.name}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BusinessHeader;