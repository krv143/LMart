import React, { useState, useEffect, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "../App.css"; // Add this for the required CSS.
// import { useNavigate } from 'react-router-dom';
// import VisibilityIcon from '@mui/icons-material/Visibility';
import UpdateIcon from "@mui/icons-material/Upload";
import AdminSidebar from "./AdminSidebar";
import Footer from "../CommonPages/Footer.js";
// import { appConfig } from "./config";
import { ArrowBack, Dashboard as MoreVertIcon } from "@mui/icons-material";
import { Button } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";

const UpdateBookTechnician = () => {
  const { id } = useParams();
  const [isMobile, setIsMobile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  // const [ProductStatus] = useState("Draft");
  //   const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [selectedJobs, setSelectedJobs] = useState([
    { jobDescription: "", rate: "", discount: "", afterDiscount: "" },
  ]);
  // const [afterDiscount, setAfterDiscount] = useState("");
  // const [remarks, setRemarks] = useState("");
  // const [moreInfo, setMoreInfo] = useState("");
  const [jobData, setJobData] = useState("");
  const [descriptionId, setId] = useState("");
  const [loading, setLoading] = useState(false);
  const Navigate = useNavigate();
  const remarksRef = useRef(null);
  const moreInfoRef = useRef(null);

  useEffect(() => {
    console.log(jobData);
  }, [jobData]);

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

  // Detect screen size for responsiveness
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize(); // Set initial state
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const fetchTechnicianData = async () => {
      try {
        const response = await fetch(
          `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/UploadJobDescriptionBookTechnician/GetTicket/${id}`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch Job Description data");
        }
        const data = await response.json();
        // alert(JSON.stringify(data));
        setJobData(data);
        setId(data.id);
        setSelectedJobs(
          data.selectedJobs || [
            {
              jobDescription: "",
              rate: "",
              discount: "",
              afterDiscount: "",
              remarks: "",
              moreInfo: "",
            },
          ],
        );
        setCategory(data.category);
      } catch (error) {
        console.error("Error fetching Job Description data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTechnicianData();
  }, [id]);

  //   // Handle form submission
  //   const handleSubmit = async (event) => {
  //     event.preventDefault();

  //     const payload = {
  //       id: "unique-id",
  //       productId: "string",
  //       productName: productName,
  //       ProductPhotos: uploadedFiles.map(file => file.src),
  //       Catalogue: catalogue,
  //       ProductSize: productSize,
  //       Color: color,
  //       Units: units,
  //       rate: parseFloat(rate),
  //       discount: parseFloat(discount),
  //       afterDiscountPrice: parseFloat(rate) - parseFloat(discount),
  //       specifications: specifications.map(spec => ({
  //         label: spec.label,
  //         value: spec.value,
  //       })),
  //       specificationDesc: specificationDesc,
  //       warranty: warranty,
  //       Category: category,
  //       ProductStatus: "Pending Approval",
  //       AdditionalInformation:moreInfo,
  //       ProductOwnedBy:"Admin",
  //     };

  //     try {
  //       const response = await fetch("https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/Product/ProductUpload", {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json"
  //         },
  //         body: JSON.stringify(payload)
  //       });

  //       if (response.ok) {
  //         alert("Product uploaded successfully!");

  //       } else {
  //         alert("Please fill in all mandatory fields.");
  //         alert("Failed to upload product.");
  //       }
  //     } catch (error) {
  //       alert("An error occurred while uploading the product.");
  //     }
  //   };

  //   // Handle change of specification field (label or value)
  //   const handleSpecificationChange = (index, field, value) => {
  //     const updatedSpecifications = [...specifications];
  //     updatedSpecifications[index][field] = value;
  //     setSpecifications(updatedSpecifications);
  //   };

  //   const handleSpecificationDescChange = (value) => {
  //     setSpecificationDesc(value);
  //   }

  //   // Handle removal of a specification
  //   const handleRemoveSpecification = (index) => {
  //     const updatedSpecifications = specifications.filter((_, i) => i !== index);
  //     setSpecifications(updatedSpecifications);
  //   };

  //   // Handle adding a new specification
  //   const handleAddSpecification = () => {
  //     setSpecifications([...specifications, { label: "", value: "" }]);
  //   };

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

  if (loading) {
    return <div>Loading...</div>;
  }

  const handleUpdateJobDescription = async (e) => {
    e.preventDefault();

    const payload1 = {
      id: descriptionId,
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
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/UploadJobDescriptionBookTechnician/${descriptionId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload1),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to create Update Job Description.");
      }
      alert("Job Description Updated successfully!");
      Navigate(`/bookTechnicianList`);
    } catch (error) {
      console.error("Error:", error);
      window.alert(
        "Failed to Update the Job Description. Please try again later.",
      );
    }
  };

  return (
    <>
      <div className="d-flex flex-row justify-content-start align-items-start mt-mob-50">
        {/* Sidebar menu for Larger Screens */}
        {!isMobile && (
          <div className=" ml-0 p-0 adm_mnu">
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
          <h3 className="mb-3 text-center">Update Job Description</h3>
          <div className="bg-white rounded-3 p-3 bx_sdw w-60 m-auto">
            <form>
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
                <input
                  type="text"
                  className="form-control"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  readOnly
                />
              </div>
              {/* <option>Choose Category</option>
                {categories.map((cat, index) => (
                <option key={index} value={cat}>{cat}</option>
                ))} 
                 <option>Electrical items</option>
                <option>Plumbing Materials</option>
                <option>Sanitary items</option>
                <option>Electronics appliances</option>
                <option>Paints</option>
                <option>Hardware items</option>
                <option>Civil & Waterproofing Materials</option> */}

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

                    <div className="form-group">
                      <label>
                        Detailed Job Description
                        <span className="req_star">*</span>
                      </label>
                      <textarea
                        ref={remarksRef}
                        name="remarks"
                        className="form-control"
                        value={job.remarks || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value.length <= 1000) {
                            handleJobChange(index, "remarks", value);
                          }
                        }}
                        // rows={Math.max(5, Math.ceil((job.remarks || "").length / 100))}                 placeholder="Detailed Job Description"
                        required
                        style={{
                          resize: "none",
                          overflow: "auto",
                          minHeight: "30px",
                          maxHeight: "120px",
                        }}
                      />
                      <small>
                        {(job.remarks || "").length}/1000 characters
                      </small>
                    </div>

                    {/* Additional Info */}
                    <div className="form-group">
                      <label>More Info</label>
                      <textarea
                        ref={moreInfoRef}
                        name="moreInfo"
                        className="form-control"
                        value={job.moreInfo}
                        onChange={(e) =>
                          handleJobChange(index, "moreInfo", e.target.value)
                        }
                        placeholder="Additional Information"
                        style={{
                          resize: "none",
                          overflow: "auto",
                          minHeight: "30px",
                          maxHeight: "120px",
                        }}
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

              {/* Update Job Description Button */}
              <div className="d-flex justify-content-between  mt-3">
                <button
                  type="submit"
                  className="btn btn-success w-40"
                  onClick={handleUpdateJobDescription}
                >
                  <UpdateIcon className="me-2" />
                  <span>Update Job Description</span>
                </button>

                {/* View Single Update Button */}
                <button
                  type="button"
                  className="btn btn-primary w-40"
                  onClick={() => Navigate(`/bookTechnicianList`)}
                >
                  <ArrowBack className="me-2" />
                  <span>Back</span>
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

export default UpdateBookTechnician;
