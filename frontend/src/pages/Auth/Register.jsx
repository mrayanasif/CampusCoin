import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  GraduationCap,
  Wallet,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";

import Navbar from "../../components/Navbar/Navbar";
import API from "../../api/axios";
import "./Auth.css";

function Register() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState(() => localStorage.getItem("currency") || "PKR");
  const [theme, setTheme] = useState(() => {
    const preferences = JSON.parse(localStorage.getItem("student_preferences") || "{}");
    return preferences.darkMode ? "dark" : "light";
  });

  const toggleCurrency = () => {
    setCurrency((current) => {
      const next = current === "PKR" ? "USD" : "PKR";
      localStorage.setItem("currency", next);
      return next;
    });
  };

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

    const name = form.get("name")?.trim();
    const email = form.get("email")?.trim();
    const academicYear = form.get("academicYear");
    const allowance = form.get("allowance");
    const password = form.get("password") || "";
    const confirmPassword = form.get("confirmPassword") || "";
    const terms = form.get("terms");

    if (!name) return toast.error("Please enter your full name");
    if (!email) return toast.error("Please enter your email");

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email))
      return toast.error("Please enter a valid email");

    if (!academicYear) return toast.error("Please select your academic year");

    if (allowance === "") return toast.error("Please enter your monthly allowance");
    if (Number(allowance) < 0)
      return toast.error("Allowance cannot be negative");

    if (!password) return toast.error("Please create a password");
    if (password.length < 8)
      return toast.error("Password must be at least 8 characters");
    if (/[_\-,]/.test(password))
      return toast.error("Password cannot contain underscore, hyphen, or comma");
    if (!confirmPassword) return toast.error("Please confirm your password");
    if (password !== confirmPassword)
      return toast.error("Passwords do not match");
    if (!terms)
      return toast.error("Please agree to the terms and privacy policy");

    try {
      setLoading(true);

      const academicYearMap = {
        "1": "1st Year",
        "2": "2nd Year",
        "3": "3rd Year",
        "4": "4th Year",
        other: "Other",
      };

      await API.post("/auth/register", {
        name,
        email,
        password,
        academicYear: academicYearMap[academicYear] || academicYear,
        monthlyAllowance: Number(allowance) || 0,
        savingsGoal: 0,
      });

      toast.success("Account created! Please login to continue.");

      setTimeout(() => {
        navigate("/login");
      }, 800);
    } catch (error) {
      const message =
        error.response?.data?.message ||
        "Registration failed. Please try again.";
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
                <CheckCircle2 size={14} />
                FREE FOREVER
              </span>

              <h1 className="lux-auth-title">
                START
                <br />
                <span>TODAY</span>
              </h1>

              <p className="lux-auth-text">
                Create your free account and take control of your campus
                finances in minutes. No bank account required.
              </p>

              <div className="lux-auth-points">
                <div className="lux-auth-point">
                  <span>01</span>
                  <strong>Track income and expenses</strong>
                </div>
                <div className="lux-auth-point">
                  <span>02</span>
                  <strong>Set monthly budgets</strong>
                </div>
                <div className="lux-auth-point">
                  <span>03</span>
                  <strong>Get personalized saving tips</strong>
                </div>
                <div className="lux-auth-point">
                  <span>04</span>
                  <strong>AI-powered categorization</strong>
                </div>
              </div>
            </div>

            <div className="lux-auth-side-foot">
              Smart Spending, Student Style.
            </div>
          </section>

          <section className="lux-auth-form-side">
            <div className="lux-auth-card lux-auth-card-wide">
              <div className="lux-auth-card-head">
                <h2>Create Account</h2>
                <p>Join Campus Coin and start managing your money</p>
              </div>

              <form onSubmit={handleSubmit} noValidate>
                <div className="lux-field">
                  <label htmlFor="name">FULL NAME</label>
                  <div className="lux-input-wrap">
                    <User size={16} className="lux-input-icon" />
                    <input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                </div>

                <div className="lux-field">
                  <label htmlFor="register-email">EMAIL ADDRESS</label>
                  <div className="lux-input-wrap">
                    <Mail size={16} className="lux-input-icon" />
                    <input
                      id="register-email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="lux-form-row">
                  <div className="lux-field">
                    <label htmlFor="academic-year">ACADEMIC YEAR</label>
                    <div className="lux-input-wrap">
                      <GraduationCap size={16} className="lux-input-icon" />
                      <select
                        id="academic-year"
                        name="academicYear"
                        defaultValue=""
                        required
                      >
                        <option value="" disabled>
                          Select year
                        </option>
                        <option value="1">1st Year</option>
                        <option value="2">2nd Year</option>
                        <option value="3">3rd Year</option>
                        <option value="4">4th Year</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="lux-field">
                    <label htmlFor="allowance">MONTHLY ALLOWANCE</label>
                    <div className="lux-input-wrap">
                      <Wallet size={16} className="lux-input-icon" />
                      <input
                        id="allowance"
                        name="allowance"
                        type="number"
                        min="0"
                        placeholder={currency === "PKR" ? "₨ 0" : "$ 0"}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="lux-field">
                  <label htmlFor="register-password">PASSWORD</label>
                  <div className="lux-input-wrap">
                    <Lock size={16} className="lux-input-icon" />
                    <input
                      id="register-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 8 characters"
                      required
                      minLength={8}
                      pattern="[^_,-]{8,}"
                      title="At least 8 characters; no underscore, hyphen, or comma"
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

                <div className="lux-field">
                  <label htmlFor="confirm-password">CONFIRM PASSWORD</label>
                  <div className="lux-input-wrap">
                    <Lock size={16} className="lux-input-icon" />
                    <input
                      id="confirm-password"
                      name="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Re-enter your password"
                      required
                      minLength={8}
                      pattern="[^_,-]{8,}"
                      title="At least 8 characters; no underscore, hyphen, or comma"
                    />
                  </div>
                </div>

                <label className="lux-checkbox">
                  <input type="checkbox" name="terms" required />
                  <span>I agree to the terms and privacy policy</span>
                </label>

                <button
                  type="submit"
                  className="lux-submit-btn"
                  disabled={loading}
                >
                  {loading ? "CREATING..." : "CREATE ACCOUNT"}
                  {!loading && <ArrowRight size={16} />}
                </button>
              </form>

              <p className="lux-auth-bottom">
                Already have an account? <Link to="/login">Login</Link>
              </p>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

export default Register;
