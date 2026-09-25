/**
 * maps.js — Google Maps helpers (script loader, distance, navigation links).
 *
 * The Maps JavaScript API key comes from REACT_APP_GOOGLE_MAPS_API_KEY
 * (.env file, read at build time — see .env.example).
 */
import { Capacitor } from "@capacitor/core";

const KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "";

export const hasMapsKey = () => Boolean(KEY);

let loaderPromise = null;
let authFailureHandler = null;

/** Called if Google rejects the key (wrong key, API not enabled, billing off). */
export const onMapsAuthFailure = (cb) => {
  authFailureHandler = cb;
};
if (typeof window !== "undefined") {
  window.gm_authFailure = () => authFailureHandler && authFailureHandler();
}

export function loadGoogleMaps() {
  if (window.google && window.google.maps) return Promise.resolve(window.google.maps);
  if (!KEY) return Promise.reject(new Error("Google Maps API key is missing."));
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    window.__gmapsReady = () => resolve(window.google.maps);
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      KEY,
    )}&callback=__gmapsReady&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      loaderPromise = null;
      reject(new Error("Could not load Google Maps. Check your internet connection."));
    };
    document.head.appendChild(script);
  });
  return loaderPromise;
}

/** A usable GPS point: finite, in range, and not the 0,0 "unknown" placeholder. */
export const hasValidCoords = (lat, lng) =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  Math.abs(lat) <= 90 &&
  Math.abs(lng) <= 180 &&
  !(lat === 0 && lng === 0);

/** Straight-line distance in km. */
export function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Turn-by-turn navigation link. Starts from the phone's current position. */
export function directionsUrl({ lat, lng, address }) {
  const destination = hasValidCoords(lat, lng) ? `${lat},${lng}` : address || "";
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    destination,
  )}&travelmode=driving`;
}

/** Opens a link in the Google Maps app / browser (not inside the app's WebView). */
export function openExternal(url) {
  if (Capacitor.isNativePlatform()) {
    // Capacitor hands links to other sites to the phone (Google Maps app).
    window.location.href = url;
  } else {
    window.open(url, "_blank", "noopener");
  }
}
