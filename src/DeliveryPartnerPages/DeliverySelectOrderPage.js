import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { getUserLocation } from "../utils/getLocation";
import { onMapsAuthFailure, haversineKm, hasValidCoords } from "../utils/maps";
import { createOrderMap } from "../utils/orderMap";

/**
 * DeliverySelectOrderPage — the delivery partner signs in, sees every
 * unassigned open order as a pin on one map, taps a pin to select it, then
 * taps Confirm to take that order. Confirming assigns the order to this
 * partner (same update the vendor/admin flows use) and hands off to the
 * live in-app tracking page (DeliveryTracking) for that order.
 */

const API_BASE =
  "https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api";
const GET_ALL_MART_ITEMS = `${API_BASE}/Mart/GetAllMartItems`;
const UPDATE_ORDER = `${API_BASE}/Mart/UpdateProductDetails`;
const GET_PARTNER = `${API_BASE}/DeliveryPartner/GetDeliveryPartnerDetailsByUserId`;
const GET_ALL_PARTNERS = `${API_BASE}/DeliveryPartner/GetAllDeliveryPartners`;

const POLL_MS = 20000;
const DEFAULT_CENTER = { lat: 17.6868, lng: 83.2185 }; // used until GPS is known

const toList = (data) => (Array.isArray(data) ? data : data ? [data] : []);
const lower = (v) => String(v || "").toLowerCase();
const phone10 = (v) => String(v || "").replace(/\D/g, "").slice(-10);
const firstRecord = (raw) => {
  const r = Array.isArray(raw) ? raw[0] : raw;
  return r && typeof r === "object" && Object.keys(r).length ? r : null;
};
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

/** Same lookup DeliveryNewOrdersPage uses: by user id first, then by phone. */
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

