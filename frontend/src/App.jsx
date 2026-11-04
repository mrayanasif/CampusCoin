import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import ProtectedRoute from "./components/ProtectedRoute";
import SessionManager from "./components/SessionManager/SessionManager.jsx";

import DashboardLayout from "./layouts/DashboardLayout.jsx";
import AdminLayout from "./pages/admin/AdminLayout.jsx";

const Home = lazy(() => import("./pages/Home/Home.jsx"));
const Login = lazy(() => import("./pages/Auth/Login.jsx"));
const Register = lazy(() => import("./pages/Auth/Register.jsx"));
const ForgotPassword = lazy(() => import("./pages/Auth/ForgotPassword.jsx"));
const ResetPassword = lazy(() => import("./pages/Auth/ResetPassword.jsx"));
const Dashboard = lazy(() => import("./pages/Dashboard/Dashboard.jsx"));
const Transactions = lazy(() => import("./pages/Transactions/Transactions.jsx"));
const Budgets = lazy(() => import("./pages/Budgets/Budgets.jsx"));
const Reports = lazy(() => import("./pages/Reports/Reports.jsx"));
const Insights = lazy(() => import("./pages/Insights/Insights.jsx"));
const SavingTips = lazy(() => import("./pages/SavingTips/SavingTips.jsx"));
const Categories = lazy(() => import("./pages/Categories/Categories.jsx"));
const Notes = lazy(() => import("./pages/Notes/Notes.jsx"));
const Profile = lazy(() => import("./pages/Profile/Profile.jsx"));
const Notifications = lazy(() => import("./pages/Notifications/Notifications.jsx"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin/AdminLogin.jsx"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard/AdminDashboard.jsx"));
const Users = lazy(() => import("./pages/admin/Users/Users.jsx"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories/AdminCategories.jsx"));
const Templates = lazy(() => import("./pages/admin/Templates/Templates.jsx"));
const Statistics = lazy(() => import("./pages/admin/Statistics/Statistics.jsx"));
const Announcements = lazy(() => import("./pages/admin/Announcements/Announcements.jsx"));
const Settings = lazy(() => import("./pages/admin/Settings/Settings.jsx"));

import "./App.css";

function App() {
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
      <Suspense fallback={<div className="route-loading" role="status">Loading page…</div>}>
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
      </Suspense>

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
