// src/services/api.js

import axios from "axios";

const api = axios.create({
  baseURL: "https://barbershop-scheduler.onrender.com",
});

export default api;