/**
 * Production API URL (Render **smartq-backend**, not ML).
 * Netlify: also set REACT_APP_API_URL in site env and redeploy.
 * If login still hits netlify.app/api/..., set the URL below and push.
 */
(function (w) {
  var apiUrl = "";
  // Example: apiUrl = "https://smartq-backend-xxxx.onrender.com";
  if (apiUrl) {
    w.__SMARTQ_API_URL__ = apiUrl.replace(/\/+$/, "");
  }
})(window);
