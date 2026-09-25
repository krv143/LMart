/**
 * PushNotificationService
 * - Web: browser Notification API.
 * - Android / iOS app (Capacitor): system local notifications via
 *   @capacitor/local-notifications.
 * No Firebase dependency. NOTE: these are notifications the app raises itself
 * while it is running (e.g. after polling for order updates). Notifications
 * that arrive while the app is fully closed need FCM/APNs and a backend that
 * sends them - see the README.
 */
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

const isNative = Capacitor.isNativePlatform();
let nativeGranted = false;
if (isNative) {
  LocalNotifications.checkPermissions()
    .then((r) => {
      nativeGranted = r.display === "granted";
    })
    .catch(() => {});
}

const API = "https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api";

const PushNotificationService = {
  _onMessageCallback: null,

  /**
   * Initialize — request permission for browser notifications.
   * Returns { granted: true/false, reason? }
   */
  async initialize(userId) {
    try {
      if (isNative) {
        let perm = await LocalNotifications.checkPermissions();
        if (perm.display !== "granted") {
          perm = await LocalNotifications.requestPermissions();
        }
        nativeGranted = perm.display === "granted";
        if (!nativeGranted)
          return { granted: false, reason: "Permission denied by user" };
      } else if (!("Notification" in window))
        return {
          granted: false,
          reason: "Browser does not support notifications",
        };

      if (!isNative) {
        const permission = await Notification.requestPermission();
        if (permission !== "granted")
          return { granted: false, reason: "Permission denied by user" };
      }

      // Register this user as having notifications enabled
      try {
        await fetch(`${API}/ProfileMessage/RegisterPushUser`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: "string",
            userId,
            platform: Capacitor.getPlatform(), // "web" | "android" | "ios"
            isActive: true,
            registeredAt: new Date().toISOString(),
          }),
        });
      } catch {
        // API endpoint may not exist yet — that is fine
      }

      return { granted: true };
    } catch (error) {
      console.error("Notification init failed:", error);
      return { granted: false, reason: error.message };
    }
  },

  /** Show a browser notification */
  show(title, body, options = {}) {
    if (isNative) {
      if (!nativeGranted) return;
      LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Date.now() % 2147483647),
            title: title || "Handyman",
            body: body || "",
          },
        ],
      }).catch(() => {});
      return;
    }
    if (!("Notification" in window) || Notification.permission !== "granted")
      return;
    try {
      const n = new Notification(title || "Handyman", {
        body: body || "",
        icon: options.icon || "/logo192.png",
        badge: "/logo192.png",
        ...options,
      });
      n.onclick = () => {
        window.focus();
        n.close();
      };
    } catch {
      /* silent */
    }
  },

  /** Check if notifications are enabled */
  isEnabled() {
    if (isNative) return nativeGranted;
    return "Notification" in window && Notification.permission === "granted";
  },

  /** Check if the browser/WebView supports push notifications at all */
  isSupported() {
    return isNative || "Notification" in window;
  },

  /** Set callback for in-app message display */
  onForegroundMessage(callback) {
    this._onMessageCallback = callback;
  },
};

export default PushNotificationService;
