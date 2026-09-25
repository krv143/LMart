
import React, { useEffect, useRef, useState } from "react";
import HandyManCharacter from "../img/hm_char.png";
import HandyManLogo from "../img/Hm_Logo 1.png";
import { useLocation, useNavigate } from "react-router-dom";
import { setLoginData } from "../utils/auth";
import axios from "axios";

const OTPVerificationPage = () => {
  const Navigate = useNavigate();
  const { state = {} } = useLocation();
  const loginMeta = (() => {
    try {
      return JSON.parse(localStorage.getItem("loginMeta") || "null") || {};
    } catch {
      return {};
    }
  })();

  const [isLoading, setIsLoading] = useState(false);

  const mobile =
    state.mobile ?? loginMeta.mobile ?? localStorage.getItem("mobile") ?? "";

  const districtIdRaw =
    state.districtId ??
    loginMeta.districtId ??
    (localStorage.getItem("districtId")
      ? Number(localStorage.getItem("districtId"))
      : null);

  const districtId =
    typeof districtIdRaw === "number"
      ? districtIdRaw
      : districtIdRaw
        ? Number(districtIdRaw)
        : null;

  const districtName =
    state.districtName ??
    loginMeta.districtName ??
    localStorage.getItem("districtName") ??
    "";

  const pinCode =
    state.pinCode ?? loginMeta.pinCode ?? localStorage.getItem("pinCode") ?? "";
  const [otp, setOtp] = useState(Array(6).fill(""));
  const [timeLeft, setTimeLeft] = useState(90);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState("");
  const inputsRef = useRef([]);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    console.log(userId);
  }, [userId]);

  useEffect(() => {
    setTimeLeft(90);
  }, []);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev === 1) setCanResend(true);
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft]);

  const handleChange = (value, index) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < otp.length - 1) {
      inputsRef.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleResendOTP = async (e) => {
    e.preventDefault();
    if (!canResend) return;
    const payload1 = {
      SenderValue: mobile,
      type: "sms",
    };

    try {
      setOtp(Array(6).fill(""));
      setTimeLeft(90);
      setCanResend(false);

      const response = await fetch(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/Auth/bhashsmssendotp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload1),
        },
      );
      if (!response.ok) {
        throw new Error("Failed to resend otp.");
      }
    } catch (error) {
      console.error("Error resend otp:", error);
    }
  };

  // Decides where to send the user based on whether they have a real
  // address AND a completed profile (not just the "Guest" placeholder
  // created during guest onboarding).
  const checkAddressAndNavigate = async (userId, profileType = "customer") => {
    try {
      const response = await axios.get(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/Address/GetAddressById/${userId}`,
      );
      const data = Array.isArray(response.data)
        ? response.data[0]
        : response.data;

      const hasAddress = Boolean(
        data && data.address && data.state && data.district && data.zipCode,
      );

      const isGuestProfile = data?.firstName?.trim().toLowerCase() === "guest";

      // Prefer the profileType coming back from the API; fall back to
      // whatever was passed in (the API returned null in testing).
      const resolvedProfileType = data?.profileType || profileType;

      if (hasAddress && !isGuestProfile) {
        Navigate(`/profilePage/${resolvedProfileType}/${userId}`);
      } else {
        Navigate(`/addressPage/${resolvedProfileType}/${userId}`);
      }
    } catch (error) {
      console.error("Error fetching address:", error);
    }
  };

  const handleGuestAddress = async (e) => {
    e.preventDefault();

    const payload1 = {
      UserId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      id: "string",
      date: "string",
      UserName: "",
      UserPassword: "",
      MobileNo: mobile,
      EmailId: "",
      IsMobileNumberValidate: true,
      IsEmailValidate: false,
      ProfileType: "customer",
    };

    try {
      const response1 = await fetch(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/UserOnBoarding/GuestUserUpload`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload1),
        },
      );

      if (!response1.ok) {
        throw new Error("Failed to Upload User Data.");
      }

      const userData = await response1.json();
      console.log("User Response:", userData);
      const newUserId = userData.userId;
      setUserId(newUserId);
      setLoginData(newUserId);

      const payload2 = {
        CustomerId: "string",
        id: "string",
        date: "string",
        FirstName: "Guest",
        LastName: "",
        MobileNumber: mobile,
        MobileVerificationCode: otp.join(""),
        EmailAddress: "",
        EmailVerificationCode: "",
        AlternativeMobileNumber: "",
        GSTNumber: "",
        Address: "",
        Landmark: "",
        State: "",
        StateId: "",
        District: districtName || "",
        DistrictId: districtId ? districtId.toString() : "",
        ZipCode: pinCode || "",
        CustomerPhotoId: "",
        UserId: newUserId,
        IsApproved: true,
        Status: "Open",
        WalletAmount: "0",
      };

      const response2 = await fetch(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/Customer/GuestCustomerUpload`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload2),
        },
      );

      if (!response2.ok) {
        const errorText = await response2.text();
        console.log("Customer Upload Error:", errorText);

        throw new Error("Failed to Upload Customer Data.");
      }

      console.log("Customer Upload Success");

      // Let checkAddressAndNavigate decide the destination (guest never
      // has a real address yet, so this will send them to addressPage).
      await checkAddressAndNavigate(newUserId, "customer");
    } catch (error) {
      console.error("Registration Error:", error);
      window.alert("Failed to Registration. Please try again later.");
    }
  };

  const handleOTPVerification = async (e) => {
    e.preventDefault();

    if (isLoading) return;

    const enteredOtp = otp.join("");

    if (enteredOtp.length < 6) {
      setError("OTP is Required.");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      // STEP 1 — Validate OTP
      const payload = {
        SenderValue: mobile,
        Otp: enteredOtp,
      };

      const otpResponse = await fetch(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/Auth/validateotp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!otpResponse.ok) {
        const errText = await otpResponse.text();
        throw new Error(`OTP validation failed: ${errText}`);
      }

      // STEP 2 — Check if user exists
      const verifyUserRes = await fetch(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/UserOnBoarding/GuestUserVerificationByMobileNo?mobileNo=${mobile}`,
      );

      if (verifyUserRes.status === 200) {
        const userData = await verifyUserRes.json();

        if (userData?.profileType && userData?.userId) {
          setLoginData(userData.userId);
          // checkAddressAndNavigate is the single source of truth for
          // where the user lands — no extra Navigate call after this.
          await checkAddressAndNavigate(userData.userId, userData.profileType);
        } else {
          throw new Error("User data missing required fields.");
        }
      } else if (verifyUserRes.status === 204 || verifyUserRes.status === 404) {
        // User not found → create guest user
        await handleGuestAddress(e);
      } else {
        const errText = await verifyUserRes.text();
        throw new Error(`User verification failed: ${errText}`);
      }
    } catch (error) {
      console.error("Full Error:", error);
      window.alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (inputsRef.current[0]) {
      inputsRef.current[0].focus();
    }
  }, []);

  return (
    <div className="h-90  mt-2 d-flex align-items-center py-2 flex-column">
      <div className="login_section">
        <div className="d-flex flex-column align-items-center justify-content-center">
          <img
            src={HandyManCharacter}
            alt="Character"
            width="200"
            height="200"
            className="img-fluid mb-3"
          />

          <div className="rgt_cnt" id="MobileVerify">
            <img
              src={HandyManLogo}
              alt="Logo"
              width="190"
              height="90"
              className="img-fluid"
            />
          </div>

          <h4 className=" fs-5">Enter Verification Code</h4>
          <div id="test" className="test"></div>
          <div className="otp_input" id="otp_input">
            {otp.map((digit, i) => (
              <input
                key={i}
                type="text"
                inputMode="numeric"
                pattern="\d*"
                maxLength="1"
                value={digit}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^\d?$/.test(value)) {
                    handleChange(value, i);
                  }
                }}
                onKeyDown={(e) => handleKeyDown(e, i)}
                ref={(el) => (inputsRef.current[i] = el)}
              />
            ))}
          </div>

          {error && <div className="text-danger">{error}</div>}
          <div id="liveAlertPlaceholder"></div>
          <div style={{ fontSize: "14px" }}>
            Didn't receive OTP?{" "}
            <button
              id="resendBtn"
              onClick={handleResendOTP}
              disabled={!canResend}
              className={`link ${!canResend ? "disableClick" : ""}`}
              style={{
                background: "none",
                border: "none",
                color: "#007bff",
                textDecoration: "underline",
                cursor: canResend ? "pointer" : "not-allowed",
                padding: 0,
                fontSize: "14px",
              }}
            >
              Resend
            </button>
          </div>

          <div style={{ fontSize: "14px" }}>
            Incorrect Mobile Number?{" "}
            <a class="link" asp-area="" href="/">
              Change
            </a>
          </div>

          <button
            className="btn btn-dark text-center"
            style={{ fontSize: "14px" }}
            type="submit"
            onClick={handleOTPVerification}
            disabled={isLoading}
          >
            {isLoading ? "Verifying..." : "Submit"}
          </button>

          <div
            className="timer"
            style={{ color: "red", fontWeight: "bold", marginTop: "5px" }}
          >
            {timeLeft > 0
              ? `Time Left: ${timeLeft} seconds`
              : "You can resend the OTP now."}
          </div>
        </div>
      </div>
    </div>
  );
};
export default OTPVerificationPage;
