/**
 * Production Render URLs (no trailing slash).
 * mlUrl  → smartq-ml (Python) — predictions only
 * apiUrl → smartq-backend (Node) — login, queue, admin API
 */
(function (w) {
  var mlUrl = "https://smartq-ml-tbgh.onrender.com";
  var apiUrl = "";
  // After smartq-backend is Live on Render, paste its URL here, e.g.:
  // apiUrl = "https://smartq-backend-xxxxx.onrender.com";

  if (mlUrl) {
    w.__SMARTQ_ML_BASE_URL__ = mlUrl.replace(/\/+$/, "");
  }
  if (apiUrl) {
    w.__SMARTQ_API_URL__ = apiUrl.replace(/\/+$/, "");
  }
})(window);
