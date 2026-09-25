import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "react-bootstrap";
import { Dashboard as MoreVertIcon } from "@mui/icons-material";
import "bootstrap/dist/css/bootstrap.min.css";
import AdminSidebar from "./AdminSidebar";
// import { appConfig } from "./config";

const AdminGroceryApproval = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { selectedUserType, id } = useParams();
  const [groceryData, setGroceryData] = useState(null);
  const [imageUrls, setImageUrls] = useState([]);
  const [status, setStatus] = useState("Approved");
  const [comments, setComments] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/UploadGrocery/GetGroceryItems/${id}`,
        );
        const data = await response.json();
        setGroceryData(data);

        const imageRequests =
          data.images?.map((photo) =>
            fetch(
              `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/FileUpload/download?generatedfilename=${photo}`,
            )
              .then((res) => res.json())
              .then((data) => ({
                src: photo,
                imageData: data.imageData,
              })),
          ) || [];

        const image = await Promise.all(imageRequests);
        setImageUrls(image);
      } catch (error) {
        console.error("Error fetching grocery data:", error);
      }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSubmit = async () => {
    if (!groceryData) return;

    const payload = {
      ...groceryData,
      status,
      comments,
      RequestedBy: "Admin",
      Code: code,
      Units: units,
      Limit: limit,
    };

    try {
      const response = await fetch(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/UploadGrocery/UpdateGroceryItems?id=${id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (response.ok) {
        alert("Grocery Status Updated Successfully.");
        navigate(`/adminGroceryList/Admin`);
      } else {
        alert("Failed to update grocery. Please try again.");
      }
    } catch (error) {
      console.error("Error submitting grocery data:", error);
      alert("An error occurred. Please try again later.");
    }
  };

  if (!groceryData) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  const {
    name,
    category,
    mrp,
    discount,
    stockLeft,
    deliveryIn,
    requestedBy,
    afterDiscount,
    code,
    units,
    limit,
    manufactureDate,
    expireDate,
  } = groceryData;

  return (
    <div className="d-flex flex-row mt-100">
      {/* Sidebar */}
      {!isMobile && (
        <div className="ml-0 m-3 p-0 adm_mnu">
          <AdminSidebar userType={selectedUserType} />
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
              <AdminSidebar userType={selectedUserType} />
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className={`container mt-4 ${isMobile ? "w-100" : "w-75"}`}>
        <div className="col-md-11 bg-white p-2 rounded shadow-sm">
          <h3 className="mb-2 text-center fw-bold">🛒 Grocery Approval 🛒</h3>
          <div className="row align-items-center mb-2">
            {/* Image Section */}
            <div className="col-md-5 text-center">
              {imageUrls.length > 0 ? (
                <img
                  src={`data:image/jpeg;base64,${imageUrls[0].imageData}`}
                  alt={groceryData.name}
                  className="img-fluid rounded shadow-sm"
                  style={{
                    maxHeight: "200px",
                    objectFit: "contain",
                    borderRadius: "20px",
                  }}
                />
              ) : (
                <div
                  className="d-flex justify-content-center align-items-center bg-light rounded shadow-sm"
                  style={{ height: "250px", borderRadius: "20px" }}
                >
                  <span className="text-muted">No Image</span>
                </div>
              )}
            </div>

            {/* Details Section */}
            <div className="col-md-7">
              <div className="row">
                <div className="col-sm-6">
                  <p>
                    <strong>Name:</strong> {name}
                  </p>
                  <p>
                    <strong>Category:</strong> {category}
                  </p>
                  <p>
                    <strong>Rate:</strong> Rs {mrp} /-
                  </p>
                  <p>
                    <strong>Discount:</strong> {discount}%
                  </p>
                  <p className="text-success fw-bold">
                    <strong>Final Price:</strong> Rs{" "}
                    {Number(afterDiscount).toFixed(0)} /-
                  </p>
                  <p>
                    <strong>Stock Left:</strong> {stockLeft}
                  </p>
                </div>
                <div className="col-sm-6">
                  <p>
                    <strong>Requested By:</strong> {requestedBy}
                  </p>
                  <p>
                    <strong>Delivery In:</strong> {deliveryIn} Minutes
                  </p>
                  <p>
                    <strong>Units:</strong> {units}
                  </p>
                  <p>
                    <strong>Code:</strong> {code}
                  </p>
                  <p>
                    <strong>Manufacture Date:</strong> {manufactureDate}
                  </p>
                  <p>
                    <strong>Expiry Date:</strong> {expireDate}
                  </p>
                  <p>
                    <strong>Limit: </strong> {limit}{" "}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Approval Section */}
          <div className="border-top pt-3">
            <h5 className="mb-3">Approval Status</h5>
            <div className="d-flex gap-4 mb-3">
              <div className="form-check">
                <input
                  type="radio"
                  className="form-check-input"
                  name="productStatus"
                  id="approve"
                  value="Approved"
                  checked={status === "Approved"}
                  onChange={() => setStatus("Approved")}
                />
                <label className="form-check-label" htmlFor="approve">
                  Approve
                </label>
              </div>
              <div className="form-check">
                <input
                  type="radio"
                  className="form-check-input"
                  name="productStatus"
                  id="reject"
                  value="Reject"
                  checked={status === "Reject"}
                  onChange={() => setStatus("Reject")}
                />
                <label className="form-check-label" htmlFor="reject">
                  {" "}
                  Reject
                </label>
              </div>
            </div>

            <textarea
              className="form-control mb-3"
              placeholder="Comments (optional)"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
            />

            {/* Buttons */}
            <div className="d-flex gap-3">
              <Button variant="success" onClick={handleSubmit}>
                Submit
              </Button>
              <Button
                variant="warning"
                className="text-white"
                onClick={() => navigate(`/adminGroceryList/Admin`)}
              >
                Back
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminGroceryApproval;
