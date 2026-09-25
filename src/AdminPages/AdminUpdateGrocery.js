import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { Button } from "react-bootstrap";
import "../App.css";
import VisibilityIcon from "@mui/icons-material/Visibility";
import UpdateIcon from "@mui/icons-material/Update";
import { useParams, useNavigate } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import { Dashboard as MoreVertIcon } from "@mui/icons-material";
// import { appConfig } from "./config";

const AdminUpdateGrocery = () => {
  const { id } = useParams();
  const [isMobile, setIsMobile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedUserType] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const navigate = useNavigate();
  const [groceryName, setGroceryName] = useState("");
  const [category, setCategory] = useState("");
  const [groceryPhotos, setGroceryPhotos] = useState([]);
  const [rate, setRate] = useState("");
  const [discount, setDiscount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [grocery, setGrocery] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [deliveryInDays, setDeliveryInDays] = useState("");
  const [groceryId, setGroceryID] = useState("");
  const [uniqueId, setUniqueId] = useState("");
  const [groceryStatus, setGroceryStatus] = useState("");
  const [existingFiles, setExistingFiles] = useState([]);
  const [stockLeft, setStockLeft] = useState("");
  const [date, setDate] = useState("");
  const [code, setCode] = useState("");
  const [units, setUnits] = useState("");
  const [manufactureDate, setManufactureDate] = useState("");
  const [expireDate, setExpireDate] = useState("");
  const [limit, setLimit] = useState();

  useEffect(() => {
    console.log(grocery);
  }, [grocery]);

  useEffect(() => {
    const fetchGroceryData = async () => {
      try {
        setLoading(true);
        const groceryResponse = await fetch(
          `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/UploadGrocery/GetGroceryItems/${id}`,
        );
        if (!groceryResponse.ok) {
          throw new Error("Grocery not found");
        }
        const groceryData = await groceryResponse.json();
        console.log("groceryData:", groceryData);
        setGrocery(groceryData);
        setUniqueId(groceryData.id);
        setGroceryName(groceryData.name);
        setGroceryID(groceryData.groceryItemId);
        setGroceryStatus(groceryData.status);
        setCategory(groceryData.category);
        setRate(groceryData.mrp);
        setDiscount(groceryData.discount);
        setDeliveryInDays(groceryData.deliveryIn);
        setExistingFiles(groceryData.images || []);
        setStockLeft(groceryData.stockLeft);
        setDate(groceryData.date);
        setCode(groceryData.code);
        setUnits(groceryData.units);
        setManufactureDate(groceryData.manufactureDate);
        setExpireDate(groceryData.expireDate);
        setLimit(groceryData.limit);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchGroceryData();
    }
  }, [id]);

  const handleRemoveExistingFile = (index) => {
    const updated = [...existingFiles];
    updated.splice(index, 1);
    setExistingFiles(updated);
  };

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);
    if (selectedFiles.length + groceryPhotos.length > 5) {
      alert("You can only upload up to 1 files.");
      return;
    }
    setGroceryPhotos([...groceryPhotos, ...selectedFiles]);
    setShowAlert(true);
  };

  // Detect screen size for responsiveness
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleRemoveFile = (index) => {
    const updatedUploadedFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(updatedUploadedFiles);
  };

  const handleUploadFiles = async () => {
    setLoading(true);
    setShowAlert(false);
    const uploadedFilesList = [];

    for (let i = 0; i < groceryPhotos.length; i++) {
      const file = groceryPhotos[i];
      const fileName = file.name;
      const mimeType = file.type;
      const byteArray = await getFileByteArray(file);

      const response = await uploadFile(byteArray, fileName, mimeType, file);
      if (response) {
        uploadedFilesList.push({
          src: response,
          alt: fileName,
        });
        alert("Image Updated Sucessfully");
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

  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault();
    const allGroceryPhotos = [
      ...existingFiles,
      ...uploadedFiles.map((file) => file.src),
    ];

    const payload = {
      id: uniqueId,
      Date: date,
      GroceryItemId: groceryId,
      Name: groceryName,
      Category: category,
      Images: allGroceryPhotos,
      MRP: parseFloat(rate).toString(),
      Discount: parseFloat(discount).toString(),
      AfterDiscount: (
        parseFloat(rate) -
        (parseFloat(rate) * parseFloat(discount)) / 100
      ).toString(),
      StockLeft: stockLeft,
      DeliveryIn: deliveryInDays,
      Status: groceryStatus,
      code: code,
      units: units,
      RequestedBy: "Admin",
      manufactureDate: manufactureDate,
      expireDate: expireDate,
      Limit: limit,
      VendorId: "",
    };
    try {
      const response = await fetch(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/UploadGrocery/UpdateGroceryItems?id=${uniqueId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (response.ok) {
        alert("Grocery updated successfully!");
        navigate(`/adminGroceryList/Admin`);
      } else {
        alert("Failed to update grocery.");
      }
    } catch (error) {
      alert("An error occurred while updating the grocery.");
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div className="d-flex flex-row justify-content-start align-items-start mt-mob-50">
      {/* Sidebar */}
      {!isMobile && (
        <div className="ml-0 m-4 p-0 adm_mnu">
          <AdminSidebar userType={selectedUserType} />
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
              <AdminSidebar userType={selectedUserType} />
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className={`container m-1 ${isMobile ? "w-100" : "w-75"}`}>
        <h3 className="mb-3 text-center">Update Grocery</h3>
        <div className="bg-white rounded-3 p-3 bx_sdw w-60 m-auto">
          <form onSubmit={handleSubmit}>
            {/* Product Name */}
            <div className="form-group">
              <label>
                Product Name <span className="req_star">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                value={groceryName}
                onChange={(e) => setGroceryName(e.target.value)}
                placeholder="Enter Product Name"
              />
            </div>
            {/* Category */}
            <div className="form-group">
              <label>Category</label>
              <input
                type="text"
                className="form-control"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Enter Category"
              />
            </div>
            {/* Units */}
            <div className="form-group">
              <label>Units</label>
              <input
                type="text"
                className="form-control"
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                placeholder="Enter Units"
              />
            </div>

            {/* Code */}
            <div className="form-group">
              <label>Code</label>
              <input
                type="text"
                className="form-control"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter Code"
              />
            </div>

            {/* Product Images */}
            <div className="form-group">
              <label>
                Product Photos <span className="req_star">*</span>
              </label>
              <input
                type="file"
                className="form-control"
                multiple
                onChange={handleFileChange}
              />

              {/* Render existing filenames from server */}
              {existingFiles.length > 0 && (
                <div className="mt-2">
                  <strong>Existing Photos:</strong>
                  {existingFiles.map((file, index) => (
                    <div
                      key={index}
                      className="d-flex align-items-center gap-2 mb-2"
                    >
                      <p>{file}</p>
                      <button
                        type="button"
                        onClick={() => handleRemoveExistingFile(index)}
                        className="btn btn-danger btn-sm px-2 py-1"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Render newly added files */}
              {groceryPhotos.length > 0 && (
                <div className="mt-2">
                  <strong>New Uploads:</strong>
                  {groceryPhotos.map((file, index) => (
                    <div
                      key={index}
                      className="d-flex align-items-center gap-2 mb-2"
                    >
                      <p>{file.name}</p>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="btn btn-danger btn-sm px-2 py-1"
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              {/* Alert for uploading files */}
              {showAlert && (
                <div className="alert alert-danger  mt-2">
                  Please click the <strong>Upload Files</strong> button to
                  upload the selected images.
                </div>
              )}
              <button
                type="button"
                className="btn btn-primary mt-2"
                onClick={handleUploadFiles}
                disabled={loading || groceryPhotos.length === 0}
              >
                {loading ? "Uploading..." : "Upload Files"}
              </button>
            </div>
            {/* Rate */}
            <div className="form-group">
              <label>Rate</label>
              <input
                type="text"
                className="form-control"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="Enter Product Rate"
              />
            </div>

            {/* Discount */}
            <div className="form-group">
              <label>Discount</label>
              <input
                type="text"
                className="form-control"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="If any Discount Enter Percentage"
              />
            </div>

            {/* After Discount Price*/}
            <div className="form-group">
              <label>After Discount Price</label>
              <input
                type="text"
                className="form-control"
                value={`${Math.round(Number(rate || 0) * (1 - Number((discount || "0").toString().replace("%", "")) / 100))} /-`}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="If any Discount Enter Percentage"
              />
            </div>

            <div className="form-group">
              <label>
                Manufacture Date <span className="req_star">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                value={manufactureDate}
                onChange={(e) => setManufactureDate(e.target.value)}
                placeholder="Manufacture Date"
              />
            </div>

            <div className="form-group">
              <label>
                Expiry Date <span className="req_star">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                value={expireDate}
                onChange={(e) => setExpireDate(e.target.value)}
                placeholder="Expiry Date"
              />
            </div>

            <div className="form-group">
              <label>
                Limit <span className="req_star">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                placeholder="Limit"
              />
            </div>

            <div className="form-group">
              <label>
                Delivery In Minutes <span className="req_star">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                value={deliveryInDays}
                onChange={(e) => setDeliveryInDays(e.target.value)}
                placeholder="Delivery In Minutes"
              />
            </div>

            <div className="form-group">
              <label>
                Stock Left <span className="req_star">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                value={stockLeft}
                onChange={(e) => setStockLeft(e.target.value)}
                placeholder="Stock Left"
              />
            </div>

            {/* Submit Button */}
            <div className="d-flex justify-content-between gap-3 mt-3">
              {/* Update Product Button */}
              <button
                type="submit"
                className="btn btn-success w-100 d-flex justify-content-center align-items-center p-3 shadow-lg"
              >
                <UpdateIcon className="me-2" />
                <span>Update Grocery</span>
              </button>

              {/* View Single Product Button */}
              <button
                type="button"
                className="btn btn-primary w-100 d-flex justify-content-center align-items-center p-3 shadow-lg"
                onClick={() => navigate(`/adminGroceryList/Admin`)}
              >
                <VisibilityIcon className="me-2" />
                <span>View Product</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminUpdateGrocery;
