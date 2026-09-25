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
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { savePdf } from "../utils/nativeFile";
import ImageCache from "../utils/ImageCache";
import { getImageFilename, imageValueToUrl } from "../utils/imageSource";

const API_BASE = "https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api";
const GET_VENDOR_ORDERS = `${API_BASE}/Mart/GetVendorOrdersByVendorId`;
const UPDATE_ORDER = `${API_BASE}/Mart/UpdateProductDetails`;
const GET_DELIVERYPARTNERS_BYVENDORID = `${API_BASE}/DeliveryPartner/GetDeliveryPartnerByVendorId`
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

// Figures out the image "type" string jsPDF's addImage() wants, based on
// the data URL's mime prefix. Falls back to JPEG since that's what
// ImageCache stores product photos as.
const pdfImageFormat = (dataUrl) => {
  if (typeof dataUrl !== "string") return null;
  if (dataUrl.startsWith("data:image/png")) return "PNG";
  if (dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg")) return "JPEG";
  if (dataUrl.startsWith("data:image/webp")) return "WEBP";
  // addImage can't embed a remote (non-base64) URL synchronously, so
  // anything that isn't a data: URL is skipped rather than left broken.
  return null;
};

// Builds and triggers download of a single-order PDF: header with the
// vendor/order/customer info, an items table (including each product's
// thumbnail when we already have it cached in imageUrls), and a
// totals/assignment footer. imageUrls is the same {productImage -> data
// URL} map the page keeps in state for rendering thumbnails on screen,
// passed in so the PDF can reuse it without re-fetching anything.
const downloadOrderPdf = (order, vendor, imageUrls = {}) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 40;
  let cursorY = 50;

  const orderIdLabel = order.martId || order.id;

  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text(vendor?.storeName || vendor?.name || "Order Details", marginX, cursorY);

  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  cursorY += 18;
  doc.text(`Order: ${orderIdLabel}`, marginX, cursorY);
  doc.text(`Date: ${formatDate(order.date)}`, 400, cursorY);

  cursorY += 24;
  doc.setFont(undefined, "bold");
  doc.text("Customer", marginX, cursorY);
  doc.setFont(undefined, "normal");
  cursorY += 16;
  doc.text(order.customerName || "Customer", marginX, cursorY);
  cursorY += 14;
  doc.text(`Phone: ${order.customerPhoneNumber || "—"}`, marginX, cursorY);
  cursorY += 14;

  const addressLine = [order.address, order.district, order.state]
    .filter(Boolean)
    .join(", ");
  const addressText = `${addressLine}${order.zipCode ? ` — ${order.zipCode}` : ""}`;
  const wrappedAddress = doc.splitTextToSize(addressText || "—", 515);
  doc.text(wrappedAddress, marginX, cursorY);
  cursorY += wrappedAddress.length * 14 + 10;

  const items = (order.categories || []).flatMap((cat) => cat.products || []);
  // First column is left blank in the data — the thumbnail is painted
  // on top of that cell in didDrawCell below, since autoTable cells only
  // hold text/strings, not images.
  const rows = items.map((p) => [
    "",
    p.productName || "",
    String(p.noOfQuantity ?? ""),
    `Rs ${p.afterDiscountPrice ?? 0}`,
    `Rs ${(Number(p.afterDiscountPrice) || 0) * (Number(p.noOfQuantity) || 0)}`,
  ]);

  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginX, right: marginX },
    head: [["", "Item", "Qty", "Price", "Subtotal"]],
    body: rows,
    styles: { fontSize: 9, cellPadding: 6, minCellHeight: 32, valign: "middle" },
    headStyles: { fillColor: [67, 56, 202] },
    columnStyles: { 0: { cellWidth: 34 } },
    didDrawCell: (data) => {
      if (data.section !== "body" || data.column.index !== 0) return;
      const product = items[data.row.index];
      const dataUrl = product && imageUrls[product.productImage];
      const format = pdfImageFormat(dataUrl);
      if (!dataUrl || !format) return;
      try {
        const size = Math.min(data.cell.height, data.cell.width) - 6;
        const x = data.cell.x + (data.cell.width - size) / 2;
        const y = data.cell.y + (data.cell.height - size) / 2;
        doc.addImage(dataUrl, format, x, y, size, size);
      } catch (err) {
        // A single bad/corrupt image shouldn't break the rest of the PDF.
        console.error("Failed to embed product image in PDF:", err);
      }
    },
  });

  let afterTableY = doc.lastAutoTable.finalY + 24;

  doc.setFont(undefined, "bold");
  doc.text(`Grand Total: Rs ${order.grandTotal ?? 0} /-`, marginX, afterTableY);
  doc.setFont(undefined, "normal");

  savePdf(doc, `order-${orderIdLabel}.pdf`);
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
  const [selectedFilter, setSelectedFilter] = useState("total");
  // Order cards start collapsed, showing just the order id + status. Each
  // order's expanded state is independent, so the vendor can open several
  // at once rather than an accordion that closes the others.
  const [expandedOrders, setExpandedOrders] = useState({});
  const toggleOrderExpanded = (orderId) =>
    setExpandedOrders((prev) => ({ ...prev, [orderId]: !prev[orderId] }));

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
          axios
          .get(GET_DELIVERYPARTNERS_BYVENDORID, { params: { vendorId } }).catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;
        const list = Array.isArray(ordersRes.data) ? ordersRes.data : [];
        setOrders(list);
                const partners = Array.isArray(partnersRes.data)
          ? partnersRes.data
          : partnersRes.data
            ? [partnersRes.data]
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

