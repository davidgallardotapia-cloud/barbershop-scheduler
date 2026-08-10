const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://barbershop-scheduler.onrender.com";

const buildUrl = (path, params) => {
  const url = new URL(path, API_BASE_URL);

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
};

const getStoredAuthToken = () => {
  if (typeof window === "undefined") return "";

  return window.localStorage.getItem("authToken") || "";
};

const parseResponseBody = async (response) => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const request = async (method, path, options = {}) => {
  const token = getStoredAuthToken();
  const headers = {
    ...(options.data ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(buildUrl(path, options.params), {
    method,
    credentials: "include",
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    body: options.data ? JSON.stringify(options.data) : undefined,
  });

  const data = await parseResponseBody(response);

  if (!response.ok) {
    const error = new Error(data?.message || "Error en la solicitud");
    error.response = {
      status: response.status,
      data,
    };
    throw error;
  }

  return { data };
};

const api = {
  get(path, options) {
    return request("GET", path, options);
  },
  post(path, data, options = {}) {
    return request("POST", path, { ...options, data });
  },
  put(path, data, options = {}) {
    return request("PUT", path, { ...options, data });
  },
  patch(path, data, options = {}) {
    return request("PATCH", path, { ...options, data });
  },
  delete(path, options) {
    return request("DELETE", path, options);
  },
};

export default api;
