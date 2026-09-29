import React, { useEffect, useMemo, useState } from "react";
import { getAllVendorOrders, getAllVendors } from "../utils/superAdminStore";
import SuperAdminNav from "./SuperAdminNav";

/* =========================================================
   STATUS BADGE
========================================================= */
const statusBadgeClass = (status) => {
  const s = String(status || "").toLowerCase();

  if (s === "delivered" || s === "completed") return "bg-success";
  if (s === "cancel" || s === "cancelled" || s === "rejected")
    return "bg-danger";
  if (s === "in progress") return "bg-info text-dark";
  if (s === "draft") return "bg-secondary";

  return "bg-warning text-dark";
};

/* =========================================================
   DATE FORMAT
========================================================= */
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

/* =========================================================
   VENDOR COLOR PALETTE
========================================================= */
const vendorPalettes = [
  {
    background: "#EEF4FF",
    border: "#B8CEFF",
    accent: "#2563EB",
    iconBackground: "#DBEAFE",
  },
  {
    background: "#F0FDF4",
    border: "#BBE7C5",
    accent: "#16A34A",
    iconBackground: "#DCFCE7",
  },
  {
    background: "#FFF7ED",
    border: "#FED7AA",
    accent: "#EA580C",
    iconBackground: "#FFEDD5",
  },
  {
    background: "#FDF4FF",
    border: "#E9D5FF",
    accent: "#9333EA",
    iconBackground: "#F3E8FF",
  },
  {
    background: "#ECFEFF",
    border: "#A5F3FC",
    accent: "#0891B2",
    iconBackground: "#CFFAFE",
  },
  {
    background: "#FFF1F2",
    border: "#FECDD3",
    accent: "#E11D48",
    iconBackground: "#FFE4E6",
  },
  {
    background: "#F7FEE7",
    border: "#D9F99D",
    accent: "#65A30D",
    iconBackground: "#ECFCCB",
  },
  {
    background: "#F8FAFC",
    border: "#CBD5E1",
    accent: "#475569",
    iconBackground: "#E2E8F0",
  },
];

const getVendorPalette = (index) => {
  return vendorPalettes[index % vendorPalettes.length];
};

/* =========================================================
   VENDOR INITIAL
========================================================= */
const getVendorInitial = (storeName) => {
  if (!storeName) return "V";

  return String(storeName)
    .trim()
    .charAt(0)
    .toUpperCase();
};

