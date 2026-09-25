import React, { useState, useEffect, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "../App.css"; // Add this for the required CSS.
// import { useNavigate } from 'react-router-dom';
// import VisibilityIcon from '@mui/icons-material/Visibility';
import UploadIcon from "@mui/icons-material/Upload";
import AdminSidebar from "./AdminSidebar";
import { ArrowBack, Dashboard as MoreVertIcon } from "@mui/icons-material";
import { Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Footer from "../CommonPages/Footer.js";
// import { appConfig } from "./config";

const UploadBookTechnician = () => {
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [category, setCategory] = useState("");
  const [selectedJobs, setSelectedJobs] = useState([
    {
      jobDescription: "",
      rate: "",
      discount: "",
      afterDiscount: "",
      remarks: "",
      moreInfo: "",
    },
  ]);
  const Navigate = useNavigate();
  const remarksRef = useRef(null);
  const moreInfoRef = useRef(null);

  // Detect screen size for responsiveness
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize(); // Set initial state
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (remarksRef.current) {
      remarksRef.current.style.height = "auto";
      remarksRef.current.style.height = `${remarksRef.current.scrollHeight}px`;
    }
    if (moreInfoRef.current) {
      moreInfoRef.current.style.height = "auto";
      moreInfoRef.current.style.height = `${moreInfoRef.current.scrollHeight}px`;
    }
  }, [selectedJobs]);

  const handleJobChange = (index, field, value) => {
    const updatedJobs = [...selectedJobs];
    updatedJobs[index][field] =
      field === "rate" || field === "discount" ? parseFloat(value) || 0 : value;

    if (field === "rate" || field === "discount") {
      const rate = parseFloat(updatedJobs[index].rate) || 0;
      const discount = parseFloat(updatedJobs[index].discount) || 0;
      updatedJobs[index].afterDiscount = (
        rate -
        (rate * discount) / 100
      ).toFixed(0);
    }

    setSelectedJobs(updatedJobs);
  };

  const handleUploadJobDescription = async (e) => {
    e.preventDefault();

    if (!category) {
      setError("Must select a category!");
      return;
    }
    setError("");

    const payload1 = {
      id: "string",
      createdAt: new Date(),
      uploadBookTechnicianId: "string",
      category: category,
      selectedJobs: selectedJobs.map((job) => ({
        jobDescription: job.jobDescription,
        rate: job.rate.toString(),
        discount: job.discount.toString(),
        afterDiscount: job.afterDiscount.toString(),
        remarks: job.remarks,
        moreInfo: job.moreInfo,
      })),
    };

    try {
      const response = await fetch(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/UploadJobDescriptionBookTechnician/CreateUploadJobDescriptionBookTechnician`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload1),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to create Upload Job Description.");
      }
      alert("Job Description Done successfully!");
      Navigate(`/bookTechnicianList`);
    } catch (error) {
      console.error("Error:", error);
      window.alert(
        "Failed to create the Job Description. Please try again later.",
      );
    }
  };

  return (
    <>
      <div className="d-flex flex-row justify-content-start align-items-start mt-mob-50">
        {/* Sidebar menu for Larger Screens */}
        {!isMobile && (
          <div className=" ml-0 p-0 adm_mnu h-90">
            <AdminSidebar />
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
                <AdminSidebar />
              </div>
            )}
          </div>
        )}

        <div className={`container m-3 ${isMobile ? "w-100" : "w-75"}`}>
          <h3 className="mb-3 text-center">Upload Job Description</h3>
          <div className="bg-white rounded-3 p-3 bx_sdw w-60 m-auto">
            <form onSubmit={handleUploadJobDescription}>
              {/* Product Name */}
              {/* <div className="form-group">
              <label>Product Name <span className="req_star">*</span></label>
              <input
                type="text"
                className="form-control"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Enter Product Name"
              />
            </div> */}
              {/* Category */}
              <div className="form-group">
                <label>
                  Category<span className="req_star m-1">*</span>
                </label>
                <select
                  as="select"
                  className="form-control"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  <option value="">Choose Category</option>
                  <option value="Plumbing and Sanitary">
                    Plumbing and Sanitary
                  </option>
                  <option value="Electrical">Electrical</option>
                  <option value="Painting">Painting</option>
                  <option value="Interior">Interior</option>
                  <option value="Carpentry">Carpentry</option>
                  <option value="Pest Control">Pest Control</option>
                  <option value="Electronics Appliance Repairs">
                    Electronics Appliance Repairs
                  </option>
                  <option value="Tiles Repairs">Tiles Repairs</option>
                  <option value="Civil Works">Civil Works</option>
                  <option value="Water Proofing Works">
                    Water Proofing Works
                  </option>
                </select>
                {error && (
                  <div style={{ color: "red", marginTop: "5px" }}>{error}</div>
                )}
              </div>

              <div>
                {selectedJobs.map((job, index) => (
                  <div key={index}>
                    {/* Job Description */}
                    <div className="form-group">
                      <label>
                        Job Description<span className="req_star">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={job.jobDescription}
                        onChange={(e) =>
                          handleJobChange(
                            index,
                            "jobDescription",
                            e.target.value,
                          )
                        }
                        placeholder="Job Description"
                        required
                      />
                    </div>

                    {/* Rate */}
                    <div className="form-group">
                      <label>
                        Rate<span className="req_star">*</span>
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        value={job.rate}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (/^\d{0,5}(\.\d{0,2})?$/.test(value)) {
                            handleJobChange(index, "rate", value);
                          }
                        }}
                        placeholder="Enter Rate"
                        required
                      />
                    </div>

                    {/* Discount */}
                    <div className="form-group">
                      <label>Discount</label>
                      <input
                        type="text"
                        className="form-control"
                        value={job.discount}
                        onChange={(e) =>
                          handleJobChange(index, "discount", e.target.value)
                        }
                        placeholder="Enter Discount"
                      />
                    </div>

                    {/* After Discount */}
                    <div className="form-group">
                      <label>
                        After Discount<span className="req_star">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={job.afterDiscount}
                        onChange={(e) =>
                          handleJobChange(
                            index,
                            "afterDiscount",
                            e.target.value,
                          )
                        }
                        placeholder="Enter After Discount"
                        readOnly
                      />
                    </div>

                    {/* Detailed Job Description */}
                    <div className="form-group">
                      <label>
                        Detailed Job Description
                        <span className="req_star">*</span>
                      </label>
                      <textarea
                        ref={remarksRef}
                        name="remarks"
                        className="form-control"
                        value={job.remarks}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value.length <= 1000) {
                            handleJobChange(index, "remarks", value);
                          }
                        }}
                        style={{
                          resize: "none",
                          overflow: "auto",
                          minHeight: "30px",
                          maxHeight: "120px",
                        }}
                        rows={Math.max(5, Math.ceil(job.remarks.length / 100))}
                        placeholder="Detailed Job Description"
                        required
                      />
                      <small>{job.remarks.length}/1000 characters</small>
                    </div>

                    {/* Additional Info */}
                    <div className="form-group">
                      <label>More Info</label>
                      <textarea
                        ref={moreInfoRef}
                        className="form-control"
                        rows={Math.max(5, Math.ceil(job.moreInfo.length / 100))}
                        value={job.moreInfo}
                        style={{
                          resize: "none",
                          overflow: "auto",
                          minHeight: "30px",
                          maxHeight: "120px",
                        }}
                        onChange={(e) =>
                          handleJobChange(index, "moreInfo", e.target.value)
                        }
                        placeholder="Additional Information"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Product Photos */}
              {/* <div className="form-group">
              <label>Product Photos <span className="req_star">*</span></label>
              <input
                type="file"
                className="form-control"
                multiple
                onChange={handleFileChange}
              />
              {showAlert && (
                <div className="alert alert-danger  mt-2">
                  Please click the <strong>Upload Files</strong> button to upload the selected images.
                </div>
              )}
              <div className="mt-2">
                {productPhotos.map((file, index) => (
                  <p key={index}>{file.name}</p>
                ))}
              </div>
              <button
                type="button"
                className="btn btn-primary mt-2"
                onClick={handleUploadFiles}
                disabled={loading || productPhotos.length === 0}
              >
                {loading ? 'Uploading...' : 'Upload Files'}
              </button>
            </div> */}

              {/* Product Specifications
            <div className="form-group">
              <label>Product Specifications <span className="req_star">*</span></label>
              {specifications.map((spec, index) => (
                <div key={index} className="d-flex gap-3">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Specification Name"
                    value={spec.label}
                    onChange={(e) => handleSpecificationChange(index, "label", e.target.value)}
                  />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Specification Value"
                    value={spec.value}
                    onChange={(e) => handleSpecificationChange(index, "value", e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => handleRemoveSpecification(index)}
                  >
                    Remove
                  </button>
                </div>
              ))} */}

              {/* <textarea
                  type="text"
                  className="form-control mt-2"
                  placeholder="Optional"  
                  value={specificationDesc}
                  onChange={(e) => handleSpecificationDescChange(e.target.value)}           
              />
              <button type="button" className="btn btn-primary" onClick={handleAddSpecification}>
                Add Specification
              </button>
            </div> */}

              {/* Warranty and Additional Info */}
              {/* <div className="form-group">
              <label>Warranty</label>
              <input
                type="text"
                className="form-control"
                value={warranty}
                onChange={(e) => setWarranty(e.target.value)}
                placeholder="Enter Warranty Period"
              />
            </div> */}

              {/* Upload Job Description Button */}
              <div className="d-flex justify-content-between align-items-center m-2">
                <button
                  title="Back"
                  className="btn btn-success w-40 p-2 m-2"
                  onClick={() => Navigate("/bookTechnicianList")}
                >
                  <ArrowBack />
                </button>
                <button
                  type="submit"
                  className="btn btn-success w-40 p-2 m-2"
                  // onClick={() => navigate('/product')}
                >
                  <UploadIcon />
                  <span>Upload Job Description</span>
                </button>
              </div>

              {/* View Single Product Button */}
              {/* <button
        type="button"
        className="btn btn-primary w-100 d-flex justify-content-center align-items-center p-3 shadow-lg"
       
        //   onClick={() => navigate(`/product-list/${ProductOwnedBy}/${userType}`)}
      >
        <VisibilityIcon className="me-2" />
        <span>View Product</span>
      </button> */}
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default UploadBookTechnician;
