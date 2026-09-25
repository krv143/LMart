import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

// Same API host used across the rest of the live app (ProfilePage's
// delivery-partner flow, VendorOrdersPage, DeliveryPartnerDashboard).
const API_BASE = "https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api";

const DeliveryOrderDetailsPage = () => {
  const navigate = useNavigate();
  const { userType, userId, orderId } = useParams();

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showItems, setShowItems] = useState(false);
  const [order, setOrder] = useState(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const loadOrder = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(
        `${API_BASE}/Mart/GetProductDetails?id=${orderId}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch order details");
      }
      const data = await response.json();
      setOrder({
        ...data,
        paymentType: data.paymentType || "",
        receivedAmount: "",
        cashAmount: "",
        onlineAmount: "",
      });
    } catch (err) {
      console.error(err);
      setError("Unable to load this order right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const handleCashChange = (value) => {
    const cash = Number(value || 0);
    const online = Number(order?.onlineAmount || 0);
    setOrder((prev) => ({ ...prev, cashAmount: cash, receivedAmount: cash + online }));
  };

  const handleOnlineChange = (value) => {
    const online = Number(value || 0);
    const cash = Number(order?.cashAmount || 0);
    setOrder((prev) => ({ ...prev, onlineAmount: online, receivedAmount: cash + online }));
  };

  const goBackToDashboard = () => {
    navigate(`/deliveryPartnerDashboard/${userType}/${userId}`);
  };

  const handleDecline = async () => {
    if (!order) return;
    setSubmitting(true);
    try {
      const payload = {
        ...order,
        id: orderId,
        userId,
        status: "Open",
        PaymentMode: "",
        PaidAmount: "",
        AssignedTo: "",
        DeliveryPartnerUserId: "",
        deliveryAssignedTime: "",
        deliverySubmitTime: new Date().toISOString(),
        isDelivered: true,
      };
      const response = await fetch(
        `${API_BASE}/Mart/UpdateProductDetails/${orderId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) throw new Error("Decline failed");
      alert("Order declined successfully");
      goBackToDashboard();
    } catch (err) {
      console.error(err);
      alert("Failed to decline order");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitDelivery = async () => {
    if (!order) return;
    setSubmitting(true);
    try {
      const payload = {
        ...order,
        id: orderId,
        userId,
        status: "Delivered",
        PaymentMode: order.paymentType,
        PaidAmount:
          order.paymentType?.toLowerCase() === "cash&online"
            ? `cash=${order.cashAmount || 0}, online=${order.onlineAmount || 0}`
            : String(order.receivedAmount || 0),
        AssignedTo: order.assignedTo,
        DeliveryPartnerUserId: order.deliveryPartnerUserId,
        deliveryAssignedTime: order.deliveryAssignedTime,
        deliverySubmitTime: new Date().toISOString(),
        isDelivered: true,
      };
      const response = await fetch(
        `${API_BASE}/Mart/UpdateProductDetails/${orderId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) throw new Error("Delivery update failed");
      // The vendor's own order-poll (VendorOrdersPage / the Vendor Portal
      // bell on ProfilePage) picks up this status change on its own next
      // poll and speaks a "delivered" voice alert to that specific
      // vendor — nothing else to trigger from here.
      alert("Order delivered successfully");
      goBackToDashboard();
    } catch (err) {
      console.error(err);
      alert("Failed to submit delivery");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "100vh", background: "#f5f7fb" }}
      >
        <div className="text-center">
          <div className="spinner-border text-success mb-3" role="status" />
          <h5>Loading order...</h5>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div
        className="d-flex flex-column justify-content-center align-items-center"
        style={{ minHeight: "100vh", background: "#f5f7fb" }}
      >
        <p className="text-danger mb-3">{error || "Order not found."}</p>
        <button className="btn btn-outline-secondary" onClick={goBackToDashboard}>
          Back to dashboard
        </button>
      </div>
    );
  }

  const isDelivered = String(order.status).toLowerCase() === "delivered";
  const grandTotal = order.categories?.reduce(
    (sum, cat) => sum + Number(cat.totalAmount || 0),
    0,
  );

  return (
    <div
      className="container-fluid py-3"
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        paddingLeft: isMobile ? "12px" : "30px",
        paddingRight: isMobile ? "12px" : "30px",
      }}
    >
      <button
        className="btn btn-link text-decoration-none mb-3 px-0 d-inline-flex align-items-center gap-1"
        onClick={goBackToDashboard}
      >
        <ArrowBackIcon fontSize="small" /> Back
      </button>

      <div
        className="card shadow border-0"
        style={{ borderRadius: 20, padding: isMobile ? 20 : 35 }}
      >
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
          <h4 style={{ fontWeight: 700 }}>Order {order.martId}</h4>
          <span
            className={`badge ${isDelivered ? "bg-success" : "bg-warning text-dark"}`}
            style={{ fontSize: 14, padding: "8px 12px" }}
          >
            {order.status}
          </span>
        </div>

        {/* Customer info */}
        <div className="mb-4">
          <h5 className="mb-3">Customer Information</h5>
          <p><strong>Name:</strong> {order.customerName}</p>
          <p><strong>Phone:</strong> {order.customerPhoneNumber}</p>
          <p>
            <strong>Address:</strong>{" "}
            {[order.address, order.district, order.state, order.zipCode]
              .filter(Boolean)
              .join(", ")}
          </p>
        </div>

        {/* Items */}
        <button
          className="btn btn-outline-primary mb-3"
          onClick={() => setShowItems((v) => !v)}
        >
          {showItems ? "Hide Order Items" : "View Order Items"}
        </button>

        {showItems && (
          <div className="table-responsive mb-3">
            <table className="table table-bordered text-center">
              <thead className="table-success">
                <tr>
                  <th>S.No</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {order.categories
                  ?.flatMap((cat) => cat.products)
                  ?.map((item, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{item.productName}</td>
                      <td>{item.noOfQuantity}</td>
                      <td>₹{Number(item.afterDiscountPrice).toFixed(0)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="text-center mt-2 mb-4">
          <h5>Total Amount : ₹{grandTotal}</h5>
          <h3 className="text-danger fw-bold">Grand Total : ₹{order.grandTotal}</h3>
        </div>

        {/* Payment + actions — only while not yet delivered */}
        {!isDelivered && (
          <div className="mt-3">
            <h5 className="mb-3">Select Payment Mode</h5>
            <div className={`d-flex ${isMobile ? "flex-column" : "flex-row"} gap-3 mb-4`}>
              {["cash", "online", "Cash&Online"].map((mode) => (
                <label key={mode}>
                  <input
                    type="radio"
                    checked={order.paymentType === mode}
                    onChange={() =>
                      setOrder((prev) => ({
                        ...prev,
                        paymentType: mode,
                        receivedAmount: "",
                        cashAmount: "",
                        onlineAmount: "",
                      }))
                    }
                  />{" "}
                  {mode === "cash" ? "Cash" : mode === "online" ? "Online" : "Cash + Online"}
                </label>
              ))}
            </div>

            {order.paymentType === "Cash&Online" ? (
              <div className="row g-3">
                <div className="col-12 col-md-4">
                  <label>Cash Amount</label>
                  <input
                    type="number"
                    className="form-control"
                    value={order.cashAmount}
                    onChange={(e) => handleCashChange(e.target.value)}
                  />
                </div>
                <div className="col-12 col-md-4">
                  <label>Online Amount</label>
                  <input
                    type="number"
                    className="form-control"
                    value={order.onlineAmount}
                    onChange={(e) => handleOnlineChange(e.target.value)}
                  />
                </div>
                <div className="col-12 col-md-4">
                  <label>Total</label>
                  <input className="form-control" readOnly value={order.receivedAmount} />
                </div>
              </div>
            ) : (
              order.paymentType && (
                <div className="mt-3">
                  <label>Enter Amount</label>
                  <input
                    type="number"
                    className="form-control"
                    value={order.receivedAmount}
                    onChange={(e) =>
                      setOrder((prev) => ({ ...prev, receivedAmount: e.target.value }))
                    }
                  />
                </div>
              )
            )}

            <div className={`d-flex ${isMobile ? "flex-column" : "flex-row"} gap-3 mt-4`}>
              <button
                className="btn btn-success w-100"
                style={{ padding: 12, borderRadius: 12, fontWeight: 700 }}
                disabled={submitting || !order.paymentType || !order.receivedAmount}
                onClick={handleSubmitDelivery}
              >
                {submitting ? "Submitting…" : "Submit Delivery"}
              </button>
              <button
                className="btn btn-danger w-100"
                style={{ padding: 12, borderRadius: 12, fontWeight: 700 }}
                disabled={submitting}
                onClick={handleDecline}
              >
                Decline Order
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryOrderDetailsPage;
