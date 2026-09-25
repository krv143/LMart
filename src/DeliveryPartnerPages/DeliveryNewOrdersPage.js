import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { getUserLocation } from "../utils/getLocation";
import {
  onMapsAuthFailure,
  haversineKm,
  hasValidCoords,
  directionsUrl,
  openExternal,
} from "../utils/maps";
import { createOrderMap } from "../utils/orderMap";
import { playNotificationSound } from "../CommonPages/notificationSound";

const API_BASE =
  "https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api";
// GetAllMartItems is the unfiltered feed (every order, every vendor); the
// vendor and the "has a map location" filters below are done in the browser.
const GET_ALL_MART_ITEMS = `${API_BASE}/Mart/GetAllMartItems`;
const UPDATE_ORDER = `${API_BASE}/Mart/UpdateProductDetails`;
const GET_PARTNER = `${API_BASE}/DeliveryPartner/GetDeliveryPartnerDetailsByUserId`;
const GET_ALL_PARTNERS = `${API_BASE}/DeliveryPartner/GetAllDeliveryPartners`;

const POLL_MS = 20000;
const RADIUS_OPTIONS = [5, 10, 0]; // km; 0 = all distances
const RADIUS_KEY = "deliveryRadiusKm";
const DEFAULT_CENTER = { lat: 17.6868, lng: 83.2185 }; // used until GPS is known

const lower = (v) => String(v || "").toLowerCase();
const phone10 = (v) => String(v || "").replace(/\D/g, "").slice(-10);
const firstRecord = (raw) => {
  const r = Array.isArray(raw) ? raw[0] : raw;
  return r && typeof r === "object" && Object.keys(r).length ? r : null;
};

const readRadius = () => {
  try {
    const v = Number(localStorage.getItem(RADIUS_KEY));
    return RADIUS_OPTIONS.includes(v) && localStorage.getItem(RADIUS_KEY) !== null ? v : 10;
  } catch {
    return 10;
  }
};

/**
 * Finds this signed-in person's delivery-partner record.
 *  1. By the signed-in user id (same call the dashboard uses).
 *  2. If that finds nothing, by user id / mobile number in the full partner list.
 *     A partner can be registered under a different user id than the one the
 *     login returns, so the phone number is the reliable link.
 */
async function findPartner(userId) {
  try {
    const res = await axios.get(GET_PARTNER, { params: { userId } });
    const p = firstRecord(res?.data);
    if (p && p.isRegistered === true) return p;
  } catch (e) {
    console.warn("Partner lookup by user id failed:", e);
  }
  let all = [];
  try {
    all = toList((await axios.get(GET_ALL_PARTNERS)).data);
  } catch (e) {
    console.warn("Partner list unavailable:", e);
  }
  const mobile = phone10(localStorage.getItem("mobile"));
  const pool = all.filter(
    (x) =>
      x.isRegistered !== false &&
      (String(x.userId ?? x.UserId ?? "") === String(userId) ||
        (mobile && phone10(x.phoneNumber) === mobile)),
  );
  const isOpen = (x) => lower(x.status) === "open";
  return (
    pool.find((x) => isOpen(x) && x.vendorId) ||
    pool.find(isOpen) ||
    pool[0] ||
    null
  );
}
const toList = (data) => (Array.isArray(data) ? data : data ? [data] : []);
const isUnassigned = (o) =>
  !(o.assignedTo || o.AssignedTo) &&
  !(o.deliveryPartnerUserId || o.DeliveryPartnerUserId);
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

