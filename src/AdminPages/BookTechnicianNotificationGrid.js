import React, { useState, useEffect } from "react";
import { Button } from "react-bootstrap";
import axios from "axios";
import AdminSidebar from "./AdminSidebar";
import Footer from "../CommonPages/Footer.js";
import { confirmDialog } from "../CommonPages/DialogSystem";
import { Link } from "react-router-dom";
import { FaTrash, FaEye } from "react-icons/fa";
import {
  Dashboard as MoreVertIcon,
  Forward as ForwardIcon,
} from "@mui/icons-material";
import ArrowLeftIcon from "@mui/icons-material/ArrowLeft";
import "../App.css";
//  import { appConfig } from "./config";

const BookTechnicianNotification = () => {
  const [assignedTo, setAssignedTo] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [technicianData, setTechnicianData] = useState([]);
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [zipCode, setZipcode] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [pinCodes, setPinCodes] = useState([]);
  const [assigned, setAssigned] = useState([]);
  const rowsPerPage = 15;

  useEffect(() => {
    setLoading(true);
    const url = `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/BookTechnician/GetBookTechnicianForAdminList`;
    axios
      .get(url)
      .then((response) => {
        const technicians = response.data.map((technician) => ({
          ...technician,
        }));
        const assignedTechnicians = technicians.filter(
          (technician) =>
            (technician.status === "Assigned" &&
              technician.assignedTo === "Customer") ||
            (technician.status === "Closed" &&
              technician.assignedTo === "Customer Care") ||
            (technician.transactionStatus === "Success" &&
              technician.assignedTo !== "") ||
            (technician.status === "Assigned" &&
              technician.assignedTo === "Technician"),
        );
        setFilteredData(assignedTechnicians);
        setTechnicianData(assignedTechnicians);

        const uniqueStates = [
          ...new Set(technicians.map((technician) => technician.state)),
        ];
        const uniqueDistricts = [
          ...new Set(technicians.map((technician) => technician.district)),
        ];
        const uniquePinCode = [
          ...new Set(technicians.map((technician) => technician.zipCode)),
        ];
        const uniqueAssigned = [
          ...new Set(technicians.map((technician) => technician.assignedTo)),
        ];
        setStates(uniqueStates);
        setDistricts(uniqueDistricts);
        setPinCodes(uniquePinCode);
        setAssigned(uniqueAssigned);
      })
      .catch((error) => {
        console.error("Error fetching ticket data:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleDelete = async (technicianId) => {
    const confirmDelete = await confirmDialog(
      "Are you sure you want to delete this ticket?",
    );
    if (confirmDelete) {
      axios
        .delete(`https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/RaiseTicket/${technicianId}`)
        .then(() => {
          setTechnicianData((prevData) =>
            prevData.filter((technician) => technician.id !== technicianId),
          );
          setFilteredData((prevData) =>
            prevData.filter((technician) => technician.id !== technicianId),
          );
        })
        .catch((error) => {
          console.error("Error deleting ticket:", error);
        });
    }
  };

  useEffect(() => {
    let filtered = technicianData;
    if (state) {
      filtered = filtered.filter((technician) => technician.state === state);
    }
    if (district) {
      filtered = filtered.filter(
        (technician) => technician.district === district,
      );
    }
    if (zipCode) {
      filtered = filtered.filter(
        (technician) => technician.zipCode === zipCode,
      );
    }
    if (assignedTo) {
      filtered = filtered.filter(
        (technician) => technician.assignedTo === assignedTo,
      );
    }
    setFilteredData(filtered);
    setCurrentPage(1);
  }, [state, district, zipCode, assignedTo, technicianData]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Get paginated data
  const indexOfLastTicket = currentPage * rowsPerPage;
  const indexOfFirstTicket = indexOfLastTicket - rowsPerPage;
  const currentBookTechnician = filteredData.slice(
    indexOfFirstTicket,
    indexOfLastTicket,
  );

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <div className="d-flex flex-row justify-content-start align-items-start mt-mob-50">
        {!isMobile && (
          <div className="ml-0 m-4 p-0 adm_mnu">
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

        <div className={`container m-1 ${isMobile ? "w-100" : "w-75"}`}>
          <h2 className="text-center mb-2">Book A Technician Notifications</h2>
          <div
            className={`d-flex ${isMobile ? "flex-column" : "flex-wrap"} align-items-center justify-content-between`}
          >
            <div
              className={`form-group ${isMobile ? "col-12" : "col-12 col-md-2"} m-2`}
            >
              <label>State</label>
              <select
                className="form-control"
                value={state}
                onChange={(e) => setState(e.target.value)}
              >
                <option value="">All States</option>
                {states.map((stateOption, index) => (
                  <option key={index} value={stateOption}>
                    {stateOption}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group col-12 col-md-2 m-2">
              <label>District</label>
              <select
                className="form-control"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
              >
                <option value="">All Districts</option>
                {districts.map((districtOption, index) => (
                  <option key={index} value={districtOption}>
                    {districtOption}
                  </option>
                ))}
              </select>
            </div>
            {/* Pin Code */}
            <div className="form-group col-12 col-md-2 m-2">
              <label>Pin Code</label>
              <select
                className="form-control"
                value={zipCode}
                onChange={(e) => setZipcode(e.target.value)}
              >
                <option value="">Select Pincode</option>
                {pinCodes.map((pinCodeOption, index) => (
                  <option key={index} value={pinCodeOption}>
                    {pinCodeOption}
                  </option>
                ))}
              </select>
            </div>

            {/* Assigned To */}
            <div className="form-group col-12 col-md-2 m-2">
              <label>Assigned To</label>
              <select
                className="form-control"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
              >
                <option value="">Select Assigned To</option>
                {assigned.map((assignedOption, index) => (
                  <option key={index} value={assignedOption}>
                    {assignedOption}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <>
            {currentBookTechnician.length > 0 ? (
              !isMobile ? (
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th>Customer ID</th>
                      <th>Ticket ID</th>
                      <th>Category</th>
                      <th>Job Description</th>
                      <th>Assigned To</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentBookTechnician.map((technician, index) => (
                      <tr key={index}>
                        <td>{technician.customerId}</td>
                        <td>{technician.bookTechnicianId}</td>
                        <td>{technician.category}</td>
                        <td>{technician.jobDescription}</td>
                        <td>{technician.assignedTo}</td>
                        <td className="d-flex align-items-center">
                          <Link
                            to={`/bookTechnicianAdminView/${technician.id}`}
                            className="btn btn-info mx-2"
                          >
                            <FaEye />
                          </Link>
                          <Link
                            onClick={() => handleDelete(technician.id)}
                            className="btn btn-danger mx-2"
                          >
                            <FaTrash />
                          </Link>
                          <Link to="#" className="btn btn-success mx-2">
                            <ForwardIcon />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="mobile-ticket-grid">
                  {currentBookTechnician.map((technician, index) => (
                    <div key={index} className="ticket-card">
                      <div className="ticket-body">
                        <strong>Customer ID:</strong> {technician.customerId}{" "}
                        <br />
                        <strong>Ticket ID:</strong>{" "}
                        {technician.bookTechnicianId}
                        <p>
                          <strong>Category:</strong> {technician.category}
                        </p>
                        <p>
                          <strong>Description:</strong>{" "}
                          {technician.jobDescription}
                        </p>
                        <p>
                          <strong>Assigned To:</strong> {technician.assignedTo}
                        </p>
                      </div>
                      <div className="ticket-actions">
                        <Link
                          to={`/bookTechnicianAdminView/${technician.id}`}
                          className="btn btn-info mx-2"
                        >
                          <FaEye />
                        </Link>
                        <Link
                          onClick={() => handleDelete(technician.id)}
                          className="btn btn-danger mx-2"
                        >
                          <FaTrash />
                        </Link>
                        <Link to="#" className="btn btn-success mx-2">
                          <ForwardIcon />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <p className="text-center text-muted">No Tickets Data Found</p>
            )}
          </>

          <div className="mt-4 text-end">
            <Link
              to="/adminNotifications"
              className="btn btn-warning text-white mx-2"
              title="Back"
            >
              <ArrowLeftIcon />
            </Link>
          </div>
          {/* Pagination */}
          <div className="d-flex justify-content-center mt-3">
            <nav aria-label="Page navigation">
              <ul className="pagination">
                <li
                  className={`page-item ${currentPage === 1 ? "disabled" : ""}`}
                >
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  >
                    &laquo;
                  </button>
                </li>
                {Array.from(
                  { length: Math.ceil(filteredData.length / rowsPerPage) },
                  (_, i) => i + 1,
                )
                  .filter(
                    (page) =>
                      page === 1 ||
                      page === Math.ceil(filteredData.length / rowsPerPage) ||
                      (page >= currentPage - 2 && page <= currentPage + 2),
                  )
                  .map((page, i, arr) => {
                    const prevPage = arr[i - 1];
                    if (prevPage && page - prevPage > 1) {
                      return (
                        <React.Fragment key={page}>
                          <li className="page-item disabled">
                            <span className="page-link">...</span>
                          </li>
                          <li
                            className={`page-item ${page === currentPage ? "active" : ""}`}
                          >
                            <button
                              className="page-link"
                              onClick={() => setCurrentPage(page)}
                            >
                              {page}
                            </button>
                          </li>
                        </React.Fragment>
                      );
                    }
                    return (
                      <li
                        key={page}
                        className={`page-item ${page === currentPage ? "active" : ""}`}
                      >
                        <button
                          className="page-link"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </button>
                      </li>
                    );
                  })}
                <li
                  className={`page-item ${
                    currentPage === Math.ceil(filteredData.length / rowsPerPage)
                      ? "disabled"
                      : ""
                  }`}
                >
                  <button
                    className="page-link"
                    onClick={() =>
                      setCurrentPage((p) =>
                        Math.min(
                          p + 1,
                          Math.ceil(filteredData.length / rowsPerPage),
                        ),
                      )
                    }
                  >
                    &raquo;
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>

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
        `}</style>
      </div>
      <Footer />
    </>
  );
};

export default BookTechnicianNotification;
