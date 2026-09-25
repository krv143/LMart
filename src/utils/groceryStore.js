import axios from "axios";

// Single source of truth for the full grocery catalog. Profile page,
// VendorPreviewPage, VendorStockUpdatePage (and anything else that needs
// "all grocery items") should read from here instead of calling
// GetAllGroceryItems themselves — first caller on the page hits the API,
// everyone after that (same tab, any component, any of these pages) gets
// the in-memory copy for free until the cache expires.
//
// A page reload / navigation still avoids a network round trip within
// CACHE_TTL_MS, because the last good response is mirrored into
// sessionStorage (cleared automatically when the tab closes).

const API_BASE = "https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api";
const GET_ALL_GROCERY_ITEMS = `${API_BASE}/UploadGrocery/GetAllGroceryItems`;

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes — tune to how often the catalog actually changes
const SESSION_KEY = "groceryCatalogCache_v1";

let memoryCache = null; // { items, fetchedAt }
let inflight = null; // shared in-flight request so concurrent callers don't double-fetch
const listeners = new Set();

const normalizeItem = (p) => ({
  ...p,
  stockLeft: Number(p.stockLeft || 0),
  limit: Number(p.limit || 0),
  mrp: Number(p.mrp || 0),
  discount: Number(p.discount || 0),
  afterDiscount: Number(p.afterDiscount || 0),
});

function readSessionCache() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.items || !parsed?.fetchedAt) return null;
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSessionCache(payload) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  } catch {
    // sessionStorage full/unavailable (private browsing etc.) — the
    // in-memory cache still works for the rest of this tab's session.
  }
}

async function fetchFromServer() {
  const { data } = await axios.get(GET_ALL_GROCERY_ITEMS);
  const items = (Array.isArray(data) ? data : []).map(normalizeItem);
  memoryCache = { items, fetchedAt: Date.now() };
  writeSessionCache(memoryCache);
  listeners.forEach((cb) => {
    try {
      cb(memoryCache.items);
    } catch {
      // a bad listener shouldn't break the fetch for everyone else
    }
  });
  return memoryCache.items;
}

/**
 * Get the full grocery catalog. Safe to call from every page/component
 * that needs it — the network call only actually happens once per
 * CACHE_TTL_MS window (or when force is passed).
 */
export async function getGroceryItems({ force = false } = {}) {
  if (!force) {
    if (memoryCache && Date.now() - memoryCache.fetchedAt <= CACHE_TTL_MS) {
      return memoryCache.items;
    }
    if (!memoryCache) {
      const fromSession = readSessionCache();
      if (fromSession) {
        memoryCache = fromSession;
        return memoryCache.items;
      }
    }
    if (inflight) return inflight;
  }
  inflight = fetchFromServer().finally(() => {
    inflight = null;
  });
  return inflight;
}

/**
 * Call this right after a vendor/admin mutates stock (add/update item) so
 * the next getGroceryItems() call anywhere goes back to the server instead
 * of serving stale data.
 */
export function invalidateGroceryCache() {
  memoryCache = null;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

/**
 * Optional: subscribe to catalog refreshes, e.g. to update a page that's
 * already mounted when another part of the app force-refreshes the catalog.
 * Returns an unsubscribe function.
 */
export function onGroceryItemsUpdate(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export async function getLiveGroceryStock(productId) {
  const { data } = await axios.get(GET_ALL_GROCERY_ITEMS);

  const items = (Array.isArray(data) ? data : []).map(normalizeItem);

  const id = String(productId);

  const item = items.find(
    (p) =>
      String(p.id) === id ||
      String(p.groceryItemId) === id
  );

  if (!item) {
    console.error("Live stock product not found:", {
      requestedProductId: productId,
      availableMatchFields: items.slice(0, 5).map((p) => ({
        id: p.id,
        groceryItemId: p.groceryItemId,
        name: p.name,
        stockLeft: p.stockLeft,
      })),
    });

    throw new Error("Product not found");
  }

  console.log("LIVE STOCK FROM SERVER:", {
    id: item.id,
    groceryItemId: item.groceryItemId,
    name: item.name,
    stockLeft: item.stockLeft,
  });

  return item;
}