import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Bell, Menu } from "lucide-react";

import Sidebar from "../components/Sidebar/Sidebar";
import Breadcrumbs from "../components/Breadcrumbs/Breadcrumbs";
import API from "../api/axios";
import "./DashboardLayout.css";

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user")) || null;
  } catch {
    return null;
  }
}

function applyStudentPreferences() {
  const prefs = JSON.parse(
    localStorage.getItem("student_preferences") || "{}"
  );
  const fontSize = prefs.fontSize || "normal";
  document.documentElement.style.fontSize =
    fontSize === "small" ? "14px" : fontSize === "large" ? "18px" : "16px";
  document.documentElement.dataset.fontSize = fontSize;
  document.documentElement.dataset.theme = prefs.darkMode ? "dark" : "light";
  document.body.classList.toggle("dark-mode", Boolean(prefs.darkMode));
}

function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(readStoredUser);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setUser(readStoredUser());
  }, [location.pathname]);

  useEffect(() => {
    const refreshStoredUser = () => setUser(readStoredUser());
    window.addEventListener("campuscoin:user-updated", refreshStoredUser);
    return () => window.removeEventListener("campuscoin:user-updated", refreshStoredUser);
  }, []);

  // Re-apply saved accessibility preferences whenever the student panel loads.
  useEffect(() => {
    applyStudentPreferences();
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadUnread = async () => {
      try {
        const res = await API.get("/notifications/unread-count");
        if (!ignore) setUnreadCount(res.data.count || 0);
      } catch (err) {
        console.error("Failed to load unread notifications:", err);
      }
    };

    loadUnread();

    return () => {
      ignore = true;
    };
  }, [location.pathname]);

  const handleNotificationClick = () => {
    navigate("/notifications");
  };

  const avatarLetter = user?.name?.charAt(0)?.toUpperCase() || "U";
  const displayName = user?.name?.trim() || "Student";

  return (
    <div className="dashboard-layout">
      <Sidebar
        isOpen={sidebarOpen}
        closeSidebar={() => setSidebarOpen(false)}
      />

      <div className="dashboard-main">
        <header className="dashboard-header">
          <div className="dashboard-header-left">
            <button
              type="button"
              className="menu-button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={22} />
            </button>

            <div className="dashboard-header-text">
              <span className="dashboard-header-label">Welcome back</span>
              <span className="dashboard-header-name">{displayName}</span>
            </div>
          </div>

          <div className="dashboard-header-right">
            <button
              type="button"
              className="notification-button"
              onClick={handleNotificationClick}
              aria-label="Notifications"
            >
              <Bell size={19} />
              {unreadCount > 0 && (
                <span className="notification-badge">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            <div className="profile-avatar" title={user?.name || "User"}>
              {avatarLetter}
            </div>
          </div>
        </header>

        <main className="dashboard-content">
          <Breadcrumbs variant="student" />
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
