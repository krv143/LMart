/**
 * loginBypass.js — mobile numbers that sign in WITHOUT an OTP.
 *
 * Typical use: a demo / Google Play review account, or your own test
 * delivery-partner number. Anyone who knows one of these numbers can sign in
 * as that user from the app, so only list numbers you are happy to have
 * public, and keep the account low-privilege. To switch the bypass off, empty
 * the list. The safer long-term fix is to accept a fixed OTP for the number on
 * the backend (see README).
 */
export const OTP_BYPASS_NUMBERS = ["9885803193"];

export const isOtpBypassNumber = (mobile) =>
  OTP_BYPASS_NUMBERS.includes(String(mobile || "").trim());

// Where a bypass number lands after sign-in.
// AdminOrdersMapPage needs no :userType/:userId, so it's a plain path;
// any other bypass number would still go to :userType/:userId/deliveryNewOrders
// (kept for reference — not currently used by any listed number).
export const OTP_BYPASS_LANDING = "/adminOrdersMap/Admin";
export const otpBypassIsFixedPath = true;
