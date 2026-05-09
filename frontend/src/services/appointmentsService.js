import api from "./api";

export const getAppointments = (businessId) => {
  return api.get("/appointments", {
    params: { businessId },
  });
};

export const getAdminAppointments = () => {
  return api.get("/admin/appointments");
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
