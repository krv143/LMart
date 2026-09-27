import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { createOrderMap } from "../utils/orderMap";
import { hasMapsKey } from "../utils/maps";

// Same API_BASE pattern used in vendorListStore.js.
const API_BASE =
  "https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api";
const GET_ALL_MART_ITEMS = `${API_BASE}/Mart/GetAllMartItems`;

const DEFAULT_CENTER = { lat: 17.6868, lng: 83.2185 }; // Visakhapatnam
const EXACT_COLOR = "#3fb27f";
const APPROX_COLOR = "#e0a63e";
const HIGHLIGHT_COLOR = "#e53935";
const ACTIVE_ROUTE_COLOR = "#16864a";
const STALE_ROUTE_COLOR = "#dc7a18";
const GPS_STALE_AFTER_MS = 3 * 60 * 1000;

const POLL_INTERVAL_MS = 20000; // same cadence family as the ticket bell in SuperAdminNav.js

// sessionStorage keys — cleared when the tab closes, same convention as
// vendorListStore.js's per-pincode cache.
const KNOWN_IDS_KEY = "orderMapKnownIds_v1";
const UNSEEN_IDS_KEY = "orderMapUnseenIds_v1";

// The four statuses the toggle row filters on. Anything outside this set
// (e.g. "Draft") is always shown — the filter only ever hides a status the
// person can see a chip for, never hides data silently.
const FILTERS = [
  { key: "open", label: "Open" },
  { key: "inprogress", label: "In Progress" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

const toLocalDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getToday = () => toLocalDateInputValue(new Date());

const getOrderDate = (order) => order.date || order.Date;

const getOrderLocalDate = (order) => {
  const value = getOrderDate(order);
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : toLocalDateInputValue(date);
};

const normalizeStatus = (status) => {
  const s = String(status || "").toLowerCase().trim();
  if (s === "delivered" || s === "completed") return "delivered";
  if (s === "cancel" || s === "cancelled" || s === "rejected") return "cancelled";
  if (s === "in progress" || s === "inprogress") return "inprogress";
  if (s === "open") return "open";
  return null; // unrecognized status — never filtered out
};

const isZero = (v) => {
  const n = Number(v);
  return !v || Number.isNaN(n) || Math.abs(n) < 0.0001;
};

const orderKey = (order) =>
  order.id || `${order.martId || ""}-${order.date || ""}-${order.customerId || ""}`;

const getCourierLocation = (order) => {
  const lat = Number(order.deliveryPartnerLatitude ?? order.DeliveryPartnerLatitude);
  const lng = Number(order.deliveryPartnerLongitude ?? order.DeliveryPartnerLongitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return null;
  return { lat, lng };
};

const isCourierLocationStale = (order) => {
  const timestamp = order.deliveryPartnerLocationUpdatedAt || order.DeliveryPartnerLocationUpdatedAt;
  if (!timestamp) return true;
  const updatedAt = new Date(timestamp).getTime();
  return !Number.isFinite(updatedAt) || Date.now() - updatedAt > GPS_STALE_AFTER_MS;
};

const readIdSet = (key) => {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(key) || "[]"));
  } catch {
    return new Set();
  }
};
const writeIdSet = (key, set) => {
  try {
    sessionStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    /* sessionStorage unavailable — highlight state just won't persist across reloads */
  }
};

