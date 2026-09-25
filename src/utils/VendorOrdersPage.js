import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import TwoWheelerIcon from "@mui/icons-material/TwoWheeler";
import StorefrontIcon from "@mui/icons-material/Storefront";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import PhoneIcon from "@mui/icons-material/Phone";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ImageCache from "./utils/ImageCache";
import { getImageFilename, imageValueToUrl } from "./utils/imageSource";

// NOTE: every other file in this project talks to
// "https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api". This page instead points at the QA host
// below because that's the exact endpoint given for
// GetVendorOrdersByVendorId. If your local/dev backend also serves this
// route (and DeliveryPartner/GetAllDeliveryPartners + Mart/UpdateProductDetails),
// swap API_BASE back to the localhost one to match the rest of the app.
const API_BASE = "https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api";
const GET_VENDOR_ORDERS = `${API_BASE}/Mart/GetVendorOrdersByVendorId`;
const GET_ALL_DELIVERY_PARTNERS = `${API_BASE}/DeliveryPartner/GetAllDeliveryPartners`;
const UPDATE_ORDER = `${API_BASE}/Mart/UpdateProductDetails`;

const statusBadgeClass = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "delivered" || s === "completed") return "bg-success";
  if (s === "cancel" || s === "cancelled" || s === "rejected") return "bg-danger";
  if (s === "in progress") return "bg-info text-dark";
  return "bg-warning text-dark";
};

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const VendorOrdersPage = () => {
  const { vendorId } = useParams();
  const navigate = useNavigate();

  const [vendor, setVendor] = useState(null);
  const [orders, setOrders] = useState([]);
  const [deliveryPartners, setDeliveryPartners] = useState([]);
  const [imageUrls, setImageUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedPartnerByOrder, setSelectedPartnerByOrder] = useState({});
  const [assigning, setAssigning] = useState({});

  // Same vendor-session guard used on the Preview / Stock Update pages.
  useEffect(() => {
    const sessionId = localStorage.getItem("vendorSession");
    const savedVendor = localStorage.getItem("vendorProfile");

    if (!sessionId || sessionId !== vendorId || !savedVendor) {
      navigate("/vendor/login");
      return;
    }

    try {
      const profile = JSON.parse(savedVendor);
      if (profile.vendorId !== vendorId) {
        navigate("/vendor/login");
        return;
      }
      setVendor(profile);
    } catch (err) {
      console.error("Unable to read vendor profile:", err);
      navigate("/vendor/login");
    }
  }, [vendorId, navigate]);

  useEffect(() => {
    if (!vendor) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [ordersRes, partnersRes] = await Promise.all([
          axios.get(GET_VENDOR_ORDERS, { params: { vendorId } }),
          axios.get(GET_ALL_DELIVERY_PARTNERS).catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;
        const list = Array.isArray(ordersRes.data) ? ordersRes.data : [];
        setOrders(list);
        const partners = Array.isArray(partnersRes.data)
          ? partnersRes.data.filter((p) => String(p.status || "").toLowerCase() === "open")
          : [];
        setDeliveryPartners(partners);

        const seeded = {};
        list.forEach((order) => {
          const match = partners.find(
            (p) => p.userId === order.deliveryPartnerUserId || p.deliveryPartnerName === order.assignedTo,
          );
          if (match) seeded[order.id] = match.deliveryPartnerId;
        });
        setSelectedPartnerByOrder(seeded);
      } catch (err) {
        console.error("Failed to load vendor orders:", err);
        if (!cancelled) setError("Unable to load orders right now. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vendor, vendorId]);

  // Resolve product thumbnails, cache-first — same pattern used on the
  // super admin vendor products page.
  useEffect(() => {
    const allProducts = orders.flatMap((order) => (order.categories || []).flatMap((cat) => cat.products || []));
    const withPhotos = allProducts.filter((p) => p.productImage);
    if (!withPhotos.length) return;

    const controller = new AbortController();
    let cancelled = false;

    const fetchOne = async (photo) => {
      try {
        const filename = getImageFilename(photo);
        if (!filename) {
          const directUrl = imageValueToUrl(photo);
          if (directUrl && !cancelled) setImageUrls((prev) => ({ ...prev, [photo]: directUrl }));
          return;
        }
        let imageData = await ImageCache.getBase64(filename);
        if (!imageData) {
          const response = await fetch(imageValueToUrl(filename), { signal: controller.signal });
          if (!response.ok) return;
          const data = await response.json();
          imageData = data?.imageData || "";
          if (!imageData || cancelled) return;
          await ImageCache.setBase64(filename, imageData);
        }
        if (!cancelled) {
          setImageUrls((prev) => ({ ...prev, [photo]: `data:image/jpeg;base64,${imageData}` }));
        }
      } catch {}
    };

    const seen = new Set();
    withPhotos.forEach(({ productImage }) => {
      if (seen.has(productImage)) return;
      seen.add(productImage);
      fetchOne(productImage);
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [orders]);

  const visibleOrders = useMemo(
    () => orders.filter((o) => String(o.status || "").toLowerCase() !== "draft"),
    [orders],
  );

  const summary = useMemo(() => {
    const total = visibleOrders.length;
    const delivered = visibleOrders.filter(
      (o) => o.isDelivered || String(o.status).toLowerCase() === "delivered",
    ).length;
    const pickup = visibleOrders.filter((o) => o.isPickUp).length;
    const delivery = total - pickup;
    const open = visibleOrders.filter((o) => String(o.status).toLowerCase() === "open").length;
    const unassigned = visibleOrders.filter((o) => !o.assignedTo).length;
    const grandTotal = visibleOrders.reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0);
    const statusCounts = visibleOrders.reduce((acc, o) => {
      const key = o.status || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return { total, delivered, pickup, delivery, open, unassigned, grandTotal, statusCounts };
  }, [visibleOrders]);

  const handleAssign = async (order) => {
    const partnerId = selectedPartnerByOrder[order.id];
    const partner = deliveryPartners.find((p) => p.deliveryPartnerId === partnerId);
    if (!partner) {
      setError("Pick a delivery partner before assigning.");
      return;
    }
    setAssigning((prev) => ({ ...prev, [order.id]: true }));
    setError("");
    setMessage("");
    try {
      const payload = {
        ...order,
        assignedTo: partner.deliveryPartnerName,
        deliveryPartnerUserId: partner.userId,
        deliveryAssignedTime: new Date().toISOString(),
      };
      await axios.put(`${UPDATE_ORDER}/${order.id}`, payload, {
        headers: { "Content-Type": "application/json" },
      });
      setOrders((prev) => prev.map((o) => (o.id === order.id ? payload : o)));
      setMessage(`Order assigned to ${partner.deliveryPartnerName}.`);
    } catch (err) {
      console.error("Failed to assign delivery partner:", err);
      setError("Unable to assign this order right now. Please try again.");
    } finally {
      setAssigning((prev) => ({ ...prev, [order.id]: false }));
    }
  };

  if (!vendor || loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  const statusEntries = Object.entries(summary.statusCounts);

  return (
    <div className="container py-4">
      <div
        className="rounded-4 p-4 mb-4 text-white"
        style={{ background: "linear-gradient(135deg, #4338ca, #6d28d9)" }}
      >
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
          <div className="d-flex align-items-center gap-3">
            <div
              className="rounded-circle bg-white d-flex align-items-center justify-content-center flex-shrink-0"
              style={{ width: 56, height: 56 }}
            >
              <StorefrontIcon style={{ color: "#4338ca" }} />
            </div>
            <div>
              <p className="text-uppercase mb-1 small" style={{ letterSpacing: ".08em", opacity: 0.8 }}>
                Orders
              </p>
              <h2 className="mb-0">{vendor.storeName || vendor.name}</h2>
            </div>
          </div>
          <div className="d-flex gap-2">
            <button
              className="btn btn-light d-inline-flex align-items-center gap-1"
              onClick={() => navigate(`/vendor/preview/${vendorId}`)}
            >
              <ArrowBackIcon fontSize="small" /> Back to profile
            </button>
            <button
              className="btn btn-light d-inline-flex align-items-center gap-1"
              onClick={() => navigate(`/vendor/stock-update/${vendorId}`)}
            >
              <StorefrontIcon fontSize="small" /> Back to vendor page
            </button>
          </div>
        </div>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {/* ---- Graphical summary ---- */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="card border shadow-sm h-100">
            <div className="card-body d-flex align-items-center gap-3 justify-content-start text-start">
              <div
                className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 44, height: 44, backgroundColor: "rgba(67,56,202,.1)" }}
              >
                <Inventory2Icon style={{ color: "#4338ca" }} fontSize="small" />
              </div>
              <div className="text-start">
                <div className="fs-5 fw-bold lh-1">{summary.total}</div>
                <div className="text-muted small text-uppercase" style={{ letterSpacing: ".04em" }}>
                  Total orders
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border shadow-sm h-100">
            <div className="card-body d-flex align-items-center gap-3 justify-content-start text-start">
              <div
                className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 44, height: 44, backgroundColor: "rgba(255,193,7,.15)" }}
              >
                <PendingActionsIcon className="text-warning" fontSize="small" />
              </div>
              <div className="text-start">
                <div className="fs-5 fw-bold lh-1">{summary.open}</div>
                <div className="text-muted small text-uppercase" style={{ letterSpacing: ".04em" }}>
                  Open
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border shadow-sm h-100">
            <div className="card-body d-flex align-items-center gap-3 justify-content-start text-start">
              <div
                className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 44, height: 44, backgroundColor: "rgba(25,135,84,.12)" }}
              >
                <CheckCircleIcon className="text-success" fontSize="small" />
              </div>
              <div className="text-start">
                <div className="fs-5 fw-bold lh-1">{summary.delivered}</div>
                <div className="text-muted small text-uppercase" style={{ letterSpacing: ".04em" }}>
                  Delivered
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border shadow-sm h-100">
            <div className="card-body d-flex align-items-center gap-3 justify-content-start text-start">
              <div
                className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 44, height: 44, backgroundColor: "rgba(13,202,240,.15)" }}
              >
                <TwoWheelerIcon className="text-info" fontSize="small" />
              </div>
              <div className="text-start">
                <div className="fs-5 fw-bold lh-1">{summary.unassigned}</div>
                <div className="text-muted small text-uppercase" style={{ letterSpacing: ".04em" }}>
                  Unassigned
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {summary.total > 0 && (
        <div className="card border shadow-sm mb-4">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="mb-0">Status breakdown</h6>
              <span className="text-muted small">
                Pickup {summary.pickup} &middot; Delivery {summary.delivery}
              </span>
            </div>
            <div className="d-flex rounded overflow-hidden" style={{ height: 14 }}>
              {statusEntries.map(([status, count]) => (
                <div
                  key={status}
                  title={`${status}: ${count}`}
                  className={statusBadgeClass(status)}
                  style={{ width: `${(count / summary.total) * 100}%` }}
                />
              ))}
            </div>
            <div className="d-flex flex-wrap gap-3 mt-2 small">
              {statusEntries.map(([status, count]) => (
                <span key={status} className="d-inline-flex align-items-center gap-1">
                  <span className={`badge ${statusBadgeClass(status)}`}>&nbsp;</span>
                  {status} ({count})
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---- Orders ---- */}
      {visibleOrders.length === 0 ? (
        <div className="text-muted text-center py-5">No orders yet for this store.</div>
      ) : (
        <div className="row g-3">
          {visibleOrders.map((order) => {
            const itemCount = (order.categories || []).reduce(
              (sum, cat) => sum + (cat.products || []).length,
              0,
            );
            const walletPct = Number(order.totalWalletAmount)
              ? Math.min(100, (Number(order.availedAmount) / Number(order.totalWalletAmount)) * 100)
              : 0;

            return (
              <div className="col-12 col-lg-6" key={order.id}>
                <div className="card border shadow-sm h-100">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                      <div>
                        <div className="fw-bold">{order.customerName || "Customer"}</div>
                        <div className="text-muted small">{formatDate(order.date)}</div>
                      </div>
                      <div className="d-flex flex-column align-items-end gap-1">
                        <span className={`badge ${statusBadgeClass(order.status)}`}>{order.status || "Open"}</span>
                        <span className="badge bg-light text-dark border">
                          {order.isPickUp ? "Pickup" : "Delivery"}
                        </span>
                      </div>
                    </div>

                    <div className="small text-muted d-flex align-items-center gap-1 mb-1">
                      <PhoneIcon fontSize="inherit" /> {order.customerPhoneNumber || "—"}
                    </div>
                    <div className="small text-muted d-flex align-items-start gap-1 mb-3">
                      <LocationOnIcon fontSize="inherit" />
                      <span>
                        {order.address}
                        {order.district ? `, ${order.district}` : ""}
                        {order.state ? `, ${order.state}` : ""} {order.zipCode ? `— ${order.zipCode}` : ""}
                      </span>
                    </div>

                    <div className="d-flex flex-wrap gap-2 mb-3">
                      {(order.categories || []).flatMap((cat) =>
                        (cat.products || []).map((p) => (
                          <div
                            key={`${order.id}-${p.productName}`}
                            className="border rounded d-flex align-items-center gap-2 p-1 pe-2"
                            style={{ maxWidth: 220 }}
                          >
                            <div
                              className="bg-light rounded flex-shrink-0 d-flex align-items-center justify-content-center overflow-hidden"
                              style={{ width: 36, height: 36 }}
                            >
                              {imageUrls[p.productImage] ? (
                                <img
                                  src={imageUrls[p.productImage]}
                                  alt={p.productName}
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                              ) : (
                                <Inventory2Icon fontSize="small" className="text-muted" />
                              )}
                            </div>
                            <div style={{ fontSize: 12 }}>
                              <div className="fw-bold text-truncate" style={{ maxWidth: 140 }}>
                                {p.productName}
                              </div>
                              <div className="text-muted">
                                x{p.noOfQuantity} &middot; ₹{p.afterDiscountPrice}
                              </div>
                            </div>
                          </div>
                        )),
                      )}
                    </div>

                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div className="small text-muted">
                        {itemCount} item{itemCount === 1 ? "" : "s"}
                      </div>
                      <div className="fw-bold">Total ₹{order.grandTotal}</div>
                    </div>

                    {Number(order.totalWalletAmount) > 0 && (
                      <div className="mb-3">
                        <div className="d-flex justify-content-between small text-muted mb-1">
                          <span className="d-inline-flex align-items-center gap-1">
                            <AccountBalanceWalletIcon fontSize="inherit" /> Wallet used
                          </span>
                          <span>
                            ₹{order.availedAmount} of ₹{order.totalWalletAmount}
                          </span>
                        </div>
                        <div className="progress" style={{ height: 6 }}>
                          <div className="progress-bar bg-info" style={{ width: `${walletPct}%` }} />
                        </div>
                      </div>
                    )}

                    <div className="border-top pt-3">
                      <label className="form-label small text-muted mb-1">Assign to delivery partner</label>
                      <div className="d-flex gap-2">
                        <select
                          className="form-select form-select-sm"
                          value={selectedPartnerByOrder[order.id] || ""}
                          onChange={(e) =>
                            setSelectedPartnerByOrder((prev) => ({ ...prev, [order.id]: e.target.value }))
                          }
                        >
                          <option value="">
                            {order.assignedTo ? order.assignedTo : "Select a partner"}
                          </option>
                          {deliveryPartners.map((partner) => (
                            <option key={partner.deliveryPartnerId} value={partner.deliveryPartnerId}>
                              {partner.deliveryPartnerName}
                            </option>
                          ))}
                        </select>
                        <button
                          className="btn btn-sm btn-primary flex-shrink-0"
                          disabled={assigning[order.id] || !selectedPartnerByOrder[order.id]}
                          onClick={() => handleAssign(order)}
                        >
                          {assigning[order.id] ? "Assigning…" : "Assign"}
                        </button>
                      </div>
                      {order.deliveryAssignedTime && (
                        <div className="small text-muted mt-1">
                          Assigned {formatDate(order.deliveryAssignedTime)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VendorOrdersPage;