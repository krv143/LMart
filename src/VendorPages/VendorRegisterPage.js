import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const MAX_FILE_SIZE_MB = 5;

const ZIP_CODE_REGEX = /^[1-9][0-9]{5}$/;

const MAX_IMAGE_WIDTH = 1200;
const MAX_IMAGE_HEIGHT = 1200;
const IMAGE_QUALITY = 0.65;

const compressImageToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (
          width > MAX_IMAGE_WIDTH ||
          height > MAX_IMAGE_HEIGHT
        ) {
          const widthRatio = MAX_IMAGE_WIDTH / width;
          const heightRatio = MAX_IMAGE_HEIGHT / height;

          const ratio = Math.min(
            widthRatio,
            heightRatio
          );

          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Could not process image."));
          return;
        }

        ctx.drawImage(
          img,
          0,
          0,
          width,
          height
        );

        // Convert to JPEG and compress
        const compressedDataUrl =
          canvas.toDataURL(
            "image/jpeg",
            IMAGE_QUALITY
          );

        // Remove data:image/jpeg;base64,
        const base64 =
          compressedDataUrl.split(",")[1];

        resolve(base64);
      };

      img.onerror = () => {
        reject(
          new Error("Could not load image.")
        );
      };

      img.src = event.target.result;
    };

    reader.onerror = () => {
      reject(
        new Error("Could not read image.")
      );
    };

    reader.readAsDataURL(file);
  });
};

