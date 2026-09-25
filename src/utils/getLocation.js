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

const OPTIONS = { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 };

export async function getUserLocation() {
  if (Capacitor.isNativePlatform()) {
    let perm = await Geolocation.checkPermissions();
    if (perm.location !== "granted") {
      perm = await Geolocation.requestPermissions({ permissions: ["location"] });
    }
    if (perm.location !== "granted") {
      throw new Error("Location permission denied");
    }
    const pos = await Geolocation.getCurrentPosition(OPTIONS);
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
      OPTIONS,
    );
  });
}
