import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, role }) {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  if (!token) {
    return role === "admin" ? <Navigate to="/admin/login" replace /> : <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    return user.role === "admin" ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;