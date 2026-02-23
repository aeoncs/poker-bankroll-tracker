import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  if (!user.onboardingCompleted && location.pathname !== "/setup") {
    return <Navigate to="/setup" replace />;
  }

  return children;
}