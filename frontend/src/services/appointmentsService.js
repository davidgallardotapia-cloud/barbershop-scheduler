import api from "./api";

export const getAppointments = (businessId) => {
  return api.get("/appointments", {
    params: { businessId },
  });
};

export const createAppointment = (data) => {
  return api.post("/appointments", data);
};

export const updateAppointment = (id, data) => {
  return api.put(`/appointments/${id}`, data);
};

export const deleteAppointment = (id, businessId) => {
  return api.delete(`/appointments/${id}`, {
    params: { businessId },
  });
};

export const loginUser = (credentials) => {
  return api.post("/login", credentials);
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