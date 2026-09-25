// import axios from "axios";

// // Dynamic replacement for the old static vendorlist.json. Vendors now vary
// // by the customer's pincode, so the source of truth is
// // GetVendorsByPincode?pincode=XXXXXX. Same pattern as groceryStore.js:
// // the first caller for a given pincode hits the API, everyone else (same
// // tab, any component, any page) gets the in-memory copy for free until the
// // cache expires — "first time it fetches from server, further calls read
// // from the cached data" to keep the page fast.
// //
// // A page reload / navigation still avoids a network round trip within
// // CACHE_TTL_MS, because the last good response per pincode is mirrored
// // into sessionStorage (cleared automatically when the tab closes).

// const API_BASE = "https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api";
// const GET_VENDORS_BY_PINCODE = `${API_BASE}/VendorUploadProducts/GetVendorsByPincode`;

// const GET_VENDOR_PRODUCTS_BY_VENDOR_ID = `${API_BASE}/VendorUploadProducts/GetVendorProductsvalues`;

// const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes — tune to how often vendors/products actually change
// // Bumped v1 -> v2: normalizeVendor now includes `limit` on each product.
// // Changing this prefix means any old cached entries (written by the
// // previous normalization, which silently dropped `limit`) are simply
// // never looked up again — they're orphaned under the old v1 key and a
// // fresh network fetch happens instead. Bump this again any time
// // normalizeVendor's output shape changes, so stale sessionStorage/memory
// // cache from a prior deploy can't mask a real bug like this one did.
// const SESSION_KEY_PREFIX = "vendorListCache_v2_";

// const memoryCache = new Map(); // pincode -> { vendors, fetchedAt }
// const inflight = new Map(); // pincode -> shared in-flight request, so concurrent callers don't double-fetch
// const listeners = new Set();

// const productsMemoryCache = new Map(); // vendorId -> { vendor: normalized|null, fetchedAt }
// const productsInflight = new Map(); // vendorId -> shared in-flight request
// const PRODUCTS_SESSION_KEY_PREFIX = "vendorProductsCache_v2_";

// // Server field names don't match what the rest of the app (ProfilePage.js
// // etc.) was built against for vendorlist.json — normalize once here so
// // every caller keeps using vendorId / storeName / categories / category /
// // productId / qty / limit, same shape as before. Categories are also
// // sorted by whatever "rank" the vendor/admin set (Vendor Preview page /
// // Super Admin vendor products page) so every consumer — including the
// // customer-facing Profile page — shows them in that same arranged order
// // automatically, with unranked categories (older records) falling back to
// // the order the API returned them in.
// const sortCategoriesByRank = (categories) => {
//   const withIndex = categories.map((c, idx) => ({ c, idx }));
//   withIndex.sort((a, b) => {
//     const rankA = Number(a.c.rank);
//     const rankB = Number(b.c.rank);
//     const hasA = Number.isFinite(rankA);
//     const hasB = Number.isFinite(rankB);
//     if (hasA && hasB) return rankA - rankB || a.idx - b.idx;
//     if (hasA) return -1;
//     if (hasB) return 1;
//     return a.idx - b.idx;
//   });
//   return withIndex.map(({ c }) => c);
// };

// //

// const normalizeVendor = (v) => ({
//   id: v.id || "",
//   vendorId: v.vendorId || v.id,
//   storeName: v.storeName || "",
//   status: v.status || "",
//   pincodes: Array.isArray(v.pincodes) ? v.pincodes : [],
//   categories: sortCategoriesByRank(
//     (v.categorie || v.categories || []).map((c) => ({
//       category: c.categoryName || c.category || "",
//       rank: c.rank,
//       products: (c.products || []).map((p) => ({
//         productId: p.productIds || p.productId, // "adee70c3-..." ✓
//         discount: Number(p.discount || 0), // "18" -> 18 ✓
//         qty: Number(p.quantity ?? p.qty ?? 0), // "5" -> 5 ✓
//         limit: Number(p.limit ?? p.Limit ?? 0), // "5" -> 5 ✓
//       })),
//     })),
//   ),
// });

// const sessionKey = (pincode) => `${SESSION_KEY_PREFIX}${pincode}`;

// function readSessionCache(pincode) {
//   try {
//     const raw = sessionStorage.getItem(sessionKey(pincode));
//     if (!raw) return null;
//     const parsed = JSON.parse(raw);
//     if (!parsed?.vendors || !parsed?.fetchedAt) return null;
//     if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
//     return parsed;
//   } catch {
//     return null;
//   }
// }

