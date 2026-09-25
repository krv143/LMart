import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import StorefrontIcon from "@mui/icons-material/Storefront";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import SearchIcon from "@mui/icons-material/Search";
import {
  getVendorProfileById,
  updateVendorProfile,
} from "../utils/vendorStorage";
import { getGroceryItems } from "../utils/groceryStore";

// Same backend the customer-facing Profile page (and Admin grocery pages) use.
const API_BASE = "https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api";
const ADD_GROCERY_ITEM = `${API_BASE}/UploadGrocery/UploadGrocery`;
const IMAGE_UPLOAD = `${API_BASE}/FileUpload/upload?filename=`;
const ADD_CATEGORY = `${API_BASE}/Categorie/UploadCategories`;
const GET_VENDOR_PRODUCTS_BY_VENDOR_ID = `${API_BASE}/VendorUploadProducts/GetVendorProductsvalues`;

const BLOB_BASE_URL =
  "https://lmartfiles.blob.core.windows.net/userattechements";

const getAzureImageUrl = (imageName) => {
  if (!imageName) return "";

  if (
    typeof imageName === "string" &&
    (imageName.startsWith("http://") ||
      imageName.startsWith("https://"))
  ) {
    return imageName;
  }

  const cleanName = String(imageName).replace(/^\/+/, "");

  return `${BLOB_BASE_URL}/${encodeURIComponent(cleanName)}`;
};

const pendingCartKey = (vendorId) => `vendorPendingProducts_${vendorId}`;

const BARCODE_FORMATS = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "code_39",
  "qr_code",
];

const CATEGORY_PALETTE = [
  "#2F6B4F",
  "#C08A2E",
  "#7C6A46",
  "#4C7A8C",
  "#8C5B4C",
  "#6B7C4C",
  "#A24B4B",
  "#3E5C76",
];
const colorForCategory = (name) => {
  const str = String(name || "");
  let hash = 0;
  for (let i = 0; i < str.length; i++)
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return CATEGORY_PALETTE[hash % CATEGORY_PALETTE.length];
};

const makePlaceholder = (text, bg = "adb5bd", fg = "ffffff") => {
  const safeText = String(text || "?").slice(0, 22);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='220'>
    <rect width='100%' height='100%' fill='#${bg}'/>
    <text x='50%' y='50%' font-family='Arial, sans-serif' font-size='26' font-weight='bold'
      fill='#${fg}' text-anchor='middle' dominant-baseline='middle'>${safeText}</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

const normalizeItem = (p) => ({
  ...p,
  stockLeft: Number(p.stockLeft || 0),
  limit: Number(p.limit || 0),
  mrp: Number(p.mrp || 0),
  discount: Number(p.discount || 0),
  afterDiscount: Number(p.afterDiscount || 0),
});

const extractSelectionFromVendorProducts = (vendorProductsRaw) => {
  const map = {};
  const qtyMap = {};
  const limitMap = {};
  const mrpMap = {};
const priceMap = {};
  const vendorProducts = Array.isArray(vendorProductsRaw)
    ? vendorProductsRaw[0]
    : vendorProductsRaw;

  if (!vendorProducts) return { map, qtyMap, limitMap };

  const categories =
    vendorProducts.categorie ||
    vendorProducts.categories ||
    vendorProducts.Categorie ||
    [];

  categories.forEach((cat) => {
    const products = cat.products || cat.Products || [];
    products.forEach((p) => {
      const productId = p.productIds ?? p.productId ?? p.ProductIds;
      const qty = p.quantity ?? p.qty ?? p.Quantity;
      const discount = p.discount ?? p.Discount;
      const limit = p.limit ?? p.Limit;
      const mrp = p.mrp ?? p.Mrp;
      const price = p.price ?? p.Price ?? p.afterDiscount ?? p.AfterDiscount;
      if (!productId || !(Number(qty) > 0)) return;
      if (mrp !== undefined) mrpMap[productId] = Number(mrp);
      if (price !== undefined) priceMap[productId] = Number(price);
      map[productId] = { checked: true, discount: String(discount ?? "0") };
      qtyMap[productId] = Number(qty);
      limitMap[productId] = Number(limit ?? 0); 
    });
  });

  return { map, qtyMap, limitMap, mrpMap, priceMap };
};

const fetchVendorProductsDirect = async (vendorId) => {
  const res = await fetch(
    `${GET_VENDOR_PRODUCTS_BY_VENDOR_ID}?vendorId=${encodeURIComponent(vendorId)}`,
  );
  if (res.status === 404) return null; // no submission yet — not an error
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  const data = await res.json();
  return data;
};

const EMPTY_ADD_FORM = {
  name: "",
  category: "",
  newCategory: "",
  code: "",
  mrp: "",
  discount: "",
  units: "",
  deliveryIn: "",
  stockLeft: "",
  limit: "",
};

const VendorStockUpdatePage = () => {
  const { vendorId } = useParams();
  const navigate = useNavigate();

  const [vendor, setVendor] = useState(null);
  const [items, setItems] = useState([]);
  const [imageUrls, setImageUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingLimit, setPendingLimit] = useState({});

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
 // ---- Visual / barcode-photo product finder ----
  // matchIds: null = no image search active, Set = ids to show as matches.
  const [viewModeOverride, setViewModeOverride] = useState(null);
  const [imageSearchMatchIds, setImageSearchMatchIds] = useState(null);
  const [imageSearchBusy, setImageSearchBusy] = useState(false);
  const [imageSearchError, setImageSearchError] = useState("");
  const [imageSearchLabel, setImageSearchLabel] = useState("");
  const photoSearchInputRef = useRef(null);
  const barcodePhotoInputRef = useRef(null);
  const [pendingQty, setPendingQty] = useState({});
  const [showVendorMenu, setShowVendorMenu] = useState(false);

  const [showEditVendorModal, setShowEditVendorModal] = useState(false);
  const [editVendorForm, setEditVendorForm] = useState(null);
  const [editVendorSaving, setEditVendorSaving] = useState(false);
  const [editVendorError, setEditVendorError] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_ADD_FORM);
  const [addPhoto, setAddPhoto] = useState(null);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");
  const [codeMode, setCodeMode] = useState("manual"); 
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanFrameRef = useRef(null);
const [pendingMrp, setPendingMrp] = useState({});     
const [pendingPrice, setPendingPrice] = useState({}); 
const [mrpInputText, setMrpInputText] = useState({});
  const [selection, setSelection] = useState({});
  const hydratedSelectionRef = useRef(false);
  const hydratedBackendRef = useRef(false);
  const [qtyInputText, setQtyInputText] = useState({}); 
const originalValuesRef = useRef({}); 
const addPhotoInputRef = useRef(null);
  const getPendingMrp = (item) =>
  Number(pendingMrp[item.id] ?? item.mrp ?? 0);

    // ---- Add New Category modal state ----
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addCategorySaving, setAddCategorySaving] = useState(false);
  const [addCategoryError, setAddCategoryError] = useState("");
  // Categories created via the popup, before any product uses them yet —
  // merged into the dropdown so they're selectable immediately.
  const [customCategories, setCustomCategories] = useState([]);

const handleMrpInputChange = (itemId, rawValue) => {
  setMrpInputText((prev) => ({
    ...prev,
    [itemId]: rawValue,
  }));

  if (rawValue === "") {
    setPendingMrp((prev) => ({
      ...prev,
      [itemId]: 0,
    }));
    return;
  }

  if (!/^\d*(\.\d{0,2})?$/.test(rawValue)) {
    return;
  }

  const next = Number(rawValue);

  setPendingMrp((prev) => ({
    ...prev,
    [itemId]: next,
  }));
};

const getCalculatedSellingPrice = (item) => {
  const mrp = Number(pendingMrp[item.id] ?? item.mrp ?? 0);
  const discount = Number(
    selection[item.id]?.discount ?? item.discount ?? 0
  );
  if (mrp <= 0) return "";
  const sellingPrice = mrp - (mrp * discount) / 100;
  return Math.round(sellingPrice);
};

