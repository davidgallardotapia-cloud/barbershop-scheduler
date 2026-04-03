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

export const deleteAppointment = (id) => {
  return api.delete(`/appointments/${id}`);
};

export const loginUser = (credentials) => {
  return api.post("/login", credentials);
};