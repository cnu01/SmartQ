import React, { useState, useEffect } from "react";
import {
  checkBackendHealth,
  getEventById,
  setAuthToken,
  fetchCurrentUser,
  readStoredCustomerProfile,
  persistCustomerProfile,
  clearAuthSession,
  resolvePageForRole
} from "./services/api";
import "./styles/global.css";

// Customer Components
import LandingPage from "./components/customer/LandingPage";
import CustomerLogin from "./components/customer/CustomerLogin";
import CustomerDashboard from "./components/customer/CustomerDashboard";
import JoinQueue from "./components/customer/JoinQueue";
import WelcomePage from "./components/customer/WelcomePage";

// Admin Components
import AdminLogin from "./components/admin/AdminLogin";
import AdminDashboard from "./components/admin/AdminDashboard";
import EventScheduler from "./components/admin/EventScheduler";
import EventHistory from "./components/admin/EventHistory";
import QueueManagement from "./components/admin/QueueManagement";
import CounterManagement from "./components/admin/CounterManagement";
import Analytics from "./components/admin/Analytics";
import Predictions from "./components/admin/Predictions";
import AdminSettings from "./components/admin/AdminSettings";

function App() {

  const [currentPage, setCurrentPage] = useState("landing");

  const [pageData, setPageData] = useState(null);
  const [navigationHistory, setNavigationHistory] = useState([]);
  const [backendStatus, setBackendStatus] = useState("");
  const [customerData, setCustomerData] = useState(() => readStoredCustomerProfile());
  const [sessionReady, setSessionReady] = useState(false);

  const navigate = (page, data = null) => {
    if (page !== currentPage) {
      setNavigationHistory((prev) => [...prev, currentPage]);
    }

    if (page === "customer-dashboard" && data && (data.name || data.email || data.phone)) {
      setCustomerData(data);
      persistCustomerProfile(data);
    }

    setCurrentPage(page);
    localStorage.setItem("currentPage", page);
    setPageData(data);
  };

  const handleCustomerLogout = () => {
    setCustomerData(null);
    setPageData(null);
    setNavigationHistory([]);
    clearAuthSession();
    setCurrentPage("landing");
  };

  const goBack = () => {
    if (navigationHistory.length > 0) {
      const previousPage = navigationHistory[navigationHistory.length - 1];
      setNavigationHistory((prev) => prev.slice(0, -1));
      setCurrentPage(previousPage);
      localStorage.setItem("currentPage", previousPage);
      setPageData(null);
    } else {
      setCurrentPage("landing");
      localStorage.setItem("currentPage", "landing");
      setPageData(null);
    }
  };

  useEffect(() => {
    checkBackendHealth()
      .then((data) => setBackendStatus(data.message))
      .catch(() => setBackendStatus("Backend not reachable ❌"));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        setAuthToken(token);
      }

      const savedPage = localStorage.getItem("currentPage");

      if (!token) {
        if (
          savedPage &&
          savedPage !== "customer-dashboard" &&
          !savedPage.startsWith("admin-") &&
          savedPage !== "queue-management" &&
          savedPage !== "event-scheduler" &&
          savedPage !== "event-history" &&
          savedPage !== "counter-management" &&
          savedPage !== "analytics" &&
          savedPage !== "predictions" &&
          savedPage !== "settings"
        ) {
          setCurrentPage(savedPage);
        }
        if (!cancelled) setSessionReady(true);
        return;
      }

      try {
        const user = await fetchCurrentUser();
        if (cancelled || !user) return;

        const role = user.role === "admin" ? "admin" : "customer";
        localStorage.setItem("authRole", role);

        if (role === "customer") {
          const profile = {
            name: user.name || "",
            email: user.email || "",
            phone: user.phone || ""
          };
          setCustomerData(profile);
          persistCustomerProfile(profile);
        }

        const nextPage = resolvePageForRole(role, savedPage);
        setCurrentPage(nextPage);
        localStorage.setItem("currentPage", nextPage);
      } catch {
        clearAuthSession();
        setCustomerData(null);
        setCurrentPage("landing");
      } finally {
        if (!cancelled) setSessionReady(true);
      }
    };

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!sessionReady) return;

    const params = new URLSearchParams(window.location.search);
    const eventId = params.get("eventId");
    if (!eventId) return;

    const openEventFromQr = async () => {
      try {
        const event = await getEventById(eventId);
        if (!event) return;

        setCurrentPage("join-queue");
        setPageData({ event, isCustomer: false });
        localStorage.setItem("currentPage", "join-queue");
        window.history.replaceState({}, "", window.location.pathname);
      } catch (error) {
        // Keep current page when event lookup fails.
      }
    };

    openEventFromQr();
  }, [sessionReady]);

  const renderPage = () => {
    switch (currentPage) {

      case "landing":
        return <LandingPage onNavigate={navigate} goBack={goBack} currentPage={currentPage} />;

      case "login":
        return <CustomerLogin onNavigate={navigate} goBack={goBack} currentPage={currentPage} />;

      case "customer-dashboard":
        return <CustomerDashboard onNavigate={navigate} goBack={goBack} currentPage={currentPage} customerData={customerData} onLogout={handleCustomerLogout} />;

      case "join-queue":
        return <JoinQueue onNavigate={navigate} goBack={goBack} currentPage={currentPage} eventData={pageData} customerData={customerData} />;

      case "welcome":
        return <WelcomePage onNavigate={navigate} goBack={goBack} currentPage={currentPage} />;

      case "admin-login":
        return <AdminLogin onNavigate={navigate} goBack={goBack} currentPage={currentPage} />;

      case "admin-dashboard":
        return <AdminDashboard onNavigate={navigate} goBack={goBack} currentPage={currentPage} />;

      case "event-scheduler":
        return <EventScheduler onNavigate={navigate} goBack={goBack} currentPage={currentPage} />;

      case "event-history":
        return <EventHistory onNavigate={navigate} goBack={goBack} currentPage={currentPage} />;

      case "queue-management":
        return <QueueManagement onNavigate={navigate} goBack={goBack} currentPage={currentPage} />;

      case "counter-management":
        return <CounterManagement onNavigate={navigate} goBack={goBack} currentPage={currentPage} />;

      case "analytics":
        return <Analytics onNavigate={navigate} goBack={goBack} currentPage={currentPage} />;

      case "predictions":
        return <Predictions onNavigate={navigate} goBack={goBack} currentPage={currentPage} />;

      case "settings":
        return <AdminSettings onNavigate={navigate} goBack={goBack} currentPage={currentPage} />;

      default:
        return <LandingPage onNavigate={navigate} goBack={goBack} currentPage={currentPage} />;
    }
  };

  if (!sessionReady) {
    return (
      <div className="App" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        Loading…
      </div>
    );
  }

  return <div className="App">{renderPage()}</div>;
}

export default App;
