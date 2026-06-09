import { Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { token, user } = useContext(AuthContext);

  // If not authenticated, redirect to login
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // If role is restricted, verify user is in the authorized roles array
  if (allowedRoles) {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    const isAuthorized = roles.includes(user?.role);

    if (!isAuthorized) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}
