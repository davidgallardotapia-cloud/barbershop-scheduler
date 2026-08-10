import React, { useEffect, useMemo, useState } from "react";
import {
  createPlatformBusiness,
  getPlatformBusinesses,
  loginPlatformAdmin,
  logoutPlatformAdmin,
  updatePlatformBusinessStatus,
} from "../services/platformService";

const templateOptions = {
  general: {
    label: "Servicios generales",
    description: "Profesionales, servicios y agenda por bloques.",
    resourceLabel: "Profesionales o recursos",
    serviceExamples: "Consulta inicial\nServicio principal",
    primaryColor: "#2563eb",
  },
  barberia: {
    label: "Barberia",
    description: "Barberos, cortes y horarios de atencion.",
    resourceLabel: "Barberos",
    serviceExamples: "Corte tradicional ($10.000)\nCorte + barba ($15.000)",
    primaryColor: "#27272a",
  },
  salud: {
    label: "Salud",
    description: "Profesionales, duraciones y ficha clinica inicial.",
    resourceLabel: "Profesionales",
    serviceExamples: "Evaluacion inicial (60 min - $30.000)\nControl (30 min - $20.000)",
    primaryColor: "#0f766e",
  },
  deporte: {
    label: "Centro deportivo",
    description: "Canchas o espacios reservables por horario.",
    resourceLabel: "Canchas o espacios",
    serviceExamples: "Arriendo 60 min ($25.000)\nArriendo 90 min ($35.000)",
    primaryColor: "#15803d",
  },
};

const createInitialForm = () => ({
  templateKey: "general",
  status: "draft",
  name: "",
  slug: "",
  contactEmail: "",
  phone: "",
  location: "",
  address: "",
  hours: "Lunes a viernes: 09:00 a 18:00",
  subtitle: "",
  description: "",
  logoUrl: "",
  heroUrl: "",
  bookingTitle: "Reserva tu hora",
  bookingDescription:
    "Selecciona un servicio, profesional y horario disponible.",
  primaryColor: templateOptions.general.primaryColor,
  resources: "",
  services: templateOptions.general.serviceExamples,
  startTime: "09:00",
  endTime: "18:00",
  intervalMinutes: "30",
  blockedWeekdays: [0],
  adminUsername: "",
  adminPassword: "",
});

const slugify = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "")
    .slice(0, 80);
};

