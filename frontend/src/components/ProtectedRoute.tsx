import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type React from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { getToken } = useAuth();

  return getToken() ? children : <Navigate to="/" />;
};

export default ProtectedRoute;
