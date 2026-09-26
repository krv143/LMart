import { saveAs } from "file-saver";

const VENDOR_PROFILES_KEY = "vendorProfiles";
const VENDOR_INVENTORY_KEY = "vendorInventory";

// Generates a placeholder image entirely locally (inline SVG data URI) —
// no external network call, so it never shows up broken/empty like
// via.placeholder.com does when that service is unreachable.
export const makePlaceholderImage = (text, bg = "e9ecef", fg = "ffffff") => {
  const safeText = String(text || "?").slice(0, 22);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='220'>
    <rect width='100%' height='100%' fill='#${bg}'/>
    <text x='50%' y='50%' font-family='Arial, sans-serif' font-size='26' font-weight='bold'
      fill='#${fg}' text-anchor='middle' dominant-baseline='middle'>${safeText}</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

const DEFAULT_VENDOR_INVENTORY = [
  {
    id: "P001",
    name: "Sona Masoori Rice",
    sku: "RICE-001",
    stock: 0,
    price: 59.99,
    category: "Rice & Ravva",
    vendorName: "Lakshmi Mart",
    image: makePlaceholderImage("Rice", "ffbe0b", "000000"),
  },
  {
    id: "P002",
    name: "Sunflower Oil",
    sku: "OIL-002",
    stock: 0,
    price: 139.0,
    category: "Oils & Dals",
    vendorName: "Lakshmi Mart",
    image: makePlaceholderImage("Oil", "fb5607", "ffffff"),
  },
  {
    id: "P003",
    name: "Surf Excel Detergent",
    sku: "DETERGENT-003",
    stock: 0,
    price: 199.0,
    category: "Bath & Body Care",
    vendorName: "Lakshmi Grocers",
    image: makePlaceholderImage("Detergent", "8338ec", "ffffff"),
  },
  {
    id: "P004",
    name: "Colgate Toothpaste",
    sku: "TOOTHPASTE-004",
    stock: 0,
    price: 69.0,
    category: "Health & Oral Care",
    vendorName: "Lakshmi Grocers",
    image: makePlaceholderImage("Toothpaste", "3a86ff", "ffffff"),
  },
  {
    id: "P005",
    name: "Amul Milk Powder",
    sku: "MILK-005",
    stock: 0,
    price: 299.0,
    category: "Milk, Curd & Ghee",
    vendorName: "AgriMandi",
    image: makePlaceholderImage("Milk", "70d6ff", "000000"),
  },
  {
    id: "P006",
    name: "Lifebuoy Soap",
    sku: "SOAP-006",
    stock: 0,
    price: 25.0,
    category: "Bath & Body Care",
    vendorName: "AgriMandi",
    image: makePlaceholderImage("Soap", "f8961e", "ffffff"),
  },
  {
    id: "P007",
    name: "Aashirvaad Atta",
    sku: "ATTA-007",
    stock: 0,
    price: 62.5,
    category: "Atta & Flours",
    vendorName: "Lakshmi Mart",
    image: makePlaceholderImage("Atta", "8ac926", "000000"),
  },
  {
    id: "P008",
    name: "Red Label Tea",
    sku: "TEA-008",
    stock: 0,
    price: 159.0,
    category: "Tea & Coffee",
    vendorName: "Lakshmi Grocers",
    image: makePlaceholderImage("Tea", "ff006e", "ffffff"),
  },
  {
    id: "P009",
    name: "SatyaStore Juice",
    sku: "JUICE-009",
    stock: 0,
    price: 45.0,
    category: "Drinks & Juices",
    vendorName: "SatyaStores",
    image: makePlaceholderImage("Juice", "00b4d8", "ffffff"),
  },
  {
    id: "P010",
    name: "SatyaStore Wheat Flour",
    sku: "FLOUR-010",
    stock: 0,
    price: 72.0,
    category: "Atta & Flours",
    vendorName: "SatyaStores",
    image: makePlaceholderImage("Flour", "90be6d", "000000"),
  },
];

const safeParse = (raw, fallback) => {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return fallback;
  } catch {
    return fallback;
  }
};

