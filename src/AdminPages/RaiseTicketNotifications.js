import React, { useState, useEffect } from "react";
import { Button } from "react-bootstrap";
import axios from "axios";
import { confirmDialog } from "../CommonPages/DialogSystem";
import AdminSidebar from "./AdminSidebar";
import Footer from "../CommonPages/Footer.js";
import { Link } from "react-router-dom";
import { FaTrash, FaEye } from "react-icons/fa";
import {
  Dashboard as MoreVertIcon,
  Forward as ForwardIcon,
} from "@mui/icons-material";
import ArrowLeftIcon from "@mui/icons-material/ArrowLeft";
import "../App.css";
// import { appConfig } from "./config";

const RaiseTicketNotification = () => {
  const [assignedTo, setAssignedTo] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [ticketData, setTicketData] = useState([]);
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
    const url = `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/RaiseTicket/GetTicketsNotifications`;

    axios
      .get(url)
      .then((response) => {
        const tickets = response.data.map((ticket) => ({
          ...ticket,
        }));
        setTicketData(tickets);
        setFilteredData(tickets);

        // Extract unique categories and catalogues
        const uniqueStates = [
          ...new Set(tickets.map((ticket) => ticket.state)),
        ];
        const uniqueDistricts = [
          ...new Set(tickets.map((ticket) => ticket.district)),
        ];
        const uniquePinCode = [
          ...new Set(tickets.map((ticket) => ticket.zipCode)),
        ];
        const uniqueAssigned = [
          ...new Set(tickets.map((ticket) => ticket.assignedTo)),
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

  const handleDelete = async (ticketId) => {
    const confirmDelete = await confirmDialog(
      "Are you sure you want to delete this ticket?",
    );
    if (confirmDelete) {
      axios
        .delete(`https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/RaiseTicket/${ticketId}`)
        .then(() => {
          setTicketData((prevData) =>
            prevData.filter((ticket) => ticket.id !== ticketId),
          );
          setFilteredData((prevData) =>
            prevData.filter((ticket) => ticket.id !== ticketId),
          );
        })
        .catch((error) => {
          console.error("Error deleting ticket:", error);
        });
    }
  };

  useEffect(() => {
    let filtered = ticketData;

    if (state) {
      filtered = filtered.filter((ticket) => ticket.state === state);
    }

    if (district) {
      filtered = filtered.filter((ticket) => ticket.district === district);
    }

    if (zipCode) {
      filtered = filtered.filter((ticket) => ticket.zipCode === zipCode);
    }
    if (assignedTo) {
      filtered = filtered.filter((ticket) => ticket.assignedTo === assignedTo);
    }

    setFilteredData(filtered);
    setCurrentPage(1);
  }, [state, district, zipCode, assignedTo, ticketData]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // const handlePageChange = (pageNumber) => {
  //   setCurrentPage(pageNumber);
  // };

  // Get paginated data
  const indexOfLastTicket = currentPage * rowsPerPage;
  const indexOfFirstTicket = indexOfLastTicket - rowsPerPage;
  const currentRaiseTicket = filteredData.slice(
    indexOfFirstTicket,
    indexOfLastTicket,
  );

  if (loading) {
    return <div>Loading...</div>; // Show loading message while data is fetching
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
          <h2 className="text-center mb-4 mx-5">
            Raise a Ticket Notifications
          </h2>
          <h4 className="text-center mb-4">District Wise Ticket Summary</h4>
          <div
            className={`d-flex ${isMobile ? "flex-column" : "flex-wrap"} align-items-center justify-content-between`}
          >
            <div
              className={`form-group ${isMobile ? "col-12" : "col-12 col-md-2"}`}
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
            {!isMobile ? (
              <table className="table table-bordered">
                <thead>
                  <tr>
                    <th>Customer ID</th>
                    <th>Ticket ID</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Assigned To</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRaiseTicket.map((ticket, index) => (
                    <tr key={index}>
                      <td>{ticket.customerId}</td>
                      <td>{ticket.raiseTicketId}</td>
                      <td>{ticket.category}</td>
                      <td>{ticket.details}</td>
                      <td>{ticket.status}</td>
                      <td>{ticket.assignedTo}</td>
                      <td className="d-flex align-items-center">
                        <Link
                          to={`/raiseTicketActionView/${ticket.id}`}
                          className="btn btn-info mx-2"
                        >
                          <FaEye />
                        </Link>
                        <Link
                          onClick={() => handleDelete(ticket.id)}
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
                {currentRaiseTicket.map((ticket, index) => (
                  <div key={index} className="ticket-card">
                    <div className="ticket-body">
                      <strong>Customer ID:</strong> {ticket.customerId} <br />
                      <strong>Ticket ID:</strong> {ticket.raiseTicketId}
                      <p>
                        <strong>Category:</strong> {ticket.category}
                      </p>
                      <p>
                        <strong>Description:</strong> {ticket.details}
                      </p>
                      <p>
                        <strong>Status:</strong> {ticket.status}
                      </p>
                      <p>
                        <strong>Assigned To:</strong> {ticket.assignedTo}
                      </p>
                    </div>
                    <div className="ticket-actions">
                      <Link
                        to={`/raiseTicketActionView/${ticket.id}`}
                        className="btn btn-info mx-2"
                      >
                        <FaEye />
                      </Link>
                      <Button
                        onClick={() => handleDelete(ticket.id)}
                        className="btn btn-danger mx-2"
                      >
                        <FaTrash />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
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

export default RaiseTicketNotification;