// Best-effort pincode -> lat/lng lookup via the free OSM/Nominatim geocoder.
// Good enough for orders with missing/zero GPS coordinates; swap this out
// for an internal pincode table if usage volume grows.
const pincodeCache = new Map(); // zip -> { lat, lng } | null
async function geocodePincode(zip, state, district) {
  if (!zip) return null;
  if (pincodeCache.has(zip)) return pincodeCache.get(zip);
  try {
    const q = encodeURIComponent(`${zip}, ${district || ""} ${state || ""}, India`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`,
      { headers: { "Accept-Language": "en" } },
    );
    const data = await res.json();
    if (data && data[0]) {
      const loc = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      pincodeCache.set(zip, loc);
      return loc;
    }
  } catch (err) {
    console.error("Pincode geocode failed", zip, err);
  }
  pincodeCache.set(zip, null);
  return null;
}

const normalizeOrders = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") return [payload];
  return [];
};

const OrderLocationMapPage = () => {
  const mapContainerRef = useRef(null);
  const mapEngineRef = useRef(null);
  const hasFitBoundsRef = useRef(false);

  const ordersRef = useRef([]); // last fetched orders, raw
  const resolvedRef = useRef(new Map()); // orderKey -> { lat, lng, approx } | null
  const knownIdsRef = useRef(readIdSet(KNOWN_IDS_KEY)); // every order id ever seen this session
  const unseenIdsRef = useRef(readIdSet(UNSEEN_IDS_KEY)); // new arrivals not yet opened
  const firstLoadRef = useRef(knownIdsRef.current.size === 0);
  const activeFiltersRef = useRef(new Set(FILTERS.map((f) => f.key)));
  const fromDateRef = useRef(getToday());
  const toDateRef = useRef(getToday());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mapEngineName, setMapEngineName] = useState("");
  const [counts, setCounts] = useState({ exact: 0, approx: 0, failed: 0, unseen: 0, active: 0, live: 0, attention: 0, delivered: 0 });
  const [activeFilters, setActiveFilters] = useState(activeFiltersRef.current);
  const [fromDate, setFromDate] = useState(fromDateRef.current);
  const [toDate, setToDate] = useState(toDateRef.current);

  const isInDateRange = (order) => {
    const orderDate = getOrderLocalDate(order);
    return (
      orderDate &&
      orderDate >= fromDateRef.current &&
      orderDate <= toDateRef.current
    );
  };

  useEffect(() => {
    activeFiltersRef.current = activeFilters;
    renderMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilters]);

  const toggleFilter = (key) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // Draws markers for the currently-cached orders using the current filter
  // and unseen-highlight state. Does not touch the network — safe to call
  // on every filter toggle or click.
  const renderMarkers = () => {
    const engine = mapEngineRef.current;
    if (!engine) return;
    const pins = [];
    const routes = [];
    const bounds = [];
    ordersRef.current.forEach((order) => {
      if (!isInDateRange(order)) return;
      const key = orderKey(order);
      const resolved = resolvedRef.current.get(key);
      if (!resolved) return;

      const statusKey = normalizeStatus(order.status);
      if (statusKey && !activeFiltersRef.current.has(statusKey)) return;

      const { lat, lng, approx } = resolved;
      const completed = statusKey === "delivered";
      bounds.push([lat, lng]);
      const baseColor = approx ? APPROX_COLOR : EXACT_COLOR;
      const isUnseen = unseenIdsRef.current.has(key);
      const courier = getCourierLocation(order);
      const gpsStale = statusKey === "inprogress" && isCourierLocationStale(order);

      if (statusKey === "inprogress" && courier) {
        bounds.push(courier);
        routes.push({
          path: [courier, { lat, lng }],
          color: gpsStale ? STALE_ROUTE_COLOR : ACTIVE_ROUTE_COLOR,
          dashed: gpsStale,
          weight: 5,
        });
        pins.push({
          id: `${key}-courier`,
          lat: courier.lat,
          lng: courier.lng,
          color: ACTIVE_ROUTE_COLOR,
          kind: "courier",
          label: "D",
          title: `Delivery partner · ${order.martId || "Order"}`,
          popupContent: `Delivery partner\nOrder: ${order.martId || key}\nGPS: ${gpsStale ? "Needs attention" : "Live"}`,
        });
      }

      const gpsStatus = statusKey === "inprogress"
        ? courier
          ? gpsStale ? "Needs attention · GPS is stale" : "Live · GPS updating"
          : "Needs attention · courier GPS unavailable"
        : "";
      pins.push({
        id: key,
        lat,
        lng,
        color: completed ? "#198754" : isUnseen ? HIGHLIGHT_COLOR : baseColor,
        kind: completed ? "delivered" : "customer",
        label: completed ? "✓" : isUnseen ? "!" : "C",
        title: `${order.customerName || "Customer"} · ${order.martId || "Order"}`,
        popupContent: [
          order.customerName || "Unknown customer",
          `Order: ${order.martId || key}`,
          `Status: ${order.status || "—"} · ₹${order.grandTotal || "—"}`,
          `Address: ${[order.address, order.district, order.state, order.zipCode].filter(Boolean).join(", ") || "—"}`,
          gpsStatus,
          completed ? "✓ Delivery complete" : "",
          approx ? "Approximate location from pincode" : "Customer GPS location",
          isUnseen ? "New order" : "",
        ].filter(Boolean).join("\n"),
      });
    });

    engine.setPins(pins, () => {});
    engine.setRoutes(routes);
    if (bounds.length && !hasFitBoundsRef.current) {
      engine.fitPoints(bounds);
      hasFitBoundsRef.current = true;
    }
  };

  // Fetches orders, resolves any missing coordinates via pincode, tracks
  // which ones are new since the page opened, then redraws the map.
  const fetchAndRender = async () => {
    setError("");
    let orders = [];
    try {
      const res = await axios.get(GET_ALL_MART_ITEMS);
      orders = normalizeOrders(res.data);
    } catch (err) {
      console.error("Failed to load order locations", err);
      setError("Unable to load orders right now. Please try again.");
      setLoading(false);
      return;
    }

    ordersRef.current = orders;
    let exact = 0,
      approx = 0,
      failed = 0,
      active = 0,
      live = 0,
      attention = 0,
      delivered = 0;

    const dateOrders = orders.filter(isInDateRange);
    for (const order of dateOrders) {
      const statusKey = normalizeStatus(order.status);
      if (statusKey === "inprogress") {
        active += 1;
        if (getCourierLocation(order) && !isCourierLocationStale(order)) live += 1;
        else attention += 1;
      }
      if (statusKey === "delivered") delivered += 1;

      const key = orderKey(order);
      const isNewId = !knownIdsRef.current.has(key);

      if (isNewId) {
        knownIdsRef.current.add(key);
        // Don't flag the very first batch this session as "new" — only
        // orders that arrive on a later poll get the highlight.
        if (!firstLoadRef.current) unseenIdsRef.current.add(key);
      }

      if (!resolvedRef.current.has(key)) {
        let lat = parseFloat(order.latitude);
        let lng = parseFloat(order.longitude);
        let approxFlag = false;

        if (isZero(lat) || isZero(lng)) {
          const loc = await geocodePincode(order.zipCode, order.state, order.district);
          if (loc) {
            lat = loc.lat;
            lng = loc.lng;
            approxFlag = true;
          } else {
            resolvedRef.current.set(key, null);
            failed += 1;
            continue;
          }
        }
        resolvedRef.current.set(key, { lat, lng, approx: approxFlag });
      }

      const resolved = resolvedRef.current.get(key);
      if (resolved) resolved.approx ? approx++ : exact++;
      else failed++;
    }

    writeIdSet(KNOWN_IDS_KEY, knownIdsRef.current);
    writeIdSet(UNSEEN_IDS_KEY, unseenIdsRef.current);
    firstLoadRef.current = false;

    setCounts({ exact, approx, failed, unseen: unseenIdsRef.current.size, active, live, attention, delivered });
    setLoading(false);
    renderMarkers();
  };

  useEffect(() => {
    fromDateRef.current = fromDate;
    toDateRef.current = toDate;
    if (fromDate > toDate) return;
    if (mapEngineRef.current) {
      setLoading(true);
      fetchAndRender();
    }
    // fetchAndRender reads the current date refs and is intentionally kept local.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate]);

  useEffect(() => {
    let cancelled = false;
    let pollHandle = null;

    (async () => {
      mapEngineRef.current = await createOrderMap(
        mapContainerRef.current,
        { center: DEFAULT_CENTER, zoom: 12 },
      );
      if (cancelled) {
        mapEngineRef.current.destroy();
        mapEngineRef.current = null;
        return;
      }
      setMapEngineName(
        mapEngineRef.current.kind === "google" ? "Google Maps" : "OpenStreetMap fallback",
      );
      window.setTimeout(() => mapEngineRef.current?.invalidate(), 0);

      await fetchAndRender();
      pollHandle = setInterval(fetchAndRender, POLL_INTERVAL_MS);
    })();

    return () => {
      cancelled = true;
      if (pollHandle) clearInterval(pollHandle);
      mapEngineRef.current?.destroy();
      mapEngineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = counts.exact + counts.approx + counts.failed;
  const statusText = error
    ? error
    : loading
      ? "Fetching orders…"
      : `${total} order(s) · ${counts.exact} exact · ${counts.approx} approximated · ${counts.failed} could not be placed`;

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          padding: "10px 4px",
        }}
      >
        <div>
          <h5 style={{ margin: 0 }}>Delivery Operations Monitor</h5>
          <small className="text-muted">
            Solid green route = live · Dashed orange = stale GPS · Green check = delivered
          </small>
          <small className="d-block text-muted mt-1">
            {mapEngineName || (hasMapsKey() ? "Connecting to Google Maps…" : "Google Maps key missing · using OpenStreetMap fallback")}
          </small>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={fetchAndRender}
          disabled={loading}
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      <div
        style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "0 4px 8px" }}
      >
        <button
          type="button"
          className={`btn btn-sm ${fromDate === getToday() && toDate === getToday() ? "btn-success" : "btn-outline-success"}`}
          onClick={() => {
            const today = getToday();
            setFromDate(today);
            setToDate(today);
          }}
        >
          Today
        </button>
        <label className="d-flex align-items-center gap-1 mb-0">
          <span className="small text-muted">From</span>
          <input
            type="date"
            className="form-control form-control-sm"
            value={fromDate}
            max={toDate}
            onChange={(event) => setFromDate(event.target.value)}
          />
        </label>
        <label className="d-flex align-items-center gap-1 mb-0">
          <span className="small text-muted">To</span>
          <input
            type="date"
            className="form-control form-control-sm"
            value={toDate}
            min={fromDate}
            max={toLocalDateInputValue(new Date())}
            onChange={(event) => setToDate(event.target.value)}
          />
        </label>
        {FILTERS.map((f) => {
          const active = activeFilters.has(f.key);
          return (
            <button
              key={f.key}
              type="button"
              className={`btn btn-sm ${active ? "btn-dark" : "btn-outline-secondary"}`}
              onClick={() => toggleFilter(f.key)}
            >
              {f.label}
            </button>
          );
        })}
        {counts.unseen > 0 && (
          <span
            className="badge"
            style={{
              background: HIGHLIGHT_COLOR,
              color: "#fff",
              alignSelf: "center",
              padding: "5px 10px",
              borderRadius: 12,
            }}
          >
            {counts.unseen} new
          </span>
        )}
      </div>

      <div className="d-flex flex-wrap gap-3 small" style={{ padding: "0 4px 8px" }}>
        <span><strong>{counts.active}</strong> active deliveries</span>
        <span className="text-success"><strong>{counts.live}</strong> live GPS</span>
        <span className="text-warning"><strong>{counts.attention}</strong> need attention</span>
        <span className="text-success"><strong>{counts.delivered}</strong> delivered</span>
      </div>

      <small className="text-muted d-block" style={{ padding: "0 4px 8px" }}>
        {statusText}
      </small>
      <div
        ref={mapContainerRef}
        style={{ height: "70vh", width: "100%", borderRadius: 8 }}
      />
    </div>
  );
};

export default OrderLocationMapPage;