// function writeSessionCache(pincode, payload) {
//   try {
//     sessionStorage.setItem(sessionKey(pincode), JSON.stringify(payload));
//   } catch {
//     // sessionStorage full/unavailable (private browsing etc.) — the
//     // in-memory cache still works for the rest of this tab's session.
//   }
// }

// async function fetchFromServer(pincode) {
//   const { data } = await axios.get(GET_VENDORS_BY_PINCODE, {
//     params: { pincode },
//   });
//   const vendors = (Array.isArray(data) ? data : []).map(normalizeVendor);
//   const payload = { vendors, fetchedAt: Date.now() };
//   memoryCache.set(pincode, payload);
//   writeSessionCache(pincode, payload);
//   listeners.forEach((cb) => {
//     try {
//       cb(pincode, payload.vendors);
//     } catch {
//       // a bad listener shouldn't break the fetch for everyone else
//     }
//   });
//   return payload.vendors;
// }

// /**
//  * Get the vendor list for a pincode. Safe to call from every
//  * page/component that needs it — the network call only actually happens
//  * once per pincode per CACHE_TTL_MS window (or when force is passed);
//  * every call after that is served from memory/sessionStorage.
//  */
// export async function getVendorsByPincode(pincode, { force = false } = {}) {
//   const key = String(pincode || "").trim();
//   if (!key) return [];

//   if (!force) {
//     const cached = memoryCache.get(key);
//     if (cached && Date.now() - cached.fetchedAt <= CACHE_TTL_MS) {
//       return cached.vendors;
//     }
//     if (!cached) {
//       const fromSession = readSessionCache(key);
//       if (fromSession) {
//         memoryCache.set(key, fromSession);
//         return fromSession.vendors;
//       }
//     }
//     if (inflight.has(key)) return inflight.get(key);
//   }

//   const promise = fetchFromServer(key).finally(() => {
//     inflight.delete(key);
//   });
//   inflight.set(key, promise);
//   return promise;
// }

// /**
//  * Call this after a vendor's products/categories are updated (e.g. from
//  * the vendor stock update page) so the next getVendorsByPincode() call for
//  * that pincode goes back to the server instead of serving stale data.
//  * Pass no pincode to clear every cached pincode at once.
//  */
// export function invalidateVendorListCache(pincode) {
//   if (pincode) {
//     const key = String(pincode).trim();
//     memoryCache.delete(key);
//     try {
//       sessionStorage.removeItem(sessionKey(key));
//     } catch {
//       // ignore
//     }
//     return;
//   }
//   memoryCache.clear();
//   try {
//     Object.keys(sessionStorage)
//       .filter((k) => k.startsWith(SESSION_KEY_PREFIX))
//       .forEach((k) => sessionStorage.removeItem(k));
//   } catch {
//     // ignore
//   }
// }

// /**
//  * Optional: subscribe to vendor list refreshes for a pincode, e.g. to
//  * update a page that's already mounted when another part of the app
//  * force-refreshes the list. Returns an unsubscribe function.
//  */
// export function onVendorListUpdate(callback) {
//   listeners.add(callback);
//   return () => listeners.delete(callback);
// }

// // ---------------------------------------------------------------------
// // Per-vendor product list (VendorPreviewPage) — GetVendorProductsByVendorId
// // ---------------------------------------------------------------------
// // Same "first call hits the server, later calls are served from cache"
// // idea as getVendorsByPincode, just keyed by vendorId instead of pincode.
// // A vendor with no submission yet gets `null` back (not an error) so the
// // caller can show a "no products / pending" state instead of a failure.

// const productsSessionKey = (vendorId) =>
//   `${PRODUCTS_SESSION_KEY_PREFIX}${vendorId}`;

// function readProductsSessionCache(vendorId) {
//   try {
//     const raw = sessionStorage.getItem(productsSessionKey(vendorId));
//     if (!raw) return null;
//     const parsed = JSON.parse(raw);
//     if (!parsed?.fetchedAt) return null;
//     if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
//     return parsed;
//   } catch {
//     return null;
//   }
// }

// function writeProductsSessionCache(vendorId, payload) {
//   try {
//     sessionStorage.setItem(
//       productsSessionKey(vendorId),
//       JSON.stringify(payload),
//     );
//   } catch {
//     // ignore — in-memory cache still covers the rest of this tab session
//   }
// }

