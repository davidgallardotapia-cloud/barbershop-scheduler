import React, { useEffect, useMemo, useState } from "react";
import LoginScreen from "./components/LoginScreen";
import AdminBookingPanel from "./components/AdminBookingPanel";
import WeeklyCalendar from "./components/WeeklyCalendar";
import BusinessHeader from "./components/BusinessHeader";
import HomeLanding from "./components/HomeLanding";
import ClientBookingWizard from "./components/ClientBookingWizard";
import {
  getMonday,
  formatDateToInput,
  formatHourLabel,
  addDays,
  sameDate,
  isPastSlot,
  isPastDayOnly,
} from "./utils/dateUtils";
import { SHEETS_URL } from "./utils/constants";
import {
  buildBarberWhatsappUrl,
  buildOpponentWhatsappUrl,
} from "./utils/whatsapp";
import {
  getAppointments as fetchAppointments,
  createAppointment as createAppointmentService,
  updateAppointment as updateAppointmentService,
  deleteAppointment as deleteAppointmentService,
  loginUser,
  getBusinessBySlug,
  getAppointmentPayments,
  addAppointmentPayment,
  updateAppointmentPayment,
  deleteAppointmentPayment,
} from "./services/appointmentsService";
import { businessConfigBySlug } from "./config/businessConfigBySlug";