const filteredOrders = useMemo(() => {
  switch (selectedFilter) {
    case "open":
      return visibleOrders.filter(
        (o) => String(o.status || "").toLowerCase() === "open"
      );

    case "delivered":
      return visibleOrders.filter(
        (o) =>
          o.isDelivered ||
          String(o.status || "").toLowerCase() === "delivered" ||
          String(o.status || "").toLowerCase() === "completed"
      );

    case "unassigned":
      return visibleOrders.filter(
        (o) => !o.assignedTo
      );

    case "cancel":
      return visibleOrders.filter(
        (o) => {
          const status = String(o.status || "").toLowerCase();
          return status === "cancel" ;
        }
      );

    case "rejected":
      return visibleOrders.filter(
        (o) => String(o.status || "").toLowerCase() === "rejected"
      );

    case "total":
    default:
      return visibleOrders;
  }
}, [visibleOrders, selectedFilter]);

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
      const assignedTime = new Date().toISOString();
      const payload = {
        ...order,
        assignedTo: partner.deliveryPartnerName,
        deliveryPartnerUserId: partner.userId,
        deliveryAssignedTime: new Date().toISOString(),
         Status: "In Progress",
      };
      await axios.put(`${UPDATE_ORDER}/${order.id}`, payload, {
        headers: { "Content-Type": "application/json" },
      });
        setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? {
                ...o,
                assignedTo: partner.deliveryPartnerName,
                deliveryPartnerUserId: partner.userId,
                deliveryAssignedTime: assignedTime,
                status: "In Progress",
              }
            : o,
        ),
      );
      setMessage("Assigned to delivery partner successfully.");
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
    <div className="container py-4" style={{ maxWidth: "100%", overflowX: "hidden" }}>
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
<style>{`
  .vendor-stats-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    width: 100%;
  }
  @media (min-width: 768px) {
    .vendor-stats-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }
  }
  .vendor-stat-card {
    min-width: 0;
    width: 100%;
    box-sizing: border-box;
    overflow: hidden;
  }
  .vendor-stat-card .card-body {
    min-width: 0;
  }
  .vendor-stat-top {
    min-width: 0;
    width: 100%;
  }
  .vendor-stat-value {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .vendor-stat-label {
    min-width: 0;
    white-space: normal;
    word-break: break-word;
  }
`}</style>
<div className="vendor-stats-grid mb-4">
  {[
    {
      key: "total",
      icon: <Inventory2Icon style={{ color: "#4338ca" }} fontSize="small" />,
      bg: "rgba(67,56,202,.1)",
      value: summary.total,
      label: "Total orders",
    },
    {
      key: "open",
      icon: <PendingActionsIcon className="text-warning" fontSize="small" />,
      bg: "rgba(255,193,7,.15)",
      value: summary.open,
      label: "Open",
    },
    {
      key: "delivered",
      icon: <CheckCircleIcon className="text-success" fontSize="small" />,
      bg: "rgba(25,135,84,.12)",
      value: summary.delivered,
      label: "Delivered",  
    },
    {
      key: "unassigned",
      icon: <TwoWheelerIcon className="text-info" fontSize="small" />,
      bg: "rgba(13,202,240,.15)",
      value: summary.unassigned,
      label: "Unassigned",
    },
    {
      key: "Cancel",
      icon: <CheckCircleIcon className="text-danger" fontSize="small" />,
      bg: "rgba(220,53,69,.12)",
      value: summary.statusCounts.cancel || summary.statusCounts.cancel || 0,
      label: "Cancel",
    },
    {
      key: "rejected",
      icon: <CheckCircleIcon className="text-danger" fontSize="small" />,
      bg: "rgba(220,53,69,.12)",
      value: summary.statusCounts.rejected || summary.statusCounts.Rejected || 0,
      label: "Rejected",
    },
  ].map((stat) => (
    <div
      className={`card border shadow-sm h-100 vendor-stat-card ${
        selectedFilter === stat.key ? "border-primary border-2" : ""
      }`}
      key={stat.key}
      onClick={() => setSelectedFilter(stat.key)}
      style={{
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
    >
      <div className="card-body p-2 p-md-3 d-flex flex-column align-items-start gap-1 gap-md-2">
        <div className="d-flex align-items-center gap-2 vendor-stat-top">
          <div
            className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
            style={{
              width: 32,
              height: 32,
              backgroundColor: stat.bg,
            }}
          >
            {stat.icon}
          </div>

          <div className="fs-6 fs-md-5 fw-bold lh-1 vendor-stat-value">
            {stat.value}
          </div>
        </div>

        <div
          className="text-muted text-uppercase vendor-stat-label"
          style={{
            fontSize: 10,
            letterSpacing: ".03em",
            lineHeight: 1.2,
          }}
        >
          {stat.label}
        </div>
      </div>
    </div>
  ))}
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
      {filteredOrders.length === 0 ? (
        <div className="text-muted text-center py-5">No orders yet for this store.</div>
      ) : (
        <div className="row g-3">
          {filteredOrders.map((order) => {
            const itemCount = (order.categories || []).reduce(
              (sum, cat) => sum + (cat.products || []).length,
              0,
            );
            const walletPct = Number(order.totalWalletAmount)
              ? Math.min(100, (Number(order.availedAmount) / Number(order.totalWalletAmount)) * 100)
              : 0;

            const orderIdLabel = order.martId || order.id;
            const isExpanded = !!expandedOrders[order.id];

            return (
              <div className="col-12 col-lg-6" key={order.id}>
                <div className="card border shadow-sm h-100">
                  {/* Compact card — always visible. Tap anywhere on it to
                      expand/collapse the full order details below. */}
                  <div
                    className="card-body p-3 d-flex justify-content-between align-items-center gap-2"
                    style={{ cursor: "pointer" }}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleOrderExpanded(order.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleOrderExpanded(order.id);
                      }
                    }}
                  >
                    <div className="d-flex flex-column gap-1" style={{ minWidth: 0 }}>
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <span className="fw-bold small text-truncate">Order #{orderIdLabel}</span>
                        <span className={`badge ${statusBadgeClass(order.status)}`}>
                          {order.status || "Open"}
                        </span>
                        <span className="badge bg-light text-dark border">
                          {order.isPickUp ? "Pickup" : "Delivery"}
                        </span>
                      </div>
                      <div className="small text-muted text-truncate">
                        {order.customerName || "Customer"} &middot; {formatDate(order.date)}
                      </div>
                    </div>
                    <div className="d-flex align-items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        className="btn btn-sm btn-light d-inline-flex align-items-center justify-content-center rounded-circle"
                        style={{ width: 32, height: 32 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadOrderPdf(order, vendor, imageUrls);
                        }}
                        aria-label="Download order as PDF"
                        title="Download PDF"
                      >
                        <PictureAsPdfIcon fontSize="small" style={{ color: "#dc2626" }} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-light d-inline-flex align-items-center justify-content-center rounded-circle"
                        style={{ width: 32, height: 32 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleOrderExpanded(order.id);
                        }}
                        aria-label={isExpanded ? "Collapse order details" : "Expand order details"}
                        title={isExpanded ? "Collapse" : "Expand"}
                      >
                        {isExpanded ? (
                          <ExpandLessIcon fontSize="small" />
                        ) : (
                          <ExpandMoreIcon fontSize="small" />
                        )}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="card-body pt-0 border-top">
                    <div className="small text-muted d-flex align-items-center gap-1 mb-1 mt-3">
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
                      {order.assignedTo && (
                        <div className="alert alert-success py-1 px-2 small mt-2 mb-0 d-flex align-items-center gap-1">
                          <CheckCircleIcon fontSize="inherit" />
                          Order is assigned to <strong>{order.assignedTo}</strong>
                        </div>
                      )}
                      {order.deliveryAssignedTime && (
                        <div className="small text-muted mt-1">
                          Assigned {formatDate(order.deliveryAssignedTime)}
                        </div>
                      )}
                    </div>
                    </div>
                  )}
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