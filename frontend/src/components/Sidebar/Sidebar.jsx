import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  ArrowLeftRight,
  ChartNoAxesColumnIncreasing,
  Globe2,
  LayoutDashboard,
  Leaf,
  LogOut,
  NotebookPen,
  Sparkles,
  Tags,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import API from "../../api/axios";
import logoImg from "../../assets/images/tech.png";

import "./Sidebar.css";

function Sidebar({ isOpen, closeSidebar }) {
  const navigate = useNavigate();

  const links = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/transactions", label: "Transactions", icon: ArrowLeftRight },
    { to: "/budgets", label: "Budgets", icon: WalletCards },
    { to: "/reports", label: "Reports", icon: ChartNoAxesColumnIncreasing },
    { to: "/insights", label: "Insights", icon: Sparkles },
    { to: "/saving-tips", label: "Saving Tips", icon: Leaf, isLeaf: true },
    { to: "/categories", label: "Categories", icon: Tags },
    { to: "/notes", label: "Notes", icon: NotebookPen },
    { to: "/profile", label: "Profile", icon: UserRound },
  ];

  const handleLogout = async () => {
    closeSidebar();
    try {
      await API.post("/auth/logout");
    } catch {
      // Clear the local session even when the API is unavailable.
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("campuscoin:auth-changed"));
    document.body.classList.remove("dark-mode");
    toast.success("Logged out");
    setTimeout(() => navigate("/login"), 400);
  };

  return (
    <>
      <aside className={`sidebar ${isOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-header">
          <Link to="/dashboard" className="sidebar-brand" onClick={closeSidebar}>
            <img src={logoImg} alt="Campus Coin" className="sidebar-logo-img" />
            <div className="sidebar-brand-text">
              <strong>Campus Coin</strong>
              <small>Student Finance</small>
            </div>
          </Link>

          <button
            type="button"
            className="sidebar-close"
            onClick={closeSidebar}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className="sidebar-link"
                onClick={closeSidebar}
              >
                <Icon size={18} className={item.isLeaf ? "sidebar-leaf-icon" : ""} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <Link
            to="/"
            className="sidebar-website"
            onClick={closeSidebar}
          >
            <Globe2 size={18} />
            <span>Visit Website</span>
          </Link>
          <button
            type="button"
            className="sidebar-logout"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {isOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          onClick={closeSidebar}
          aria-label="Close navigation"
        />
      )}
    </>
  );
}

export default Sidebar;