function App() {
  const getSlugFromUrl = () => {
    if (typeof window === "undefined") return "urban-district-barber";

    const path = window.location.pathname.replace(/^\/+|\/+$/g, "");
    return path || "";
  };

  const [slug] = useState(getSlugFromUrl);

  const [business, setBusiness] = useState(null);
  const [businessId, setBusinessId] = useState("");
  const [businessLoading, setBusinessLoading] = useState(true);
  const [businessError, setBusinessError] = useState("");

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [service, setService] = useState("");
  const [customServiceName, setCustomServiceName] = useState("");
const [customServicePrice, setCustomServicePrice] = useState("");

const [needsOpponent, setNeedsOpponent] = useState(false);
const [opponentName, setOpponentName] = useState("");
const [opponentPhone, setOpponentPhone] = useState("");

const [barber, setBarber] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [paymentAppointment, setPaymentAppointment] = useState(null);
  const [whatsappUrl, setWhatsappUrl] = useState("");

  const [selectedWeekStart, setSelectedWeekStart] = useState(
    getMonday(new Date())
  );
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

  const [selectedAppointmentPayments, setSelectedAppointmentPayments] = useState(
    []
  );
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("transferencia");
  const [paymentStage, setPaymentStage] = useState("deposit");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [paymentPanelError, setPaymentPanelError] = useState("");

  const currentBusinessConfig = useMemo(() => {
    return businessConfigBySlug[slug] || null;
  }, [slug]);

  const BARBERS = currentBusinessConfig?.barbers || [];
  const SERVICES = currentBusinessConfig?.services || [];
  const BARBER_PHONES = currentBusinessConfig?.phones || {};

  const mergedBusiness = useMemo(() => {
    if (!business && !currentBusinessConfig) return null;

    return {
      ...(currentBusinessConfig || {}),
      ...(business || {}),
    };
  }, [business, currentBusinessConfig]);

  const theme = mergedBusiness?.theme || {};

  const hours = useMemo(() => {
    return (
      currentBusinessConfig?.scheduleSlots ||
      Array.from({ length: 12 }, (_, i) => i + 9)
    );
  }, [currentBusinessConfig]);

  const blockedWeekdays = mergedBusiness?.blockedWeekdays || [];
  const paymentsEnabled = mergedBusiness?.paymentsEnabled || false;
  const depositFeatureEnabled = mergedBusiness?.depositFeatureEnabled || false;
  const depositOptional = mergedBusiness?.depositOptional || false;
  const defaultDepositRate = mergedBusiness?.defaultDepositRate || 0.5;
  const paymentMethods = mergedBusiness?.paymentMethods || [
    "transferencia",
    "efectivo",
    "debito",
  ];

  const getServicePrice = (serviceName) => {
    if (!serviceName) return 0;

    const match = String(serviceName).match(/\$([\d\.]+)/);
    if (!match) return 0;

    return Number(match[1].replace(/\./g, ""));
  };

  const selectedPaymentTotal = selectedAppointmentPayments.reduce(
    (acc, payment) => acc + Number(payment.amount || 0),
    0
  );

  const selectedReservationTotal = Math.max(
    Number(paymentAppointment?.total_amount || 0),
    Number(getServicePrice(paymentAppointment?.service) || 0)
  );

  const selectedRequiredDeposit = Math.max(
    Number(paymentAppointment?.required_deposit_amount || 0),
    depositFeatureEnabled
      ? Math.round(selectedReservationTotal * defaultDepositRate)
      : 0
  );

  const selectedPendingBalance = Math.max(
    selectedReservationTotal - selectedPaymentTotal,
    0
  );

  const paymentStatusLabelMap = {
    unpaid: "Sin pago",
    deposit_pending: "Abono pendiente",
    deposit_paid: "Abono registrado",
    partially_paid: "Pago parcial",
    paid: "Pagado completo",
    cancelled: "Cancelado",
  };

  const effectivePaymentStatus =
  selectedPaymentTotal <= 0
    ? "unpaid"
    : selectedPaymentTotal >= selectedReservationTotal
    ? "paid"
    : depositFeatureEnabled && selectedPaymentTotal === selectedRequiredDeposit
    ? "deposit_paid"
    : "partially_paid";

  const selectedPaymentStatusLabel =
    paymentStatusLabelMap[effectivePaymentStatus] || "Sin estado";

  async function syncToGoogleSheets(payload) {
    console.log("INTENTANDO ENVIAR A GOOGLE SHEETS", {
      SHEETS_URL,
      payload,
    });

    try {
      const response = await fetch(SHEETS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify({
          ...payload,
          businessId,
        }),
      });

      console.log("RESPUESTA RAW SHEETS", response);

      const text = await response.text();

      console.log("TEXTO RESPUESTA SHEETS", text);

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
    const loadBusiness = async () => {
      setBusinessLoading(true);
      setBusinessError("");

      try {
        const res = await getBusinessBySlug(slug);
        const businessData = res.data;

        setBusiness(businessData);
        setBusinessId(businessData.id);
      } catch (error) {
        console.error("Error cargando negocio:", error);
        setBusinessError("No se pudo cargar el negocio.");
      } finally {
        setBusinessLoading(false);
      }
    };

    loadBusiness();
  }, [slug]);

  useEffect(() => {
    if (!slug) {
      document.title = "AgendaSmart";

      const favicon = document.querySelector("link[rel='icon']");
      if (favicon) {
        favicon.href = "/agendasmart-favicon.png";
      }

      return;
    }

    if (mergedBusiness) {
      document.title =
        mergedBusiness.tabTitle || mergedBusiness.name || "AgendaSmart";

      const favicon = document.querySelector("link[rel='icon']");
      if (favicon && mergedBusiness.favicon) {
        favicon.href = mergedBusiness.favicon;
      }
    }
  }, [slug, mergedBusiness]);

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

  const getAppointments = async () => {
    if (!businessId) return;

    setLoading(true);
    try {
      const res = await fetchAppointments(businessId);
      setAppointments(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setMessage("Error al cargar reservas");
    } finally {
      setLoading(false);
    }
  };

  const loadAppointmentPayments = async (appointmentId) => {
    if (!paymentsEnabled || !businessId || !appointmentId) return;

    setLoadingPayments(true);
    setPaymentPanelError("");

    try {
      const res = await getAppointmentPayments(appointmentId, businessId);
      setSelectedAppointmentPayments(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setSelectedAppointmentPayments([]);
      setPaymentPanelError(
        err.response?.data?.message || "No se pudieron cargar los pagos"
      );
    } finally {
      setLoadingPayments(false);
    }
  };

  const resetPaymentForm = () => {
  setEditingPaymentId(null);
  setPaymentAmount("");
  setPaymentMethod(paymentMethods[0] || "transferencia");
  setPaymentStage(depositFeatureEnabled ? "deposit" : "full");
  setPaymentNotes("");
};

const handleEditPaymentClick = (payment) => {
  setEditingPaymentId(payment.id);
  setPaymentAmount(String(Number(payment.amount || 0)));
  setPaymentMethod(payment.method || paymentMethods[0] || "transferencia");
  setPaymentStage(payment.payment_stage || (depositFeatureEnabled ? "deposit" : "full"));
  setPaymentNotes(payment.notes || "");
  setPaymentPanelError("");
};

const handleCancelPaymentEdit = () => {
  resetPaymentForm();
};

const handleSavePayment = async () => {
  if (!paymentAppointment?.id || !businessId) return;

  if (!paymentAmount || Number(paymentAmount) <= 0) {
    setMessage("Ingresa un monto válido para el pago");
    return;
  }

  try {
    if (editingPaymentId) {
      console.log("ENTRÓ A EDITAR PAGO", {
        editingPaymentId,
        paymentAppointmentId: paymentAppointment?.id,
        paymentAmount,
        paymentMethod,
        paymentStage,
        paymentNotes,
      });

      await updateAppointmentPayment(paymentAppointment.id, editingPaymentId, {
        amount: Number(paymentAmount),
        method: paymentMethod,
        paymentStage,
        notes: paymentNotes || null,
        receiptUrl: null,
        businessId,
      });

      await syncToGoogleSheets({
        type: "payment_update",
        payment_id: editingPaymentId,
        appointment_id: paymentAppointment.id,
        businessId,
        fecha_reserva: paymentAppointment?.date
          ? String(paymentAppointment.date).slice(0, 10)
          : "",
        hora_reserva: String(paymentAppointment?.time || "").slice(0, 5),
        cliente: paymentAppointment?.name || "",
        recurso: paymentAppointment?.barber || "",
        servicio: paymentAppointment?.service || "",
        monto_pago: Number(paymentAmount),
        metodo_pago: paymentMethod,
        tipo_pago: paymentStage,
        fecha_pago: new Date().toISOString(),
        observacion: paymentNotes || "",
        sync_status: "updated",
      });

      setMessage("Pago actualizado correctamente");
    } else {
      const paymentResponse = await addAppointmentPayment(paymentAppointment.id, {
        amount: Number(paymentAmount),
        method: paymentMethod,
        paymentStage,
        notes: paymentNotes || null,
        businessId,
      });

      const createdPayment = paymentResponse?.data?.data;

      await syncToGoogleSheets({
        type: "payment",
        payment_id: createdPayment?.id || "",
        appointment_id: paymentAppointment.id,
        businessId,
        fecha_reserva: paymentAppointment?.date
          ? String(paymentAppointment.date).slice(0, 10)
          : "",
        hora_reserva: String(paymentAppointment?.time || "").slice(0, 5),
        cliente: paymentAppointment?.name || "",
        recurso: paymentAppointment?.barber || "",
        servicio: paymentAppointment?.service || "",
        monto_pago: Number(paymentAmount),
        metodo_pago: paymentMethod,
        tipo_pago: paymentStage,
        fecha_pago: new Date().toISOString(),
        observacion: paymentNotes || "",
      });

      setMessage("Pago registrado correctamente");
    }

    resetPaymentForm();
    setPaymentPanelError("");

    await loadAppointmentPayments(paymentAppointment.id);
    await getAppointments();
  } catch (err) {
    console.error(err);
    setMessage(
      err.response?.data?.message ||
        (editingPaymentId ? "Error al actualizar pago" : "Error al registrar pago")
    );
  }
};

const handleDeletePayment = async (payment) => {
  if (!paymentAppointment?.id || !businessId || !payment?.id) return;

  const confirmed = window.confirm("¿Seguro que quieres eliminar este pago?");
  if (!confirmed) return;

  try {
    await deleteAppointmentPayment(paymentAppointment.id, payment.id, businessId);

    await syncToGoogleSheets({
      type: "payment_delete",
      payment_id: payment.id,
      appointment_id: paymentAppointment.id,
      businessId,
      fecha_reserva: paymentAppointment?.date
        ? String(paymentAppointment.date).slice(0, 10)
        : "",
      hora_reserva: String(paymentAppointment?.time || "").slice(0, 5),
      cliente: paymentAppointment?.name || "",
      recurso: paymentAppointment?.barber || "",
      servicio: paymentAppointment?.service || "",
      monto_pago: Number(payment.amount || 0),
      metodo_pago: payment.method || "",
      tipo_pago: payment.payment_stage || "",
      fecha_pago: new Date().toISOString(),
      observacion: payment.notes || "",
      sync_status: "deleted",
    });

    if (editingPaymentId === payment.id) {
      resetPaymentForm();
    }

    setPaymentPanelError("");
    setMessage("Pago eliminado correctamente");

    await loadAppointmentPayments(paymentAppointment.id);
    await getAppointments();
  } catch (err) {
    console.error(err);
    setMessage(err.response?.data?.message || "Error al eliminar pago");
  }
};

const closePaymentPanel = () => {
  setPaymentAppointment(null);
  setSelectedAppointmentPayments([]);
  setPaymentPanelError("");
  resetPaymentForm();
};

  useEffect(() => {
  if (paymentAppointment) {
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = "";
  }

  return () => {
    document.body.style.overflow = "";
  };
}, [paymentAppointment]);

  useEffect(() => {
    if (!businessId) return;

    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);

        if (!parsedUser.business_id || parsedUser.business_id === businessId) {
          setIsLoggedIn(true);
          setAppMode("admin");
        } else {
          localStorage.removeItem("user");
        }
      } catch {
        localStorage.removeItem("user");
      }
    }

    getAppointments();
  }, [businessId]);

  const resetForm = () => {
    setName("");
    setPhone("");
    setDate("");
    setTime("");
    setService("");
    setBarber("");
    setCustomServiceName("");
setCustomServicePrice("");

setNeedsOpponent(false);
setOpponentName("");
setOpponentPhone("");

setEditingId(null);
    setSelectedAppointmentPayments([]);
    setPaymentAmount("");
    setPaymentMethod(paymentMethods[0] || "transferencia");
    setPaymentStage(depositFeatureEnabled ? "deposit" : "full");
    setPaymentNotes("");
    setEditingPaymentId(null);
    setPaymentAppointment(null);
    setPaymentPanelError("");
  };

  const getResourceFromService = (serviceName) => {
    if (!serviceName) return "";

    const match = String(serviceName).match(/Cancha\s+\d+/i);
    return match ? match[0] : "";
  };

  const getResolvedClientResource = () => {
    if (mergedBusiness?.hideResourceSelector) {
      return getResourceFromService(service);
    }

    return barber;
  };

  const normalizeChilePhone = (rawPhone) => {
    const digits = String(rawPhone || "").replace(/\D/g, "");

    if (!digits) return "";

    if (digits.startsWith("569") && digits.length === 11) {
      return digits;
    }

    if (digits.startsWith("56") && digits.length === 11) {
      return digits;
    }

    if (digits.startsWith("9") && digits.length === 9) {
      return `56${digits}`;
    }

    if (digits.length === 8) {
      return `569${digits}`;
    }

    return digits;
  };

  const isValidChileMobilePhone = (rawPhone) => {
    const normalized = normalizeChilePhone(rawPhone);
    return /^569\d{8}$/.test(normalized);
  };

  const createAppointment = async () => {
    if (submitting || !businessId) return;

    const resolvedBarber = mergedBusiness?.hideResourceSelector
      ? getResourceFromService(service)
      : barber;

    if (
      !name.trim() ||
      !phone.trim() ||
      !date ||
      !time ||
      !service.trim() ||
      !resolvedBarber
    ) {
      setMessage("Completa todos los campos para reservar.");
      return;
    }

    if (!isValidChileMobilePhone(phone)) {
      setMessage("Ingresa un celular chileno válido. Ejemplo: 912345678");
      return;
    }

    setSubmitting(true);
    setMessage("");
    setWhatsappUrl("");

    const normalizedPhone = normalizeChilePhone(phone);

    try {
  const isSportsBusiness = ["giocata", "pinguino-club"].includes(
    mergedBusiness?.id
  );

  const openOpponentAppointment = isSportsBusiness
    ? appointments.find((appointment) => {
        const appointmentDate = String(appointment.date || "").slice(0, 10);
        const appointmentTime = String(appointment.time || "").slice(0, 5);

        return (
          appointmentDate === date &&
          appointmentTime === String(time || "").slice(0, 5) &&
          appointment.barber === resolvedBarber &&
          Boolean(appointment.needs_opponent) &&
          !appointment.opponent_name &&
          !appointment.opponent_phone
        );
      })
    : null;

  if (openOpponentAppointment) {
    await updateAppointmentService(openOpponentAppointment.id, {
      name: openOpponentAppointment.name,
      phone: openOpponentAppointment.phone,
      date,
      time,
      service: openOpponentAppointment.service || service.trim(),
      barber: resolvedBarber,
      businessId,
      status: openOpponentAppointment.status || "reservada",

      totalAmount:
        openOpponentAppointment.total_amount ||
        getServicePrice(openOpponentAppointment.service || service.trim()) ||
        0,
      depositRequired: Boolean(openOpponentAppointment.deposit_required),
      requiredDepositAmount:
        Number(openOpponentAppointment.required_deposit_amount || 0),
      paymentStatus: openOpponentAppointment.payment_status || "unpaid",
      depositReceiptUrl: openOpponentAppointment.deposit_receipt_url || null,
      notes: openOpponentAppointment.notes || null,

      needsOpponent: false,
      opponentName: name.trim(),
      opponentPhone: normalizedPhone,
    });

    const barberPhone = BARBER_PHONES[resolvedBarber] || "";

const generatedOpponentWhatsappUrl = barberPhone
  ? buildOpponentWhatsappUrl({
      barberPhone,
      teamOneName: openOpponentAppointment.name,
      teamOnePhone: openOpponentAppointment.phone,
      opponentName: name.trim(),
      opponentPhone: normalizedPhone,
      date,
      time,
      service: openOpponentAppointment.service || service.trim(),
      barber: resolvedBarber,
      business: mergedBusiness,
    })
  : "";

if (generatedOpponentWhatsappUrl) {
  setWhatsappUrl(generatedOpponentWhatsappUrl);
  window.open(generatedOpponentWhatsappUrl, "_blank");
}

    await syncToGoogleSheets({
      id: openOpponentAppointment.id,
      date,
      time,
      name: `${openOpponentAppointment.name || "Equipo 1"} vs ${name.trim()}`,
      phone: openOpponentAppointment.phone || "",
      barber: resolvedBarber,
      service: openOpponentAppointment.service || service.trim(),
      status: openOpponentAppointment.status || "reservada",
    });

    setSelectedWeekStart(getMonday(new Date()));
    await getAppointments();

    setMessage(`✅ Te sumaste como rival correctamente

📅 ${date} a las ${time}
${mergedBusiness?.resourceLabelSingle || "Cancha"}: ${resolvedBarber}

⚽ Partido completado`);

    resetForm();
    return;
  }

  const finalService = service.trim();
const finalTotalAmount = getServicePrice(finalService) || 0;

const createdAppointment = await createAppointmentService({
  name: name.trim(),
  phone: normalizedPhone,
  date,
  time,
  service: finalService,
  barber: resolvedBarber,
  businessId,
  status: "reservada",

  totalAmount: finalTotalAmount,
  depositRequired: false,
  requiredDepositAmount: 0,
  paymentStatus: "unpaid",
  depositReceiptUrl: null,
  notes: null,

  needsOpponent,
  opponentName: opponentName.trim() || null,
  opponentPhone: opponentPhone.trim()
    ? normalizeChilePhone(opponentPhone)
    : null,
});

      const barberPhone = BARBER_PHONES[resolvedBarber] || "";

const generatedWhatsappUrl = barberPhone
  ? buildBarberWhatsappUrl({
      barberPhone,
      name: name.trim(),
      phone: normalizedPhone,
      date,
      time,
      service: finalService,
      barber: resolvedBarber,
      business: mergedBusiness,
      needsOpponent,
    })
  : "";

      await syncToGoogleSheets({
        id: createdAppointment.data.data.id,
        date,
        time,
        name: name.trim(),
        phone: normalizedPhone,
        barber: resolvedBarber,
        service: finalService,
        status: "reservada",
      });

      setSelectedWeekStart(getMonday(new Date()));
      await getAppointments();

      if (generatedWhatsappUrl) {
        const newWindow = window.open(generatedWhatsappUrl, "_blank");

        if (
          !newWindow ||
          newWindow.closed ||
          typeof newWindow.closed === "undefined"
        ) {
          setWhatsappUrl(generatedWhatsappUrl);

          setMessage(`✅ ${
            mergedBusiness?.submitButtonLabel || "Reserva"
          } registrada correctamente

📅 ${date} a las ${time}
${mergedBusiness?.resourceLabelSingle || "Recurso"}: ${resolvedBarber}

📲 ${mergedBusiness?.whatsappLabel || "Confirma por WhatsApp"}`);
        } else {
          setMessage(`✅ ${
            mergedBusiness?.submitButtonLabel || "Reserva"
          } registrada correctamente

📅 ${date} a las ${time}
${mergedBusiness?.resourceLabelSingle || "Recurso"}: ${resolvedBarber}`);
        }
      } else {
        setMessage(`✅ ${
          mergedBusiness?.submitButtonLabel || "Reserva"
        } registrada correctamente

📅 ${date} a las ${time}
${mergedBusiness?.resourceLabelSingle || "Recurso"}: ${resolvedBarber}`);
      }

      resetForm();
    } catch (err) {
      if (err.response?.data?.message) {
        setMessage(err.response.data.message);
      } else {
        setMessage("Error al crear reserva");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const updateAppointment = async () => {
    if (submitting || !editingId || !businessId) return;

    if (
      !name.trim() ||
      !phone.trim() ||
      !date ||
      !time ||
      !service.trim() ||
      !barber
    ) {
      setMessage("Completa todos los campos para actualizar.");
      return;
    }

    if (!isValidChileMobilePhone(phone)) {
      setMessage("Ingresa un celular chileno válido. Ejemplo: 912345678");
      return;
    }

    setSubmitting(true);
    setMessage("");
    setWhatsappUrl("");

    const normalizedPhone = normalizeChilePhone(phone);

    try {
     const finalService = service.trim();
const finalTotalAmount = getServicePrice(finalService) || 0;
const currentAppointment = appointments.find((a) => a.id === editingId);

await updateAppointmentService(editingId, {
  name: name.trim(),
  phone: normalizedPhone,
  date,
  time,
  service: finalService,
  barber,
  businessId,
  status: currentAppointment?.status || "reservada",

  totalAmount: finalTotalAmount,
  depositRequired: Boolean(currentAppointment?.deposit_required),
  requiredDepositAmount:
    Number(currentAppointment?.required_deposit_amount || 0),
  paymentStatus: currentAppointment?.payment_status || "unpaid",
  depositReceiptUrl: currentAppointment?.deposit_receipt_url || null,
  notes: currentAppointment?.notes || null,

  needsOpponent,
  opponentName: opponentName.trim() || null,
  opponentPhone: opponentPhone.trim()
    ? normalizeChilePhone(opponentPhone)
    : null,
});

      await syncToGoogleSheets({
        id: editingId,
        date,
        time,
        name: name.trim(),
        phone: normalizedPhone,
        barber,
        service: finalService,
        status:
          appointments.find((a) => a.id === editingId)?.status || "reservada",
      });

      resetForm();
      setMessage("Reserva actualizada correctamente ✅");
      await getAppointments();
    } catch (err) {
      if (err.response?.data?.message) {
        setMessage(err.response.data.message);
      } else {
        setMessage("Error al actualizar reserva");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const deleteAppointment = async (id) => {
    if (submitting || !businessId) return;

    const confirmed = window.confirm("¿Seguro que quieres eliminar esta reserva?");
    if (!confirmed) return;

    setSubmitting(true);

    try {
      await deleteAppointmentService(id, businessId);
      setMessage("Reserva eliminada correctamente ✅");
      await getAppointments();
    } catch (err) {
      console.error(err);
      if (err.response?.data?.message) {
        setMessage(err.response.data.message);
      } else {
        setMessage("Error al eliminar reserva");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const markAppointmentAsAttended = async (appointment) => {
    if (submitting || !businessId) return;

    try {
      setSubmitting(true);
      setMessage("");
      setWhatsappUrl("");

      await updateAppointmentService(appointment.id, {
        ...appointment,
        businessId,
        status: "atendida",
      });

      await syncToGoogleSheets({
        id: appointment.id,
        date: appointment.date,
        time: appointment.time,
        name: appointment.name,
        phone: appointment.phone || "",
        barber: appointment.barber,
        service: appointment.service,
        status: "atendida",
      });

      setMessage("Reserva marcada como atendida ✅");
      await getAppointments();
    } catch (err) {
      console.error(err);
      setMessage("Error al marcar reserva como atendida");
    } finally {
      setSubmitting(false);
    }
  };

  const markAppointmentAsNoShow = async (appointment) => {
    if (submitting || !businessId) return;

    try {
      setSubmitting(true);
      setMessage("");
      setWhatsappUrl("");

      await updateAppointmentService(appointment.id, {
        ...appointment,
        businessId,
        status: "no_asistio",
      });

      await syncToGoogleSheets({
        id: appointment.id,
        date: appointment.date,
        time: appointment.time,
        name: appointment.name,
        phone: appointment.phone || "",
        barber: appointment.barber,
        service: appointment.service,
        status: "no_asistio",
      });

      setMessage("Reserva marcada como no asistió ❌");
      await getAppointments();
    } catch (err) {
      console.error(err);
      setMessage("Error al marcar reserva como no asistió");
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

setNeedsOpponent(Boolean(appointment.needs_opponent));
setOpponentName(appointment.opponent_name || "");
setOpponentPhone(appointment.opponent_phone || "");

setEditingId(appointment.id);
    setPaymentAppointment(null);
    setMessage("Editando reserva ✏️");
    setWhatsappUrl("");
    setPaymentPanelError("");
    setSelectedAppointmentPayments([]);

    if (appointment.date) {
      const appointmentDate = new Date(
        String(appointment.date).slice(0, 10) + "T00:00:00"
      );
      setSelectedWeekStart(getMonday(appointmentDate));
      setSelectedMobileDay(appointmentDate);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openPaymentPanel = async (appointment) => {
    setPaymentAppointment(appointment);
    setEditingId(null);
    setMessage("");
    setWhatsappUrl("");
    setPaymentPanelError("");

    setPaymentAmount("");
    setPaymentMethod(paymentMethods[0] || "transferencia");
    setPaymentStage(depositFeatureEnabled ? "deposit" : "full");
    setPaymentNotes("");
    setEditingPaymentId(null);

    if (paymentsEnabled) {
      await loadAppointmentPayments(appointment.id);
    } else {
      setSelectedAppointmentPayments([]);
    }
  };

  const selectSlot = (day, hour) => {
    setDate(formatDateToInput(day));

    if (typeof hour === "string") {
      setTime(hour);
    } else {
      setTime(`${String(hour).padStart(2, "0")}:00`);
    }

    setEditingId(null);
    setMessage("Bloque horario seleccionado.");
    setWhatsappUrl("");
  };

  const handleLogin = async () => {
    if (loggingIn || !businessId) return;

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
        businessId,
      });

      const loggedUser = res.data.user;

      if (loggedUser.business_id && loggedUser.business_id !== businessId) {
        setLoginError("Este usuario no pertenece a este negocio");
        setLoggingIn(false);
        return;
      }

      setIsLoggedIn(true);
      setLoginError("");
      setAppMode("admin");
      localStorage.setItem("user", JSON.stringify(loggedUser));
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
    if (mergedBusiness?.id === "giocata") {
      return {
        backgroundColor: theme.primary || "#166534",
        border: `1px solid ${theme.primaryDark || "#14532d"}`,
      };
    }

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
    (appointment) => !appointment.status || appointment.status === "reservada"
  ).length;

  const revenueToday = dashboardAppointments
    .filter((appointment) => appointment.status === "atendida")
    .reduce((total, appointment) => {
      return total + getServicePrice(appointment.service);
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
      const dayKey = formatDateToInput(
        new Date(String(appointment.date).slice(0, 10) + "T00:00:00")
      );
      const rawTime = String(appointment.time || "").slice(0, 5);

      const hourKey =
        typeof hours[0] === "string" ? rawTime : Number(rawTime.slice(0, 2));

      const key = `${dayKey}-${hourKey}`;

      if (!map.has(key)) {
        map.set(key, []);
      }

      map.get(key).push(appointment);
    });

    return map;
  }, [filteredAppointments, hours]);

  const getAppointmentsForSlot = (day, hour) => {
    const key = `${formatDateToInput(day)}-${hour}`;
    return appointmentsBySlot.get(key) || [];
  };

  const mobileSlots = useMemo(() => {
    if (!selectedMobileDay) return [];

    return hours.map((hour) => {
      const slotAppointments = getAppointmentsForSlot(selectedMobileDay, hour);

      const normalizedHour =
        typeof hour === "string"
          ? hour
          : `${String(hour).padStart(2, "0")}:00`;

      const isPast = isClientMode
        ? isPastSlot(selectedMobileDay, normalizedHour)
        : false;

      return {
        hour,
        label: typeof hour === "string" ? hour : formatHourLabel(hour),
        appointments: slotAppointments,
        isOccupied: slotAppointments.length > 0,
        isPast,
      };
    });
  }, [selectedMobileDay, hours, appointmentsBySlot, isClientMode]);

  const resolvedClientResource = getResolvedClientResource();

  const availableDays = useMemo(() => {
    const days = [];
    const today = new Date();

    for (let i = 0; i < 14; i += 1) {
      const day = addDays(today, i);
      const dateValue = formatDateToInput(day);

      if (blockedWeekdays.includes(day.getDay())) continue;
      if (isPastDayOnly(day)) continue;

      days.push({
        value: dateValue,
        label: day.toLocaleDateString("es-CL", {
          weekday: "short",
          day: "2-digit",
          month: "2-digit",
        }),
      });
    }

    return days;
  }, [blockedWeekdays]);

  const availableTimes = useMemo(() => {
  if (!date) return [];

  const selectedDay = new Date(`${date}T00:00:00`);

  if (blockedWeekdays.includes(selectedDay.getDay())) return [];

  const isSportsBusiness = ["giocata", "pinguino-club"].includes(
    mergedBusiness?.id
  );

  return hours.map((hour) => {
    const formattedHour =
      typeof hour === "string" ? hour : formatHourLabel(hour);

    const normalizedHour =
      typeof hour === "string"
        ? hour
        : `${String(hour).padStart(2, "0")}:00`;

    const isPast = isPastSlot(selectedDay, normalizedHour);
    const slotAppointments = getAppointmentsForSlot(selectedDay, hour);

    const relevantAppointments = resolvedClientResource
      ? slotAppointments.filter(
          (appointment) => appointment.barber === resolvedClientResource
        )
      : slotAppointments;

    const opponentAppointment = relevantAppointments.find(
      (appointment) =>
        Boolean(appointment.needs_opponent) &&
        !appointment.opponent_name &&
        !appointment.opponent_phone
    );

    const isTaken = relevantAppointments.length > 0;
    const isLookingForOpponent = isSportsBusiness && Boolean(opponentAppointment);

    return {
      value: formattedHour,
      isPast,
      isTaken,
      isLookingForOpponent,
      opponentAppointment: opponentAppointment || null,
      disabled: isPast || (isTaken && !isLookingForOpponent),
      status: isPast
        ? "past"
        : isLookingForOpponent
        ? "looking_opponent"
        : isTaken
        ? "taken"
        : "available",
    };
  });
}, [
  date,
  hours,
  resolvedClientResource,
  appointmentsBySlot,
  blockedWeekdays,
  mergedBusiness?.id,
]);

  const styles = {
    page: {
      minHeight: "100vh",
      backgroundColor: theme.pageBackground || "#f3f4f6",
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
      backgroundColor: theme.cardBackground || "#fff",
      borderRadius: "14px",
      padding: isMobile ? "16px" : "20px",
      boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
      border: `1px solid ${theme.border || "#e5e7eb"}`,
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
      backgroundColor: theme.cardBackground || "#fff",
      borderRadius: "12px",
      padding: "14px",
      border: `1px solid ${theme.border || "#e5e7eb"}`,
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
      backgroundColor: theme.primary || "#111827",
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
      backgroundColor: theme.primaryDark || "#111827",
      color: "#fff",
      padding: "12px",
      fontWeight: "bold",
      borderRight: "1px solid #374151",
      minHeight: "70px",
      textTransform: "capitalize",
    },
    timeHeaderCell: {
      backgroundColor: theme.primary || "#1f2937",
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
      backgroundColor: theme.primarySoft || "#f9fafb",
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
    paymentModalOverlay: {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: isMobile ? "12px" : "24px",
  zIndex: 9999,
},

paymentModalCard: {
  backgroundColor: theme.cardBackground || "#fff",
  borderRadius: "18px",
  padding: isMobile ? "16px" : "24px",
  boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
  border: `1px solid ${theme.border || "#e5e7eb"}`,
  width: "100%",
  maxWidth: "980px",
  maxHeight: "88vh",
  overflowY: "auto",
  boxSizing: "border-box",
},

paymentSummaryGrid: {
  display: "grid",
  gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, minmax(0, 1fr))",
  gap: "10px",
  marginBottom: "16px",
},

paymentSummaryCard: {
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "12px",
  backgroundColor: "#ffffff",
},

paymentHistoryItem: {
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "12px",
  backgroundColor: "#ffffff",
},
    mobileSlotsWrapper: {
      display: "grid",
      gridTemplateColumns:
        isMobile && !isClientMode && mergedBusiness?.id === "giocata"
          ? "1fr"
          : "repeat(2, minmax(0, 1fr))",
      gap: "12px",
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
      backgroundColor: theme.primaryDark || "#111827",
      color: "#ffffff",
      border: `1px solid ${theme.primaryDark || "#111827"}`,
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
    name.trim() &&
    phone.trim() &&
    date &&
    time &&
    service.trim() &&
    (mergedBusiness?.hideResourceSelector ? true : barber);

  const isBarberSelected = mergedBusiness?.hideResourceSelector
    ? true
    : Boolean(barber);

  const isHomePage = !slug;

  if (isHomePage) {
    return <HomeLanding />;
  }

  if (businessLoading) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>Cargando negocio...</div>
      </div>
    );
  }

  if (businessError || !businessId) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          {businessError || "No se encontró el negocio solicitado."}
        </div>
      </div>
    );
  }

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
            {isClientMode
              ? mergedBusiness?.bookingTitle || "Reserva online"
              : mergedBusiness?.adminTitle || "Panel de reservas"}
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
                style={{
                  ...styles.button,
                  backgroundColor: theme.primarySoft || "#e5e7eb",
                  color: theme.primaryDark || "#111827",
                  border: `1px solid ${theme.border || "#d1d5db"}`,
                }}
                onClick={() => setAppMode("admin")}
              >
                Iniciar sesión
              </button>
            )}
          </div>
        </div>

        {isClientMode ? (
          <div>
            <BusinessHeader isMobile={isMobile} business={mergedBusiness} />

            <div style={styles.card}>
              <ClientBookingWizard
                styles={styles}
                business={mergedBusiness}
                SERVICES={SERVICES}
                BARBERS={BARBERS}
                service={service}
                setService={setService}
                barber={barber}
                setBarber={setBarber}
                date={date}
                setDate={setDate}
                time={time}
                setTime={setTime}
                name={name}
                setName={setName}
                phone={phone}
                setPhone={setPhone}
                availableDays={availableDays}
                availableTimes={availableTimes}
                blockedWeekdays={blockedWeekdays}
                createAppointment={createAppointment}
                submitting={submitting}
                isClientFormComplete={isClientFormComplete}
                message={message}
                whatsappUrl={whatsappUrl}
              />
              {false && (
                <>
                  <div style={styles.topBar}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      <h2 style={{ marginTop: "32px", marginBottom: "12px" }}>
                        Disponibilidad semanal
                      </h2>

                      {!mergedBusiness?.hideResourceSelector && (
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
                          {barber
                            ? `${
                                mergedBusiness?.resourceSelectedLabel ||
                                "Recurso seleccionado"
                              }: ${barber}`
                            : mergedBusiness?.resourceSelectPrompt ||
                              "Selecciona un recurso arriba"}
                        </div>
                      )}
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
                    business={mergedBusiness}
                    loading={loading}
                    isMobile={isMobile}
                    weekDays={weekDays}
                    selectedMobileDay={selectedMobileDay}
                    setSelectedMobileDay={setSelectedMobileDay}
                    formatDateToInput={formatDateToInput}
                    formatHourLabel={(hour) =>
                      typeof hour === "string" ? hour : formatHourLabel(hour)
                    }
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
                </>
              )}
            </div>
          </div>
        ) : (
          <div style={styles.layout}>
            <AdminBookingPanel
              styles={styles}
              business={mergedBusiness}
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
              SERVICES={SERVICES}
              customServiceName={customServiceName}
setCustomServiceName={setCustomServiceName}
customServicePrice={customServicePrice}
setCustomServicePrice={setCustomServicePrice}

needsOpponent={needsOpponent}
setNeedsOpponent={setNeedsOpponent}
opponentName={opponentName}
setOpponentName={setOpponentName}
opponentPhone={opponentPhone}
setOpponentPhone={setOpponentPhone}
isSportsBusiness={["giocata", "pinguino-club"].includes(mergedBusiness?.id)}
isCustomServiceBusiness={["barberia-james", "barberia-junior"].includes(
  mergedBusiness?.id
)}
isCustomPriceBusiness={["giocata", "pinguino-club"].includes(
  mergedBusiness?.id
)}

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
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
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
                    <option value="">
                      {`Todos los ${(
                        mergedBusiness?.resourceLabelPlural || "recursos"
                      ).toLowerCase()}`}
                    </option>
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
                business={mergedBusiness}
                loading={loading}
                isMobile={isMobile}
                weekDays={weekDays}
                selectedMobileDay={selectedMobileDay}
                setSelectedMobileDay={setSelectedMobileDay}
                formatDateToInput={formatDateToInput}
                formatHourLabel={(hour) =>
                  typeof hour === "string" ? hour : formatHourLabel(hour)
                }
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
                openPaymentPanel={openPaymentPanel}
              />
            </div>
          </div>
        )}

        {isAdminMode && paymentsEnabled && paymentAppointment && (
          <div style={styles.paymentModalOverlay} onClick={closePaymentPanel}>
            <div
              style={styles.paymentModalCard}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "8px",
                }}
              >
                <h3 style={{ margin: 0 }}>Pagos de la reserva</h3>

                <button
                  type="button"
                  style={{ ...styles.button, ...styles.secondaryButton }}
                  onClick={closePaymentPanel}
                >
                  Cerrar
                </button>
              </div>

              <p style={{ marginTop: 0, marginBottom: "16px", color: "#6b7280" }}>
                {paymentAppointment?.name} · {paymentAppointment?.service} ·{" "}
                {paymentAppointment?.date
                  ? new Date(paymentAppointment.date).toLocaleDateString("es-CL")
                  : ""}{" "}
                · {String(paymentAppointment?.time || "").slice(0, 5)}
              </p>

              {paymentPanelError && (
                <p
                  style={{
                    marginTop: 0,
                    marginBottom: "16px",
                    color: "#b42318",
                    fontWeight: "700",
                  }}
                >
                  {paymentPanelError}
                </p>
              )}

              <div style={styles.paymentSummaryGrid}>
                <div style={styles.paymentSummaryCard}>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      marginBottom: "4px",
                    }}
                  >
                    Total
                  </div>
                  <div style={{ fontWeight: "700", fontSize: "18px" }}>
                    ${selectedReservationTotal.toLocaleString("es-CL")}
                  </div>
                </div>

                <div style={styles.paymentSummaryCard}>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      marginBottom: "4px",
                    }}
                  >
                    Pagado
                  </div>
                  <div style={{ fontWeight: "700", fontSize: "18px" }}>
                    ${selectedPaymentTotal.toLocaleString("es-CL")}
                  </div>
                </div>

                <div style={styles.paymentSummaryCard}>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      marginBottom: "4px",
                    }}
                  >
                    Saldo
                  </div>
                  <div style={{ fontWeight: "700", fontSize: "18px" }}>
                    ${selectedPendingBalance.toLocaleString("es-CL")}
                  </div>
                </div>

                <div style={styles.paymentSummaryCard}>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      marginBottom: "4px",
                    }}
                  >
                    Estado
                  </div>
                  <div style={{ fontWeight: "700", fontSize: "16px" }}>
                    {selectedPaymentStatusLabel}
                  </div>
                </div>
              </div>

              {depositFeatureEnabled && (
                <p style={{ marginTop: 0, marginBottom: "16px", color: "#6b7280" }}>
                  Abono sugerido/requerido:{" "}
                  <strong>${selectedRequiredDeposit.toLocaleString("es-CL")}</strong>
                </p>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1.05fr 0.95fr",
                  gap: "16px",
                  alignItems: "start",
                }}
              >
                <div>
                  <h4 style={{ margin: "0 0 10px" }}>Historial de pagos</h4>

                  {loadingPayments ? (
                    <p style={{ marginTop: 0 }}>Cargando pagos...</p>
                  ) : selectedAppointmentPayments.length === 0 ? (
                    <p style={{ marginTop: 0, color: "#6b7280" }}>
                      Aún no hay pagos registrados para esta reserva.
                    </p>
                  ) : (
                    <div style={{ display: "grid", gap: "10px" }}>
                      {selectedAppointmentPayments.map((payment) => {
                        const isEditingThisPayment = editingPaymentId === payment.id;

                        return (
                          <div
                            key={payment.id}
                            style={{
                              ...styles.paymentHistoryItem,
                              border: isEditingThisPayment
                                ? "2px solid #2563eb"
                                : styles.paymentHistoryItem.border,
                              backgroundColor: isEditingThisPayment ? "#eff6ff" : "#ffffff",
                            }}
                          >
                            <div style={{ fontWeight: "bold", fontSize: "16px" }}>
                              ${Number(payment.amount || 0).toLocaleString("es-CL")}
                            </div>

                            <div style={{ fontSize: "14px", color: "#4b5563" }}>
                              Método: {payment.method}
                            </div>

                            <div style={{ fontSize: "14px", color: "#4b5563" }}>
                              Etapa: {payment.payment_stage}
                            </div>

                            {payment.notes ? (
                              <div style={{ fontSize: "14px", color: "#4b5563" }}>
                                Nota: {payment.notes}
                              </div>
                            ) : null}

                            <div
                              style={{
                                display: "flex",
                                gap: "8px",
                                marginTop: "10px",
                                flexWrap: "wrap",
                              }}
                            >
                              <button
                                type="button"
                                style={{
                                  ...styles.tinyButton,
                                  ...styles.editButton,
                                  flex: 1,
                                  minWidth: "90px",
                                }}
                                onClick={() => handleEditPaymentClick(payment)}
                              >
                                Editar
                              </button>

                              <button
                                type="button"
                                style={{
                                  ...styles.tinyButton,
                                  ...styles.dangerButton,
                                  flex: 1,
                                  minWidth: "90px",
                                }}
                                onClick={() => handleDeletePayment(payment)}
                              >
                                Eliminar
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <h4 style={{ margin: "0 0 10px" }}>
                    {editingPaymentId ? "Editar pago" : "Registrar nuevo pago"}
                  </h4>

                  <div style={{ display: "grid", gap: "10px" }}>
                    <input
                      style={styles.input}
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Monto del pago"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                    />

                    <select
                      style={styles.select}
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      {paymentMethods.map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </select>

                    <select
                      style={styles.select}
                      value={paymentStage}
                      onChange={(e) => setPaymentStage(e.target.value)}
                    >
                      {depositFeatureEnabled ? (
                        <>
                          <option value="deposit">
                            {depositOptional ? "Abono (opcional)" : "Abono"}
                          </option>
                          <option value="balance">Saldo</option>
                          <option value="full">Pago completo</option>
                        </>
                      ) : (
                        <option value="full">Pago completo</option>
                      )}
                    </select>

                    <input
                      style={styles.input}
                      placeholder="Observación del pago"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                    />

                    <button
                      type="button"
                      style={{ ...styles.button, ...styles.primaryButton }}
                      onClick={handleSavePayment}
                    >
                      {editingPaymentId ? "Actualizar pago" : "Registrar pago"}
                    </button>

                    {editingPaymentId && (
                      <button
                        type="button"
                        style={{ ...styles.button, ...styles.secondaryButton }}
                        onClick={handleCancelPaymentEdit}
                      >
                        Cancelar edición
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}


      </div>
    </>
  );
}

export default App;