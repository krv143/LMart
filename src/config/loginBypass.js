/**
 * loginBypass.js — mobile numbers that sign in WITHOUT an OTP.
 *
 * Typical use: a demo / Google Play review account, or your own test
 * delivery-partner number. Anyone who knows one of these numbers can sign in
 * as that user from the app, so only list numbers you are happy to have
 * public, and keep the account low-privilege. To switch the bypass off, empty
 * the list. The safer long-term fix is to accept a fixed OTP for the number on
 * the backend (see README).
 *
 * Each number maps to where it lands after sign-in, since different bypass
 * numbers now go to different fixed pages (not every bypass account is a
 * delivery partner).
 */
export const OTP_BYPASS_LANDINGS = {
  "9885803193": "/adminOrdersMap/Admin",
  "9248513524": "/adminOrdersMap/Admin",
  "9885803197": "/superadmin/order-map",
};

export const OTP_BYPASS_NUMBERS = Object.keys(OTP_BYPASS_LANDINGS);

export const isOtpBypassNumber = (mobile) =>
  OTP_BYPASS_NUMBERS.includes(String(mobile || "").trim());

// Returns the fixed path a bypass number lands on, or null if the number
// isn't a bypass number (caller should fall back to the normal OTP flow).
export const getOtpBypassLanding = (mobile) =>
  OTP_BYPASS_LANDINGS[String(mobile || "").trim()] || null;

// Kept so any existing call site importing the old single-path constant
// doesn't break; new code should call getOtpBypassLanding(mobile) instead,
// since the landing page now varies by number.
export const OTP_BYPASS_LANDING = "/adminOrdersMap/Admin";
export const otpBypassIsFixedPath = true;