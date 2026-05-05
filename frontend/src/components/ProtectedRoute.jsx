import { Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export default function ProtectedRoute({ children, allowedRole }) {
  const { token, user } = useContext(AuthContext);

  if (!token) {
    return <Navigate to="/" />;
  }

  if (allowedRole && user?.role !== allowedRole) {
    return <Navigate to={user?.role === 'faculty' ? '/faculty-dashboard' : '/dashboard'} />;
  }

  return children;
}
