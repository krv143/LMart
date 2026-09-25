import React, { useEffect, useMemo, useState } from "react";
import { getAllVendorOrders, getAllVendors } from "../utils/superAdminStore";
import SuperAdminNav from "./SuperAdminNav";

const statusBadgeClass = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "delivered" || s === "completed") return "bg-success";
  if (s === "cancel" || s === "cancelled" || s === "rejected")
    return "bg-danger";
  if (s === "in progress") return "bg-info text-dark";
  if (s === "draft") return "bg-secondary";
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

const SuperAdminOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [expandedVendors, setExpandedVendors] = useState({});

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
            (o) => String(o.status || "").toLowerCase() !== "draft",
          ),
        );
        setVendors(vendorList);
      } catch (err) {
        console.error("Failed to load orders", err);
        if (!cancelled)
          setError("Unable to load orders right now. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const storeNameByVendorId = useMemo(() => {
    const map = {};
    vendors.forEach((v) => {
      if (v.vendorId) map[v.vendorId] = v.storeName || v.fullName || v.vendorId;
    });
    return map;
  }, [vendors]);

  const groupedByVendor = useMemo(() => {
    const groups = {};
    orders.forEach((order) => {
      const vendorId = order.vendorId || "unknown";
      if (!groups[vendorId]) {
        groups[vendorId] = {
          vendorId,
          storeName: storeNameByVendorId[vendorId] || "Unknown vendor",
          orders: [],
        };
      }
      groups[vendorId].orders.push(order);
    });
    return Object.values(groups).sort(
      (a, b) => b.orders.length - a.orders.length,
    );
  }, [orders, storeNameByVendorId]);

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
              .includes(query),
        ),
      }))
      .filter(
        (group) =>
          group.storeName.toLowerCase().includes(query) ||
          group.orders.length > 0,
      );
  }, [groupedByVendor, query]);

  const toggleVendor = (vendorId) =>
    setExpandedVendors((prev) => ({ ...prev, [vendorId]: !prev[vendorId] }));

  const totalOrders = orders.length;
  const pendingOrders = orders.filter(
    (o) =>
      !["delivered", "completed"].includes(
        String(o.status || "").toLowerCase(),
      ),
  ).length;

  return (
    <div className="container py-4">
      <SuperAdminNav active="/superadmin/orders" />
      <h3 className="mb-3">Orders by Vendor</h3>

      <div className="row g-2 mb-4">
        {/* Total Orders */}
        <div className="col-6 col-md-4">
          <div
            className="card border-0 shadow-sm rounded-3 w-100"
            style={{
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <div className="card-body text-center py-2 px-1">
              <div className="fs-5 fw-bold text-primary">{totalOrders}</div>

              <div
                className="text-muted small"
                style={{
                  whiteSpace: "normal",
                  wordBreak: "break-word",
                }}
              >
                Total Orders
              </div>
            </div>
          </div>
        </div>

        {/* Pending Orders */}
        <div className="col-6 col-md-4">
          <div
            className="card border-0 shadow-sm rounded-3 w-100"
            style={{
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <div className="card-body text-center py-2 px-1">
              <div className="fs-5 fw-bold text-warning">{pendingOrders}</div>

              <div
                className="text-muted small"
                style={{
                  whiteSpace: "normal",
                  wordBreak: "break-word",
                }}
              >
                Pending / In Progress
              </div>
            </div>
          </div>
        </div>

        {/* Vendors With Orders */}
        <div className="col-12 col-md-4">
          <div
            className="card border-0 shadow-sm rounded-3 w-100"
            style={{
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <div className="card-body text-center py-3 px-2">
              <div className="fs-5 fw-bold text-success">
                {groupedByVendor.length}
              </div>

              <div className="text-muted small">Vendors with Orders</div>
            </div>
          </div>
        </div>
      </div>

      <input
        type="text"
        className="form-control mb-4"
        placeholder="Search by vendor, order id, or customer"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading && (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      {!loading && error && <div className="alert alert-danger">{error}</div>}

      {!loading && !error && filteredGroups.length === 0 && (
        <div className="text-muted text-center py-5">No orders found.</div>
      )}

      {!loading &&
        !error &&
        filteredGroups.map((group) => {
          const isExpanded = !!expandedVendors[group.vendorId];
          return (
            <div className="card border shadow-sm mb-3" key={group.vendorId}>
              <div
                className="card-body d-flex justify-content-between align-items-center"
                style={{ cursor: "pointer" }}
                role="button"
                onClick={() => toggleVendor(group.vendorId)}
              >
                <div>
                  <div className="fw-bold">{group.storeName}</div>
                  <div className="small text-muted">
                    {group.orders.length} order
                    {group.orders.length === 1 ? "" : "s"}
                  </div>
                </div>
                <span className="btn btn-sm btn-light rounded-circle">
                  {isExpanded ? "−" : "+"}
                </span>
              </div>

              {isExpanded && (
                <div className="table-responsive border-top">
                  <table className="table table-sm mb-0">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Customer</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Assigned to</th>
                        <th className="text-end">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.orders.map((order) => (
                        <tr key={order.id}>
                          <td>{order.martId || order.id}</td>
                          <td>{order.customerName || "—"}</td>
                          <td>{formatDate(order.date)}</td>
                          <td>
                            <span
                              className={`badge ${statusBadgeClass(order.status)}`}
                            >
                              {order.status || "Open"}
                            </span>
                          </td>
                          <td>{order.assignedTo || "Unassigned"}</td>
                          <td className="text-end">
                            ₹{order.grandTotal ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
};

export default SuperAdminOrdersPage;
