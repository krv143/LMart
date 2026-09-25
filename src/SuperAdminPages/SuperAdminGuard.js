import React from "react";
import { Navigate } from "react-router-dom";
import { isSuperAdminAuthenticated } from "../utils/superAdminStore";

const SuperAdminGuard = ({ children }) => {
  if (!isSuperAdminAuthenticated()) {
    // Super admin shares VendorLoginPage's form (routed there by
    // username), so there's no separate /superadmin/login screen.
    return <Navigate to="/vendor/login" replace />;
  }
  return children;
};

export default SuperAdminGuard;
