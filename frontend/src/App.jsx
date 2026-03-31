import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

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
  const [appMode, setAppMode] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

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
    const normalizedDate = String(dateString).slice(0, 10);
    return normalizedDate === formatDateToInput(dateObj);
  }

  const weekDays = useMemo(() => {
  if (isMobile) {
    return [new Date()];
  }

  return Array.from({ length: 7 }, (_, i) => addDays(selectedWeekStart, i));
}, [selectedWeekStart, isMobile]);

  const hours = Array.from({ length: 12 }, (_, i) => i + 9);

  const getAppointments = () => {
    setLoading(true);

    axios
      .get("https://barbershop-scheduler.onrender.com/appointments")
      .then((res) => setAppointments(res.data))
      .catch((err) => {
        console.error(err);
        setMessage("Error al cargar citas");
      })
      .finally(() => setLoading(false));
  };

  const resetForm = () => {
    setName("");
    setDate("");
    setTime("");
    setService("");
    setBarber("");
    setEditingId(null);
  };

  const createAppointment = () => {
  if (submitting) return;

  setSubmitting(true);
  setMessage("");

  axios
    .post("https://barbershop-scheduler.onrender.com/appointments", {
      name,
      date,
      time,
      service,
      barber,
    })
    .then(() => {
      resetForm();
      setSelectedWeekStart(getMonday(new Date()));
      setMessage("Cita creada correctamente ✅");
      getAppointments();
    })
    .catch((err) => {
      if (err.response?.data?.message) {
        setMessage(err.response.data.message);
      } else {
        setMessage("Error al crear cita");
      }
    })
    .finally(() => setSubmitting(false));
};

  const updateAppointment = () => {
  if (submitting) return;

  setSubmitting(true);
  setMessage("");

  axios
    .put(`https://barbershop-scheduler.onrender.com/appointments/${editingId}`, {
      name,
      date,
      time,
      service,
      barber,
    })
    .then(() => {
      resetForm();
      setMessage("Cita actualizada correctamente ✅");
      getAppointments();
    })
    .catch((err) => {
      if (err.response?.data?.message) {
        setMessage(err.response.data.message);
      } else {
        setMessage("Error al actualizar cita");
      }
    })
    .finally(() => setSubmitting(false));
};

  const deleteAppointment = (id) => {
  if (submitting) return;

  const confirmed = window.confirm("¿Seguro que quieres eliminar esta cita?");
  if (!confirmed) return;

  setSubmitting(true);

  axios
    .delete(`https://barbershop-scheduler.onrender.com/appointments/${id}`)
    .then(() => {
      setMessage("Cita eliminada correctamente ✅");
      getAppointments();
    })
    .catch((err) => {
      console.error(err);
      setMessage("Error al eliminar cita");
    })
    .finally(() => setSubmitting(false));
};

  const editAppointment = (appointment) => {
    setName(appointment.name);
    setDate(String(appointment.date).slice(0, 10));
    setTime(String(appointment.time).slice(0, 5));
    setService(appointment.service);
    setBarber(appointment.barber);
    setEditingId(appointment.id);
    setMessage("Editando cita ✏️");
  };

  const selectSlot = (day, hour) => {
    setDate(formatDateToInput(day));
    setTime(`${String(hour).padStart(2, "0")}:00`);
    setEditingId(null);
    setMessage("Bloque horario seleccionado.");
  };

  const handleLogin = () => {
  if (loggingIn) return;

  setLoggingIn(true);

  axios
    .post("https://barbershop-scheduler.onrender.com/login", {
      username,
      password,
    })
    .then((res) => {
      setIsLoggedIn(true);
      setLoginError("");
      setAppMode("admin"); // 👈 importante
      localStorage.setItem("user", JSON.stringify(res.data.user));
    })
    .catch((err) => {
      if (err.response?.data?.message) {
        setLoginError(err.response.data.message);
      } else {
        setLoginError("Error al iniciar sesión");
      }
    })
    .finally(() => setLoggingIn(false));
};

  const handleLogout = () => {
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    setUsername("");
    setPassword("");
    setAppMode(null);
  };

  const getBarberColors = (barberName) => {
    switch (barberName) {
      case "Cristian":
        return {
          backgroundColor: "#dbeafe",
          border: "1px solid #60a5fa",
        };
      case "Matías":
        return {
          backgroundColor: "#dcfce7",
          border: "1px solid #4ade80",
        };
      case "Sebastián":
        return {
          backgroundColor: "#f3e8ff",
          border: "1px solid #c084fc",
        };
      default:
        return {
          backgroundColor: "#e5e7eb",
          border: "1px solid #d1d5db",
        };
    }
  };

  const goToPreviousWeek = () => {
    setSelectedWeekStart(addDays(selectedWeekStart, -7));
  };

  const goToNextWeek = () => {
    setSelectedWeekStart(addDays(selectedWeekStart, 7));
  };

  const goToCurrentWeek = () => {
    setSelectedWeekStart(getMonday(new Date()));
  };

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
        ? String(appointment.name).toLowerCase().includes(clientSearch.toLowerCase())
        : true;

      return matchesDay && matchesHour && matchesBarber && matchesClient;
    });
  };

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      setIsLoggedIn(true);
      setAppMode("admin");
    }

    getAppointments();
  }, []);

  useEffect(() => {
  const handleResize = () => {
    setIsMobile(window.innerWidth < 768);
  };

  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}, []);

  const styles = {
    page: {
      minHeight: "100vh",
      backgroundColor: "#f3f4f6",
      padding: "24px",
      fontFamily: "Arial, sans-serif",
      color: "#111827",
    },
    title: {
      marginBottom: "20px",
      fontSize: "28px",
      fontWeight: "bold",
    },
    layout: {
      display: "grid",
      gridTemplateColumns: "320px 1fr",
      gap: "20px",
      alignItems: "start",
    },
    card: {
      backgroundColor: "#fff",
      borderRadius: "14px",
      padding: "20px",
      boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
      border: "1px solid #e5e7eb",
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
    },
    calendarGrid: {
      display: "grid",
      gridTemplateColumns: "90px repeat(7, minmax(140px, 1fr))",
      border: "1px solid #e5e7eb",
      borderRadius: "12px",
      overflow: "hidden",
      backgroundColor: "#fff",
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

emptyState: {
  backgroundColor: "#fff",
  border: "1px dashed #d1d5db",
  borderRadius: "12px",
  padding: "18px",
  textAlign: "center",
  color: "#6b7280",
  fontWeight: "bold",
},

disabledButton: {
  opacity: 0.6,
  cursor: "not-allowed",
},
  };

  const isClientMode = appMode === "client";
  const isAdminMode = appMode === "admin" && isLoggedIn;

  const isClientFormComplete =
  name.trim() && date && time && service.trim() && barber;
  const isBarberSelected = Boolean(barber);

  if (appMode === null) {
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
            padding: "30px",
            borderRadius: "14px",
            boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
            border: "1px solid #e5e7eb",
            width: "100%",
            maxWidth: "420px",
            textAlign: "center",
          }}
        >
          <h1 style={{ marginTop: 0 }}>Agenda Barbería 💈</h1>
          <p style={{ color: "#4b5563", marginBottom: "24px" }}>
            Selecciona cómo quieres ingresar
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <button
              style={{
                ...styles.button,
                ...styles.primaryButton,
                width: "100%",
              }}
              onClick={() => setAppMode("client")}
            >
              Entrar como cliente
            </button>

            <button
              style={{
                ...styles.button,
                ...styles.secondaryButton,
                width: "100%",
              }}
              onClick={() => setAppMode("admin")}
            >
              Entrar como administrador
            </button>
          </div>
        </div>
      </div>
    );
  }

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
        }}
      >
        <div
          style={{
            backgroundColor: "#fff",
            padding: "30px",
            borderRadius: "14px",
            boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
            border: "1px solid #e5e7eb",
            width: "100%",
            maxWidth: "360px",
          }}
        >
          <h2>Ingreso Agenda 💈</h2>

            <input
            style={styles.input}
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            style={{ ...styles.button, ...styles.primaryButton, width: "100%" }}
            onClick={handleLogin}
          >
            Ingresar
          </button>

          <button
            style={{
              ...styles.button,
              ...styles.secondaryButton,
              width: "100%",
              marginTop: "10px",
            }}
            onClick={() => setAppMode(null)}
          >
            Volver
          </button>

          {loginError && (
            <p style={{ color: "#dc2626", marginTop: "10px", fontWeight: "bold" }}>
              {loginError}
            </p>
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
        <h1 style={{ ...styles.title, marginBottom: 0 }}>
          {isClientMode ? "Reserva tu hora 💈" : "Agenda Barbería 💈"}
        </h1>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            style={{ ...styles.button, ...styles.secondaryButton }}
            onClick={() => {
              setAppMode(null);
              setIsLoggedIn(false);
              localStorage.removeItem("user");
            }}
          >
            Inicio
          </button>

          {isAdminMode && (
            <button
              style={{ ...styles.button, ...styles.dangerButton }}
              onClick={handleLogout}
            >
              Cerrar sesión
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

            <input
              style={styles.input}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />

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

              <input
              style={styles.input}
              placeholder="Servicio que deseas"
              value={service}
              onChange={(e) => setService(e.target.value)}
            />

            <select
              style={styles.select}
              value={barber}
              onChange={(e) => setBarber(e.target.value)}
            >
              <option value="">Selecciona un barbero</option>
              <option value="Cristian">Cristian</option>
              <option value="Matías">Matías</option>
              <option value="Sebastián">Sebastián</option>
            </select>

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

          <div style={styles.calendarWrapper}>
            {loading ? (
              <div style={styles.spinnerBox}>
      <div style={styles.spinner}></div>
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
          <div style={styles.card}>
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
                <option value="Cristian">Cristian</option>
                <option value="Matías">Matías</option>
                <option value="Sebastián">Sebastián</option>
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
                  <option value="Cristian">Cristian</option>
                  <option value="Matías">Matías</option>
                  <option value="Sebastián">Sebastián</option>
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

            <div style={styles.calendarWrapper}>
              {loading ? (
                <div style={styles.spinnerBox}>
      <div style={styles.spinner}></div>
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