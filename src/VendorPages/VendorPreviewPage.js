import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import StorefrontIcon from "@mui/icons-material/Storefront";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import { playNotificationSound } from "../CommonPages/notificationSound";
import { getGroceryItems } from "../utils/groceryStore";
import {
  getVendorProductsByVendorId,
  invalidateVendorProductsCache,
} from "../utils/vendorListStore";

const API_BASE =
  "https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/VendorUploadProducts";

const VENDOR_UPLOAD_PRODUCTS_API = `${API_BASE}/vendorUploadProducts`;

const GET_VENDOR_PRODUCTS_VALUES_API = `${API_BASE}/GetVendorProductsvalues`;

const VENDOR_UPDATE_PRODUCTS_API = `${API_BASE}/UpdateVendorProductsValues`;

// Master-data endpoints for the State -> District -> Pincode cascade used
// to pick which pincodes this vendor's submission should serve.
const MASTER_DATA_API_BASE =
  "https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/MasterData";
const GET_STATES_API = `${MASTER_DATA_API_BASE}/getStates`;
const GET_DISTRICTS_API = `${MASTER_DATA_API_BASE}/getDistricts`;
const GET_PINCODES_API = `${MASTER_DATA_API_BASE}/getPincodes`;

// Category display-order key: an array of category names, in the order
// the vendor has arranged them via the up/down arrows on this page. Kept
// separate from pendingCartKey so quantity/discount edits on the Stock
// Update page (which rewrite that key wholesale) never clobber the
// vendor's arrangement — this page reconciles the two on every load.
//
// NOTE: VendorStockUpdatePage now also writes to this exact key, in the
// order categories are first SELECTED there — so the initial arrangement
// a vendor sees here already reflects the order they checked things in,
// before they've touched the arrows on this page at all.
const categoryOrderKey = (vendorId) => `vendorCategoryOrder_${vendorId}`;

// Same key VendorStockUpdatePage writes to when a vendor checks a product
// and sets its discount — this page reads that local "cart" back for a
// final look before the real submission.
const pendingCartKey = (vendorId) => `vendorPendingProducts_${vendorId}`;

// Orders bell on this page polls the same endpoint VendorOrdersPage reads
// from. NOTE: this is the QA host, not the "localhost:7091" base used
// elsewhere in this file — see VendorOrdersPage.js for why.
const ORDERS_API_BASE =
  "https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api";
const GET_VENDOR_ORDERS = `${ORDERS_API_BASE}/Mart/GetVendorOrdersByVendorId`;
const ORDERS_POLL_INTERVAL_MS = 25000;

// ---------------------------------------------------------------------
// Master-data shape helpers — the getStates/getDistricts/getPincodes
// endpoints aren't guaranteed to use the exact same field names, so pull
// out an id/label defensively instead of assuming one casing.
// ---------------------------------------------------------------------
const getStateId = (s) => s?.stateId ?? s?.id ?? s?.StateId ?? s?.Id ?? "";
const getStateName = (s) =>
  s?.stateName ?? s?.name ?? s?.StateName ?? s?.Name ?? "";
const getDistrictId = (d) =>
  d?.districtId ?? d?.id ?? d?.DistrictId ?? d?.Id ?? "";
const getDistrictName = (d) =>
  d?.districtName ?? d?.name ?? d?.DistrictName ?? d?.Name ?? "";
// The pincode list can come back either as an array of plain values
// (e.g. ["530001", "530002"]) or an array of objects (e.g.
// { pincode: "530001", pincodeId: 12 }) — handle both shapes.
const getPincodeId = (p) => {
  if (p === null || p === undefined) return "";
  if (typeof p !== "object") return String(p);
  return p.pincodeId ?? p.id ?? p.PincodeId ?? p.Id ?? "";
};
const getPincodeValue = (p) => {
  if (p === null || p === undefined) return "";
  if (typeof p !== "object") return String(p);
  return (
    p.pincode ?? p.pinCode ?? p.code ?? p.Pincode ?? p.name ?? p.Name ?? ""
  );
};

