import React, { useState, useEffect } from "react";
import { Button, Form, Row, Col } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import AdminSidebar from "./AdminSidebar";
import Footer from "../CommonPages/Footer.js";
// import { appConfig } from "./config";
import { Dashboard as MoreVertIcon } from "@mui/icons-material";
// import { FaEdit} from 'react-icons/fa'; // Correct icon import
import ArrowLeftIcon from "@mui/icons-material/ArrowLeft";
// import SaveAsIcon from '@mui/icons-material/SaveAs';
import ForwardIcon from "@mui/icons-material/Forward";
import { Link, useParams, useNavigate } from "react-router-dom";
import "../App.css";
import JSZip from "jszip";
import { saveBlob } from "../utils/nativeFile";
const RaiseActionView = () => {
  const Navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { raiseTicketId } = useParams();
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [id, setId] = useState("");
  const [address, setAddress] = useState("");
  const [isMaterialType, setIsWithMaterial] = useState("");
  const [ticketData, setTicketData] = useState(null);
  const [requestType, setRequestType] = useState("Without Material");
  const [specifications, setSpecifications] = useState([
    { material: "", quantity: "" },
  ]);
  const [commentsList, setCommentsList] = useState([
    { updatedDate: new Date(), commentText: "" },
  ]);
  const [loading, setLoading] = useState(true);
  const [attachments, setAttachments] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [zipCode, setzipCode] = useState("");
  const [status, setStatus] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [newPhotoCount, setPhotoCount] = useState(0);
  const [fullName, setFullName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhoneNumber, setCustomerPhoneNumber] = useState("");

  useEffect(() => {
    console.log(ticketData, status);
  }, [ticketData, status]);

  useEffect(() => {
    const fetchticketData = async () => {
      try {
        const response = await fetch(
          `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/RaiseTicket/GetTicket/${raiseTicketId}`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch ticket data");
        }
        const data = await response.json();
        //  alert(JSON.stringify(data));
        setTicketData(data);
        setState(data.state);
        setDistrict(data.district);
        setzipCode(data.zipCode);
        setAddress(data.address);
        setId(data.id);
        setCustomerId(data.customerId);
        setIsWithMaterial(data.isMaterialType);
        setAssignedTo(data.assignedTo);
        setStatus(data.status);
        setFullName(data.customerName);
        setCustomerPhoneNumber(data.customerPhoneNumber);
        setRequestType(data.requestType || "Without Material");
        setSpecifications(data.materials || [{ material: "", quantity: "" }]);
        setCustomerEmail(data.customerEmail);
        //setSpecifications(productData.specifications || [{ label: "", value: "" }]);
        setCommentsList(
          data.comments || [{ updatedDate: new Date(), commentText: "" }],
        );
        const imageRequests =
          data.attachments?.map((photo) =>
            fetch(
              `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/FileUpload/download?generatedfilename=${photo}`,
            )
              .then((res) => res.json())
              .then((data) => ({
                src: photo,
                imageData: data.imageData,
              })),
          ) || [];
        const images = await Promise.all(imageRequests);
        setAttachments(images);
        setPhotoCount(images.length);
      } catch (error) {
        console.error("Error fetching ticket data:", error);
        // window.alert('Failed to load ticket data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchticketData();
  }, [raiseTicketId]);

  // Handle material input change
  const handleMaterialChange = (index, field, value) => {
    const updatedMaterials = [...specifications];
    updatedMaterials[index][field] = value;
    setSpecifications(updatedMaterials);
  };

  // Add new material and quantity fields
  const handleAddMaterial = () => {
    setSpecifications([...specifications, { material: "", quantity: "" }]);
  };

  // Remove a material and its corresponding quantity
  const handleRemoveMaterial = (index) => {
    setSpecifications(specifications.filter((_, i) => i !== index));
  };
  const handleDownloadAllAttachments = async () => {
    if (attachments.length === 0) {
      alert("No files to download");
      return;
    }

    const zip = new JSZip();
    const folder = zip.folder("TicketAttachments"); // Optional folder name inside ZIP

    // Add files to ZIP
    for (const attachment of attachments) {
      try {
        const response = await fetch(
          `data:image/jpeg;base64,${attachment.imageData}`,
        );
        const blob = await response.blob();
        folder.file(attachment.src.split("/").pop(), blob); // Add file to the ZIP folder
      } catch (error) {
        console.error("Error fetching attachment:", error);
      }
    }

    // Generate ZIP and download
    try {
      const content = await zip.generateAsync({ type: "blob" });
      saveBlob(content, "TicketAttachments.zip");
    } catch (error) {
      console.error("Error generating ZIP:", error);
      alert("Failed to download attachments. Please try again.");
    }
  };
  const handleAddComment = (index, field, value) => {
    const updatedComments = [...commentsList];
    updatedComments[index][field] = value;
    setCommentsList(updatedComments);
  };

  // Detect screen size for responsiveness
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize(); // Set initial state
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle form data changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setTicketData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  const handleSaveTicket = async (e) => {
    e.preventDefault();

    const payload = {
      RaiseTicketId: ticketData.raiseTicketId,
      date: new Date(),
      address: address,
      subject: ticketData.subject,
      details: ticketData.details,
      category: ticketData.category,
      assignedTo: "Technical Agency",
      id: id,
      status: ticketData.status,
      InternalStatus: "Assigned",
      TicketOwner: ticketData.customerId,
      CustomerId: customerId,
      state: state,
      isMaterialType: isMaterialType,
      district: district,
      ZipCode: zipCode,
      RequestType: requestType,
      attachments: attachments.map((file) => file.src),
      materials: specifications.map((spec) => ({
        material: spec.material,
        quantity: spec.quantity,
      })),
      comments: commentsList.map((comment) => ({
        updatedDate: comment.updatedDate,
        commentText: comment.commentText,
      })),
      LowestBidderTechnicainId: "",
      LowestBidderDealerId: "",
      ApprovedAmount: "",
      customerName: fullName,
      Option1Day: "",
      Option1Time: "",
      Option2Day: "",
      Option2Time: "",
      TechnicianList: [],
      DealerList: [],
      Rating: "",
      RateQuotedBy: "",
      CustomerEmail: customerEmail,
      OrderId: "",
      OrderDate: "",
      PaidAmount: "",
      TransactionStatus: "",
      TransactionType: "",
      InvoiceId: "",
      InvoiceURL: "",
      CustomerPhoneNumber: customerPhoneNumber,
      PaymentMode: "",
      UTRTransactionNumber: "",
    };
    try {
      const response = await fetch(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/RaiseTicket/${raiseTicketId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        throw new Error("Failed to save ticket data");
      }
      alert("Ticket saved Successfully!");
      Navigate(`/adminNotifications`);
    } catch (error) {
      console.error("Error saving ticket data:", error);
      window.alert("Failed to save the ticket data. Please try again later.");
    }
  };

  // const handleForwardTicket = async () => {
  //   try {
  //     const updatedTicket = {
  //       ...ticketData,
  //       status: "Assigned",
  //       assignedTo: "",
  //     };
  //     setTicketData(updatedTicket);
  //     alert("Ticket Forwarded successfully to Technician");
  //   } catch (error) {
  //     console.error("Error Forwarding ticket:", error);
  //     alert("Failed to forward the ticket. Please try again.")
  //   }
  // };

  return (
    <>
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
          <h1 className="text-center mb-2 mx-5">Raise a Ticket Action View</h1>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group>
                  <label>Ticket ID</label>
                  <Form.Control
                    type="text"
                    name="ticketID"
                    value={ticketData.raiseTicketId}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>

              {/* Status */}
              <Col md={6}>
                <Form.Group>
                  <label>Status</label>
                  <Form.Control
                    as="select"
                    name="status"
                    value={ticketData.status}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Status</option>
                    <option>Open Tickets</option>
                    <option>Assigned</option>
                    <option>Pending Tickets</option>
                    <option>Closed Tickets</option>
                  </Form.Control>
                </Form.Group>
              </Col>
            </Row>
            {/* Subject */}
            <Row>
              <Col md={12}>
                <Form.Group>
                  <label>Subject</label>
                  <Form.Control
                    type="text"
                    name="subject"
                    value={ticketData.subject}
                    onChange={handleChange}
                    placeholder="Subject"
                    required
                    readOnly
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Details */}
            <Form.Group>
              <label>Details</label>
              <Form.Control
                as="textarea"
                name="details"
                value={ticketData.details}
                onChange={handleChange}
                rows="4"
                placeholder="Details"
                required
                readOnly
              />
            </Form.Group>

            {/* Ticket Owner */}
            <Row>
              <Col md={12}>
                <Form.Group>
                  <label>Ticket Owner</label>
                  <Form.Control
                    type="text"
                    name="ticketOwner"
                    value={ticketData.customerId}
                    onChange={handleChange}
                    placeholder="Ticket Owner"
                    required
                    readOnly
                  />
                </Form.Group>
              </Col>
            </Row>

            {/*Customer Name*/}
            <Row>
              <Col md={12}>
                <Form.Group>
                  <label>Customer Name</label>
                  <Form.Control
                    type="text"
                    name="customerName"
                    value={ticketData.customerName}
                    onChange={handleChange}
                    placeholder="Customer Name"
                    required
                    readOnly
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Customer Address */}
            <Row>
              <Col md={12}>
                <Form.Group>
                  <label>Customer Address</label>
                  <Form.Control
                    as="textarea"
                    type="text"
                    name="address"
                    value={[
                      address,
                      district,
                      state,
                      zipCode,
                      customerPhoneNumber,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                    onChange={handleChange}
                    placeholder="Customer Address"
                    readOnly
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
                    value={ticketData.category}
                    onChange={handleChange}
                    placeholder="Category"
                    required
                    readOnly
                  ></Form.Control>
                </Form.Group>
              </Col>
            </Row>

            {/*Attachments*/}

            <div className="form-group mt-4">
              <label>
                Customer Uploaded Photos{" "}
                {newPhotoCount > 0 && (
                  <span
                    className="badge bg-danger"
                    style={{ fontSize: "18px" }}
                  >
                    {newPhotoCount}
                  </span>
                )}
              </label>

              <Button
                className="btn btn-primary m-3"
                onClick={handleDownloadAllAttachments}
              >
                Download All Attachments
              </Button>

              <div
                id="ticketCarousel"
                className="carousel slide mb-4 rounded"
                data-bs-ride="carousel"
              >
                <div className="carousel-indicators">
                  {attachments.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      data-bs-target="#ticketCarousel"
                      data-bs-slide-to={index}
                      className={index === 0 ? "active" : ""}
                      aria-current={index === 0 ? "true" : "false"}
                      aria-label={`Slide ${index + 1}`}
                    ></button>
                  ))}
                </div>

                <div className="carousel-inner">
                  {attachments.map((img, index) => (
                    <div
                      className={`carousel-item ${index === 0 ? "active" : ""}`}
                      key={img.src}
                    >
                      <img
                        src={`data:image/jpeg;base64,${img.imageData}`}
                        className="d-block w-50 rounded"
                        style={{ maxHeight: "200px", objectFit: "cover" }}
                        alt={`Slide ${index + 1}`}
                      />
                    </div>
                  ))}
                </div>

                <button
                  className="carousel-control-prev"
                  type="button"
                  data-bs-target="#ticketCarousel"
                  data-bs-slide="prev"
                >
                  <span
                    className="carousel-control-prev-icon"
                    aria-hidden="true"
                  ></span>
                  <span className="visually-hidden">Previous</span>
                </button>
                <button
                  className="carousel-control-next"
                  type="button"
                  data-bs-target="#ticketCarousel"
                  data-bs-slide="next"
                >
                  <span
                    className="carousel-control-next-icon"
                    aria-hidden="true"
                  ></span>
                  <span className="visually-hidden">Next</span>
                </button>
              </div>
            </div>

            {/* Assigned To */}
            <Row>
              <Col md={12}>
                <Form.Group>
                  <label>Assigned To</label>
                  <Form.Control
                    as="select"
                    name="assignedTo"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    required
                  >
                    <option>Select Assigned</option>
                    <option>Customer Care</option>
                    <option>Customer</option>
                    <option>Technical Agency</option>
                  </Form.Control>
                </Form.Group>
              </Col>
            </Row>

            <div className="radio">
              <label className="m-1">
                <input
                  className="form-check-input m-2 border-dark"
                  type="radio"
                  name="RequestType"
                  value="With Material"
                  checked={requestType === "With Material"}
                  // onChange={(e) => setRequestType(e.target.value)}
                  required
                />
                With Material
              </label>

              <label className="m-1">
                <input
                  className="form-check-input m-2 border-dark"
                  type="radio"
                  name="RequestType"
                  value="Without Material"
                  checked={requestType === "Without Material"}
                  // onChange={(e) => setRequestType(e.target.value)}
                />
                Without Material
              </label>

              {/* Material Input Fields */}
              {requestType === "With Material" && (
                <div className="form-group">
                  <label>Required (Optional)</label>
                  <div className="d-flex gap-3 mb-2">
                    <div style={{ flex: 4 }} className="text-start">
                      <label className="fw-bold mb-0">Material</label>
                    </div>
                    <div style={{ flex: 4 }} className="text-start">
                      <label className="fw-bold mb-0">Quantity</label>
                    </div>
                  </div>
                  {specifications.map((spec, index) => (
                    <div className="d-flex gap-3 mb-2" key={index}>
                      <input
                        type="text"
                        className="form-control"
                        value={spec.material}
                        placeholder="Enter Material"
                        onChange={(e) =>
                          handleMaterialChange(
                            index,
                            "material",
                            e.target.value,
                          )
                        }
                        readOnly
                      />
                      <input
                        type="text"
                        className="form-control text-center"
                        placeholder="Enter Quantity"
                        value={spec.quantity}
                        onChange={(e) =>
                          handleMaterialChange(
                            index,
                            "quantity",
                            e.target.value,
                          )
                        }
                        readOnly
                      />
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => handleRemoveMaterial(index)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleAddMaterial}
                  >
                    Add Material
                  </button>
                </div>
              )}
            </div>

            {/* Add Comments */}

            <div className="form-group">
              <label>Add Comment</label>
              {commentsList.map((comment, index) => (
                <div className="d-flex gap-3 mb-2" key={index}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Comment Text"
                    value={comment.commentText}
                    onChange={(e) =>
                      handleAddComment(index, "commentText", e.target.value)
                    }
                  />
                </div>
              ))}
            </div>

            {/* Save Button */}
            <div className="mt-4 text-end">
              <Link
                to="/raiseTicketNotification"
                className="btn btn-warning text-white mx-2"
                title="Back"
              >
                <ArrowLeftIcon />
              </Link>
              {/* <Link to='/raiseTicketActionView/{ticketId}' className="btn btn-warning text-white mx-2" title='Edit'> 
          <FaEdit />
          </Link> */}
              {/* <Button onClick={handleForwardTicket} className="btn btn-warning text-white mx-2" title='Forward'
          disabled={status === "Assigned" && assignedTo === "Technical Agency"}>
            <SaveAsIcon />
          </Button> */}
              <Button
                onClick={handleSaveTicket}
                type="submit"
                className="btn btn-warning text-white mx-2"
                title="Forward"
                disabled={
                  status === "Assigned" && assignedTo === "Technical Agency"
                }
              >
                <ForwardIcon />
              </Button>
            </div>
          </Form>
        </div>

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
      <Footer />
    </>
  );
};

export default RaiseActionView;
