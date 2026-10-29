import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  ChartNoAxesColumnIncreasing,
  FolderCog,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessagesSquare,
  Settings,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import logoImg from "../../assets/images/tech.png";

import Breadcrumbs from "../../components/Breadcrumbs/Breadcrumbs";
import "./AdminLayout.css";

function AdminLayout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const prefs = JSON.parse(
      localStorage.getItem("admin_preferences") || "{}"
    );

    if (prefs.darkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }

    return () => {
      document.body.classList.remove("dark-mode");
    };
  }, []);

  const closeSidebar = () => setSidebarOpen(false);

  const handleLogout = () => {
    closeSidebar();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    document.body.classList.remove("dark-mode");
    toast.success("Logged out");
    setTimeout(() => navigate("/login"), 400);
  };

  return (
    <div className="admin-layout">
      <header className="admin-mobile-header">
        <button
          type="button"
          className="admin-menu-button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation"
        >
          <Menu size={22} />
        </button>

        <div className="admin-mobile-brand">
          <img src={logoImg} alt="Campus Coin" className="admin-mobile-brand-img" />
          <span className="admin-mobile-brand-text">Campus Coin</span>
        </div>
      </header>

      <aside className={`admin-sidebar ${sidebarOpen ? "admin-sidebar-open" : ""}`}>
        <div className="admin-sidebar-header">
          <div className="admin-brand">
            <img src={logoImg} alt="Campus Coin" className="admin-brand-logo-img" />
            <div className="admin-brand-text">
              <strong>Campus Coin</strong>
              <span>Administrator</span>
            </div>
          </div>

          <button
            type="button"
            className="admin-sidebar-close"
            onClick={closeSidebar}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <div className="admin-sidebar-badge">
          <ShieldCheck size={14} />
          <span>Admin Access</span>
        </div>

        <nav>
          <NavLink to="/admin/dashboard" onClick={closeSidebar}>
            <LayoutDashboard size={18} />
            Dashboard
          </NavLink>

          <NavLink to="/admin/users" onClick={closeSidebar}>
            <UsersRound size={18} />
            Users
          </NavLink>

          <NavLink to="/admin/categories" onClick={closeSidebar}>
            <FolderCog size={18} />
            Categories
          </NavLink>

          <NavLink to="/admin/templates" onClick={closeSidebar}>
            <MessagesSquare size={18} />
            Templates
          </NavLink>

          <NavLink to="/admin/announcements" onClick={closeSidebar}>
            <Megaphone size={18} />
            Announcements
          </NavLink>

          <NavLink to="/admin/statistics" onClick={closeSidebar}>
            <ChartNoAxesColumnIncreasing size={18} />
            Statistics
          </NavLink>

          <NavLink to="/admin/settings" onClick={closeSidebar}>
            <Settings size={18} />
            Settings
          </NavLink>
        </nav>

        <div className="admin-sidebar-footer">
          <button type="button" className="admin-logout" onClick={handleLogout}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          className="admin-sidebar-overlay"
          onClick={closeSidebar}
          aria-label="Close navigation"
        />
      )}

      <main className="admin-content">
        <Breadcrumbs variant="admin" />
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;