/**
 * PushNotificationService - Browser Notification API based
 * No Firebase dependency. Uses browser native notifications
 * and the existing Handyman API for storing notification records.
 */

const API = "https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api";

const PushNotificationService = {
  _onMessageCallback: null,

  /**
   * Initialize — request permission for browser notifications.
   * Returns { granted: true/false, reason? }
   */
  async initialize(userId) {
    try {
      if (!("Notification" in window))
        return {
          granted: false,
          reason: "Browser does not support notifications",
        };

      const permission = await Notification.requestPermission();
      if (permission !== "granted")
        return { granted: false, reason: "Permission denied by user" };

      // Register this user as having notifications enabled
      try {
        await fetch(`${API}/ProfileMessage/RegisterPushUser`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: "string",
            userId,
            platform: "web",
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
    return "Notification" in window && Notification.permission === "granted";
  },

  /** Check if the browser/WebView supports push notifications at all */
  isSupported() {
    return "Notification" in window;
  },

  /** Set callback for in-app message display */
  onForegroundMessage(callback) {
    this._onMessageCallback = callback;
  },
};

export default PushNotificationService;
