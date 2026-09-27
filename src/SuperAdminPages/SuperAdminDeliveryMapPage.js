import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import TwoWheelerIcon from "@mui/icons-material/TwoWheeler";
import { createOrderMap } from "../utils/orderMap";
import { onMapsAuthFailure } from "../utils/maps";
import { getAllVendors } from "../utils/superAdminStore";
import SuperAdminNav from "./SuperAdminNav";

const API_BASE = "https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api";
const PARTNERS_URL = `${API_BASE}/DeliveryPartner/GetAllDeliveryPartners`;
const PARTNERS_BY_VENDOR_URL = `${API_BASE}/DeliveryPartner/GetDeliveryPartnerByVendorId`;
const PARTNER_BY_USER_URL = `${API_BASE}/DeliveryPartner/GetDeliveryPartnerDetailsByUserId`;
const ORDERS_URL = `${API_BASE}/Mart/GetAllMartItems`;
const POLL_MS = 30000;
const ONLINE_WINDOW_MS = 90000;
const DEFAULT_CENTER = { lat: 17.6868, lng: 83.2185 };

const toList = (value) => {
  const data = value?.data ?? value?.$values ?? value;
  return Array.isArray(data) ? data : data && typeof data === "object" ? [data] : [];
};

const firstValue = (...values) => values.find((value) => value !== undefined && value !== null && value !== "");
const partnerUserId = (partner) => String(firstValue(partner.userId, partner.UserId, partner.id, partner.Id, ""));
const isPhoneLike = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 8 && /^[+\d\s().-]+$/.test(String(value || ""));
};
const partnerName = (partner) => {
  const name = [
    partner.deliveryPartnerName,
    partner.DeliveryPartnerName,
    partner.deliveryPartnerFullName,
    partner.DeliveryPartnerFullName,
    partner.fullName,
    partner.FullName,
    partner.firstName,
    partner.FirstName,
    partner._ride?.assignedTo,
    partner._ride?.AssignedTo,
    partner.assignedTo,
    partner.AssignedTo,
    partner.name,
  ].find((candidate) => candidate && !isPhoneLike(candidate));
  return name ? String(name).trim() : "Name unavailable";
};
const partnerLocation = (partner) => {
  const lat = Number(firstValue(partner.currentLatitude, partner.CurrentLatitude, partner.latitude, partner.Latitude));
  const lng = Number(firstValue(partner.currentLongitude, partner.CurrentLongitude, partner.longitude, partner.Longitude));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) return null;
  return { lat, lng };
};
const locationUpdatedAt = (partner) => firstValue(
  partner.liveLocationUpdatedAt,
  partner.LiveLocationUpdatedAt,
  partner.locationUpdatedAt,
  partner.LocationUpdatedAt,
  partner.lastSeenAt,
  partner.LastSeenAt,
);
const orderDestination = (order) => {
  const lat = Number(order.latitude ?? order.Latitude);
  const lng = Number(order.longitude ?? order.Longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) return null;
  return { lat, lng };
};
const idFromOrder = (order) => String(firstValue(order.deliveryPartnerUserId, order.DeliveryPartnerUserId, ""));
const isInProgress = (order) => String(order.status ?? order.Status ?? "").toLowerCase() === "in progress";
const statusInfo = (partner) => {
  if (partner._ride) return { key: "ride", label: "On Ride", color: "#dc7a18" };
  if (!partner._online) return { key: "offline", label: "Offline", color: "#70777f" };
  return { key: "available", label: "Available", color: "#16864a" };
};
const formatSeen = (value) => {
  if (!value) return "No recent GPS";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "No recent GPS" : `GPS ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
};

const SuperAdminDeliveryMapPage = () => {
  const mapNodeRef = useRef(null);
  const mapEngineRef = useRef(null);
  const hasFitRef = useRef(false);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState("");
  const [mapProvider, setMapProvider] = useState("");
  const [mapError, setMapError] = useState("");
  const [mapTilesUnavailable, setMapTilesUnavailable] = useState(false);
  const [forceLeaflet, setForceLeaflet] = useState(false);

  const loadData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const [draftResponse, orderResponse, vendors] = await Promise.all([
        axios.get(PARTNERS_URL),
        axios.get(ORDERS_URL),
        getAllVendors().catch(() => []),
      ]);
      const draftPartners = toList(draftResponse.data);
      const vendorPartners = await Promise.allSettled(
        vendors.filter((vendor) => vendor.vendorId).map((vendor) =>
          axios.get(PARTNERS_BY_VENDOR_URL, { params: { vendorId: vendor.vendorId } }),
        ),
      );
      const allPartners = [...draftPartners];
      vendorPartners.forEach((result) => {
        if (result.status === "fulfilled") allPartners.push(...toList(result.value.data));
      });
      const nextOrders = toList(orderResponse.data);
      const onRideIds = new Set(nextOrders.filter(isInProgress).map(idFromOrder).filter(Boolean));
      const knownIds = new Set(allPartners.map(partnerUserId).filter(Boolean));
      const missingRidePartners = await Promise.allSettled(
        [...onRideIds].filter((id) => !knownIds.has(id)).map((userId) =>
          axios.get(PARTNER_BY_USER_URL, { params: { userId } }),
        ),
      );
      missingRidePartners.forEach((result) => {
        if (result.status === "fulfilled") allPartners.push(...toList(result.value.data));
      });

      const unique = new Map();
      allPartners.forEach((partner) => {
        const id = partnerUserId(partner);
        if (id) unique.set(id, { ...unique.get(id), ...partner });
      });
      const latestOrdersByPartner = new Map();
      nextOrders.filter(isInProgress).forEach((order) => {
        const id = idFromOrder(order);
        if (id) latestOrdersByPartner.set(id, order);
      });
      const enriched = [...unique.entries()].map(([id, partner]) => {
        const ride = latestOrdersByPartner.get(id) || null;
        const orderLoc = ride ? orderDestination(ride) : null;
        const rideLocation = ride ? partnerLocation({
          currentLatitude: ride.deliveryPartnerLatitude ?? ride.DeliveryPartnerLatitude,
          currentLongitude: ride.deliveryPartnerLongitude ?? ride.DeliveryPartnerLongitude,
        }) : null;
        const location = rideLocation || partnerLocation(partner);
        const seen = (ride && firstValue(ride.deliveryPartnerLocationUpdatedAt, ride.DeliveryPartnerLocationUpdatedAt)) || locationUpdatedAt(partner);
        return {
          ...partner,
          _userId: id,
          _location: location,
          _lastSeen: seen,
          _online: Boolean(location && seen && (() => {
            const t = new Date(seen).getTime();
            return Number.isFinite(t) && Date.now() - t <= ONLINE_WINDOW_MS;
          })()),
          _ride: ride,
          _customerLocation: orderLoc,
        };
      });
      setPartners(enriched);
      setError("");
    } catch (err) {
      console.error("Could not load live delivery partner data", err);
      setError("Could not load partner availability. The monitor will retry automatically.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const timer = window.setInterval(() => loadData(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [loadData]);

  useEffect(() => {
    onMapsAuthFailure(() => setForceLeaflet(true));
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return partners.filter((partner) => {
      const status = statusInfo(partner).key;
      if (filter !== "all" && status !== filter) return false;
      if (!term) return true;
      return [partnerName(partner), partner.phoneNumber, partner._ride?.martId, partner._ride?.customerName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    }).sort((a, b) => {
      const priority = { ride: 0, available: 1, offline: 2 };
      return priority[statusInfo(a).key] - priority[statusInfo(b).key] || partnerName(a).localeCompare(partnerName(b));
    });
  }, [filter, partners, query]);

  const counts = useMemo(() => partners.reduce((result, partner) => {
    result[statusInfo(partner).key] += 1;
    return result;
  }, { available: 0, ride: 0, offline: 0 }), [partners]);

  const draw = useCallback(() => {
    const engine = mapEngineRef.current;
    if (!engine) return;
    const pins = [];
    const routes = [];
    const points = [];
    filtered.forEach((partner) => {
      const status = statusInfo(partner);
      const location = partner._location;
      if (location) {
        points.push(location);
        pins.push({
          id: partner._userId,
          lat: location.lat,
          lng: location.lng,
          kind: "fleet",
          color: status.color,
          label: partnerName(partner),
          selected: partner._userId === selectedId,
          title: `${partnerName(partner)} · ${status.label}`,
          popupContent: `${partnerName(partner)}\n${status.label}\n${partner._online ? "Live GPS" : "Last known GPS · stale"}\n${formatSeen(partner._lastSeen)}${partner._ride ? `\nOrder ${partner._ride.martId || partner._ride.id}` : ""}`,
        });
      }
      if (status.key === "ride" && partner._customerLocation) {
        points.push(partner._customerLocation);
        pins.push({
          id: `${partner._userId}-customer`,
          lat: partner._customerLocation.lat,
          lng: partner._customerLocation.lng,
          kind: "customer",
          color: "#d63c35",
          label: "C",
          title: `Customer · ${partner._ride?.martId || "Order"}`,
          popupContent: `Customer: ${partner._ride?.customerName || "Customer"}\nOrder: ${partner._ride?.martId || partner._ride?.id || "—"}`,
        });
        if (location) {
          routes.push({
            path: [location, partner._customerLocation],
            color: partner._online ? "#16864a" : "#dc7a18",
            dashed: !partner._online,
            weight: 4,
          });
        }
      }
    });
    engine.setPins(pins, (id) => setSelectedId(id));
    engine.setRoutes(routes);
    if (points.length && !hasFitRef.current) {
      engine.fitPoints(points);
      hasFitRef.current = true;
    }
  }, [filtered, selectedId]);

  useEffect(() => {
    let cancelled = false;
    let engine;
    const startTimer = window.setTimeout(() => {
      createOrderMap(
        mapNodeRef.current,
        { center: DEFAULT_CENTER, zoom: 12 },
        {
          forceLeaflet,
          onTileError: () => setMapTilesUnavailable(true),
        },
      )
        .then((created) => {
          if (cancelled) {
            created.destroy();
            return;
          }
          engine = created;
          mapEngineRef.current = created;
          setMapProvider(created.kind === "google" ? "Google Maps" : "OpenStreetMap fallback");
          window.setTimeout(() => created.invalidate(), 0);
        })
        .catch((err) => {
          console.error("Live fleet map failed to load", err);
          if (!cancelled) {
            setMapError(`Map initialization failed: ${err?.message || "unknown error"}`);
          }
        });
    }, 0);
    setMapError("");
    setMapTilesUnavailable(false);
    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
      engine?.destroy();
      if (mapEngineRef.current === engine) mapEngineRef.current = null;
    };
  }, [forceLeaflet]);

  useEffect(() => {
    draw();
  }, [draw]);

  const selectPartner = (partner) => {
    setSelectedId(partner._userId);
    if (partner._location) mapEngineRef.current?.panTo(partner._location);
  };

  return (
    <div className="container-fluid py-3">
      <SuperAdminNav active="/superadmin/delivery-map" />
      <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-3">
        <div>
          <h3 className="mb-1">Live Delivery Fleet</h3>
          <p className="small text-muted mb-0">Partner GPS refreshes every 30 seconds. A fresh location within 90 seconds is considered online.</p>
        </div>
        <button type="button" className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1" onClick={() => loadData(true)} disabled={refreshing}>
          <RefreshIcon fontSize="small" /> {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className="d-flex flex-wrap gap-3 small mb-3" aria-label="Partner availability summary">
        <span className="text-success"><strong>{counts.available}</strong> available</span>
        <span style={{ color: "#bd6500" }}><strong>{counts.ride}</strong> on ride</span>
        <span className="text-secondary"><strong>{counts.offline}</strong> offline</span>
        <span className="text-muted ms-auto">Map: {mapProvider || "Connecting…"}</span>
      </div>

      {error && <div className="alert alert-danger py-2 small">{error}</div>}
      {mapError && <div className="alert alert-warning py-2 small">{mapError}</div>}
      {mapTilesUnavailable && <div className="alert alert-warning py-2 small">The map loaded, but its map tiles could not be reached. Check your internet connection or firewall.</div>}

      <div className="row g-3">
        <aside className="col-12 col-lg-4 col-xl-3">
          <div className="d-flex gap-2 mb-2">
            <div className="input-group input-group-sm">
              <span className="input-group-text"><SearchIcon fontSize="small" /></span>
              <input className="form-control" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a partner or order" aria-label="Search partners" />
            </div>
            <select className="form-select form-select-sm" value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter partner availability" style={{ maxWidth: 135 }}>
              <option value="all">All states</option>
              <option value="available">Available</option>
              <option value="ride">On ride</option>
              <option value="offline">Offline</option>
            </select>
          </div>
          <div className="border rounded" style={{ maxHeight: "68vh", overflowY: "auto" }}>
            {loading ? (
              <div className="p-3 text-muted small">Loading delivery partners…</div>
            ) : filtered.length ? filtered.map((partner) => {
              const status = statusInfo(partner);
              return (
                <button
                  type="button"
                  key={partner._userId}
                  onClick={() => selectPartner(partner)}
                  className="w-100 text-start border-0 border-bottom bg-white p-3"
                  style={{ borderLeft: selectedId === partner._userId ? `4px solid ${status.color}` : "4px solid transparent" }}
                >
                  <span className="d-flex align-items-center gap-2">
                    <span className="d-inline-flex align-items-center justify-content-center rounded-circle text-white" style={{ width: 30, height: 30, background: status.color, flex: "0 0 30px" }}><TwoWheelerIcon fontSize="small" /></span>
                    <span className="flex-grow-1 min-w-0">
                      <small className="text-muted d-block">{partner.phoneNumber || partner.PhoneNumber || "No phone"}</small>
                      <strong className="d-block text-truncate">{partnerName(partner)}</strong>
                    </span>
                    <span className="badge" style={{ color: status.color, background: `${status.color}18` }}>{status.label}</span>
                  </span>
                  <small className="text-muted d-block mt-2">{formatSeen(partner._lastSeen)}</small>
                  {partner._ride && <small className="d-block mt-1">Order {partner._ride.martId || partner._ride.id} · {partner._ride.customerName || "Customer"}</small>}
                  {partner._ride && !partner._location && <small className="d-block mt-1 text-warning">No courier GPS yet; route line appears after location sharing starts.</small>}
                </button>
              );
            }) : <div className="p-3 text-muted small">{partners.length ? "No partners match this filter." : "No delivery partners returned by the partner APIs."}</div>}
          </div>
        </aside>
        <section className="col-12 col-lg-8 col-xl-9">
          <div ref={mapNodeRef} style={{ height: "68vh", minHeight: 420, width: "100%", borderRadius: 8, background: "#e9ecef" }} aria-label="Delivery partner locations map" />
          <div className="d-flex flex-wrap gap-3 small text-muted mt-2">
            <span><i className="d-inline-block rounded-circle me-1" style={{ width: 10, height: 10, background: "#16864a" }} />Available</span>
            <span><i className="d-inline-block rounded-circle me-1" style={{ width: 10, height: 10, background: "#dc7a18" }} />On ride and route to customer</span>
            <span><i className="d-inline-block rounded-circle me-1" style={{ width: 10, height: 10, background: "#d63c35" }} />Customer destination</span>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SuperAdminDeliveryMapPage;
