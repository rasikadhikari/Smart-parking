// src/routes/PrivateRoute.jsx
import { Navigate, Outlet } from "react-router-dom";

// Define roles as constants for consistency
const ROLES = {
  USER: "user",
  ADMIN: "admin",
  SUPERADMIN: "superadmin",
};

const PrivateRoute = ({ user, allowedRoles }) => {
  // Redirect to login if user is not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to dashboard if user role is not allowed
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Render nested routes
  return <Outlet />;
};

export default PrivateRoute;