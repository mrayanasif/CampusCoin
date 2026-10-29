import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ShieldAlert, Clock, LogOut, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import API from "../../api/axios";
import "./SessionManager.css";

// Bank-grade configuration:
// 15 minutes of inactivity triggers logout.
// Warning modal appears 60 seconds before timeout (at 14 minutes).
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_WINDOW_MS = 60 * 1000; // 60 seconds countdown
const CHECK_INTERVAL_MS = 1000; // Check every 1 second

function getStoredLastActivity() {
  const val = localStorage.getItem("campuscoin:last_activity");
  return val ? parseInt(val, 10) : Date.now();
}

function setStoredLastActivity(time = Date.now()) {
  localStorage.setItem("campuscoin:last_activity", time.toString());
}

export default function SessionManager() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const [isExtending, setIsExtending] = useState(false);

  const lastActivityRef = useRef(getStoredLastActivity());
  const hasLoggedOutRef = useRef(false);

  const performLogout = useCallback(
    async (reason = "session_expired") => {
      if (hasLoggedOutRef.current) return;
      hasLoggedOutRef.current = true;

      try {
        await API.post("/auth/logout");
      } catch {
        // Ignore network errors on logout
      }

      // Clear tokens and credentials
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("campuscoin:last_activity");

      // Broadcast logout to all other open tabs
      localStorage.setItem("campuscoin:session_logout", Date.now().toString());
      window.dispatchEvent(new Event("campuscoin:auth-changed"));

      setShowWarning(false);

      const isUserInAdmin = location.pathname.startsWith("/admin");
      const targetLogin = isUserInAdmin ? "/admin/login" : "/login";

      navigate(`${targetLogin}?reason=${reason}`, { replace: true });
    },
    [navigate, location.pathname]
  );

  const recordActivity = useCallback(() => {
    // If warning is already displayed, don't auto-dismiss via mouse jitter;
    // user must explicitly click "Keep Session Alive"
    if (showWarning) return;

    const now = Date.now();
    // Throttle localStorage writes to once every 2 seconds
    if (now - lastActivityRef.current > 2000) {
      lastActivityRef.current = now;
      setStoredLastActivity(now);
    }
  }, [showWarning]);

  const keepSessionAlive = async () => {
    try {
      setIsExtending(true);
      await API.post("/auth/heartbeat");
      const now = Date.now();
      lastActivityRef.current = now;
      setStoredLastActivity(now);
      setShowWarning(false);
      setSecondsRemaining(60);
      toast.success("Banking session extended");
    } catch (err) {
      console.warn("Heartbeat failed:", err);
      // If server returned 401, perform logout
      if (err.response?.status === 401) {
        performLogout("session_expired");
      }
    } finally {
      setIsExtending(false);
    }
  };

  // Register user activity event listeners
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const events = ["mousedown", "mousemove", "keydown", "touchstart", "scroll", "click"];
    events.forEach((evt) => window.addEventListener(evt, recordActivity, { passive: true }));

    // Sync across tabs via storage events
    const handleStorageChange = (e) => {
      if (e.key === "campuscoin:last_activity" && e.newValue) {
        lastActivityRef.current = parseInt(e.newValue, 10);
      }
      if (e.key === "campuscoin:session_logout") {
        performLogout("multi_tab_logout");
      }
    };
    window.addEventListener("storage", handleStorageChange);

    // Initial stamp
    setStoredLastActivity(Date.now());

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, recordActivity));
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [recordActivity, performLogout]);

  // Main session check interval (runs every 1 second)
  useEffect(() => {
    const interval = setInterval(() => {
      const token = localStorage.getItem("token");
      if (!token) {
        setShowWarning(false);
        return;
      }

      const now = Date.now();
      const lastActive = Math.max(lastActivityRef.current, getStoredLastActivity());
      const idleTime = now - lastActive;

      // Timeout expired -> Logout immediately
      if (idleTime >= INACTIVITY_TIMEOUT_MS) {
        performLogout("session_expired");
        return;
      }

      // Enter warning window (within last 60 seconds)
      const timeUntilTimeout = INACTIVITY_TIMEOUT_MS - idleTime;
      if (timeUntilTimeout <= WARNING_WINDOW_MS) {
        const remaining = Math.max(1, Math.ceil(timeUntilTimeout / 1000));
        setSecondsRemaining(remaining);
        setShowWarning(true);
      } else {
        if (showWarning) setShowWarning(false);
      }
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [showWarning, performLogout]);

  // When window gains focus or tab becomes visible again, check immediately
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        const token = localStorage.getItem("token");
        if (!token) return;
        const now = Date.now();
        const lastActive = Math.max(lastActivityRef.current, getStoredLastActivity());
        if (now - lastActive >= INACTIVITY_TIMEOUT_MS) {
          performLogout("session_expired");
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };
  }, [performLogout]);

  if (!showWarning) return null;

  return (
    <div className="session-warning-backdrop" role="dialog" aria-modal="true" aria-labelledby="session-warning-title">
      <div className="session-warning-modal">
        <div className="session-shield-badge">
          <ShieldAlert size={36} className="session-shield-icon" />
        </div>

        <h2 id="session-warning-title">Secure Session Expiring</h2>

        <p className="session-warning-message">
          For your financial security and privacy, sessions automatically close after a period of inactivity.
        </p>

        <div className="session-countdown-pill">
          <Clock size={18} className="countdown-clock" />
          <span>
            Auto logout in: <strong>{secondsRemaining}s</strong>
          </span>
        </div>

        <div className="session-warning-actions">
          <button
            type="button"
            className="session-extend-btn"
            onClick={keepSessionAlive}
            disabled={isExtending}
          >
            <CheckCircle2 size={16} />
            {isExtending ? "Extending..." : "Keep Session Alive"}
          </button>

          <button
            type="button"
            className="session-logout-btn"
            onClick={() => performLogout("user_initiated")}
          >
            <LogOut size={16} />
            Log Out Now
          </button>
        </div>

        <div className="session-security-footer">
          <span>🔒 256-bit Encrypted Banking Session</span>
        </div>
      </div>
    </div>
  );
}

