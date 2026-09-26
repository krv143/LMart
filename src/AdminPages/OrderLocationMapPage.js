import React, { useEffect, useRef, useState } from "react";
import axios from "axios";

// Same API_BASE pattern used in vendorListStore.js.
const API_BASE =
  "https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api";
const GET_ALL_MART_ITEMS = `${API_BASE}/Mart/GetAllMartItems`;

const LEAFLET_CSS_URL =
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
const LEAFLET_JS_URL =
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";

const DEFAULT_CENTER = [17.6868, 83.2185]; // Visakhapatnam
const EXACT_COLOR = "#3fb27f";
const APPROX_COLOR = "#e0a63e";
const HIGHLIGHT_COLOR = "#e53935";

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

const getDefaultFromDate = () => {
  const date = new Date();
  date.setDate(date.getDate() - 6);
  return toLocalDateInputValue(date);
};

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

// Loads a <script>/<link> once and resolves when ready. Safe to call
// multiple times — later calls just resolve immediately.
const loadOnce = (tag, attrs, checkLoaded) =>
  new Promise((resolve, reject) => {
    if (checkLoaded()) return resolve();
    const existing = document.querySelector(`${tag}[data-loader="${attrs.id}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", reject);
      return;
    }
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "id") el.setAttribute("data-loader", v);
      else el[k] = v;
    });
    el.onload = () => resolve();
    el.onerror = reject;
    document.head.appendChild(el);
  });

const loadLeaflet = async () => {
  await loadOnce(
    "link",
    { id: "leaflet-css", rel: "stylesheet", href: LEAFLET_CSS_URL },
    () => !!document.querySelector('link[data-loader="leaflet-css"]'),
  );
  await loadOnce("script", { id: "leaflet-js", src: LEAFLET_JS_URL }, () => !!window.L);
  return window.L;
};

// One-time CSS for the pulsing "new order" ring. Injected instead of an
// external stylesheet so this component stays a single importable file.
const ensurePulseStyle = () => {
  if (document.getElementById("order-map-pulse-style")) return;
  const style = document.createElement("style");
  style.id = "order-map-pulse-style";
  style.textContent = `
    .order-map-pulse-dot { position: relative; width: 16px; height: 16px; }
    .order-map-pulse-dot::before, .order-map-pulse-dot::after {
      content: ""; position: absolute; inset: 0; border-radius: 50%;
      background: ${HIGHLIGHT_COLOR};
    }
    .order-map-pulse-dot::before {
      animation: order-map-pulse 1.4s ease-out infinite;
    }
    .order-map-pulse-dot::after { transform: scale(0.55); }
    @keyframes order-map-pulse {
      0% { transform: scale(0.55); opacity: 0.8; }
      100% { transform: scale(2.4); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
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
  const mapRef = useRef(null);
  const markerLayerRef = useRef(null);

  const ordersRef = useRef([]); // last fetched orders, raw
  const resolvedRef = useRef(new Map()); // orderKey -> { lat, lng, approx } | null
  const knownIdsRef = useRef(readIdSet(KNOWN_IDS_KEY)); // every order id ever seen this session
  const unseenIdsRef = useRef(readIdSet(UNSEEN_IDS_KEY)); // new arrivals not yet opened
  const firstLoadRef = useRef(knownIdsRef.current.size === 0);
  const activeFiltersRef = useRef(new Set(FILTERS.map((f) => f.key)));
  const fromDateRef = useRef(getDefaultFromDate());
  const toDateRef = useRef(toLocalDateInputValue(new Date()));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [counts, setCounts] = useState({ exact: 0, approx: 0, failed: 0, unseen: 0 });
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
    const L = window.L;
    if (!L || !mapRef.current || !markerLayerRef.current) return;
    markerLayerRef.current.clearLayers();

    const bounds = [];
    ordersRef.current.forEach((order) => {
      if (!isInDateRange(order)) return;
      const key = orderKey(order);
      const resolved = resolvedRef.current.get(key);
      if (!resolved) return;

      const statusKey = normalizeStatus(order.status);
      if (statusKey && !activeFiltersRef.current.has(statusKey)) return;

      const { lat, lng, approx } = resolved;
      bounds.push([lat, lng]);
      const baseColor = approx ? APPROX_COLOR : EXACT_COLOR;
      const isUnseen = unseenIdsRef.current.has(key);

      let marker;
      if (isUnseen) {
        ensurePulseStyle();
        marker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: "",
            html: `<div class="order-map-pulse-dot"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          }),
        });
      } else {
        marker = L.circleMarker([lat, lng], {
          radius: 8,
          color: baseColor,
          fillColor: baseColor,
          fillOpacity: 0.85,
          weight: 1.5,
        });
      }

      marker.bindPopup(`
        <div style="font-size:12.5px;line-height:1.5;max-width:220px;">
          <b style="display:block;font-size:13px;margin-bottom:2px;">
            ${order.customerName || "Unknown customer"}
          </b>
          Mart: ${order.martId || "—"}<br/>
          Status: ${order.status || "—"} · ₹${order.grandTotal || "—"} ·
          ${order.totalItemsSelected ?? "—"} items<br/>
          ${order.address || ""}<br/>
          ${order.district || ""}, ${order.state || ""} ${order.zipCode || ""}<br/>
          <span style="font-weight:600;color:${approx ? APPROX_COLOR : EXACT_COLOR};">
            ${approx ? "Approx. from pincode" : "Exact GPS"}
          </span>
          ${isUnseen ? `<br/><span style="font-weight:600;color:${HIGHLIGHT_COLOR};">New order</span>` : ""}
        </div>
      `);

      // Viewing the order (opening its popup) clears the highlight —
      // covers both a direct marker click and opening the popup any other way.
      marker.on("popupopen", () => {
        if (!unseenIdsRef.current.has(key)) return;
        unseenIdsRef.current.delete(key);
        writeIdSet(UNSEEN_IDS_KEY, unseenIdsRef.current);
        setCounts((c) => ({ ...c, unseen: unseenIdsRef.current.size }));
        renderMarkers(); // redraw this marker as a normal (non-pulsing) dot
      });

      marker.addTo(markerLayerRef.current);
    });

    if (bounds.length && firstLoadRef.current) {
      mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
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
      failed = 0;

    for (const order of orders.filter(isInDateRange)) {
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

    setCounts({ exact, approx, failed, unseen: unseenIdsRef.current.size });
    setLoading(false);
    renderMarkers();
  };

  useEffect(() => {
    fromDateRef.current = fromDate;
    toDateRef.current = toDate;
    if (fromDate > toDate) return;
    if (mapRef.current) {
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
      const L = await loadLeaflet();
      if (cancelled) return;
      mapRef.current = L.map(mapContainerRef.current).setView(DEFAULT_CENTER, 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(mapRef.current);
      markerLayerRef.current = L.layerGroup().addTo(mapRef.current);

      await fetchAndRender();
      pollHandle = setInterval(fetchAndRender, POLL_INTERVAL_MS);
    })();

    return () => {
      cancelled = true;
      if (pollHandle) clearInterval(pollHandle);
      mapRef.current?.remove();
      mapRef.current = null;
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
          <h5 style={{ margin: 0 }}>Order Location Map</h5>
          <small className="text-muted">
            Orange = pincode estimate · Red pulse = new order, not yet opened
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