// ------------------------------------------------------------
// Document Upload Component
// ------------------------------------------------------------
const DocumentUpload = ({
  label,
  hint,
  file,
  preview,
  onChange,
  onRemove,
  inputRef,
}) => (
  <div className="vr-upload">
    <label className="vr-upload-label">
      {label}
    </label>

    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      className="vr-upload-input"
      onChange={onChange}
    />

    {!file ? (
      <div
        className="vr-upload-box"
        onClick={() =>
          inputRef.current?.click()
        }
      >
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <path
            d="M12 16V4M12 4l-4 4M12 4l4 4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <span className="vr-upload-title">
          Upload {label}
        </span>

        <span className="vr-upload-hint">
          {hint}
        </span>
      </div>
    ) : (
      <div className="vr-upload-box vr-upload-filled">
        <img
          src={preview}
          alt={label}
          className="vr-upload-thumb"
        />

        <div className="vr-upload-meta">
          <span className="vr-upload-check">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
            >
              <path
                d="M5 13l4 4L19 7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            Attached
          </span>

          <span className="vr-upload-filename">
            {file.name}
          </span>

          <div className="vr-upload-actions">
            <button
              type="button"
              className="vr-link"
              onClick={() =>
                inputRef.current?.click()
              }
            >
              Replace
            </button>

            <button
              type="button"
              className="vr-link vr-link-danger"
              onClick={onRemove}
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);

// ============================================================
// Vendor Register Page
// ============================================================
const VendorRegisterPage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    storeName: "",
    address: "",
    mobileNumber: "",
    userName: "",
    password: "",
    confirmPassword: "",
    registrationCertificate: "",
    state: "",
    stateId: "",
    district: "",
    districtId: "",
    zipCode: "",
  });

  const [userId, setUserId] = useState("");

  // Actual selected files
  const [aadharFile, setAadharFile] =
    useState(null);

  const [aadharPreview, setAadharPreview] =
    useState(null);

  const [gstFile, setGstFile] =
    useState(null);

  const [gstPreview, setGstPreview] =
    useState(null);

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirm, setShowConfirm] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");
           
  const [error, setError] =
    useState("");

  const aadharInputRef =
    useRef(null);

  const gstInputRef =
    useRef(null);

  const [stateList, setStateList] =
    useState([]);

  const [districtList, setDistrictList] =
    useState([]);

  const [statesLoading, setStatesLoading] =
    useState(false);

  const [districtsLoading, setDistrictsLoading] =
    useState(false);

  const [pincodeList, setPincodeList] =
    useState([]);

  const [pincodesLoading, setPincodesLoading] =
    useState(false);

  // ============================================================
  // Load saved mobile number
  // ============================================================
  useEffect(() => {
    const savedMobileNumber =
      localStorage.getItem(
        "vendorRegistrationMobileNumber"
      );

    if (savedMobileNumber) {
      setFormData((prev) => ({
        ...prev,
        mobileNumber:
          savedMobileNumber,
      }));
    }
  }, []);

  // ============================================================
  // Load saved user ID
  // ============================================================
  useEffect(() => {
    const savedUserId =
      localStorage.getItem(
        "vendorRegistrationUserId"
      );

    if (savedUserId) {
      setUserId(savedUserId);

      console.log(
        "Vendor registration userId loaded:",
        savedUserId
      );
    }
  }, []);

  // ============================================================
  // Load States
  // ============================================================
  useEffect(() => {
    setStatesLoading(true);

    axios
      .get(
        "https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/MasterData/getStates"
      )
      .then((response) => {
        setStateList(response.data);
      })
      .catch((error) => {
        console.error(
          "Error fetching states:",
          error
        );

        setError(
          "Could not load states. Please refresh and try again."
        );
      })
      .finally(() => {
        setStatesLoading(false);
      });
  }, []);

  // ============================================================
  // Load Districts using State ID
  // ============================================================
  useEffect(() => {
    if (!formData.stateId) {
      setDistrictList([]);
      return;
    }

    setDistrictsLoading(true);
    setDistrictList([]);

    axios
      .get(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/MasterData/getDistricts/${formData.stateId}`
      )
      .then((response) => {
        setDistrictList(response.data);
      })
      .catch((error) => {
        console.error(
          "Error fetching districts:",
          error
        );

        setError(
          "Could not load districts. Please try again."
        );

        setDistrictList([]);
      })
      .finally(() => {
        setDistrictsLoading(false);
      });
  }, [formData.stateId]);

  // ============================================================
  // Load Pincodes using District ID
  // ============================================================
  useEffect(() => {
    if (!formData.districtId) {
      setPincodeList([]);
      setPincodesLoading(false);
      return;
    }

    setPincodesLoading(true);
    setPincodeList([]);

    axios
      .get(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/MasterData/getPincodes/${formData.districtId}`
      )
      .then((response) => {
        setPincodeList(response.data);
      })
      .catch((error) => {
        console.error(
          "Error fetching pincodes:",
          error
        );

        setError(
          "Could not load pincodes. Please try again."
        );

        setPincodeList([]);
      })
      .finally(() => {
        setPincodesLoading(false);
      });
  }, [formData.districtId]);

  // ============================================================
  // Generic input change
  // ============================================================
  const handleChange = (field) => (e) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  // ============================================================
  // State Change
  // ============================================================
  const handleStateChange = (e) => {
    const selectedStateId =
      String(e.target.value);

    const selectedState =
      stateList.find(
        (s) =>
          String(s.StateId) ===
          selectedStateId
      );

    setFormData((prev) => ({
      ...prev,

      stateId: selectedStateId,

      state: selectedState
        ? selectedState.StateName
        : "",

      // Reset district
      districtId: "",
      district: "",

      // Reset pincode
      zipCode: "",
    }));

    setDistrictList([]);
    setPincodeList([]);
  };

  // ============================================================
  // District Change
  // ============================================================
  const handleDistrictChange = (e) => {
    const selectedDistrictId =
      String(e.target.value);

    const selectedDistrict =
      districtList.find(
        (d) =>
          String(d.districtId) ===
          selectedDistrictId
      );

    setFormData((prev) => ({
      ...prev,

      districtId:
        selectedDistrictId,

      district: selectedDistrict
        ? selectedDistrict.districtName
        : "",

      // Reset pincode
      zipCode: "",
    }));

    setPincodeList([]);
  };

  // ============================================================
  // Pincode Radio Change
  // ============================================================
  const handlePincodeChange = (e) => {
    const selectedPincode =
      String(e.target.value);

    setFormData((prev) => ({
      ...prev,
      zipCode:
        selectedPincode,
    }));
  };

  // ============================================================
  // File Selection
  // ============================================================
  const handleFileSelect = (e, kind) => {
    setError("");

    const file =
      e.target.files?.[0];

    if (!file) {
      return;
    }

    // Check image
    if (!file.type.startsWith("image/")) {
      setError(
        "Only image files (JPG, PNG, etc.) are accepted for documents."
      );

      e.target.value = "";
      return;
    }

    // Check original file size
    if (
      file.size >
      MAX_FILE_SIZE_MB *
        1024 *
        1024
    ) {
      setError(
        `File is too large. Please upload an image under ${MAX_FILE_SIZE_MB}MB.`
      );

      e.target.value = "";
      return;
    }

    const previewUrl =
      URL.createObjectURL(file);

    if (kind === "aadhar") {
      if (aadharPreview) {
        URL.revokeObjectURL(
          aadharPreview
        );
      }

      setAadharFile(file);
      setAadharPreview(
        previewUrl
      );
    }

    if (kind === "gst") {
      if (gstPreview) {
        URL.revokeObjectURL(
          gstPreview
        );
      }

      setGstFile(file);
      setGstPreview(
        previewUrl
      );
    }
  };

  // ============================================================
  // Remove File
  // ============================================================
  const removeFile = (kind) => {
    if (kind === "aadhar") {
      if (aadharPreview) {
        URL.revokeObjectURL(
          aadharPreview
        );
      }

      setAadharFile(null);
      setAadharPreview(null);

      if (aadharInputRef.current) {
        aadharInputRef.current.value =
          "";
      }
    }

    if (kind === "gst") {
      if (gstPreview) {
        URL.revokeObjectURL(
          gstPreview
        );
      }

      setGstFile(null);
      setGstPreview(null);

      if (gstInputRef.current) {
        gstInputRef.current.value =
          "";
      }
    }
  };

  // ============================================================
  // Submit
  // ============================================================
  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    const {
      fullName,
      storeName,
      address,
      mobileNumber,
      userName,
      password,
      confirmPassword,
      state,
      stateId,
      district,
      districtId,
      zipCode,
    } = formData;

    // ----------------------------------------------------------
    // Required validation
    // ----------------------------------------------------------
    if (
      !fullName.trim() ||
      !storeName.trim() ||
      !address.trim() ||
      !mobileNumber.trim() ||
      !userName.trim() ||
      !password.trim() ||
      !confirmPassword.trim() ||
      !stateId ||
      !districtId ||
      !zipCode.trim()
    ) {
      setError(
        "Please fill in all required fields."
      );

      return;
    }

    // ----------------------------------------------------------
    // Password validation
    // ----------------------------------------------------------
    if (
      password !== confirmPassword
    ) {
      setError(
        "Passwords do not match."
      );

      return;
    }

    // ----------------------------------------------------------
    // Pincode validation
    // ----------------------------------------------------------
    if (
      !ZIP_CODE_REGEX.test(
        zipCode.trim()
      )
    ) {
      setError(
        "Please select a valid 6-digit PIN code."
      );

      return;
    }

    // ----------------------------------------------------------
    // Aadhar validation
    // ----------------------------------------------------------
    if (!aadharFile) {
      setError(
        "Please upload your Aadhar card image."
      );

      return;
    }

    // ----------------------------------------------------------
    // GST validation
    // ----------------------------------------------------------
    if (!gstFile) {
      setError(
        "Please upload your GST certificate image."
      );

      return;
    }

    setLoading(true);

    try {
      // --------------------------------------------------------
      // Compress images BEFORE Base64 conversion
      // --------------------------------------------------------
      console.log(
        "Compressing Aadhar image..."
      );

      const aadharBase64 =
        await compressImageToBase64(
          aadharFile
        );

      console.log(
        "Compressing GST image..."
      );

      const gstBase64 =
        await compressImageToBase64(
          gstFile
        );

      // --------------------------------------------------------
      // Get saved user ID
      // --------------------------------------------------------
      const savedUserId =
        localStorage.getItem(
          "vendorRegistrationUserId"
        );

      // --------------------------------------------------------
      // Create existing JSON payload
      // --------------------------------------------------------
      const payload = {
        id: "string",

        date:
          new Date().toISOString(),

        vendorId:
          savedUserId || "",

        fullName:
          fullName.trim(),

        Address:
          address.trim(),

        storeName:
          storeName.trim(),

        registrationCertificate:
          "",

        gst:
          gstBase64,

        aadharCard:
          aadharBase64,

        mobileNumber:
          mobileNumber.trim(),

        UserName:
          userName.trim(),

        Password:
          password.trim(),

        state:
          state,

        // IMPORTANT:
        // State ID as string
        stateId:
          String(stateId),

        district:
          district,

        // IMPORTANT:
        // District ID as string
        districtId:
          String(districtId),

        // Backend property is zipcode
        zipcode:
          zipCode.trim(),
      };

      // --------------------------------------------------------
      // Debug sizes
      // --------------------------------------------------------
      console.log(
        "Original Aadhar:",
        (
          aadharFile.size /
          1024
        ).toFixed(2),
        "KB"
      );

      console.log(
        "Compressed Aadhar Base64:",
        (
          aadharBase64.length /
          1024
        ).toFixed(2),
        "KB"
      );

      console.log(
        "Original GST:",
        (
          gstFile.size /
          1024
        ).toFixed(2),
        "KB"
      );

      console.log(
        "Compressed GST Base64:",
        (
          gstBase64.length /
          1024
        ).toFixed(2),
        "KB"
      );

      // --------------------------------------------------------
      // Send JSON to existing backend
      // --------------------------------------------------------
      const response =
        await fetch(
          "https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/VendorRegistration/UploadVendorDetails",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                payload
              ),
          }
        );

      // --------------------------------------------------------
      // Handle API error
      // --------------------------------------------------------
      if (!response.ok) {
        const text =
          await response
            .text()
            .catch(() => "");

        throw new Error(
          text ||
            "Registration failed. Please try again."
        );
      }

      // --------------------------------------------------------
      // Success
      // --------------------------------------------------------
      setMessage(
        "Registration successful. Redirecting to login..."
      );

      setTimeout(() => {
        navigate(
          "/vendor/login"
        );
      }, 1200);
    } catch (err) {
      console.error(
        "Vendor registration error:",
        err
      );

      setError(
        err.message ||
          "Unable to register vendor. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // UI
  // ============================================================
  return (
    <div className="vr-page">
      <div className="vr-form-wrap">
        <div className="vr-card">

          {/* Header */}
          <div className="vr-header">
            <ArrowBackIcon
              className="vr-back-icon"
              onClick={() =>
                navigate(
                  `/profilePage/customer/${userId}`
                )
              }
            />

            <h3 className="vr-card-title">
              Vendor Registration
            </h3>
          </div>

          {/* Error */}
          {error && (
            <div className="vr-alert vr-alert-error">
              {error}
            </div>
          )}

          {/* Success */}
          {message && (
            <div className="vr-alert vr-alert-success">
              {message}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
          >

            {/* Full Name */}
            <div className="vr-field">
              <label className="vr-label">
                Full Name
              </label>

              <input
                type="text"
                className="vr-input"
                value={
                  formData.fullName
                }
                onChange={handleChange(
                  "fullName"
                )}
                placeholder="Contact person's full name"
                required
              />
            </div>

            {/* Store Name */}
            <div className="vr-field">
              <label className="vr-label">
                Business / Vendor Name
              </label>

              <input
                type="text"
                className="vr-input"
                value={
                  formData.storeName
                }
                onChange={handleChange(
                  "storeName"
                )}
                placeholder="Store or business name"
                required
              />
            </div>

            {/* Address */}
            <div className="vr-field">
              <label className="vr-label">
                Address
              </label>

              <textarea
                className="vr-textarea"
                value={
                  formData.address
                }
                onChange={handleChange(
                  "address"
                )}
                placeholder="Business address"
                required
              />
            </div>

            {/* State / District */}
            <div className="vr-row">
              {/* State */}
              <div className="vr-field">
                <label className="vr-label">
                  State
                </label>
                <select
                  className="vr-input"
                  value={
                    formData.stateId
                  }
                  onChange={
                    handleStateChange
                  }
                  required
                  disabled={
                    statesLoading
                  }
                >
                  <option value="">
                    {statesLoading
                      ? "Loading states..."
                      : "Select state"}
                  </option>
                  {stateList.map(
                    (s) => (
                      <option
                        key={
                          s.StateId
                        }
                        value={String(
                          s.StateId
                        )}
                      >
                        {
                          s.StateName
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* District */}
              <div className="vr-field">
                <label className="vr-label">
                  District
                </label>
                <select
                  className="vr-input"
                  value={
                    formData.districtId
                  }
                  onChange={
                    handleDistrictChange
                  }
                  required
                  disabled={
                    !formData.stateId ||
                    districtsLoading
                  }
                >
                  <option value="">
                    {!formData.stateId
                      ? "Select state first"
                      : districtsLoading
                      ? "Loading districts..."
                      : "Select district"}
                  </option>
                  {districtList.map(
                    (d) => (
                      <option
                        key={
                          d.districtId
                        }
                        value={String(
                          d.districtId
                        )}
                      >
                        {
                          d.districtName
                        }
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            {/* Pincode / Mobile */}
            <div className="vr-row">
              {/* Pincode */}
              <div className="vr-field">
                <label className="vr-label">
                  ZipCode / PIN Code
                </label>
                {!formData.stateId ? (
                  <div className="vr-radio-message">
                    Please select a state first
                  </div>
                ) : !formData.districtId ? (
                  <div className="vr-radio-message">
                    Please select a district first
                  </div>
                ) : pincodesLoading ? (
                  <div className="vr-radio-message">
                    Loading pincodes...
                  </div>
                ) : pincodeList.length ===
                  0 ? (
                  <div className="vr-radio-message">
                    No pincodes available for this district
                  </div>
                ) : (
                  <div className="vr-pincode-list">
                    {pincodeList.map(
                      (
                        pincode,
                        index
                      ) => {

                        const pincodeValue =
                          typeof pincode ===
                          "string"
                            ? pincode
                            : String(
                                pincode.pincode ??
                                  pincode.Pincode ??
                                  pincode.pinCode ??
                                  pincode.PinCode ??
                                  ""
                              );

                        if (
                          !pincodeValue
                        ) {
                          return null;
                        }

                        return (
                          <label
                            key={`${pincodeValue}-${index}`}
                            className="vr-pincode-option"
                          >

                            <input
                              type="radio"
                              name="vendorPincode"
                              value={
                                pincodeValue
                              }
                              checked={
                                formData.zipCode ===
                                pincodeValue
                              }
                              onChange={
                                handlePincodeChange
                              }
                              required
                            />

                            <span>
                              {
                                pincodeValue
                              }
                            </span>

                          </label>
                        );
                      }
                    )}

                  </div>
                )}

              </div>

              {/* Mobile */}
              <div className="vr-field">
                <label className="vr-label">
                  Mobile Number
                </label>

                <input
                  type="tel"
                  className="vr-input"
                  value={
                    formData.mobileNumber
                  }
                  placeholder="10-digit mobile number"
                  readOnly
                  required
                />

              </div>

            </div>

            {/* Username */}
            <div className="vr-row">

              <div className="vr-field">

                <label className="vr-label">
                  Username
                </label>

                <input
                  type="text"
                  className="vr-input"
                  value={
                    formData.userName
                  }
                  onChange={handleChange(
                    "userName"
                  )}
                  placeholder="Choose a username"
                  required
                />

              </div>

              <div className="vr-field" />

            </div>

            {/* Password */}
            <div className="vr-row">

              <div className="vr-field">

                <label className="vr-label">
                  Password
                </label>

                <div className="vr-password-wrap">

                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    className="vr-input"
                    value={
                      formData.password
                    }
                    onChange={handleChange(
                      "password"
                    )}
                    placeholder="Create password"
                    required
                    style={{
                      paddingRight: 36,
                    }}
                  />

                  <button
                    type="button"
                    className="vr-eye-btn"
                    onClick={() =>
                      setShowPassword(
                        (s) => !s
                      )
                    }
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <VisibilityIcon />
                    ) : (
                      <VisibilityOffIcon />
                    )}
                  </button>

                </div>

              </div>

              {/* Confirm Password */}
              <div className="vr-field">

                <label className="vr-label">
                  Confirm Password
                </label>

                <div className="vr-password-wrap">

                  <input
                    type={
                      showConfirm
                        ? "text"
                        : "password"
                    }
                    className="vr-input"
                    value={
                      formData.confirmPassword
                    }
                    onChange={handleChange(
                      "confirmPassword"
                    )}
                    placeholder="Repeat password"
                    required
                    style={{
                      paddingRight: 36,
                    }}
                  />

                  <button
                    type="button"
                    className="vr-eye-btn"
                    onClick={() =>
                      setShowConfirm(
                        (s) => !s
                      )
                    }
                    tabIndex={-1}
                  >
                    {showConfirm ? (
                      <VisibilityIcon />
                    ) : (
                      <VisibilityOffIcon />
                    )}
                  </button>

                </div>

              </div>

            </div>

            {/* Document Uploads */}
            <div className="vr-uploads">

              <DocumentUpload
                label="Aadhar Card"
                hint="One image, up to 5MB"
                file={
                  aadharFile
                }
                preview={
                  aadharPreview
                }
                onChange={(e) =>
                  handleFileSelect(
                    e,
                    "aadhar"
                  )
                }
                onRemove={() =>
                  removeFile(
                    "aadhar"
                  )
                }
                inputRef={
                  aadharInputRef
                }
              />

              <DocumentUpload
                label="GST Certificate"
                hint="One image, up to 5MB"
                file={
                  gstFile
                }
                preview={
                  gstPreview
                }
                onChange={(e) =>
                  handleFileSelect(
                    e,
                    "gst"
                  )
                }
                onRemove={() =>
                  removeFile(
                    "gst"
                  )
                }
                inputRef={
                  gstInputRef
                }
              />

            </div>

            {/* Register Button */}
            <button
              type="submit"
              className="vr-submit"
              disabled={loading}
            >
              {loading && (
                <span className="vr-spinner" />
              )}

              {loading
                ? "Submitting..."
                : "Register"}
            </button>

          </form>

          {/* Footer */}
          <div className="vr-footer">
            Already registered?{" "}
            <a href="/vendor/login">
              Login here
            </a>
          </div>

        </div>
      </div>
    </div>
  );
};

export default VendorRegisterPage;