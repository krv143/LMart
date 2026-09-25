import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { hasValidCoords, directionsUrl, openExternal, onMapsAuthFailure } from "../utils/maps";
import { createOrderMap } from "../utils/orderMap";

const API_BASE =
  "https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api";
const GET_ALL_MART_ITEMS = `${API_BASE}/Mart/GetAllMartItems`;
const POLL_MS = 30000;
const DEFAULT_CENTER = { lat: 17.6868, lng: 83.2185 }; // Visakhapatnam

const STATUS_COLORS = {
  open: "#dc3545",
  "in progress": "#fd7e14",
  delivered: "#198754",
  cancelled: "#6c757d",
};
const statusColor = (s) => STATUS_COLORS[String(s || "").toLowerCase()] || "#0d6efd";

const toList = (data) => (Array.isArray(data) ? data : data ? [data] : []);
const orderCoords = (o) => {
  const lat = Number(o.latitude);
  const lng = Number(o.longitude);
  return hasValidCoords(lat, lng) ? { lat, lng } : null;
};
const addressLine = (o) =>
  [o.address, o.district, o.state, o.zipCode].filter(Boolean).join(", ");
const fmtDate = (d) => {
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? "" : t.toLocaleString();
};

/**
 * Admin view: every order across every store, as pins on one map. Read-only —
 * this is for seeing where orders are, not for acting on them (use the
 * vendor/admin order pages for that; "Open order" here just links to them).
 */
const AdminOrdersMapPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [mapReady, setMapReady] = useState(false);
  const [forceLeaflet, setForceLeaflet] = useState(false);
  const [mapError, setMapError] = useState("");
  const [tileError, setTileError] = useState(false);
  const [mapReloadKey, setMapReloadKey] = useState(0);

  const mapDivRef = useRef(null);
  const engineRef = useRef(null);
  const pinsRef = useRef([]);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await axios.get(GET_ALL_MART_ITEMS);
      const all = toList(res.data?.data ?? res.data?.$values ?? res.data);
      setOrders(all);
      setError("");
    } catch (e) {
      console.error("Could not load orders:", e);
      setError("Could not load orders. This page refreshes automatically — it will retry shortly.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const t = setInterval(fetchOrders, POLL_MS);
    return () => clearInterval(t);
  }, [fetchOrders]);

  // only orders with a real, plottable location
  const located = useMemo(
    () => orders.map((o) => ({ ...o, _c: orderCoords(o) })).filter((o) => o._c),
    [orders],
  );

  const statusOptions = useMemo(() => {
    const set = new Set(located.map((o) => String(o.status || "Unknown")));
    return ["all", ...Array.from(set).sort()];
  }, [located]);

  const shown = useMemo(
    () =>
      statusFilter === "all"
        ? located
        : located.filter((o) => String(o.status || "Unknown") === statusFilter),
    [located, statusFilter],
  );

  // ---------- map ----------
  // If a Google Maps key is set but rejected (invalid key, API not enabled,
  // billing off), fall back to OpenStreetMap instead of a broken/blank map.
  useEffect(() => {
    onMapsAuthFailure(() => setForceLeaflet(true));
  }, []);

  useEffect(() => {
    if (!mapDivRef.current) return undefined;
    let cancelled = false;
    let engine = null;
    setMapReady(false);
    setMapError("");
    setTileError(false);
    createOrderMap(
      mapDivRef.current,
      { center: DEFAULT_CENTER, zoom: 12 },
      { forceLeaflet, onTileError: () => setTileError(true) },
    )
      .then((e) => {
        if (cancelled) {
          e.destroy();
          return;
        }
        engine = e;
        engineRef.current = e;
        setMapReady(true);
        setTimeout(() => e.invalidate(), 0);
      })
      .catch((err) => {
        console.error("Map failed to load:", err);
        if (!cancelled) setMapError("The map couldn't load. Check your internet connection and try Retry.");
      });
    return () => {
      cancelled = true;
      if (engine) engine.destroy();
      engineRef.current = null;
    };
  }, [forceLeaflet, mapReloadKey]);

  const pins = useMemo(
    () =>
      shown.map((o) => ({
        id: o.id,
        lat: o._c.lat,
        lng: o._c.lng,
        label: "",
        color: statusColor(o.status),
        selected: o.id === selectedId,
        title: `${o.martId || "Order"} · ${o.storeName || ""} · ${o.status || ""}`,
      })),
    [shown, selectedId],
  );
  pinsRef.current = pins;

  useEffect(() => {
    if (mapReady) engineRef.current.setPins(pins, (id) => setSelectedId(id));
  }, [mapReady, pins]);

  const showAllPins = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.fitPoints(pinsRef.current.map((p) => ({ lat: p.lat, lng: p.lng })));
  }, []);

  useEffect(() => {
    if (mapReady) showAllPins();
  }, [mapReady, pins, showAllPins]);

  const selectedOrder = shown.find((o) => o.id === selectedId) || null;

  const openInMaps = (o) =>
    openExternal(directionsUrl({ lat: o._c.lat, lng: o._c.lng, address: addressLine(o) }));

  const openOrderPage = (o) => {
    // The existing per-order admin views are keyed differently per flow
    // (grocery vs product); grocery orders (martId) are the common case here.
    if (o.martId) navigate(`/adminGroceryOrderPage/${o.martId}`);
  };

  return (
    <div style={{ background: "#f5f7fb", minHeight: "100vh", paddingBottom: 24 }}>
      <div
        className="d-flex align-items-center gap-2 px-3 py-3 text-white"
        style={{ background: "linear-gradient(135deg,#0d6efd,#0a4fb5)" }}
      >
        <button
          className="btn btn-sm btn-light rounded-circle p-1 d-flex"
          onClick={() => navigate(-1)}
          aria-label="Back"
        >
          <ArrowBackIcon fontSize="small" />
        </button>
        <div className="flex-grow-1">
          <div style={{ fontWeight: 700, fontSize: 18 }}>All Orders — Map</div>
          <div style={{ fontSize: 12, opacity: 0.9 }}>
            {loading ? "Loading…" : `${shown.length} of ${located.length} located order${located.length === 1 ? "" : "s"}`}
          </div>
        </div>
        <button className="btn btn-sm btn-light" onClick={fetchOrders}>
          Refresh
        </button>
      </div>

      <div className="container-fluid px-3 pt-3" style={{ maxWidth: 1000 }}>
        {error && <div className="alert alert-danger py-2">{error}</div>}

        {/* STATUS FILTER + LEGEND */}
        <div className="d-flex align-items-center flex-wrap gap-2 mb-2">
          <span className="fw-semibold small">Status:</span>
          <div className="btn-group btn-group-sm flex-wrap" role="group" aria-label="Status filter">
            {statusOptions.map((s) => (
              <button
                key={s}
                type="button"
                className={`btn ${statusFilter === s ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setStatusFilter(s)}
              >
                {s === "all" ? "All" : s}
              </button>
            ))}
          </div>
        </div>
        <div className="d-flex flex-wrap gap-3 small text-muted mb-2">
          {Object.entries(STATUS_COLORS).map(([label, color]) => (
            <span key={label} className="d-flex align-items-center gap-1">
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block" }} />
              {label}
            </span>
          ))}
        </div>

        {/* MAP */}
        <div className="card border-0 shadow-sm mb-3" style={{ borderRadius: 16, overflow: "hidden" }}>
          {mapError ? (
            <div className="p-4 text-center text-muted">
              {mapError}
              <div className="mt-2">
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => {
                    // Clearing mapError first re-mounts the container div (so
                    // the ref is set again) before the effect below re-runs.
                    setMapError("");
                    setMapReloadKey((k) => k + 1);
                  }}
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <div style={{ position: "relative", isolation: "isolate" }}>
              <div
                key={`${forceLeaflet ? "leaflet" : "auto"}-${mapReloadKey}`}
                ref={mapDivRef}
                style={{ width: "100%", height: "60vh", minHeight: 320 }}
              />
              <div style={{ position: "absolute", top: 10, right: 10, zIndex: 1100 }}>
                <button className="btn btn-sm btn-light shadow-sm" onClick={showAllPins}>
                  Fit all pins
                </button>
              </div>
            </div>
          )}
          {!mapError && tileError && (
            <div className="px-3 py-1 small text-warning bg-white border-top">
              Map background tiles failed to load — check your internet connection. Pins below still work.
            </div>
          )}
          {!mapError && (
            <div className="px-3 py-2 small bg-white">
              {shown.length === 0
                ? loading
                  ? "Loading orders…"
                  : "No orders with a saved location match this filter."
                : `${shown.length} order${shown.length === 1 ? "" : "s"} on the map · tap a pin for details`}
            </div>
          )}
        </div>

        {/* SELECTED ORDER */}
        {selectedOrder && (
          <div className="card border-0 shadow-sm mb-3" style={{ borderRadius: 14, borderLeft: `5px solid ${statusColor(selectedOrder.status)}` }}>
            <div className="card-body py-3">
              <div className="d-flex align-items-center gap-2">
                <strong className="flex-grow-1">Order {selectedOrder.martId || ""}</strong>
                <span className="badge" style={{ background: statusColor(selectedOrder.status) }}>
                  {selectedOrder.status || "Unknown"}
                </span>
                <button className="btn btn-sm btn-outline-secondary" aria-label="Close" onClick={() => setSelectedId(null)}>
                  ✕
                </button>
              </div>
              {selectedOrder.storeName && <div className="text-muted small mt-1">Store: {selectedOrder.storeName}</div>}
              {selectedOrder.customerName && <div className="small">Customer: {selectedOrder.customerName}</div>}
              <div className="small">{addressLine(selectedOrder)}</div>
              <div className="text-muted small">
                {selectedOrder.assignedTo ? `Assigned to ${selectedOrder.assignedTo} · ` : ""}
                {selectedOrder.grandTotal ? `₹${selectedOrder.grandTotal}` : ""}
                {selectedOrder.date ? ` · ${fmtDate(selectedOrder.date)}` : ""}
              </div>
              <div className="d-flex gap-2 mt-3">
                <button className="btn btn-primary flex-grow-1" onClick={() => openInMaps(selectedOrder)}>
                  🧭 Open in Maps
                </button>
                {selectedOrder.martId && (
                  <button className="btn btn-outline-secondary" onClick={() => openOrderPage(selectedOrder)}>
                    Open order
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOrdersMapPage;
