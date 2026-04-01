import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_URL = "https://barbershop-scheduler.onrender.com";
const SHEETS_URL =
  "https://script.google.com/macros/s/AKfycbwYenifhbLBZXFMTL8H5Z_98ErR_WZgYSeEaVjwh5lezubvf15JN06MREfiaQ62DfcYkA/exec";

const BARBER_PHONES = {
  James: "56988287547",
  Jesús: "56957265409",
};

const BARBERS = ["James", "Jesús"];
const SERVICES = ["Corte de pelo", "Corte de pelo + barba"];

function App() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [service, setService] = useState("");
  const [barber, setBarber] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [selectedWeekStart, setSelectedWeekStart] = useState(getMonday(new Date()));
  const [weeklyBarberFilter, setWeeklyBarberFilter] = useState("");
  const [clientSearch, setClientSearch] = useState("");

  const [isLoggedIn, setIsLoggedIn] = useState(false);
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

  function getMonday(d) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + diff);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function formatDateToInput(dateObj) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatHourLabel(hour) {
    return `${String(hour).padStart(2, "0")}:00`;
  }

  function addDays(dateObj, days) {
    const d = new Date(dateObj);
    d.setDate(d.getDate() + days);
    return d;
  }

  function sameDate(dateString, dateObj) {
    if (!dateString || !dateObj) return false;
    const normalizedDate = String(dateString).slice(0, 10);
    return normalizedDate === formatDateToInput(dateObj);
  }

  async function syncToGoogleSheets(payload) {
    try {
      const response = await fetch(SHEETS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text();

      try {
        const data = JSON.parse(text);
        console.log("Guardado en Sheets:", data);
      } catch {
        console.log("Respuesta Sheets:", text);
      }
    } catch (error) {
      console.error("Error guardando en Sheets:", error);
    }
  }

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

  useEffect(() => {
    if (weekDays.length > 0) {
      const stillExists = weekDays.some(
        (day) =>
          selectedMobileDay &&
          formatDateToInput(day) === formatDateToInput(selectedMobileDay)
      );

      if (!selectedMobileDay || !stillExists) {
        setSelectedMobileDay(weekDays[0]);
      }
    }
  }, [weekDays, selectedMobileDay]);

  const hours = Array.from({ length: 12 }, (_, i) => i + 9);

  const getAppointments = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/appointments`);
      setAppointments(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setMessage("Error al cargar citas");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDate("");
    setTime("");
    setService("");
    setBarber("");
    setEditingId(null);
  };

  const createAppointment = async () => {
    if (submitting) return;

    if (!name.trim() || !date || !time || !service.trim() || !barber) {
      setMessage("Completa todos los campos para agendar.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      await axios.post(`${API_URL}/appointments`, {
        name: name.trim(),
        date,
        time,
        service: service.trim(),
        barber,
      });

      const phone = BARBER_PHONES[barber] || BARBER_PHONES.James;

      const messageText = `Hola! 👋

Quiero confirmar mi reserva:

👤 Nombre: ${name.trim()}
💈 Barbero: ${barber}
✂️ Servicio: ${service.trim()}
📅 Fecha: ${date}
⏰ Hora: ${time}

Quedo atento, gracias 🙌`;

      const encodedMessage = encodeURIComponent(messageText);
      const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;

      await syncToGoogleSheets({
        date,
        time,
        name: name.trim(),
        barber,
        service: service.trim(),
      });

      resetForm();
      setSelectedWeekStart(getMonday(new Date()));
      setMessage("Cita creada correctamente ✅");
      await getAppointments();

      window.open(whatsappUrl, "_blank");
    } catch (err) {
      if (err.response?.data?.message) {
        setMessage(err.response.data.message);
      } else {
        setMessage("Error al crear cita");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const updateAppointment = async () => {
    if (submitting || !editingId) return;

    if (!name.trim() || !date || !time || !service.trim() || !barber) {
      setMessage("Completa todos los campos para actualizar.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      await axios.put(`${API_URL}/appointments/${editingId}`, {
        name: name.trim(),
        date,
        time,
        service: service.trim(),
        barber,
      });

      await syncToGoogleSheets({
        date,
        time,
        name: name.trim(),
        barber,
        service: service.trim(),
      });

      resetForm();
      setMessage("Cita actualizada correctamente ✅");
      await getAppointments();
    } catch (err) {
      if (err.response?.data?.message) {
        setMessage(err.response.data.message);
      } else {
        setMessage("Error al actualizar cita");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const deleteAppointment = async (id) => {
    if (submitting) return;

    const confirmed = window.confirm("¿Seguro que quieres eliminar esta cita?");
    if (!confirmed) return;

    setSubmitting(true);

    try {
      await axios.delete(`${API_URL}/appointments/${id}`);
      setMessage("Cita eliminada correctamente ✅");
      await getAppointments();
    } catch (err) {
      console.error(err);
      setMessage("Error al eliminar cita");
    } finally {
      setSubmitting(false);
    }
  };

  const editAppointment = (appointment) => {
    setName(appointment.name || "");
    setDate(String(appointment.date || "").slice(0, 10));
    setTime(String(appointment.time || "").slice(0, 5));
    setService(appointment.service || "");
    setBarber(appointment.barber || "");
    setEditingId(appointment.id);
    setMessage("Editando cita ✏️");

    if (appointment.date) {
      const appointmentDate = new Date(String(appointment.date).slice(0, 10) + "T00:00:00");
      setSelectedWeekStart(getMonday(appointmentDate));
      setSelectedMobileDay(appointmentDate);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const selectSlot = (day, hour) => {
    setDate(formatDateToInput(day));
    setTime(`${String(hour).padStart(2, "0")}:00`);
    setEditingId(null);
    setMessage("Bloque horario seleccionado.");
  };

  const handleLogin = async () => {
    if (loggingIn) return;

    if (!username.trim() || !password.trim()) {
      setLoginError("Ingresa usuario y contraseña");
      return;
    }

    setLoggingIn(true);
    setLoginError("");

    try {
      const res = await axios.post(`${API_URL}/login`, {
        username: username.trim(),
        password,
      });

      setIsLoggedIn(true);
      setLoginError("");
      setAppMode("admin");
      localStorage.setItem("user", JSON.stringify(res.data.user));
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

  const handleLogout = () => {
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    setUsername("");
    setPassword("");
    setLoginError("");
    setAppMode("client");
  };

  const getBarberColors = (barberName) => {
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
    const currentMonday = getMonday(new Date());
    setSelectedWeekStart(currentMonday);
    setSelectedMobileDay(currentMonday);
  };

  const isClientMode = appMode === "client";
  const isAdminMode = appMode === "admin" && isLoggedIn;

  const getAppointmentsForSlot = (day, hour) => {
    return appointments.filter((appointment) => {
      const rawTime = String(appointment.time || "");
      const appointmentHour = rawTime.slice(0, 2);

      const matchesDay = sameDate(appointment.date, day);
      const matchesHour = Number(appointmentHour) === hour;

      const activeBarberFilter = isClientMode ? barber : weeklyBarberFilter;

      const matchesBarber = activeBarberFilter
        ? appointment.barber === activeBarberFilter
        : true;

      const matchesClient = clientSearch
        ? String(appointment.name || "")
            .toLowerCase()
            .includes(clientSearch.toLowerCase())
        : true;

      return matchesDay && matchesHour && matchesBarber && matchesClient;
    });
  };

  const mobileSlots = useMemo(() => {
    if (!selectedMobileDay) return [];

    return hours.map((hour) => {
      const slotAppointments = getAppointmentsForSlot(selectedMobileDay, hour);

      return {
        hour,
        label: formatHourLabel(hour),
        appointments: slotAppointments,
        isOccupied: slotAppointments.length > 0,
      };
    });
  }, [selectedMobileDay, appointments, barber, weeklyBarberFilter, clientSearch]);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      setIsLoggedIn(true);
      setAppMode("admin");
    }

    getAppointments();
  }, []);

  const styles = {
    page: {
  minHeight: "100vh",
  backgroundColor: "#f3f4f6",
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
  backgroundColor: "#fff",
  borderRadius: "14px",
  padding: isMobile ? "16px" : "20px",
  boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
  border: "1px solid #e5e7eb",
  boxSizing: "border-box",
  width: "100%",
  minWidth: 0,
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
      backgroundColor: "#111827",
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
      backgroundColor: "#111827",
      color: "#fff",
      padding: "12px",
      fontWeight: "bold",
      borderRight: "1px solid #374151",
      minHeight: "70px",
      textTransform: "capitalize",
    },
    timeHeaderCell: {
      backgroundColor: "#1f2937",
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
      backgroundColor: "#f9fafb",
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
    disabledButton: {
      opacity: 0.6,
      cursor: "not-allowed",
    },
    mobileSlotsWrapper: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "10px",
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
      backgroundColor: "#f3f4f6",
      color: "#9ca3af",
      cursor: "not-allowed",
    },
    mobileSlotSelected: {
      backgroundColor: "#111827",
      color: "#ffffff",
      border: "1px solid #111827",
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

  const isClientFormComplete =
    name.trim() && date && time && service.trim() && barber;

  const isBarberSelected = Boolean(barber);

  if (appMode === "admin" && !isLoggedIn) {
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
            <div style={{ fontSize: "34px", marginBottom: "8px" }}>💈</div>
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
              Accede al panel de administración para gestionar reservas, horarios y clientes.
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

  return (
    <>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

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
  {isClientMode ? "Reserva tu hora 💈" : "Agenda Barbería 💈"}
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
                style={{ ...styles.button, ...styles.secondaryButton }}
                onClick={() => setAppMode("admin")}
              >
                Iniciar sesión
              </button>
            )}
          </div>
        </div>

        {isClientMode ? (
          <div style={styles.card}>
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{ marginTop: 0 }}>Agenda tu hora</h2>
              <p style={{ color: "#4b5563", lineHeight: 1.5, marginBottom: "8px" }}>
                Elige tu barbero, selecciona un bloque disponible y confirma tu reserva en segundos.
              </p>
              <p
                style={{
                  color: "#2563eb",
                  fontWeight: "bold",
                  margin: 0,
                  fontSize: "14px",
                }}
              >
                Para reservar, primero selecciona un bloque disponible en el calendario.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              <input
                style={styles.input}
                placeholder="Tu nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <select
                style={styles.select}
                value={service}
                onChange={(e) => setService(e.target.value)}
              >
                <option value="">Selecciona un servicio</option>
                {SERVICES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <select
                style={styles.select}
                value={barber}
                onChange={(e) => setBarber(e.target.value)}
              >
                <option value="">Selecciona un barbero</option>
                {BARBERS.map((barberName) => (
                  <option key={barberName} value={barberName}>
                    {barberName}
                  </option>
                ))}
              </select>

              <div
                style={{
                  backgroundColor: "#f9fafb",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  padding: "12px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  minHeight: "44px",
                }}
              >
                <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: "bold" }}>
                  Fecha seleccionada
                </span>
                <span style={{ fontSize: "14px", color: "#111827" }}>
                  {date || "Selecciona un bloque disponible"}
                </span>
              </div>

              <div
                style={{
                  backgroundColor: "#f9fafb",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  padding: "12px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  minHeight: "44px",
                }}
              >
                <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: "bold" }}>
                  Hora seleccionada
                </span>
                <span style={{ fontSize: "14px", color: "#111827" }}>
                  {time || "Selecciona un bloque disponible"}
                </span>
              </div>

              <button
                style={{
                  ...styles.button,
                  ...styles.primaryButton,
                  ...((submitting || !isClientFormComplete)
                    ? styles.disabledButton
                    : {}),
                }}
                onClick={createAppointment}
                disabled={submitting || !isClientFormComplete}
              >
                {submitting ? "Reservando..." : "Confirmar reserva"}
              </button>
            </div>

            {message && <p style={styles.message}>{message}</p>}

            <div style={styles.topBar}>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <h2 style={{ margin: 0 }}>Disponibilidad semanal</h2>

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
                  {barber ? `Barbero seleccionado: ${barber}` : "Selecciona un barbero arriba"}
                </div>
              </div>

              <div style={styles.weekActions}>
                <button
                  style={{ ...styles.button, ...styles.secondaryButton }}
                  onClick={goToPreviousWeek}
                >
                  ← Semana anterior
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
                  Semana siguiente →
                </button>
              </div>
            </div>

            {isMobile && (
              <div style={{ marginBottom: "14px", overflowX: "auto" }}>
                <div style={{ display: "flex", gap: "8px" }}>
                  {weekDays.map((day) => {
                    const isActive =
                      selectedMobileDay &&
                      formatDateToInput(day) === formatDateToInput(selectedMobileDay);

                    return (
                      <button
                        key={formatDateToInput(day)}
                        onClick={() => setSelectedMobileDay(day)}
                        style={{
                          ...styles.button,
                          backgroundColor: isActive ? "#111827" : "#ffffff",
                          color: isActive ? "#ffffff" : "#111827",
                          border: isActive ? "1px solid #111827" : "1px solid #d1d5db",
                          borderRadius: "10px",
                          minWidth: "74px",
                          padding: "10px 12px",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        <div style={{ textTransform: "capitalize", fontSize: "13px" }}>
                          {day.toLocaleDateString("es-CL", { weekday: "short" })}
                        </div>
                        <div style={{ fontSize: "12px", opacity: 0.9 }}>
                          {day.getDate()}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={styles.calendarWrapper}>
              {loading ? (
                <div style={styles.spinnerBox}>
                  <div style={styles.spinner}></div>
                </div>
              ) : isMobile ? (
                <div style={styles.mobileSlotsWrapper}>
                  {mobileSlots.map((slot) => {
                    const isSelected =
                      selectedMobileDay &&
                      date &&
                      sameDate(date, selectedMobileDay) &&
                      time &&
                      time.startsWith(String(slot.hour).padStart(2, "0"));

                    const isDisabled = slot.isOccupied || !isBarberSelected;

                    return (
                      <button
                        key={slot.hour}
                        type="button"
                        onClick={() => {
                          if (isDisabled) return;
                          setDate(formatDateToInput(selectedMobileDay));
                          setTime(`${String(slot.hour).padStart(2, "0")}:00`);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        disabled={isDisabled}
                        style={{
                          ...styles.mobileSlotButton,
                          ...(slot.isOccupied || !isBarberSelected ? styles.mobileSlotOccupied : {}),
                          ...(isSelected ? styles.mobileSlotSelected : {}),
                        }}
                      >
                        <div style={styles.mobileSlotTime}>{slot.label}</div>
                        <div style={styles.mobileSlotStatus}>
                          {!isBarberSelected
                            ? "Elige barbero"
                            : slot.isOccupied
                            ? "Ocupado"
                            : "Disponible"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div style={styles.calendarGrid}>
                  <div style={styles.timeHeaderCell}>Hora</div>

                  {weekDays.map((day, index) => (
                    <div key={index} style={styles.headerCell}>
                      <div>{day.toLocaleDateString("es-CL", { weekday: "long" })}</div>
                      <div>{day.toLocaleDateString("es-CL")}</div>
                    </div>
                  ))}

                  {hours.map((hour) => (
                    <React.Fragment key={hour}>
                      <div style={styles.timeCell}>{formatHourLabel(hour)}</div>

                      {weekDays.map((day, index) => {
                        const slotAppointments = getAppointmentsForSlot(day, hour);

                        return (
                          <div key={`${hour}-${index}`} style={styles.slotCell}>
                            {slotAppointments.length > 0 ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {slotAppointments.map((appointment) => (
                                  <div
                                    key={appointment.id}
                                    style={{
                                      ...styles.appointmentBlock,
                                      ...getBarberColors(appointment.barber),
                                    }}
                                  >
                                    <div style={styles.appointmentTitle}>Ocupado</div>
                                    <div style={styles.appointmentMeta}>{appointment.barber}</div>
                                    <div style={styles.appointmentMeta}>
                                      {String(appointment.time).slice(0, 5)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <button
                                style={{
                                  ...styles.tinyButton,
                                  ...styles.secondaryButton,
                                  width: "100%",
                                  ...(!isBarberSelected ? styles.disabledButton : {}),
                                }}
                                onClick={() => {
                                  if (!isBarberSelected) return;
                                  selectSlot(day, hour);
                                }}
                                disabled={!isBarberSelected}
                              >
                                {isBarberSelected ? "Disponible" : "Elige barbero"}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={styles.layout}>
            <div style={{ ...styles.card, maxWidth: isCompactAdmin ? "100%" : "320px" }}>
  <h2 style={styles.sectionTitle}>
    {editingId ? "Editar cita" : "Nueva cita"}
  </h2>

              <div style={styles.formGroup}>
                <input
                  style={styles.input}
                  placeholder="Nombre cliente"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />

                <input
                  style={styles.input}
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />

                <input
                  style={styles.input}
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />

                <input
                  style={styles.input}
                  placeholder="Servicio"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                />

                <select
                  style={styles.select}
                  value={barber}
                  onChange={(e) => setBarber(e.target.value)}
                >
                  <option value="">Selecciona un barbero</option>
                  {BARBERS.map((barberName) => (
                    <option key={barberName} value={barberName}>
                      {barberName}
                    </option>
                  ))}
                </select>

                {editingId ? (
                  <>
                    <button
                      style={{
                        ...styles.button,
                        ...styles.editButton,
                        ...(submitting ? styles.disabledButton : {}),
                      }}
                      onClick={updateAppointment}
                      disabled={submitting}
                    >
                      {submitting ? "Actualizando..." : "Actualizar cita"}
                    </button>

                    <button
                      style={{ ...styles.button, ...styles.secondaryButton }}
                      onClick={resetForm}
                    >
                      Cancelar edición
                    </button>
                  </>
                ) : (
                  <button
                    style={{
                      ...styles.button,
                      ...styles.primaryButton,
                      ...(submitting ? styles.disabledButton : {}),
                    }}
                    onClick={createAppointment}
                    disabled={submitting}
                  >
                    {submitting ? "Creando..." : "Crear cita"}
                  </button>
                )}

                {message && <p style={styles.message}>{message}</p>}
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.topBar}>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <h2 style={{ margin: 0 }}>Vista semanal</h2>

                  <input
                    style={{ ...styles.input, minWidth: "220px" }}
                    type="text"
                    placeholder="Buscar por cliente"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                  />

                  <select
                    style={{ ...styles.select, minWidth: "220px" }}
                    value={weeklyBarberFilter}
                    onChange={(e) => setWeeklyBarberFilter(e.target.value)}
                  >
                    <option value="">Todos los barberos</option>
                    {BARBERS.map((barberName) => (
                      <option key={barberName} value={barberName}>
                        {barberName}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.weekActions}>
                  <button
                    style={{ ...styles.button, ...styles.secondaryButton }}
                    onClick={goToPreviousWeek}
                  >
                    ← Semana anterior
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
                    Semana siguiente →
                  </button>
                </div>
              </div>

              {isMobile && (
                <div style={{ marginBottom: "14px", overflowX: "auto" }}>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {weekDays.map((day) => {
                      const isActive =
                        selectedMobileDay &&
                        formatDateToInput(day) === formatDateToInput(selectedMobileDay);

                      return (
                        <button
                          key={formatDateToInput(day)}
                          onClick={() => setSelectedMobileDay(day)}
                          style={{
                            ...styles.button,
                            backgroundColor: isActive ? "#111827" : "#ffffff",
                            color: isActive ? "#ffffff" : "#111827",
                            border: isActive ? "1px solid #111827" : "1px solid #d1d5db",
                            borderRadius: "10px",
                            minWidth: "74px",
                            padding: "10px 12px",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                        >
                          <div style={{ textTransform: "capitalize", fontSize: "13px" }}>
                            {day.toLocaleDateString("es-CL", { weekday: "short" })}
                          </div>
                          <div style={{ fontSize: "12px", opacity: 0.9 }}>
                            {day.getDate()}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={styles.calendarWrapper}>
                {loading ? (
                  <div style={styles.spinnerBox}>
                    <div style={styles.spinner}></div>
                  </div>
                ) : isMobile ? (
                  <div style={styles.mobileSlotsWrapper}>
                    {mobileSlots.map((slot) => {
                      const firstAppointment = slot.appointments[0];

                      return slot.isOccupied ? (
                        <div
                          key={slot.hour}
                          style={{
                            ...styles.mobileSlotButton,
                            textAlign: "left",
                            padding: "14px",
                            borderRadius: "14px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                            background: "#ffffff",
                            color: "#111827",
                            cursor: "default",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#6b7280",
                              marginBottom: "6px",
                            }}
                          >
                            {slot.label}
                          </div>

                          <div
                            style={{
                              fontSize: "15px",
                              fontWeight: "600",
                              marginBottom: "2px",
                            }}
                          >
                            {firstAppointment?.name}
                          </div>

                          <div style={{ fontSize: "12px", marginBottom: "2px" }}>
                            {firstAppointment?.service}
                          </div>

                          <div style={{ fontSize: "12px", marginBottom: "8px" }}>
                            {firstAppointment?.barber}
                          </div>

                          <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                            <button
                              type="button"
                              style={{
                                ...styles.tinyButton,
                                ...styles.editButton,
                                flex: 1,
                              }}
                              onClick={() => editAppointment(firstAppointment)}
                            >
                              Editar
                            </button>

                            <button
                              type="button"
                              style={{
                                ...styles.tinyButton,
                                ...styles.dangerButton,
                                flex: 1,
                              }}
                              onClick={() => deleteAppointment(firstAppointment.id)}
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          key={slot.hour}
                          type="button"
                          onClick={() => selectSlot(selectedMobileDay, slot.hour)}
                          style={{
                            ...styles.mobileSlotButton,
                            textAlign: "center",
                          }}
                        >
                          <div style={styles.mobileSlotTime}>{slot.label}</div>
                          <div style={styles.mobileSlotStatus}>Disponible</div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div style={styles.calendarGrid}>
                    <div style={styles.timeHeaderCell}>Hora</div>

                    {weekDays.map((day, index) => (
                      <div key={index} style={styles.headerCell}>
                        <div>{day.toLocaleDateString("es-CL", { weekday: "long" })}</div>
                        <div>{day.toLocaleDateString("es-CL")}</div>
                      </div>
                    ))}

                    {hours.map((hour) => (
                      <React.Fragment key={hour}>
                        <div style={styles.timeCell}>{formatHourLabel(hour)}</div>

                        {weekDays.map((day, index) => {
                          const slotAppointments = getAppointmentsForSlot(day, hour);

                          return (
                            <div key={`${hour}-${index}`} style={styles.slotCell}>
                              {slotAppointments.length > 0 ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                  {slotAppointments.map((appointment) => (
                                    <div
                                      key={appointment.id}
                                      style={{
                                        ...styles.appointmentBlock,
                                        ...getBarberColors(appointment.barber),
                                      }}
                                    >
                                      <div style={styles.appointmentTitle}>{appointment.name}</div>
                                      <div style={styles.appointmentMeta}>{appointment.service}</div>
                                      <div style={styles.appointmentMeta}>{appointment.barber}</div>
                                      <div style={styles.appointmentMeta}>
                                        {String(appointment.time).slice(0, 5)}
                                      </div>

                                      <div style={styles.actionRow}>
                                        <button
                                          style={{
                                            ...styles.tinyButton,
                                            ...styles.editButton,
                                            ...(submitting ? styles.disabledButton : {}),
                                          }}
                                          onClick={() => editAppointment(appointment)}
                                          disabled={submitting}
                                        >
                                          Editar
                                        </button>

                                        <button
                                          style={{
                                            ...styles.tinyButton,
                                            ...styles.dangerButton,
                                            ...(submitting ? styles.disabledButton : {}),
                                          }}
                                          onClick={() => deleteAppointment(appointment.id)}
                                          disabled={submitting}
                                        >
                                          Eliminar
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <button
                                  style={{
                                    ...styles.tinyButton,
                                    ...styles.secondaryButton,
                                    width: "100%",
                                  }}
                                  onClick={() => selectSlot(day, hour)}
                                >
                                  Disponible
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default App;