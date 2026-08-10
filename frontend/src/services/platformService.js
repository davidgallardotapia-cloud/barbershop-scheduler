import api from "./api";

export const loginPlatformAdmin = (credentials) => {
  return api.post("/login", {
    ...credentials,
    businessId: "__platform__",
  });
};

export const logoutPlatformAdmin = () => {
  return api.post("/logout");
};

export const getPlatformBusinesses = () => {
  return api.get("/platform/businesses");
};

export const createPlatformBusiness = (data) => {
  return api.post("/platform/businesses", data);
};

export const updatePlatformBusinessStatus = (businessId, status) => {
  return api.patch(`/platform/businesses/${businessId}/status`, { status });
};
