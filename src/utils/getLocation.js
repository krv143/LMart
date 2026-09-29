/**
 * getLocation.js — current GPS position, for both the browser and the
 * Android/iOS app.
 *
 * In the app it uses @capacitor/geolocation (proper Android runtime permission
 * and one clean iOS prompt). On the web it uses navigator.geolocation.
 *
 * Resolves to { latitude, longitude } or rejects. Callers decide whether a
 * failure (permission denied, GPS off, timeout) should block what they're doing.
 */
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { confirmDialog } from "../CommonPages/DialogSystem";

const OPTIONS = { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 };

export async function getUserLocation(overrides = {}) {
  const options = { ...OPTIONS, ...overrides };
  if (Capacitor.isNativePlatform()) {
    let perm = await Geolocation.checkPermissions();
    if (perm.location !== "granted") {
      perm = await Geolocation.requestPermissions({ permissions: ["location"] });
    }
    if (perm.location !== "granted") {
      throw new Error("Location permission denied");
    }
    const pos = await Geolocation.getCurrentPosition(options);
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  }

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => reject(err),
      options,
    );
  });
}

/**
 * Classifies a location failure so callers can show the right message.
 * Returns "denied" | "off" | "timeout" | "unsupported" | "unknown".
 * Works for both the browser error (code 1/2/3) and Capacitor errors (message).
 */
export function locationErrorKind(err) {
  const msg = String(err?.message || err || "").toLowerCase();
  if (msg.includes("not supported")) return "unsupported";
  if (err?.code === 1 || msg.includes("denied") || msg.includes("permission")) {
    return "denied";
  }
  if (err?.code === 3 || msg.includes("timeout") || msg.includes("timed out")) {
    return "timeout";
  }
  if (
    err?.code === 2 ||
    msg.includes("not enabled") ||
    msg.includes("unavailable") ||
    msg.includes("disabled")
  ) {
    return "off";
  }
  return "unknown";
}

const RETRY_MESSAGES = {
  denied:
    "Location permission is blocked.\n\nPlease allow location access for this app in your phone / browser settings, then tap \"Try again\".",
  timeout:
    "We couldn't get your location in time.\n\nPlease make sure GPS / location is turned ON and you have a signal, then tap \"Try again\".",
  default:
    "Your location is turned OFF.\n\nPlease turn on GPS / location, then tap \"Try again\".",
};

/**
 * Gets the user's location and, if that fails (location off, permission
 * denied, timeout), asks the user to fix it and tries again.
 *
 * @param {object}  [opts]
 * @param {number}  [opts.maxAttempts=2]  Total tries, including the first.
 *        2 = ask once more after the first failure. Raise it to ask more times.
 * @param {object}  [opts.geoOptions]     Overrides for the geolocation call
 *        (e.g. { maximumAge: 0 } to force a fresh fix).
 * @param {object}  [opts.messages]       Override RETRY_MESSAGES text per kind.
 *
 * Resolves to { latitude, longitude }.
 * Rejects with the last error if every attempt failed, or with an Error whose
 * `cancelled` flag is true if the user tapped Cancel on the retry prompt.
 */
export async function getLocationWithRetry({
  maxAttempts = 2,
  geoOptions,
  messages = {},
} = {}) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await getUserLocation(geoOptions);
    } catch (err) {
      lastError = err;
      const kind = locationErrorKind(err);
      if (kind === "unsupported" || attempt === maxAttempts) break;

      const text = { ...RETRY_MESSAGES, ...messages };
      const retry = await confirmDialog(text[kind] || text.default, {
        okText: "Try again",
        cancelText: "Skip",
      });
      if (!retry) {
        const cancelled = new Error("Location request cancelled by user");
        cancelled.cancelled = true;
        throw cancelled;
      }
    }
  }
  throw lastError;
}
