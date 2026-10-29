import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home, Shield } from "lucide-react";
import "./Breadcrumbs.css";

const LABELS = {
  dashboard: "Dashboard",
  transactions: "Transactions",
  budgets: "Budgets",
  reports: "Reports",
  insights: "Insights",
  "saving-tips": "Saving Tips",
  categories: "Categories",
  notes: "Notes",
  profile: "Profile",
  notifications: "Notifications",
  users: "Users",
  templates: "Templates",
  announcements: "Announcements",
  statistics: "Statistics",
  settings: "Settings",
};

function Breadcrumbs({ variant = "student" }) {
  const location = useLocation();
  let segments = location.pathname.split("/").filter(Boolean);

  const isAdmin = variant === "admin";
  const HomeIcon = isAdmin ? Shield : Home;
  const homeLabel = isAdmin ? "Admin" : "Home";
  const homePath = isAdmin ? "/admin/dashboard" : "/dashboard";

  if (isAdmin) {
    segments = segments.filter((s) => s !== "admin");
  }

  const displaySegments = segments.filter((s) => s !== "dashboard");

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <Link to={homePath} className="breadcrumb-item breadcrumb-home">
        <HomeIcon size={14} />
        <span>{homeLabel}</span>
      </Link>

      {displaySegments.map((segment, idx) => {
        const isLast = idx === displaySegments.length - 1;
        const label =
          LABELS[segment] ||
          segment.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

        const path =
          (isAdmin ? "/admin" : "") +
          "/" +
          displaySegments.slice(0, idx + 1).join("/");

        return (
          <span key={path} className="breadcrumb-group">
            <ChevronRight size={14} className="breadcrumb-sep" />
            {isLast ? (
              <span className="breadcrumb-item breadcrumb-current">{label}</span>
            ) : (
              <Link to={path} className="breadcrumb-item">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export default Breadcrumbs;