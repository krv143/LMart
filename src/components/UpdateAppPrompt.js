import React, { useEffect, useState } from "react";

/*
 * Shows a full-screen "Update required" dialog ONLY inside the old
 * Natively wrapper app (versionCode 24 / 26.0.5), which loads this website
 * in a WebView. Normal browser visitors never see it.
 *
 * The new Flutter app (versionCode 33+) does not load this site, so it is
 * unaffected.
 */

// ---- Settings ---------------------------------------------------------
const PACKAGE_ID = "com.ShMJqnAZKkEl.natively";
const FORCE_UPDATE = true; // false = show a "Later" button
const LATER_SNOOZE_HOURS = 24; // used only when FORCE_UPDATE is false
// -----------------------------------------------------------------------

const MARKET_URL = `market://details?id=${PACKAGE_ID}`;
const PLAY_URL = `https://play.google.com/store/apps/details?id=${PACKAGE_ID}`;
const SNOOZE_KEY = "hm_update_snooze_until";

function isOldWrapperApp() {
  if (typeof window === "undefined") return false;
  // Natively injects these globals into its WebView
  if (window.$agent || window.flutter_inappwebview) return true;
  const ua = navigator.userAgent || "";
  // Android WebView (not Chrome browser) contains "; wv)"
  return /Android/i.test(ua) && /; wv\)/.test(ua);
}

function isSnoozed() {
  if (FORCE_UPDATE) return false;
  try {
    const until = Number(localStorage.getItem(SNOOZE_KEY) || 0);
    return Date.now() < until;
  } catch {
    return false;
  }
}

function openPlayStore() {
  // Try the Play Store app first, fall back to the web page
  const fallback = setTimeout(() => {
    window.location.href = PLAY_URL;
  }, 800);
  try {
    window.location.href = MARKET_URL;
  } catch {
    clearTimeout(fallback);
    window.location.href = PLAY_URL;
  }
}

export default function UpdateAppPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Natively injects $agent shortly after page load, so check a few times
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (isOldWrapperApp() && !isSnoozed()) {
        setShow(true);
        clearInterval(timer);
      } else if (tries >= 10) {
        clearInterval(timer);
      }
    }, 300);
    return () => clearInterval(timer);
  }, []);

  if (!show) return null;

  const later = () => {
    try {
      localStorage.setItem(
        SNOOZE_KEY,
        String(Date.now() + LATER_SNOOZE_HOURS * 3600 * 1000)
      );
    } catch {}
    setShow(false);
  };

  return (
    <div style={styles.backdrop} role="dialog" aria-modal="true">
      <div style={styles.card}>
        <div style={styles.icon}>⬆️</div>
        <h2 style={styles.title}>New version available</h2>
        <p style={styles.text}>
          We have released a new and improved HandyMan app. Please update from
          the Play Store to continue using all features.
        </p>
        <button style={styles.primary} onClick={openPlayStore}>
          Update now
        </button>
        {!FORCE_UPDATE && (
          <button style={styles.secondary} onClick={later}>
            Later
          </button>
        )}
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    zIndex: 99999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    background: "#fff",
    borderRadius: 16,
    padding: "28px 22px",
    maxWidth: 360,
    width: "100%",
    textAlign: "center",
    boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
  },
  icon: { fontSize: 44, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: 700, margin: "0 0 10px", color: "#222" },
  text: { fontSize: 15, color: "#555", lineHeight: 1.5, margin: "0 0 22px" },
  primary: {
    width: "100%",
    padding: "13px 0",
    border: "none",
    borderRadius: 10,
    background: "#1a73e8",
    color: "#fff",
    fontSize: 16,
    fontWeight: 600,
  },
  secondary: {
    width: "100%",
    padding: "11px 0",
    marginTop: 10,
    border: "none",
    background: "transparent",
    color: "#1a73e8",
    fontSize: 15,
  },
};
