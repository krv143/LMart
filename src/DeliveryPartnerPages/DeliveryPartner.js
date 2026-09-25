import React, { useState, useEffect } from "react";
import axios from "axios";
import Form from "react-bootstrap/Form";
import Header from "../CommonPages/Header";
import Footer from "../CommonPages/Footer";
import { useNavigate, useParams } from "react-router-dom";
// import { appConfig } from "./config";

const FILE_FIELDS = [
  { label: "Passport Size Photo (PDF)", name: "passportPhoto" },
  { label: "Driving License (PDF)", name: "drivingLicense" },
  { label: "Aadhar Card (PDF)", name: "aadharCard" },
  { label: "Pan Card (PDF)", name: "panCard" },
];
const DeliveryPartner = () => {
  const navigate = useNavigate();
  const { userId, userType } = useParams();
  const [isMobile, setIsMobile] = useState(false);
  const [districtList, setDistrictList] = useState([]);
  const [stateList, setStateList] = useState([]);
  const [district, setDistrict] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [stateId, setStateId] = useState(null);
  const [state, setState] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [files, setFiles] = useState({
    passportPhoto: null,
    drivingLicense: null,
    aadharCard: null,
    panCard: null,
  });
  const [uploadedNames, setUploadedNames] = useState({
    passportPhoto: "",
    drivingLicense: "",
    aadharCard: "",
    panCard: "",
  });

  const [showAlert, setShowAlert] = useState({});
  const [loading, setLoading] = useState({});
  const [formData, setFormData] = useState({
    firstName: "",
    phone: "",
    address: "",
    district: "",
    state: "",
    pincode: "",
    licenseNumber: "",
    aadharNumber: "",
    panNumber: "",
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    axios
      .get(`https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/MasterData/getStates`)
      .then((res) => {
        setStateList(res.data || []);
        setStateId("");
      })
      .catch((err) => console.error("Error fetching states:", err));
  }, []);

  useEffect(() => {
    if (!stateId) {
      setDistrictList([]);
      return;
    }
    axios
      .get(`https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/MasterData/getDistricts/${stateId}`)
      .then((res) => setDistrictList(res.data || []))
      .catch((err) => console.error("Error fetching districts:", err));
  }, [stateId]);

  const validateField = (name, value) => {
    let error = "";
    switch (name) {
      case "firstName":
        if (!value.trim()) error = "Full name is required.";
        break;
      case "phone":
        if (value.length !== 10) error = "Phone number must be 10 digits.";
        break;
      case "address":
        if (!value.trim()) error = "Address is required.";
        break;
      case "pincode":
        if (value.length !== 6) error = "Pincode must be 6 digits.";
        break;
      case "aadharNumber":
        if (value.length !== 12) error = "Aadhar must be 12 digits.";
        break;
      case "licenseNumber":
        if (!value.trim()) error = "Driving License is required.";
        break;
      case "panNumber":
        if (value.length !== 10) error = "PAN must be 10 characters.";
        break;
      default:
        break;
    }
    setFormErrors((prev) => ({ ...prev, [name]: error }));
    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let v = value;
    if (name === "phone") v = value.replace(/\D/g, "").slice(0, 10);
    else if (name === "pincode") v = value.replace(/\D/g, "").slice(0, 6);
    else if (name === "aadharNumber") v = value.replace(/\D/g, "").slice(0, 12);
    else if (name === "licenseNumber")
      v = value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 15);
    else if (name === "panNumber")
      v = value
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(0, 10)
        .toUpperCase();
    setFormData((prev) => ({ ...prev, [name]: v }));
    validateField(name, v);
  };

  const validateAll = () => {
    const errors = {};
    Object.keys(formData).forEach((k) => {
      errors[k] = validateField(k, formData[k]);
    });
    if (!stateId || !state) errors.state = "Please select a State.";
    if (!districtId || !district) errors.district = "Please select a District.";
    FILE_FIELDS.forEach(({ name }) => {
      if (!uploadedNames[name])
        errors[name] = `Please upload ${name} (click Upload).`;
    });
    setFormErrors(errors);
    return Object.values(errors).every((e) => !e);
  };

  const handleFileChange = (e) => {
    const { name, files: selected } = e.target;
    if (!selected || selected.length === 0) return;
    const file = selected[0];
    if (file.type !== "application/pdf") {
      alert("Only PDF files are allowed.");
      e.target.value = "";
      return;
    }
    setFiles((prev) => ({
      ...prev,
      [name]: {
        file,
        preview: URL.createObjectURL(file),
      },
    }));
    setShowAlert((prev) => ({ ...prev, [name]: true }));
    setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const uploadOne = async (field) => {
    const f = files[field]?.file;
    if (!f) {
      alert(`Please choose a PDF for ${field}`);
      return;
    }
    try {
      setLoading((p) => ({ ...p, [field]: true }));
      const fd = new FormData();
      fd.append("file", f, f.name);
      fd.append("fileName", f.name);
      const resp = await fetch(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/FileUpload/upload?filename=${f.name}`,
        { method: "POST", headers: { Accept: "text/plain" }, body: fd },
      );
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Upload failed (${resp.status}): ${txt}`);
      }
      const storedName = (await resp.text()).trim();
      setUploadedNames((prev) => ({ ...prev, [field]: storedName }));
      setShowAlert((prev) => ({ ...prev, [field]: false }));
      alert(
        `${FILE_FIELDS.find((fld) => fld.name === field)?.label || field} uploaded.`,
      );
    } catch (err) {
      console.error("Upload error:", err);
      alert(`Failed to upload ${field}.`);
    } finally {
      setLoading((p) => ({ ...p, [field]: false }));
    }
  };

  useEffect(() => {
    return () => {
      Object.values(files).forEach(
        (f) => f?.preview && URL.revokeObjectURL(f.preview),
      );
    };
  }, [files]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateAll()) return;

    try {
      setSubmitting(true);
      const payload = {
        id: "string",
        date: "string",
        DeliveryPartnerId: "string",
        UserId: userId,
        deliveryPartnerName: formData.firstName,
        address: formData.address,
        state: state,
        district: district,
        zipcode: formData.pincode,
        phoneNumber: formData.phone,
        pancardNumber: formData.panNumber,
        aadharCardNumber: formData.aadharNumber,
        drivingLicenseNumber: formData.licenseNumber,
        Status: "Draft",
        isRegistered: true,
        isPickup: false,
        isDelivered: false,
        assignedTo: "",
        photo: uploadedNames.passportPhoto ? [uploadedNames.passportPhoto] : [],
        drivingLicense: uploadedNames.drivingLicense
          ? [uploadedNames.drivingLicense]
          : [],
        aadharAttachment: uploadedNames.aadharCard
          ? [uploadedNames.aadharCard]
          : [],
        pancardAttachment: uploadedNames.panCard ? [uploadedNames.panCard] : [],
      };

      const { status } = await axios.post(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/DeliveryPartner/UploadDeliveryPartnerDetails`,
        payload,
        { headers: { "Content-Type": "application/json" } },
      );
      if (status >= 200 && status < 300) {
        alert("Registration Successful!");
        navigate(`/profilePage/${userType}/${userId}`);
      } else {
        alert("Failed to submit.");
      }
    } catch (err) {
      console.error("Submit error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <div className={`container ${isMobile ? "w-100" : "w-100"}`}>
        <h2
          className="text-center text-dark fw-bold"
          style={{ fontFamily: "'Baloo 2'", marginTop: "80px" }}
        >
          Delivery Partner Registration
        </h2>

        <form className="p-3 rounded shadow" noValidate onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-md-6">
              <label>
                Full Name <span className="req_star">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
              {formErrors.firstName && (
                <small className="text-danger">{formErrors.firstName}</small>
              )}
            </div>
            <div className="col-md-6">
              <label>
                Phone Number <span className="req_star">*</span>
              </label>
              <input
                type="tel"
                className="form-control"
                name="phone"
                maxLength="10"
                value={formData.phone}
                onChange={handleChange}
                required
              />
              {formErrors.phone && (
                <small className="text-danger">{formErrors.phone}</small>
              )}
            </div>
          </div>

          {/* Address */}
          <div className="row">
            <div className="col-md-6">
              <label>
                Address <span className="req_star">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
              />
              {formErrors.address && (
                <small className="text-danger">{formErrors.address}</small>
              )}
            </div>

            <Form.Group className="col-md-6">
              <Form.Label>
                State <span className="req_star">*</span>
              </Form.Label>
              <Form.Select
                value={stateId || ""}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  setStateId(selectedId);
                  const selectedState = stateList.find(
                    (s) => s?.StateId?.toString() === selectedId,
                  );
                  setState(selectedState ? selectedState.StateName : "");
                }}
                required
              >
                <option value="">Select State</option>
                {Array.isArray(stateList) &&
                  stateList
                    .filter((s) => s && s.StateId && s.StateName)
                    .map((s) => (
                      <option key={s.StateId} value={s.StateId.toString()}>
                        {s.StateName}
                      </option>
                    ))}
              </Form.Select>
              {formErrors.state && (
                <small className="text-danger">{formErrors.state}</small>
              )}
            </Form.Group>

            <Form.Group className="col-md-6">
              <Form.Label>
                District <span className="req_star">*</span>
              </Form.Label>
              <Form.Select
                value={districtId || ""}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  setDistrictId(selectedId);
                  const selectedDistrict = districtList.find(
                    (d) => d.districtId.toString() === selectedId,
                  );
                  setDistrict(
                    selectedDistrict ? selectedDistrict.districtName : "",
                  );
                }}
                required
                disabled={!stateId}
              >
                <option value="">Select District</option>
                {districtList.map((d) => (
                  <option key={d.districtId} value={d.districtId.toString()}>
                    {d.districtName}
                  </option>
                ))}
              </Form.Select>
              {formErrors.district && (
                <small className="text-danger">{formErrors.district}</small>
              )}
            </Form.Group>

            <div className="col-md-6">
              <label>
                Pincode <span className="req_star">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                name="pincode"
                value={formData.pincode}
                onChange={handleChange}
                required
              />
              {formErrors.pincode && (
                <small className="text-danger">{formErrors.pincode}</small>
              )}
            </div>
          </div>

          {/* Identity Numbers */}
          <h5 className="mt-1">Identity Documents</h5>
          <div className="row">
            <div className="col-md-6">
              <label>
                Driving License Number <span className="req_star">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                name="licenseNumber"
                value={formData.licenseNumber}
                onChange={handleChange}
                required
              />
              {formErrors.licenseNumber && (
                <small className="text-danger">
                  {formErrors.licenseNumber}
                </small>
              )}
            </div>
            <div className="col-md-6">
              <label>
                Aadhar Number <span className="req_star">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                name="aadharNumber"
                value={formData.aadharNumber}
                onChange={handleChange}
                required
              />
              {formErrors.aadharNumber && (
                <small className="text-danger">{formErrors.aadharNumber}</small>
              )}
            </div>
            <div className="col-md-6">
              <label>
                PAN Number <span className="req_star">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                name="panNumber"
                value={formData.panNumber}
                onChange={handleChange}
                required
              />
              {formErrors.panNumber && (
                <small className="text-danger">{formErrors.panNumber}</small>
              )}
            </div>
          </div>

          <h5>Upload Documents</h5>
          <div className="row">
            {FILE_FIELDS.map(({ label, name }) => (
              <div className="col-md-6 mb-3" key={name}>
                <label className="section-title fs-6 m-1">{label} *</label>
                <input
                  type="file"
                  className="form-control"
                  name={name}
                  accept="application/pdf"
                  onChange={handleFileChange}
                  required
                />
                {formErrors[name] && (
                  <p className="text-danger">{formErrors[name]}</p>
                )}
                {showAlert[name] && (
                  <div
                    className="alert alert-warning mt-1"
                    style={{ fontSize: "10px" }}
                  >
                    <strong>Note:</strong> After selecting, click{" "}
                    <strong>Upload {label}</strong> to confirm.
                  </div>
                )}

                {files[name]?.file && (
                  <div>
                    <p className="text-muted small">{files[name].file.name}</p>
                    <a
                      href={files[name].preview}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-outline-primary"
                    >
                      View {label}
                    </a>
                  </div>
                )}

                <button
                  type="button"
                  className="btn btn-primary mt-1"
                  onClick={() => uploadOne(name)}
                  disabled={!!loading[name] || !files[name]?.file}
                >
                  {loading[name] ? "Uploading..." : `Upload ${label}`}
                </button>
              </div>
            ))}
          </div>
          <div className="d-flex justify-content-between">
            <button
              type="submit"
              className="btn btn-danger w-50 mt-1 me-2"
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Register"}
            </button>

            <button
              type="button"
              className="btn btn-warning w-50 mt-1 ms-2"
              onClick={() => navigate(`/profilePage/${userType}/${userId}`)}
            >
              Back
            </button>
          </div>
        </form>
      </div>
      <Footer />
    </>
  );
};

export default DeliveryPartner;
