import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// Global Authentication State Management

// Define the shape of the authentication context
interface AuthContextType {
  isAuthenticated: boolean;
  setToken: (token: string) => void;
  getToken: () => string | null;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provide this context to React children
interface AuthProviderProps {
  children: React.ReactNode;
}

// Create an AuthProvider to wrap the components. This provider will supply authentication state and methods, storing the data centrally and making it easier to access
// Pass children as a prop
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const navigate = useNavigate();

  // On mount or when navigation changes, check if token exists and update auth state
  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
  }, [navigate]);

  // Save token to localStorage and update state to authenticated
  const setToken = (token: string) => {
    localStorage.setItem("token", token);
    setIsAuthenticated(true);
  };

  // Retrieve token from localStorage
  const getToken = (): string | null => {
    return localStorage.getItem("token");
  };

  // Remove token from localStorage, update state, and redirect to homepage
  const logout = () => {
    localStorage.removeItem("token");

    setIsAuthenticated(false);
    navigate("/");
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, setToken, getToken, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to consume AuthContext more easily in components
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
