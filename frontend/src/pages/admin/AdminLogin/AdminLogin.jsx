import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

import API from "../../../api/axios";
import "./AdminLogin.css";

function AdminLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const form = new FormData(e.currentTarget);
    const email = form.get("email")?.trim();
    const password = form.get("password")?.trim();

    if (!email || !password) {
      toast.error("Email and password are required");
      return;
    }

    try {
      setLoading(true);
      const response = await API.post("/auth/login", { email, password });
      const { token, user } = response.data;

      if (user.role !== "admin") {
        toast.error("Access denied. Admin only.");
        return;
      }

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      toast.success("Welcome, Admin!");
      navigate("/admin/dashboard");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-box">
        <div className="admin-login-header">
          <ShieldCheck size={40} />
          <h2>Admin Login</h2>
          <p>Campus Coin Control Panel</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="admin-field">
            <label>Email</label>
            <input
              type="email"
              name="email"
              placeholder="admin@campuscoin.com"
              required
            />
          </div>

          <div className="admin-field">
            <label>Password</label>
            <input
              type="password"
              name="password"
              placeholder="Enter password"
              required
            />
          </div>

          <button type="submit" className="admin-login-btn" disabled={loading}>
            {loading ? "Logging in..." : "Login as Admin"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdminLogin;