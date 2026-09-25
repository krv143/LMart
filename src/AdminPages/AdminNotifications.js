import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import {
  Dashboard as MoreVertIcon,
  ArrowBack as ArrowBackIcon,
  NotificationsNone as NotificationsNoneIcon,
} from "@mui/icons-material";
import Footer from "../CommonPages/Footer.js";
import { Button } from "react-bootstrap";
import "../App.css";
// import { appConfig } from "./config";

const NotificationsList = ({ notifications, highlightedItem }) => {
  const navigate = useNavigate();
  const raiseTicketNotifications = notifications.filter(
    (item) =>
      item.internalStatus === "Open" && item.assignedTo === "Customer Care",
  );

  const bookTechnicianNotifications = notifications.filter(
    (item) =>
      item.status === "Open" &&
      item.assignedTo !== "Customer Care" &&
      item.bookTechnicianId != null,
  );
  const buyProductNotifications = notifications.filter(
    (item) =>
      item.status === "Open" &&
      item.assignedTo === "Customer Care" &&
      item.buyProductId != null,
  );
  const groceryItemNotifications = notifications.filter(
    (item) => item.status === "Open" && item.martId != null,
  );
  const lakshmiCollectionsNotifications = notifications.filter(
    (item) => item.status === "Open" && item.lakshmiCollectionId != null,
  );
  const handleTicketClick = (ticketId) => {
    navigate(`/raiseTicketActionView/${ticketId}`, { state: { ticketId } });
  };

  const handleTechnicianClick = (bookTechnicianId) => {
    navigate(`/bookTechnicianActionView/${bookTechnicianId}`, {
      state: { bookTechnicianId },
    });
  };
  const handleBuyProductClick = (buyProductId) => {
    navigate(`/adminBuyProductOrders/${buyProductId}`, {
      state: { buyProductId },
    });
  };

  const handleGroceryClick = (martId) => {
    navigate(`/adminGroceryOrderPage/${martId}`, { state: { martId } });
  };
  const handleCollectionsClick = (lakshmiCollectionId) => {
    navigate(`/adminLakshmiCollectionsOrders/${lakshmiCollectionId}`, {
      state: { lakshmiCollectionId },
    });
  };
  return (
    <div>
      <div className="notification-list">
        {raiseTicketNotifications.map((notification) => (
          <div
            key={notification.raiseTicketId}
            className={`notification-item ${
              notification.raiseTicketId === highlightedItem ? "highlight" : ""
            }`}
          >
            <div className="notification-header">
              <strong>Ticket ID: </strong>
              <span
                onClick={() => handleTicketClick(notification.id)}
                style={{
                  color: "blue",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                {notification.raiseTicketId}
              </span>
            </div>
            <div>
              <strong>Subject:</strong> {notification.subject}
            </div>
            <div>
              <strong>Details:</strong> {notification.details}
            </div>
            <div className="notification-date">
              <strong>Date:</strong>{" "}
              {new Date(notification.date).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div className="notification-list">
        {bookTechnicianNotifications.map((notification) => (
          <div
            key={notification.bookTechnicianId}
            className={`notification-item ${
              notification.bookTechnicianId === highlightedItem
                ? "highlight"
                : ""
            }`}
          >
            <div className="notification-header">
              <strong>Ticket ID: </strong>
              <span
                onClick={() => handleTechnicianClick(notification.id)}
                style={{
                  color: "blue",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                {notification.bookTechnicianId}
              </span>
            </div>
            <div>
              <strong>Job Description:</strong> {notification.jobDescription}
            </div>
            <div>
              <strong>Category:</strong> {notification.category}
            </div>
            <div className="notification-date">
              <strong>Date:</strong>{" "}
              {new Date(notification.date).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div className="notification-list">
        {buyProductNotifications.map((notification) => (
          <div
            key={notification.buyProductId}
            className={`notification-item ${
              notification.buyProductId === highlightedItem ? "highlight" : ""
            }`}
          >
            <div className="notification-header">
              <strong>Buy Product ID: </strong>
              <span
                onClick={() => handleBuyProductClick(notification.id)}
                style={{
                  color: "blue",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                {notification.buyProductId}
              </span>
            </div>
            <div>
              <strong>Product Name:</strong> {notification.productName}
            </div>
            <div>
              <strong>Category:</strong> {notification.category}
            </div>
            <div className="notification-date">
              <strong>Date:</strong>{" "}
              {new Date(notification.date).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div className="notification-list">
        {groceryItemNotifications.map((notification) => (
          <div
            key={notification.martId}
            className={`notification-item ${
              notification.martId === highlightedItem ? "highlight" : ""
            }`}
          >
            <div className="notification-header">
              <strong>Grocery ID: </strong>
              <span
                onClick={() => handleGroceryClick(notification.id)}
                style={{
                  color: "blue",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                {notification.martId}
              </span>
            </div>
            <div>
              <strong>Customer Name:</strong> {notification.customerName}
            </div>
            <div>
              <strong>Address:</strong> {notification.address},{" "}
              {notification.district}, {notification.state},{" "}
              {notification.zipCode}, {notification.customerPhoneNumber}
            </div>
            {/* <div>
              <strong>Location:</strong> {notification.location}
            </div> */}
            <div className="notification-date">
              <strong>Date:</strong>{" "}
              {new Date(notification.date).toLocaleString()}
            </div>
            <div className="notification-date">
              <strong>Grand Total:</strong> {`Rs ${notification.grandTotal} /-`}
            </div>
          </div>
        ))}
      </div>

      <div className="notification-list">
        {lakshmiCollectionsNotifications.map((notification) => (
          <div
            key={notification.lakshmiCollectionId}
            className={`notification-item ${
              notification.lakshmiCollectionId === highlightedItem
                ? "highlight"
                : ""
            }`}
          >
            <div className="notification-header">
              <strong>Collection ID: </strong>
              <span
                onClick={() => handleCollectionsClick(notification.id)}
                style={{
                  color: "blue",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                {notification.lakshmiCollectionId}
              </span>
            </div>
            <div>
              <strong>Collection Name:</strong>{" "}
              {notification.categoriess?.[0]?.productName}
            </div>
            <div>
              <strong>Category:</strong>{" "}
              {notification.categoriess?.[0]?.categoryName}
            </div>
            <div className="notification-date">
              <strong>Date:</strong>{" "}
              {new Date(notification.date).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Notification = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [ticketNotifications, setTicketNotifications] = useState([]);
  const [technicianNotifications, setTechnicianNotifications] = useState([]);
  const [productNotifications, setProductNotifications] = useState([]);
  const [groceryNotifications, setGroceryItemNotifications] = useState([]);
  const [collectionNotifications, setCollectionNotifications] = useState([]);
  const [newTicketCount, setNewTicketCount] = useState(0);
  const [newTechnicianCount, setNewTechnicianCount] = useState(0);
  const [newProductCount, setNewProductCount] = useState(0);
  const [newNotificationCount, setNewNotificationCount] = useState(0);
  const [newGroceryCount, setNewGroceryCount] = useState(0);
  const [newCollectionCount, setNewCollectionCount] = useState(0);
  const [glow, setGlow] = useState(false);
  const [glowTicket, setGlowTicket] = useState(false);
  const [glowTechnician, setGlowTechnician] = useState(false);
  const [glowProduct, setGlowProduct] = useState(false);
  const [glowGrocery, setGlowGrocery] = useState(false);
  const [glowCollection, setGlowCollection] = useState(false);
  const [highlightedTicket, setHighlightedTicket] = useState(null);
  const [highlightedTechnician, setHighlightedTechnician] = useState(null);
  const [highlightedProduct, setHighlightedProduct] = useState(null);
  const [highlightedGrocery, setHighlightedGrocery] = useState(null);
  const [highlightedCollection, setHighlightedCollection] = useState(null);
  const [activeTab, setActiveTab] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const [
        raiseTicketResponse,
        BookTechnicianResponse,
        buyProductResponse,
        groceryItemResponse,
        collectionsResponse,
      ] = await Promise.all([
        fetch(`https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/RaiseTicket/GetTicketsNotifications`),
        fetch(
          `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/BookTechnician/GetBookTechnicianForAdminList`,
        ),
        fetch(
          `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/BuyProduct/GetBuyProductDetailsForAdminList`,
        ),
        fetch(`https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/Mart/GetAllMartItems`),
        fetch(
          `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/LakshmiCollection/GetAllLakshmiCollectionsOpen`,
        ),
      ]);

      const raiseTicketData = await raiseTicketResponse.json();
      const raiseTicketFiltered = raiseTicketData
        .filter(
          (item) =>
            item.internalStatus === "Open" &&
            item.assignedTo === "Customer Care",
        )
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      const raiseTicketCount = raiseTicketFiltered.length;
      setTicketNotifications(raiseTicketFiltered);
      setNewTicketCount(raiseTicketCount);
      setGlowTicket(raiseTicketCount > 0);
      if (raiseTicketCount > 0) {
        setHighlightedTicket(raiseTicketFiltered[0].raiseTicketId);
      }

      const bookTechnicianData = await BookTechnicianResponse.json();
      const bookTechnicianFiltered = bookTechnicianData
        .filter(
          (item) =>
            item.status === "Open" &&
            item.assignedTo !== "Customer Care" &&
            item.bookTechnicianId != null,
        )
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      const bookTechnicianCount = bookTechnicianFiltered.length;
      setTechnicianNotifications(bookTechnicianFiltered);
      setNewTechnicianCount(bookTechnicianCount);
      setGlowTechnician(bookTechnicianCount > 0);
      if (bookTechnicianCount > 0) {
        setHighlightedTechnician(bookTechnicianFiltered[0].bookTechnicianId);
      }

      const buyProductData = await buyProductResponse.json();
      const buyProductFiltered = buyProductData
        .filter(
          (item) =>
            item.status === "Open" &&
            item.assignedTo === "Customer Care" &&
            item.buyProductId != null,
        )
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      const buyProductCount = buyProductFiltered.length;
      setProductNotifications(buyProductFiltered);
      setNewProductCount(buyProductCount);
      setGlowProduct(buyProductCount > 0);
      if (buyProductCount > 0) {
        setHighlightedProduct(buyProductFiltered[0].buyProductId);
      }

      const groceryItemData = await groceryItemResponse.json();
      const groceryItemFiltered = groceryItemData
        .filter((item) => item.status === "Open" && item.martId != null)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      const groceryItemCount = groceryItemFiltered.length;
      setGroceryItemNotifications(groceryItemFiltered);
      setNewGroceryCount(groceryItemCount);
      setGlowGrocery(groceryItemCount > 0);
      if (groceryItemCount > 0) {
        setHighlightedGrocery(groceryItemFiltered[0].martId);
      }

      const collectionsData = await collectionsResponse.json();
      const collectionsFiltered = collectionsData
        .filter(
          (item) => item.status === "Open" && item.lakshmiCollectionId != null,
        )
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      const collectionsCount = collectionsFiltered.length;
      setCollectionNotifications(collectionsFiltered);
      setNewCollectionCount(collectionsCount);
      setGlowCollection(collectionsCount > 0);
      if (collectionsCount > 0) {
        setHighlightedCollection(collectionsFiltered[0].lakshmiCollectionId);
      }
      const totalNotifications =
        raiseTicketCount +
        bookTechnicianCount +
        buyProductCount +
        groceryItemCount +
        collectionsCount;
      setNewNotificationCount(totalNotifications);
      console.log("newNotificationCount:", newNotificationCount);
      setGlow(totalNotifications > 0);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }, [newNotificationCount]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleClearTicketNotifications = () => {
    setNewTicketCount(0);
    setGlowTicket(false);
    setHighlightedTicket(null);
  };

  const handleClearTechnicianNotifications = () => {
    setNewTechnicianCount(0);
    setGlowTechnician(false);
    setHighlightedTechnician(null);
  };
  const handleClearProductNotifications = () => {
    setNewProductCount(0);
    setGlowProduct(false);
    setHighlightedProduct(null);
  };

  const handleClearGroceryNotifications = () => {
    setNewGroceryCount(0);
    setGlowGrocery(false);
    setHighlightedGrocery(null);
  };

  const handleClearCollectionNotifications = () => {
    setNewCollectionCount(0);
    setGlowCollection(false);
    setHighlightedCollection(null);
  };

  const handleTabClick = (tab) => {
    setActiveTab(tab);
  };
  return (
    <>
      <div className="d-flex flex-row justify-content-start align-items-start mt-mob-50">
        {!isMobile && (
          <div className="ml-0 p-0 adm_mnu">
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
        <div className={`container m-1  ${isMobile ? "w-100" : "w-75"}`}>
          <h2 className="text-start mb-1 fs-20">
            <ArrowBackIcon fontSize="large" />{" "}
            <NotificationsNoneIcon
              fontSize="large"
              className={glow ? "glow" : ""}
            />{" "}
            Notifications{" "}
            {newNotificationCount > 0 && (
              <span className="badge bg-danger">{newNotificationCount}</span>
            )}
          </h2>
          <div className="notifications-container1 d-flex bg-white">
            {isMobile ? (
              <div className="tabs-mobile d-flex flex-column">
                {[
                  "Raise Ticket",
                  "Book Technician",
                  "Buy Products",
                  "Grocery Items",
                  "Lakshmi Collections",
                ].map((tab) => (
                  <div
                    key={tab}
                    className={`tab-item ${activeTab === tab ? "active" : ""} 
          ${tab === "Raise Ticket" && glowTicket ? "glow" : ""} 
          ${tab === "Book Technician" && glowTechnician ? "glow" : ""}
          ${tab === "Buy Products" && glowProduct ? "glow" : ""}
          ${tab === "Grocery Items" && glowGrocery ? "glow" : ""}
          ${tab === "Lakshmi Collections" && glowCollection ? "glow" : ""}
          `}
                    onClick={() => {
                      if (tab === "Grocery Items") {
                        navigate("/adminGroceryZoneDashboard", {
                          state: { groceryNotifications },
                        });
                      } else {
                        handleTabClick(tab);
                      }
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    {tab}{" "}
                    {tab === "Raise Ticket" && newTicketCount > 0 && (
                      <span className="badge bg-danger">{newTicketCount}</span>
                    )}
                    {tab === "Book Technician" && newTechnicianCount > 0 && (
                      <span className="badge bg-danger">
                        {newTechnicianCount}
                      </span>
                    )}
                    {tab === "Buy Products" && newProductCount > 0 && (
                      <span className="badge bg-danger">{newProductCount}</span>
                    )}
                    {tab === "Grocery Items" && newGroceryCount > 0 && (
                      <span className="badge bg-danger">{newGroceryCount}</span>
                    )}
                    {tab === "Lakshmi Collections" &&
                      newCollectionCount > 0 && (
                        <span className="badge bg-danger">
                          {newCollectionCount}
                        </span>
                      )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="tabs d-flex">
                {[
                  "Raise Ticket",
                  "Book Technician",
                  "Buy Products",
                  "Grocery Items",
                  "Lakshmi Collections",
                ].map((tab) => (
                  <span
                    key={tab}
                    className={`tab-item ${activeTab === tab ? "active" : ""} 
          ${tab === "Raise Ticket" && glowTicket ? "glow" : ""} 
          ${tab === "Book Technician" && glowTechnician ? "glow" : ""} 
          ${tab === "Buy Products" && glowProduct ? "glow" : ""} 
          ${tab === "Grocery Items" && glowGrocery ? "glow" : ""}
          ${tab === "Lakshmi Collections" && glowCollection ? "glow" : ""}
          `}
                    onClick={() => {
                      if (tab === "Grocery Items") {
                        navigate("/adminGroceryZoneDashboard", {
                          state: { groceryNotifications },
                        });
                      } else {
                        handleTabClick(tab);
                      }
                    }}
                    style={{ cursor: "pointer", marginRight: "15px" }}
                  >
                    {tab}{" "}
                    {tab === "Raise Ticket" && newTicketCount > 0 && (
                      <span className="badge bg-danger">{newTicketCount}</span>
                    )}
                    {tab === "Book Technician" && newTechnicianCount > 0 && (
                      <span className="badge bg-danger">
                        {newTechnicianCount}
                      </span>
                    )}
                    {tab === "Buy Products" && newProductCount > 0 && (
                      <span className="badge bg-danger">{newProductCount}</span>
                    )}
                    {tab === "Grocery Items" && newGroceryCount > 0 && (
                      <span className="badge bg-danger">{newGroceryCount}</span>
                    )}
                    {tab === "Lakshmi Collections" &&
                      newCollectionCount > 0 && (
                        <span className="badge bg-danger">
                          {newCollectionCount}
                        </span>
                      )}
                  </span>
                ))}
              </div>
            )}
            <div>
              {activeTab === "Raise Ticket" && (
                <>
                  <NotificationsList
                    notifications={ticketNotifications}
                    highlightedItem={highlightedTicket}
                  />
                  <div
                    className="view-notifications text-info mx-2"
                    onClick={() => {
                      navigate(`/raiseTicketNotification`);
                      handleClearTicketNotifications();
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    View All Notifications
                  </div>
                </>
              )}
            </div>
            <div>
              {activeTab === "Book Technician" && (
                <>
                  <NotificationsList
                    notifications={technicianNotifications}
                    highlightedItem={highlightedTechnician}
                  />
                  <div
                    className="view-notifications text-info mx-2"
                    onClick={() => {
                      navigate(`/bookTechnicianNotificationGrid`);
                      handleClearTechnicianNotifications();
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    View All Notifications
                  </div>
                </>
              )}
            </div>
            <div>
              {activeTab === "Buy Products" && (
                <>
                  <NotificationsList
                    notifications={productNotifications}
                    highlightedItem={highlightedProduct}
                  />
                  <div
                    className="view-notifications text-info mx-2"
                    onClick={() => {
                      navigate(`/buyProductNotificationGrid`);
                      handleClearProductNotifications();
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    View All Notifications
                  </div>
                </>
              )}
            </div>
            <div>
              {activeTab === "Grocery Items" && (
                <>
                  <NotificationsList
                    notifications={groceryNotifications}
                    highlightedItem={highlightedGrocery}
                  />
                  <div
                    className="view-notifications text-info mx-2"
                    onClick={() => {
                      navigate(`/groceryItemsNotificationGrid`);
                      handleClearGroceryNotifications();
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    View All Notifications
                  </div>
                </>
              )}
            </div>
            <div>
              {activeTab === "Lakshmi Collections" && (
                <>
                  <NotificationsList
                    notifications={collectionNotifications}
                    highlightedItem={highlightedCollection}
                  />
                  <div
                    className="view-notifications text-info mx-2"
                    onClick={() => {
                      navigate(`/lakshmiCollectionsNotificationGrid`);
                      handleClearCollectionNotifications();
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    View All Notifications
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Notification;