const splitLines = (value) => {
  return String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const statusLabels = {
  draft: "Borrador",
  active: "Activo",
  suspended: "Suspendido",
};

function PlatformAdminApp() {
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [businesses, setBusinesses] = useState([]);
  const [loadingBusinesses, setLoadingBusinesses] = useState(false);
  const [listError, setListError] = useState("");
  const [form, setForm] = useState(createInitialForm);
  const [submitting, setSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [updatingBusinessId, setUpdatingBusinessId] = useState("");

  const selectedTemplate = templateOptions[form.templateKey];
  const previewResources = useMemo(
    () => splitLines(form.resources),
    [form.resources]
  );
  const previewServices = useMemo(
    () => splitLines(form.services),
    [form.services]
  );

  const loadBusinesses = async () => {
    setLoadingBusinesses(true);
    setListError("");

    try {
      const response = await getPlatformBusinesses();
      setBusinesses(response.data?.data || []);
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("platformAdminUser");
        setCurrentUser(null);
      }

      setListError(
        error.response?.data?.message || "No se pudieron cargar los negocios."
      );
    } finally {
      setLoadingBusinesses(false);
    }
  };

  useEffect(() => {
    try {
      const storedUser = JSON.parse(
        localStorage.getItem("platformAdminUser") || "null"
      );

      if (storedUser?.business_id === "__platform__") {
        setCurrentUser(storedUser);
      }
    } catch {
      localStorage.removeItem("platformAdminUser");
    } finally {
      setAuthReady(true);
    }
  }, []);

  useEffect(() => {
    if (currentUser?.business_id === "__platform__") {
      loadBusinesses();
    }
  }, [currentUser]);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleNameChange = (value) => {
    setForm((current) => {
      const previousAutoSlug = slugify(current.name);
      const previousAutoUsername = previousAutoSlug.replace(/-/g, "_");
      const nextSlug = slugify(value);

      return {
        ...current,
        name: value,
        slug:
          !current.slug || current.slug === previousAutoSlug
            ? nextSlug
            : current.slug,
        adminUsername:
          !current.adminUsername ||
          current.adminUsername === previousAutoUsername
            ? nextSlug.replace(/-/g, "_")
            : current.adminUsername,
      };
    });
  };

  const handleTemplateChange = (templateKey) => {
    const template = templateOptions[templateKey];

    setForm((current) => ({
      ...current,
      templateKey,
      primaryColor: template.primaryColor,
      services:
        !current.services ||
        Object.values(templateOptions).some(
          (option) => option.serviceExamples === current.services
        )
          ? template.serviceExamples
          : current.services,
    }));
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    if (loggingIn) return;

    setLoggingIn(true);
    setLoginError("");

    try {
      const response = await loginPlatformAdmin({
        username: username.trim(),
        password,
      });
      const user = response.data?.user;

      if (!user || user.business_id !== "__platform__") {
        throw new Error("La cuenta no tiene permisos de plataforma.");
      }

      localStorage.setItem("platformAdminUser", JSON.stringify(user));

      if (response.data?.token) {
        localStorage.setItem("authToken", response.data.token);
      }

      setCurrentUser(user);
      setPassword("");
    } catch (error) {
      setLoginError(
        error.response?.data?.message ||
          error.message ||
          "No se pudo iniciar sesion."
      );
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logoutPlatformAdmin().catch(() => {});
    localStorage.removeItem("authToken");
    localStorage.removeItem("platformAdminUser");
    setCurrentUser(null);
    setBusinesses([]);
  };

  const handleCreateBusiness = async (event) => {
    event.preventDefault();

    if (submitting) return;

    setSubmitting(true);
    setFormError("");
    setFormMessage("");

    try {
      const response = await createPlatformBusiness({
        ...form,
        resources: previewResources,
        services: previewServices,
        intervalMinutes: Number(form.intervalMinutes),
      });
      const createdBusiness = response.data?.data;

      setFormMessage(
        `${response.data?.message || "Negocio creado"}. URL: ${
          createdBusiness?.public_url || "pendiente"
        }`
      );
      setForm(createInitialForm());
      await loadBusinesses();
    } catch (error) {
      setFormError(
        error.response?.data?.message || "No se pudo crear el negocio."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (businessId, status) => {
    if (updatingBusinessId) return;

    setUpdatingBusinessId(businessId);
    setListError("");

    try {
      await updatePlatformBusinessStatus(businessId, status);
      await loadBusinesses();
    } catch (error) {
      setListError(
        error.response?.data?.message || "No se pudo actualizar el estado."
      );
    } finally {
      setUpdatingBusinessId("");
    }
  };

  const copyPublicUrl = async (slug) => {
    const url = `https://agendasmart.cl/${slug}`;

    try {
      await navigator.clipboard.writeText(url);
      setListError(`Enlace copiado: ${url}`);
    } catch {
      setListError(url);
    }
  };

  if (!authReady) {
    return <div style={styles.centeredPage}>Cargando panel interno...</div>;
  }

  if (!currentUser) {
    return (
      <div style={styles.centeredPage}>
        <form style={styles.loginCard} onSubmit={handleLogin}>
          <div style={styles.brandBadge}>AS</div>
          <h1 style={styles.loginTitle}>Administracion de plataforma</h1>
          <p style={styles.mutedText}>
            Acceso interno para crear y activar nuevos negocios.
          </p>
          <label style={styles.label}>
            Usuario
            <input
              style={styles.input}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label style={styles.label}>
            Contrasena
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <button style={styles.primaryButton} disabled={loggingIn}>
            {loggingIn ? "Ingresando..." : "Entrar"}
          </button>
          {loginError && <div style={styles.errorBox}>{loginError}</div>}
          <a href="/" style={styles.backLink}>
            Volver a AgendaSmart
          </a>
        </form>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <div style={styles.eyebrow}>AgendaSmart interno</div>
          <h1 style={styles.pageTitle}>Creacion de clientes</h1>
          <p style={styles.mutedText}>
            Crea, revisa y activa negocios sin modificar el codigo.
          </p>
        </div>
        <div style={styles.headerActions}>
          <span style={styles.userChip}>{currentUser.username}</span>
          <button style={styles.secondaryButton} onClick={handleLogout}>
            Cerrar sesion
          </button>
        </div>
      </header>

      <main style={styles.mainGrid}>
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <div style={styles.stepLabel}>Nuevo negocio</div>
              <h2 style={styles.sectionTitle}>Configuracion inicial</h2>
            </div>
            <span style={styles.statusDraft}>Borrador seguro</span>
          </div>

          <form onSubmit={handleCreateBusiness} style={styles.form}>
            <div style={styles.fieldGrid}>
              <label style={styles.label}>
                Plantilla
                <select
                  style={styles.input}
                  value={form.templateKey}
                  onChange={(event) => handleTemplateChange(event.target.value)}
                >
                  {Object.entries(templateOptions).map(([key, option]) => (
                    <option key={key} value={key}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span style={styles.helpText}>{selectedTemplate.description}</span>
              </label>

              <label style={styles.label}>
                Estado inicial
                <select
                  style={styles.input}
                  value={form.status}
                  onChange={(event) => updateForm("status", event.target.value)}
                >
                  <option value="draft">Borrador</option>
                  <option value="active">Activo</option>
                </select>
              </label>

              <label style={styles.label}>
                Nombre del negocio
                <input
                  style={styles.input}
                  value={form.name}
                  onChange={(event) => handleNameChange(event.target.value)}
                  required
                />
              </label>

              <label style={styles.label}>
                Slug publico
                <div style={styles.slugRow}>
                  <span style={styles.slugPrefix}>agendasmart.cl/</span>
                  <input
                    style={{ ...styles.input, flex: 1 }}
                    value={form.slug}
                    onChange={(event) =>
                      updateForm("slug", slugify(event.target.value))
                    }
                    required
                  />
                </div>
              </label>

              <label style={styles.label}>
                Correo de contacto
                <input
                  style={styles.input}
                  type="email"
                  value={form.contactEmail}
                  onChange={(event) =>
                    updateForm("contactEmail", event.target.value)
                  }
                  required
                />
              </label>

              <label style={styles.label}>
                Telefono o WhatsApp
                <input
                  style={styles.input}
                  value={form.phone}
                  onChange={(event) => updateForm("phone", event.target.value)}
                  placeholder="+56 9 1234 5678"
                />
              </label>

              <label style={styles.label}>
                Ciudad o comuna
                <input
                  style={styles.input}
                  value={form.location}
                  onChange={(event) =>
                    updateForm("location", event.target.value)
                  }
                />
              </label>

              <label style={styles.label}>
                Direccion
                <input
                  style={styles.input}
                  value={form.address}
                  onChange={(event) => updateForm("address", event.target.value)}
                />
              </label>
            </div>

            <div style={styles.divider} />
            <h3 style={styles.groupTitle}>Identidad y presentacion</h3>

            <div style={styles.fieldGrid}>
              <label style={styles.label}>
                Subtitulo
                <input
                  style={styles.input}
                  value={form.subtitle}
                  onChange={(event) =>
                    updateForm("subtitle", event.target.value)
                  }
                />
              </label>

              <label style={styles.label}>
                Horario visible
                <input
                  style={styles.input}
                  value={form.hours}
                  onChange={(event) => updateForm("hours", event.target.value)}
                />
              </label>

              <label style={styles.label}>
                URL del logo
                <input
                  style={styles.input}
                  value={form.logoUrl}
                  onChange={(event) => updateForm("logoUrl", event.target.value)}
                  placeholder="https://... o /carpeta/logo.png"
                />
              </label>

              <label style={styles.label}>
                URL de imagen principal
                <input
                  style={styles.input}
                  value={form.heroUrl}
                  onChange={(event) => updateForm("heroUrl", event.target.value)}
                />
              </label>

              <label style={styles.label}>
                Color principal
                <input
                  style={{ ...styles.input, height: "48px" }}
                  type="color"
                  value={form.primaryColor}
                  onChange={(event) =>
                    updateForm("primaryColor", event.target.value)
                  }
                />
              </label>

              <label style={{ ...styles.label, gridColumn: "1 / -1" }}>
                Descripcion
                <textarea
                  style={styles.textarea}
                  value={form.description}
                  onChange={(event) =>
                    updateForm("description", event.target.value)
                  }
                  rows={3}
                />
              </label>
            </div>

            <div style={styles.divider} />
            <h3 style={styles.groupTitle}>Agenda</h3>

            <div style={styles.fieldGrid}>
              <label style={styles.label}>
                {selectedTemplate.resourceLabel}
                <textarea
                  style={styles.textarea}
                  value={form.resources}
                  onChange={(event) =>
                    updateForm("resources", event.target.value)
                  }
                  placeholder="Uno por linea"
                  rows={5}
                  required
                />
              </label>

              <label style={styles.label}>
                Servicios
                <textarea
                  style={styles.textarea}
                  value={form.services}
                  onChange={(event) =>
                    updateForm("services", event.target.value)
                  }
                  placeholder="Uno por linea"
                  rows={5}
                  required
                />
              </label>

              <label style={styles.label}>
                Inicio de jornada
                <input
                  style={styles.input}
                  type="time"
                  value={form.startTime}
                  onChange={(event) =>
                    updateForm("startTime", event.target.value)
                  }
                />
              </label>

              <label style={styles.label}>
                Fin de jornada
                <input
                  style={styles.input}
                  type="time"
                  value={form.endTime}
                  onChange={(event) => updateForm("endTime", event.target.value)}
                />
              </label>

              <label style={styles.label}>
                Intervalo
                <select
                  style={styles.input}
                  value={form.intervalMinutes}
                  onChange={(event) =>
                    updateForm("intervalMinutes", event.target.value)
                  }
                >
                  <option value="15">15 minutos</option>
                  <option value="30">30 minutos</option>
                  <option value="45">45 minutos</option>
                  <option value="60">60 minutos</option>
                </select>
              </label>
            </div>

            <div style={styles.divider} />
            <h3 style={styles.groupTitle}>Pagina y acceso del cliente</h3>

            <div style={styles.fieldGrid}>
              <label style={styles.label}>
                Titulo de reserva
                <input
                  style={styles.input}
                  value={form.bookingTitle}
                  onChange={(event) =>
                    updateForm("bookingTitle", event.target.value)
                  }
                />
              </label>

              <label style={styles.label}>
                Usuario administrador
                <input
                  style={styles.input}
                  value={form.adminUsername}
                  onChange={(event) =>
                    updateForm(
                      "adminUsername",
                      event.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, "")
                    )
                  }
                  autoComplete="off"
                  required
                />
              </label>

              <label style={styles.label}>
                Contrasena temporal
                <input
                  style={styles.input}
                  type="password"
                  minLength={12}
                  value={form.adminPassword}
                  onChange={(event) =>
                    updateForm("adminPassword", event.target.value)
                  }
                  autoComplete="new-password"
                  required
                />
                <span style={styles.helpText}>Minimo 12 caracteres.</span>
              </label>

              <label style={{ ...styles.label, gridColumn: "1 / -1" }}>
                Texto de ayuda para reservar
                <textarea
                  style={styles.textarea}
                  value={form.bookingDescription}
                  onChange={(event) =>
                    updateForm("bookingDescription", event.target.value)
                  }
                  rows={2}
                />
              </label>
            </div>

            {formError && <div style={styles.errorBox}>{formError}</div>}
            {formMessage && <div style={styles.successBox}>{formMessage}</div>}

            <button style={styles.primaryButton} disabled={submitting}>
              {submitting ? "Creando negocio..." : "Crear negocio"}
            </button>
          </form>
        </section>

        <aside style={styles.previewColumn}>
          <section style={styles.card}>
            <div style={styles.stepLabel}>Vista previa</div>
            <div
              style={{
                ...styles.previewHero,
                background: form.heroUrl
                  ? `linear-gradient(rgba(15,23,42,.35), rgba(15,23,42,.55)), url(${form.heroUrl}) center/cover`
                  : `linear-gradient(135deg, ${form.primaryColor}, #0f172a)`,
              }}
            >
              {form.logoUrl ? (
                <img src={form.logoUrl} alt="" style={styles.previewLogo} />
              ) : (
                <div style={styles.previewLogoFallback}>AS</div>
              )}
              <h2 style={styles.previewTitle}>{form.name || "Nuevo negocio"}</h2>
              <p style={styles.previewSubtitle}>
                {form.subtitle || selectedTemplate.description}
              </p>
            </div>
            <div style={styles.previewBody}>
              <div style={styles.previewUrl}>
                agendasmart.cl/{form.slug || "nuevo-negocio"}
              </div>
              <h3 style={{ marginBottom: "8px" }}>
                {form.bookingTitle || "Reserva tu hora"}
              </h3>
              <p style={styles.mutedText}>{form.bookingDescription}</p>
              <div style={styles.previewStats}>
                <span>{previewResources.length} recursos</span>
                <span>{previewServices.length} servicios</span>
                <span>{form.intervalMinutes} min</span>
              </div>
              <button
                type="button"
                style={{
                  ...styles.previewButton,
                  backgroundColor: form.primaryColor,
                }}
              >
                Confirmar reserva
              </button>
            </div>
          </section>
        </aside>
      </main>

      <section style={{ ...styles.card, marginTop: "24px" }}>
        <div style={styles.sectionHeader}>
          <div>
            <div style={styles.stepLabel}>Clientes</div>
            <h2 style={styles.sectionTitle}>Negocios registrados</h2>
          </div>
          <button style={styles.secondaryButton} onClick={loadBusinesses}>
            Actualizar
          </button>
        </div>

        {listError && <div style={styles.infoBox}>{listError}</div>}

        {loadingBusinesses ? (
          <p style={styles.mutedText}>Cargando negocios...</p>
        ) : (
          <div style={styles.businessGrid}>
            {businesses.map((business) => (
              <article key={business.id} style={styles.businessCard}>
                <div style={styles.businessCardHeader}>
                  <div>
                    <strong>{business.name}</strong>
                    <div style={styles.businessSlug}>/{business.slug}</div>
                  </div>
                  <span
                    style={{
                      ...styles.statusBadge,
                      ...(business.status === "active"
                        ? styles.statusActive
                        : business.status === "suspended"
                          ? styles.statusSuspended
                          : styles.statusDraft),
                    }}
                  >
                    {statusLabels[business.status] || business.status}
                  </span>
                </div>
                <div style={styles.businessMeta}>
                  <span>{business.template_key || "Configuracion manual"}</span>
                  <span>{business.contact_email || "Sin contacto"}</span>
                  <span>
                    Usuario: {business.admin_users?.[0]?.username || "Sin usuario"}
                  </span>
                </div>
                <div style={styles.businessActions}>
                  <button
                    style={styles.smallButton}
                    onClick={() => copyPublicUrl(business.slug)}
                  >
                    Copiar enlace
                  </button>
                  <select
                    style={styles.smallSelect}
                    value={business.status}
                    disabled={updatingBusinessId === business.id}
                    onChange={(event) =>
                      handleStatusChange(business.id, event.target.value)
                    }
                  >
                    <option value="draft">Borrador</option>
                    <option value="active">Activo</option>
                    <option value="suspended">Suspendido</option>
                  </select>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f1f5f9",
    color: "#0f172a",
    fontFamily: "Inter, Arial, sans-serif",
    padding: "28px clamp(16px, 4vw, 56px) 56px",
  },
  centeredPage: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#0f172a",
    color: "#0f172a",
    padding: "20px",
    fontFamily: "Inter, Arial, sans-serif",
  },
  loginCard: {
    width: "min(420px, 100%)",
    background: "#ffffff",
    borderRadius: "22px",
    padding: "32px",
    boxShadow: "0 24px 60px rgba(0,0,0,.28)",
    display: "grid",
    gap: "16px",
  },
  brandBadge: {
    width: "54px",
    height: "54px",
    borderRadius: "16px",
    background: "#2563eb",
    color: "#ffffff",
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
  },
  loginTitle: { margin: 0, fontSize: "26px" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
    maxWidth: "1500px",
    margin: "0 auto 24px",
  },
  headerActions: { display: "flex", alignItems: "center", gap: "10px" },
  eyebrow: {
    color: "#2563eb",
    fontSize: "12px",
    fontWeight: 900,
    letterSpacing: ".12em",
    textTransform: "uppercase",
  },
  pageTitle: { margin: "6px 0", fontSize: "clamp(28px, 4vw, 42px)" },
  userChip: {
    background: "#e2e8f0",
    borderRadius: "999px",
    padding: "10px 14px",
    fontWeight: 800,
  },
  mainGrid: {
    maxWidth: "1500px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.65fr) minmax(300px, .75fr)",
    gap: "24px",
    alignItems: "start",
  },
  card: {
    background: "#ffffff",
    borderRadius: "20px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 10px 30px rgba(15,23,42,.06)",
    padding: "clamp(18px, 3vw, 28px)",
    maxWidth: "1500px",
    marginLeft: "auto",
    marginRight: "auto",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "22px",
  },
  sectionTitle: { margin: "4px 0 0", fontSize: "24px" },
  stepLabel: {
    color: "#2563eb",
    fontSize: "12px",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: ".1em",
  },
  statusBadge: {
    display: "inline-flex",
    padding: "5px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 900,
  },
  statusDraft: {
    background: "#fef3c7",
    color: "#92400e",
    padding: "7px 11px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 900,
  },
  statusActive: { background: "#dcfce7", color: "#166534" },
  statusSuspended: { background: "#fee2e2", color: "#991b1b" },
  form: { display: "grid", gap: "18px" },
  fieldGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "16px",
  },
  label: {
    display: "grid",
    gap: "7px",
    color: "#334155",
    fontSize: "13px",
    fontWeight: 800,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #cbd5e1",
    borderRadius: "11px",
    padding: "11px 12px",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: "14px",
    outlineColor: "#2563eb",
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #cbd5e1",
    borderRadius: "11px",
    padding: "11px 12px",
    resize: "vertical",
    fontFamily: "inherit",
    fontSize: "14px",
    outlineColor: "#2563eb",
  },
  helpText: { color: "#64748b", fontSize: "12px", fontWeight: 500 },
  slugRow: { display: "flex", alignItems: "center", gap: "8px" },
  slugPrefix: { color: "#64748b", fontSize: "13px", whiteSpace: "nowrap" },
  divider: { height: "1px", background: "#e2e8f0", margin: "4px 0" },
  groupTitle: { margin: "0", fontSize: "17px" },
  primaryButton: {
    border: 0,
    borderRadius: "11px",
    padding: "12px 18px",
    background: "#2563eb",
    color: "#ffffff",
    fontWeight: 900,
    fontSize: "14px",
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    padding: "10px 14px",
    background: "#ffffff",
    color: "#0f172a",
    fontWeight: 800,
    cursor: "pointer",
  },
  errorBox: {
    padding: "11px 13px",
    borderRadius: "10px",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#991b1b",
    fontWeight: 700,
  },
  successBox: {
    padding: "11px 13px",
    borderRadius: "10px",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#166534",
    fontWeight: 700,
  },
  infoBox: {
    padding: "10px 12px",
    marginBottom: "16px",
    borderRadius: "10px",
    background: "#eff6ff",
    color: "#1e40af",
  },
  backLink: { textAlign: "center", color: "#2563eb", fontWeight: 700 },
  mutedText: { color: "#64748b", lineHeight: 1.5, margin: 0 },
  previewColumn: { position: "sticky", top: "20px" },
  previewHero: {
    minHeight: "220px",
    borderRadius: "16px 16px 0 0",
    padding: "24px",
    color: "#ffffff",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    margin: "18px -4px 0",
  },
  previewLogo: {
    width: "72px",
    height: "72px",
    objectFit: "contain",
    background: "#ffffff",
    borderRadius: "16px",
    marginBottom: "14px",
  },
  previewLogoFallback: {
    width: "64px",
    height: "64px",
    display: "grid",
    placeItems: "center",
    background: "rgba(255,255,255,.92)",
    color: "#0f172a",
    borderRadius: "16px",
    fontWeight: 900,
    marginBottom: "14px",
  },
  previewTitle: { margin: 0, fontSize: "26px" },
  previewSubtitle: { margin: "7px 0 0", opacity: 0.9, lineHeight: 1.4 },
  previewBody: { padding: "20px 4px 0" },
  previewUrl: {
    display: "inline-block",
    padding: "6px 9px",
    borderRadius: "8px",
    background: "#f1f5f9",
    color: "#475569",
    fontSize: "12px",
    marginBottom: "12px",
  },
  previewStats: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    margin: "16px 0",
    color: "#475569",
    fontSize: "12px",
  },
  previewButton: {
    border: 0,
    borderRadius: "10px",
    width: "100%",
    padding: "12px",
    color: "#ffffff",
    fontWeight: 900,
  },
  businessGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
    gap: "14px",
  },
  businessCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "16px",
    display: "grid",
    gap: "14px",
  },
  businessCardHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "10px",
  },
  businessSlug: { color: "#64748b", fontSize: "12px", marginTop: "4px" },
  businessMeta: { display: "grid", gap: "5px", color: "#475569", fontSize: "12px" },
  businessActions: { display: "flex", gap: "8px", alignItems: "center" },
  smallButton: {
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    padding: "8px 10px",
    background: "#ffffff",
    fontWeight: 800,
    cursor: "pointer",
  },
  smallSelect: {
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    padding: "8px",
    background: "#ffffff",
  },
};

export default PlatformAdminApp;
