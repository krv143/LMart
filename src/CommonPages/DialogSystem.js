import React, { useEffect, useState } from "react";

/*
 * DialogSystem.js
 *
 * WHY THIS FILE EXISTS:
 * Native browser dialogs (alert / confirm / prompt) are shown by the
 * BROWSER CHROME, not by the webpage. When this app is wrapped into an
 * Android APK by a WebView-based tool (e.g. "Nativity"), the WebView
 * usually does NOT implement the native dialog callbacks
 * (onJsAlert / onJsConfirm / onJsPrompt) unless the app author wrote
 * custom native code for it. Since alert()/confirm()/prompt() are
 * rendered outside the DOM, they either silently do nothing or hang,
 * which is exactly the "prompt window is not coming" bug.
 *
 * FIX: replace native dialogs with a plain DOM/React modal. Because it
 * is regular HTML rendered inside the page (not a browser-chrome
 * dialog), it always works inside any WebView.
 *
 * USAGE:
 *   import { alertDialog, confirmDialog } from "./DialogSystem";
 *   await alertDialog("Order Delivered Successfully");
 *   const ok = await confirmDialog("Delete this product?");
 *   if (ok) { ... }
 *
 * SETUP (already done in App.js):
 *   1. <DialogHost /> is rendered once near the root of the app.
 *   2. window.alert is overridden to route through this modal, so every
 *      existing `alert("...")` call anywhere in the codebase is fixed
 *      automatically with no per-file changes needed.
 *   3. window.confirm cannot be safely auto-overridden because callers
 *      rely on its return value synchronously (`if (window.confirm(...))`).
 *      Call sites that need a confirmation must be updated to
 *      `await confirmDialog(...)` — see the pages that were migrated.
 */

let listeners = [];
let state = { open: false, type: "alert", message: "", resolve: null };

function setState(next) {
  state = { ...state, ...next };
  listeners.forEach((l) => l(state));
}

function openDialog(type, message) {
  return new Promise((resolve) => {
    setState({ open: true, type, message, resolve });
  });
}

export function alertDialog(message) {
  return openDialog("alert", message);
}

export function confirmDialog(message) {
  return openDialog("confirm", message);
}

// Auto-fix every existing alert("...") call in the app, with zero
// per-file changes. Safe because no call site in this codebase reads
// alert()'s return value (alert always returns undefined natively).
if (typeof window !== "undefined") {
  window.alert = (message) => {
    alertDialog(message);
  };
}

export function DialogHost() {
  const [dialogState, setDialogState] = useState(state);

  useEffect(() => {
    listeners.push(setDialogState);
    return () => {
      listeners = listeners.filter((l) => l !== setDialogState);
    };
  }, []);

  if (!dialogState.open) return null;

  const close = (result) => {
    const resolve = dialogState.resolve;
    setState({ open: false, resolve: null });
    if (resolve) resolve(result);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={() => dialogState.type === "alert" && close(true)}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: "20px 20px 16px",
          width: "100%",
          maxWidth: 340,
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
          fontFamily: "inherit",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            fontSize: 15,
            color: "#222",
            lineHeight: 1.4,
            marginBottom: 18,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {dialogState.message}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          {dialogState.type === "confirm" && (
            <button
              onClick={() => close(false)}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid #ccc",
                background: "#f5f5f5",
                color: "#333",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          )}
          <button
            onClick={() => close(true)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: "#1976d2",
              color: "#fff",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

export default DialogHost;
