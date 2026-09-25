import axios from "axios";

// Same backend every other page in the app talks to.
const API_BASE = "https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api";
const GET_ALL_VENDORS = `${API_BASE}/VendorRegistration/GetAllVendors`;
const GET_VENDOR_PRODUCTS_VALUES = `${API_BASE}/VendorUploadProducts/GetVendorProductsvalues`;
const UPDATE_VENDOR_PRODUCTS_VALUES = `${API_BASE}/VendorUploadProducts/UpdateVendorProductsValues`;
const GET_ALL_DELIVERY_PARTNERS = `${API_BASE}/DeliveryPartner/GetAllDeliveryPartners`;
const UPDATE_DELIVERY_PARTNER_DETAILS = `${API_BASE}/DeliveryPartner/UpdateDeliveryPartnerDetails`;
const GET_ALL_MART_ITEMS = `${API_BASE}/Mart/GetAllMartItems`;

export const zoneData = {
  A: ["530001", "530002", "530003", "530004"],
  B: ["530005", "530013", "530016", "530020", "530024", "530022", "530017"],
  C: ["530007", "530008", "530009", "530012", "530018"],
  D: ["530011", "530031", "530029", "530026", "530032"],
  E: ["530027", "530028", "530040"],
  F: ["530014", "530041", "530043", "530045", "530048", "530049"],
  G: ["531162", "531163", "531173"],
};

export const getZoneForPincode = (pincode) => {
  const code = String(pincode || "").trim();
  if (!code) return null; 
  const entry = Object.entries(zoneData).find(([, codes]) =>
    codes.includes(code),
  );
  return entry ? entry[0] : null;
};

// ---- Auth ----
// There's no backend login endpoint for the super admin — a single,
// hardcoded operator account guards this area of the app, checked
// entirely client-side. This account shares VendorLoginPage's form; that
// page routes here whenever the username entered is "superadmin",
// instead of needing a separate login screen.
const SESSION_KEY = "superAdminSession";
const SUPER_ADMIN_USERNAME = "superadmin";
const SUPER_ADMIN_PASSWORD = "admin@123";

export function isSuperAdminUsername(username) {
  return (
    String(username || "")
      .trim()
      .toLowerCase() === SUPER_ADMIN_USERNAME
  );
}

export function loginSuperAdmin(username, password) {
  const ok =
    isSuperAdminUsername(username) && password === SUPER_ADMIN_PASSWORD;
  if (ok) {
    try {
      localStorage.setItem(SESSION_KEY, "true");
    } catch {
      // localStorage unavailable — session just won't persist across reloads
    }
  }
  return ok;
}

export function isSuperAdminAuthenticated() {
  try {
    return localStorage.getItem(SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

export function logoutSuperAdmin() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

// ---- API ----
export async function getAllVendors() {
  const { data } = await axios.get(GET_ALL_VENDORS);
  return Array.isArray(data) ? data : [];
}

// GetVendorProductsvalues replies with an array holding a single
// vendor-submission record — { id, vendorId, storeName, status,
// createdDate, updatedDate, pincodes, categorie: [...] } — the same
// shape UpdateVendorProductsValues expects back. Returns null when the
// vendor hasn't submitted anything for approval yet.
export async function getVendorProductsByVendorId(vendorId) {
  const { data } = await axios.get(GET_VENDOR_PRODUCTS_VALUES, {
    params: { vendorId },
  });
  const record = Array.isArray(data) ? data[0] : data;
  return record && typeof record === "object" ? record : null;
}           

// The endpoint takes an array of vendor-submission records, so a single
// approve/reject action still gets wrapped in one.
//
// IMPORTANT: use `??` (not `||`) when falling back on record.id — an id
// of 0 is falsy but perfectly valid, and `||` would silently drop it,
// sending the PUT with an empty id and getting rejected by the API. Also
// warn loudly if id is genuinely missing, since that's the #1 cause of a
// save that looks like it "did nothing".
export async function updateVendorProductsValues(record) {
  if (record?.id === undefined || record?.id === null || record?.id === "") {
    console.error(
      "updateVendorProductsValues called with a record that has no id — this PUT will almost certainly be rejected by the API:",
      record,
    );
  }
  const id = encodeURIComponent(record?.id ?? "");
  const { data } = await axios.put(
    `${UPDATE_VENDOR_PRODUCTS_VALUES}?id=${id}`,
    record,
    { headers: { "Content-Type": "application/json" } },
  );
  return data;
}

// ---- Delivery partner → vendor mapping ----
// GetAllDeliveryPartners is already filtered server-side to Draft-status
// (freshly-registered, unmapped) partners, so the response is used as-is —
// no client-side status filtering here.
export async function getDraftDeliveryPartners() {
  const { data } = await axios.get(GET_ALL_DELIVERY_PARTNERS);
  return Array.isArray(data) ? data : [];
}

// Maps a delivery partner to a vendor and flips them out of Draft into
// "open" (the same status DeliveryPartnerDashboard checks for before
// showing a partner their assigned orders), so they immediately start
// picking up that vendor's deliveries.
//
// NOTE: UpdateDeliveryPartnerDetails takes `id` as a query parameter
// (see Swagger: PUT /api/DeliveryPartner/UpdateDeliveryPartnerDetails?id=...),
// not as a trailing path segment — same convention as
// updateVendorProductsValues above. Passing it as a path segment 404s.
export async function assignDeliveryPartnerToVendor(partner, vendor) {
  const id = encodeURIComponent(partner?.id || "");
  const payload = {
    ...partner,
    vendorId: vendor?.vendorId || "",
    vendorName: vendor?.storeName || "",
    status: "open",
  };
  const { data } = await axios.put(
    `${UPDATE_DELIVERY_PARTNER_DETAILS}?id=${id}`,
    payload,
    { headers: { "Content-Type": "application/json" } },
  );
  return data;
}

// ---- Orders across all vendors ----
// GetAllMartItems is the unfiltered feed VendorOrdersPage's
// GetVendorOrdersByVendorId is itself scoped from — every mart order,
// across every vendor, each carrying its own vendorId.
export async function getAllVendorOrders() {
  const { data } = await axios.get(GET_ALL_MART_ITEMS);
  return Array.isArray(data) ? data : [];
}