const DeliveryNewOrdersPage = () => {
  const navigate = useNavigate();
  const { userId, userType } = useParams();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [blockedReason, setBlockedReason] = useState("");
  const [orders, setOrders] = useState([]);
  const [myLoc, setMyLoc] = useState(null);
  const [locDenied, setLocDenied] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [acceptingId, setAcceptingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const [forceLeaflet, setForceLeaflet] = useState(false);
  const [radiusKm, setRadiusKm] = useState(readRadius);

  const mapDivRef = useRef(null);
  const engineRef = useRef(null);
  const pinsRef = useRef([]);
  const cardRefs = useRef({});
  const knownIdsRef = useRef(null);

  const vendorId = profile?.vendorId;
  // The map (and the order list) are shown regardless of blockedReason — a
  // login with no matching partner record, or one that's pending approval /
  // has no store yet, can still browse every order that has a real map
  // location; only *accepting* an order requires a real partner record in
  // good standing (see handleAccept below).
  const showMap = true;

  // ---------- data ----------
  const fetchOrders = useCallback(
    async ({ silent } = {}) => {
      const res = await axios.get(GET_ALL_MART_ITEMS);
      const all = toList(res.data?.data ?? res.data?.$values ?? res.data);
      // GetAllMartItems returns every vendor's orders. Narrow to this
      // partner's store when we know it; if no partner record was found
      // (see blockedReason), show every vendor's orders instead of none —
      // still only ones with a real latitude/longitude (filtered below).
      const list = vendorId
        ? all.filter((o) => String(o.vendorId) === String(vendorId))
        : all;
      setOrders(list);

      const openIds = new Set(
        list
          .filter(
            (o) =>
              lower(o.status) === "open" &&
              isUnassigned(o) &&
              !o.isPickUp &&
              orderCoords(o),
          )
          .map((o) => o.id),
      );
      if (knownIdsRef.current && !silent) {
        const arrived = [...openIds].some((id) => !knownIdsRef.current.has(id));
        if (arrived) {
          try {
            playNotificationSound();
          } catch {
            // sound blocked — the list still updates
          }
        }
      }
      knownIdsRef.current = openIds;
      return list;
    },
    [vendorId],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await findPartner(userId);
        if (cancelled) return;
        if (!p) {
          const m = phone10(localStorage.getItem("mobile"));
          setBlockedReason(
            `No delivery partner record was found for this login (mobile ${m || "unknown"}, user id ${userId}). Please contact the admin.`,
          );
        } else if (lower(p.status) !== "open") {
          setBlockedReason("Your delivery partner account is pending approval.");
        } else if (!p.vendorId) {
          setBlockedReason(
            "No store is assigned to you yet. Please contact the admin.",
          );
        }
        setProfile(p);
      } catch (e) {
        console.error(e);
        if (!cancelled) setBlockedReason("Could not load your account. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (loading) return undefined;
    const load = (silent) =>
      fetchOrders({ silent }).catch(() =>
        setError("Unable to load orders right now."),
      );
    load(true);
    const t = setInterval(() => load(false), POLL_MS);
    return () => clearInterval(t);
  }, [loading, fetchOrders]);

  // ---------- my location ----------
  const locate = useCallback(async () => {
    setLocDenied(false);
    try {
      const { latitude, longitude } = await getUserLocation();
      setMyLoc({ lat: latitude, lng: longitude });
    } catch (e) {
      console.warn("Location unavailable:", e);
      setLocDenied(true);
    }
  }, []);
  useEffect(() => {
    locate();
  }, [locate]);

  // ---------- derived lists ----------
  const newOrders = useMemo(() => {
    const list = orders
      // Only orders that actually have a latitude/longitude are pickable here;
      // one with no location can't be shown on the map or navigated to.
      .filter(
        (o) =>
          lower(o.status) === "open" &&
          isUnassigned(o) &&
          !o.isPickUp &&
          orderCoords(o),
      )
      .map((o) => {
        const c = orderCoords(o);
        return { ...o, _c: c, _km: c && myLoc ? haversineKm(myLoc, c) : null };
      });
    // nearest first; orders without a map location go last
    return list.sort((a, b) => {
      if (a._km == null && b._km == null) return 0;
      if (a._km == null) return 1;
      if (b._km == null) return -1;
      return a._km - b._km;
    });
  }, [orders, myLoc]);

  // Orders assigned to this partner are matched by the partner's own user id
  // (as saved when the vendor assigns) and, like the vendor page, by name.
  const partnerUserId = String(profile?.userId ?? userId);
  const partnerName = lower(profile?.deliveryPartnerName);
  const myActive = useMemo(
    () =>
      orders
        .filter((o) => {
          if (lower(o.status) !== "in progress") return false;
          const assignedId = String(o.deliveryPartnerUserId || o.DeliveryPartnerUserId || "");
          return (
            assignedId === String(userId) ||
            assignedId === partnerUserId ||
            (partnerName && lower(o.assignedTo) === partnerName)
          );
        })
        .map((o) => ({ ...o, _c: orderCoords(o) })),
    [orders, userId, partnerUserId, partnerName],
  );

  // Only orders inside the chosen distance are shown (and pinned). Without a
  // GPS fix the distance can't be measured, so everything is shown.
  const radiusActive = radiusKm > 0 && Boolean(myLoc);
  const shownOrders = useMemo(
    () =>
      radiusActive
        ? newOrders.filter((o) => o._km != null && o._km <= radiusKm)
        : newOrders,
    [newOrders, radiusActive, radiusKm],
  );
  const hiddenCount = newOrders.length - shownOrders.length;
  // The single closest matching order that the distance filter is hiding —
  // shown to make it obvious *why* the list looks empty (too tight a radius,
  // rather than no matching orders at all).
  const nearestHiddenKm = hiddenCount > 0
    ? newOrders.reduce(
        (min, o) => (o._km != null && (min == null || o._km < min) ? o._km : min),
        null,
      )
    : null;

  const chooseRadius = (km) => {
    setRadiusKm(km);
    try {
      localStorage.setItem(RADIUS_KEY, String(km));
    } catch {
      // storage unavailable — the choice just isn't remembered
    }
  };

  // ---------- map ----------
  // If Google rejects the key, switch to the OpenStreetMap engine.
  useEffect(() => {
    onMapsAuthFailure(() => setForceLeaflet(true));
  }, []);

  useEffect(() => {
    if (!showMap || !mapDivRef.current) return undefined;
    let cancelled = false;
    let engine = null;
    setMapReady(false);
    createOrderMap(mapDivRef.current, { center: DEFAULT_CENTER, zoom: 12 }, { forceLeaflet })
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
      .catch((err) => console.error("Map failed to load:", err));
    return () => {
      cancelled = true;
      if (engine) engine.destroy();
      engineRef.current = null;
    };
  }, [showMap, forceLeaflet]);

  // one pin per order that has a map location (numbers match the list below)
  const pins = useMemo(
    () => [
      ...shownOrders.flatMap((o, i) =>
        o._c
          ? [{
              id: o.id,
              lat: o._c.lat,
              lng: o._c.lng,
              label: String(i + 1),
              color: "#dc3545",
              selected: o.id === selectedId,
              title: `Order ${o.martId || ""}`,
            }]
          : [],
      ),
      ...myActive.flatMap((o) =>
        o._c
          ? [{
              id: o.id,
              lat: o._c.lat,
              lng: o._c.lng,
              label: "✓",
              color: "#198754",
              selected: o.id === selectedId,
              title: `Your delivery ${o.martId || ""}`,
            }]
          : [],
      ),
    ],
    [shownOrders, myActive, selectedId],
  );
  pinsRef.current = pins;

  useEffect(() => {
    if (mapReady) engineRef.current.setPins(pins, (id) => setSelectedId(id));
  }, [mapReady, pins]);

  useEffect(() => {
    if (mapReady) engineRef.current.setMe(myLoc);
  }, [mapReady, myLoc]);

  useEffect(() => {
    if (mapReady) engineRef.current.setRadius(radiusActive ? myLoc : null, radiusKm);
  }, [mapReady, radiusActive, radiusKm, myLoc]);

  const showAllPins = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const pts = pinsRef.current.map((p) => ({ lat: p.lat, lng: p.lng }));
    if (myLoc) pts.push(myLoc);
    engine.fitPoints(pts);
  }, [myLoc]);

  const focusNearMe = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || !myLoc) return;
    if (radiusKm > 0) engine.fitRadius(myLoc, radiusKm);
    else showAllPins();
  }, [myLoc, radiusKm, showAllPins]);

  // zoom to me / the chosen distance when the map or GPS is ready, or the distance changes
  useEffect(() => {
    if (mapReady) focusNearMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, myLoc, radiusKm]);

  const selectOrder = (o) => {
    setSelectedId(o.id);
    if (o._c && engineRef.current) engineRef.current.panTo(o._c);
  };

  // ---------- actions ----------
  const handleAccept = async (order) => {
    if (acceptingId) return;
    if (blockedReason) {
      setError(`Can't accept orders: ${blockedReason}`);
      return;
    }
    setAcceptingId(order.id);
    setError("");
    setMessage("");
    try {
      // Check again right before accepting: another partner may have taken it.
      const list = await fetchOrders({ silent: true });
      const current = list.find((o) => o.id === order.id);
      if (!current || lower(current.status) !== "open" || !isUnassigned(current)) {
        setError("Sorry, this order was just taken by another partner.");
        return;
      }
      const assignedTo = profile.deliveryPartnerName || "Delivery Partner";
      const deliveryAssignedTime = new Date().toISOString();
      await axios.put(
        `${UPDATE_ORDER}/${current.id}`,
        {
          ...current,
          status: "In Progress",
          Status: "In Progress",
          assignedTo,
          deliveryPartnerUserId: partnerUserId,
          deliveryAssignedTime,
        },
        { headers: { "Content-Type": "application/json" } },
      );
      setOrders((prev) =>
        prev.map((o) =>
          o.id === current.id
            ? { ...o, status: "In Progress", assignedTo, deliveryPartnerUserId: partnerUserId, deliveryAssignedTime }
            : o,
        ),
      );
      setSelectedId(current.id);
      setMessage("Order accepted. Tap “Start ride” to navigate to the customer.");
    } catch (e) {
      console.error("Accept failed:", e);
      setError("Could not accept this order. Please try again.");
    } finally {
      setAcceptingId(null);
    }
  };

  const startRide = (o) => {
    const c = o._c || orderCoords(o);
    openExternal(
      directionsUrl({ lat: c?.lat, lng: c?.lng, address: addressLine(o) }),
    );
  };

  const goDetails = (o) =>
    navigate(`/deliveryOrderDetails/${userType}/${userId}/${o.id}`);

  // The order whose pin (or card) was tapped — shown in a panel under the map.
  const selectedNew = shownOrders.find((o) => o.id === selectedId) || null;
  const selectedActive = myActive.find((o) => o.id === selectedId) || null;
  const selectedOrder = selectedNew || selectedActive;
  const pinnedNew = shownOrders.filter((o) => o._c).length;
  const mapCaption =
    pins.length === 0
      ? nearestHiddenKm != null
        ? `No orders within ${radiusKm} km — the closest one is ${nearestHiddenKm.toFixed(1)} km away. Try “All” or a bigger distance.`
        : `No orders to show${radiusActive ? ` within ${radiusKm} km` : ""} — showing an empty map${
            myLoc ? " around you" : ""
          }`
      : `${pinnedNew} order${pinnedNew === 1 ? "" : "s"} on the map · tap a pin to see the order`;

  // ---------- render ----------
  return (
    <div style={{ background: "#f5f7fb", minHeight: "100vh", paddingBottom: 24 }}>
      <div
        className="d-flex align-items-center gap-2 px-3 py-3 text-white"
        style={{ background: "linear-gradient(135deg,#198754,#0f5132)" }}
      >
        <button
          className="btn btn-sm btn-light rounded-circle p-1 d-flex"
          onClick={() => navigate(`/deliveryPartnerDashboard/${userType}/${userId}`)}
          aria-label="Back"
        >
          <ArrowBackIcon fontSize="small" />
        </button>
        <div className="flex-grow-1">
          <div style={{ fontWeight: 700, fontSize: 18 }}>New Orders</div>
          <div style={{ fontSize: 12, opacity: 0.9 }}>
            {profile?.deliveryPartnerName ? `Hi, ${profile.deliveryPartnerName}` : "Delivery partner"}
          </div>
        </div>
        {!loading && (
          <button
            className="btn btn-sm btn-light"
            onClick={() => fetchOrders().catch(() => setError("Unable to refresh."))}
          >
            Refresh
          </button>
        )}
      </div>

      <div className="container-fluid px-3 pt-3" style={{ maxWidth: 900 }}>
        {blockedReason && <div className="alert alert-warning">{blockedReason}</div>}

        {/* MAP — first thing on the page; shown even when there are no orders */}
        {showMap && (
          <div className="card border-0 shadow-sm mb-3" style={{ borderRadius: 16, overflow: "hidden" }}>
            <div style={{ position: "relative", isolation: "isolate" }}>
              <div
                key={forceLeaflet ? "leaflet" : "auto"}
                ref={mapDivRef}
                style={{ width: "100%", height: "45vh", minHeight: 280 }}
              />
              <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 6, zIndex: 1100 }}>
                <button className="btn btn-sm btn-light shadow-sm" onClick={focusNearMe} disabled={!myLoc}>
                  📍 Near me
                </button>
                <button className="btn btn-sm btn-light shadow-sm" onClick={showAllPins}>
                  Show all
                </button>
              </div>
            </div>
            <div className="px-3 py-2 small bg-white">{mapCaption}</div>
          </div>
        )}

        {/* SELECTED ORDER (tap a pin or a card) */}
        {selectedOrder && (
          <div
            className="card border-0 shadow-sm mb-3"
            style={{ borderRadius: 14, borderLeft: `5px solid ${selectedActive ? "#198754" : "#dc3545"}` }}
          >
            <div className="card-body py-3">
              <div className="d-flex align-items-center gap-2">
                <strong className="flex-grow-1">Order {selectedOrder.martId || ""}</strong>
                {selectedOrder._km != null && (
                  <span className="badge bg-primary">{selectedOrder._km.toFixed(1)} km away</span>
                )}
                <button
                  className="btn btn-sm btn-outline-secondary"
                  aria-label="Close"
                  onClick={() => setSelectedId(null)}
                >
                  ✕
                </button>
              </div>
              {selectedOrder.customerName && <div className="text-muted small mt-1">{selectedOrder.customerName}</div>}
              <div className="small mt-1">{addressLine(selectedOrder)}</div>
              <div className="text-muted small">
                {selectedOrder.totalItemsSelected ? `${selectedOrder.totalItemsSelected} item(s) · ` : ""}
                {selectedOrder.grandTotal ? `₹${selectedOrder.grandTotal}` : ""}
                {selectedOrder.date ? ` · ${fmtDate(selectedOrder.date)}` : ""}
              </div>
              {selectedNew ? (
                <button
                  className="btn btn-danger w-100 mt-3"
                  disabled={acceptingId === selectedNew.id}
                  onClick={() => handleAccept(selectedNew)}
                >
                  {acceptingId === selectedNew.id ? "Accepting…" : "Accept order"}
                </button>
              ) : (
                <div className="d-flex gap-2 mt-3">
                  <button className="btn btn-success flex-grow-1" onClick={() => startRide(selectedActive)}>
                    🚗 Start ride
                  </button>
                  <button className="btn btn-outline-secondary" onClick={() => goDetails(selectedActive)}>
                    Order details
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {loading && !blockedReason && (
          <div className="d-flex align-items-center gap-2 text-muted small mb-3">
            <div className="spinner-border spinner-border-sm text-success" role="status" />
            Loading your orders…
          </div>
        )}

        {!loading && (
          <>
            {/* DISTANCE */}
            <div className="d-flex align-items-center flex-wrap gap-2 mb-2">
              <span className="fw-semibold small">Show orders within:</span>
              <div className="btn-group btn-group-sm" role="group" aria-label="Distance">
                {RADIUS_OPTIONS.map((km) => (
                  <button
                    key={km}
                    type="button"
                    className={`btn ${radiusKm === km ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => chooseRadius(km)}
                  >
                    {km === 0 ? "All" : `${km} km`}
                  </button>
                ))}
              </div>
            </div>

            {!profile && !error && (
              <div className="alert alert-secondary py-2">
                Viewing all stores' orders because this login has no delivery partner record. Orders can't
                be accepted until that's fixed.
              </div>
            )}
            {error && <div className="alert alert-danger py-2">{error}</div>}
            {message && <div className="alert alert-success py-2">{message}</div>}
            {locDenied && (
              <div className="alert alert-info py-2 d-flex justify-content-between align-items-center">
                <span>Turn on location to see the nearest orders first.</span>
                <button className="btn btn-sm btn-outline-primary" onClick={locate}>
                  Retry
                </button>
              </div>
            )}

            {/* MY ACTIVE DELIVERIES */}
            {myActive.length > 0 && (
              <>
                <h6 className="fw-bold mb-2">My active deliveries ({myActive.length})</h6>
                {myActive.map((o) => (
                  <div
                    key={o.id}
                    className="card border-0 shadow-sm mb-2"
                    style={{
                      borderRadius: 14,
                      borderLeft: "5px solid #198754",
                      outline: o.id === selectedId ? "2px solid #198754" : "none",
                    }}
                    onClick={() => setSelectedId(o.id)}
                  >
                    <div className="card-body py-3">
                      <div className="d-flex justify-content-between">
                        <strong>Order {o.martId || ""}</strong>
                        <span className="badge bg-success">In progress</span>
                      </div>
                      <div className="text-muted small mt-1">{o.customerName}</div>
                      <div className="small">{addressLine(o)}</div>
                      <div className="d-flex gap-2 mt-3">
                        <button className="btn btn-success flex-grow-1" onClick={() => startRide(o)}>
                          🚗 Start ride
                        </button>
                        <button className="btn btn-outline-secondary" onClick={() => goDetails(o)}>
                          Order details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* NEW ORDERS */}
            <h6 className="fw-bold mt-3 mb-2">
              New orders{radiusActive ? ` within ${radiusKm} km` : ""} ({shownOrders.length})
            </h6>
            {radiusKm > 0 && !myLoc && (
              <div className="small text-muted mb-2">
                Your location isn't available, so orders at every distance are shown.
              </div>
            )}
            {shownOrders.length === 0 && (
              <div className="card border-0 shadow-sm text-center p-4 text-muted" style={{ borderRadius: 14 }}>
                {hiddenCount > 0
                  ? `No orders within ${radiusKm} km right now — the closest one is ${nearestHiddenKm?.toFixed(1)} km away.`
                  : "No new orders right now. This page refreshes by itself."}
              </div>
            )}
            {hiddenCount > 0 && (
              <div className="small text-muted mb-2">
                {hiddenCount} more order{hiddenCount > 1 ? "s are" : " is"} farther away. Choose a bigger
                distance or “All” to see {hiddenCount > 1 ? "them" : "it"}.
              </div>
            )}
            {shownOrders.map((o, i) => (
              <div
                key={o.id}
                ref={(el) => (cardRefs.current[o.id] = el)}
                className="card border-0 shadow-sm mb-2"
                style={{
                  borderRadius: 14,
                  outline: o.id === selectedId ? "2px solid #dc3545" : "none",
                }}
                onClick={() => selectOrder(o)}
              >
                <div className="card-body py-3">
                  <div className="d-flex align-items-center gap-2">
                    <span
                      className="badge rounded-circle bg-danger d-flex align-items-center justify-content-center"
                      style={{ width: 26, height: 26 }}
                    >
                      {o._c ? i + 1 : "–"}
                    </span>
                    <strong className="flex-grow-1">Order {o.martId || ""}</strong>
                    {o._km != null && (
                      <span className="badge bg-primary">{o._km.toFixed(1)} km away</span>
                    )}
                  </div>
                  <div className="small mt-2">{addressLine(o)}</div>
                  <div className="text-muted small">
                    {o.totalItemsSelected ? `${o.totalItemsSelected} item(s) · ` : ""}
                    {o.grandTotal ? `₹${o.grandTotal}` : ""}
                    {o.date ? ` · ${fmtDate(o.date)}` : ""}
                  </div>
                  <button
                    className="btn btn-danger w-100 mt-3"
                    disabled={acceptingId === o.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAccept(o);
                    }}
                  >
                    {acceptingId === o.id ? "Accepting…" : "Accept order"}
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default DeliveryNewOrdersPage;
