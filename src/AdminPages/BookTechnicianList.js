import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { confirmDialog } from "../CommonPages/DialogSystem";
import Footer from "../CommonPages/Footer.js";
import AdminSidebar from "./AdminSidebar";
import { Dashboard as MoreVertIcon } from "@mui/icons-material";
import { Button } from "react-bootstrap";
import { FaEdit, FaTrash } from "react-icons/fa";
// import { appConfig } from "./config";

const BookTechnicianList = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [technicianData, setTechnicianData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;
  const navigate = useNavigate();

  // Fetch product data, categories, and catalogues
  useEffect(() => {
    setLoading(true);
    const url = `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/UploadJobDescriptionBookTechnician/GetUploadJobDescriptionDetails`;
    axios
      .get(url)
      .then((response) => {
        const technicians = response.data.map((technician) => {
          const job = technician.selectedJobs?.[0] || {};
          return {
            id: technician.id,
            category: technician.category,
            jobDescription: job.jobDescription,
            rate: job.rate || 0,
            discount: job.discount || 0,
            afterDiscountPrice:
              job.afterDiscount !== undefined
                ? job.afterDiscount
                : job.rate
                  ? (job.rate - (job.rate * (job.discount || 0)) / 100).toFixed(
                      0,
                    )
                  : "N/A",
          };
        });
        setTechnicianData(technicians);
        setFilteredData(technicians);

        // Extract unique categories and catalogues
        const uniqueCategories = [
          ...new Set(
            technicians
              .map((technician) => technician.category)
              .filter(Boolean),
          ),
        ];
        setCategories(uniqueCategories);
      })
      .catch((error) => {
        console.error("Error fetching technician data:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Handle delete functionality
  const handleDelete = async (technicianId) => {
    const confirmDelete = await confirmDialog(
      "Are you sure you want to delete this Job Description?",
    );
    if (confirmDelete) {
      axios
        .delete(
          `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/UploadJobDescriptionBookTechnician/${technicianId}`,
        )
        .then(() => {
          setTechnicianData((prevData) =>
            prevData.filter((technician) => technician.id !== technicianId),
          );
          setFilteredData((prevData) =>
            prevData.filter((technician) => technician.id !== technicianId),
          );
        })
        .catch((error) => {
          console.error("Error deleting Job Description:", error);
        });
    }
  };

  // Filter data based on selected category and catalogue
  useEffect(() => {
    let filtered = technicianData;
    if (category) {
      filtered = filtered.filter(
        (technician) => technician.category === category,
      );
    }
    setFilteredData(filtered);
    setCurrentPage(1);
  }, [category, technicianData]);

  // Handle page change
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Detect screen size for responsiveness
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Get paginated data
  const indexOfLastProduct = currentPage * rowsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - rowsPerPage;
  const newTechnician = filteredData.slice(
    indexOfFirstProduct,
    indexOfLastProduct,
  );

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <div className="d-flex flex-row justify-content-start align-items-start mt-mob-50">
        {/* Sidebar for larger screens */}
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

        {/* Main Content */}
        <div className={`container m-1 ${isMobile ? "w-100" : "w-75"}`}>
          <h2 className="text-center mb-4">All Job Description</h2>
          <div className="d-flex align-items-center justify-content-between">
            {/* Category */}
            <div className="form-group text-start col-md-2 ml-2 m-5 mb-2">
              <label>Category</label>
              <select
                className="form-control"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map((categoryOption, index) => (
                  <option key={index} value={categoryOption}>
                    {categoryOption}
                  </option>
                ))}
              </select>
            </div>

            {/* Add New Product Button */}
            <div className="text-end col-md-3 mb-1">
              <button
                className="btn btn-success"
                onClick={() => navigate(`/uploadBookTechnician`)}
              >
                Add New Job Description
              </button>
            </div>
          </div>

          {filteredData.length > 0 && (
            <>
              <table
                className="table table-bordered"
                style={{ width: "100%", fontSize: "18px" }}
              >
                <thead>
                  <tr>
                    <th>Job Description</th>
                    <th>Price</th>
                    <th>Discount</th>
                    <th>After Discount Price</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {newTechnician.map((technician, index) => (
                    <tr key={index}>
                      <td>{technician.jobDescription}</td>
                      <td>₹{technician.rate}</td>
                      <td>
                        {technician.discount
                          ? `${technician.discount}%`
                          : "No discount"}
                      </td>
                      <td>₹{technician.afterDiscountPrice || "N/A"}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <Link
                            to={`/updateBookTechnician/${technician.id}`}
                            className="btn btn-warning mx-2"
                            title="Edit"
                          >
                            <FaEdit />
                          </Link>
                          <button
                            onClick={() => handleDelete(technician.id)}
                            className="btn btn-danger"
                            title="Delete"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="d-flex justify-content-center mt-3">
                <nav aria-label="Page navigation">
                  <ul className="pagination">
                    {[
                      ...Array(Math.ceil(filteredData.length / rowsPerPage)),
                    ].map((_, index) => (
                      <li
                        key={index}
                        className={`page-item ${index + 1 === currentPage ? "active" : ""}`}
                      >
                        <button
                          className="page-link"
                          onClick={() => handlePageChange(index + 1)}
                        >
                          {index + 1}
                        </button>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default BookTechnicianList;
