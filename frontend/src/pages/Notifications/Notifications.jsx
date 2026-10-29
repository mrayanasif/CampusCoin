import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  BellOff,
  CheckCheck,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Leaf,
  Sparkles,
  Megaphone,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";

import API from "../../api/axios";
import "./Notifications.css";

const TYPE_META = {
  budget_warning: { icon: AlertTriangle, color: "#648D22", label: "Budget Warning" },
  budget_exceeded: { icon: AlertCircle, color: "#dc2626", label: "Budget Exceeded" },
  saving_tip: { icon: Leaf, color: "#16a34a", label: "Saving Tip" },
  insight: { icon: Sparkles, color: "#7f1d3a", label: "Insight" },
  announcement: { icon: Megaphone, color: "#2563eb", label: "Announcement" },
  system: { icon: Info, color: "#6b7280", label: "System" },
};

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/login");
      return;
    }
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);

      try {
        await API.post("/notifications/refresh-budget-alerts");
      } catch (e) {
      }

      const res = await API.get("/notifications");
      setNotifications(res.data.notifications || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await API.put(`/notifications/${id}/read`);
      setNotifications((curr) =>
        curr.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      toast.error("Failed to mark read");
    }
  };

  const markAllRead = async () => {
    try {
      await API.put("/notifications/read-all");
      setNotifications((curr) => curr.map((n) => ({ ...n, isRead: true })));
      toast.success("All marked as read");
    } catch (error) {
      toast.error("Failed");
    }
  };

  const deleteNotification = async (id) => {
    try {
      await API.delete(`/notifications/${id}`);
      setNotifications((curr) => curr.filter((n) => n._id !== id));
      toast.success("Deleted");
    } catch (error) {
      toast.error("Delete failed");
    }
  };

  const clearAll = async () => {
    if (!window.confirm("Delete all notifications?")) return;
    try {
      await Promise.all(
        notifications.map((n) => API.delete(`/notifications/${n._id}`))
      );
      setNotifications([]);
      toast.success("All cleared");
    } catch (error) {
      toast.error("Failed to clear");
    }
  };

  const filtered = notifications.filter((n) =>
    filter === "all" ? true : !n.isRead
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (loading) {
    return (
      <div className="notifications-page">
        <div className="page-heading">
          <div>
            <h1>Notifications</h1>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <div className="page-heading">
        <div>
          <h1>Notifications</h1>
          <p>
            You have <strong>{unreadCount}</strong> unread{" "}
            {unreadCount === 1 ? "notification" : "notifications"}.
          </p>
        </div>

        <div className="notif-actions">
          {unreadCount > 0 && (
            <button
              type="button"
              className="notif-secondary-btn"
              onClick={markAllRead}
            >
              <CheckCheck size={15} />
              Mark all read
            </button>
          )}

          {notifications.length > 0 && (
            <button
              type="button"
              className="notif-danger-btn"
              onClick={clearAll}
            >
              <Trash2 size={15} />
              Clear all
            </button>
          )}
        </div>
      </div>

      <div className="notif-filters">
        <button
          type="button"
          className={filter === "all" ? "active" : ""}
          onClick={() => setFilter("all")}
        >
          All ({notifications.length})
        </button>
        <button
          type="button"
          className={filter === "unread" ? "active" : ""}
          onClick={() => setFilter("unread")}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="notif-empty">
          <BellOff size={42} />
          <h3>No notifications</h3>
          <p>
            {filter === "unread"
              ? "You're all caught up!"
              : "You don't have any notifications yet."}
          </p>
        </div>
      ) : (
        <div className="notif-list">
          {filtered.map((n) => {
            const meta = TYPE_META[n.type] || TYPE_META.system;
            const Icon = meta.icon;

            return (
              <article
                key={n._id}
                className={`notif-item ${n.isRead ? "notif-read" : "notif-unread"}`}
                onClick={() => !n.isRead && markAsRead(n._id)}
              >
                <div
                  className="notif-icon"
                  style={{ background: `${meta.color}15`, color: meta.color }}
                >
                  <Icon size={18} />
                </div>

                <div className="notif-content">
                  <div className="notif-title-row">
                    <h3>{n.title}</h3>
                    {!n.isRead && <span className="notif-unread-dot" />}
                  </div>
                  <p>{n.message}</p>
                  <div className="notif-meta">
                    <span className="notif-type">{meta.label}</span>
                    <span className="notif-time">{timeAgo(n.createdAt)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="notif-delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(n._id);
                  }}
                  aria-label="Delete notification"
                >
                  <Trash2 size={15} />
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Notifications;
