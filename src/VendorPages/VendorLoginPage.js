import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginVendorViaApi } from "../utils/vendorStorage";
import { isSuperAdminUsername, loginSuperAdmin } from "../utils/superAdminStore";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import IconButton from "@mui/material/IconButton";
const VendorLoginPage = () => {
  const navigate = useNavigate();

  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleBack = () => {
    const returnUserId = localStorage.getItem("vendorReturnUserId");
    const returnUserType =
      localStorage.getItem("vendorReturnUserType") || "customer";

    if (returnUserId) {
      navigate(`/profilePage/${returnUserType}/${returnUserId}`);
    } else {
      // No stored userId to go back to (e.g. someone opened
      // /vendor/login directly) — fall back to normal browser back.
      navigate(-1);
    }
  };

  const handleSubmit = async (event) => {
  event.preventDefault();

  setError("");

  if (!userName.trim() || !password.trim()) {
    setError("Please enter both username and password.");
    return;
  }

  const enteredUserName = userName.trim();
  const enteredPassword = password.trim();

  // Super admin shares this same login form — no separate login page.
  // Whatever username is typed decides where the form goes next.
  if (isSuperAdminUsername(enteredUserName)) {
    setIsSubmitting(true);
    const ok = loginSuperAdmin(enteredUserName, enteredPassword);
    setIsSubmitting(false);

    if (!ok) {
      setError("Invalid username or password.");
      return;
    }

    navigate("/superadmin/vendors");
    return;
  }

  setIsSubmitting(true);

  try {
    const vendor = await loginVendorViaApi(
      enteredUserName,
      enteredPassword
    );

    console.log("Vendor login response:", vendor);

    // API returned no vendor
    if (!vendor) {
      setError("Invalid username or password.");
      return;
    }

    // Make sure vendorId exists
    if (!vendor.vendorId) {
      console.error("vendorId is missing:", vendor);
      setError("Vendor ID not found.");
      return;
    }

    console.log("Login successful");
    console.log("Vendor ID:", vendor.vendorId);
    console.log("Vendor:", vendor);

    // Save vendorId
    localStorage.setItem(
      "vendorSession",
      vendor.vendorId
    );

    // Save complete API vendor response
    localStorage.setItem(
      "vendorProfile",
      JSON.stringify(vendor)
    );

    // Also save in vendorProfiles so getVendorProfileById()
    // can find the vendor
    const existingProfiles = JSON.parse(
      localStorage.getItem("vendorProfiles") || "[]"
    );

    const profile = {
      vendorId: vendor.vendorId,
      name: vendor.fullName,
      userName: vendor.userName,
      phone: vendor.mobileNumber,
      email: vendor.email || "",
      address: vendor.address || "",
      storeName: vendor.storeName,
      registrationCertificate:
        vendor.registrationCertificate || "",
      gst: vendor.gst || "",
      aadhaarCard: vendor.aadhaarCard || "",
    };

    const updatedProfiles = [
      ...existingProfiles.filter(
        (item) => item.vendorId !== vendor.vendorId
      ),
      profile,
    ];

    localStorage.setItem(
      "vendorProfiles",
      JSON.stringify(updatedProfiles)
    );

    console.log("Saved vendor profile:", profile);

    // Navigate using vendorId
    navigate(`/vendor/preview/${vendor.vendorId}`);
  } catch (err) {
    console.error("Vendor login error:", err);

    setError(
      "Unable to log in right now. Please try again."
    );
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <div className="h-100 mt-4 d-flex justify-content-center align-items-center">
      <div
        className="card p-4"
        style={{
          minWidth: 320,
          maxWidth: 520,
          width: "100%",
        }}
      >
        <IconButton
        onClick={handleBack}
        aria-label="back to profile"
        style={{
          color: "#000",
          position: "absolute",
          top: 16,
          left: 16,
          zIndex: 10,
          backgroundColor: "#fff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
        }}
      >
        <ArrowBackIcon />
      </IconButton>
        <h3 className="mb-3 text-center">Vendor Login</h3>

        <form onSubmit={handleSubmit}>
          {/* Username */}
          <div className="mb-3">
            <label className="form-label">
              Username
            </label>

            <input
              type="text"
              className="form-control"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter username"
              autoComplete="username"
              required
            />
          </div>

          {/* Password */}
          <div className="mb-3">
            <label className="form-label">
              Password
            </label>

            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              required
            />
          </div>

          {/* Error */}
          {error && (
            <div className="alert alert-danger">
              {error}
            </div>
          )}

          {/* Login */}
          <button
            type="submit"
            className="btn btn-primary w-100"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Logging in..."
              : "Login"}
          </button>
        </form>

        <div className="mt-3 text-center">
          <small>
            New vendor?{" "}
            <a href="/vendor/register">
              Register here
            </a>
          </small>
        </div>
      </div>
    </div>
  );
};

export default VendorLoginPage;