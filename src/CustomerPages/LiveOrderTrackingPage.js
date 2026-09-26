import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { getUserLocation } from "../utils/getLocation";

const API_BASE =
  "https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api";
const ORDER_URL = `${API_BASE}/Mart/GetProductDetails`;
const UPDATE_URL = `${API_BASE}/Mart/UpdateProductDetails`;
const POLL_MS = 8000;
const DEFAULT_CENTER = [17.6868, 83.2185];

const readCoords = (latValue, lngValue) => {
  if (latValue === null || latValue === undefined || latValue === "" ||
      lngValue === null || lngValue === undefined || lngValue === "") return null;
  const lat = Number(latValue);
  const lng = Number(lngValue);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 ||
      Math.abs(lng) > 180 || (lat === 0 && lng === 0)) return null;
  return { lat, lng };
};

const orderDestination = (order) =>
  readCoords(order?.latitude ?? order?.Latitude, order?.longitude ?? order?.Longitude);

const partnerPosition = (order) =>
  readCoords(
    order?.deliveryPartnerLatitude ?? order?.DeliveryPartnerLatitude,
    order?.deliveryPartnerLongitude ?? order?.DeliveryPartnerLongitude,
  );

const kmBetween = (from, to) => {
  const rad = (value) => (value * Math.PI) / 180;
  const dLat = rad(to.lat - from.lat);
  const dLng = rad(to.lng - from.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(from.lat)) *
    Math.cos(rad(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const bikeIcon = L.divIcon({
  className: "live-bike-marker",
  html: '<div style="width:44px;height:44px;border:3px solid #fff;border-radius:50%;background:#16864a;box-shadow:0 2px 12px #0005;display:grid;place-items:center;font-size:24px">&#128757;</div>',
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

const homeIcon = L.divIcon({
  className: "live-home-marker",
  html: '<div style="width:42px;height:42px;border:3px solid #fff;border-radius:50%;background:#d63c35;box-shadow:0 2px 10px #0005;display:grid;place-items:center;color:#fff;font-size:11px;font-weight:700">HOME</div>',
  iconSize: [42, 42],
  iconAnchor: [21, 21],
});

export default function LiveOrderTrackingPage() {
  const { id: orderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const mode = location.state?.trackingMode === "partner" ? "partner" : "customer";
  const mapNodeRef = useRef(null);
  const mapRef = useRef(null);
  const bikeMarkerRef = useRef(null);
  const customerMarkerRef = useRef(null);
  const routeRef = useRef(null);
  const orderRef = useRef(null);
  const lastPublishedRef = useRef(null);
  const routeRequestRef = useRef(0);
  const lastRouteRequestRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [order, setOrder] = useState(null);
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [locationMessage, setLocationMessage] = useState("Waiting for location permission…");
  const [routeInfo, setRouteInfo] = useState(null);

  const destination = useMemo(() => orderDestination(order), [order]);
  const trackedPartnerPosition = useMemo(() => partnerPosition(order), [order]);
  const address = [order?.address, order?.district, order?.state, order?.zipCode]
    .filter(Boolean)
    .join(", ");

  const fetchOrder = useCallback(async () => {
    const response = await fetch(`${ORDER_URL}?id=${encodeURIComponent(orderId)}`);
    if (!response.ok) throw new Error("Unable to load this order.");
    const data = await response.json();
    const fresh = Array.isArray(data) ? data[0] : data;
    if (!fresh) throw new Error("Order not found.");
    orderRef.current = fresh;
    setOrder(fresh);
    return fresh;
  }, [orderId]);

  const saveOrderFields = useCallback(async (fields) => {
    const current = orderRef.current;
    if (!current) return;
    const updated = { ...current, ...fields, id: orderId };
    const response = await fetch(`${UPDATE_URL}/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    if (!response.ok) throw new Error("Could not update order location.");
    orderRef.current = updated;
    setOrder(updated);
  }, [orderId]);

  useEffect(() => {
    let disposed = false;
    const load = async () => {
      try {
        await fetchOrder();
      } catch (err) {
        if (!disposed) setError(err.message || "Unable to load this order.");
      } finally {
        if (!disposed) setLoading(false);
      }
    };
    load();
    return () => { disposed = true; };
  }, [fetchOrder]);

  useEffect(() => {
    if (mode !== "customer" || loading || destination) return undefined;
    const key = `hm_customer_location_prompted_${orderId}`;
    if (sessionStorage.getItem(key)) {
      setLocationMessage("Customer location is not saved for this order.");
      return undefined;
    }
    sessionStorage.setItem(key, "true");
    let disposed = false;
    const capture = async () => {
      setLocationMessage("Please allow location to set your delivery destination.");
      try {
        const coords = await getUserLocation();
        if (disposed) return;
        await saveOrderFields({ latitude: coords.latitude, longitude: coords.longitude });
        setLocationMessage("Customer destination saved.");
      } catch (err) {
        if (!disposed) setLocationMessage(err.message || "Location permission was not granted.");
      }
    };
    capture();
    return () => { disposed = true; };
  }, [destination, fetchOrder, loading, mode, orderId, saveOrderFields]);

  useEffect(() => {
    if (mode !== "customer") return undefined;
    let disposed = false;
    const poll = async () => {
      try {
        const fresh = await fetchOrder();
        if (!disposed && partnerPosition(fresh)) setLocationMessage("Delivery partner location is live.");
      } catch (err) {
        if (!disposed) console.warn("Live order refresh failed:", err);
      }
    };
    const timer = window.setInterval(poll, POLL_MS);
    return () => { disposed = true; window.clearInterval(timer); };
  }, [fetchOrder, mode]);

  useEffect(() => {
    if (mode !== "partner") return undefined;
    let disposed = false;
    let webWatchId = null;
    let nativeWatchId = null;

    const publish = async (coords) => {
      const next = { lat: coords.latitude, lng: coords.longitude };
      setPosition(next);
      setLocationMessage("Sharing live location with customer");
      const previous = lastPublishedRef.current;
      if (previous && kmBetween(previous.position, next) < 0.025 && Date.now() - previous.time < 15000) return;
      lastPublishedRef.current = { position: next, time: Date.now() };
      try {
        await saveOrderFields({
          deliveryPartnerLatitude: next.lat,
          deliveryPartnerLongitude: next.lng,
          deliveryPartnerLocationUpdatedAt: new Date().toISOString(),
        });
      } catch (err) {
        setLocationMessage("GPS is active, but location could not be shared.");
        console.error("Could not publish delivery partner location:", err);
      }
    };

    const start = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          let permission = await Geolocation.checkPermissions();
          if (permission.location !== "granted") {
            permission = await Geolocation.requestPermissions({ permissions: ["location"] });
          }
          if (permission.location !== "granted") throw new Error("Location permission is required to share tracking.");
          nativeWatchId = await Geolocation.watchPosition(
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 3000 },
            (result, watchError) => {
              if (watchError) setLocationMessage(watchError.message || "Waiting for GPS…");
              else if (result) publish(result.coords);
            },
          );
          if (disposed && nativeWatchId) await Geolocation.clearWatch({ id: nativeWatchId });
          return;
        }
        if (!navigator.geolocation) throw new Error("This device does not support GPS location.");
        webWatchId = navigator.geolocation.watchPosition(
          (result) => publish(result.coords),
          (watchError) => setLocationMessage(watchError.message || "Allow location to share tracking."),
          { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 },
        );
      } catch (err) {
        if (!disposed) setLocationMessage(err.message || "Unable to start location sharing.");
      }
    };

    start();
    return () => {
      disposed = true;
      if (webWatchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(webWatchId);
      if (nativeWatchId) Geolocation.clearWatch({ id: nativeWatchId });
    };
  }, [mode, saveOrderFields]);

  useEffect(() => {
    if (!mapNodeRef.current) return undefined;
    const map = L.map(mapNodeRef.current, { zoomControl: false }).setView(DEFAULT_CENTER, 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    routeRef.current = L.polyline([], { color: "#18884b", weight: 6, opacity: 0.9 }).addTo(map);
    mapRef.current = map;
    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(mapNodeRef.current);
    return () => {
      resizeObserver.disconnect();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      map.remove();
      mapRef.current = null;
      bikeMarkerRef.current = null;
      customerMarkerRef.current = null;
      routeRef.current = null;
    };
  }, []);

  const currentCourierPosition = mode === "partner" ? position : trackedPartnerPosition;

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (destination) {
      if (!customerMarkerRef.current) {
        customerMarkerRef.current = L.marker([destination.lat, destination.lng], {
          icon: homeIcon,
          title: "Customer destination",
        }).addTo(map);
      } else customerMarkerRef.current.setLatLng([destination.lat, destination.lng]);
    }
    if (currentCourierPosition) {
      if (!bikeMarkerRef.current) {
        bikeMarkerRef.current = L.marker([currentCourierPosition.lat, currentCourierPosition.lng], {
          icon: bikeIcon,
          title: "Delivery partner",
          zIndexOffset: 1000,
        }).addTo(map);
      } else {
        const marker = bikeMarkerRef.current;
        const start = marker.getLatLng();
        const startedAt = performance.now();
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        const animate = (time) => {
          const progress = Math.min((time - startedAt) / 900, 1);
          marker.setLatLng([
            start.lat + (currentCourierPosition.lat - start.lat) * progress,
            start.lng + (currentCourierPosition.lng - start.lng) * progress,
          ]);
          if (progress < 1) animationFrameRef.current = requestAnimationFrame(animate);
        };
        animationFrameRef.current = requestAnimationFrame(animate);
      }
      if (!map._hasFitTrackingBounds) {
        map.fitBounds(
          [
            [currentCourierPosition.lat, currentCourierPosition.lng],
            ...(destination ? [[destination.lat, destination.lng]] : []),
          ],
          { padding: [64, 64], maxZoom: 15 },
        );
        map._hasFitTrackingBounds = true;
      } else if (!map.getBounds().contains([currentCourierPosition.lat, currentCourierPosition.lng])) {
        map.panTo([currentCourierPosition.lat, currentCourierPosition.lng], { animate: true });
      }
    } else if (destination && !map._hasFitTrackingBounds) {
      map.setView([destination.lat, destination.lng], 14);
      map._hasFitTrackingBounds = true;
    }
  }, [currentCourierPosition, destination]);

  useEffect(() => {
    if (!currentCourierPosition || !destination || !routeRef.current) return undefined;
    const previousRoute = lastRouteRequestRef.current;
    if (
      previousRoute &&
      Date.now() - previousRoute.at < 15000 &&
      kmBetween(previousRoute.origin, currentCourierPosition) < 0.1 &&
      kmBetween(previousRoute.destination, destination) < 0.01
    ) return undefined;
    lastRouteRequestRef.current = {
      at: Date.now(),
      origin: currentCourierPosition,
      destination,
    };
    let disposed = false;
    const requestId = ++routeRequestRef.current;
    const loadRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${currentCourierPosition.lng},${currentCourierPosition.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Route unavailable");
        const data = await response.json();
        if (disposed || requestId !== routeRequestRef.current) return;
        const route = data.routes?.[0];
        if (!route) throw new Error("Route unavailable");
        routeRef.current?.setStyle({ color: "#18884b", dashArray: null });
        routeRef.current?.setLatLngs(route.geometry.coordinates.map(([lng, lat]) => [lat, lng]));
        setRouteInfo({ km: route.distance / 1000, minutes: Math.ceil(route.duration / 60) });
      } catch {
        if (disposed || requestId !== routeRequestRef.current) return;
        routeRef.current?.setStyle({ color: "#d39322", dashArray: "8 10" });
        routeRef.current?.setLatLngs([
          [currentCourierPosition.lat, currentCourierPosition.lng],
          [destination.lat, destination.lng],
        ]);
        setRouteInfo({ km: kmBetween(currentCourierPosition, destination), minutes: null });
      }
    };
    loadRoute();
    return () => { disposed = true; };
  }, [currentCourierPosition, destination]);

  const goBack = () => navigate(location.state?.returnTo || `/profilePage/customer/${order?.userId || ""}`);

  return (
    <main style={{ position: "fixed", inset: 0, background: "#e8ece8" }}>
      <div ref={mapNodeRef} style={{ position: "absolute", inset: 0 }} />
      <header style={{ position: "absolute", zIndex: 1000, top: "max(12px, env(safe-area-inset-top))", left: 12, right: 12, display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "#fff", borderRadius: 10, boxShadow: "0 3px 16px #17251f26" }}>
        <button className="btn btn-light btn-sm" type="button" onClick={goBack} aria-label="Back"><ArrowBackIcon fontSize="small" /></button>
        <div style={{ minWidth: 0 }}>
          <strong style={{ display: "block" }}>{mode === "partner" ? "Navigate to customer" : "Track your delivery"}</strong>
          <small style={{ display: "block", color: "#59645d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{order?.martId ? `Order ${order.martId} · ` : ""}{address || (loading ? "Loading customer location…" : "Customer location")}</small>
        </div>
      </header>
      <section style={{ position: "absolute", zIndex: 1000, left: 12, right: 12, bottom: "max(12px, env(safe-area-inset-bottom))", padding: "16px 18px", background: "#fff", borderRadius: 10, boxShadow: "0 3px 16px #17251f26" }}>
        {loading ? <div>Loading order…</div> : error ? <div className="text-danger">{error}</div> : (
          <>
            <div className="d-flex align-items-center justify-content-between gap-2">
              <strong>{routeInfo ? `${routeInfo.km.toFixed(1)} km${routeInfo.minutes ? ` · about ${routeInfo.minutes} min` : ""}` : "Route updating"}</strong>
              <span className="small text-success fw-semibold">● {locationMessage}</span>
            </div>
            {mode === "customer" && !currentCourierPosition && <small className="d-block text-muted mt-2">Live location will appear after your delivery partner starts sharing their route.</small>}
            {!destination && mode === "customer" && <small className="d-block text-warning mt-2">We need your delivery location to show the route. Allow location access when prompted.</small>}
          </>
        )}
      </section>
    </main>
  );
}