// // The endpoint may reply with a single vendor object, an array containing
// // one, or nothing at all (204/404/empty body) when the vendor hasn't
// // submitted anything yet — handle all three the same way.
// function normalizeVendorProductsResponse(data) {
//   const raw = Array.isArray(data) ? data[0] : data;
//   if (!raw || typeof raw !== "object") return null;
//   const vendor = normalizeVendor(raw);
//   const hasProducts = vendor.categories.some((c) => c.products.length > 0);
//   return hasProducts ? vendor : null;
// }

// async function fetchVendorProductsFromServer(vendorId) {
//   let vendor = null;
//   try {
//     const { data } = await axios.get(GET_VENDOR_PRODUCTS_BY_VENDOR_ID, {
//       params: { vendorId },
//     });
//     vendor = normalizeVendorProductsResponse(data);
//   } catch (err) {
//     // A 404 just means "nothing submitted yet" for this vendor — treat
//     // that as an empty result instead of surfacing it as a page error.
//     if (err?.response?.status !== 404) throw err;
//     vendor = null;
//   }
//   const payload = { vendor, fetchedAt: Date.now() };
//   productsMemoryCache.set(vendorId, payload);
//   writeProductsSessionCache(vendorId, payload);
//   return vendor;
// }

// /**
//  * Get a vendor's own submitted products (VendorPreviewPage). Returns the
//  * normalized vendor object ({ vendorId, storeName, status, categories })
//  * if they have at least one product, or null if they don't have any yet.
//  * First call per vendorId hits the server; later calls within
//  * CACHE_TTL_MS are served from memory/sessionStorage.
//  */
// export async function getVendorProductsByVendorId(
//   vendorId,
//   { force = false } = {},
// ) {
//   const key = String(vendorId || "").trim();
//   if (!key) return null;

//   if (!force) {
//     const cached = productsMemoryCache.get(key);
//     if (cached && Date.now() - cached.fetchedAt <= CACHE_TTL_MS) {
//       return cached.vendor;
//     }
//     if (!cached) {
//       const fromSession = readProductsSessionCache(key);
//       if (fromSession) {
//         productsMemoryCache.set(key, fromSession);
//         return fromSession.vendor;
//       }
//     }
//     if (productsInflight.has(key)) return productsInflight.get(key);
//   }

//   const promise = fetchVendorProductsFromServer(key).finally(() => {
//     productsInflight.delete(key);
//   });
//   productsInflight.set(key, promise);
//   return promise;
// }

// /**
//  * Call after a vendor submits/updates products so the next
//  * getVendorProductsByVendorId() call goes back to the server.
//  */
// export function invalidateVendorProductsCache(vendorId) {
//   const key = String(vendorId || "").trim();
//   if (!key) return;
//   productsMemoryCache.delete(key);
//   try {
//     sessionStorage.removeItem(productsSessionKey(key));
//   } catch {
//     // ignore
//   }
// }

import axios from "axios";

// Dynamic replacement for the old static vendorlist.json. Vendors now vary
// by the customer's pincode, so the source of truth is
// GetVendorsByPincode?pincode=XXXXXX. Same pattern as groceryStore.js:
// the first caller for a given pincode hits the API, everyone else (same
// tab, any component, any page) gets the in-memory copy for free until the
// cache expires — "first time it fetches from server, further calls read
// from the cached data" to keep the page fast.
//
// A page reload / navigation still avoids a network round trip within
// CACHE_TTL_MS, because the last good response per pincode is mirrored
// into sessionStorage (cleared automatically when the tab closes).

const API_BASE = "https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api";
const GET_VENDORS_BY_PINCODE = `${API_BASE}/VendorUploadProducts/GetVendorsByPincode`;

const GET_VENDOR_PRODUCTS_BY_VENDOR_ID = `${API_BASE}/VendorUploadProducts/GetVendorProductsvalues`;

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes — tune to how often vendors/products actually change
// Bumped v1 -> v2: normalizeVendor now includes `limit` on each product.
// Changing this prefix means any old cached entries (written by the
// previous normalization, which silently dropped `limit`) are simply
// never looked up again — they're orphaned under the old v1 key and a
// fresh network fetch happens instead. Bump this again any time
// normalizeVendor's output shape changes, so stale sessionStorage/memory
// cache from a prior deploy can't mask a real bug like this one did.
const SESSION_KEY_PREFIX = "vendorListCache_v2_";

const memoryCache = new Map(); // pincode -> { vendors, fetchedAt }
const inflight = new Map(); // pincode -> shared in-flight request, so concurrent callers don't double-fetch
const listeners = new Set();

