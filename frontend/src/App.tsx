import { Routes, Route, Navigate } from "react-router-dom";
import { usePageTitle } from "./hooks/usePageTitle";
import Dashboard from "./pages/Dashboard";
import Details from "./pages/Details";
import NotFound from "./pages/NotFound";
import Main from "./pages/Main";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  usePageTitle("Web Crawler");

  return (
    <Routes>
      <Route path="/" element={<Main />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/details/:id"
        element={
          <ProtectedRoute>
            <Details />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/404" replace />} />
      <Route path="/404" element={<NotFound />} />
    </Routes>
  );
}

export default App;
