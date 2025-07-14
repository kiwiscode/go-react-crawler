import { Routes, Route, Navigate } from "react-router-dom";
import { usePageTitle } from "./hooks/usePageTitle";
import Dashboard from "./pages/Dashboard";
import Details from "./pages/Details";
import NotFound from "./pages/NotFound";
import Main from "./pages/Main";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  // Automatically set the page title on dashboard or details page using usePageTitle
  usePageTitle("Web Crawler");

  return (
    // Create routes with React Router DOM using Routes and Route components
    <Routes>
      <Route path="/" element={<Main />} />
      <Route
        path="/dashboard"
        element={
          // Protect dashboard page with a ProtectedRoute component that only allows access to active authenticated users
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        // Set the details page path with ':id' as a param to use useParams
        path="/details/:id"
        element={
          // Protect details page with a ProtectedRoute component that only allows access to active authenticated users
          <ProtectedRoute>
            <Details />
          </ProtectedRoute>
        }
      />
      {/* If a not found route is accessed, redirect it directly to the /404 route */}
      <Route path="*" element={<Navigate to="/404" replace />} />
      {/* Show customized not found page */}
      <Route path="/404" element={<NotFound />} />
    </Routes>
  );
}

export default App;