const productsMemoryCache = new Map(); // vendorId -> { vendor: normalized|null, fetchedAt }
const productsInflight = new Map(); // vendorId -> shared in-flight request
const PRODUCTS_SESSION_KEY_PREFIX = "vendorProductsCache_v2_";

// Server field names don't match what the rest of the app (ProfilePage.js
// etc.) was built against for vendorlist.json — normalize once here so
// every caller keeps using vendorId / storeName / categories / category /
// productId / qty / limit, same shape as before. Categories are also
// sorted by whatever "rank" the vendor/admin set (Vendor Preview page /
// Super Admin vendor products page) so every consumer — including the
// customer-facing Profile page — shows them in that same arranged order
// automatically, with unranked categories (older records) falling back to
// the order the API returned them in.
const sortCategoriesByRank = (categories) => {
  const withIndex = categories.map((c, idx) => ({ c, idx }));
  withIndex.sort((a, b) => {
    const rankA = Number(a.c.rank);
    const rankB = Number(b.c.rank);
    const hasA = Number.isFinite(rankA);
    const hasB = Number.isFinite(rankB);
    if (hasA && hasB) return rankA - rankB || a.idx - b.idx;
    if (hasA) return -1;
    if (hasB) return 1;
    return a.idx - b.idx;
  });
  return withIndex.map(({ c }) => c);
};

const normalizeVendor = (v) => ({
  id: v.id || "",
  vendorId: v.vendorId || v.id,
  storeName: v.storeName || "",
  status: v.status || "",
  pincodes: Array.isArray(v.pincodes) ? v.pincodes : [],
  categories: sortCategoriesByRank(
    (v.categorie || v.categories || []).map((c) => ({
      category: c.categoryName || c.category || "",
      rank: c.rank,
      products: (c.products || []).map((p) => ({
        productId: p.productIds || p.productId,
        discount: Number(p.discount || 0),
        qty: Number(p.quantity ?? p.qty ?? 0),
        // Per-customer limit — was missing here before, which is why
        // every downstream consumer (extractSelectionFromVendorProducts /
        // pendingLimit / the "Per-customer limit" input on the vendor
        // stock page) always saw an empty/blank limit no matter what the
        // backend actually stored.
        limit: Number(p.limit ?? p.Limit ?? 0),
      })),
    })),
  ),
});

const sessionKey = (pincode) => `${SESSION_KEY_PREFIX}${pincode}`;

function readSessionCache(pincode) {
  try {
    const raw = sessionStorage.getItem(sessionKey(pincode));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.vendors || !parsed?.fetchedAt) return null;
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSessionCache(pincode, payload) {
  try {
    sessionStorage.setItem(sessionKey(pincode), JSON.stringify(payload));
  } catch {
    // sessionStorage full/unavailable (private browsing etc.) — the
    // in-memory cache still works for the rest of this tab's session.
  }
}

async function fetchFromServer(pincode) {
  const { data } = await axios.get(GET_VENDORS_BY_PINCODE, {
    params: { pincode },
  });
  const vendors = (Array.isArray(data) ? data : []).map(normalizeVendor);
  const payload = { vendors, fetchedAt: Date.now() };
  memoryCache.set(pincode, payload);
  writeSessionCache(pincode, payload);
  listeners.forEach((cb) => {
    try {
      cb(pincode, payload.vendors);
    } catch {
      // a bad listener shouldn't break the fetch for everyone else
    }
  });
  return payload.vendors;
}

/**
 * Get the vendor list for a pincode. Safe to call from every
 * page/component that needs it — the network call only actually happens
 * once per pincode per CACHE_TTL_MS window (or when force is passed);
 * every call after that is served from memory/sessionStorage.
 */
export async function getVendorsByPincode(pincode, { force = false } = {}) {
  const key = String(pincode || "").trim();
  if (!key) return [];

  if (!force) {
    const cached = memoryCache.get(key);
    if (cached && Date.now() - cached.fetchedAt <= CACHE_TTL_MS) {
      return cached.vendors;
    }
    if (!cached) {
      const fromSession = readSessionCache(key);
      if (fromSession) {
        memoryCache.set(key, fromSession);
        return fromSession.vendors;
      }
    }
    if (inflight.has(key)) return inflight.get(key);
  }

  const promise = fetchFromServer(key).finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, promise);
  return promise;
}