/* =========================================================
   MAIN COMPONENT
========================================================= */
const SuperAdminOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [expandedVendorId, setExpandedVendorId] = useState(null);
  /* =========================================================
     LOAD DATA
  ========================================================= */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");

      try {
        const [orderList, vendorList] = await Promise.all([
          getAllVendorOrders(),
          getAllVendors(),
        ]);

        if (cancelled) return;

        setOrders(
          orderList.filter(
            (o) => String(o.status || "").toLowerCase() !== "draft"
          )
        );

        setVendors(vendorList);
      } catch (err) {
        console.error("Failed to load orders", err);

        if (!cancelled) {
          setError("Unable to load orders right now. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =========================================================
     STORE NAME MAP
  ========================================================= */
  const storeNameByVendorId = useMemo(() => {
    const map = {};

    vendors.forEach((v) => {
      if (v.vendorId) {
        map[v.vendorId] =
          v.storeName ||
          v.fullName ||
          v.vendorId;
      }
    });

    return map;
  }, [vendors]);

  /* =========================================================
     GROUP ORDERS BY VENDOR
  ========================================================= */
  const groupedByVendor = useMemo(() => {
    const groups = {};

    orders.forEach((order) => {
      const vendorId = order.vendorId || "unknown";

      if (!groups[vendorId]) {
        groups[vendorId] = {
          vendorId,
          storeName:
            storeNameByVendorId[vendorId] || "Unknown vendor",
          orders: [],
        };
      }

      groups[vendorId].orders.push(order);
    });

    return Object.values(groups).sort(
      (a, b) => b.orders.length - a.orders.length
    );
  }, [orders, storeNameByVendorId]);

  /* =========================================================
     SEARCH
  ========================================================= */
  const query = search.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!query) return groupedByVendor;

    return groupedByVendor
      .map((group) => ({
        ...group,

        orders: group.orders.filter(
          (o) =>
            group.storeName.toLowerCase().includes(query) ||
            String(o.martId || o.id || "")
              .toLowerCase()
              .includes(query) ||
            String(o.customerName || "")
              .toLowerCase()
              .includes(query)
        ),
      }))
      .filter(
        (group) =>
          group.storeName.toLowerCase().includes(query) ||
          group.orders.length > 0
      );
  }, [groupedByVendor, query]);

  /* =========================================================
     TOGGLE VENDOR
  ========================================================= */
  const toggleVendor = (vendorId) => {
    setExpandedVendorId((prev) => 
       prev === vendorId ? null : vendorId
    );
  };

  /* =========================================================
     SUMMARY
  ========================================================= */
  const totalOrders = orders.length;

  const pendingOrders = orders.filter(
    (o) =>
      !["delivered", "completed"].includes(
        String(o.status || "").toLowerCase()
      )
  ).length;

  return (
     <>
    <style>
      {`
        .vendor-orders-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          width: 100%;
          align-items: start;
        }

        .vendor-order-card {
          min-width: 0;
          width: 100%;
        }

        .vendor-card-header {
          min-height: 108px;
          cursor: pointer;
          transition: transform 0.2s ease,
                      box-shadow 0.2s ease;
        }

        .vendor-card-header:hover {
          transform: translateY(-2px);
        }

        .vendor-card-header:active {
          transform: scale(0.99);
        }

        .selected-vendor-orders {
          width: 100%;
        }

        /* TABLET */
        @media (max-width: 991px) {
          .vendor-orders-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        /* MOBILE */
        @media (max-width: 575px) {
          .vendor-orders-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .vendor-card-header {
            min-height: 100px;
          }

          .selected-vendor-orders {
            margin-top: 12px !important;
          }
        }
      `}
    </style>
    <div
      className="container-fluid py-3 py-md-4"
      style={{
        maxWidth: "1500px",
        margin: "0 auto",
      }}
    >
      <SuperAdminNav active="/superadmin/orders" />

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3">
        <div>
          <h3 className="mb-1 fw-bold">Orders by Vendor</h3>

          <div className="text-muted small">
            Manage and view orders grouped by vendor store
          </div>
        </div>
      </div>

      {/* =====================================================
          SUMMARY CARDS
      ===================================================== */}
      <div className="row g-2 g-md-3 mb-2">
        {/* TOTAL ORDERS */}
        <div className="col-12 col-md-4">
          <div
            className="card border-0 shadow-sm h-100"
            style={{
              borderRadius: "14px",
              background: "#ffffff",
            }}
          >
            <div className="card-body text-center py-3">
              <div className="fs-4 fw-bold text-primary">
                {totalOrders}
              </div>

              <div className="text-muted small">
                Total Orders
              </div>
            </div>
          </div>
        </div>

        {/* PENDING */}
        <div className="col-6 col-md-4">
          <div
            className="card border-0 shadow-sm h-100"
            style={{
              borderRadius: "14px",
              background: "#FFF7ED",
            }}
          >
            <div className="card-body text-center py-3">
              <div className="fs-4 fw-bold text-warning">
                {pendingOrders}
              </div>

              <div className="text-muted small">
                Pending / In Progress
              </div>
            </div>
          </div>
        </div>

        {/* VENDORS */}
        <div className="col-12 col-md-4">
          <div
            className="card border-0 shadow-sm h-100"
            style={{
              borderRadius: "14px",
              background: "#F0FDF4",
            }}
          >
            <div className="card-body text-center py-3">
              <div className="fs-4 fw-bold text-success">
                {groupedByVendor.length}
              </div>

              <div className="text-muted small">
                Vendors with Orders
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          SEARCH
      ===================================================== */}
      <div className="mb-4">
        <div className="position-relative">
          <input
            type="text"
            className="form-control"
            placeholder="Search by vendor, order ID, or customer"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              borderRadius: "12px",
              minHeight: "46px",
              paddingLeft: "15px",
            }}
          />
        </div>
      </div>

      {/* =====================================================
          LOADING
      ===================================================== */}
      {loading && (
        <div className="d-flex justify-content-center py-5">
          <div
            className="spinner-border text-primary"
            role="status"
          >
            <span className="visually-hidden">
              Loading...
            </span>
          </div>
        </div>
      )}

      {/* =====================================================
          ERROR
      ===================================================== */}
      {!loading && error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {/* =====================================================
          EMPTY
      ===================================================== */}
      {!loading &&
        !error &&
        filteredGroups.length === 0 && (
          <div className="text-muted text-center py-5">
            No orders found.
          </div>
        )}

      {/* =====================================================
    VENDOR CARDS
===================================================== */}
{!loading &&
  !error &&
  filteredGroups.length > 0 && (
    <>
      {/* =================================================
          VENDOR GRID
      ================================================= */}
      <div className="vendor-orders-grid">
        {filteredGroups.map((group, index) => {
          const isExpanded =
            expandedVendorId === group.vendorId;

          const palette = getVendorPalette(index);

          return (
            <div
              key={group.vendorId}
              className="vendor-order-card"
            >
              <div
                className="vendor-card-header"
                onClick={() =>
                  toggleVendor(group.vendorId)
                }
                style={{
                  background: palette.background,
                  border: `1px solid ${palette.border}`,
                  borderRadius: "16px",
                  padding: "14px",
                  boxShadow: isExpanded
                    ? `0 4px 12px ${palette.border}`
                    : "0 2px 6px rgba(0,0,0,0.08)",
                }}
              >
                <div
                  className="d-flex align-items-center justify-content-between"
                  style={{
                    gap: "10px",
                  }}
                >
                  {/* =====================================
                      VENDOR LEFT SIDE
                  ===================================== */}
                  <div
                    className="d-flex align-items-center"
                    style={{
                      gap: "12px",
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    {/* VENDOR ICON */}
                    <div
                      className="d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{
                        width: "52px",
                        height: "52px",
                        borderRadius: "14px",
                        background:
                          palette.iconBackground,
                        color: palette.accent,
                        border: `1px solid ${palette.border}`,
                        fontSize: "21px",
                        fontWeight: "700",
                      }}
                    >
                      {getVendorInitial(
                        group.storeName
                      )}
                    </div>

                    {/* STORE NAME */}
                    <div
                      style={{
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <div
                        className="fw-bold"
                        style={{
                          color: palette.accent,
                          fontSize: "16px",
                          lineHeight: "1.25",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {group.storeName}
                      </div>

                      <div
                        className="small"
                        style={{
                          color: "#555",
                          marginTop: "4px",
                        }}
                      >
                        {group.orders.length}{" "}
                        {group.orders.length === 1
                          ? "order"
                          : "orders"}
                      </div>
                    </div>
                  </div>

                  {/* =====================================
                      PLUS / MINUS
                  ===================================== */}
                  <div
                    className="d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      background: "#fff",
                      color: palette.accent,
                      border: `1px solid ${palette.border}`,
                      fontSize: "23px",
                      fontWeight: "500",
                    }}
                  >
                    {isExpanded ? "−" : "+"}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* =================================================
          SELECTED VENDOR ORDERS
          IMPORTANT:
          THIS IS OUTSIDE THE GRID
      ================================================= */}
      {expandedVendorId && (
        (() => {
          const selectedGroup =
            filteredGroups.find(
              (group) =>
                group.vendorId === expandedVendorId
            );

          if (!selectedGroup) return null;

          const selectedIndex =
            filteredGroups.findIndex(
              (group) =>
                group.vendorId === expandedVendorId
            );

          const palette =
            getVendorPalette(
              selectedIndex
            );

          return (
            <div
              className="selected-vendor-orders"
              style={{
                marginTop: "16px",
                width: "100%",
              }}
            >
              {/* =========================================
                  SELECTED VENDOR HEADER
              ========================================= */}
              <div
                className="d-flex align-items-center justify-content-between mb-2"
                style={{
                  background:
                    palette.background,
                  border: `1px solid ${palette.border}`,
                  borderRadius: "12px",
                  padding: "12px 16px",
                }}
              >
                <div>
                  <div
                    className="fw-bold"
                    style={{
                      color: palette.accent,
                      fontSize: "17px",
                    }}
                  >
                    {selectedGroup.storeName}
                  </div>

                  <div className="small text-muted">
                    {selectedGroup.orders.length}{" "}
                    {selectedGroup.orders.length === 1
                      ? "order"
                      : "orders"}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() =>
                    setExpandedVendorId(null)
                  }
                  style={{
                    width: "34px",
                    height: "34px",
                    borderRadius: "50%",
                    border: `1px solid ${palette.border}`,
                    background: "#fff",
                    color: palette.accent,
                    fontSize: "20px",
                    lineHeight: "1",
                  }}
                >
                  ×
                </button>
              </div>

              {/* =========================================
                  DESKTOP ORDERS TABLE
              ========================================= */}
              <div
                className="border-0 d-none d-md-block"
                style={{
                  borderRadius: "14px",
                  overflow: "hidden",
                  border: `1px solid ${palette.border}`,
                }}
              >
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead
                      style={{
                        background:
                          palette.background,
                      }}
                    >
                      <tr>
                        <th
                          className="px-3 py-3"
                        >
                          Order
                        </th>

                        <th>
                          Customer
                        </th>

                        <th>
                          Date
                        </th>

                        <th>
                          Status
                        </th>

                        <th>
                          Assigned to
                        </th>

                        <th className="text-end px-3">
                          Total
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedGroup.orders.map(
                        (order) => (
                          <tr key={order.id}>
                            <td className="px-3 fw-semibold">
                              {order.martId ||
                                order.id}
                            </td>

                            <td>
                              {order.customerName ||
                                "—"}
                            </td>

                            <td>
                              {formatDate(
                                order.date
                              )}
                            </td>

                            <td>
                              <span
                                className={`badge ${statusBadgeClass(
                                  order.status
                                )}`}
                                style={{
                                  padding:
                                    "6px 9px",
                                  borderRadius:
                                    "8px",
                                }}
                              >
                                {order.status ||
                                  "Open"}
                              </span>
                            </td>

                            <td>
                              {order.assignedTo ||
                                "Unassigned"}
                            </td>

                            <td className="text-end px-3 fw-bold">
                              ₹
                              {order.grandTotal ??
                                "—"}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* =========================================
                  MOBILE ORDERS
              ========================================= */}
              <div className="d-md-none">
                {selectedGroup.orders.map(
                  (order) => (
                    <div
                      key={order.id}
                      className="card border-0 shadow-sm mb-2"
                      style={{
                        borderRadius: "15px",
                        background: "#ffffff",
                      }}
                    >
                      <div className="card-body p-3">

                        {/* ORDER + STATUS */}
                        <div className="d-flex justify-content-end align-items-end">
                          <span
                            className={`badge ${statusBadgeClass(
                              order.status
                            )}`}
                            style={{
                              padding:
                                "6px 8px",
                              borderRadius:
                                "8px",
                            }}
                          >
                            {order.status ||
                              "Open"}
                          </span>
                        </div>
                        
                        <div>
                            <div className="mt-1">
                              <strong>Order:  </strong> {order.martId || order.id}
                            </div>
                          </div>

                        {/* CUSTOMER */}
                        <div>
                            <div className="mt-1">
                              <strong>Customer:  </strong> {order.customerName || "—"}
                            </div>
                          </div>

                        {/* DATE */}
                          <div>
                           <strong>Date: </strong>  {formatDate( order.date )}
                          </div>

                        {/* ASSIGNED */}
                          <div>
                           <strong> Assigned to: </strong> {order.assignedTo || "Unassigned"}
                          </div>

                        {/* TOTAL */}
                        <div
                          className="d-flex justify-content-between align-items-center pt-2 mt-2"
                          style={{
                            borderTop:
                              "1px solid #000",
                          }}
                        >
                          <span className="fw-bold">
                            Total
                          </span>

                          <span
                            className="fw-bold"
                            style={{
                              color:
                                palette.accent,
                              fontSize:
                                "16px",
                            }}
                          >
                            ₹
                            {order.grandTotal ??
                              "—"} /-
                          </span>
                        </div>

                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          );
        })()
      )}
    </>
  )}
    </div>
    </>
  );
};

export default SuperAdminOrdersPage;