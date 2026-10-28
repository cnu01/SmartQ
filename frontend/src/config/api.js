const normalizeBaseUrl = (value) => String(value || "").replace(/\/+$/, "");

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

const getApiBaseUrl = () => {
  if (typeof window !== "undefined" && isLocalHost(window.location.hostname)) {
    return getLocalApiBaseUrl();
  }

  const configuredBaseUrl = getConfiguredApiBaseUrl();

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  if (PROD_API_BASE_URL) {
    return PROD_API_BASE_URL;
  }

  if (typeof window === "undefined") {
    return "";
  }

  const { protocol, hostname, origin } = window.location;

  if (isLocalHost(hostname)) {
    return getLocalApiBaseUrl();
  }

  console.warn(
    "Smart'Q: set REACT_APP_API_URL at build time (Netlify) to your Render backend URL."
  );
  return normalizeBaseUrl(origin);
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