/**
 * Call this after a vendor's products/categories are updated (e.g. from
 * the vendor stock update page) so the next getVendorsByPincode() call for
 * that pincode goes back to the server instead of serving stale data.
 * Pass no pincode to clear every cached pincode at once.
 */
export function invalidateVendorListCache(pincode) {
  if (pincode) {
    const key = String(pincode).trim();
    memoryCache.delete(key);
    try {
      sessionStorage.removeItem(sessionKey(key));
    } catch {
      // ignore
    }
    return;
  }
  memoryCache.clear();
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(SESSION_KEY_PREFIX))
      .forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // ignore
  }
}

/**
 * Optional: subscribe to vendor list refreshes for a pincode, e.g. to
 * update a page that's already mounted when another part of the app
 * force-refreshes the list. Returns an unsubscribe function.
 */
export function onVendorListUpdate(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

// ---------------------------------------------------------------------
// Per-vendor product list (VendorPreviewPage) — GetVendorProductsByVendorId
// ---------------------------------------------------------------------
// Same "first call hits the server, later calls are served from cache"
// idea as getVendorsByPincode, just keyed by vendorId instead of pincode.
// A vendor with no submission yet gets `null` back (not an error) so the
// caller can show a "no products / pending" state instead of a failure.

const productsSessionKey = (vendorId) =>
  `${PRODUCTS_SESSION_KEY_PREFIX}${vendorId}`;

function readProductsSessionCache(vendorId) {
  try {
    const raw = sessionStorage.getItem(productsSessionKey(vendorId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.fetchedAt) return null;
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeProductsSessionCache(vendorId, payload) {
  try {
    sessionStorage.setItem(
      productsSessionKey(vendorId),
      JSON.stringify(payload),
    );
  } catch {
    // ignore — in-memory cache still covers the rest of this tab session
  }
}

// The endpoint may reply with a single vendor object, an array containing
// one, or nothing at all (204/404/empty body) when the vendor hasn't
// submitted anything yet — handle all three the same way.
function normalizeVendorProductsResponse(data) {
  const raw = Array.isArray(data) ? data[0] : data;
  if (!raw || typeof raw !== "object") return null;
  const vendor = normalizeVendor(raw);
  const hasProducts = vendor.categories.some((c) => c.products.length > 0);
  return hasProducts ? vendor : null;
}

async function fetchVendorProductsFromServer(vendorId) {
  let vendor = null;
  try {
    const { data } = await axios.get(GET_VENDOR_PRODUCTS_BY_VENDOR_ID, {
      params: { vendorId },
    });
    vendor = normalizeVendorProductsResponse(data);
  } catch (err) {
    // A 404 just means "nothing submitted yet" for this vendor — treat
    // that as an empty result instead of surfacing it as a page error.
    if (err?.response?.status !== 404) throw err;
    vendor = null;
  }
  const payload = { vendor, fetchedAt: Date.now() };
  productsMemoryCache.set(vendorId, payload);
  writeProductsSessionCache(vendorId, payload);
  return vendor;
}

/**
 * Get a vendor's own submitted products (VendorPreviewPage). Returns the
 * normalized vendor object ({ vendorId, storeName, status, categories })
 * if they have at least one product, or null if they don't have any yet.
 * First call per vendorId hits the server; later calls within
 * CACHE_TTL_MS are served from memory/sessionStorage.
 */
export async function getVendorProductsByVendorId(
  vendorId,
  { force = false } = {},
) {
  const key = String(vendorId || "").trim();
  if (!key) return null;

  if (!force) {
    const cached = productsMemoryCache.get(key);
    if (cached && Date.now() - cached.fetchedAt <= CACHE_TTL_MS) {
      return cached.vendor;
    }
    if (!cached) {
      const fromSession = readProductsSessionCache(key);
      if (fromSession) {
        productsMemoryCache.set(key, fromSession);
        return fromSession.vendor;
      }
    }
    if (productsInflight.has(key)) return productsInflight.get(key);
  }

  const promise = fetchVendorProductsFromServer(key).finally(() => {
    productsInflight.delete(key);
  });
  productsInflight.set(key, promise);
  return promise;
}

/**
 * Call after a vendor submits/updates products so the next
 * getVendorProductsByVendorId() call goes back to the server.
 */
export function invalidateVendorProductsCache(vendorId) {
  const key = String(vendorId || "").trim();
  if (!key) return;
  productsMemoryCache.delete(key);
  try {
    sessionStorage.removeItem(productsSessionKey(key));
  } catch {
    // ignore
  }
}