const VendorPreviewPage = () => {
  const { vendorId } = useParams();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [catalogItems, setCatalogItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [myProducts, setMyProducts] = useState(null);
  const [myProductsLoading, setMyProductsLoading] = useState(true);

  // Order count + "new order just came in" state for the header bell.
  const [orderCount, setOrderCount] = useState(0);
  const [hasNewOrder, setHasNewOrder] = useState(false);
  const knownOrderIdsRef = useRef(null);

  // Locally-saved candidate products (built on the Stock Update page) +
  // which of them are still checked for this final submission.
  const [pendingCart, setPendingCart] = useState(null);
  const [finalSelected, setFinalSelected] = useState({});

  // Vendor-arranged display order of pendingCart's categories — a list of
  // category names, front-to-back. Persisted separately (see
  // categoryOrderKey above) and reconciled against pendingCart's current
  // categories every time either changes: known categories keep their
  // arranged position, brand-new ones are appended at the end, and ones
  // that dropped out of pendingCart (qty back to 0) are dropped here too.
  const [categoryOrder, setCategoryOrder] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const pageRef = useRef(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullScreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullScreenChange);
  }, []);

  // ------------------------------------------------------------
  // State -> District -> Pincode cascade. formData holds the currently
  // selected dropdowns; selectedPincodes is the running set of pincodes
  // (checkbox-checked, can span multiple states/districts visited over
  // time) that gets sent to the server on submit.
  // ------------------------------------------------------------
  const [stateList, setStateList] = useState([]);
  const [districtList, setDistrictList] = useState([]);
  const [pincodeList, setPincodeList] = useState([]);
  const [statesLoading, setStatesLoading] = useState(false);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [pincodesLoading, setPincodesLoading] = useState(false);
  const [formData, setFormData] = useState({ stateId: "", districtId: "" });

  // pincode value (string) -> checked/unchecked. Only checked pincodes are
  // sent to the server when "Submit for approval" is clicked.
  const [selectedPincodes, setSelectedPincodes] = useState({});
  const [pincodesLocked, setPincodesLocked] = useState(false);
  // Seed the checkboxes once from whatever pincodes are already on this
  // vendor's record/pendingCart, so re-opening this page doesn't silently
  // drop previously-chosen pincodes that aren't in the currently-loaded list.
  const seededPincodesRef = useRef(false);
  // Seed the State / District dropdowns once from the vendor's own
  // profile/record, so a vendor who already has a registered state and
  // district sees them pre-selected instead of starting from blank.
  const seededStateRef = useRef(false);
  const seededDistrictRef = useRef(false);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const normalizeText = (value) =>
    String(value ?? "")
      .trim()
      .toLowerCase();

  const matchesQuery = (value) => {
    if (!normalizedQuery) return true;

    return normalizeText(value).includes(normalizedQuery);
  };

  const orderedPendingCategories = useMemo(() => {
    const cats = pendingCart?.categorie || [];
    const byName = new Map(cats.map((cat) => [cat.categoryName, cat]));
    const ordered = categoryOrder
      .map((name) => byName.get(name))
      .filter(Boolean);
    cats.forEach((cat) => {
      if (!categoryOrder.includes(cat.categoryName)) ordered.push(cat);
    });
    return ordered.map((cat, idx) => ({ ...cat, rank: String(idx + 1) }));
  }, [pendingCart, categoryOrder]);

  const statusByProductId = useMemo(() => {
    const map = {};
    (myProducts?.categories || []).forEach((cat) => {
      (cat.products || []).forEach((p) => {
        map[String(p.productId)] = p.status || "Pending";
      });
    });
    return map;
  }, [myProducts]);

  // productId -> the values already on the vendor's server record, used to
  // detect whether a pendingCart entry actually represents a change.
  const existingProductValues = useMemo(() => {
    const map = {};
    (myProducts?.categories || []).forEach((cat) => {
      (cat.products || []).forEach((p) => {
        map[String(p.productId)] = {
          quantity: String(p.qty ?? 0),
          discount: String(p.discount ?? 0),
          limit: String(p.limit ?? 0),
        };
      });
    });
    return map;
  }, [myProducts]);

  // A pendingCart product is worth showing in "ready to submit" only if it's
  // brand new (never on the server record) or at least one field differs
  // from what's already there.
  const isProductModified = (p) => {
    const existing = existingProductValues[String(p.productIds)];
    if (!existing) return true; // never submitted before -> new, show it

    return (
      String(p.quantity ?? 0) !== existing.quantity ||
      String(p.discount ?? 0) !== existing.discount ||
      String(p.limit ?? 0) !== existing.limit
    );
  };

  const readyToSubmitCategories = useMemo(() => {
    return orderedPendingCategories
      .map((cat) => ({
        ...cat,
        products: (cat.products || []).filter(
          (p) =>
            statusByProductId[String(p.productIds)] !== "Approved" &&
            isProductModified(p),
        ),
      }))
      .filter((cat) => cat.products.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderedPendingCategories, statusByProductId, existingProductValues]);

  const productNameById = useMemo(() => {
    const map = {};
    catalogItems.forEach((item) => {
      map[String(item.id)] = item.name;
    });
    return map;
  }, [catalogItems]);

  // ------------------------------------------------------------
  // Get product name from catalog
  // Supports both id/productId formats
  // ------------------------------------------------------------
  const getProductName = (product) => {
    const productId =
      product?.productIds ?? product?.productId ?? product?.id ?? "";

    const catalogProduct = catalogItems.find(
      (item) =>
        String(item.id ?? item.productId ?? item.productIds) ===
        String(productId),
    );

    return (
      product?.name ||
      product?.productName ||
      catalogProduct?.name ||
      catalogProduct?.productName ||
      `Product ${productId}`
    );
  };

  const searchedReadyToSubmitCategories = useMemo(() => {
    if (!normalizedQuery) {
      return readyToSubmitCategories;
    }

    return readyToSubmitCategories
      .map((cat) => {
        const categoryName = cat.categoryName || "";
        const categoryMatches = matchesQuery(categoryName);
        const matchingProducts = (cat.products || []).filter((product) => {
          const productName = getProductName(product);

          const productId = product?.productIds ?? product?.productId ?? "";

          return matchesQuery(productName) || matchesQuery(productId);
        });

        return {
          ...cat,
          products: categoryMatches ? cat.products || [] : matchingProducts,
        };
      })
      .filter((cat) => cat.products && cat.products.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyToSubmitCategories, normalizedQuery, catalogItems]);

  const approvedCategories = useMemo(() => {
    return (myProducts?.categories || [])
      .map((cat) => ({
        ...cat,
        products: (cat.products || []).filter((p) => p.status === "Approved"),
      }))
      .filter((cat) => cat.products.length > 0);
  }, [myProducts]);

  const searchedApprovedCategories = useMemo(() => {
    if (!normalizedQuery) {
      return approvedCategories;
    }

    return approvedCategories
      .map((cat) => {
        const categoryName = cat.category || "";

        const categoryMatches = matchesQuery(categoryName);

        const matchingProducts = (cat.products || []).filter((product) => {
          const productName = getProductName(product);

          const productId = product?.productId ?? product?.productIds ?? "";

          return matchesQuery(productName) || matchesQuery(productId);
        });

        return {
          ...cat,
          products: categoryMatches ? cat.products || [] : matchingProducts,
        };
      })
      .filter((cat) => cat.products && cat.products.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approvedCategories, normalizedQuery, catalogItems]);

  useEffect(() => {
    if (!normalizedQuery) return;
    setExpandedCategories((prev) => {
      const next = { ...prev };
      searchedReadyToSubmitCategories.forEach((cat) => {
        next[cat.categoryName] = true;
      });
      searchedApprovedCategories.forEach((cat) => {
        next[`approved-${cat.category}`] = true;
      });
      return next;
    });
  }, [
    normalizedQuery,
    searchedReadyToSubmitCategories,
    searchedApprovedCategories,
  ]);

  const toggleCategoryExpanded = (categoryName) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryName]: !prev[categoryName],
    }));
  };

  useEffect(() => {
    const sessionId = localStorage.getItem("vendorSession");
    const savedVendor = localStorage.getItem("vendorProfile");

    // No session
    if (!sessionId) {
      navigate("/vendor/login");
      return;
    }

    // Wrong vendor session
    if (sessionId !== vendorId) {
      navigate("/vendor/login");
      return;
    }

    // No saved vendor profile
    if (!savedVendor) {
      navigate("/vendor/login");
      return;
    }

    try {
      const profile = JSON.parse(savedVendor);

      // Make sure saved profile belongs to current vendor
      if (profile.vendorId !== vendorId) {
        navigate("/vendor/login");
        return;
      }

      setVendor(profile);
    } catch (error) {
      console.error("Unable to read vendor profile:", error);
      navigate("/vendor/login");
    }
  }, [vendorId, navigate]);

  // Poll for orders so the header bell can show a live count and flag
  // brand-new orders with a highlight + sound, even while the vendor is
  // just sitting on their profile page.
  useEffect(() => {
    if (!vendor) return;
    let cancelled = false;

    const pollOrders = async () => {
      try {
        const { data } = await axios.get(GET_VENDOR_ORDERS, {
          params: { vendorId },
        });
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setOrderCount(list.length);

        const ids = new Set(list.map((o) => o.id));
        if (knownOrderIdsRef.current) {
          const arrived = [...ids].some(
            (id) => !knownOrderIdsRef.current.has(id),
          );
          if (arrived) {
            setHasNewOrder(true);
            try {
              playNotificationSound();
            } catch {
              // audio playback blocked/unsupported — highlight still shows
            }
          }
        }
        knownOrderIdsRef.current = ids;
      } catch (err) {
        console.error("Failed to poll vendor orders:", err);
      }
    };

    pollOrders();
    const interval = setInterval(pollOrders, ORDERS_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [vendor, vendorId]);

  // Product names/images for display only — the actual selection + discount
  // now happens on the Stock Update page, this is just a lookup table.
  useEffect(() => {
    if (!vendor) return;
    let active = true;
    getGroceryItems()
      .then((data) => {
        if (active) setCatalogItems(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error("Unable to load product catalog:", err));
    return () => {
      active = false;
    };
  }, [vendor]);

  // productId -> status ("Approved" | "Pending" | etc), sourced from the
  // vendor's real server record. Used to keep "Products ready to submit"
  // and "Your submitted products" mutually exclusive by status.

  useEffect(() => {
    if (!vendorId) return;
    let active = true;
    setMyProductsLoading(true);
    // First load for this vendorId hits GetVendorProductsByVendorId,
    // later loads within the cache window are served from vendorListStore.
    getVendorProductsByVendorId(vendorId)
      .then((vendorWithProducts) => {
        if (active) setMyProducts(vendorWithProducts);
      })
      .catch((err) => {
        console.error("Unable to load vendor products:", err);
        if (active) setMyProducts(null);
      })
      .finally(() => active && setMyProductsLoading(false));
    return () => {
      active = false;
    };
  }, [vendorId]);

  useEffect(() => {
    if (!vendorId) return;

    const loadPendingCart = () => {
      try {
        const raw = localStorage.getItem(pendingCartKey(vendorId));
        if (!raw) {
          setPendingCart(null);
          setFinalSelected({});
          return;
        }
        const parsed = JSON.parse(raw);
        setPendingCart(parsed);
        setFinalSelected((prev) => {
          const next = {};
          (parsed.categorie || []).forEach((cat) => {
            (cat.products || []).forEach((p) => {
              const key = `${cat.categoryName}||${p.productIds}`;
              next[key] = key in prev ? prev[key] : true;
            });
          });
          return next;
        });
      } catch (err) {
        console.error("Unable to read pending product selection:", err);
        setPendingCart(null);
        setFinalSelected({});
      }
    };

    loadPendingCart();

    // Same-tab: catches returning to this page (e.g. via bfcache/tab
    // switch) after an Excel import elsewhere without a full remount.
    // Cross-tab: catches the "storage" event fired when another tab
    // (Stock Update open in a second tab) writes to this same key.
    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadPendingCart();
    };
    const handleStorage = (event) => {
      if (!event.key || event.key === pendingCartKey(vendorId)) {
        loadPendingCart();
      }
    };
    window.addEventListener("focus", loadPendingCart);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("focus", loadPendingCart);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("storage", handleStorage);
    };
  }, [vendorId]);

  // Reconcile the vendor's arranged category order against pendingCart's
  // current set of categories, and seed it from localStorage / current
  // category order on first load.
  useEffect(() => {
    if (!vendorId) return;
    const currentNames = (pendingCart?.categorie || []).map(
      (cat) => cat.categoryName,
    );
    setCategoryOrder((prev) => {
      let base = prev;
      if (!prev.length) {
        try {
          const raw = localStorage.getItem(categoryOrderKey(vendorId));
          if (raw) base = JSON.parse(raw);
        } catch {
          // ignore malformed saved order
        }
      }
      const known = base.filter((name) => currentNames.includes(name));
      const appended = currentNames.filter((name) => !known.includes(name));
      const next = [...known, ...appended];
      if (
        next.length === prev.length &&
        next.every((name, idx) => name === prev[idx])
      ) {
        return prev;
      }
      return next;
    });
  }, [vendorId, pendingCart]);

  // ============================================================
  // Load States (once, on mount)
  // ============================================================
  useEffect(() => {
    setStatesLoading(true);

    axios
      .get(GET_STATES_API)
      .then((response) => {
        setStateList(Array.isArray(response.data) ? response.data : []);
      })
      .catch((error) => {
        console.error("Error fetching states:", error);
        setError("Could not load states. Please refresh and try again.");
      })
      .finally(() => {
        setStatesLoading(false);
      });
  }, []);

  // ============================================================
  // Load Districts using State ID
  // ============================================================
  useEffect(() => {
    if (!formData.stateId) {
      setDistrictList([]);
      return;
    }

    setDistrictsLoading(true);
    setDistrictList([]);

    axios
      .get(`${GET_DISTRICTS_API}/${formData.stateId}`)
      .then((response) => {
        setDistrictList(Array.isArray(response.data) ? response.data : []);
      })
      .catch((error) => {
        console.error("Error fetching districts:", error);
        setError("Could not load districts. Please try again.");
        setDistrictList([]);
      })
      .finally(() => {
        setDistrictsLoading(false);
      });
  }, [formData.stateId]);

  // ============================================================
  // Load Pincodes using District ID
  // ============================================================
  useEffect(() => {
    if (!formData.districtId) {
      setPincodeList([]);
      setPincodesLoading(false);
      return;
    }

    setPincodesLoading(true);
    setPincodeList([]);

    axios
      .get(`${GET_PINCODES_API}/${formData.districtId}`)
      .then((response) => {
        const raw = Array.isArray(response.data) ? response.data : [];
        // A handful of rows in the master data have no pincode value at
        // all (null/blank) — drop those here instead of rendering an
        // empty, unusable checkbox for each one.
        const withValue = raw.filter(
          (p) => String(getPincodeValue(p) ?? "").trim() !== "",
        );
        if (withValue.length !== raw.length) {
          console.warn(
            `getPincodes returned ${raw.length} rows, ${
              raw.length - withValue.length
            } had no pincode value:`,
            raw,
          );
        }
        setPincodeList(withValue);
      })
      .catch((error) => {
        console.error("Error fetching pincodes:", error);
        setError("Could not load pincodes. Please try again.");
        setPincodeList([]);
      })
      .finally(() => {
        setPincodesLoading(false);
      });
  }, [formData.districtId]);

  // Seed the pincode checkboxes once from whatever's already saved on this
  // vendor's server record (myProducts.pincodes) or the local pendingCart,
  // so previously-picked pincodes stay checked even before their state/
  // district has been re-selected on this page.

useEffect(() => {
  if (myProductsLoading) return;
     if (seededPincodesRef.current) return;

  const existingPincodes = Array.isArray(myProducts?.pincodes)
    ? myProducts.pincodes
    : [];

  const pendingPincodes = Array.isArray(pendingCart?.pincodes)
    ? pendingCart.pincodes
    : [];

  const savedPincodes =
    existingPincodes.length > 0
      ? existingPincodes
      : pendingPincodes;

  if (savedPincodes.length > 0) {
    const selected = {};

    savedPincodes.forEach((pin) => {
      const value = String(
        getPincodeValue(pin)
      ).trim();

      if (value) {
        selected[value] = true;
      }
    });

    setSelectedPincodes(selected);
    setPincodesLocked(true);
  } else {
    setSelectedPincodes({});
    setPincodesLocked(false);
  }

  seededPincodesRef.current = true;
}, [myProductsLoading, myProducts, pendingCart]);

  // ------------------------------------------------------------
  // Auto-select the vendor's own State once both the vendor profile and
  // the states list are available. Same idea as everywhere else this
  // page reads "vendor details" (vendor.storeName, vendor.email, etc. in
  // the header card below): read it straight off the `vendor` object
  // that was loaded from localStorage's "vendorProfile" / the vendor's
  // server record. We try a direct id first (vendor.stateId), and fall
  // back to matching a stored state *name* (vendor.state / vendor.stateName)
  // against the loaded stateList, in case the vendor record only stores
  // the name rather than the master-data id.
  // ------------------------------------------------------------
  useEffect(() => {
    if (seededStateRef.current) return;
    if (!vendor || stateList.length === 0) return;

    const directId = vendor.stateId ?? vendor.StateId ?? "";
    let stateId = directId ? String(directId) : "";

    if (!stateId) {
      const vendorStateName = vendor.state ?? vendor.stateName ?? "";
      if (vendorStateName) {
        const match = stateList.find(
          (s) =>
            normalizeText(getStateName(s)) === normalizeText(vendorStateName),
        );
        if (match) stateId = String(getStateId(match));
      }
    }

    if (stateId) {
      setFormData((prev) => ({ ...prev, stateId }));
    }
    seededStateRef.current = true;
  }, [vendor, stateList]);

  // Auto-select the vendor's own District, once the districtList for the
  // (auto-selected, above) state has loaded. Same direct-id-then-name-match
  // approach as the state seeding above.
  useEffect(() => {
    if (seededDistrictRef.current) return;
    if (!vendor || districtList.length === 0) return;

    const directId = vendor.districtId ?? vendor.DistrictId ?? "";
    let districtId = directId ? String(directId) : "";

    if (!districtId) {
      const vendorDistrictName = vendor.district ?? vendor.districtName ?? "";
      if (vendorDistrictName) {
        const match = districtList.find(
          (d) =>
            normalizeText(getDistrictName(d)) ===
            normalizeText(vendorDistrictName),
        );
        if (match) districtId = String(getDistrictId(match));
      }
    }

    if (districtId) {
      setFormData((prev) => ({ ...prev, districtId }));
    }
    seededDistrictRef.current = true;
  }, [vendor, districtList]);

   const togglePincode = (pincodeValue) => {
  // Saved pincodes cannot be modified.
  if (pincodesLocked) {
    return;
  }

  const key = String(pincodeValue).trim();

  setSelectedPincodes((prev) => ({
    ...prev,
    [key]: !prev[key],
  }));
};

 const selectedPincodeValues = useMemo(
  () =>
    Object.keys(selectedPincodes).filter(
      (key) => selectedPincodes[key],
    ),
  [selectedPincodes],
);


const visiblePincodeList = useMemo(() => {
  if (!pincodesLocked) {
    return pincodeList;
  }

  const savedPincodes = Array.isArray(myProducts?.pincodes)
    ? myProducts.pincodes
    : [];

  const selectedValues = Object.keys(selectedPincodes)
    .filter((pin) => selectedPincodes[pin]);

  const combined = [
    ...savedPincodes,
    ...selectedValues,
  ];

  const uniquePincodes = [
    ...new Set(
      combined
        .map((pin) => String(getPincodeValue(pin)).trim())
        .filter(Boolean)
    ),
  ];

  return uniquePincodes.map((pin) => {
    const existing = pincodeList.find(
      (p) => String(getPincodeValue(p)).trim() === pin
    );

    return (
      existing || {
        pincodeId: pin,
        pincode: pin,
      }
    );
  });
}, [
  pincodeList,
  selectedPincodes,
  pincodesLocked,
  myProducts,
]);

  const persistCategoryOrder = (order) => {
    try {
      localStorage.setItem(categoryOrderKey(vendorId), JSON.stringify(order));
    } catch {}
  };

  const moveCategory = (index, direction) => {
    setCategoryOrder((prev) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      persistCategoryOrder(next);
      return next;
    });
  };

  const pendingProductCount = useMemo(
    () =>
      readyToSubmitCategories.reduce(
        (sum, cat) => sum + (cat.products?.length || 0),
        0,
      ),
    [readyToSubmitCategories],
  );

  const finalSelectedCount = useMemo(() => {
    let count = 0;
    readyToSubmitCategories.forEach((cat) => {
      (cat.products || []).forEach((p) => {
        if (finalSelected[`${cat.categoryName}||${p.productIds}`]) count++;
      });
    });
    return count;
  }, [readyToSubmitCategories, finalSelected]);

  const selectedStateName = useMemo(() => {
    const match = stateList.find(
      (s) => String(getStateId(s)) === String(formData.stateId),
    );
    return getStateName(match) || vendor?.state || vendor?.stateName || "";
  }, [stateList, formData.stateId, vendor]);

  const selectedDistrictName = useMemo(() => {
    const match = districtList.find(
      (d) => String(getDistrictId(d)) === String(formData.districtId),
    );
    return (
      getDistrictName(match) || vendor?.district || vendor?.districtName || ""
    );
  }, [districtList, formData.districtId, vendor]);

  const toggleFinalSelected = (categoryName, productId) => {
    const key = `${categoryName}||${productId}`;
    setFinalSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!vendor) return null;

  const handleBackToProfile = () => {
    const returnTo = localStorage.getItem("vendorReturnProfile");
    navigate(returnTo || "/");
  };

   const mergeIntoExistingCategorie = (existingVendor, newCategorie) => {
  const existingCats = new Map();
  const order = [];

  // Keep existing products INCLUDING their status
  (existingVendor?.categories || []).forEach((cat) => {
    const categoryName =
      cat.categoryName ??
      cat.category ??
      cat.CategoryName ??
      "";

    const productMap = new Map();

    (cat.products || []).forEach((p) => {
      const productId =
        p.productIds ??
        p.productId ??
        p.ProductIds ??
        "";

      productMap.set(String(productId), {
        quantity: String(p.quantity ?? p.qty ?? p.Quantity ?? 0),
        discount: String(p.discount ?? p.Discount ?? 0),
        limit: String(p.limit ?? p.Limit ?? 0),

        // IMPORTANT: preserve existing status
        status: p.status ?? "Pending",
      });
    });

    existingCats.set(categoryName, productMap);
    order.push(categoryName);
  });

  // Add/update newly submitted products
  newCategorie.forEach((cat) => {
    const categoryName = cat.categoryName;

    let productMap = existingCats.get(categoryName);

    if (!productMap) {
      productMap = new Map();
      existingCats.set(categoryName, productMap);
      order.push(categoryName);
    }

    (cat.products || []).forEach((p) => {
      const productId =
        p.productIds ??
        p.productId ??
        p.ProductIds ??
        "";

      // IMPORTANT:
      // Anything submitted from Vendor Preview is Pending
      productMap.set(String(productId), {
        quantity: String(p.quantity ?? p.Quantity ?? 0),
        discount: String(p.discount ?? p.Discount ?? 0),
        limit: String(p.limit ?? p.Limit ?? 0),

        status: "Pending",
      });
    });
  });

  const rankOf = (name) => {
    const idx = categoryOrder.indexOf(name);
    return idx === -1 ? Infinity : idx;
  };

  const finalOrder = [...order].sort((a, b) => {
    const diff = rankOf(a) - rankOf(b);

    if (diff !== 0) return diff;

    return order.indexOf(a) - order.indexOf(b);
  });

  return finalOrder.map((categoryName, idx) => ({
    CategoryName: categoryName,
    Rank: String(idx + 1),

    Products: Array.from(
      existingCats.get(categoryName).entries()
    ).map(([productId, v]) => ({
      ProductIds: productId,
      Quantity: v.quantity,
      Discount: v.discount,
      Limit: v.limit,
      Status: v.status,
    })),
  }));
};


  const handleSubmitFinal = async () => {
    if (!pendingCart) return;
    const categorie = readyToSubmitCategories
      .map((cat) => ({
        categoryName: cat.categoryName,
        rank: cat.rank,
        products: (cat.products || [])
          .filter((p) => finalSelected[`${cat.categoryName}||${p.productIds}`])
        .map((p) => ({
          productIds: String(p.productIds ?? ""),
          quantity: String(p.quantity ?? "0"),
          limit: String(p.limit ?? "0"),
          discount: String(p.discount ?? "0"),
        })),
    }))
      .filter((cat) => cat.products.length > 0)
      // Re-number after dropping unselected categories so rank stays a
      // clean 1..N sequence with no gaps.
      .map((cat, idx) => ({ ...cat, rank: String(idx + 1) }));

    if (!categorie.length) {
      setError("Select at least one product before submitting for approval.");
      return;
    }

    if (selectedPincodeValues.length === 0) {
      setError("Select at least one pincode before submitting for approval.");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    // If this vendor already has a record on the server (myProducts.id),
    // update it in place: merge the newly-picked products into its
    // existing categories/products rather than creating a second, separate
    // submission. Only a brand-new vendor with no prior record at all
    // falls through to the create (POST) path below.

    const hasExistingRecord = !!myProducts?.id;

    try {
      let submittedCount = 0;

      
if (hasExistingRecord) {
  // 1. Get the latest vendor record from the server
  const getResponse = await axios.get(
    GET_VENDOR_PRODUCTS_VALUES_API,
    {
      params: {
        vendorId: String(vendorId),
      },
    }
  );

  // API returns an array of vendor records
  const vendorRecords = Array.isArray(getResponse.data)
    ? getResponse.data
    : [];

  const existingRecord =
    vendorRecords.find(
      (item) =>
        String(item.vendorId) === String(vendorId)
    ) ||
    vendorRecords.find(
      (item) =>
        String(item.id) === String(myProducts.id)
    );

  if (!existingRecord) {
    throw new Error(
      "Existing vendor record not found in GetVendorProductsvalues API."
    );
  }

  // 2. Merge the updated products with existing categories
  const mergedCategorie = mergeIntoExistingCategorie(
    myProducts,
    categorie
  );

  // 3. Bind image and imageName from GET API response
  const updatePayload = {
    id: existingRecord.id,

    vendorId: String(
      existingRecord.vendorId || vendorId
    ),

    storeName:
      existingRecord.storeName ||
      myProducts.storeName ||
      vendor.storeName ||
      vendor.name ||
      "",

    status:
      existingRecord.status ||
      myProducts.status ||
      "Pending",

    createdDate:
      existingRecord.createdDate ||
      myProducts.createdDate ||
      new Date().toISOString(),

    updatedDate: new Date().toISOString(),

    state:
      existingRecord.state ||
      myProducts.state ||
      selectedStateName ||
      "",

    stateId: String(
      existingRecord.stateId ||
      myProducts.stateId ||
      formData.stateId ||
      ""
    ),

    district:
      existingRecord.district ||
      myProducts.district ||
      selectedDistrictName ||
      "",

    districtId: String(
      existingRecord.districtId ||
      myProducts.districtId ||
      formData.districtId ||
      ""
    ),

    pincodes:
      existingRecord.pincodes ||
      selectedPincodeValues,

    // IMPORTANT: Preserve existing image data
    image: Array.isArray(existingRecord.image)
      ? existingRecord.image
      : [],

    imageName: existingRecord.imageName ?? "",

    // Preserve existing categories and product statuses
    categorie: mergedCategorie.map((cat) => ({
      categoryName: cat.CategoryName,
      rank: String(cat.Rank),

      products: (cat.Products || []).map((p) => ({
        productIds: String(p.ProductIds ?? ""),
        quantity: String(p.Quantity ?? "0"),
        limit: String(p.Limit ?? "0"),
        discount: String(p.Discount ?? "0"),
        status: p.Status ?? "Pending",
      })),
    })),
  };

  console.log(
    "Vendor Update Products PUT Payload:",
    updatePayload
  );

  // 4. Call PUT API
  const updateResponse = await axios.put(
    `${VENDOR_UPDATE_PRODUCTS_API}?id=${encodeURIComponent(
      existingRecord.id
    )}`,
    updatePayload,
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  console.log(
    "Vendor Update Products PUT Response:",
    updateResponse.data
  );

  submittedCount = categorie.reduce(
    (sum, cat) => sum + cat.products.length,
    0
  );
} else {
        const payload = {
          id: pendingCart.id || "",
          vendorId: String(vendorId || ""),
          storeName:
            pendingCart.storeName || vendor.storeName || vendor.name || "",
          status: pendingCart.status || "Pending",
          createdDate: pendingCart.createdDate || new Date().toISOString(),
          updatedDate: new Date().toISOString(),
        image: [],
        imageName: "",
        pincodes: selectedPincodeValues,
          categorie,
          state: selectedStateName,
          stateId: formData.stateId,
          district: selectedDistrictName,
          districtId: formData.districtId,
        };

        console.log(
          "Vendor Upload Products Payload:",
          JSON.stringify(payload, null, 2),
        );

        const response = await axios.post(VENDOR_UPLOAD_PRODUCTS_API, payload, {
          headers: { "Content-Type": "application/json" },
        });

        console.log("Vendor Upload Products Response:", response.data);
        submittedCount = categorie.reduce(
          (sum, cat) => sum + cat.products.length,
          0,
        );
      }

      setMessage(
        `${submittedCount} product${submittedCount === 1 ? "" : "s"} sent to Handyman Admin for approval.`,
      );

      // Clear the local candidate cart now that it's been submitted, and
      // refresh "Your submitted products" so it reflects the new state.
      try {
        localStorage.removeItem(pendingCartKey(vendorId));
      } catch (err) {
        // ignore
      }
      setPendingCart(null);
      setFinalSelected({});

      invalidateVendorProductsCache(vendorId);
      getVendorProductsByVendorId(vendorId, { force: true })
        .then(setMyProducts)
        .catch((err) =>
          console.error("Unable to refresh vendor products:", err),
        );
    } catch (submitError) {
      console.error("Vendor approval submission failed:", submitError);
      console.error("API Error Response:", submitError.response?.data);
      setError(
        submitError.response?.data?.message ||
          "The approval request could not be submitted. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("vendorSession");
    navigate("/vendor/login");
  };

  // Only categories that have at least one Approved product show in
  // "Your submitted products".

  return (
    <div
      ref={pageRef}
      className={isFullScreen ? "container-fluid py-4 pb-5" : "container-xl py-4 pb-5"}
      style={{
        maxWidth: isFullScreen ? "100%" : "1320px",
        backgroundColor: isFullScreen ? "#fff" : undefined,
        minHeight: isFullScreen ? "100vh" : undefined,
        overflowY: isFullScreen ? "auto" : undefined,
      }}
    >
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
      <button
        type="button"
        className="btn btn-outline-secondary btn-sm mb-3 d-inline-flex align-items-center gap-1"
        onClick={handleBackToProfile}
      >
        <ArrowBackIcon fontSize="small" /> Back to Profile
      </button>
      </div>
      <div className="border-4 shadow-sm mb-2 overflow-hidden">
        <div
          className="p-4 d-flex flex-column flex-md-row align-items-md-center gap-3"
          style={{
            background: "linear-gradient(135deg, #10301F, #2F6B4F)",
            color: "white",
          }}
        >
          <div
            className="rounded-circle d-flex align-items-center justify-content-center position-relative"
            style={{
              width: 72,
              height: 72,
              background: "rgba(255,255,255,.16)",
              border: "1px solid rgba(255,255,255,.4)",
              cursor: "pointer",
            }}
            role="button"
            title="View orders"
            onClick={() => {
              setHasNewOrder(false);
              navigate(`/vendor/orders/${vendorId}`);
            }}
          >
            <StorefrontIcon fontSize="large" />
            <span
              className={`d-inline-flex align-items-center justify-content-center rounded-circle bg-white position-absolute${
                hasNewOrder ? " vendor-bell-ring" : ""
              }`}
              style={{
                width: 30,
                height: 30,
                top: -6,
                right: -6,
                color: "#10301F",
                boxShadow: "0 1px 4px rgba(0,0,0,.35)",
              }}
            >
              <NotificationsActiveIcon fontSize="small" />
              {orderCount > 0 && (
                <span
                  className="badge rounded-pill bg-danger position-absolute"
                  style={{ top: -6, right: -6, fontSize: 10 }}
                >
                  {orderCount}
                </span>
              )}
            </span>
          </div>
          <div className="flex-grow-1">
            <p
              className="text-uppercase mb-1 small"
              style={{ letterSpacing: ".08em", opacity: 0.8 }}
            >
              Vendor profile
            </p>
            <h2 className="mb-1">{vendor.storeName || vendor.name}</h2>
            {vendor.storeName && vendor.name && (
              <div className="small mb-1" style={{ opacity: 0.85 }}>
                Owner: {vendor.name}
              </div>
            )}
            <div style={{ opacity: 0.85 }}>
              {vendor.email} &middot; {vendor.phone}
            </div>
            {vendor.address && (
              <div className="small mt-1" style={{ opacity: 0.75 }}>
                {vendor.address}
              </div>
            )}
          </div>
          <div className="d-flex gap-1">
            <button
              className={`btn btn-light position-relative d-inline-flex align-items-center ${
                hasNewOrder ? " vendor-orders-bell-pulse" : ""
              }`}
              onClick={() => {
                setHasNewOrder(false);
                navigate(`/vendor/orders/${vendorId}`);
              }}
            >
              <LocalShippingIcon fontSize="small" /> Orders
              {orderCount > 0 && (
                <span className="badge rounded-pill bg-danger position-absolute top-0 start-100 translate-middle">
                  {orderCount}
                </span>
              )}
            </button>
            <button
              className="btn btn-light d-inline-flex align-items-center gap-1"
              onClick={() => navigate(`/vendor/stock-update/${vendorId}`)}
            >
              <ArrowBackIcon fontSize="small" /> Back to stock
            </button>
             <button
                    className="btn btn-light d-inline-flex align-items-center"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes vendorOrdersPulse {
          0% { box-shadow: 0 0 0 0 rgba(220, 53, 69, .6); }
          70% { box-shadow: 0 0 0 10px rgba(220, 53, 69, 0); }
          100% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0); }
        }
        .vendor-orders-bell-pulse {
          animation: vendorOrdersPulse 1.4s ease-out infinite;
        }
        @keyframes vendorBellRing {
          0%, 100% { transform: rotate(0deg); }
          10% { transform: rotate(-18deg); }
          20% { transform: rotate(16deg); }
          30% { transform: rotate(-14deg); }
          40% { transform: rotate(12deg); }
          50% { transform: rotate(-8deg); }
          60% { transform: rotate(6deg); }
          70%, 100% { transform: rotate(0deg); }
        }
        .vendor-bell-ring {
          animation: vendorBellRing 1s ease-in-out infinite;
          transform-origin: 50% 0%;
        }
           @media (min-width: 992px) {
          .vendor-product-card {
            padding: 1.15rem !important;
            font-size: 1rem;
            min-height: 130px;
          }
          .vendor-product-card .fw-bold {
            font-size: 1.1rem;
          }

          .vendor-products-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
            gap: 1.15rem;
          }
        }
      `}</style>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {/* ---- Service area: State -> District -> Pincode (checkbox) ---- */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-4">
          <h3 className="mb-1">Service area</h3>
          <p className="text-muted small">
            {pincodesLocked
    ? "Your selected pincodes are saved and cannot be changed."
    : "Select the pincodes you want to serve. You can select or unselect multiple pincodes before submitting."}
          </p>

          <div className="row g-1">
            <div className="col-12 col-md-4">
              <div className="d-flex align-items-center gap-1">
                <label className="form-label small fw-bold mb-0 text-nowrap">
                  State:
                </label>
                <div className="form-control-plaintext fw-semibold text-danger">
                  {statesLoading ? "Loading…" : selectedStateName || "—"}
                </div>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div className="d-flex align-items-center gap-1">
                <label className="form-label small fw-bold mb-0 text-nowrap">
                  District:
                </label>
                <div className="form-control-plaintext fw-semibold text-danger">
                  {districtsLoading ? "Loading…" : selectedDistrictName || "—"}
                </div>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label small fw-bold">
                Pincodes selected -- {selectedPincodeValues.length}
                 {pincodesLocked && (
                <span className="text-success ms-2">
                  (Locked)
                </span>
              )}
              </label>
            </div>
          </div>

          <div className="mt-1">
            {!formData.districtId ? (
              <p className="text-muted small mb-0">
                Select a district above to see its pincodes.
              </p>
            ) : pincodesLoading ? (
              <div className="text-center py-3">
                <div className="spinner-border spinner-border-sm text-success" />
                <span className="ms-2 small text-muted">Loading pincodes…</span>
              </div>
            ) : pincodeList.length === 0 ? (
              <p className="text-muted small mb-0">
                No pincodes found for this district.
              </p>
            ) : (
              <div className="row g-2">
                {visiblePincodeList.map((p) => {
                  const value = getPincodeValue(p);
                  const key = String(value);
                  const checked = !!selectedPincodes[key];
                  return (
                    <div
                      className="col-6 col-sm-4 col-md-3"
                      key={getPincodeId(p) || key}
                    >
                      <label
                        className={`border rounded p-2 small d-flex align-items-center gap-2 w-60 ${
                          checked ? "border-success border-2" : ""
                        }`}
                        style={{ cursor: "pointer" }}
                      >
                        <input
                          type="checkbox"
                          className="form-check-input border-dark"
                          checked={checked}
                           disabled={pincodesLocked}
                          onChange={() => togglePincode(value)}
                        />
                        {value}
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---- Products picked on the Stock Update page, awaiting final submission (non-approved only) ---- */}
      <div className="border-0 shadow-sm">
        <div>
          <input
            type="text"
            className="form-control"
            placeholder="Search products or categories…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <h3 className="mb-0">Products ready to submit</h3>
            {pendingProductCount > 0 && (
              <span className="badge bg-success fs-6">
                {finalSelectedCount} of {pendingProductCount} selected
              </span>
            )}
          </div>

          {!pendingCart || pendingProductCount === 0 ? (
            <div className="text-center py-3">
              <p className="text-muted mb-3">
                No products picked yet. Go to Stock Update, check the products
                you want to sell and set a discount for each.
              </p>
              <button
                className="btn btn-outline-success btn-sm"
                onClick={() => navigate(`/vendor/stock-update/${vendorId}`)}
              >
                Go to Stock Update
              </button>
            </div>
          ) : (
            <>
              <p className="text-muted small mb-2">
                Use the arrows to arrange the order these categories appear in
                on your storefront.
              </p>
              {searchedReadyToSubmitCategories.map((cat, index) => {
                const isExpanded = !!expandedCategories[cat.categoryName];
                return (
                  <div key={cat.categoryName} className="mb-3">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <span className="badge bg-secondary">#{cat.rank}</span>
                      <h6
                        className="mb-0"
                        role="button"
                        style={{ cursor: "pointer", userSelect: "none" }}
                        onClick={() => toggleCategoryExpanded(cat.categoryName)}
                      >
                        {cat.categoryName}{" "}
                        <span style={{ fontSize: "0.75em" }}>
                          {isExpanded ? "▲" : "▼"}
                        </span>
                      </h6>
                      <div
                        className="btn-group btn-group-sm ms-auto"
                        role="group"
                      >
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          title="Move up"
                          disabled={index === 0}
                          onClick={() => moveCategory(index, -1)}
                        >
                          &uarr;
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          title="Move down"
                          disabled={
                            index === searchedReadyToSubmitCategories.length - 1
                          }
                          onClick={() => moveCategory(index, 1)}
                        >
                          &darr;
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="vendor-product-grid">
                        {cat.products.map((p) => {
                          const key = `${cat.categoryName}||${p.productIds}`;
                          const checked = !!finalSelected[key];
                          return (
                            <div
                              className="col-12 col-sm-6 col-lg-4 col-xl-8"
                              key={p.productIds}
                            >
                              <label
                                className={`border rounded p-2 small d-flex align-items-start gap-2 w-100 h-100 ${checked ? "border-success border-2" : ""}`}
                                style={{ cursor: "pointer" }}
                              >
                                <input
                                  type="checkbox"
                                  className="form-check-input mt-1"
                                  checked={checked}
                                  onChange={() =>
                                    toggleFinalSelected(
                                      cat.categoryName,
                                      p.productIds,
                                    )
                                  }
                                />
                                <div>
                                  <div className="fw-bold">
                                    {productNameById[p.productIds] ||
                                      `Product ${p.productIds}`}
                                  </div>
                                  <div className="text-muted">
                                    Qty: {p.quantity} &middot; Discount:{" "}
                                    {p.discount}% &middot; Limit: {p.limit ?? 0}
                                  </div>
                                </div>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="d-flex justify-content-end mt-3">
                <button
                  className="btn btn-success px-4"
                  onClick={handleSubmitFinal}
                  disabled={submitting || finalSelectedCount === 0}
                >
                  {submitting
                    ? "Submitting…"
                    : `Submit for approval${finalSelectedCount ? ` (${finalSelectedCount})` : ""}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ---- Vendor's already-submitted products, from the server (Approved only) ---- */}
      <div className="border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <h3 className="mb-3">Your submitted products</h3>
          {myProductsLoading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-success" />
              <p className="mt-2 mb-0">Loading your products…</p>
            </div>
          ) : searchedApprovedCategories.length > 0 ? (
            <>
              <span className="badge mb-3 bg-success">Approved</span>
              {searchedApprovedCategories.map((cat) => {
                const isExpanded =
                  !!expandedCategories[`approved-${cat.category}`];
                return (
                  <div key={cat.category} className="mb-3">
                    <h6
                      className="mb-2"
                      role="button"
                      style={{ cursor: "pointer", userSelect: "none" }}
                      onClick={() =>
                        toggleCategoryExpanded(`approved-${cat.category}`)
                      }
                    >
                      {cat.category}{" "}
                      <span style={{ fontSize: "0.75em" }}>
                        {isExpanded ? "▲" : "▼"}
                      </span>
                    </h6>
                    {isExpanded && (
                      <div className="vendor-products-grid">
                        {cat.products.map((p) => (
                          <div key={p.productId}>
                            <div className="vendor-product-card border rounded p-2 small h-100">
                              <div className="d-flex justify-content-between align-items-start gap-2">
                                <div>
                                  {p.name ||
                                    productNameById[p.productId] ||
                                    `Product ${p.productId}`}
                                </div>
                                <span
                                  className="badge bg-success"
                                  style={{ fontSize: "10px" }}
                                >
                                  Approved
                                </span>
                              </div>      
                              <div>
                                Qty: {p.qty} &middot; Discount: {p.discount}%
                                &middot; Limit: {p.limit}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          ) : (
            <div className="text-center py-3">
              <p className="text-muted mb-0">
                No approved products yet — still pending review.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorPreviewPage;

