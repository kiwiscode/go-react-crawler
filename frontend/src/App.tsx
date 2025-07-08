import { Routes, Route, Navigate } from "react-router-dom";
import { usePageTitle } from "./hooks/usePageTitle";
import Dashboard from "./pages/Dashboard";
import Details from "./pages/Details";
import NotFound from "./pages/NotFound";

function App() {
  usePageTitle("Web Crawler");

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/details/:id" element={<Details />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
      <Route path="/404" element={<NotFound />} />
    </Routes>
  );
}

export default App;
