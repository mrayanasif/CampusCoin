import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import ProtectedRoute from "./components/ProtectedRoute";
import SessionManager from "./components/SessionManager/SessionManager.jsx";

import Home from "./pages/Home/Home.jsx";
import Login from "./pages/Auth/Login.jsx";
import Register from "./pages/Auth/Register.jsx";
import ForgotPassword from "./pages/Auth/ForgotPassword.jsx";
import ResetPassword from "./pages/Auth/ResetPassword.jsx";
import DashboardLayout from "./layouts/DashboardLayout.jsx";
import Dashboard from "./pages/Dashboard/Dashboard.jsx";
import Transactions from "./pages/Transactions/Transactions.jsx";
import Budgets from "./pages/Budgets/Budgets.jsx";
import Reports from "./pages/Reports/Reports.jsx";
import Insights from "./pages/Insights/Insights.jsx";
import SavingTips from "./pages/SavingTips/SavingTips.jsx";
import Categories from "./pages/Categories/Categories.jsx";
import Notes from "./pages/Notes/Notes.jsx";
import Profile from "./pages/Profile/Profile.jsx";
import Notifications from "./pages/Notifications/Notifications.jsx";

import AdminLogin from "./pages/admin/AdminLogin/AdminLogin.jsx";
import AdminLayout from "./pages/admin/AdminLayout.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard/AdminDashboard.jsx";
import Users from "./pages/admin/Users/Users.jsx";
import AdminCategories from "./pages/admin/AdminCategories/AdminCategories.jsx";
import Templates from "./pages/admin/Templates/Templates.jsx";
import Statistics from "./pages/admin/Statistics/Statistics.jsx";
import Announcements from "./pages/admin/Announcements/Announcements.jsx";
import Settings from "./pages/admin/Settings/Settings.jsx";

import "./App.css";

function App() {
  // Restore accessibility preferences (dark mode / font size) on every reload.
  // Previously they were only applied while the Profile page was mounted, so a
  // page refresh silently dropped the student's saved accessibility settings.
  useEffect(() => {
    const prefs = JSON.parse(
      localStorage.getItem("student_preferences") || "{}"
    );

    const fontSize = prefs.fontSize || "normal";
    document.documentElement.style.fontSize =
      fontSize === "small" ? "14px" : fontSize === "large" ? "18px" : "16px";
    document.documentElement.dataset.fontSize = fontSize;

    document.documentElement.dataset.theme = prefs.darkMode ? "dark" : "light";

    const isAdminArea = window.location.pathname.startsWith("/admin");
    if (!isAdminArea && localStorage.getItem("token")) {
      document.body.classList.toggle("dark-mode", Boolean(prefs.darkMode));
    }
  }, []);

  return (
    <>
      <SessionManager />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/admin/login" element={<AdminLogin />} />

        <Route element={<ProtectedRoute role="student"><DashboardLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/saving-tips" element={<SavingTips />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/notifications" element={<Notifications />} />
        </Route>

        <Route element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<Users />} />
          <Route path="/admin/categories" element={<AdminCategories />} />
          <Route path="/admin/templates" element={<Templates />} />
          <Route path="/admin/statistics" element={<Statistics />} />
          <Route path="/admin/announcements" element={<Announcements />} />
          <Route path="/admin/settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { color: "#1f2937", background: "#ffffff", border: "1px solid #e5e7eb" },
          success: { iconTheme: { primary: "#16a34a", secondary: "#ffffff" } },
          error: { iconTheme: { primary: "#dc2626", secondary: "#ffffff" } },
        }}
      />
    </>
  );
}

export default App;
