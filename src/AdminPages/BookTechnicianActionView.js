import React, { useState, useEffect } from "react";
import { Button, Form, Row, Col } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import { useCallback } from "react";
import AdminSidebar from "./AdminSidebar";
import { Dashboard as MoreVertIcon } from "@mui/icons-material";
import ArrowLeftIcon from "@mui/icons-material/ArrowLeft";
import ForwardIcon from "@mui/icons-material/Forward";
import { Link, useParams, useNavigate } from "react-router-dom";
import "../App.css";
// import { appConfig } from "./config";

const BookTechnicianActionView = () => {
  const Navigate = useNavigate();
  const [error, setError] = useState({});
  const [isMobile, setIsMobile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [technicianData, setTechnicianData] = useState("");
  const [bookTechnicianId, setBookTechnicianId] = useState("");
  const [address, setAddress] = useState("");
  const [category, setCategory] = useState("");
  const { raiseTicketId } = useParams();
  const [loading, setLoading] = useState(true);
  const [paymentMode, setPaymentMode] = useState("");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [rate, setRate] = useState("");
  const [discount, setDiscount] = useState("");
  const [afterDiscount, setAfterDiscount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [moreInfo, setMoreInfo] = useState("");
  const [technicianConfirmationCode, setTechnicianConfirmationCode] =
    useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [utrTransactionNumber, setutrTransactionNumber] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [selectPincode, setSelectPincode] = useState("");
  const [selectTechnician, setSelectTechnician] = useState("");
  const [pincodes, setPincodes] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [selectedTechnicians, setSelectedTechnicians] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [requiredQuantity, setRequiredQuantity] = useState("");
  const [totalAmount, setTotalAmount] = useState("");

  useEffect(() => {
    console.log(technicianData, selectTechnician);
  }, [technicianData, selectTechnician]);

  useEffect(() => {
    const fetchtechnicianData = async () => {
      try {
        const response = await fetch(
          `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/BookTechnician/GetBookTechnician/${raiseTicketId}`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch technician data");
        }
        const data = await response.json();
        setTechnicianData(data);
        setJobDescription(data.jobDescription);
        setCategory(data.category);
        setPhoneNumber(data.phoneNumber);
        setAddress(data.address);
        setBookTechnicianId(data.bookTechnicianId);
        setTotalAmount(data.afterDiscount);
        setPaymentMode(data.paymentMode);
        setCustomerId(data.customerId);
        setCustomerName(data.customerName);
        setAssignedTo(data.assignedTo);
        setState(data.state);
        setDistrict(data.district);
        setZipCode(data.zipCode);
        setRate(data.rate);
        setDiscount(data.discount);
        setAfterDiscount(data.afterDiscount);
        setRemarks(data.remarks);
        setMoreInfo(data.moreInfo);
        setTechnicianConfirmationCode(data.technicianConfirmationCode);
        setutrTransactionNumber(data.utrTransactionNumber);
        setAssignedTo(data.assignedTo);
        setEmailAddress(data.customerEmail);
        setRequiredQuantity(data.noOfQuantity);
        setTotalAmount(data.totalAmount);
      } catch (error) {
        console.error("Error fetching technician data:", error);
      } finally {
        setLoading(false);
      }
    };
    if (raiseTicketId) {
      fetchtechnicianData();
    }
  }, [raiseTicketId]);

  // Detect screen size for responsiveness
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch pincodes based on category
  const fetchPincodesByCategory = async (category) => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/Technician/GetTechnicianPincodesBycategory?Category=${category}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch pincodes");
      }
      const data = await response.json();
      setPincodes(data || []);
    } catch (error) {
      console.error("Error fetching pincodes:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch technicians based on pincode
  const fetchTechniciansByPincode = useCallback(
    async (pincode) => {
      try {
        setLoading(true);
        const response = await fetch(
          `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/Technician/GetTechniciannamesByPincodeAndCategory?pincode=${pincode}&category=${category}`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch technicians");
        }
        const data = await response.json();
        setTechnicians(data || []);
      } catch (error) {
        console.error("Error fetching technicians:", error);
      } finally {
        setLoading(false);
      }
    },
    [category],
  );

  // Fetch pincodes when category changes
  useEffect(() => {
    if (category) {
      fetchPincodesByCategory(category);
    }
  }, [category]);

  // Fetch category when assignedTo is "Technician"
  useEffect(() => {
    if (category && assignedTo === "Technician") {
      fetchPincodesByCategory(category);
    }
  }, [category, assignedTo]);

  // Fetch technicians when pincode changes
  useEffect(() => {
    if (selectPincode) {
      fetchTechniciansByPincode(selectPincode);
      setSelectTechnician("");
    }
  }, [selectPincode, fetchTechniciansByPincode]);

  // Handle pincode selection
  const handlePincodeChange = (e) => {
    setSelectPincode(e.target.value);
    setError({ ...error, selectPincode: "" });
  };

  const handleSelectAllChange = () => {
    if (selectAll) {
      setSelectedTechnicians([]);
    } else {
      setSelectedTechnicians(
        technicians.map((tech) => tech.technicianFullName),
      );
    }
    setSelectAll(!selectAll);
  };

  const handleTechnicianChange = (e) => {
    const { value, checked } = e.target;
    let updatedSelection = [...selectedTechnicians];

    if (checked) {
      updatedSelection.push(value);
    } else {
      updatedSelection = updatedSelection.filter((name) => name !== value);
    }

    setSelectedTechnicians(updatedSelection);
    setSelectAll(updatedSelection.length === technicians.length);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  const handleAssignedToChange = (e) => {
    const selectedAssignedTo = e.target.value;
    setAssignedTo(selectedAssignedTo);
    setError({});
    if (selectedAssignedTo === "Customer") {
      setSelectPincode("");
      setSelectTechnician("");
      setPincodes([]);
      setTechnicians([]);
    }
  };

  // Handle form data changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setTechnicianData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleUpdateJobDescription = async (e) => {
    e.preventDefault();
    if (!assignedTo) {
      setError("You Must select AssignedTo");
      return;
    }

    const payload2 = {
      id: raiseTicketId,
      bookTechnicianId: bookTechnicianId,
      date: new Date(),
      customerName: customerName,
      address: address,
      state: state,
      district: district,
      zipCode: zipCode,
      category: category,
      jobDescription: jobDescription,
      rate: rate,
      discount: discount,
      afterDiscount: afterDiscount,
      remarks: remarks,
      moreInfo: moreInfo,
      status: "Assigned",
      customerId: customerId,
      CustomerEmail: emailAddress,
      assignedTo: assignedTo,
      phoneNumber: phoneNumber,
      paymentMode: paymentMode,
      approvedAmount: afterDiscount,
      utrTransactionNumber: utrTransactionNumber || "",
      technicianConfirmationCode: technicianConfirmationCode,
      OrderId: "",
      OrderDate: "",
      PaidAmount: "",
      TransactionStatus: "",
      TransactionType: "",
      InvoiceId: "",
      InvoiceURL: "",
      TechnicianPincode: selectPincode,
      TechnicianName: selectedTechnicians,
      TechnicianFullName: "",
    };

    try {
      const response = await fetch(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/BookTechnician/${raiseTicketId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload2),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to forward ${assignedTo}.`);
      }
      alert(`Ticket Forwarded to ${assignedTo} Successfully!`);
      Navigate("/adminNotifications");
    } catch (error) {
      console.error("Error:", error);
      window.alert(`Failed to forward ${assignedTo} . Please try again later.`);
    }
  };

  return (
    <div className="d-flex flex-row justify-content-start align-items-start mt-mob-50">
      {!isMobile && (
        <div className=" ml-0 p-0 adm_mnu h-90">
          <AdminSidebar />
        </div>
      )}

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
              <AdminSidebar />
            </div>
          )}
        </div>
      )}

      <div className={`container m-1 ${isMobile ? "w-100" : "w-75"}`}>
        <h1 className="text-center mb-1 mx-5">Book a Technician Action View</h1>
        <Form>
          <Row>
            <Col md={6}>
              <Form.Group>
                <label>Ticket ID</label>
                <Form.Control
                  type="text"
                  name="bookTechnicianId"
                  value={bookTechnicianId}
                  onChange={handleChange}
                  placeholder="Ticket Number"
                  required
                />
              </Form.Group>
            </Col>
          </Row>

          {/* Category */}
          <Row>
            <Col md={12}>
              <Form.Group>
                <label>Category</label>
                <Form.Control
                  type="text"
                  name="category"
                  value={category}
                  onChange={handleChange}
                  placeholder="Category"
                  readOnly
                ></Form.Control>
              </Form.Group>
            </Col>
          </Row>

          {/* Job Description */}
          <Row>
            <Col md={12}>
              <Form.Group>
                <label>Job Description</label>
                <Form.Control
                  type="text"
                  name="jobDescription"
                  value={jobDescription}
                  onChange={handleChange}
                  placeholder="Job Description"
                  readOnly
                />
              </Form.Group>
            </Col>
          </Row>

          {/* Required Quantity */}
          <Row>
            <Col md={12}>
              <Form.Group>
                <label>Required Quantity</label>
                <Form.Control
                  type="text"
                  name="requiredQuantity"
                  value={requiredQuantity}
                  placeholder="Required Quantity"
                  readOnly
                />
              </Form.Group>
            </Col>
          </Row>

          {/* Total Amount */}
          <Row>
            <Col md={12}>
              <Form.Group>
                <label>Total Amount</label>
                <Form.Control
                  type="text"
                  name="totalAmount"
                  value={`Rs ${totalAmount} /-`}
                  placeholder="Total Amount"
                  readOnly
                />
              </Form.Group>
            </Col>
          </Row>

          {/* Technician Confirmation Code */}
          <Form.Group>
            <label>Technician Confirmation Code</label>
            <Form.Control
              name="technicianConfirmationCode"
              value={technicianConfirmationCode}
              onChange={handleChange}
              rows="4"
              placeholder="Technician Confirmation Code"
              readOnly
            />
          </Form.Group>

          {/* Payment Mode */}
          <Row>
            <Col md={12}>
              <Form.Group>
                <label>Payment Mode</label>
                <Form.Control
                  type="text"
                  name="paymentMode"
                  value={paymentMode}
                  onChange={handleChange}
                  placeholder="Payment Mode"
                  readOnly
                />
              </Form.Group>
            </Col>
          </Row>

          {/* Payment Transaction Details */}
          <Form.Group>
            <label>Payment Transaction Details</label>
            <Form.Control
              name="paymentTransactionDetails"
              value={utrTransactionNumber}
              onChange={handleChange}
              rows="4"
              placeholder="Payment Transaction Details"
              readOnly
            />
          </Form.Group>

          {/*Customer Name*/}
          <Row>
            <Col md={12}>
              <Form.Group>
                <label>Customer Name</label>
                <Form.Control
                  type="text"
                  name="customerName"
                  value={customerName}
                  onChange={handleChange}
                  placeholder="Customer Name"
                  required
                  readOnly
                />
              </Form.Group>
            </Col>
          </Row>

          {/* Customer Address*/}
          <Row>
            <Col md={12}>
              <Form.Group>
                <label>Customer Address</label>
                <Form.Control
                  as="textarea"
                  type="text"
                  name="address"
                  value={[address, district, state, zipCode, phoneNumber]
                    .filter(Boolean)
                    .join(", ")}
                  onChange={handleChange}
                  placeholder="Customer Address"
                  readOnly
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            {/* Assigned To */}
            <Col md={12}>
              <Form.Group>
                <label>Assigned To</label>
                <Form.Control
                  as="select"
                  value={assignedTo}
                  onChange={handleAssignedToChange}
                  required
                >
                  <option value="">Select Assigned</option>
                  <option value="Customer">Customer</option>
                  <option value="Technician">Technician</option>
                </Form.Control>
                {error.assignedTo && (
                  <div style={{ color: "red", marginTop: "5px" }}>
                    {error.assignedTo}
                  </div>
                )}
              </Form.Group>
            </Col>

            {/* Show these fields only if "Technician" is selected */}
            {assignedTo === "Technician" && (
              <>
                {/* Select Category */}
                <Col md={12}>
                  <Form.Group>
                    <label>Category</label>
                    <Form.Control
                      type="text"
                      name="category"
                      value={category}
                      onChange={handleChange}
                      placeholder="Category"
                      readOnly
                    ></Form.Control>
                  </Form.Group>
                </Col>

                {/* Select Pincodes */}
                <Col md={12}>
                  <Form.Group>
                    <label>Select Pincode</label>
                    <Form.Control
                      as="select"
                      value={selectPincode}
                      onChange={handlePincodeChange}
                      required
                    >
                      <option value="">Select Pincode</option>
                      {pincodes.map((pincode, i) => (
                        <option key={i} value={pincode.zipCode}>
                          {pincode.zipCode}
                        </option>
                      ))}
                    </Form.Control>
                    {error.selectPincode && (
                      <div style={{ color: "red", marginTop: "5px" }}>
                        {error.selectPincode}
                      </div>
                    )}
                  </Form.Group>
                </Col>

                {/* Select Technician */}
                <Col md={12}>
                  <Form.Group>
                    <label>Select Technician</label>
                    <div>
                      <Form.Check
                        type="checkbox"
                        className="custom-checkbox"
                        label="Select All"
                        checked={selectAll}
                        onChange={handleSelectAllChange}
                      />
                      {technicians.map((technician, i) => (
                        <div key={i}>
                          <Form.Check
                            type="checkbox"
                            className="custom-checkbox"
                            label={technician.technicianFullName}
                            value={technician.technicianFullName}
                            checked={selectedTechnicians.includes(
                              technician.technicianFullName,
                            )}
                            onChange={handleTechnicianChange}
                          />
                        </div>
                      ))}
                    </div>
                    {error.selectTechnician && (
                      <div style={{ color: "red", marginTop: "5px" }}>
                        {error.selectTechnician}
                      </div>
                    )}
                  </Form.Group>
                </Col>
              </>
            )}
          </Row>

          {/* Save Button */}
          <div className="mt-4 text-end">
            <Link
              to="/bookTechnicianNotificationGrid"
              className="btn btn-warning text-white mx-2"
              title="Back"
            >
              <ArrowLeftIcon />
            </Link>
            <Button
              className="btn btn-warning text-white mx-2"
              onClick={handleUpdateJobDescription}
              title="Forward"
            >
              <ForwardIcon />
            </Button>
          </div>
        </Form>

        {/* Styles for floating menu */}
        <style jsx>{`
          .floating-menu {
            position: fixed;
            top: 80px; /* Increased from 20px to avoid overlapping with the logo */
            left: 20px; /* Adjusted for placement on the left side */
            z-index: 1000;
          }
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
        `}</style>
      </div>
    </div>
  );
};

export default BookTechnicianActionView;
