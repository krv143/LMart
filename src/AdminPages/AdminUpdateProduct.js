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

const AdminUpdate = () => {
  const { id } = useParams();
  const [isMobile, setIsMobile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedUserType] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const navigate = useNavigate();
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [catalogue, setCatalogue] = useState("");
  const [productSize, setProductSize] = useState("");
  const [units, setUnits] = useState("");
  const [productPhotos, setProductPhotos] = useState([]);
  const [rate, setRate] = useState("");
  const [discount, setDiscount] = useState("");
  const [specifications, setSpecifications] = useState([
    { label: "", value: "" },
  ]);
  const [warranty, setWarranty] = useState("");
  const [moreInfo, setMoreInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [product, setProduct] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [color, setColor] = useState("");
  const [specificationDesc, setSpecificationDesc] = useState("");
  const [deliveryInDays, setDeliveryInDays] = useState("");
  const [productId, setProductID] = useState("");
  const [uniqueId, setUniqueId] = useState("");
  const [productStatus, setProductStatus] = useState("");
  const [existingFiles, setExistingFiles] = useState([]);
  const [stockLeft, setStockLeft] = useState("");
  useEffect(() => {
    const fetchProductData = async () => {
      try {
        setLoading(true);
        const productResponse = await fetch(
          `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/Product/${id}`,
        );
        if (!productResponse.ok) {
          throw new Error("Product not found");
        }
        const productData = await productResponse.json();
        console.log("productData:", productData);
        setProduct(productData);
        setUniqueId(productData.id);
        setProductName(productData.productName);
        setProductID(productData.productId);
        setProductStatus(productData.productStatus);
        setCategory(productData.category);
        setCatalogue(productData.catalogue);
        setColor(productData.color);
        setProductSize(productData.productSize);
        setUnits(productData.units);
        setRate(productData.rate);
        setDiscount(productData.discount);
        setSpecifications(
          productData.specifications || [{ label: "", value: "" }],
        );
        setSpecificationDesc(productData.specificationDesc);
        setWarranty(productData.warranty);
        setMoreInfo(productData.additionalInformation);
        setDeliveryInDays(productData.deliveryInDays);
        setExistingFiles(productData.productPhotos || []);
        setStockLeft(productData.numberOfStockAvailable);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchProductData();
    }
  }, [id]);

  const handleRemoveExistingFile = (index) => {
    const updated = [...existingFiles];
    updated.splice(index, 1);
    setExistingFiles(updated);
  };

  // Handle file input change (multiple files)
  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);
    if (selectedFiles.length + productPhotos.length > 5) {
      alert("You can only upload up to 5 files.");
      return;
    }
    setProductPhotos([...productPhotos, ...selectedFiles]);
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

  // Handle file upload
  const handleUploadFiles = async () => {
    setLoading(true);
    setShowAlert(false);
    const uploadedFilesList = [];
    // Loop through selected files and upload each one
    for (let i = 0; i < productPhotos.length; i++) {
      const file = productPhotos[i];
      const fileName = file.name;
      const mimeType = file.type;
      // Convert the file to a byte array (use FileReader)
      const byteArray = await getFileByteArray(file);
      // Upload the file and get the response (filename or URL)
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

  // Convert the file to a byte array
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

  // Upload the file using the backend API
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
    const allProductPhotos = [
      ...existingFiles,
      ...uploadedFiles.map((file) => file.src),
    ];

    const payload = {
      id: uniqueId,
      ProductId: productId,
      deliveryInDays: deliveryInDays,
      category: category,
      ProductStatus: productStatus,
      productName,
      productPhotos: allProductPhotos,
      catalogue: catalogue,
      productSize: productSize,
      color: color,
      units: units,
      rate: parseFloat(rate),
      discount: parseFloat(discount),
      afterDiscount: (
        parseFloat(rate) -
        (parseFloat(rate) * parseFloat(discount)) / 100
      ).toString(),
      specifications: specifications.map((spec) => ({
        label: spec.label,
        value: spec.value,
      })),
      specificationDesc: specificationDesc,
      warranty: warranty,
      AdditionalInformation: moreInfo,
      ProductOwnedBy: "Admin",
      numberOfStockAvailable: stockLeft,
    };

    try {
      const response = await fetch(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/Product/${uniqueId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (response.ok) {
        alert("Product updated successfully!");
        navigate(`/adminProductList/Admin`);
      } else {
        alert("Failed to update product.");
      }
    } catch (error) {
      alert("An error occurred while updating the product.");
    }
  };

  // Handle change of specification field (label or value)
  const handleSpecificationChange = (index, field, value) => {
    const updatedSpecifications = [...specifications];
    updatedSpecifications[index][field] = value;
    setSpecifications(updatedSpecifications);
  };

  const handleSpecificationDescChange = (value) => {
    setSpecificationDesc(value);
  };

  // Handle removal of a specification
  const handleRemoveSpecification = (index) => {
    const updatedSpecifications = specifications.filter((_, i) => i !== index);
    setSpecifications(updatedSpecifications);
  };

  // Handle adding a new specification
  const handleAddSpecification = () => {
    setSpecifications([...specifications, { label: "", value: "" }]);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!product) {
    return <div>No data available for the selected product.</div>;
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
        <h3 className="mb-3 text-center">Update Products</h3>
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
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
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
                placeholder="Enter Catalogue"
              />
            </div>

            {/* Catalogue */}
            <div className="form-group">
              <label>
                Catalogue<span className="req_star">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                value={catalogue}
                onChange={(e) => setCatalogue(e.target.value)}
                placeholder="Enter Catalogue"
              />
            </div>

            {/* Product Size */}
            <div className="form-group">
              <label>
                Size<span className="req_star">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                value={productSize}
                onChange={(e) => setProductSize(e.target.value)}
                placeholder="Enter Product Size"
              />
            </div>

            {/* Color */}
            <div className="form-group">
              <label>Color(Optional)</label>
              <input
                type="text"
                className="form-control"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Enter Color"
              />
            </div>

            {/* Units */}
            <div className="form-group">
              <label>
                Units <span className="req_star">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                placeholder="Enter Units"
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
              {productPhotos.length > 0 && (
                <div className="mt-2">
                  <strong>New Uploads:</strong>
                  {productPhotos.map((file, index) => (
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
                disabled={loading || productPhotos.length === 0}
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

            {/* After Discount Price */}
            <div className="form-group">
              <label>After Discount Price</label>
              <input
                type="text"
                className="form-control"
                value={`${Math.round(Number(rate || 0) - (Number(rate || 0) * Number((discount || "0").toString().replace("%", ""))) / 100)} /-`}
                placeholder="If any Discount Enter Percentage"
              />
            </div>

            {/* Product Specifications */}
            <div className="form-group">
              <label>
                Product Specifications <span className="req_star">*</span>
              </label>
              {specifications.map((spec, index) => (
                <div key={index} className="d-flex gap-3">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Specification Name"
                    value={spec.label}
                    onChange={(e) =>
                      handleSpecificationChange(index, "label", e.target.value)
                    }
                  />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Specification Value"
                    value={spec.value}
                    onChange={(e) =>
                      handleSpecificationChange(index, "value", e.target.value)
                    }
                  />
                  <button
                    type="button"
                    className="btn btn-danger mb-1"
                    onClick={() => handleRemoveSpecification(index)}
                  >
                    Remove
                  </button>
                </div>
              ))}

              <textarea
                type="text"
                className="form-control mt-2"
                placeholder="Optional"
                value={specificationDesc}
                onChange={(e) => handleSpecificationDescChange(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAddSpecification}
              >
                Add Specification
              </button>
            </div>

            {/* Warranty and Additional Info */}
            <div className="form-group">
              <label>Warranty</label>
              <input
                type="text"
                className="form-control"
                value={warranty}
                onChange={(e) => setWarranty(e.target.value)}
                placeholder="Enter Warranty Period"
              />
            </div>

            <div className="form-group">
              <label>More Info</label>
              <input
                type="text"
                className="form-control"
                value={moreInfo}
                onChange={(e) => setMoreInfo(e.target.value)}
                placeholder="Additional Information"
              />
            </div>

            <div className="form-group">
              <label>
                Delivery In Days <span className="req_star">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                value={deliveryInDays}
                onChange={(e) => setDeliveryInDays(e.target.value)}
                placeholder="Delivery In Days"
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
                <span>Update Product</span>
              </button>

              {/* View Single Product Button */}
              <button
                type="button"
                className="btn btn-primary w-100 d-flex justify-content-center align-items-center p-3 shadow-lg"
                onClick={() => navigate(`/adminProductList/Admin`)}
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

export default AdminUpdate;
