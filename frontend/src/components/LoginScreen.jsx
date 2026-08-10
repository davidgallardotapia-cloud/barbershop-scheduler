import React from "react";
import { businessConfigBySlug } from "../config/businessConfigBySlug";

function LoginScreen({
  styles,
  username,
  password,
  loginError,
  loggingIn,
  setUsername,
  setPassword,
  handleLogin,
  setAppMode,
  business = null,
}) {
  const currentSlug = window.location.pathname.split("/").filter(Boolean)[0];

  const currentBusiness = business || businessConfigBySlug[currentSlug];

  const isSportsBusiness = ["giocata", "pinguino-club"].includes(currentSlug);

  const fallbackIcon = isSportsBusiness ? "⚽" : "💈";

  const loginDescription = isSportsBusiness
    ? "Accede al panel de administración para gestionar reservas, canchas y clientes."
    : "Accede al panel de administración para gestionar reservas, horarios y clientes.";

  const loginLogo = currentBusiness?.logo || currentBusiness?.favicon || null;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f3f4f6",
        fontFamily: "Arial, sans-serif",
        padding: "20px",
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          padding: "32px",
          borderRadius: "16px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          border: "1px solid #e5e7eb",
          width: "100%",
          maxWidth: "400px",
        }}
      >
        <div style={{ marginBottom: "22px", textAlign: "center" }}>
          {loginLogo ? (
            <img
              src={loginLogo}
              alt={currentBusiness?.name || "Logo del negocio"}
              style={{
                width: "72px",
                height: "72px",
                objectFit: "contain",
                marginBottom: "10px",
                borderRadius: "14px",
              }}
            />
          ) : (
            <div style={{ fontSize: "34px", marginBottom: "8px" }}>
              {fallbackIcon}
            </div>
          )}

          <h2 style={{ margin: 0, fontSize: "24px", color: "#111827" }}>
            Iniciar sesión
          </h2>

          <p
            style={{
              margin: "10px 0 0 0",
              color: "#6b7280",
              fontSize: "14px",
              lineHeight: 1.5,
            }}
          >
            {loginDescription}
          </p>
        </div>

        <input
          style={styles.input}
          placeholder="Nombre de usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleLogin();
          }}
        />

        <input
          style={styles.input}
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleLogin();
          }}
        />

        <button
          style={{
            ...styles.button,
            ...styles.primaryButton,
            width: "100%",
            ...(loggingIn ? styles.disabledButton : {}),
          }}
          onClick={handleLogin}
          disabled={loggingIn}
        >
          {loggingIn ? "Ingresando..." : "Entrar al panel"}
        </button>

        <button
          style={{
            ...styles.button,
            ...styles.secondaryButton,
            width: "100%",
            marginTop: "10px",
          }}
          onClick={() => setAppMode("client")}
        >
          Volver a reservas
        </button>

        {loginError && (
          <div
            style={{
              marginTop: "14px",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              borderRadius: "10px",
              padding: "10px 12px",
              fontWeight: "bold",
              fontSize: "14px",
            }}
          >
            {loginError}
          </div>
        )}
      </div>
    </div>
  );
}

export default LoginScreen;