const getMrpDisplayValue = (item) => {
  if (mrpInputText[item.id] !== undefined) return mrpInputText[item.id];
  const mrp = getPendingMrp(item);
  return mrp === 0 ? "" : mrp;
};

  // Vendor session check.
  useEffect(() => {
    const sessionId = localStorage.getItem("vendorSession");
    if (!sessionId || sessionId !== vendorId) {
      navigate("/vendor/login");
      return;
    }
    const vendorProfile = getVendorProfileById(vendorId);
    if (!vendorProfile) {
      navigate("/vendor/login");
      return;
    }
    setVendor(vendorProfile);
  }, [vendorId, navigate]);

  const openEditVendorModal = () => {
    if (!vendor) return;
    setEditVendorForm({
      name: vendor.name || "",
      storeName: vendor.storeName || "",
      phone: vendor.phone || "",
      email: vendor.email || "",
      address: vendor.address || "",
    });
    setEditVendorError("");
    setShowEditVendorModal(true);
  };

  const handleEditVendorFieldChange = (field, value) => {
    setEditVendorForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveVendorInfo = (event) => {
    event.preventDefault();
    if (!editVendorForm) return;
    if (!editVendorForm.name.trim() || !editVendorForm.phone.trim()) {
      setEditVendorError("Name and phone are required.");
      return;
    }
    setEditVendorSaving(true);
    setEditVendorError("");
    try {
      const updated = updateVendorProfile(vendorId, {
        name: editVendorForm.name.trim(),
        storeName: editVendorForm.storeName.trim(),
        phone: editVendorForm.phone.trim(),
        email: editVendorForm.email.trim(),
        address: editVendorForm.address.trim(),
      });
      if (updated) {
        setVendor(updated);
        setShowEditVendorModal(false);
        setMessage("Vendor information updated.");
        setTimeout(() => setMessage(""), 3000);
      } else {
        setEditVendorError("Unable to save changes. Please try again.");
      }
    } catch (err) {
      console.error("Failed to update vendor info", err);
      setEditVendorError("Unable to save changes. Please try again.");
    } finally {
      setEditVendorSaving(false);
    }
  };

  const fetchItems = async (showLoader = false, force = false) => {
    if (showLoader) setLoading(true);
    setError("");
    try {
       const data = await getGroceryItems({ force });
      const normalized = (Array.isArray(data) ? data : []).map(normalizeItem);
      setItems(normalized);
       } catch (err) {
      console.error("Failed to fetch grocery items", err);
      setError("Unable to load products right now. Please try again.");
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    if (!vendor) return;
    fetchItems(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendor]);

  // ---- Hydrate from the backend's already-submitted record (if any) ----
  useEffect(() => {
    if (!vendor || hydratedBackendRef.current) return;
    hydratedBackendRef.current = true;
    (async () => {
      try {
        const vendorProducts = await fetchVendorProductsDirect(vendorId);

        console.log(
          "RAW response from GetVendorProductsvalues:",
          JSON.stringify(vendorProducts, null, 2),
        );

        const { map, qtyMap, limitMap, mrpMap, priceMap } =
          extractSelectionFromVendorProducts(vendorProducts);
         const baseline = {};
      Object.keys(map).forEach((productId) => {
        baseline[productId] = {
          quantity: String(qtyMap[productId] ?? 0),
          discount: String(map[productId]?.discount ?? "0"),
          limit: String(limitMap[productId] ?? 0),
          mrp: String(mrpMap[productId] ?? ""),
          price: String(priceMap[productId] ?? ""),
        };
      });
      originalValuesRef.current = baseline;

        if (Object.keys(map).length)
          setSelection((prev) => ({ ...map, ...prev }));
        if (Object.keys(qtyMap).length)
          setPendingQty((prev) => ({ ...qtyMap, ...prev }));
        if (Object.keys(limitMap).length)
          setPendingLimit((prev) => ({ ...limitMap, ...prev }));
        if (Object.keys(mrpMap).length) setPendingMrp((prev) => ({ ...mrpMap, ...prev }));
        if (Object.keys(priceMap).length) setPendingPrice((prev) => ({ ...priceMap, ...prev }));
      } catch (err) {
         console.error(
          "Failed to load vendor's existing submitted products",
          err,
        );
      }
    })();
  }, [vendor, vendorId]);

const isProductUpdated = (item) => {
  const baseline = originalValuesRef.current[item.id];

  const current = {
    quantity: String(pendingQty[item.id] || 0),
    discount: String(selection[item.id]?.discount ?? item.discount ?? 0),
    limit: String(pendingLimit[item.id] ?? item.limit ?? 0),
    mrp: String(pendingMrp[item.id] ?? item.mrp ?? 0),
    price: String(pendingPrice[item.id] ?? item.afterDiscount ?? item.mrp ?? 0),
  };

  if (!baseline) return true; 

  return (
    current.quantity !== baseline.quantity ||
    current.discount !== baseline.discount ||
    current.limit !== baseline.limit ||
    current.mrp !== baseline.mrp ||
    current.price !== baseline.price
  );
};

  useEffect(() => {
    if (hydratedSelectionRef.current || !items.length) return;
    hydratedSelectionRef.current = true;
    try {
      const raw = localStorage.getItem(pendingCartKey(vendorId));
      if (!raw) return;
      const saved = JSON.parse(raw);
      const map = {};
      const qtyMap = {};
      const limitMap = {};
      const mrpMap = {};
      const priceMap = {};
      (saved.categorie || []).forEach((cat) => {
        (cat.products || []).forEach((p) => {
          if (p?.productIds) {
            map[p.productIds] = {
              checked: true,
              discount: String(p.discount ?? "0"),
            };
            qtyMap[p.productIds] = Number(p.quantity || 0);
            limitMap[p.productIds] = Number(p.limit ?? 0);
            if (p.mrp !== undefined) mrpMap[p.productIds] = Number(p.mrp);     
          if (p.price !== undefined) priceMap[p.productIds] = Number(p.price);
          }
        });
      });
      if (Object.keys(map).length)
        setSelection((prev) => ({ ...prev, ...map }));
      if (Object.keys(qtyMap).length)
        setPendingQty((prev) => ({ ...prev, ...qtyMap }));
      if (Object.keys(limitMap).length)
        setPendingLimit((prev) => ({ ...prev, ...limitMap }));
      if (Object.keys(mrpMap).length) setPendingMrp((prev) => ({ ...mrpMap, ...prev }));
if (Object.keys(priceMap).length) setPendingPrice((prev) => ({ ...priceMap, ...prev }));
    } catch (err) {
      // ignore malformed/old local cart
    }
  }, [items, vendorId]);

  useEffect(() => {
  if (!vendor) return;
  const selectedItems = items.filter(
    (it) => !!selection[it.id]?.checked && isProductUpdated(it),    
  );
  const categorieMap = {};
  selectedItems.forEach((item) => {
    const categoryName = item.category || "Unspecified";
    if (!categorieMap[categoryName]) categorieMap[categoryName] = [];
    categorieMap[categoryName].push({
      productIds: String(item.id || ""),
      quantity: String(pendingQty[item.id] || 0),
      discount: String(selection[item.id]?.discount ?? item.discount ?? 0),
      limit: String(pendingLimit[item.id] ?? item.limit ?? 0),
      mrp: String(pendingMrp[item.id] ?? item.mrp ?? 0),
      price: String(pendingPrice[item.id] ?? item.afterDiscount ?? item.mrp ?? 0),
    });
  });
  const payload = {
    id: "",
    vendorId: String(vendorId || ""),
    storeName: vendor.storeName || vendor.name || "",
    status: "Pending",
    createdDate: new Date().toISOString(),
    updatedDate: new Date().toISOString(),
    pincodes: Array.isArray(vendor.pincodes) ? vendor.pincodes : [],
    categorie: Object.keys(categorieMap).map((categoryName) => ({
      categoryName,
      products: categorieMap[categoryName],
    })),
  };
  try {
    localStorage.setItem(pendingCartKey(vendorId), JSON.stringify(payload));
  } catch (err) {
  }
      // eslint-disable-next-line react-hooks/exhaustive-deps
}, [selection, pendingQty, pendingLimit, pendingMrp, pendingPrice, items, vendor, vendorId]);


  useEffect(() => {
    if (!items.length) return;
    const directImageUrls = {};

    items.forEach((item) => {
      const photo = Array.isArray(item.images)
        ? item.images[0]
        : item.images;

      if (photo) {
        directImageUrls[item.id] = getAzureImageUrl(photo);
      }
    });

    setImageUrls(directImageUrls);
  }, [items]);

  const categories = useMemo(() => {
     const unique = Array.from(
      new Set([
        ...items.map((i) => i.category || "Unspecified"),
        ...customCategories,
      ]),
    ).sort();
    return unique;
  }, [items, customCategories]);

    const mySelectedCount = useMemo(
    () => Object.values(selection).filter((s) => s?.checked).length,
    [selection],
  );

  // Default view: "selected" (My Products) once the vendor already has
  // approved/submitted products, so returning vendors aren't re-shown the
  // entire master catalog every time. First-time vendors with nothing
  // picked yet default to "all" so they have something to choose from.
  // A manual toggle click (viewModeOverride) always wins.
  const effectiveViewMode =
    viewModeOverride || (mySelectedCount > 0 ? "selected" : "all");

  // A photo/barcode-photo match takes priority: it searches the ENTIRE
  // catalog regardless of category or the My Products/All Products toggle,
  // since the vendor is trying to locate one specific item.

  const displayedItems = useMemo(() => {
    if (!selectedCategory) return [];
      if (imageSearchMatchIds) {
      return items.filter((i) => imageSearchMatchIds.has(i.id));
    }

    let list =
      selectedCategory === "All"
        ? items
        : items.filter(
            (i) => (i.category || "Unspecified") === selectedCategory,
          );
           if (effectiveViewMode === "selected") {
      list = list.filter((i) => !!selection[i.id]?.checked);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((i) => i.name?.toLowerCase().includes(q)||
          i.code?.toLowerCase?.().includes(q),
      );
    }
    return list;
  
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    items,
    selectedCategory,
    searchQuery,
    effectiveViewMode,
    selection,
    imageSearchMatchIds,
  ]);

  // Counts scoped to whichever category (or "All") is currently open, used
  // to label the My Products / All Products toggle pills.
  const categoryScopedItems = useMemo(() => {
    if (!selectedCategory) return [];
    return selectedCategory === "All"
      ? items
      : items.filter((i) => (i.category || "Unspecified") === selectedCategory);
  }, [items, selectedCategory]);
  const categoryMineCount = useMemo(
    () => categoryScopedItems.filter((i) => !!selection[i.id]?.checked).length,
    [categoryScopedItems, selection],
  );

  const totalProducts = items.length;
  const totalStock = items.reduce(
    (sum, item) => sum + Number(item.stockLeft || 0),
    0,
  );
  const dirtyIds = useMemo(
    () => Object.keys(pendingQty).filter((id) => Number(pendingQty[id]) > 0),
    [pendingQty],
  );

  const getCategoryImage = (category) => {
    if (category === "All") return makePlaceholder("All", "6c757d", "ffffff");
    const match = items.find(
      (i) => (i.category || "Unspecified") === category && imageUrls[i.id],
    );
    return match
      ? imageUrls[match.id]
      : makePlaceholder(category, "adb5bd", "ffffff");
  };

  const getProductImage = (item) =>
    imageUrls[item.id] || makePlaceholder(item.name, "adb5bd", "ffffff");

  const getPendingQty = (itemId) => Number(pendingQty[itemId] || 0);

  const isSelectedForSubmission = (itemId) => !!selection[itemId]?.checked;
  const getSelectionDiscount = (item) =>
    selection[item.id]?.discount ?? String(item.discount ?? 0);

  const getPendingLimit = (item) =>
    Number(pendingLimit[item.id] ?? item.limit ?? 0);

 const getProductValidationError = (item) => {
  if (!isSelectedForSubmission(item.id)) {
    return "";
  }

  const quantityText =
    qtyInputText[item.id] !== undefined
      ? qtyInputText[item.id]
      : pendingQty[item.id];

  const mrpText =
    mrpInputText[item.id] !== undefined
      ? mrpInputText[item.id]
      : pendingMrp[item.id] ?? item.mrp;

  const discountText =
    selection[item.id]?.discount ?? item.discount ?? "";

  // Quantity
  if (
    quantityText === "" ||
    quantityText === undefined ||
    Number(quantityText) <= 0 ||
    !Number.isFinite(Number(quantityText))
  ) {
    return "Quantity is required and must be greater than 0.";
  }

  // MRP
  if (
    mrpText === "" ||
    mrpText === undefined ||
    Number(mrpText) <= 0 ||
    !Number.isFinite(Number(mrpText))
  ) {
    return "MRP is required and must be greater than 0.";
  }

  // Discount
  if (
    discountText === "" ||
    discountText === undefined
  ) {
    return "Discount is required. Enter 0% if there is no discount.";
  }

  const discount = Number(discountText);

  if (!Number.isFinite(discount)) {
    return "Please enter a valid discount.";
  }

  if (discount < 0 || discount > 95) {
    return "Discount must be between 0% and 95%.";
  }

  return "";
};


const validateSelectedProducts = () => {
  const selectedItems = items.filter(
    (item) => selection[item.id]?.checked
  );

  if (selectedItems.length === 0) {
    return "Please select at least one product.";
  }

  for (const item of selectedItems) {
    const quantityRaw =
      qtyInputText[item.id] !== undefined
        ? qtyInputText[item.id]
        : pendingQty[item.id];
    const mrp = Number(pendingMrp[item.id] ?? item.mrp ?? 0);
    const discount = Number(
      selection[item.id]?.discount ?? item.discount ?? 0
    );

    if (
      quantityRaw === "" ||
      quantityRaw === undefined ||
      quantityRaw === null ||
      !Number.isFinite(Number(quantityRaw)) ||
      Number(quantityRaw) < 0
    ) {
      return `"${item.name}" needs a quantity (0 or more).`;
    }

    if (!Number.isFinite(mrp) || mrp <= 0) {
      return `"${item.name}" requires a valid MRP greater than 0.`;
    }

    if (!Number.isFinite(discount) || discount < 0 || discount > 95) {
      return `"${item.name}" discount must be between 0% and 95%.`;
    }
  }
  return null;
};               

const toggleSelectForSubmission = (item) => {
  const currentlyChecked = !!selection[item.id]?.checked;

  if (currentlyChecked) {
  setSelection((prev) => {
    const next = { ...prev };
    delete next[item.id];
    return next;
  });
  setPendingQty((prev) => ({ ...prev, [item.id]: 0 }));
  setQtyInputText((prev) => {
    const next = { ...prev };
    delete next[item.id];
    return next;
  });
} else {
    setSelection((prev) => ({
      ...prev,
      [item.id]: {
        checked: true,
        discount: prev[item.id]?.discount ?? String(item.discount ?? 0),
      },
    }));
  }
};

  const getCategoryItems = (category) => {
    return items.filter(
      (item) => (item.category || "Unspecified") === category,
    );
  };

 const isCategorySelected = (category) => {
  const categoryItems = getCategoryItems(category);
  if (categoryItems.length === 0) return false;
  return categoryItems.every((item) => !!selection[item.id]?.checked);
};

const toggleCategorySelection = (category) => {
  const categoryItems = getCategoryItems(category);
  const shouldSelect = !isCategorySelected(category);

  setSelection((prevSelection) => {
    const nextSelection = { ...prevSelection };
    categoryItems.forEach((item) => {
      if (shouldSelect) {
        nextSelection[item.id] = {
          checked: true,
          discount: String(
            prevSelection[item.id]?.discount ?? item.discount ?? 0,
          ),
        };
      } else {
        delete nextSelection[item.id];
      }
    });
    return nextSelection;
  });

  if (!shouldSelect) {
    // Unselecting the category also resets those items' restock qty to 0.
    setPendingQty((prevQty) => {
      const nextQty = { ...prevQty };
      categoryItems.forEach((item) => {
        nextQty[item.id] = 0;
      });
      return nextQty;
    });
  }
  // Selecting the category leaves quantities as-is (default 0).
};

  // ---- Direct-typing handlers for the plain number inputs ----
  const handleQtyInputChange = (itemId, rawValue, item) => {
  // Keep exactly what the user types
  setQtyInputText((prev) => ({
    ...prev,
    [itemId]: rawValue,
  }));

  if (rawValue === "") {
    setPendingQty((prev) => ({
      ...prev,
      [itemId]: 0,
    }));
    return;
  }

  // Quantity should be whole numbers
  if (!/^\d*$/.test(rawValue)) {
    return;
  }

  const next = Number(rawValue);

  setPendingQty((prev) => ({
    ...prev,
    [itemId]: next,
  }));

  setSelection((prevSel) => {
    if (next > 0) {
      const current = prevSel[itemId];

      return {
        ...prevSel,
        [itemId]: {
          checked: true,
          discount:
            current?.discount ??
            String(item?.discount ?? ""),
        },
      };
    }

     if (!prevSel[itemId]) return prevSel;
    const nextSel = { ...prevSel };
    delete nextSel[itemId];
    return nextSel;
  });
};
const getQtyDisplayValue = (itemId) => {
  // If the user has typed something (even "0"), show exactly that.
  if (qtyInputText[itemId] !== undefined) return qtyInputText[itemId];
  // Otherwise fall back to the numeric state (blank if 0/untouched).
  const qty = getPendingQty(itemId);
  return qty === 0 ? "" : qty;
};

  const handleLimitInputChange = (itemId, rawValue, item) => {
    const liveStock = Number(item.stockLeft || 0);
    const next = Math.max(0, Math.min(Number(rawValue) || 0, liveStock));
    setPendingLimit((prev) => ({ ...prev, [itemId]: next }));
  };


const updateSelectionDiscount = (item, value) => {
  // Allow blank while typing
  if (value === "") {
    setSelection((prev) => ({
      ...prev,
      [item.id]: {
        checked: !!prev[item.id]?.checked,
        discount: "",
      },
    }));
    return;
  }

  // Allow only numbers with up to 2 decimal places
  if (!/^\d*(\.\d{0,2})?$/.test(value)) {
    return;
  }

  const numericValue = Number(value);

  // Don't allow more than 95
  if (numericValue > 95) {
    setSelection((prev) => ({
      ...prev,
      [item.id]: {
        checked: !!prev[item.id]?.checked,
        discount: "95",
      },
    }));
    return;
  }

  setSelection((prev) => ({
    ...prev,
    [item.id]: {
      checked: !!prev[item.id]?.checked,
      discount: value,
    },
  }));
};

const selectedForSubmissionCount = useMemo(
  () => Object.values(selection).filter((s) => s?.checked).length,
  [selection],
);

  const handleRefresh = () => {
    fetchItems(true, true); // explicit user refresh — bypass the shared cache
    setShowVendorMenu(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("vendorSession");
    navigate("/vendor/login");
  };

  const handlePreview = () => {
  const validationError = validateSelectedProducts();

  if (validationError) {
    setError(validationError);

    // Automatically clear the error after 4 seconds
    setTimeout(() => setError(""), 4000);

    return;
  }

  setError("");
  navigate(`/vendor/preview/${vendorId}`);
};

  const handleBackToProfile = () => {
    navigate(`/profilePage/customer/${vendorId}`);
  };

  const handleCategorySelect = (category) => {
    if (category !== "All") {
      const key = `vendorSelectedCategories-${vendorId}`;
      const previous = JSON.parse(localStorage.getItem(key) || "[]");
      if (!previous.includes(category))
        localStorage.setItem(key, JSON.stringify([...previous, category]));
    }
    setSelectedCategory(category);
  };

  const clearImageSearch = () => {
    setImageSearchMatchIds(null);
    setImageSearchError("");
    setImageSearchLabel("");
    if (photoSearchInputRef.current) photoSearchInputRef.current.value = "";
    if (barcodePhotoInputRef.current) barcodePhotoInputRef.current.value = "";
  };

  // Loads a File or an existing data-URI/src string into an <img> element.
  const loadImageElement = (source) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not read image"));
      if (typeof source === "string") {
        img.src = source;
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          img.src = reader.result;
        };
        reader.onerror = () => reject(new Error("Could not read file"));
        reader.readAsDataURL(source);
      }
    });

  // 64-bit difference-hash (dHash): resize to 9x8 grayscale, compare each
  // pixel to its right-hand neighbor. Two visually similar photos (same
  // product packaging, different lighting/angle) end up with hashes that
  // differ in only a handful of bits — good enough to shortlist matches
  // entirely client-side, with no external image-recognition service.
  const computeImageHash = async (source) => {
    const img = await loadImageElement(source);
    const canvas = document.createElement("canvas");
    canvas.width = 9;
    canvas.height = 8;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, 9, 8);
    const { data } = ctx.getImageData(0, 0, 9, 8);
    const gray = [];
    for (let i = 0; i < data.length; i += 4) {
      gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }
    let hash = "";
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        hash += gray[row * 9 + col] > gray[row * 9 + col + 1] ? "1" : "0";
      }
    }
    return hash;
  };

  const hammingDistance = (a, b) => {
    let d = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
    return d;
  };

  const handlePhotoSearchFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    setImageSearchBusy(true);
    setImageSearchError("");
    setImageSearchLabel("");
    try {
      const queryHash = await computeImageHash(file);
      const candidates = items.filter((i) => imageUrls[i.id]);
      if (!candidates.length) {
        setImageSearchError(
          "Product photos are still loading — wait a moment and try again.",
        );
        setImageSearchBusy(false);
        return;
      }
      const scored = [];
      for (const item of candidates) {
        try {
          const h = await computeImageHash(imageUrls[item.id]);
          scored.push({ id: item.id, distance: hammingDistance(queryHash, h) });
        } catch {
          // skip a product whose cached photo can't be read
        }
      }
      scored.sort((a, b) => a.distance - b.distance);
      const CLOSE_ENOUGH = 18; 
      let matches = scored.filter((s) => s.distance <= CLOSE_ENOUGH);
      if (!matches.length) matches = scored.slice(0, 8); 
      setImageSearchMatchIds(new Set(matches.map((m) => m.id)));
      setImageSearchLabel(
        matches.length === 1
          ? "1 product looks like your photo"
          : `${matches.length} products look like your photo`,
      );
    } catch (err) {
      console.error("Photo search failed", err);
      setImageSearchError(
        "Couldn't analyze that photo. Try a clearer, well-lit picture of the product.",
      );
    } finally {
      setImageSearchBusy(false);
    }
  };

  const handleBarcodePhotoFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImageSearchBusy(true);
    setImageSearchError("");
    setImageSearchLabel("");
    try {
      if (!("BarcodeDetector" in window)) {
        setImageSearchError(
          "Reading barcodes from a photo isn't supported in this browser. Try Chrome, or search by name instead.",
        );
        return;
      }
      const bitmap = await createImageBitmap(file);
      // eslint-disable-next-line no-undef
      const detector = new BarcodeDetector({ formats: BARCODE_FORMATS });
      const codes = await detector.detect(bitmap);
      if (!codes.length) {
        setImageSearchError(
          "No barcode found in that photo. Try getting closer, with better lighting.",
        );
        return;
      }
      const value = codes[0].rawValue;
      const matched = items.filter(
        (i) => String(i.code || "").trim() === String(value).trim(),
      );
      if (!matched.length) {
        setImageSearchError(
          `Scanned code "${value}" doesn't match any product in the catalog.`,
        );
        return;
      }
      setImageSearchMatchIds(new Set(matched.map((i) => i.id)));
      setImageSearchLabel(`Matched barcode ${value}`);
    } catch (err) {
      console.error("Barcode photo scan failed", err);
      setImageSearchError(
        "Couldn't read a barcode from that photo. Try again with a clearer shot.",
      );
    } finally {
      setImageSearchBusy(false);
    }
  };

  // ---- Barcode scanning ----
  const stopScan = () => {
    if (scanFrameRef.current) {
      cancelAnimationFrame(scanFrameRef.current);
      scanFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  };

  const startScan = async () => {
    setScanError("");
    if (!("BarcodeDetector" in window)) {
      setScanError(
        "Live barcode scanning isn't supported in this browser. Try Chrome on Android or desktop Chrome, or enter the code manually.",
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);

      // eslint-disable-next-line no-undef
      const detector = new BarcodeDetector({ formats: BARCODE_FORMATS });

      const tick = async () => {
        if (!videoRef.current || !streamRef.current) return;
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const value = barcodes[0].rawValue;
            setAddForm((prev) => ({ ...prev, code: value }));
            stopScan();
            return;
          }
        } catch (e) {
        }
        scanFrameRef.current = requestAnimationFrame(tick);
      };
      scanFrameRef.current = requestAnimationFrame(tick);
    } catch (err) {
      console.error("Camera access failed", err);
      setScanError(
        "Couldn't access the camera. Check permissions, or enter the code manually.",
      );
    }
  };

  useEffect(() => {
    if (!showAddModal || codeMode !== "scan") {
      stopScan();
    }
    return () => stopScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddModal, codeMode]);

  // ---- Add New Product ----
  const openAddModal = () => {
    setAddForm(EMPTY_ADD_FORM);
    setAddPhoto(null);
    setAddError("");
    setCodeMode("manual");
    setShowAddModal(true);
    setShowVendorMenu(false);
  };

  const closeAddModal = () => {
    stopScan();
    setShowAddModal(false);
  };

  const updateAddForm = (field, value) => {
    setAddForm((prev) => ({ ...prev, [field]: value }));
  };

  const getAddProductPrice = () => {
  const mrp = Number(addForm.mrp);
  const discount = Number(addForm.discount);
  if (
    addForm.mrp === "" ||
    addForm.discount === "" ||
    !Number.isFinite(mrp) ||
    !Number.isFinite(discount) ||
    mrp <= 0 ||
    discount < 0 ||
    discount > 95
  ) {
    return "";
  }
  return (mrp - (mrp * discount) / 100).toFixed(0);
};

  const getFileByteArray = (file) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(new Uint8Array(reader.result));
      reader.readAsArrayBuffer(file);
    });

  const uploadAddPhoto = async (file) => {
    try {
      const byteArray = await getFileByteArray(file);
      const formData = new FormData();
      formData.append(
        "file",
        new Blob([byteArray], { type: file.type }),
        file.name,
      );
      formData.append("fileName", file.name);
      const response = await fetch(`${IMAGE_UPLOAD}${file.name}`, {
        method: "POST",
        headers: { Accept: "text/plain" },
        body: formData,
      });
      const responseData = await response.text();
      return responseData || "";
    } catch (err) {
      console.error("Photo upload failed", err);
      return "";
    }
  };

 const validateAddForm = () => {
  const finalCategory =
    addForm.category === "__new__"
      ? addForm.newCategory.trim()
      : addForm.category;

  const mrp = Number(addForm.mrp);
  const discount = Number(addForm.discount);
  const stock = Number(addForm.stockLeft);
  const delivery = Number(addForm.deliveryIn);
  const limit = Number(addForm.limit);

  if (!addForm.name.trim())
    return "Product name is required.";

  if (!finalCategory)
    return "Category is required.";

  if (!addForm.code.trim())
    return "Product code is required.";

  if (!addForm.units.trim())
    return "Units are required.";

  // Image validation
  if (!addPhoto)
    return "Please upload a product image.";

  // MRP validation
  if (
    addForm.mrp === "" ||
    !Number.isFinite(mrp) ||
    mrp <= 0
  ) {
    return "Enter a valid MRP greater than 0.";
  }

  if (
    addForm.discount === "" ||
    !Number.isFinite(discount) ||
    discount < 0 ||
    discount > 100
  ) {
    return "Enter a discount between 0% and 100%.";
  }
  if (
    addForm.stockLeft === "" ||
    !Number.isFinite(stock) ||
    stock < 0
  ) {
    return "Enter a valid starting stock quantity.";
  }
  if (
    addForm.deliveryIn === "" ||
    !Number.isFinite(delivery) ||
    delivery <= 0
  ) {
    return "Enter a valid delivery time.";
  }
  if (
    addForm.limit !== "" &&
    (!Number.isFinite(limit) || limit < 0)
  ) {
    return "Enter a valid per-customer limit.";
  }
  return null;
};

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateAddForm();
    if (validationError) {
      setAddError(validationError);
      return;
    }
    setAddError("");
    setAddSaving(true);
    try {
      let images = [];
      if (addPhoto) {
        const src = await uploadAddPhoto(addPhoto);
        if (src) images = [src];
      }
      const finalCategory =
        addForm.category === "__new__"
          ? addForm.newCategory.trim()
          : addForm.category;
      const mrp = parseFloat(addForm.mrp);
      const discount = parseFloat(addForm.discount || 0);
      const payload = {
        id: "unique-id",
        date: new Date().toISOString(),
        vendorId: String(vendorId || ""),
        GroceryItemId: "string",
        name: addForm.name.trim(),
        category: finalCategory,
        images,
        mrp: mrp.toString(),
        discount: discount.toString(),
        afterDiscount: (mrp - (mrp * discount) / 100).toString(),
        stockLeft: addForm.stockLeft,
        deliveryIn: addForm.deliveryIn,
        status: "Pending Approval",
        requestedBy: vendor?.name || "Vendor",
        Code: addForm.code.trim(),
        Units: addForm.units.trim(),
        ManufactureDate: "",
        ExpireDate: "",
        Limit: addForm.limit ? addForm.limit.toString() : "",
      };
      const response = await fetch(ADD_GROCERY_ITEM, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Add product request failed");

      setMessage(`"${addForm.name}" submitted (pending approval).`);
      setTimeout(() => setMessage(""), 4000);
      setShowAddModal(false);
      fetchItems(true, true); // just mutated the catalog — force past the cache
    } catch (err) {
      console.error("Failed to add product", err);
      setAddError("Unable to add this product right now. Please try again.");
    } finally {
      setAddSaving(false);
    }
  };

   // ---- Add New Category ----

  const openAddCategoryModal = () => {
    setNewCategoryName("");
    setAddCategoryError("");
    setShowAddCategoryModal(true);
  };

  const closeAddCategoryModal = () => {
    if (addCategorySaving) return;
    setShowAddCategoryModal(false);
  };

  const handleAddCategorySubmit = async (e) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setAddCategoryError("Category name is required.");
      return;
    }
    setAddCategoryError("");
    setAddCategorySaving(true);
    try {
      const payload = {
        id: "",
        Images: [],
        CategoryName: trimmed,
        Status: "Pending Approval",
        Date: new Date().toISOString(),
        VendorId: String(vendorId || ""),
      };
      const response = await fetch(ADD_CATEGORY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Add category request failed");

      setCustomCategories((prev) =>
        prev.includes(trimmed) ? prev : [...prev, trimmed],
      );
      // Auto-select the new category on the Add Product form the user was just on.
      setAddForm((prev) => ({ ...prev, category: trimmed }));
      setMessage(`Category "${trimmed}" added.`);
      setTimeout(() => setMessage(""), 3000);
      setShowAddCategoryModal(false);
    } catch (err) {
      console.error("Failed to add category", err);
      setAddCategoryError(
        "Unable to add this category right now. Please try again.",
      );
    } finally {
      setAddCategorySaving(false);
    }
  };

  if (!vendor) {
    return null;
  }

  return (
    <div className="vsu-page" style={{ position: "relative" }}>
      <div className="container py-4">
        {/* Back to Preview */}
        <button
          type="button"
          className="vsu-back-btn mb-3"
          onClick={handlePreview}
        >
          <ArrowBackIcon fontSize="small" /> Back to Preview
        </button>

        {/* Hidden inputs backing the "Search by Photo" / "Scan Barcode Photo"
            buttons in both the category-landing view and the product-list
            view below. */}
        <input
          ref={photoSearchInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="d-none"
          onChange={(e) => {
            setSelectedCategory("All");
            handlePhotoSearchFile(e);
          }}
        />
        <input
          ref={barcodePhotoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="d-none"
          onChange={(e) => {
            setSelectedCategory("All");
            handleBarcodePhotoFile(e);
          }}
        />

        {/* Header */}
        <div className="vsu-header p-4 p-md-5 mb-4">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div className="d-flex align-items-center gap-3">
              <div className="vsu-avatar">
                {vendor.name?.charAt(0)?.toUpperCase() || "V"}
              </div>
              <div>
                <h2 className="vsu-title mb-1" style={{ fontSize: "28px" }}>
                  {vendor.name}
                </h2>
                {vendor.storeName && (
                  <p
                    className="mb-1"
                    style={{ opacity: 0.85, fontSize: "14px" }}
                  >
                    {vendor.storeName}
                  </p>
                )}
                <p className="mb-2" style={{ opacity: 0.85, fontSize: "14px" }}>
                  {vendor.email} · {vendor.phone}
                </p>
                {vendor.address && (
                  <p
                    className="mb-2"
                    style={{ opacity: 0.75, fontSize: "13px" }}
                  >
                    {vendor.address}
                  </p>
                )}
                <div className="d-flex align-items-center flex-wrap gap-2">
                  <span className="vsu-pill">
                    <StorefrontIcon style={{ fontSize: "14px" }} /> Vendor stock
                    manager
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm vsu-btn-gold-outline text-white"
                    style={{ fontSize: "16px" }} 
                    onClick={openAddModal}
                  >
                    <AddIcon fontSize="small" /> Add New Product
                  </button>
                  
                  <button
                    type="button"
                    className="btn btn-sm vsu-btn-gold-outline text-white"
                    style={{ borderColor: "#f1f5b8", fontSize: "16px" }}
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="text-white fw-bold "
              onClick={openEditVendorModal}
            >
              Edit
            </button>
          </div>
        </div>

        {showEditVendorModal && editVendorForm && (
          <div
            className="vsu-modal-backdrop"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 1050,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
            }}
            onClick={() => !editVendorSaving && setShowEditVendorModal(false)}
          >
            <div
              className="bg-white rounded-4 shadow-lg p-4"
              style={{ width: "100%", maxWidth: "480px" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Edit vendor information</h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setShowEditVendorModal(false)}
                  disabled={editVendorSaving}
                />
              </div>

              <form onSubmit={handleSaveVendorInfo}>
                <div className="mb-3">
                  <label className="form-label">Owner name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editVendorForm.name}
                    onChange={(e) =>
                      handleEditVendorFieldChange("name", e.target.value)
                    }
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Store name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editVendorForm.storeName}
                    onChange={(e) =>
                      handleEditVendorFieldChange("storeName", e.target.value)
                    }
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Phone</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={editVendorForm.phone}
                    onChange={(e) =>
                      handleEditVendorFieldChange("phone", e.target.value)
                    }
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={editVendorForm.email}
                    onChange={(e) =>
                      handleEditVendorFieldChange("email", e.target.value)
                    }
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Address</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={editVendorForm.address}
                    onChange={(e) =>
                      handleEditVendorFieldChange("address", e.target.value)
                    }
                  />
                </div>

                {editVendorError && (
                  <div className="alert alert-danger py-2">
                    {editVendorError}
                  </div>
                )}

                <div className="d-flex gap-2 justify-content-end">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowEditVendorModal(false)}
                    disabled={editVendorSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn vsu-btn-primary"
                    disabled={editVendorSaving}
                  >
                    {editVendorSaving ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-md-4">
            <div className="vsu-stat-card">
              <div
                className="vsu-stat-icon"
                style={{
                  background: "linear-gradient(135deg,#1B4332,#2F6B4F)",
                }}
              >
                <Inventory2Icon fontSize="small" />
              </div>
              <div>
                <div className="vsu-stat-value">{totalProducts}</div>
                <div className="vsu-stat-label">Total products</div>
              </div>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="vsu-stat-card">
              <div
                className="vsu-stat-icon"
                style={{
                  background: "linear-gradient(135deg,#3E5C76,#4C7A8C)",
                }}
              >
                <LocalShippingIcon fontSize="small" />
              </div>
              <div>
                <div className="vsu-stat-value">{totalStock}</div>
                <div className="vsu-stat-label">Total live stock</div>
              </div>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="vsu-stat-card">
              <div
                className="vsu-stat-icon"
                style={{
                  background: "linear-gradient(135deg,#C08A2E,#E0AE52)",
                }}
              >
                <PendingActionsIcon fontSize="small" />
              </div>
              <div>
                <div className="vsu-stat-value">{dirtyIds.length}</div>
                <div className="vsu-stat-label">Pending restock entries</div>
              </div>
            </div>
          </div>
        </div>

        {message && (
          <div className="alert alert-success rounded-4 border-0 shadow-sm">
            {message}
          </div>
        )}
        {error && (
          <div className="alert alert-danger rounded-4 border-0 shadow-sm">
            {error}
          </div>
        )}

        {/* ---- Categories-only landing view ---- */}
        {!selectedCategory ? (
          <div className="mb-4">
            <h3 className="vsu-section-heading mb-1">Choose a category</h3>
            <p className="text-muted mb-3">
               Select a category to view and restock its products, or find one
              instantly below.
            </p>
            
              <div className="vsu-finder mb-4">
              <div className="vsu-finder-row">
                <div className="vsu-search-wrap flex-grow-1">
                  <SearchIcon className="vsu-search-icon" />
                  <input
                    type="text"
                    className="form-control vsu-search"
                    placeholder="Search any product by name or code..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (e.target.value.trim()) clearImageSearch();
                      setSelectedCategory("All");
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="vsu-icon-btn"
                  title="Find a product by uploading its photo"
                  disabled={imageSearchBusy}
                  onClick={() => photoSearchInputRef.current?.click()}
                >
                  <CameraAltIcon fontSize="small" />
                  <span>Search by Photo</span>
                </button>
                <button
                  type="button"
                  className="vsu-icon-btn"
                  title="Find a product by uploading a barcode photo"
                  disabled={imageSearchBusy}
                  onClick={() => barcodePhotoInputRef.current?.click()}
                >
                  <SearchIcon fontSize="small" />
                  <span>Scan Barcode Photo</span>
                </button>
              </div>
              {imageSearchBusy && (
                <div className="vsu-finder-status">
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                  />
                  Analyzing photo...
                </div>
              )}
              {imageSearchError && !imageSearchBusy && (
                <div className="vsu-finder-status vsu-finder-error">
                  {imageSearchError}
                </div>
              )}
            </div>

            {loading ? (
              <div className="vsu-empty">
                <div
                  className="spinner-border text-success mb-2"
                  role="status"
                  style={{ width: "2rem", height: "2rem" }}
                />
                <p className="mb-0">Gathering today's stock...</p>
              </div>
            ) : categories.length === 0 ? (
              <div className="vsu-empty">
                <p className="mb-1 fw-bold">No categories yet</p>
                <p className="mb-0">
                  Add your first product to start building out your catalog.
                </p>
              </div>
            ) : (
              <div className="d-flex flex-wrap gap-3">
                <div
                  className="vsu-cat-tile"
                  onClick={() => handleCategorySelect("All")}
                >
                  <div
                    className="vsu-cat-ribbon"
                    style={{ background: "#16311F" }}
                  />
                  <div className="vsu-cat-body">
                    <img
                      loading="lazy"
                      decoding="async"
                      src={getCategoryImage("All")}
                      alt="All"
                      className="vsu-cat-img"
                    />
                    <span className="vsu-cat-label">All Products</span>
                  </div>
                </div>
                {categories.map((category) => (
                  <div
                    key={category}
                    className="vsu-cat-tile position-relative"
                    onClick={() => handleCategorySelect(category)}
                  >
                    <label
                      className="position-absolute d-flex align-items-center justify-content-center"
                      style={{
                        top: "8px",
                        left: "8px",
                        zIndex: 10,
                        background: "#fff",
                        borderRadius: "6px",
                        width: "28px",
                        height: "28px",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                        cursor: "pointer",
                      }}
                      onClick={(e) => e.stopPropagation()}
                      title={`Select all ${category} products`}
                    >
                      <input
                        type="checkbox"
                        className="form-check-input m-0"
                        style={{
                          width: "18px",
                          height: "18px",
                          cursor: "pointer",
                        }}
                        checked={isCategorySelected(category)}
                        onChange={() => toggleCategorySelection(category)}
                      />
                    </label>
                    <div
                      className="vsu-cat-ribbon"
                      style={{ background: colorForCategory(category) }}
                    />
                    <div className="vsu-cat-body">
                      <img
                        loading="lazy"
                        decoding="async"
                        src={getCategoryImage(category)}
                        alt={category}
                        className="vsu-cat-img"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = makePlaceholder(
                            category,
                            "adb5bd",
                            "ffffff",
                          );
                        }}
                      />
                      <span className="vsu-cat-label">{category}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ---- Product view for the selected category ---- */
          <div>
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
              <button
                className="vsu-back-btn"
                onClick={() => setSelectedCategory(null)}
              >
                <ArrowBackIcon fontSize="small" /> All Categories
              </button>
              <h5 className="vsu-section-heading mb-0">
                {selectedCategory === "All" ? "All Products" : selectedCategory}
              </h5>
              <div className="d-flex align-items-center  flex-wrap gap-2">
                {selectedForSubmissionCount > 0 && (
                  <span className="badge bg-success">
                    {selectedForSubmissionCount} selected for submission
                  </span>
                )}
                <div className="vsu-search-wrap">
                  <SearchIcon className="vsu-search-icon" />
                  <input
                    type="text"
                    className="form-control form-control-sm vsu-search"
                    placeholder="Search by name or code..."
                    value={searchQuery}
                   onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (e.target.value.trim()) clearImageSearch();
                    }}
                    style={{ maxWidth: "220px" }}
                  />
                </div>
                <button
                  type="button"
                  className="vsu-icon-btn vsu-icon-btn-sm"
                  title="Find a product by uploading its photo"
                  disabled={imageSearchBusy}
                  onClick={() => photoSearchInputRef.current?.click()}
                >
                  <CameraAltIcon fontSize="small" />
                </button>
                <button
                  type="button"
                  className="vsu-icon-btn vsu-icon-btn-sm"
                  title="Find a product by uploading a barcode photo"
                  disabled={imageSearchBusy}
                  onClick={() => barcodePhotoInputRef.current?.click()}
                >
                  <SearchIcon fontSize="small" />
                </button>
              </div>
            </div>
            
             {/* ---- My Products / All Products toggle ---- */}
            {!imageSearchMatchIds && (
              <div className="vsu-toggle-row mb-3">
                <div className="vsu-toggle-group">
                  <button
                    type="button"
                    className={`vsu-toggle-pill ${effectiveViewMode === "selected" ? "active" : ""}`}
                    onClick={() => setViewModeOverride("selected")}
                  >
                    My Products{" "}
                    <span className="vsu-toggle-count">
                      {categoryMineCount}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`vsu-toggle-pill ${effectiveViewMode === "all" ? "active" : ""}`}
                    onClick={() => setViewModeOverride("all")}
                  >
                    All Products{" "}
                    <span className="vsu-toggle-count">
                      {categoryScopedItems.length}
                    </span>
                  </button>
                </div>
                {effectiveViewMode === "selected" && (
                  <span className="text-muted vsu-toggle-hint">
                    Showing products you've already picked. Switch to "All
                    Products" to add more.
                  </span>
                )}
              </div>
            )}

            {(imageSearchBusy || imageSearchError || imageSearchMatchIds) && (
              <div className="vsu-finder-status-row mb-3">
                {imageSearchBusy && (
                  <span className="vsu-finder-status">
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                    />
                    Analyzing photo...
                  </span>
                )}
                {imageSearchError && !imageSearchBusy && (
                  <span className="vsu-finder-status vsu-finder-error">
                    {imageSearchError}
                  </span>
                )}
                {imageSearchMatchIds && !imageSearchBusy && (
                  <span className="vsu-finder-status vsu-finder-success">
                    {imageSearchLabel || `${imageSearchMatchIds.size} matches`}
                  </span>
                )}
                {imageSearchMatchIds && (
                  <button
                    type="button"
                    className="vsu-back-btn"
                    onClick={clearImageSearch}
                  >
                    <CloseIcon fontSize="small" /> Clear photo search
                  </button>
                )}
              </div>
            )}

            {displayedItems.length === 0 ? (
              <div className="vsu-empty">
                <p className="mb-1 fw-bold">Nothing here yet</p>
                <p className="mb-0">
                  {effectiveViewMode === "selected" && !imageSearchMatchIds
                    ? "You haven't picked any products in this category yet. Switch to \"All Products\" to browse and add some."
                    : "Try a different category, clear your search, or add a new product."}
                </p>
              </div>
            ) : (
              <div className="d-flex flex-wrap gap-3 mb-4">
                {displayedItems.map((item) => {
                  const liveStock = Number(item.stockLeft || 0);
                  // const restockQty = getPendingQty(item.id);
                  const restockLimit = getPendingLimit(item);
                  const isOutOfStock = liveStock <= 0;
                  const productValidationError = getProductValidationError(item);
                  return (
                    <div
                      key={item.id}
                      className={`vsu-product-card position-relative ${isSelectedForSubmission(item.id) ? "border-success border-2" : ""}`}
                      style={{ opacity: isOutOfStock ? 0.85 : 1 }}
                    >
                      <label
                        className="position-absolute d-flex align-items-center justify-content-center"
                        style={{
                          top: 6,
                          left: 6,
                          zIndex: 3,
                          background: "#fff",
                          borderRadius: "50%",
                          width: "22px",
                          height: "22px",
                          border: "1px solid rgba(0,0,0,0.08)",
                          cursor: "pointer",
                        }}
                        title="Select for submission"
                      >
                        <input
                          type="checkbox"
                          className="form-check-input m-0"
                          style={{ width: "14px", height: "14px" }}
                          checked={isSelectedForSubmission(item.id)}
                          onChange={() => toggleSelectForSubmission(item)}
                        />
                      </label>

                      <div
                        className="d-flex justify-content-center align-items-center position-relative"
                        style={{ height: "90px" }}
                      >
                        <img
                          src={getProductImage(item)}
                          alt={item.name}
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = makePlaceholder(
                              item.name,
                              "adb5bd",
                              "ffffff",
                            );
                          }}
                          style={{
                            maxHeight: "80px",
                            maxWidth: "100%",
                            objectFit: "contain",
                            borderRadius: "6px",
                            backgroundColor: "#f5f5f5",
                          }}
                        />
                      </div>

                      <h6
                        className="text-start fw-bold m-0 mt-1"
                        style={{
                          fontSize: "11px",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          lineHeight: "1.2em",
                          maxHeight: "2.4em",
                        }}
                      >
                        {item.name}
                      </h6>
                      <small
                        className="text-muted"
                        style={{ fontSize: "10px" }}
                      >
                        {item.code}
                      </small>

                      <div
                        className="text-start"
                        style={{ fontSize: "12px", marginTop: "2px" }}
                      >
                        {item.afterDiscount != null && (
                          <b className="text-success me-2">
                            ₹{Math.round(Number(item.afterDiscount))}
                          </b>
                        )}
                        {item.mrp != null && (
                          <s className="text-muted">₹{item.mrp}</s>
                        )}
                      </div>

                      {/* ---- Submit quantity ---- */}
                      <div className="mt-2">
                        <div
                          className="d-flex justify-content-between align-items-center mb-1"
                          style={{ fontSize: "10px", color: "#6B7A70" }}
                        >
                          {/* <span>Live: {liveStock}</span> */}
                          <span
                            className="fw-bold"
                            style={{ color: "#8a611c" }}
                          >
                            Restock
                          </span>
                        </div>
                        <input
                          type="number"
                          min="0"     
                          step="1"
                          required={isSelectedForSubmission(item.id)}
                          className="form-control form-control-sm"
                          style={{ fontSize: "12px" }}
                          value={getQtyDisplayValue(item.id)}
                          onChange={(e) => handleQtyInputChange(item.id, e.target.value, item)}
                        />
                      </div>

                      {/* ---- Per-customer limit ---- */}
                      <div className="mt-2">
                        <div
                          className="d-flex justify-content-between align-items-center mb-1"
                          style={{ fontSize: "10px", color: "#6B7A70" }}
                        >
                          <span>Per-customer limit</span>
                          <span
                            className="fw-bold"
                            style={{ color: "#8a611c" }}
                          >
                            Submit Limit
                          </span>
                        </div>

                        <input
                          type="number"
                          min="0"
                          max={liveStock}
                          className="form-control form-control-sm"
                          style={{ fontSize: "12px" }}
                          value={restockLimit === 0 ? "" : restockLimit}
                          onChange={(e) =>
                            handleLimitInputChange(
                              item.id,
                              e.target.value,
                              item,
                            )
                          }
                        />

                        {liveStock > 0 &&
                          Number(restockLimit) >= liveStock &&
                          restockLimit !== "" && (
                            <div
                              style={{
                                fontSize: "9px",
                                color: "#dc3545",
                                fontWeight: 600,
                                textAlign: "center",
                                marginTop: 3,
                              }}
                            >
                              Maximum limit reached
                            </div>
                          )}
                      </div>

                      {/* ---- Submit discount ---- */}
                      <div className="mt-2">
                        <div
                          className="d-flex justify-content-between align-items-center mb-1"
                          style={{ fontSize: "10px", color: "#6B7A70" }}
                        >
                          <span>Submit discount</span>
                          {isSelectedForSubmission(item.id) && (
                            <span
                              className="fw-bold"
                              style={{ color: "#2F6B4F" }}
                            >
                              Selected
                            </span>
                          )}
                        </div>
                        <div className="input-group input-group-sm">
                          <input
                            type="text"
                            inputMode="decimal"
                            min="0"
                            max="95"
                            className="form-control form-control-sm"
                            style={{ fontSize: "11px" }}
                            placeholder="Discount %"
                            value={getSelectionDiscount(item)}
                            onChange={(e) =>
                              updateSelectionDiscount(item, e.target.value)
                            }
                          />
                          <span
                            className="input-group-text"
                            style={{ fontSize: "11px" }}
                          >
                            %
                          </span>
                        </div>
                      </div>
                      {/* ---- Submit MRP ---- */}
                      <div className="mt-2">
                        <div
                          className="d-flex justify-content-between align-items-center mb-1"
                          style={{ fontSize: "10px", color: "#6B7A70" }}
                        >
                          <span>MRP (₹)</span>
                          <span className="fw-bold" style={{ color: "#8a611c" }}>
                            Edit MRP
                          </span>
                        </div>
                        <input
                         type="text"
                          inputMode="decimal"
                          min="0.01"
                          className="form-control form-control-sm"
                          style={{ fontSize: "12px" }}
                          value={getMrpDisplayValue(item)}
                          required={isSelectedForSubmission(item.id)}
                          onChange={(e) => handleMrpInputChange(item.id, e.target.value)}
                        />
                      </div>
                      {productValidationError && (
                      <div
                        className="mt-2"
                        style={{
                          color: "#dc3545",
                          fontSize: "10px",
                          fontWeight: 600,
                          lineHeight: "1.3",
                          background: "#fff1f1",
                          border: "1px solid #f5c2c7",
                          borderRadius: "6px",
                          padding: "5px 7px",
                        }}
                      >
                        ⚠ {productValidationError}
                      </div>
                    )}
                      {/* ---- Submit Price (after discount) ---- */}
                      <div className="mt-2">
                        <div
                          className="d-flex justify-content-between align-items-center mb-1"
                          style={{ fontSize: "10px", color: "#6B7A70" }}
                        >
                          <span>Selling price (₹)</span>

                          <span
                            className="fw-bold"
                            style={{ color: "#2F6B4F" }}
                          >
                            Auto Calculated
                          </span>
                        </div>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          style={{
                            fontSize: "12px",
                            backgroundColor: "#f5f5f5",
                            cursor: "not-allowed",
                          }}
                          value={getCalculatedSellingPrice(item)}
                          readOnly
                        />
                      </div>
                    </div>                     
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ---- Preview Products (bottom of page) ---- */}
        <div className="d-flex justify-content-center mt-1 mb-5 gap-2">
          <button
            type="button"
            className="btn btn-primary text-white "
            onClick={handlePreview}
          >
            Preview Products
          </button>
          <button
              className="btn btn-primary text-white "
              onClick={handleRefresh}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh from server"}
            </button>
        </div>
      </div>

      {/* ---- Floating vendor icon navigation ---- */}
      <div
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 1500,
        }}
      >
        {showVendorMenu && (
          <div
            className="bg-white vsu-fab-menu p-2 mb-2"
            style={{ minWidth: "210px" }}
          ><button
              className="vsu-fab-menu-item w-100 mb-1"
              onClick={openAddModal}
            >
              <AddIcon fontSize="small" /> Add New Product
            </button>
	          <button
              className="vsu-fab-menu-item w-100 mb-1"
              onClick={() => {
                setShowVendorMenu(false);
                handlePreview();
              }}
            >
              Preview Products
            </button>
            <button
              className="vsu-fab-menu-item w-100 mb-1"
              onClick={handleRefresh}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh from server"}
            </button>
            <button
              className="vsu-fab-menu-item w-100"
              onClick={() => {
                setShowVendorMenu(false);
                handleBackToProfile();
              }}
            >
              Back to Profile
            </button>
            <button
              className="vsu-fab-menu-item w-100"
              style={{ color: "#A24B4B" }}
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        )}
        <button
          className="btn vsu-fab rounded-circle shadow-lg d-flex align-items-center justify-content-center"
          style={{ width: "58px", height: "58px" }}
          onClick={() => setShowVendorMenu((prev) => !prev)}
          title="Vendor menu"
        >
          <StorefrontIcon style={{color: "#ffffff"}}/>
        </button>
      </div>

      {/* ---- Add New Product modal ---- */}
      {showAddModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ backgroundColor: "rgba(16,48,31,0.55)", zIndex: 2000 }}
          onClick={closeAddModal}
        >
          <div
            className="bg-white vsu-modal-card"
            style={{
              width: "min(520px, 92vw)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="vsu-modal-header d-flex justify-content-between align-items-center">
              <h5 className="vsu-title mb-0">Add New Product</h5>
              <button
                className="btn btn-sm"
                style={{ color: "#fff" }}
                onClick={closeAddModal}
              >
                <CloseIcon fontSize="small" />
              </button>
            </div>

            <div className="p-4">
              {addError && (
                <div className="alert alert-danger py-2 rounded-3">
                  {addError}
                </div>
              )}

              <form onSubmit={handleAddSubmit}>
                <div className="mb-2">
                  <label
                    className="form-label mb-1"
                    style={{ fontSize: "13px" }}
                  >
                    Product Name
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={addForm.name}
                    onChange={(e) => updateAddForm("name", e.target.value)}
                  />
                </div>

                <div className="mb-2">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                  <label
                    className="form-label mb-1"
                    style={{ fontSize: "13px" }}
                  >
                    Category
                  </label>
                  <button
                      type="button"
                      className="btn btn-link btn-sm p-0"
                      style={{ fontSize: "12px", textDecoration: "none" }}
                      onClick={openAddCategoryModal}
                    >
                      + Add New Category
                    </button>
                  </div>
                  <select
                    className="form-select form-select-sm"
                    value={addForm.category}
                    onChange={(e) => updateAddForm("category", e.target.value)}
                  >
                    <option value="">Choose Category</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="__new__">+ Add new category</option>
                  </select>
                  {addForm.category === "__new__" && (
                    <input
                      type="text"
                      className="form-control form-control-sm mt-2"
                      placeholder="New category name"
                      value={addForm.newCategory}
                      onChange={(e) =>
                        updateAddForm("newCategory", e.target.value)
                      }
                    />
                  )}
                </div>

                {/* Product Code: scan or manual */}
                <div className="mb-2">
                  <label
                    className="form-label mb-1"
                    style={{ fontSize: "13px" }}
                  >
                    Product Code / Barcode
                  </label>
                  <div className="btn-group btn-group-sm mb-2 w-100">
                    <button
                      type="button"
                      className={`btn ${codeMode === "manual" ? "vsu-btn-primary" : "btn-outline-secondary"}`}
                      onClick={() => setCodeMode("manual")}
                    >
                      Enter Manually
                    </button>
                    <button
                      type="button"
                      className={`btn ${codeMode === "scan" ? "vsu-btn-primary" : "btn-outline-secondary"}`}
                      onClick={() => setCodeMode("scan")}
                    >
                      <CameraAltIcon fontSize="small" /> Scan Barcode
                    </button>
                  </div>

                  {codeMode === "manual" ? (
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="e.g. RICE-001"
                      value={addForm.code}
                      onChange={(e) => updateAddForm("code", e.target.value)}
                    />
                  ) : (
                    <div>
                      {scanError && (
                        <div
                          className="alert alert-warning py-2 rounded-3"
                          style={{ fontSize: "12px" }}
                        >
                          {scanError}
                        </div>
                      )}
                      {!scanning ? (
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm w-100"
                          onClick={startScan}
                        >
                          Start Camera Scan
                        </button>
                      ) : (
                        <div>
                          <video
                            ref={videoRef}
                            muted
                            playsInline
                            style={{
                              width: "100%",
                              borderRadius: "10px",
                              backgroundColor: "#000",
                            }}
                          />
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm w-100 mt-2"
                            onClick={stopScan}
                          >
                            Stop Scanning
                          </button>
                        </div>
                      )}
                      <input
                        type="text"
                        className="form-control form-control-sm mt-2"
                        placeholder="Detected code appears here (or type it in)"
                        value={addForm.code}
                        onChange={(e) => updateAddForm("code", e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <label
                      className="form-label mb-1"
                      style={{ fontSize: "13px" }}
                    >
                      Units
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="e.g. 1kg"
                      value={addForm.units}
                      onChange={(e) => updateAddForm("units", e.target.value)}
                    />
                  </div>
                  <div className="col-6">
                    <label
                      className="form-label mb-1"
                      style={{ fontSize: "13px" }}
                    >
                      Starting Stock
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-control form-control-sm"
                      value={addForm.stockLeft}
                      onChange={(e) =>
                        updateAddForm("stockLeft", e.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <label
                      className="form-label mb-1"
                      style={{ fontSize: "13px" }}
                    >
                      MRP (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="form-control form-control-sm"
                      value={addForm.mrp}
                      onChange={(e) => updateAddForm("mrp", e.target.value)}
                      required
                    />
                  </div>
                   {/* Discount */}
  <div className="col-6">
    <label className="form-label mb-1">
      Discount (%) *
    </label>
    <input
      type="number"
      min="0"
      max="95"
      step="0.01"
      className="form-control form-control-sm"
      value={addForm.discount}
      onChange={(e) => {
        const value = e.target.value;

        if (
          value === "" ||
          (/^\d*(\.\d{0,2})?$/.test(value) &&
            Number(value) <= 95)
        ) {
          updateAddForm("discount", value);
        }
      }}
      required
    />
  </div>
</div>

{/* Selling Price */}
<div className="mb-2">
  <label className="form-label mb-1">
    Price (₹) *
  </label>
  <input
    type="number"
    className="form-control form-control-sm"
    value={getAddProductPrice()}
    readOnly
    required
    placeholder="Auto-calculated selling price"
  />
</div>

                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <label
                      className="form-label mb-1"
                      style={{ fontSize: "13px" }}
                    >
                      Delivery In (mins)
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={addForm.deliveryIn}
                      onChange={(e) =>
                        updateAddForm("deliveryIn", e.target.value)
                      }
                    />
                  </div>
                  <div className="col-6">
                    <label
                      className="form-label mb-1"
                      style={{ fontSize: "13px" }}
                    >
                      Per-customer limit
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-control form-control-sm"
                      placeholder="Optional"
                      value={addForm.limit}
                      onChange={(e) => updateAddForm("limit", e.target.value)}
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label
                    className="form-label mb-1"
                    style={{ fontSize: "13px" }}
                  >
                    Product Photo (optional)
                  </label>
                  <input
                    ref={addPhotoInputRef}
                    type="file"
                    accept="image/*"
                    className="form-control form-control-sm"
                    onChange={(e) => setAddPhoto(e.target.files?.[0] || null)}
                  />
                </div>

                <button
                  type="submit"
                  className="btn vsu-btn-primary w-100 py-2"
                  disabled={addSaving}
                >
                  {addSaving ? "Submitting..." : "Submit for Approval"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* ---- Add New Category modal ---- */}
      {showAddCategoryModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ backgroundColor: "rgba(16,48,31,0.55)", zIndex: 2100 }}
          onClick={closeAddCategoryModal}
        >
          <div
            className="bg-white vsu-modal-card"
            style={{ width: "min(400px, 92vw)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="vsu-modal-header d-flex justify-content-between align-items-center">
              <h5 className="vsu-title mb-0">Add New Category</h5>
              <button
                className="btn btn-sm"
                style={{ color: "#fff" }}
                onClick={closeAddCategoryModal}
              >
                <CloseIcon fontSize="small" />
              </button>
            </div>

            <div className="p-4">
              {addCategoryError && (
                <div className="alert alert-danger py-2 rounded-3">
                  {addCategoryError}
                </div>
              )}

              <form onSubmit={handleAddCategorySubmit}>
                <div className="mb-3">
                  <label
                    className="form-label mb-1"
                    style={{ fontSize: "13px" }}
                  >
                    Category Name
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="e.g. Vegetables"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  className="btn vsu-btn-primary w-100 py-2"
                  disabled={addCategorySaving}
                >
                  {addCategorySaving ? "Saving..." : "Save Category"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* ---- Add New Category modal ---- */}
      {showAddCategoryModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ backgroundColor: "rgba(16,48,31,0.55)", zIndex: 2100 }}
          onClick={closeAddCategoryModal}
        >
          <div
            className="bg-white vsu-modal-card"
            style={{ width: "min(400px, 92vw)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="vsu-modal-header d-flex justify-content-between align-items-center">
              <h5 className="vsu-title mb-0">Add New Category</h5>
              <button
                className="btn btn-sm"
                style={{ color: "#fff" }}
                onClick={closeAddCategoryModal}
              >
                <CloseIcon fontSize="small" />
              </button>
            </div>

            <div className="p-4">
              {addCategoryError && (
                <div className="alert alert-danger py-2 rounded-3">
                  {addCategoryError}
                </div>
              )}

              <form onSubmit={handleAddCategorySubmit}>
                <div className="mb-3">
                  <label
                    className="form-label mb-1"
                    style={{ fontSize: "13px" }}
                  >
                    Category Name
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="e.g. Vegetables"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  className="btn vsu-btn-primary w-100 py-2"
                  disabled={addCategorySaving}
                >
                  {addCategorySaving ? "Saving..." : "Save Category"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
        {/* ---- Add New Category modal ---- */}
      {showAddCategoryModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ backgroundColor: "rgba(16,48,31,0.55)", zIndex: 2100 }}
          onClick={closeAddCategoryModal}
        >
          <div
            className="bg-white vsu-modal-card"
            style={{ width: "min(400px, 92vw)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="vsu-modal-header d-flex justify-content-between align-items-center">
              <h5 className="vsu-title mb-0">Add New Category</h5>
              <button
                className="btn btn-sm"
                style={{ color: "#fff" }}
                onClick={closeAddCategoryModal}
              >
                <CloseIcon fontSize="small" />
              </button>
            </div>

            <div className="p-4">
              {addCategoryError && (
                <div className="alert alert-danger py-2 rounded-3">
                  {addCategoryError}
                </div>
              )}

              <form onSubmit={handleAddCategorySubmit}>
                <div className="mb-3">
                  <label
                    className="form-label mb-1"
                    style={{ fontSize: "13px" }}
                  >
                    Category Name
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="e.g. Vegetables"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  className="btn vsu-btn-primary w-100 py-2"
                  disabled={addCategorySaving}
                >
                  {addCategorySaving ? "Saving..." : "Save Category"}
                </button>
              </form>
            </div>
          </div>           
        </div>
      )}
    </div>
  );
};

export default VendorStockUpdatePage;