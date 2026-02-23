import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import AppLayout from "./components/AppLayout";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

import SetupPage from "./pages/SetupPage";
import DashboardPage from "./pages/DashboardPage";
import SessionsPage from "./pages/SessionsPage";
import NewSessionPage from "./pages/NewSessionPage";
import EditSessionPage from "./pages/EditSessionPage";
import SettingsPage from "./pages/SettingsPage";
import SessionDetailsPage from "./pages/SessionDetailsPage";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />

        {/* Setup gets a minimal navbar (no nav links / no bottom nav) */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout variant="setup" />
            </ProtectedRoute>
          }
        >
          <Route path="/setup" element={<SetupPage />} />
        </Route>

        {/* Main app layout with full navigation */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />

          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/sessions/new" element={<NewSessionPage />} />
          <Route path="/sessions/:id/edit" element={<EditSessionPage />} />

          {/* optional: keep old URLs working */}
          <Route path="/entries" element={<Navigate to="/sessions" replace />} />
          <Route path="/entries/new" element={<Navigate to="/sessions/new" replace />} />
          <Route path="/entries/:id/edit" element={<Navigate to="/sessions/:id/edit" replace />} />

          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/sessions/:id" element={<SessionDetailsPage />} />
        </Route>

        <Route path="*" element={<div>The page you were looking for could not be found.</div>} />
      </Routes>
    </BrowserRouter>
  );
}