import React, { useEffect, useMemo, useState } from "react";
import api from "./services/api";
import LoginScreen from "./components/LoginScreen";
import ClientBookingPanel from "./components/ClientBookingPanel";
import AdminBookingPanel from "./components/AdminBookingPanel";
import WeeklyCalendar from "./components/WeeklyCalendar";
import BusinessHeader from "./components/BusinessHeader";
import {
  getMonday,
  formatDateToInput,
  formatHourLabel,
  addDays,
  sameDate,
  isPastSlot,
  isPastDayOnly,
} from "./utils/dateUtils";
import {
  API_URL,
  SHEETS_URL,
  BARBER_PHONES,
  BARBERS,
  SERVICES,
  BUSINESS_ID,
} from "./utils/constants";
import { buildBarberWhatsappUrl } from "./utils/whatsapp";
import { getAppointments as fetchAppointments } from "./services/appointmentsService";
import { createAppointment as createAppointmentService } from "./services/appointmentsService";
import { updateAppointment as updateAppointmentService } from "./services/appointmentsService";
import { deleteAppointment as deleteAppointmentService } from "./services/appointmentsService";
import { loginUser } from "./services/appointmentsService";

function App() {

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [service, setService] = useState("");
  const [barber, setBarber] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [whatsappUrl, setWhatsappUrl] = useState("");

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
        const today = new Date();
        const todayInCurrentWeek = weekDays.find(
          (day) => formatDateToInput(day) === formatDateToInput(today)
        );

        setSelectedMobileDay(todayInCurrentWeek || weekDays[0]);
      }
    }
  }, [weekDays, selectedMobileDay]);

  const hours = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 9), []);

  const getAppointments = async () => {
    setLoading(true);
    try {
      const res = await fetchAppointments(BUSINESS_ID);
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
    setPhone("");
    setDate("");
    setTime("");
    setService("");
    setBarber("");
    setEditingId(null);
  };

  const createAppointment = async () => {
    if (submitting) return;

    if (!name.trim() || !phone.trim() || !date || !time || !service.trim() || !barber) {
      setMessage("Completa todos los campos para agendar.");
      return;
    }

    setSubmitting(true);
    setMessage("");
    setWhatsappUrl("");

    try {
      await createAppointmentService({
        name: name.trim(),
        phone: phone.trim(),
        date,
        time,
        service: service.trim(),
        barber,
        businessId: BUSINESS_ID,
        status: "reservada",
      });

      const barberPhone = BARBER_PHONES[barber] || BARBER_PHONES.James;

      const generatedWhatsappUrl = buildBarberWhatsappUrl({
        barberPhone,
        name: name.trim(),
        phone: phone.trim(),
        date,
        time,
        service: service.trim(),
        barber,
      });

      await syncToGoogleSheets({
        date,
        time,
        name: name.trim(),
        phone: phone.trim(),
        barber,
        service: service.trim(),
      });

      setSelectedWeekStart(getMonday(new Date()));
      await getAppointments();

      const newWindow = window.open(generatedWhatsappUrl, "_blank");

      if (!newWindow || newWindow.closed || typeof newWindow.closed === "undefined") {
        setWhatsappUrl(generatedWhatsappUrl);

        setMessage(`✅ Tu hora fue agendada correctamente

📅 ${date} a las ${time}
👨‍🔧 con ${barber}

📲 Confirma tu reserva por WhatsApp tocando el botón verde`);
      } else {
        setMessage(`✅ Tu hora fue agendada correctamente

📅 ${date} a las ${time}
👨‍🔧 con ${barber}`);
      }

      resetForm();
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

    if (!name.trim() || !phone.trim() || !date || !time || !service.trim() || !barber) {
      setMessage("Completa todos los campos para actualizar.");
      return;
    }

    setSubmitting(true);
    setMessage("");
    setWhatsappUrl("");

    try {
      await updateAppointmentService(editingId, {
        name: name.trim(),
        phone: phone.trim(),
        date,
        time,
        service: service.trim(),
        barber,
        businessId: BUSINESS_ID,
        status: appointments.find((a) => a.id === editingId)?.status || "reservada",
      });

      await syncToGoogleSheets({
        date,
        time,
        name: name.trim(),
        phone: phone.trim(),
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
      await deleteAppointmentService(id);
      setMessage("Cita eliminada correctamente ✅");
      await getAppointments();
    } catch (err) {
      console.error(err);
      setMessage("Error al eliminar cita");
    } finally {
      setSubmitting(false);
    }
  };

  const markAppointmentAsAttended = async (appointment) => {
  if (submitting) return;

  try {
    setSubmitting(true);
    setMessage("");
    setWhatsappUrl("");

    await updateAppointmentService(appointment.id, {
      ...appointment,
      businessId: BUSINESS_ID,
      status: "atendida",
    });

    setMessage("Cita marcada como atendida ✅");
    await getAppointments();
  } catch (err) {
    console.error(err);
    setMessage("Error al marcar cita como atendida");
  } finally {
    setSubmitting(false);
  }
};

const markAppointmentAsNoShow = async (appointment) => {
  if (submitting) return;

  try {
    setSubmitting(true);
    setMessage("");
    setWhatsappUrl("");

    await updateAppointmentService(appointment.id, {
      ...appointment,
      businessId: BUSINESS_ID,
      status: "no_asistio",
    });

    setMessage("Cita marcada como no asistió ❌");
    await getAppointments();
  } catch (err) {
    console.error(err);
    setMessage("Error al marcar cita como no asistió");
  } finally {
    setSubmitting(false);
  }
};

  const editAppointment = (appointment) => {
    setName(appointment.name || "");
    setPhone(appointment.phone || "");
    setDate(String(appointment.date || "").slice(0, 10));
    setTime(String(appointment.time || "").slice(0, 5));
    setService(appointment.service || "");
    setBarber(appointment.barber || "");
    setEditingId(appointment.id);
    setMessage("Editando cita ✏️");
    setWhatsappUrl("");

    if (appointment.date) {
      const appointmentDate = new Date(
        String(appointment.date).slice(0, 10) + "T00:00:00"
      );
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
    setWhatsappUrl("");
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
      const res = await loginUser({
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
    const today = new Date();
    const currentMonday = getMonday(today);
    setSelectedWeekStart(currentMonday);
    setSelectedMobileDay(today);
  };

  const isClientMode = appMode === "client";
  const isAdminMode = appMode === "admin" && isLoggedIn;

  const todayStr = formatDateToInput(new Date());

const servicePrices = {
  "Corte tradicional ($8.000)": 8000,
  "Degradado premium ($10.000)": 10000,
  "Corte + barba premium ($15.000)": 15000,
  "Perfilado de cejas ($2.000)": 2000,
  "Servicio completo ($17.000)": 17000,
};

const dashboardAppointments = useMemo(() => {
  const normalizedClientSearch = clientSearch.trim().toLowerCase();

  return appointments.filter((appointment) => {
    const appointmentDate = String(appointment.date || "").slice(0, 10);

    const matchesToday = appointmentDate === todayStr;
    const matchesBarber = weeklyBarberFilter
      ? appointment.barber === weeklyBarberFilter
      : true;
    const matchesClient = normalizedClientSearch
      ? String(appointment.name || "")
          .toLowerCase()
          .includes(normalizedClientSearch)
      : true;

    return matchesToday && matchesBarber && matchesClient;
  });
}, [appointments, todayStr, weeklyBarberFilter, clientSearch]);

const totalToday = dashboardAppointments.length;

const attendedToday = dashboardAppointments.filter(
  (appointment) => appointment.status === "atendida"
).length;

const noShowToday = dashboardAppointments.filter(
  (appointment) => appointment.status === "no_asistio"
).length;

const reservedToday = dashboardAppointments.filter(
  (appointment) =>
    !appointment.status || appointment.status === "reservada"
).length;

const revenueToday = dashboardAppointments
  .filter((appointment) => appointment.status === "atendida")
  .reduce((total, appointment) => {
    return total + (servicePrices[appointment.service] || 0);
  }, 0);

  const filteredAppointments = useMemo(() => {
  const activeBarberFilter = isClientMode ? barber : weeklyBarberFilter;
  const normalizedClientSearch = clientSearch.trim().toLowerCase();

  return appointments.filter((appointment) => {
    const matchesBarber = activeBarberFilter
      ? appointment.barber === activeBarberFilter
      : true;

    const matchesClient = normalizedClientSearch
      ? String(appointment.name || "")
          .toLowerCase()
          .includes(normalizedClientSearch)
      : true;

    return matchesBarber && matchesClient;
  });
}, [appointments, isClientMode, barber, weeklyBarberFilter, clientSearch]);

const appointmentsBySlot = useMemo(() => {
  const map = new Map();

  filteredAppointments.forEach((appointment) => {
    const dayKey = formatDateToInput(new Date(String(appointment.date).slice(0, 10) + "T00:00:00"));
    const rawTime = String(appointment.time || "");
    const hourKey = Number(rawTime.slice(0, 2));
    const key = `${dayKey}-${hourKey}`;

    if (!map.has(key)) {
      map.set(key, []);
    }

    map.get(key).push(appointment);
  });

  return map;
}, [filteredAppointments]);
  
  const getAppointmentsForSlot = (day, hour) => {
  const key = `${formatDateToInput(day)}-${hour}`;
  return appointmentsBySlot.get(key) || [];
};

  const mobileSlots = useMemo(() => {
    if (!selectedMobileDay) return [];

    return hours.map((hour) => {
      const slotAppointments = getAppointmentsForSlot(selectedMobileDay, hour);
      const isPast = isClientMode ? isPastSlot(selectedMobileDay, hour) : false;

      return {
        hour,
        label: formatHourLabel(hour),
        appointments: slotAppointments,
        isOccupied: slotAppointments.length > 0,
        isPast,
      };
    });
  }, [
    selectedMobileDay,
    hours,
    appointmentsBySlot,
    isClientMode,
  ]);

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
    dashboardGrid: {
  display: "grid",
  gridTemplateColumns: isMobile
    ? "1fr 1fr"
    : "repeat(5, minmax(140px, 1fr))",
  gap: "12px",
  marginBottom: "18px",
},

dashboardCard: {
  backgroundColor: "#fff",
  borderRadius: "12px",
  padding: "14px",
  border: "1px solid #e5e7eb",
  boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
},

dashboardLabel: {
  fontSize: "13px",
  color: "#6b7280",
  marginBottom: "6px",
},

dashboardValue: {
  fontSize: "24px",
  fontWeight: "700",
  color: "#111827",
},

dashboardValueSuccess: {
  fontSize: "24px",
  fontWeight: "700",
  color: "#166534",
},

dashboardValueDanger: {
  fontSize: "24px",
  fontWeight: "700",
  color: "#991b1b",
},

dashboardValueWarning: {
  fontSize: "24px",
  fontWeight: "700",
  color: "#92400e",
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
      whiteSpace: "pre-line",
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
      backgroundColor: "#e5e7eb",
      color: "#9ca3af",
      cursor: "not-allowed",
      border: "1px solid #d1d5db",
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
    name.trim() && phone.trim() && date && time && service.trim() && barber;

  const isBarberSelected = Boolean(barber);

  if (appMode === "admin" && !isLoggedIn) {
    return (
      <LoginScreen
        styles={styles}
        username={username}
        password={password}
        loginError={loginError}
        loggingIn={loggingIn}
        setUsername={setUsername}
        setPassword={setPassword}
        handleLogin={handleLogin}
        setAppMode={setAppMode}
      />
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
          <div>
            <BusinessHeader isMobile={isMobile} />
          <div style={styles.card}>
            <ClientBookingPanel
              styles={styles}
              name={name}
              setName={setName}
              phone={phone}
              setPhone={setPhone}
              service={service}
              setService={setService}
              barber={barber}
              setBarber={setBarber}
              date={date}
              time={time}
              SERVICES={SERVICES}
              BARBERS={BARBERS}
              createAppointment={createAppointment}
              submitting={submitting}
              isClientFormComplete={isClientFormComplete}
              message={message}
              whatsappUrl={whatsappUrl}
            />

            <div style={styles.topBar}>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <h2 style={{ marginTop: "32px", marginBottom: "12px" }}>
                  Disponibilidad semanal
                </h2>

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

            <WeeklyCalendar
              styles={styles}
              loading={loading}
              isMobile={isMobile}
              weekDays={weekDays}
              selectedMobileDay={selectedMobileDay}
              setSelectedMobileDay={setSelectedMobileDay}
              formatDateToInput={formatDateToInput}
              formatHourLabel={formatHourLabel}
              sameDate={sameDate}
              date={date}
              time={time}
              hours={hours}
              mobileSlots={mobileSlots}
              isBarberSelected={isBarberSelected}
              selectSlot={selectSlot}
              setDate={setDate}
              setTime={setTime}
              getAppointmentsForSlot={getAppointmentsForSlot}
              getBarberColors={getBarberColors}
              isClientMode={true}
              barber={barber}
              editAppointment={editAppointment}
              deleteAppointment={deleteAppointment}
              submitting={submitting}
              isPastSlot={isPastSlot}
              isPastDayOnly={isPastDayOnly}
            />
              </div>
          </div>
        ) : (
          <div style={styles.layout}>
            <AdminBookingPanel
              styles={styles}
              isCompactAdmin={isCompactAdmin}
              editingId={editingId}
              name={name}
              setName={setName}
              phone={phone}
              setPhone={setPhone}
              date={date}
              setDate={setDate}
              time={time}
              setTime={setTime}
              service={service}
              setService={setService}
              barber={barber}
              setBarber={setBarber}
              BARBERS={BARBERS}
              updateAppointment={updateAppointment}
              createAppointment={createAppointment}
              resetForm={resetForm}
              submitting={submitting}
              message={message}
            />

            <div style={styles.card}>

<div style={styles.dashboardGrid}>
  <div style={styles.dashboardCard}>
    <div style={styles.dashboardLabel}>Citas hoy</div>
    <div style={styles.dashboardValue}>{totalToday}</div>
  </div>

  <div style={styles.dashboardCard}>
    <div style={styles.dashboardLabel}>Atendidas</div>
    <div style={styles.dashboardValueSuccess}>{attendedToday}</div>
  </div>

  <div style={styles.dashboardCard}>
    <div style={styles.dashboardLabel}>No asistió</div>
    <div style={styles.dashboardValueDanger}>{noShowToday}</div>
  </div>

  <div style={styles.dashboardCard}>
    <div style={styles.dashboardLabel}>Pendientes</div>
    <div style={styles.dashboardValueWarning}>{reservedToday}</div>
  </div>

  <div style={styles.dashboardCard}>
    <div style={styles.dashboardLabel}>Ingreso real hoy</div>
    <div style={styles.dashboardValue}>
      ${revenueToday.toLocaleString("es-CL")}
    </div>
  </div>
</div>

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

              <WeeklyCalendar
                styles={styles}
                loading={loading}
                isMobile={isMobile}
                weekDays={weekDays}
                selectedMobileDay={selectedMobileDay}
                setSelectedMobileDay={setSelectedMobileDay}
                formatDateToInput={formatDateToInput}
                formatHourLabel={formatHourLabel}
                sameDate={sameDate}
                date={date}
                time={time}
                hours={hours}
                mobileSlots={mobileSlots}
                isBarberSelected={true}
                selectSlot={selectSlot}
                setDate={setDate}
                setTime={setTime}
                getAppointmentsForSlot={getAppointmentsForSlot}
                getBarberColors={getBarberColors}
                isClientMode={false}
                barber={barber}
                editAppointment={editAppointment}
                deleteAppointment={deleteAppointment}
                markAppointmentAsAttended={markAppointmentAsAttended}
                markAppointmentAsNoShow={markAppointmentAsNoShow}
                submitting={submitting}
                isPastSlot={isPastSlot}
                isPastDayOnly={isPastDayOnly}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default App;