const DeliverySelectOrderPage = () => {
  const navigate = useNavigate();
  const { userType, userId } = useParams();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [blockedReason, setBlockedReason] = useState("");
  const [orders, setOrders] = useState([]);
  const [myLoc, setMyLoc] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const [forceLeaflet, setForceLeaflet] = useState(false);
  const [mapError, setMapError] = useState("");
  const [tileError, setTileError] = useState(false);
  const [mapReloadKey, setMapReloadKey] = useState(0);

  const mapDivRef = useRef(null);
  const engineRef = useRef(null);
  const pinsRef = useRef([]);

  // ---------- who is this partner ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await findPartner(userId);
        if (cancelled) return;
        if (!p) {
          setBlockedReason("No delivery partner record was found for this login. You can still browse orders, but confirming one needs a valid account.");
        } else if (lower(p.status) !== "open") {
          setBlockedReason("Your delivery partner account is pending approval.");
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

  // ---------- orders ----------
  const fetchOrders = useCallback(async () => {
    const res = await axios.get(GET_ALL_MART_ITEMS);
    const all = toList(res.data?.data ?? res.data?.$values ?? res.data);
    setOrders(all);
    return all;
  }, []);

  useEffect(() => {
    fetchOrders().catch(() => setError("Unable to load orders right now."));
    const t = setInterval(
      () => fetchOrders().catch(() => {}),
      POLL_MS,
    );
    return () => clearInterval(t);
  }, [fetchOrders]);

  // ---------- my location (for sorting only; browsing/selecting needs no GPS) ----------
  useEffect(() => {
    let cancelled = false;
    getUserLocation()
      .then(({ latitude, longitude }) => {
        if (!cancelled) setMyLoc({ lat: latitude, lng: longitude });
      })
      .catch(() => {
        // no GPS — orders still show, just unsorted by distance
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // every open, unassigned order with a real map location
  const points = useMemo(() => {
    const list = orders
      .filter((o) => lower(o.status) === "open" && isUnassigned(o) && orderCoords(o))
      .map((o) => {
        const c = orderCoords(o);
        return { ...o, _c: c, _km: myLoc ? haversineKm(myLoc, c) : null };
      });
    return list.sort((a, b) => {
      if (a._km == null && b._km == null) return 0;
      if (a._km == null) return 1;
      if (b._km == null) return -1;
      return a._km - b._km;
    });
  }, [orders, myLoc]);

  // ---------- map ----------
  useEffect(() => {
    onMapsAuthFailure(() => setForceLeaflet(true));
  }, []);

  useEffect(() => {
    if (!mapDivRef.current) return undefined;
    let cancelled = false;
    let engine = null;
    let invalidateTimer = null;
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
        invalidateTimer = setTimeout(() => e.invalidate(), 0);
      })
      .catch((err) => {
        console.error("Map failed to load:", err);
        if (!cancelled) setMapError("The map couldn't load. Check your internet connection and try Retry.");
      });
    return () => {
      cancelled = true;
      if (invalidateTimer) clearTimeout(invalidateTimer);
      if (engine) engine.destroy();
      if (engineRef.current === engine) engineRef.current = null;
    };
  }, [forceLeaflet, mapReloadKey]);

  const pins = useMemo(
    () =>
      points.map((o, i) => ({
        id: o.id,
        lat: o._c.lat,
        lng: o._c.lng,
        label: String(i + 1),
        color: o.id === selectedId ? "#198754" : "#dc3545",
        selected: o.id === selectedId,
        title: `Order ${o.martId || ""}`,
      })),
    [points, selectedId],
  );
  pinsRef.current = pins;

  useEffect(() => {
    if (mapReady && engineRef.current) {
      engineRef.current.setPins(pins, (id) => setSelectedId(id));
    }
  }, [mapReady, pins]);

  useEffect(() => {
    if (mapReady && engineRef.current) engineRef.current.setMe(myLoc);
  }, [mapReady, myLoc]);

  const showAllPins = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.fitPoints(pinsRef.current.map((p) => ({ lat: p.lat, lng: p.lng })));
  }, []);

  useEffect(() => {
    if (mapReady) showAllPins();
  }, [mapReady, pins, showAllPins]);

  const selectPoint = (o) => {
    setSelectedId(o.id);
    if (o._c && engineRef.current) engineRef.current.panTo(o._c);
  };

  const selected = points.find((o) => o.id === selectedId) || null;

  // ---------- confirm ----------
  const handleConfirm = async () => {
    if (!selected || confirming) return;
    setConfirming(true);
    setError("");
    try {
      // Re-check right before confirming: someone else may have taken it.
      const list = await fetchOrders();
      const current = list.find((o) => o.id === selected.id);
      if (!current || lower(current.status) !== "open" || !isUnassigned(current)) {
        setError("Sorry, this order was just taken by another partner. Pick another.");
        setSelectedId(null);
        return;
      }
      const assignedTo = profile?.deliveryPartnerName || "Delivery Partner";
      const deliveryPartnerUserId = String(profile?.userId ?? userId);
      const deliveryAssignedTime = new Date().toISOString();
      await axios.put(
        `${UPDATE_ORDER}/${current.id}`,
        {
          ...current,
          status: "In Progress",
          Status: "In Progress",
          assignedTo,
          deliveryPartnerUserId,
          deliveryAssignedTime,
        },
        { headers: { "Content-Type": "application/json" } },
      );
      navigate(`/deliveryTracking/${current.id}`, {
        state: {
          trackingMode: "partner",
          returnTo: `/deliveryPartnerDashboard/${userType}/${userId}`,
        },
      });
    } catch (e) {
      console.error("Confirm failed:", e);
      setError("Could not confirm this order. Please try again.");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div style={{ background: "#f5f7fb", minHeight: "100vh", paddingBottom: 24 }}>
      <div
        className="d-flex align-items-center gap-2 px-3 py-3 text-white"
        style={{ background: "linear-gradient(135deg,#198754,#0f5c39)" }}
      >
        <button
          className="btn btn-sm btn-light rounded-circle p-1 d-flex"
          onClick={() => navigate(-1)}
          aria-label="Back"
        >
          <ArrowBackIcon fontSize="small" />
        </button>
        <div className="flex-grow-1">
          <div style={{ fontWeight: 700, fontSize: 18 }}>Pick an Order</div>
          <div style={{ fontSize: 12, opacity: 0.9 }}>
            {loading ? "Loading…" : `${points.length} order${points.length === 1 ? "" : "s"} available`}
          </div>
        </div>
      </div>

      <div className="container-fluid px-3 pt-3" style={{ maxWidth: 1000 }}>
        {blockedReason && <div className="alert alert-warning py-2">{blockedReason}</div>}
        {error && <div className="alert alert-danger py-2">{error}</div>}

        {/* MAP */}
        <div className="card border-0 shadow-sm mb-3" style={{ borderRadius: 16, overflow: "hidden" }}>
          {mapError ? (
            <div className="p-4 text-center text-muted">
              {mapError}
              <div className="mt-2">
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => {
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
                style={{ width: "100%", height: "55vh", minHeight: 300 }}
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
              {points.length === 0
                ? loading
                  ? "Loading orders…"
                  : "No unassigned orders with a saved location right now."
                : `${points.length} order${points.length === 1 ? "" : "s"} on the map · tap a pin to select`}
            </div>
          )}
        </div>

        {/* SELECTED ORDER + CONFIRM */}
        {selected && (
          <div
            className="card border-0 shadow-sm mb-3"
            style={{ borderRadius: 14, borderLeft: "5px solid #198754" }}
          >
            <div className="card-body py-3">
              <div className="d-flex align-items-center gap-2">
                <strong className="flex-grow-1">Order {selected.martId || ""}</strong>
                {selected._km != null && (
                  <span className="badge bg-primary">{selected._km.toFixed(1)} km away</span>
                )}
                <button
                  className="btn btn-sm btn-outline-secondary"
                  aria-label="Close"
                  onClick={() => setSelectedId(null)}
                >
                  ✕
                </button>
              </div>
              {selected.customerName && <div className="text-muted small mt-1">{selected.customerName}</div>}
              <div className="small">{addressLine(selected)}</div>
              <div className="text-muted small">
                {selected.totalItemsSelected ? `${selected.totalItemsSelected} item(s) · ` : ""}
                {selected.grandTotal ? `₹${selected.grandTotal}` : ""}
                {selected.date ? ` · ${fmtDate(selected.date)}` : ""}
              </div>
              <button
                className="btn btn-success w-100 mt-3"
                disabled={confirming}
                onClick={handleConfirm}
              >
                {confirming ? "Confirming…" : "Confirm this order"}
              </button>
            </div>
          </div>
        )}

        {/* PLAIN LIST — same points as the map, for when tapping a tiny pin is fiddly */}
        {!loading && points.length > 0 && (
          <>
            <h6 className="fw-bold mt-1 mb-2">All available orders</h6>
            {points.map((o, i) => (
              <div
                key={o.id}
                className="card border-0 shadow-sm mb-2"
                style={{
                  borderRadius: 14,
                  outline: o.id === selectedId ? "2px solid #198754" : "none",
                }}
                onClick={() => selectPoint(o)}
              >
                <div className="card-body py-3 d-flex align-items-center gap-2">
                  <span
                    className="badge rounded-circle bg-danger d-flex align-items-center justify-content-center"
                    style={{ width: 26, height: 26, flexShrink: 0 }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center gap-2">
                      <strong>Order {o.martId || ""}</strong>
                      {o._km != null && <span className="badge bg-primary">{o._km.toFixed(1)} km</span>}
                    </div>
                    <div className="small text-muted">{addressLine(o)}</div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default DeliverySelectOrderPage;
