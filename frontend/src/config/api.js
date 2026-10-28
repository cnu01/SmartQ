const normalizeBaseUrl = (value) => String(value || "").replace(/\/+$/, "");

/** Login must hit Node backend, not the Flask ML service on Render. */
export const isMlServiceUrl = (url) => {
  const normalized = normalizeBaseUrl(url);
  if (!normalized) return false;
  try {
    const host = new URL(normalized).hostname.toLowerCase();
    return host.includes("smartq-ml") || host.includes("-ml-");
  } catch {
    return normalized.toLowerCase().includes("smartq-ml");
  }
};

const isLocalHost = (hostname) =>
  hostname === "localhost" || hostname === "127.0.0.1";

const PROD_API_BASE_URL = normalizeBaseUrl(
  typeof process !== "undefined" ? process.env.REACT_APP_API_URL : ""
);
const PROD_ML_BASE_URL = normalizeBaseUrl(
  typeof process !== "undefined" ? process.env.REACT_APP_ML_URL : ""
);

const getConfiguredApiBaseUrl = () => {
  const buildUrl = normalizeBaseUrl(
    typeof process !== "undefined" ? process.env.REACT_APP_API_URL : ""
  );
  if (buildUrl) {
    return buildUrl;
  }

  const runtimeUrl =
    typeof window !== "undefined"
      ? window.__SMARTQ_API_URL__ ||
        window.__SMARTQ_API_BASE_URL__ ||
        document.querySelector('meta[name="smartq-api-base-url"]')?.content
      : "";

  return normalizeBaseUrl(runtimeUrl);
};

export const getApiConfigurationError = () => {
  const candidate =
    getConfiguredApiBaseUrl() ||
    PROD_API_BASE_URL ||
    (typeof window !== "undefined" ? window.__SMARTQ_API_URL__ : "");

  if (!candidate) {
    return (
      "Backend API URL is not set. Deploy Render service smartq-backend, then set REACT_APP_API_URL " +
      "on Netlify (not the smartq-ml URL)."
    );
  }

  if (isMlServiceUrl(candidate)) {
    return (
      "REACT_APP_API_URL is set to the ML service (smartq-ml-tbgh). Login requires the Node " +
      "smartq-backend URL from the Render dashboard."
    );
  }

  return null;
};

const getLocalApiBaseUrl = () => {
  const fromEnv = normalizeBaseUrl(
    typeof process !== "undefined" ? process.env.REACT_APP_API_URL : ""
  );
  return fromEnv || "http://localhost:5000";
};

const getLocalMlBaseUrl = () => {
  const fromEnv = normalizeBaseUrl(
    typeof process !== "undefined" ? process.env.REACT_APP_ML_URL : ""
  );
  return fromEnv || "http://localhost:5001";
};

const isHostedStaticSite = (hostname) =>
  hostname.endsWith(".netlify.app") ||
  hostname.endsWith(".netlify.com") ||
  hostname.endsWith(".vercel.app");

const getApiBaseUrl = () => {
  if (typeof window !== "undefined" && isLocalHost(window.location.hostname)) {
    return getLocalApiBaseUrl();
  }

  const configuredBaseUrl = getConfiguredApiBaseUrl();

  if (configuredBaseUrl) {
    if (isMlServiceUrl(configuredBaseUrl)) {
      console.error(getApiConfigurationError());
      return "";
    }
    return configuredBaseUrl;
  }

  if (PROD_API_BASE_URL) {
    if (isMlServiceUrl(PROD_API_BASE_URL)) {
      console.error(getApiConfigurationError());
      return "";
    }
    return PROD_API_BASE_URL;
  }

  if (typeof window === "undefined") {
    return "";
  }

  const { hostname } = window.location;

  if (isLocalHost(hostname)) {
    return getLocalApiBaseUrl();
  }

  if (isHostedStaticSite(hostname)) {
    console.error(
      "Smart'Q: API URL missing. Set REACT_APP_API_URL on Netlify (redeploy) or set apiUrl in frontend/public/smartq-config.js to your Render backend URL."
    );
    return "";
  }

  console.warn(
    "Smart'Q: set REACT_APP_API_URL at build time to your Render backend URL."
  );
  return normalizeBaseUrl(window.location.origin);
};

const getMlBaseUrl = () => {
  if (typeof window !== "undefined" && isLocalHost(window.location.hostname)) {
    return getLocalMlBaseUrl();
  }

  const configuredMlUrl =
    typeof window !== "undefined"
      ? window.__SMARTQ_ML_BASE_URL__ ||
        document.querySelector('meta[name="smartq-ml-base-url"]')?.content
      : "";

  if (configuredMlUrl) {
    return normalizeBaseUrl(configuredMlUrl);
  }

  if (PROD_ML_BASE_URL) {
    return PROD_ML_BASE_URL;
  }

  return "";
};

export const API_BASE_URL = getApiBaseUrl();
export const ML_BASE_URL = getMlBaseUrl();
