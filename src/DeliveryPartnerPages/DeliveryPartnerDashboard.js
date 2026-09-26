import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import { playNotificationSound } from "../CommonPages/notificationSound";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

// Same API host the rest of the live app (ProfilePage's delivery-partner
// check, VendorOrdersPage, etc.) already talks to — keep this in sync so
// GetDeliveryPartnerDetailsByUserId / Mart endpoints resolve the same way
// everywhere.
const API_BASE = "https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api";
const ASSIGNED_ORDERS_POLL_INTERVAL_MS = 20000;

const DeliveryPartnerDashboard = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { userType } = useParams();

  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const [deliveryProfile, setDeliveryProfile] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [partnerStatus, setPartnerStatus] = useState("");        

  const [orders, setOrders] = useState([]);

  // Bell badge state — mirrors the Vendor Portal bell pattern on
  // ProfilePage.js: highlight + sound + a spoken line whenever an order
  // this delivery partner hasn't seen before shows up in their assigned
  // list. Scoped entirely to this userId's own polled orders, so it only
  // ever alerts the delivery partner who is actually logged in here.
  const [hasNewOrder, setHasNewOrder] = useState(false);
  const knownOrderIdsRef = useRef(null);

  const [stats, setStats] = useState({
    total: 0,
    inProgress: 0,
    delivered: 0,
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const calculateStats = (ordersList) => {
    const total = ordersList.length;

    const inProgress = ordersList.filter(
      (x) => String(x.status).toLowerCase() === "in progress"
    ).length;

    const delivered = ordersList.filter(
      (x) => String(x.status).toLowerCase() === "delivered"
    ).length;

    setStats({
      total,
      inProgress,
      delivered,
    });
  };

  // Speaks a short voice alert for a newly-assigned order — same
  // speechSynthesis approach used for the vendor's new-order alert, so
  // it silently no-ops on browsers that don't support it.
  const speakNewAssignmentAlert = (order) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    const orderLabel = order?.martId || "a new order";
    const message = `New order assigned to you, order ${orderLabel}.`;
    try {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 1;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    } catch {
      // speech synthesis unsupported/blocked — the bell sound and visual
      // badge still cover the notification
    }
  };

  const fetchAssignedOrders = async ({ silent } = {}) => {
    try {
      const response = await fetch(
        `${API_BASE}/Mart/GetMartTicketsByUserId?userId=${userId}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }

      const data = await response.json();

      const tickets = Array.isArray(data)
        ? data
        : data && typeof data === "object"
        ? [data]
        : [];

      const filteredOrders = tickets.filter((item) => {
        const status = String(item?.status || "").toLowerCase();

        return status === "in progress" || status === "delivered";
      });

      setOrders(filteredOrders);

      calculateStats(filteredOrders);

      // Detect brand-new assignments (in-progress orders this delivery
      // partner hasn't seen before) and ring/speak — but only once we
      // already have a known baseline, so the very first load doesn't
      // announce every existing order as "new".
      const assignedIds = new Set(
        filteredOrders
          .filter((o) => String(o.status).toLowerCase() === "in progress")
          .map((o) => o.id),
      );
      if (knownOrderIdsRef.current) {
        const arrived = filteredOrders.filter(
          (o) =>
            String(o.status).toLowerCase() === "in progress" &&
            !knownOrderIdsRef.current.has(o.id),
        );
        if (arrived.length && !silent) {
          setHasNewOrder(true);
          try {
            playNotificationSound();
          } catch {
            // audio playback blocked/unsupported — the bell still rings visually
          }
          setTimeout(() => {
            arrived.forEach((order) => speakNewAssignmentAlert(order));
          }, 600);
        }
      }
      knownOrderIdsRef.current = assignedIds;
    } catch (error) {
      console.error(error);
      setOrders([]);
      calculateStats([]);
    }
  };

  const fetchDeliveryProfile = async () => {
    try {
      setLoading(true);

      const res = await axios.get(
        `${API_BASE}/DeliveryPartner/GetDeliveryPartnerDetailsByUserId?userId=${userId}`
      );

      const raw = res?.data ?? null;

      const profile = Array.isArray(raw)
        ? raw.length > 0
          ? raw[0]
          : null
        : raw && typeof raw === "object" && Object.keys(raw).length > 0
        ? raw
        : null;

      setDeliveryProfile(profile);

      const reg = profile?.isRegistered === true;
      const status = (profile?.status || "").toLowerCase();

      setIsRegistered(reg);
      setPartnerStatus(status);

      if (reg && status === "open") {
        await fetchAssignedOrders({ silent: true });
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error(error);
      setDeliveryProfile(null);
      setIsRegistered(false);
      setPartnerStatus("");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveryProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Poll for newly-assigned orders so the header bell can ring/speak even
  // while the delivery partner is just sitting on this dashboard.
  useEffect(() => {
    if (!(isRegistered && partnerStatus === "open")) return;
    const interval = setInterval(
      () => fetchAssignedOrders(),
      ASSIGNED_ORDERS_POLL_INTERVAL_MS,
    );
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRegistered, partnerStatus, userId]);

  const handleViewDetails = (order) => {
    setHasNewOrder(false);
    navigate(`/deliveryOrderDetails/${userType}/${userId}/${order.id}`);
  };

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{
          minHeight: "100vh",
          background: "#f5f7fb",
        }}
      >
        <div className="text-center">
          <div
            className="spinner-border text-success mb-3"
            role="status"
          />
          <h5>Loading Delivery Dashboard...</h5>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="container-fluid py-3"
        style={{
          minHeight: "100vh",
          background: "#f5f7fb",
          paddingLeft: isMobile ? "12px" : "30px",
          paddingRight: isMobile ? "12px" : "30px",
        }}
      >
        {/* HEADER */}
        <div
          className="shadow rounded p-4 mb-4"
          style={{
            background:
              "linear-gradient(135deg, #198754, #0d6efd)",
            color: "#fff",
          }}
        >
          <h2
  className="d-flex align-items-center gap-2"
  style={{
    fontSize: isMobile ? "20px" : "34px",
    fontWeight: "600",
  }}
>
  {/* Back Arrow */}
  <span
    onClick={() => navigate(`/profilepage/customer/${userId}`)}
    title="Back to Profile"
    className="d-inline-flex align-items-center justify-content-center rounded-circle bg-white"
    style={{
      width: 34,
      height: 34,
      color: "#10301F",
      boxShadow: "0 1px 4px rgba(0,0,0,.35)",
      cursor: "pointer",
      flexShrink: 0,
    }}
  >
    <ArrowBackIcon style={{ fontSize: 22 }} />
  </span>

  🚚 Delivery Partner Dashboard

  {isRegistered && partnerStatus === "open" && (
    <span
      onClick={() => setHasNewOrder(false)}
      title="Assigned orders"
      className={`d-inline-flex align-items-center justify-content-center rounded-circle bg-white position-relative${
        hasNewOrder ? " delivery-bell-ring" : ""
      }`}
      style={{
        width: 30,
        height: 30,
        color: "#10301F",
        boxShadow: "0 1px 4px rgba(0,0,0,.35)",
        cursor: "pointer",
      }}
    >
      <NotificationsActiveIcon style={{ fontSize: 18 }} />

      {stats.inProgress > 0 && (
        <span
          className="badge rounded-pill bg-danger position-absolute"
          style={{
            top: -6,
            right: -6,
            fontSize: 10,
            padding: "3px 5px",
          }}
        >
          {stats.inProgress}
        </span>
      )}
    </span>
  )}
</h2>
          <style>{`
            @keyframes deliveryBellRing {
              0%, 100% { transform: rotate(0deg); }
              10% { transform: rotate(-18deg); }
              20% { transform: rotate(16deg); }
              30% { transform: rotate(-14deg); }
              40% { transform: rotate(12deg); }
              50% { transform: rotate(-8deg); }
              60% { transform: rotate(6deg); }
              70%, 100% { transform: rotate(0deg); }
            }
            .delivery-bell-ring {
              animation: deliveryBellRing 1s ease-in-out infinite;
              transform-origin: 50% 0%;
            }
          `}</style>

          <h5  style={{    fontSize: isMobile ? "15px" : "20px",  }}>
            Welcome,{" "}
            {deliveryProfile?.deliveryPartnerName ||
              deliveryProfile?.deliveryPartnerName ||
              "Delivery Partner"}
          </h5>

          <span
            className={`badge mt-1 ${
              partnerStatus === "open"
                ? "bg-light text-success"
                : "bg-warning text-dark"
            }`}
            style={{
              fontSize: isMobile ? "10px" : "15px",
              padding: "8px",
            }}
          >
            Status:{" "}
            {partnerStatus === "open"
              ? "Approved"
              : isRegistered
              ? "Pending Approval"
              : "Not Registered"}
          </span>
        </div>

        {/* PENDING APPROVAL */}
        {isRegistered && partnerStatus !== "open" && (
          <div
            className="card shadow border-0 text-center mx-auto"
            style={{
              maxWidth: "700px",
              borderRadius: "20px",
              padding: isMobile ? "30px 20px" : "50px",
            }}
          >
            <div style={{ fontSize: isMobile ? "50px" : "70px" }}>
              ⏳
            </div>

            <h3
              className="text-warning"
              style={{
                fontWeight: "700",
                fontSize: isMobile ? "22px" : "32px",
              }}
            >
              Your registration is pending admin approval.
            </h3>
          </div>
        )}

        {/* APPROVED DASHBOARD */}
        {isRegistered && partnerStatus === "open" && (
          <>
            {/* STATS */}
                <div
                className="row mb-4"
                style={{ 
                    marginLeft: "0",
                    marginRight: "0",
                }}
                >
                <div className="col-4 px-1">
                    <div
                    className="card shadow border-0 text-center d-flex justify-content-center"
                    style={{
                        borderRadius: "14px",
                        minHeight: isMobile ? "90px" : "150px",
                        padding: isMobile ? "10px 4px" : "30px",
                    }}
                    >
                    <h6
                        style={{
                        fontWeight: "600",
                        fontSize: isMobile ? "10px" : "20px",
                        marginBottom: "6px",
                        lineHeight: "1.2",
                        }}
                    >
                        Total
                    </h6>

                    <h3
                        className="text-primary"
                        style={{
                        fontWeight: "700",
                        fontSize: isMobile ? "20px" : "38px",
                        margin: 0,
                        }}
                    >
                        {stats.total}
                    </h3>
                    </div>
                </div>

                <div className="col-4 px-1">
                    <div
                    className="card shadow border-0 text-center d-flex justify-content-center"
                    style={{
                        borderRadius: "14px",
                        minHeight: isMobile ? "90px" : "150px",
                        padding: isMobile ? "10px 4px" : "30px",
                    }}
                    >
                    <h6
                        style={{
                        fontWeight: "600",
                        fontSize: isMobile ? "10px" : "20px",
                        marginBottom: "6px",
                        lineHeight: "1.2",
                        }}
                    >
                        Progress
                    </h6>

                    <h3
                        className="text-warning"
                        style={{
                        fontWeight: "700",
                        fontSize: isMobile ? "20px" : "38px",
                        margin: 0,
                        }}
                    >
                        {stats.inProgress}
                    </h3>
                    </div>
                </div>

                <div className="col-4 px-1">
                    <div
                    className="card shadow border-0 text-center d-flex justify-content-center"
                    style={{
                        borderRadius: "14px",
                        minHeight: isMobile ? "90px" : "150px",
                        padding: isMobile ? "10px 4px" : "30px",
                    }}
                    >
                    <h6
                        style={{
                        fontWeight: "600",
                        fontSize: isMobile ? "10px" : "20px",
                        marginBottom: "6px",
                        lineHeight: "1.2",
                        }}
                    >
                        Delivered
                    </h6>

                    <h3
                        className="text-success"
                        style={{
                        fontWeight: "700",
                        fontSize: isMobile ? "20px" : "38px",
                        margin: 0,
                        }}
                    >
                        {stats.delivered}
                    </h3>
                    </div>
                </div>
                </div>

            {/* ASSIGNED ORDERS */}
            <div
              className="card shadow border-0"
              style={{
                borderRadius: "20px",
                padding: isMobile ? "20px" : "35px",
              }}
            >
              <h4
                style={{
                  fontWeight: "700",
                  marginBottom: "25px",
                }}
              >
                Assigned Orders
              </h4>

              {orders.length === 0 ? (
                <div className="text-center py-5">
                  <h5>No assigned orders found.</h5>
                </div>
              ) : (
                orders.map((order) => (
                  <div
                    key={order.id}
                    className="shadow-sm border bg-white mb-3"
                    style={{
                      borderRadius: "16px",
                      padding: isMobile ? "18px" : "24px",
                    }}
                  >
                    <div className="row align-items-center">
                      <div className="col-12 col-md-9">
                        <p>
                          <strong>Order ID:</strong>{" "}
                          {order.martId}
                        </p>

                        <p>
                          <strong>Customer:</strong>{" "}
                          {order.customerName}
                        </p>

                        <p>
                          <strong>Address:</strong>{" "}
                          {[
                            order.address,
                            order.district,
                            order.state,
                            order.zipCode,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </p>

                        <p>
                          <strong>Status:</strong>{" "}
                          <span
                            className={`badge ${
                              String(order.status).toLowerCase() ===
                              "delivered"
                                ? "bg-success"
                                : "bg-warning text-dark"
                            }`}
                          >
                            {order.status}
                          </span>
                        </p>
                      </div>

                      <div className="col-12 col-md-3 mt-3 mt-md-0">
                        <button
                          className="btn btn-primary w-100"
                          style={{
                            borderRadius: "12px",
                            padding: "12px",
                            fontWeight: "600",
                          }}
                          onClick={() =>
                            handleViewDetails(order)
                          }
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default DeliveryPartnerDashboard;                                 



