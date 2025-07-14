// A protected route was created for routes that only users with a valid token—i.e., logged-in users—can access
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type React from "react";

// ProtectedRoute type definition
interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Only authenticated users can access the children components wrapped by this component
// for example:
// <ProtectedRoute>
//   <Dashboard /> => children
// </ProtectedRoute>
// Here, the Dashboard is visible only to logged-in users; otherwise, they are redirected to the / page
const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  // The getToken function is imported from useAuth and returns the value of localStorage.getItem("token")
  const { getToken } = useAuth();

  // If the token exists (is valid), show the children components; otherwise, redirect to the '/' route
  return getToken() ? children : <Navigate to="/" />;
};

export default ProtectedRoute;
