import axios from "axios";
import { API_BASE_URL } from "../config/api";

const API = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true // Required for refresh cookie
});

// Attach access token manually when available
export const setAuthToken = (token) => {
  if (token) {
    API.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete API.defaults.headers.common["Authorization"];
  }
};

const CUSTOMER_DATA_KEY = "customerData";

export const persistCustomerProfile = (profile) => {
  if (!profile) return;
  localStorage.setItem(
    CUSTOMER_DATA_KEY,
    JSON.stringify({
      name: profile.name || "",
      email: profile.email || "",
      phone: profile.phone || ""
    })
  );
};

export const readStoredCustomerProfile = () => {
  try {
    const raw = localStorage.getItem(CUSTOMER_DATA_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearAuthSession = () => {
  setAuthToken(null);
  localStorage.removeItem("token");
  localStorage.removeItem("authRole");
  localStorage.removeItem(CUSTOMER_DATA_KEY);
  localStorage.removeItem("currentPage");
};

export const fetchCurrentUser = async () => {
  const response = await API.get("/auth/me");
  return response.data?.user || null;
};

const ADMIN_PAGES = new Set([
  "admin-dashboard",
  "event-scheduler",
  "event-history",
  "queue-management",
  "counter-management",
  "analytics",
  "predictions",
  "settings"
]);

const CUSTOMER_PAGES = new Set(["customer-dashboard", "join-queue"]);

export const resolvePageForRole = (role, savedPage) => {
  if (role === "admin") {
    if (savedPage && ADMIN_PAGES.has(savedPage)) return savedPage;
    return "admin-dashboard";
  }
  if (role === "customer") {
    if (savedPage && (CUSTOMER_PAGES.has(savedPage) || savedPage === "login")) {
      return savedPage === "login" ? "customer-dashboard" : savedPage;
    }
    return "customer-dashboard";
  }
  return "landing";
};

// Auto-refresh when access token expires
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    return Promise.reject(error);
  }
);

export const loginAdmin = async (email, password) => {
  const response = await API.post("/auth/admin/login", {
    email,
    password
  });

  // Normalize backend response shape for admin UI compatibility.
  return {
    ...response.data,
    accessToken: response.data?.accessToken || response.data?.token
  };
};

export const registerCustomer = async ({ name, email, mobile, password }) => {
  const response = await API.post("/auth/register", {
    name,
    email,
    phone: mobile,
    password
  });
  return response.data;
};

export const loginCustomer = async ({ emailOrPhone, password }) => {
  const response = await API.post("/auth/login", {
    emailOrPhone,
    password
  });
  return {
    ...response.data,
    accessToken: response.data?.accessToken || response.data?.token
  };
};

export const changeAdminPassword = async ({ currentPassword, newPassword }) => {
  const response = await API.put("/auth/admin/change-password", {
    currentPassword,
    newPassword
  });
  return response.data;
};

export const sendCustomerLoginOtp = async (email) => {
  const response = await API.post("/otp/send-otp", { email });
  return response.data;
};

export const verifyCustomerLoginOtp = async ({ email, otp }) => {
  const response = await API.post("/otp/verify-otp", { email, otp });
  return {
    ...response.data,
    accessToken: response.data?.accessToken || response.data?.token
  };
};

export const getEventById = async (eventId) => {
  const response = await API.get("/events");
  const events = Array.isArray(response.data) ? response.data : [];
  return (
    events.find((event) => String(event.id || event._id) === String(eventId)) ||
    null
  );
};

export const checkBackendHealth = async () => {
  const response = await API.get("/health");
  return response.data;
};


export default API;
