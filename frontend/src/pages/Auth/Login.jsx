import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, ArrowRight, ShieldCheck, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";

import Navbar from "../../components/Navbar/Navbar";
import { useCurrency } from "../../context/CurrencyContext";
import API from "../../api/axios";
import "./Auth.css";

function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isSessionExpired = searchParams.get("reason") === "session_expired";
  const isMultiTabLogout = searchParams.get("reason") === "multi_tab_logout";
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { currency, toggleCurrency } = useCurrency();
  const [theme, setTheme] = useState(() => {
    const preferences = JSON.parse(localStorage.getItem("student_preferences") || "{}");
    return preferences.darkMode ? "dark" : "light";
  });

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    document.body.classList.toggle("dark-mode", nextTheme === "dark");
    const preferences = JSON.parse(localStorage.getItem("student_preferences") || "{}");
    localStorage.setItem("student_preferences", JSON.stringify({ ...preferences, darkMode: nextTheme === "dark" }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    const form = new FormData(event.currentTarget);
    const email = form.get("email")?.trim();
    const password = form.get("password")?.trim();

    if (!email) return toast.error("Please enter your email");

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email))
      return toast.error("Please enter a valid email");

    if (!password) return toast.error("Please enter your password");

    try {
      setLoading(true);
      const response = await API.post("/auth/login", { email, password });
      const { token, user } = response.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      window.dispatchEvent(new Event("campuscoin:auth-changed"));

      toast.success(`Welcome back, ${user.name}!`);

      setTimeout(() => {
        if (user.role === "admin") {
          navigate("/admin/dashboard");
        } else {
          navigate("/dashboard");
        }
      }, 500);
    } catch (error) {
      const message =
        error.response?.data?.message || "Login failed. Please try again.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar currency={currency} onToggleCurrency={toggleCurrency} theme={theme} onToggleTheme={toggleTheme} />

      <main className="lux-auth">
        <div className="lux-auth-grid">
          <section className="lux-auth-side">
            <div className="lux-auth-blob"></div>
            <div className="lux-auth-sphere-1"></div>
            <div className="lux-auth-sphere-2"></div>

            <div className="lux-auth-side-content">
              <span className="lux-auth-tag">
                <ShieldCheck size={14} />
                SECURE LOGIN
              </span>

              <h1 className="lux-auth-title">
                WELCOME
                <br />
                <span>BACK</span>
              </h1>

              <p className="lux-auth-text">
                Log in to track your spending, manage budgets, and get
                personalized saving tips — all in one place.
              </p>

              <div className="lux-auth-points">
                <div className="lux-auth-point">
                  <span>01</span>
                  <strong>Track every rupee</strong>
                </div>
                <div className="lux-auth-point">
                  <span>02</span>
                  <strong>Visualize your trends</strong>
                </div>
                <div className="lux-auth-point">
                  <span>03</span>
                  <strong>Reach your goals</strong>
                </div>
              </div>
            </div>

            <div className="lux-auth-side-foot">
              Your goals. Your money. Your future.
            </div>
          </section>

          <section className="lux-auth-form-side">
            <div className="lux-auth-card">
              {(isSessionExpired || isMultiTabLogout) && (
                <div className="bank-session-alert-banner">
                  <ShieldAlert size={22} className="bank-session-alert-icon" />
                  <div>
                    <strong>Secure Session Ended</strong>
                    <p>
                      {isSessionExpired
                        ? "Your banking session automatically timed out due to inactivity to protect your financial details."
                        : "You were signed out from another browser tab or device."}
                    </p>
                  </div>
                </div>
              )}

              <div className="lux-auth-card-head">
                <h2>Login</h2>
                <p>Enter your credentials to continue</p>
              </div>

              <form onSubmit={handleSubmit} noValidate>
                <div className="lux-field">
                  <label htmlFor="email">EMAIL ADDRESS</label>
                  <div className="lux-input-wrap">
                    <Mail size={16} className="lux-input-icon" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="lux-field">
                  <div className="lux-label-row">
                    <label htmlFor="password">PASSWORD</label>
                    <Link to="/forgot-password" className="lux-link-small">
                      Forgot?
                    </Link>
                  </div>
                  <div className="lux-input-wrap">
                    <Lock size={16} className="lux-input-icon" />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      className="lux-input-toggle"
                      onClick={() => setShowPassword((c) => !c)}
                      aria-label="Show or hide password"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <label className="lux-checkbox">
                  <input type="checkbox" />
                  <span>Remember me</span>
                </label>

                <button
                  type="submit"
                  className="lux-submit-btn"
                  disabled={loading}
                >
                  {loading ? "LOGGING IN..." : "LOGIN"}
                  {!loading && <ArrowRight size={16} />}
                </button>
              </form>

              <p className="lux-auth-bottom">
                Don&apos;t have an account?{" "}
                <Link to="/register">Create one</Link>
              </p>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

export default Login;
