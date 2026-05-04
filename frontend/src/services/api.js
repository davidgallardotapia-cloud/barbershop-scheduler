// src/services/api.js

import axios from "axios";

const api = axios.create({
  baseURL: "https://barbershop-scheduler.onrender.com",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;