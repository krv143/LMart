import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

  const API_BASE =
    "https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api";
  const DEFAULT_CENTER = [17.6868, 83.2185];

  const getCoordinates = (order) => {
    const lat = Number(order?.latitude ?? order?.Latitude);
    const lng = Number(order?.longitude ?? order?.Longitude);
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180 ||
      (lat === 0 && lng === 0)
    ) {
      return null;
    }
    return { lat, lng };
  };

  const distanceInKm = (from, to) => {
    const radians = (value) => (value * Math.PI) / 180;
    const dLat = radians(to.lat - from.lat);
    const dLng = radians(to.lng - from.lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(radians(from.lat)) *
        Math.cos(radians(to.lat)) *
        Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const bikeIcon = L.divIcon({
    className: "delivery-bike-marker",
    html: '<div style="width:42px;height:42px;border:3px solid #fff;border-radius:50%;background:#16864a;box-shadow:0 2px 10px #0005;display:grid;place-items:center;font-size:23px">&#128757;</div>',
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });

  const customerIcon = L.divIcon({
    className: "delivery-customer-marker",
    html: '<div style="width:38px;height:38px;border:3px solid #fff;border-radius:50%;background:#d63c35;box-shadow:0 2px 10px #0005;display:grid;place-items:center;color:#fff;font-size:18px;font-weight:700">C</div>',
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });

export default function DeliveryTracking() {
    const { id: orderId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const bikeMarkerRef = useRef(null);
    const customerMarkerRef = useRef(null);
    const routeLineRef = useRef(null);
    const animationFrameRef = useRef(null);
    const routeRequestAtRef = useRef(0);
    const routeRequestIdRef = useRef(0);
    const hasFitBoundsRef = useRef(false);

    const [order, setOrder] = useState(null);
    const [loadingOrder, setLoadingOrder] = useState(true);
    const [orderError, setOrderError] = useState("");
    const [position, setPosition] = useState(null);
    const [locationStatus, setLocationStatus] = useState("Getting live location…");
    const [locationError, setLocationError] = useState("");
    const [distanceKm, setDistanceKm] = useState(null);
    const [etaMinutes, setEtaMinutes] = useState(null);
    const [routeMessage, setRouteMessage] = useState("");

    const destination = useMemo(() => getCoordinates(order), [order]);
    const address = [order?.address, order?.district, order?.state, order?.zipCode]
      .filter(Boolean)
      .join(", ");

    useEffect(() => {
      let cancelled = false;
      const fetchOrder = async () => {
        try {
          const response = await fetch(
            `${API_BASE}/Mart/GetProductDetails?id=${orderId}`,
          );
          if (!response.ok) throw new Error("Could not load order details.");
          const data = await response.json();
          const record = Array.isArray(data) ? data[0] : data;
          if (!record) throw new Error("Order not found.");
          if (!cancelled) setOrder(record);
        } catch (error) {
          if (!cancelled) setOrderError(error.message || "Could not load this order.");
        } finally {
          if (!cancelled) setLoadingOrder(false);
        }
      };
      fetchOrder();
      return () => {
        cancelled = true;
      };
    }, [orderId]);

    useEffect(() => {
      let cancelled = false;
      let nativeWatchId = null;
      let browserWatchId = null;

      const receivePosition = (coords) => {
        const next = { lat: coords.latitude, lng: coords.longitude };
        setPosition(next);
        setLocationStatus("Live location active");
        setLocationError("");
      };

      const startWatching = async () => {
        try {
          if (Capacitor.isNativePlatform()) {
            let permission = await Geolocation.checkPermissions();
            if (permission.location !== "granted") {
              permission = await Geolocation.requestPermissions({
                permissions: ["location"],
              });
            }
            if (permission.location !== "granted") {
              throw new Error("Allow location access to start live tracking.");
            }
            nativeWatchId = await Geolocation.watchPosition(
              { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 },
              (result, error) => {
                if (error) {
                  setLocationError(error.message || "GPS location is unavailable.");
                  setLocationStatus("Waiting for GPS");
                } else if (result) {
                  receivePosition(result.coords);
                }
              },
            );
            if (cancelled && nativeWatchId) {
              await Geolocation.clearWatch({ id: nativeWatchId });
            }
            return;
          }

          if (!navigator.geolocation) {
            throw new Error("This device does not support GPS location.");
          }
          browserWatchId = navigator.geolocation.watchPosition(
            (result) => receivePosition(result.coords),
            (error) => {
              setLocationError(error.message || "Allow location access to track delivery.");
              setLocationStatus("Waiting for GPS");
            },
            { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 },
          );
        } catch (error) {
          if (!cancelled) {
            setLocationError(error.message || "Unable to start live location.");
            setLocationStatus("Location unavailable");
          }
        }
      };

      startWatching();
      return () => {
        cancelled = true;
        if (browserWatchId !== null && navigator.geolocation) {
          navigator.geolocation.clearWatch(browserWatchId);
        }
        if (nativeWatchId) Geolocation.clearWatch({ id: nativeWatchId });
      };
    }, []);

    useEffect(() => {
      if (!mapContainerRef.current) return undefined;
      const map = L.map(mapContainerRef.current, { zoomControl: false }).setView(
        DEFAULT_CENTER,
        12,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      routeLineRef.current = L.polyline([], {
        color: "#18884b",
        weight: 6,
        opacity: 0.88,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);
      mapRef.current = map;

      const markerStyle = document.createElement("style");
      markerStyle.textContent = ".delivery-bike-marker { transition: transform 700ms linear; }";
      document.head.appendChild(markerStyle);
      const resizeObserver = new ResizeObserver(() => map.invalidateSize());
      resizeObserver.observe(mapContainerRef.current);

      return () => {
        resizeObserver.disconnect();
        markerStyle.remove();
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        map.remove();
        mapRef.current = null;
        bikeMarkerRef.current = null;
        customerMarkerRef.current = null;
        routeLineRef.current = null;
      };
    }, []);

    const requestRoadRoute = useCallback(async (origin) => {
      if (!destination || !routeLineRef.current) return;
      const now = Date.now();
      if (now - routeRequestAtRef.current < 15000) return;
      routeRequestAtRef.current = now;
      const requestId = ++routeRequestIdRef.current;

      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Route service unavailable");
        const data = await response.json();
        const route = data.routes?.[0];
        if (!route || requestId !== routeRequestIdRef.current) return;
        routeLineRef.current?.setLatLngs(
          route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
        );
        setDistanceKm(route.distance / 1000);
        setEtaMinutes(Math.max(1, Math.ceil(route.duration / 60)));
        setRouteMessage("");
      } catch {
        if (requestId !== routeRequestIdRef.current) return;
        routeLineRef.current?.setLatLngs([
          [origin.lat, origin.lng],
          [destination.lat, destination.lng],
        ]);
        routeLineRef.current?.setStyle({ dashArray: "8 10", color: "#d39322" });
        setDistanceKm(distanceInKm(origin, destination));
        setEtaMinutes(null);
        setRouteMessage("Street route unavailable; showing a direct path.");
      }
    }, [destination]);

    useEffect(() => {
      const map = mapRef.current;
      if (!map) return;

      if (destination) {
        if (customerMarkerRef.current) {
          customerMarkerRef.current.setLatLng([destination.lat, destination.lng]);
        } else {
          customerMarkerRef.current = L.marker(
            [destination.lat, destination.lng],
            { icon: customerIcon, title: "Customer destination", zIndexOffset: 500 },
          ).addTo(map);
        }
      }

      if (position) {
        if (!bikeMarkerRef.current) {
          bikeMarkerRef.current = L.marker([position.lat, position.lng], {
            icon: bikeIcon,
            title: "Your live location",
            zIndexOffset: 1000,
          }).addTo(map);
        } else {
          const marker = bikeMarkerRef.current;
          const start = marker.getLatLng();
          const startedAt = performance.now();
          const duration = 700;
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
          const animate = (time) => {
            const progress = Math.min((time - startedAt) / duration, 1);
            const lat = start.lat + (position.lat - start.lat) * progress;
            const lng = start.lng + (position.lng - start.lng) * progress;
            marker.setLatLng([lat, lng]);
            if (progress < 1) animationFrameRef.current = requestAnimationFrame(animate);
          };
          animationFrameRef.current = requestAnimationFrame(animate);
        }

        if (destination && !hasFitBoundsRef.current) {
          map.fitBounds(
            [
              [position.lat, position.lng],
              [destination.lat, destination.lng],
            ],
            { padding: [70, 70], maxZoom: 15 },
          );
          hasFitBoundsRef.current = true;
        } else if (!map.getBounds().contains([position.lat, position.lng])) {
          map.panTo([position.lat, position.lng], { animate: true, duration: 0.6 });
        }

        routeLineRef.current?.setStyle({ dashArray: null, color: "#18884b" });
        routeLineRef.current?.setLatLngs(
          destination
            ? [[position.lat, position.lng], [destination.lat, destination.lng]]
            : [],
        );
        if (destination) requestRoadRoute(position);
      } else if (destination && !hasFitBoundsRef.current) {
        map.setView([destination.lat, destination.lng], 14);
        hasFitBoundsRef.current = true;
      }
    }, [destination, position, requestRoadRoute]);

    const goBack = () => {
      navigate(location.state?.returnTo || -1);
    };

    return (
      <main style={{ position: "fixed", inset: 0, background: "#e8ece8" }}>
        <div ref={mapContainerRef} style={{ position: "absolute", inset: 0 }} />

        <div
          style={{
            position: "absolute",
            zIndex: 1000,
            top: "max(12px, env(safe-area-inset-top))",
            left: 12,
            right: 12,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 14px",
            background: "#fff",
            borderRadius: 10,
            boxShadow: "0 3px 16px #17251f26",
          }}
        >
          <button
            type="button"
            className="btn btn-light btn-sm"
            onClick={goBack}
            aria-label="Back to order"
          >
            <ArrowBackIcon fontSize="small" />
          </button>
          <div style={{ minWidth: 0 }}>
            <strong style={{ display: "block" }}>Delivery route</strong>
            <small style={{ display: "block", color: "#59645d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {order?.martId ? `Order ${order.martId} · ` : ""}
              {address || (loadingOrder ? "Loading customer address…" : "Customer destination")}
            </small>
          </div>
        </div>

        <section
          style={{
            position: "absolute",
            zIndex: 1000,
            left: 12,
            right: 12,
            bottom: "max(12px, env(safe-area-inset-bottom))",
            padding: "16px 18px",
            background: "#fff",
            borderRadius: 10,
            boxShadow: "0 3px 16px #17251f26",
          }}
        >
          {loadingOrder ? (
            <div>Loading order destination…</div>
          ) : orderError ? (
            <div className="text-danger">{orderError}</div>
          ) : !destination ? (
            <div className="text-danger">This order does not have valid customer GPS coordinates.</div>
          ) : (
            <>
              <div className="d-flex align-items-center justify-content-between gap-3">
                <div>
                  <strong>{distanceKm == null ? "Route starting" : `${distanceKm.toFixed(1)} km`}</strong>
                  {etaMinutes != null && <span className="text-muted"> · about {etaMinutes} min</span>}
                </div>
                <span className="small text-success fw-semibold">● {locationStatus}</span>
              </div>
              {locationError && <small className="d-block text-danger mt-2">{locationError}</small>}
              {routeMessage && <small className="d-block text-warning-emphasis mt-2">{routeMessage}</small>}
              <small className="d-block text-muted mt-2">
                Green marker: your live location · Red marker: customer destination
              </small>
            </>
          )}
        </section>
      </main>
    );
}
