import React, { useState, useEffect, useCallback } from "react";
import { Modal, Button, Form, Row, Col } from "react-bootstrap";
import { Dashboard as MoreVertIcon } from "@mui/icons-material";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import Header from "../CommonPages/Header.js";
import Footer from "../CommonPages/Footer.js";
import axios from "axios";
import Sidebar from "../CommonPages/Sidebar";
import { useParams, useNavigate } from "react-router-dom";
// import { appConfig } from "./config";

const ApartmentRaiseTicket = () => {
  const navigate = useNavigate();
  const { userType } = useParams();
  const { userId } = useParams();
  const { selectedUserType } = useParams();
  const [isMobile, setIsMobile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [apartmentAddress, setApartmentAddress] = useState("");
  const [apartmentName, setApartmentName] = useState("");
  const [consentPersonName, setConsentPersonName] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [ticketPhotos, setTicketPhotos] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [mobileNumber, setMobileNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pinCode, setPinCode] = useState("");
  const [formData, setFormData] = useState({
    subject: "",
    details: "",
    category: "",
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [numberOfFlats, setNumberOfFlats] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);
  const [isRegisterDisabled, setIsRegisterDisabled] = useState(false);
  const [response, setResponse] = useState(null);
  const [ticketId, setTicketId] = useState("");
  const [addresses, setAddresses] = useState([]);
  const [id, setId] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [addressData, setAddressData] = useState({
    apartmentName: "",
    apartmentAddress: "",
    mobileNumber: "",
    zipCode: "",
    flats: "",
    total: "",
  });
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [isSubscription, setIsSubscription] = useState("");
  const [subscriptionDate, setSubscriptionDate] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [shouldBlink, setShouldBlink] = useState(false);
  const [apartmentMaintenanceId, setApartmentMaintenanceId] = useState("");
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
  const [state, setState] = useState("");
  const [districtList, setDistrictList] = useState([]);
  const [stateList, setStateList] = useState([]);
  const [district, setDistrict] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [stateId, setStateId] = useState(null);

  useEffect(() => {
    if (district?.toLowerCase().includes("east godavari")) {
      setServiceUnavailable(true);
    } else {
      setServiceUnavailable(false);
    }
  }, [district]);

  useEffect(() => {
    if (isSubscription === "No" && isRegisterDisabled) {
      setShouldBlink(true);
    } else {
      setShouldBlink(false);
    }
  }, [isSubscription, isRegisterDisabled]);

  useEffect(() => {
    axios
      .get(`https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/MasterData/getStates`)
      .then((response) => {
        const data = response.data;
        console.log("States API Response:", data);
        setStateList(data);
        setStateId("");
      })
      .catch((error) => {
        console.error("Error fetching states:", error);
      });
  }, []);

  useEffect(() => {
    if (stateId) {
      axios
        .get(`https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/MasterData/getDistricts/${stateId}`)
        .then((response) => {
          setDistrictList(response.data);
        })
        .catch((error) => {
          console.error("Error fetching districts:", error);
        });
    } else {
      setDistrictList([]);
    }
  }, [stateId]);

  useEffect(() => {
    console.log(
      selectedFiles,
      ticketId,
      response,
      editingAddressId,
      addressData,
      subscriptionDate,
    );
  }, [
    selectedFiles,
    ticketId,
    response,
    editingAddressId,
    addressData,
    subscriptionDate,
  ]);

  const fetchApartmentData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/ApartmentMaintenance/GetAddressMaintenanceDataByMobileNo?mobileNo=${mobileNumber}`,
      );
      if (!response.ok) throw new Error("Failed to fetch Apartment data");
      const data = await response.json();
      const addressArray = Array.isArray(data) ? data : [data];
      setAddresses(addressArray);
      if (addressArray.length > 0) {
        const address = addressArray[0];
        setId(address.id);
        setApartmentName(address.apartmentName);
        setApartmentAddress(address.apartmentAddress);
        setPinCode(address.pinCode);
        setConsentPersonName(address.consentPersonName);
        setMobileNumber(address.mobileNumber);
        setNumberOfFlats(address.numberOfFlats);
        setTotalAmount(address.totalAmount);
        setIsSubscription(address.isSubscription);
        setPaymentId(address.paymentId);
        setSubscriptionDate(address.subscriptionDate);
        setPaidAmount(address.paidAmount);
        setState(address.state);
        setDistrict(address.district);
        setApartmentMaintenanceId(address.apartmentMaintenanceId);
        setIsRegisterDisabled(true);
      } else {
        setIsRegisterDisabled(false);
      }
    } catch (error) {
      console.error("Error fetching Apartment data:", error);
      setIsRegisterDisabled(false);
    } finally {
      setLoading(false);
    }
  }, [mobileNumber]);

  useEffect(() => {
    fetchApartmentData();
  }, [fetchApartmentData]);

  // Detect screen size for responsiveness
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle form data changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleFlatTotal = (e) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      const numFlats = parseInt(value, 10);
      setNumberOfFlats(value);
      if (!isNaN(numFlats)) {
        setTotalAmount(numFlats * 200);
      } else {
        setTotalAmount("");
      }
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = [];
    for (const file of files) {
      const isValidType =
        file.type === "image/jpeg" || file.type === "image/png";

      if (!isValidType) {
        alert(`Only JPG and PNG formats are allowed: ${file.name}`);
        continue;
      }
      validFiles.push(file);
    }
    if (validFiles.length + ticketPhotos.length > 5) {
      alert("You can upload up to 5 files.");
      return;
    }
    setTicketPhotos([...ticketPhotos, ...validFiles]);
    setShowAlert(validFiles.length > 0);
    setSelectedFiles(Array.from(e.target.files));
  };

  const handleUploadFiles = async () => {
    setLoading(true);
    setShowAlert(false);
    const uploadedFilesList = [];
    for (let i = 0; i < ticketPhotos.length; i++) {
      const file = ticketPhotos[i];
      const fileName = file.name;
      const mimetype = file.type;
      const byteArray = await getFileByteArray(file);
      const response = await uploadFile(byteArray, fileName, mimetype, file);
      if (response) {
        uploadedFilesList.push({
          src: response,
          alt: fileName,
        });
      } else {
        alert("Failed Upload Image");
      }
    }
    setUploadedFiles(uploadedFilesList);
    setLoading(false);
  };

  const getFileByteArray = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const byteArray = new Uint8Array(reader.result);
        resolve(byteArray);
      };
      reader.readAsArrayBuffer(file);
    });
  };
  const phoneNumber = "7989328864";

  const uploadFile = async (byteArray, fileName, mimeType, file) => {
    try {
      const formData = new FormData();
      formData.append(
        "file",
        new Blob([byteArray], { type: mimeType }),
        fileName,
      );
      formData.append("fileName", fileName);
      const response = await fetch(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/FileUpload/upload?filename=` + fileName,
        {
          method: "POST",
          headers: {
            Accept: "text/plain",
          },
          body: formData,
        },
      );
      const responseData = await response.text();
      return responseData || "";
    } catch (error) {
      console.error("Error uploading file:", error);
      return "";
    }
  };

  const handleApartmentTicket = async (e) => {
    e.preventDefault();
    if (
      !formData.subject ||
      !formData.details ||
      !formData.category ||
      !assignedTo
    ) {
      window.alert("Please fill in all mandatory fields.");
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    const payload = {
      id: "string",
      userId: userId,
      apartmentRaiseTicketId: "string",
      date: new Date(),
      Status: "Open",
      subject: formData.subject,
      details: formData.details,
      category: formData.category,
      assignedTo: assignedTo,
      state: state,
      district: district,
      apartmentName: apartmentName,
      phoneNumber: mobileNumber,
      numberOfFlats: numberOfFlats,
      totalAmount: totalAmount.toString(),
      consentPersonName: consentPersonName,
      apartmentAddress: apartmentAddress,
      pincode: pinCode,
      attachments: uploadedFiles.map((file) => file.src),
      paymentId: paymentId,
      paidAmount: paidAmount,
      IsSubscription: isSubscription,
    };

    try {
      const response = await fetch(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/ApartmentRaiseTicket/CreateApartmentRaiseTicket`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        throw new Error("Failed to create a ticket.");
      }

      const data = await response.json();
      setTicketId(data.apartmentRaiseTicketId);
      window.alert(
        `Ticket has been submitted successfully! Your reference number is ${data.apartmentRaiseTicketId}. Get Quote will contact you shortly.`,
      );
      const whatsappapiurl = `https://app-server.wati.io/api/v1/sendSessionMessage/918498892222?messageText=Dear Customer Care a New Ticket Requested by Customer ${data.apartmentRaiseTicketId}`;
      const headers = {
        accept: "/",
        Authorization:
          "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiYjI0Y2E3Yi03MjA5LTQ4Y2QtYjY0Yi04NzkyMmY0ZmI4N2EiLCJ1bmlxdWVfbmFtZSI6ImxzY29tcHV0ZXJjb2FjaGluZ2NlbnRlckBnbWFpbC5jb20iLCJuYW1laWQiOiJsc2NvbXB1dGVyY29hY2hpbmdjZW50ZXJAZ21haWwuY29tIiwiZW1haWwiOiJsc2NvbXB1dGVyY29hY2hpbmdjZW50ZXJAZ21haWwuY29tIiwiYXV0aF90aW1lIjoiMDMvMjYvMjAyNSAwNjoxODowNiIsInRlbmFudF9pZCI6IjQyMjg5NCIsImRiX25hbWUiOiJtdC1wcm9kLVRlbmFudHMiLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJBRE1JTklTVFJBVE9SIiwiZXhwIjoyNTM0MDIzMDA4MDAsImlzcyI6IkNsYXJlX0FJIiwiYXVkIjoiQ2xhcmVfQUkifQ.KmlDJ4K30RfxiEfMGJFmGj6w0iRtzariun0oD04JWlY",
      };
      try {
        const res = await fetch(whatsappapiurl, {
          method: "POST",
          headers: headers,
        });
        const data = await res.json();
        setResponse(data);
      } catch (error) {
        console.error("Error sending message:", error);
      }
      window.location.href = `/profilePage/${userType}/${userId}`;
    } catch (error) {
      console.error("Error:", error);
      window.alert("Failed to create the ticket. Please try again later.");
      setIsSubmitting(false);
    }
  };

  const resetAddressForm = () => {
    setApartmentName("");
    setApartmentAddress("");
    setMobileNumber("");
    setPinCode("");
    setConsentPersonName("");
    setNumberOfFlats("");
    setTotalAmount("");
  };

  const handleAddressRegister = async () => {
    if (
      !apartmentName ||
      !apartmentAddress ||
      !pinCode ||
      !mobileNumber ||
      !consentPersonName ||
      !numberOfFlats
    ) {
      alert("Please fill in all required fields.");
      return;
    }

    if (!/^\d{6}$/.test(pinCode)) {
      alert("Pincode must be exactly 6 digits.");
      return;
    }

    const payload3 = {
      id: "string",
      userId: userId,
      apartmentMaintenanceId: "string",
      date: new Date(),
      Status: "Open",
      apartmentName: apartmentName,
      apartmentAddress: apartmentAddress,
      state: state,
      district: district,
      pinCode: pinCode,
      consentPersonName: consentPersonName,
      mobileNumber: mobileNumber,
      numberOfFlats: numberOfFlats,
      totalAmount: totalAmount.toString(),
      paymentId: "",
      IsSubscription: "No",
      paidAmount: "",
      SubscriptionDate: "",
    };

    try {
      const response = await fetch(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/ApartmentMaintenance/CreateApartmentMaintence`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload3),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error Response:", errorText);
        throw new Error("Failed to Register address.");
      }
      setShowModal(false);
      // ✅ Fetch updated data
      await fetchApartmentData();
      if (isSubscription === "No" && isRegisterDisabled) {
        setShouldBlink(true);
      } else {
        setShouldBlink(false);
      }
    } catch (error) {
      console.error("Error Register address:", error);
      alert("Failed to Register address. Please try again later.");
    }
  };

  const handleAddressEdit = async () => {
    if (!state || !district) {
      alert("Please fill in all required fields.");
      return;
    }
    if (!/^\d{6}$/.test(pinCode)) {
      alert("Pincode must be exactly 6 digits.");
      return;
    }
    const updatedAddress = {
      id: id,
      address: apartmentAddress,
      apartmentName,
      consentPersonName,
      mobileNumber,
      state,
      district,
      pinCode,
      numberOfFlats,
    };

    const payload3 = {
      id: id,
      Date: "string",
      UserId: userId,
      Status: "Open",
      ApartmentMaintenanceId: apartmentMaintenanceId,
      apartmentName: apartmentName,
      apartmentAddress: apartmentAddress,
      state: state,
      district: district,
      pinCode: pinCode,
      consentPersonName: consentPersonName,
      mobileNumber: mobileNumber,
      numberOfFlats: numberOfFlats,
      totalAmount: totalAmount.toString(),
      paymentId: paymentId,
      isSubscription: isSubscription,
      paidAmount: paidAmount,
      SubscriptionDate: subscriptionDate,
    };
    try {
      const response = await fetch(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/ApartmentMaintenance/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload3),
        },
      );
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error Response:", errorText);
        throw new Error("Failed to edit address.");
      }
      setAddresses((prev) =>
        prev.map((addr) => (addr.id === id ? updatedAddress : addr)),
      );
      setAddressData(updatedAddress);
      alert("Address Updated Successfully!");
      await fetchApartmentData();
      setShowModal(false);
      resetAddressForm();
      setIsEditing(false);
      setEditingAddressId(null);
    } catch (error) {
      console.error("Error editing address:", error);
      alert("Failed to edit address. Please try again later.");
    }
  };

  useEffect(() => {
    const storedMobileNumber = localStorage.getItem("mobileNumber");
    if (storedMobileNumber) {
      setMobileNumber(storedMobileNumber);
    }
  }, []);

  const total = Number(numberOfFlats) * 200;
  const isFormDisabled = isSubscription !== "Yes";

  useEffect(() => {
    return () => {
      uploadedFiles.forEach((file) => URL.revokeObjectURL(file));
    };
  }, [uploadedFiles]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <Header />
      <div className="d-flex flex-row justify-content-start align-items-start">
        {/* Sidebar for larger screens */}
        {!isMobile && (
          <div className=" ml-0 m-4 p-0 sde_mnu">
            <Sidebar userType={selectedUserType} />
          </div>
        )}

        {/* Floating menu for mobile */}
        {isMobile && (
          <div className="floating-menu">
            <Button
              variant="primary"
              className="rounded-circle shadow"
              onClick={() => setShowMenu(!showMenu)}
            >
              <MoreVertIcon />
            </Button>

            {showMenu && (
              <div className="sidebar-container">
                <Sidebar userType={selectedUserType} />
              </div>
            )}
          </div>
        )}

        {/* Main Content */}
        <div className={`container m-1 ${isMobile ? "w-100" : "w-75"}`}>
          <h1 className="text-center mb-1 mt-mob-50 mx-3">
            Apartment Common Area Maintenance
          </h1>
          <div className="d-flex justify-content-between align-items-center">
            <label className="mt-2">
              Address <span className="req_star">*</span>
            </label>
            <div className="d-flex justify-content-between">
              <Button
                variant="success m-1 text-white"
                onClick={() => setShowModal(true)}
                disabled={isRegisterDisabled}
              >
                Register
              </Button>
              <Button
                variant={
                  isSubscription === "No" && isRegisterDisabled
                    ? "danger"
                    : "primary"
                }
                className={`m-1 text-white ${shouldBlink ? "blinking-button" : ""}`}
                onClick={() =>
                  (window.location.href = `https://handymanserviceproviders.com/ApartmentSubscription/${id}`)
                }
                disabled={!isRegisterDisabled || isSubscription === "Yes"}
              >
                Subscription
              </Button>
            </div>
            {/* Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)}>
              <Modal.Header closeButton>
                <Modal.Title>
                  {isEditing ? "Edit Address" : "Register"}
                </Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <Form>
                  <Form.Group className="mb-3">
                    <Form.Label>
                      Apartment Name <span className="req_star">*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={apartmentName}
                      onChange={(e) => setApartmentName(e.target.value)}
                      placeholder="Enter Apartment Name"
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>
                      Apartment Address <span className="req_star">*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={apartmentAddress}
                      onChange={(e) => setApartmentAddress(e.target.value)}
                      placeholder="Enter Apartment Address"
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
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
                        if (selectedState) {
                          setState(selectedState.StateName);
                        }
                      }}
                      required
                    >
                      <option value="">Select State</option>
                      {Array.isArray(stateList) &&
                        stateList
                          .filter((s) => s && s.StateId && s.StateName)
                          .map((s) => (
                            <option
                              key={s.StateId}
                              value={s.StateId.toString()}
                            >
                              {s.StateName}
                            </option>
                          ))}
                    </Form.Select>
                  </Form.Group>
                  <Form.Group className="mb-3">
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
                        if (selectedDistrict) {
                          setDistrict(selectedDistrict.districtName);
                          if (
                            selectedDistrict.districtName?.toLowerCase() ===
                            "east godavari"
                          ) {
                            setServiceUnavailable(true);
                          } else {
                            setServiceUnavailable(false);
                          }
                        }
                      }}
                      required
                    >
                      <option value="">Select District</option>
                      {districtList.map((d) => (
                        <option
                          key={d.districtId}
                          value={d.districtId.toString()}
                        >
                          {d.districtName}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>
                      Pincode <span className="req_star">*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={pinCode}
                      onChange={(e) => {
                        const numericValue = e.target.value.replace(/\D/g, "");
                        if (numericValue.length <= 6) {
                          setPinCode(numericValue);
                        }
                      }}
                      placeholder="Enter pincode"
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>
                      Consent Person Name <span className="req_star">*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={consentPersonName}
                      onChange={(e) => setConsentPersonName(e.target.value)}
                      placeholder="Enter Consent Person Name"
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>
                      Mobile Number <span className="req_star">*</span>
                    </Form.Label>
                    <Form.Control
                      name="MobileNumber"
                      placeholder="Enter Mobile Number"
                      maxLength="10"
                      value={mobileNumber}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>
                      No Of Flats <span className="req_star">*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter Number Of Flats"
                      value={numberOfFlats}
                      onChange={handleFlatTotal}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>
                      Total <span className="req_star">*</span>
                    </Form.Label>
                    <Form.Control placeholder="Total" value={total} readonly />
                  </Form.Group>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={
                      isEditing ? handleAddressEdit : handleAddressRegister
                    }
                  >
                    {isEditing ? "Edit Address" : "Register"}
                  </Button>
                </Form>
              </Modal.Body>
            </Modal>
          </div>

          <div className="p-3 border rounded bg-light">
            {Array.isArray(addresses) &&
              addresses.map((address) => (
                <div
                  key={address.id}
                  className="list-group-item d-flex justify-content-between align-items-center bg-white text-dark"
                >
                  <div>
                    <span className="ml-2">{address.apartmentName}</span>
                    <br />
                    <span className="ml-2">{address.apartmentAddress}</span>
                    <br />
                    <span className="ml-2">{address.pinCode}</span>
                    <br />
                    <span className="ml-2">{address.consentPersonName}</span>
                    <br />
                    <span className="ml-2">{address.state}</span>
                    <br />
                    <span className="ml-2">{address.district}</span>
                    <br />
                    <span className="ml-2">{address.mobileNumber}</span>
                    <br />
                  </div>
                  <div className="text-end">
                    <button
                      className="btn btn-warning text-white btn-sm mx-1"
                      onClick={() => {
                        setId(address.id);
                        setApartmentName(address.apartmentName);
                        setApartmentAddress(address.apartmentAddress);
                        setConsentPersonName(address.consentPersonName);
                        setMobileNumber(address.mobileNumber);
                        setState(address.state);
                        setDistrict(address.district);
                        setPinCode(address.pinCode);
                        setNumberOfFlats(address.numberOfFlats);
                        setTotalAmount(address.totalAmount);
                        setIsEditing(true);
                        setShowModal(true);
                      }}
                    >
                      {address.apartmentAddress === "" ? "" : "Edit Address"}
                    </button>
                  </div>
                </div>
              ))}
          </div>
          {serviceUnavailable && (
            <div className="alert alert-danger">
              <strong>Note:</strong> Currently, the options for apartment
              maintenance common area services are unavailable in your district.
              You can still purchase products through the{" "}
              <strong>"Buy Product"</strong> section. For further assistance,
              please contact our customer support at{" "}
              <strong>62811 98953</strong>.
            </div>
          )}

          {/* Subject */}
          <Row>
            <Col md={12}>
              <Form.Group>
                <label>
                  Subject <span className="req_star">*</span>
                </label>
                <Form.Control
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="Enter subject"
                  required
                  disabled={isFormDisabled || serviceUnavailable}
                />
              </Form.Group>
            </Col>
          </Row>

          {/* Details */}
          <Form.Group>
            <label>
              Details <span className="req_star">*</span>
            </label>
            <Form.Control
              as="textarea"
              name="details"
              value={formData.details}
              onChange={handleChange}
              rows="4"
              placeholder="Enter details"
              required
              disabled={isFormDisabled || serviceUnavailable}
            />
          </Form.Group>

          {/* Category */}
          <Row>
            <Col md={6}>
              <Form.Group>
                <label>
                  Category <span className="req_star">*</span>
                </label>
                <Form.Control
                  as="select"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  disabled={isFormDisabled || serviceUnavailable}
                >
                  <option value="">Select Category</option>
                  <option>Plumbing</option>
                  <option>Electrical</option>
                  <option>Carpentry</option>
                </Form.Control>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group>
                <label>
                  Assigned To <span className="req_star">*</span>
                </label>
                <Form.Control
                  as="select"
                  name="assignedTo"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  required
                  disabled={isFormDisabled || serviceUnavailable}
                >
                  <option value="">Select</option>
                  <option value="Customer Care">Customer Care</option>
                </Form.Control>
              </Form.Group>
            </Col>
          </Row>

          {/* File Upload */}
          <div className="form-group">
            <label className="text-danger m-2">Upload your Query Photos </label>
            <input
              type="file"
              className="form-control"
              multiple
              onChange={handleFileChange}
              required
              disabled={isFormDisabled || serviceUnavailable}
            />
            {showAlert && (
              <div className="alert alert-danger  mt-2">
                Please click the <strong>Upload Files</strong> button to upload
                the selected images.
              </div>
            )}

            <label className="text-danger m-2 fs-5">
              If any Videos Forward to Whatsapp Number
              <br />
              <span className="text-success" style={{ cursor: "pointer" }}>
                <WhatsAppIcon />
                <strong className="m-2" style={{ textDecoration: "underline" }}>
                  {phoneNumber}
                </strong>
              </span>
            </label>
            <div className="mt-2">
              {ticketPhotos.map((file, index) => (
                <p key={index}>{file.name}</p>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-primary mt-2"
              onClick={handleUploadFiles}
              disabled={loading || ticketPhotos.length === 0}
            >
              {loading ? "Uploading..." : "Upload Files"}
            </button>
          </div>

          {/* Get Quote Button */}
          <div className="d-flex justify-content-between mt-3">
            <Button
              variant="success"
              type="submit"
              onClick={handleApartmentTicket}
              disabled={isSubmitting || serviceUnavailable}
            >
              {isSubmitting ? "Submitting..." : "Get Quote"}
            </Button>
            <Button
              type="button"
              className="back-btn"
              onClick={() => navigate(`/profilePage/${userType}/${userId}`)}
            >
              Back
            </Button>
          </div>
        </div>
      </div>
      <Footer />

      {/* Styles for floating menu */}
      <style jsx>{`
        .menu-popup {
          position: absolute;
          top: 50px; /* Keeps the popup aligned below the floating menu */
          left: 0; /* Aligns the popup to the left */
          background: white;
          border: 1px solid #ddd;
          border-radius: 5px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          width: 200px;
        }
        .menu-item {
          padding: 10px;
          border-bottom: 1px solid #ddd;
          display: flex;
          align-items: center;
          justify-content: flex-start;
        }
        .menu-item:last-child {
          border-bottom: none;
        }
      `}</style>
    </div>
  );
};

export default ApartmentRaiseTicket;
