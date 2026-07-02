import api from "./api";

export const getAppointments = (businessId, filters = {}) => {
  return api.get("/appointments", {
    params: { businessId, ...filters },
  });
};

export const getAdminAppointments = (filters = {}) => {
  return api.get("/admin/appointments", {
    params: filters,
  });
};

export const getScheduleBlocks = (businessId, filters = {}) => {
  return api.get("/schedule-blocks", {
    params: { businessId, ...filters },
  });
};

export const getAdminScheduleBlocks = (filters = {}) => {
  return api.get("/admin/schedule-blocks", {
    params: filters,
  });
};

export const createScheduleBlock = (data) => {
  return api.post("/schedule-blocks", data);
};

export const deleteScheduleBlock = (id, businessId) => {
  return api.delete(`/schedule-blocks/${id}`, {
    params: { businessId },
  });
};

export const createAppointment = (data) => {
  return api.post("/appointments", data);
};

export const joinOpponentAppointment = (appointmentId, data) => {
  return api.put(`/appointments/${appointmentId}/opponent`, data);
};

export const updateAppointment = (id, data) => {
  return api.put(`/appointments/${id}`, data);
};

export const deleteAppointment = (id, businessId) => {
  return api.delete(`/appointments/${id}`, {
    params: { businessId },
  });
};

export const createMonthlyAppointment = (data) => {
  return api.post("/appointments/monthly", data);
};

export const loginUser = (credentials) => {
  return api.post("/login", credentials);
};

export const logoutUser = () => {
  return api.post("/logout");
};

export const syncGoogleSheets = (data) => {
  return api.post("/integrations/google-sheets/sync", data);
};

export const getBusinessBySlug = (slug) => {
  return api.get(`/business/${slug}`);
};

export const getAppointmentPayments = (appointmentId, businessId) => {
  return api.get(`/appointments/${appointmentId}/payments`, {
    params: { businessId },
  });
};

export const addAppointmentPayment = (appointmentId, data) => {
  return api.post(`/appointments/${appointmentId}/payments`, data);
};

export const updateAppointmentPayment = (appointmentId, paymentId, data) => {
  return api.put(`/appointments/${appointmentId}/payments/${paymentId}`, data);
};

export const deleteAppointmentPayment = (appointmentId, paymentId, businessId) => {
  return api.delete(`/appointments/${appointmentId}/payments/${paymentId}`, {
    params: { businessId },
  });
};

export const createMercadoPagoPreference = (data) => {
  return api.post("/payments/mercadopago/preferences", data);
};

export const getClinicalRecords = (filters = {}) => {
  return api.get("/clinical-records", {
    params: filters,
  });
};

export const createClinicalRecord = (data) => {
  return api.post("/clinical-records", data);
};

export const updateClinicalRecord = (recordId, data) => {
  return api.put(`/clinical-records/${recordId}`, data);
};