export const getVendorProfiles = () => {
  const raw = localStorage.getItem(VENDOR_PROFILES_KEY);
  return safeParse(raw, []);
};

export const saveVendorProfiles = (profiles) => {
  localStorage.setItem(VENDOR_PROFILES_KEY, JSON.stringify(profiles));
};

export const registerVendor = ({ name, userName, phone, password }) => {
  const profiles = getVendorProfiles();
  const existing = profiles.find((profile) => profile.userName === userName);
  if (existing) {
    throw new Error("A vendor with this username already exists.");
  }

  const vendorId = `vendor-${Date.now()}`;
  const profile = {
    vendorId,
    name,
    userName,
    phone,
    password,
    createdAt: new Date().toISOString(),
  };

  profiles.push(profile);
  saveVendorProfiles(profiles);
  return profile;
};

export const findVendorByCredentials = (userName, password) => {
  const profiles = getVendorProfiles();
  return (
    profiles.find(
      (profile) =>
        profile.userName === userName && profile.password === password,
    ) || null
  );
};

export const getVendorProfileById = (vendorId) => {
  const profiles = getVendorProfiles();
  return profiles.find((profile) => profile.vendorId === vendorId) || null;
};

// Merges an edit into the locally-stored profile for this vendor (there's
// no backend "update vendor" endpoint wired up yet — VendorRegistration
// only exposes create/lookup — so edits made from the vendor's own stock
// page are saved the same way the rest of this profile already is).
export const updateVendorProfile = (vendorId, updates) => {
  const profiles = getVendorProfiles();
  const index = profiles.findIndex((profile) => profile.vendorId === vendorId);
  if (index === -1) return null;
  const updated = { ...profiles[index], ...updates };
  profiles[index] = updated;
  saveVendorProfiles(profiles);
  return updated;
};

// Calls the real backend to authenticate a vendor by username + password.
// The endpoint returns an array: either [{ ...vendor }] on a match, or an
// empty array when there's no match. This function returns the vendor
// record only when its userName/password actually match what was typed;
// otherwise it returns null so the caller knows not to navigate.
export const loginVendorViaApi = async (userName, password) => {
  try {
    const url =
      `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/VendorRegistration/GetVendorDetailsByUserNameAndPassword` +
      `?userName=${encodeURIComponent(userName)}` +
      `&password=${encodeURIComponent(password)}`;

    console.log("Calling Login API:", url);

    const response = await fetch(url);

    console.log("API Status:", response.status);

    if (!response.ok) {
      throw new Error(`Login request failed with status ${response.status}`);
    }

    const data = await response.json();

    console.log("Complete API Response:", data);

    // API returned empty array => invalid credentials
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    // API already verified the credentials.
    // Get the vendor returned by the API.
    const vendor = data[0];

    console.log("Vendor returned from API:", vendor);
    console.log("VendorId returned from API:", vendor.vendorId);

    return vendor;
  } catch (error) {
    console.error("Vendor API Login Error:", error);
    throw error;
  }
};

export const getVendorInventory = () => {
  const raw = localStorage.getItem(VENDOR_INVENTORY_KEY);
  if (!raw) {
    return DEFAULT_VENDOR_INVENTORY;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_VENDOR_INVENTORY;
    }
    return parsed;
  } catch {
    return DEFAULT_VENDOR_INVENTORY;
  }
};

export const saveVendorInventory = (inventory) => {
  localStorage.setItem(VENDOR_INVENTORY_KEY, JSON.stringify(inventory));
};

export const exportVendorInventory = (inventory) => {
  const blob = new Blob([JSON.stringify(inventory, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  saveAs(blob, "vendor_inventory.json");
};

export const getVendorIcon = (vendorName) => {
  if (!vendorName) return "V";
  return vendorName
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

export const getUniqueVendors = (inventory) => {
  const vendors = new Set(
    inventory.map((item) => item.vendorName || "Unknown"),
  );
  return Array.from(vendors).sort();
};
