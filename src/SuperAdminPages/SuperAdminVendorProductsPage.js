import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getVendorProductsByVendorId,
  updateVendorProductsValues,
  getAllVendors,
} from "../utils/superAdminStore";
import { getGroceryItems } from "../utils/groceryStore";
// import ImageCache from "./utils/ImageCache";
// import { getImageFilename, imageValueToUrl } from "./utils/imageSource";
import SuperAdminNav from "./SuperAdminNav";

const BLOB_BASE_URL =
  "https://lmartfiles.blob.core.windows.net/userattechements";
 
const getAzureImageUrl = (imageName) => {
  if (!imageName) return "";
 
  if (
    typeof imageName === "string" &&
    (imageName.startsWith("http://") || imageName.startsWith("https://"))
  ) {
    return imageName;
  }
 
  const cleanName = String(imageName).replace(/^\/+/, "");
 
  return `${BLOB_BASE_URL}/${encodeURIComponent(cleanName)}`;
};

const CategorySelectAllCheckbox = ({
  categoryName,
  orderedCategories,
  productApproval,
  onToggle,
}) => {
  const ids = useMemo(() => {
    const cat = orderedCategories.find((c) => c.categoryName === categoryName);
    return (cat?.products || []).map((p) => p.productIds);
  }, [orderedCategories, categoryName]);

  const total = ids.length;
  const checkedCount = ids.filter((id) => productApproval[id]).length;
  const allChecked = total > 0 && checkedCount === total;
  const someChecked = checkedCount > 0 && checkedCount < total;

  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = someChecked;
  }, [someChecked]);

  return (
    <input
      ref={ref}
      type="checkbox"
      className="form-check-input mt-0"
      checked={allChecked}
      onChange={() => onToggle(categoryName)}
      title="Select all products in this category"
    />
  );
};

const API_BASE = "https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api";
const GET_VENDOR_CATEGORIES = `${API_BASE}/Categorie/GetCategorieDetailsByVendorId`;
const UPDATE_VENDOR_CATEGORY = `${API_BASE}/Categorie/UpdateCategoriesDetails`;
const CATEGORY_IMAGE_UPLOAD = `${API_BASE}/FileUpload/upload?filename=`;

const SuperAdminVendorProductsPage = () => {
  const { vendorId } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [catalogById, setCatalogById] = useState({});
  const [imageUrls, setImageUrls] = useState({});
  const [vendorStoreImage, setVendorStoreImage] = useState("");
const [vendorStoreImageName, setVendorStoreImageName] = useState("");
const [imageUploading, setImageUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedPincodes, setSelectedPincodes] = useState([]);
  const [orderedCategories, setOrderedCategories] = useState([]);
  const [savedCategoryOrder, setSavedCategoryOrder] = useState([]);
  const [productApproval, setProductApproval] = useState({});
  const [originalApproval, setOriginalApproval] = useState({});
 const [vendorMeta, setVendorMeta] = useState({
    district: null,
    districtId: null,
  });
 // ---- Recent Products modal state ----
  // Separate from the main "record" data — this is fetched fresh from the
  // GetGroceryItemsByVendorId endpoint each time the admin opens the modal,
  // and holds its own per-item Approve/Reject decision + comment so it
  // doesn't interfere with the productApproval state used above.
  const [showRecentModal, setShowRecentModal] = useState(false);
  const [recentProducts, setRecentProducts] = useState([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentError, setRecentError] = useState("");
  const [recentDecisions, setRecentDecisions] = useState({});
  const [recentSubmittingId, setRecentSubmittingId] = useState(null);
  // item.id -> resolved base64 data URL for its image, filled in by the
  // effect below once fetched/cached (same cache-first pattern used for
  // the main product grid's images).
  const [recentImageUrls, setRecentImageUrls] = useState({});

   // ---- Recent Vendor Categories modal state ----
  // Separate from everything above — fetched fresh from
  // GetCategorieDetailsByVendorId each time the admin opens the modal.
  // Each card lets the admin pick a photo for that category, then submits
  // (uploads the photo, sets Status "Approved", and PUTs the category back
  // via UpdateCategoriesDetails).
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [recentCategories, setRecentCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState("");
  // category.id -> File the admin picked but hasn't submitted yet.
  const [categoryPhotoFiles, setCategoryPhotoFiles] = useState({});
  // category.id -> local object URL preview of the picked file above.
  const [categoryPhotoPreviews, setCategoryPhotoPreviews] = useState({});
  // category.id -> resolved data URL for whatever image is already saved
  // on the category (cache-first, same pattern as product images).
  const [categoryImageUrls, setCategoryImageUrls] = useState({});
  const [categorySubmittingId, setCategorySubmittingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      setMessage("");
      try {
        const [productRecord, catalog, vendors] = await Promise.all([
          getVendorProductsByVendorId(vendorId),
          getGroceryItems().catch(() => []),
          getAllVendors().catch(() => []),
        ]);
        if (cancelled) return;
        setRecord(productRecord);
        // Bind existing vendor store icon from GET API
        const existingImage = Array.isArray(productRecord?.image)
          ? productRecord.image[0]
          : productRecord?.image || "";

        const existingImageName =
          productRecord?.imageName ||
          productRecord?.ImageName ||
          "";

        setVendorStoreImage(existingImage || "");
        setVendorStoreImageName(existingImageName || "");
        setSelectedPincodes(
          Array.isArray(productRecord?.pincodes) ? productRecord.pincodes : [],
        );

       const vendorInfo = (Array.isArray(vendors) ? vendors : []).find(
          (v) =>
            String(v?.vendorId ?? v?.VendorId ?? v?.id ?? "") ===
            String(vendorId),
        );
        const resolvedDistrict =
          productRecord?.district ??
          productRecord?.District ??
          vendorInfo?.district ??
          vendorInfo?.District ??
          null;
        const resolvedDistrictId =
          productRecord?.districtId ??
          productRecord?.DistrictId ??
          vendorInfo?.districtId ??
          vendorInfo?.DistrictId ??
          vendorInfo?.district_id ??
          null;
        setVendorMeta({
          district: resolvedDistrict,
          districtId: resolvedDistrictId,
        });
        if (!resolvedDistrict || !resolvedDistrictId) {
          console.warn(
            "Could not resolve district/districtId for this vendor from GetAllVendors — saves will 400 until these are available. Vendor registration record was:",
            vendorInfo,
          );
        }
        const cats = Array.isArray(productRecord?.categorie)
  ? productRecord.categorie
  : [];

// ONLY PRODUCTS WAITING FOR APPROVAL
// const pendingCats = cats
//   .map((cat) => ({
//     ...cat,

//     products: (cat.products || []).filter((p) => {
//       const status =
//         p.status ??
//         p.Status ??
//         "Pending";

//       return status === "Pending";
//     }),
//   }))
//   .filter((cat) => cat.products.length > 0);

const sorted = [...cats].sort((a, b) => {
  const rankA = Number(a.rank);
  const rankB = Number(b.rank);

  if (Number.isFinite(rankA) && Number.isFinite(rankB)) {
    return rankA - rankB;
  }

  if (Number.isFinite(rankA)) return -1;
  if (Number.isFinite(rankB)) return 1;

  return 0;
});

const usedRanks = new Set(
  sorted
    .map((cat) => Number(cat.rank))
    .filter(Number.isFinite)
);

let nextRank = 1;

const orderedCats = sorted.map((cat) => {
  const rank = Number(cat.rank);

  if (Number.isFinite(rank)) {
    return {
      ...cat,
      rank: String(rank),
    };
  }

  while (usedRanks.has(nextRank)) {
    nextRank++;
  }

  usedRanks.add(nextRank);

  return {
    ...cat,
    rank: String(nextRank++),
  };
});

setOrderedCategories(orderedCats);
setSavedCategoryOrder(
  orderedCats.map((cat) => cat.categoryName)
);
       const approvalSeed = {};
        orderedCats.forEach((cat) => {
          (cat.products || []).forEach((p) => {
            approvalSeed[p.productIds] = false;
          });
        });

        setProductApproval(approvalSeed);
        setOriginalApproval(approvalSeed);

                const byId = {};
        (Array.isArray(catalog) ? catalog : []).forEach((item) => {
          if (item?.id) byId[String(item.id)] = item;
        });
        setCatalogById(byId);
      } catch (err) {
        console.error("Failed to load vendor products", err);
        if (!cancelled)
          setError(
            "Unable to load this vendor's submitted products right now.",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vendorId]);


  useEffect(() => {
    if (!record) return;
    const products = (record.categorie || []).flatMap(
      (cat) => cat.products || [],
    );
    const directImageUrls = {};
    products.forEach((p) => {
      const master = catalogById[String(p.productIds)];
      const photo = Array.isArray(master?.images) ? master.images[0] : null;
      if (photo) {
        directImageUrls[p.productIds] = getAzureImageUrl(photo);
      }
    });
 
    setImageUrls(directImageUrls);
  }, [record, catalogById]);

  const totalProducts = useMemo(() => {
    if (!record) return 0;
    return (record.categorie || []).reduce(
      (sum, cat) => sum + (cat.products || []).length,
      0,
    );
  }, [record]);

  const describeAxiosError = (err) => {
    if (err?.response) {
      const status = err.response.status;
      const body = err.response.data;
      const bodyText =
        typeof body === "string" ? body : JSON.stringify(body ?? {});
      return `Server rejected the request (HTTP ${status}): ${bodyText.slice(0, 300)}`;
    }
    if (err?.request) {
      return "No response received from the server (network/CORS issue).";
    }
    return err?.message || "Unknown error";
  };

  const verifyUpdateSucceeded = async (expectedUpdatedDate) => {
    try {
      const latest = await getVendorProductsByVendorId(vendorId);
      return latest?.updatedDate === expectedUpdatedDate ? latest : null;
    } catch (verifyErr) {
      console.error("Verification fetch also failed:", verifyErr);
      return null;
    }
  };

  const persistVendorRecord = async (payload) => {
    try {
      await updateVendorProductsValues(payload);
      return { ok: true };
    } catch (err) {
      const detail = describeAxiosError(err);
      console.error("updateVendorProductsValues threw:", detail, err);
      const verified = await verifyUpdateSucceeded(payload.updatedDate);
      if (verified) return { ok: true };
      return { ok: false, detail };
    }
  };

   const buildBasePayload = () => ({
    ...record,
    district: record?.district ?? record?.District ?? vendorMeta.district,
    districtId:
      record?.districtId ?? record?.DistrictId ?? vendorMeta.districtId,
  });

  const togglePincode = (pin) => {
    setSelectedPincodes((prev) =>
      prev.includes(pin) ? prev.filter((p) => p !== pin) : [...prev, pin],
    );
  };

  const moveCategory = (index, direction) => {
    setOrderedCategories((prev) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next.map((cat, idx) => ({ ...cat, rank: String(idx + 1) }));
    });
  };

  const categoryOrderChanged = useMemo(() => {
    const current = orderedCategories.map((cat) => cat.categoryName);
    return JSON.stringify(savedCategoryOrder) !== JSON.stringify(current);
  }, [savedCategoryOrder, orderedCategories]);

  const handleSaveCategoryOrder = async () => {
    if (!record) return;
    setSaving(true);
    setError("");
    setMessage("");
    const payload = {
      ...buildBasePayload(),
      updatedDate: new Date().toISOString(),
      categorie: orderedCategories,
    };
    const result = await persistVendorRecord(payload);
    if (result.ok) {
      setRecord(payload);
     setSavedCategoryOrder(orderedCategories.map((cat) => cat.categoryName));
      setMessage("Category order updated.");
    } else {
      setError(`Unable to save the category order. ${result.detail}`);
    }
    setSaving(false);
  };

  const statusBadgeClass = (status) => {
    if (status === "Approved") return "bg-success";
    if (status === "Reject" || status === "Rejected") return "bg-danger";
    return "bg-warning text-dark";
  };

  const pincodesChanged = useMemo(() => {
    if (!record) return false;
    const original = Array.isArray(record.pincodes)
      ? [...record.pincodes].sort()
      : [];
    const current = [...selectedPincodes].sort();
    return JSON.stringify(original) !== JSON.stringify(current);
  }, [record, selectedPincodes]);

  const handleDecision = async (newStatus) => {
     if (newStatus === "Approved") {
      return handleSaveApprovals();
    }
    if (!record) return;
    setSaving(true);
    setError("");
    setMessage("");
    const payload = {
      ...buildBasePayload(),
      status: newStatus,
      updatedDate: new Date().toISOString(),
      pincodes: selectedPincodes,
    };
    const result = await persistVendorRecord(payload);
    if (result.ok) {
      setRecord(payload);
      setMessage(
        newStatus === "Approved"
          ? "Submission approved."
          : "Submission rejected.",
      );
      alert(newStatus === "Approved"
          ? "Submission approved."
          : "Submission rejected.");
      navigate("/superadmin/vendors");
    } else {
      setError(`Unable to save this decision. ${result.detail}`);
    }
    setSaving(false);
  };

 const handleSavePincodes = async () => {
    if (!record) return;
    setSaving(true);
    setError("");
    setMessage("");
    const payload = {
      ...buildBasePayload(),
      updatedDate: new Date().toISOString(),
      pincodes: selectedPincodes,
    };
    const result = await persistVendorRecord(payload);
    if (result.ok) {
      setRecord(payload);
      setMessage("Pincode mapping updated.");
    } else {
      setError(`Unable to save the pincode changes. ${result.detail}`);
    }
    setSaving(false);
  };

  const toggleProductApproval = (productId) => {
    setProductApproval((prev) => ({ ...prev, [productId]: !prev[productId] }));
  };

   const toggleCategoryApproval = (categoryName) => {
    const cat = orderedCategories.find((c) => c.categoryName === categoryName);
    const ids = (cat?.products || []).map((p) => p.productIds);
    if (!ids.length) return;
    const allApproved = ids.every((id) => productApproval[id]);
    setProductApproval((prev) => {
      const next = { ...prev };
      ids.forEach((id) => {
        next[id] = !allApproved;
      });
      return next;
    });
  };

 const { approvedCategories, pendingCategories } = useMemo(() => {
    const approved = [];
    const pending = [];
    orderedCategories.forEach((cat) => {
      const approvedProducts = [];
      const pendingProducts = [];
      (cat.products || []).forEach((p) => {
        if (productApproval[p.productIds]) approvedProducts.push(p);
        else pendingProducts.push(p);
      });
      if (approvedProducts.length)
        approved.push({ ...cat, products: approvedProducts });
      if (pendingProducts.length)
        pending.push({ ...cat, products: pendingProducts });
    });
    return { approvedCategories: approved, pendingCategories: pending };
  }, [orderedCategories, productApproval]);

  const approvalChanged = useMemo(
    () => JSON.stringify(originalApproval) !== JSON.stringify(productApproval),
    [originalApproval, productApproval],
  );

  const handleVendorStoreImageUpload = (event) => {
  const file = event.target.files?.[0];

  if (!file) return;

  // Optional validation
  if (!file.type.startsWith("image/")) {
    setError("Please select a valid image file.");
    return;
  }

  // Optional 5 MB limit
  if (file.size > 5 * 1024 * 1024) {
    setError("Image size should not exceed 5 MB.");
    return;
  }

  setError("");
  setImageUploading(true);

  const reader = new FileReader();

  reader.onload = () => {
    const imageData = reader.result;

    setVendorStoreImage(imageData);
    setVendorStoreImageName(file.name);

    setImageUploading(false);
  };

  reader.onerror = () => {
    setError("Unable to read the selected image.");
    setImageUploading(false);
  };

  reader.readAsDataURL(file);
};

 const handleSaveApprovals = async () => {
  if (!record) return;

  setSaving(true);
  setError("");
  setMessage("");

  try {
    /*
     * Build categories with the current approval status.
     * Existing category rank is preserved from orderedCategories.
     */
    const updatedCategorie = orderedCategories.map((cat) => ({
      categoryName: cat.categoryName,
      rank: String(cat.rank),

      products: (cat.products || []).map((p) => ({
        productIds: p.productIds,
        quantity: p.quantity,
        limit: p.limit,
        discount: p.discount,

        // Approval status is kept in the category product data
        status: productApproval[p.productIds]
          ? "Approved"
          : "Pending",
      })),
    }));

    /*
     * EXACT PUT payload expected by:
     *
     * PUT
     * /api/VendorUploadProducts/UpdateVendorProductsValues
     */
    const payload = {
      id: record?.id ?? record?.Id ?? "",
      vendorId: record?.vendorId ?? record?.VendorId ?? vendorId ?? "",
      storeName: record?.storeName ?? record?.StoreName ?? "",
      
      // Save approval changes as Approved
      // This is also used by Re-approve.
      status: "Approved",

      createdDate:
        record?.createdDate ??
        record?.CreatedDate ??
        "",

      updatedDate: new Date().toISOString(),

      state:
        record?.state ??
        record?.State ??
        "",

      stateId:
        record?.stateId ??
        record?.StateId ??
        "",
      image: vendorStoreImage
        ? [vendorStoreImage]
        : Array.isArray(record?.image)
          ? record.image
          : [],
      imageName:
        vendorStoreImageName ||
        record?.imageName ||
        record?.ImageName ||
        "",

      district:
        record?.district ??
        record?.District ??
        vendorMeta.district ??
        "",

      districtId:
        record?.districtId ??
        record?.DistrictId ??
        vendorMeta.districtId ??
        "",

      pincodes: Array.isArray(selectedPincodes)
        ? selectedPincodes
        : Array.isArray(record?.pincodes)
          ? record.pincodes
          : [],

      categorie: updatedCategorie,
    };

    console.log(
      "PUT UpdateVendorProductsValues payload:",
      payload
    );

    const result = await persistVendorRecord(payload);

    if (result.ok) {
      setRecord(payload);
      setOrderedCategories(updatedCategorie);
      setOriginalApproval(productApproval);

      setMessage("Product approvals updated.");
      alert("Product approvals updated.");

      navigate("/superadmin/vendors");
    } else {
      setError(
        `Unable to save the approval changes. ${result.detail}`
      );
    }
  } catch (err) {
    console.error("handleSaveApprovals error:", err);

    setError(
      `Unable to save the approval changes. ${
        err?.message || "Unknown error"
      }`
    );
  } finally {
    setSaving(false);
  }
};

   // ---- Recent Products: fetch + decide ----

  // Fetches this vendor's most recently submitted grocery item(s) from the
  // UploadGrocery endpoint (separate from the main vendor-products record)
  // and opens the modal to review them. The endpoint has been observed to
  // return a single object rather than an array, so the response is
  // normalized to an array either way.
  const fetchRecentProducts = async () => {
    setShowRecentModal(true);
    setRecentLoading(true);
    setRecentError("");
    try {
      const res = await fetch(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/UploadGrocery/GetGroceryItemsByVendorId?vendorId=${vendorId}`,
      );
      if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
      const data = await res.json();
      const items = Array.isArray(data) ? data : data ? [data] : [];
      setRecentProducts(items);
      const seed = {};
      items.forEach((item) => {
        seed[item.id] = { decision: "Approve", comment: "" };
      });
      setRecentDecisions(seed);
    } catch (err) {
      console.error("Failed to load recent products", err);
      setRecentError("Not Find  recent products right now.");
      setRecentProducts([]);
    } finally {
      setRecentLoading(false);
    }
  };

  // Resolve each recent product's photo the same way the main grid does:
  // cache first, otherwise fetch the base64 payload from the image
  // endpoint and cache it, then store a data: URL for the <img> tag.
  useEffect(() => {
    if (!recentProducts.length) return;

     const directImageUrls = {};
    recentProducts.forEach((item) => {
      const photo = Array.isArray(item.images) ? item.images[0] : item.images;
      if (photo) {
        directImageUrls[item.id] = getAzureImageUrl(photo);
      }
    });
 
    setRecentImageUrls(directImageUrls);
  }, [recentProducts]);


  const setRecentDecision = (id, field, value) => {
    setRecentDecisions((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const closeRecentModal = () => {
    setShowRecentModal(false);
    setRecentProducts([]);
    setRecentDecisions({});
    setRecentImageUrls({});
    setRecentError("");
  };

  // Submits the admin's Approve/Reject decision for a single recent item
  // back to UpdateGroceryItems. The endpoint expects the full item back
  // with PascalCase keys and the "id" passed as a query param, with only
  // Status actually changing (Approved / Reject).
  const handleSubmitRecentDecision = async (item) => {
    const decision = recentDecisions[item.id] || {
      decision: "Approve",
      comment: "",
    };
    const newStatus = decision.decision === "Approve" ? "Approved" : "Reject";

    setRecentSubmittingId(item.id);
    try {
      const payload = {
        Id: item.id,
        Date: item.date,
        VendorId: item.vendorId,
        GroceryItemId: item.groceryItemId,
        Name: item.name,
        Category: item.category,
        Images: item.images,
        MRP: item.mrp,
        Discount: item.discount,
        AfterDiscount: item.afterDiscount,
        StockLeft: item.stockLeft,
        DeliveryIn: item.deliveryIn,
        RequestedBy: item.requestedBy,
        Status: newStatus,
        Code: item.code,
        Units: item.units,
        Limit: item.limit,
      };

      const res = await fetch(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/UploadGrocery/UpdateGroceryItems?id=${item.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) throw new Error(`Request failed with status ${res.status}`);

      setRecentProducts((prev) => prev.filter((p) => p.id !== item.id));
      alert(
        newStatus === "Approved"
          ? "Product is approved sucessfuly."
          : "Product is rejected sucessfuly.",
      );
    } catch (err) {
      console.error("Failed to submit recent product decision", err);
      setRecentError("Unable to submit this decision. Please try again.");
    } finally {
      setRecentSubmittingId(null);
    }
  };
  
    // ---- Recent Vendor Categories: fetch + approve with photo ----

  // Fetches every category this vendor has created, straight from
  // GetCategorieDetailsByVendorId, and opens the modal to review/approve
  // them one by one.
  const fetchRecentCategories = async () => {
    setShowCategoriesModal(true);
    setCategoriesLoading(true);
    setCategoriesError("");
    try {
      const res = await fetch(`${GET_VENDOR_CATEGORIES}?vendorId=${vendorId}`);
      if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data ? [data] : [];
      setRecentCategories(list);
    } catch (err) {
      console.error("Failed to load vendor categories", err);
      setCategoriesError("Unable to load categories right now.");
      setRecentCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  // Resolve each category's already-saved image (if any) the same
  // cache-first way as everywhere else images are shown.
  useEffect(() => {
    if (!recentCategories.length) return;

    const directImageUrls = {};
    recentCategories.forEach((cat) => {
      const images = cat.Images || cat.images || [];
      const photo = Array.isArray(images) ? images[0] : null;
      if (photo) {
        directImageUrls[cat.id] = getAzureImageUrl(photo);
      }
    });
 
    setCategoryImageUrls(directImageUrls);
  }, [recentCategories]);

  const handleCategoryPhotoChange = (categoryId, file) => {
    setCategoryPhotoFiles((prev) => ({ ...prev, [categoryId]: file || null }));
    setCategoryPhotoPreviews((prev) => {
      const next = { ...prev };
      if (prev[categoryId]) URL.revokeObjectURL(prev[categoryId]);
      next[categoryId] = file ? URL.createObjectURL(file) : null;
      return next;
    });
  };

  const getFileByteArray = (file) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(new Uint8Array(reader.result));
      reader.readAsArrayBuffer(file);
    });

  const uploadCategoryPhoto = async (file) => {
    const byteArray = await getFileByteArray(file);
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([byteArray], { type: file.type }),
      file.name,
    );
    formData.append("fileName", file.name);
    const response = await fetch(`${CATEGORY_IMAGE_UPLOAD}${file.name}`, {
      method: "POST",
      headers: { Accept: "text/plain" },
      body: formData,
    });
    if (!response.ok) throw new Error("Image upload failed");
    const responseData = await response.text();
    return responseData || "";
  };

  const closeCategoriesModal = () => {
    Object.values(categoryPhotoPreviews).forEach((url) => {
      if (url) URL.revokeObjectURL(url);
    });
    setShowCategoriesModal(false);
    setRecentCategories([]);
    setCategoryPhotoFiles({});
    setCategoryPhotoPreviews({});
    setCategoryImageUrls({});
    setCategoriesError("");
  };
  // Uploads the picked photo (if any), then PUTs the category back to
  // UpdateCategoriesDetails with Status "Approved" and the uploaded image
  // filename in Images. The "id" is passed both in the body and as the
  // query param, matching the pattern used for products above.
  const handleSubmitCategoryApproval = async (category) => {
    const file = categoryPhotoFiles[category.id];
    if (!file) {
      setCategoriesError("Please choose an image before submitting.");
      return;
    }
    setCategoriesError("");
    setCategorySubmittingId(category.id);
    try {
      const uploadedFilename = await uploadCategoryPhoto(file);
      // The GET response appears to come back camelCase (ASP.NET Core's
      // default), so read each field tolerant of either casing.
      const categoryName = category.CategoryName ?? category.categoryName;
      const dateVal = category.Date ?? category.date;
      const vendorIdVal = category.VendorId ?? category.vendorId;
      const idVal = category.id ?? category.Id;
      const existingImages = category.Images ?? category.images ?? [];
      // Images is a List<string> on the backend (Categoriesss model),
      // so this must be an array of plain filename strings — not
      // objects.
      const images = uploadedFilename ? [uploadedFilename] : existingImages;

      const payload = {
        id: idVal,
        Images: images,
        CategoryName: categoryName,
        Status: "Approved",
        Date: dateVal,
        VendorId: vendorIdVal,
      };

      const res = await fetch(`${UPDATE_VENDOR_CATEGORY}?id=${idVal}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Request failed with status ${res.status}`);

      setRecentCategories((prev) => prev.filter((c) => c.id !== category.id));
      setCategoryPhotoFiles((prev) => {
        const next = { ...prev };
        delete next[category.id];
        return next;
      });
      setCategoryPhotoPreviews((prev) => {
        if (prev[category.id]) URL.revokeObjectURL(prev[category.id]);
        const next = { ...prev };
        delete next[category.id];
        return next;
      });
      alert(`"${categoryName}" approved.`);
    } catch (err) {
      console.error("Failed to approve category", err);
      setCategoriesError("Unable to submit this category. Please try again.");
    } finally {
      setCategorySubmittingId(null);
    }
  };

  const renderProductCard = (p) => {
    const master = catalogById[String(p.productIds)];
    const photo = imageUrls[p.productIds];
    const checked = !!productApproval[p.productIds];
    return (
      <div className="col-12 col-sm-6 col-lg-4" key={p.productIds}>
        <label
          className={`border rounded p-2 d-flex gap-2 align-items-center w-100 ${checked ? "border-success border-2" : ""}`}
          style={{ cursor: "pointer" }}
        >
          <input
            type="checkbox"
            className="form-check-input mt-0 flex-shrink-0"
            checked={checked}
            onChange={() => toggleProductApproval(p.productIds)}
          />
          <div
            className="flex-shrink-0 bg-light rounded d-flex align-items-center justify-content-center overflow-hidden"
            style={{ width: 48, height: 48 }}
          >
            {photo ? (
              <img
                src={photo}
                alt={master?.name || "Product"}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span className="text-muted" style={{ fontSize: "9px" }}>
                No image
              </span>
            )}
          </div>
          <div className="small">
            <div className="fw-bold">
              {master?.name || `Product ${p.productIds}`}
            </div>
            <div>
              Qty: {p.quantity} &middot; Discount: {p.discount}% &middot; Limit:{" "}
              {p.limit}
            </div>
          </div>
        </label>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container py-4">
        <SuperAdminNav active="/superadmin/vendors" />
        <div
          className="d-flex justify-content-center align-items-center"
          style={{ minHeight: "50vh" }}
        >
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <SuperAdminNav active="/superadmin/vendors" />

      <button
        className="btn btn-link px-0 mb-3"
        onClick={() => navigate("/superadmin/vendors")}
      >
        &larr; Back to vendors
      </button>

      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      {!record && !error && (
        <div className="text-muted text-center py-5">
          This vendor hasn't submitted any products yet.
        </div>
      )}

      {record && (
        <>
         <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
          <div className="d-flex align-items-center gap-3">
            
            {/* Vendor Store Icon */}
            <div
              className="position-relative rounded border bg-light d-flex align-items-center justify-content-center overflow-hidden"
              style={{
                width: 90,
                height: 90,
              }}
            >
              {vendorStoreImage ? (
                <img
                  src={vendorStoreImage}
                  alt={record.storeName || "Vendor Store"}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <span
                  className="text-muted text-center"
                  style={{ fontSize: "12px" }}
                >
                  No Store Icon
                </span>
              )}
            </div>

            <div>
              <h3 className="mb-1">
                {record.storeName || "Vendor"}
              </h3>

              <div className="text-muted small">
                {totalProducts} product
                {totalProducts === 1 ? "" : "s"} across{" "}
                {(record.categorie || []).length} categor
                {(record.categorie || []).length === 1
                  ? "y"
                  : "ies"}
              </div>

              {vendorStoreImageName && (
                <div
                  className="text-muted small mt-1"
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "9px",
                    objectFit: "contain",
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {vendorStoreImageName}
                </div>
              )}

              {/* Upload Vendor Store Icon */}
              <label
                className="btn btn-sm btn-outline-primary mt-2"
                style={{ cursor: "pointer" }}
              >
                📷 Upload Vendor Store Icon

                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleVendorStoreImageUpload}
                  disabled={saving || imageUploading}
                />
              </label>

              {imageUploading && (
                <div className="small text-muted mt-1">
                  Preparing image...
                </div>
              )}
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
          <span
            className={`badge ${statusBadgeClass(record.status)} fs-6`}
          >
            {record.status || "Pending"}
          </span>
            <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                onClick={fetchRecentProducts}
              >
                New products
              </button>
               <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                onClick={fetchRecentCategories}
              >
                Recent Vendor Categories
              </button>
            </div>
        </div>

          {/* ---- Pincodes this vendor is assigned to service ---- */}
          <div className="mb-2">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 ">
              <h6 className="mb-0">Serviceable pincodes</h6>
              <div className="d-flex align-items-center gap-2">
                {selectedPincodes.length > 0 && (
                  <span className="badge bg-primary">
                    {selectedPincodes.length} pincode
                    {selectedPincodes.length === 1 ? "" : "s"} selected
                  </span>
                )}
                {pincodesChanged && (
                  <button
                    className="btn btn-sm btn-outline-primary"
                    disabled={saving}
                    onClick={handleSavePincodes}
                  >
                    {saving ? "Saving..." : "Save pincodes"}
                  </button>
                )}
              </div>
            </div>
            <p className="text-muted small mb-2">
              The pincode mapping can be changed at any time, regardless of the
              current approval status.
            </p>
            {/* Flat list, bound to the "pincodes" array on the vendor
                record itself — no zone grouping. */}
            <div className="d-flex flex-wrap gap-3">
              {(record?.pincodes || []).map((pin) => (
                <label
                  key={pin}
                  className="d-flex align-items-center gap-2 small mb-0"
                  style={{ cursor: "pointer" }}
                >
                  <input
                    type="checkbox"
                    className="form-check-input mt-0"
                    checked={selectedPincodes.includes(pin)}
                    onChange={() => togglePincode(pin)}
                  />
                  {pin}
                </label>
              ))}
            </div>
          </div>

          {/* ---- Approved products — checked here, visible to customers ---- */}
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
            <h5 className="mb-0">
              Approved{" "}
              {approvedCategories.length > 0 && (
                <span className="badge bg-success ms-1">
                  {approvedCategories.reduce(
                    (sum, c) => sum + c.products.length,
                    0,
                  )}
                </span>
              )}
            </h5>
            <div className="d-flex align-items-center gap-2">
              {categoryOrderChanged && (
                <button
                  className="btn btn-sm btn-outline-primary"
                  disabled={saving}
                  onClick={handleSaveCategoryOrder}
                >
                  {saving ? "Saving..." : "Save category order"}
                </button>
              )}
              {approvalChanged && (
                <button
                  className="btn btn-sm btn-success"
                  disabled={saving}
                  onClick={handleSaveApprovals}
                >
                  {saving ? "Saving..." : "Save approval changes"}
                </button>
              )}
            </div>
          </div>

          {approvedCategories.length === 0 ? (
            <p className="text-muted small mb-4">No products approved yet.</p>
          ) : (
            approvedCategories.map((cat) => {
              const fullIndex = orderedCategories.findIndex(
                (c) => c.categoryName === cat.categoryName,
              );
              return (
                <div key={cat.categoryName} className="mb-4">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span className="badge bg-secondary">#{cat.rank}</span>
                    <CategorySelectAllCheckbox
                      categoryName={cat.categoryName}
                      orderedCategories={orderedCategories}
                      productApproval={productApproval}
                      onToggle={toggleCategoryApproval}
                    />
                    <h6 className="mb-0">{cat.categoryName}</h6>
                    <div
                      className="btn-group btn-group-sm ms-auto"
                      role="group"
                    >
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        title="Move up"
                        disabled={fullIndex <= 0}
                        onClick={() => moveCategory(fullIndex, -1)}
                      >
                        &uarr;
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        title="Move down"
                        disabled={
                          fullIndex === -1 ||
                          fullIndex >= orderedCategories.length - 1
                        }
                        onClick={() => moveCategory(fullIndex, 1)}
                      >
                        &darr;
                      </button>
                    </div>
                  </div>
                  <div className="row g-2">
                    {cat.products.map(renderProductCard)}
                  </div>
                </div>
              );
            })
          )}

          {/* ---- Pending approval — unchecked here, hidden from customers until approved ---- */}
          <h5 className="mt-4 mb-2">
            Pending approval{" "}
            {pendingCategories.length > 0 && (
              <span className="badge bg-warning text-dark ms-1">
                {pendingCategories.reduce(
                  (sum, c) => sum + c.products.length,
                  0,
                )}
              </span>
            )}
          </h5>

          {pendingCategories.length === 0 ? (
            <p className="text-muted small mb-4">
              Nothing pending — every product has been reviewed.
            </p>
          ) : (
            pendingCategories.map((cat) => (
              <div key={cat.categoryName} className="mb-4">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <CategorySelectAllCheckbox
                    className = "border-dark"
                    categoryName={cat.categoryName}
                    orderedCategories={orderedCategories}
                    productApproval={productApproval}
                    onToggle={toggleCategoryApproval}
                  />
                  <h6 className="mb-0">{cat.categoryName}</h6>
                </div>
                <div className="row g-2">
                  {cat.products.map(renderProductCard)}
                </div>
              </div>
            ))
          )}

          <div className="d-flex gap-2 mt-2">
            <button
              className="btn btn-success"
              disabled={saving}
              onClick={handleSaveApprovals}
            >
              {saving
                ? "Saving..."
                : record.status === "Approved"
                  ? "Re-approve"
                  : "Approve"}
            </button>
            <button
              className="btn btn-outline-danger"
              disabled={saving}
              onClick={() => handleDecision("Reject")}
            >
              Reject
            </button>
          </div>
        </>
      )}
        {/* ---- Recent Products modal ---- */}
      {showRecentModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ background: "rgba(0,0,0,0.5)", zIndex: 1050 }}
          onClick={closeRecentModal}
        >
          <div
            className="bg-white rounded p-3"
            style={{
              maxWidth: 720,
              width: "95%",
              maxHeight: "85vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">New Products</h5>
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={closeRecentModal}
              ></button>
            </div>

            {recentLoading && (
              <div className="d-flex justify-content-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            )}

            {!recentLoading && recentError && (
              <div className="alert alert-danger">{recentError}</div>
            )}

            {!recentLoading && !recentError && recentProducts.length === 0 && (
              <p className="text-muted text-center py-3">
                No recent products found.
              </p>
            )}

            {!recentLoading &&
              recentProducts.map((item) => {
                const decision = recentDecisions[item.id] || {
                  decision: "Approve",
                  comment: "",
                };
                const imgUrl = recentImageUrls[item.id];
                const isSubmitting = recentSubmittingId === item.id;

                return (
                  <div key={item.id} className="border rounded p-3 mb-3">
                    <div className="text-center fw-bold fs-5 mb-3">
                      🛒 Grocery Approval 🛒
                    </div>
                    <div className="row g-3">
                      <div className="col-4">
                        <div
                          className="bg-light rounded d-flex align-items-center justify-content-center overflow-hidden"
                          style={{ height: 140 }}
                        >
                          {imgUrl ? (
                            <img
                              src={imgUrl}
                              alt={item.name}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          ) : Array.isArray(item.images) && item.images[0] ? (
                            <span className="text-muted small">Loading...</span>
                          ) : (
                            <span className="text-muted small">No image</span>
                          )}
                        </div>
                      </div>
                      <div className="col-8">
                        <div className="row small">
                          <div className="col-6 mb-2">
                            <strong>Name:</strong> {item.name}
                          </div>
                          <div className="col-6 mb-2">
                            <strong>Requested By:</strong> {item.requestedBy}
                          </div>
                          <div className="col-6 mb-2">
                            <strong>Category:</strong> {item.category}
                          </div>
                          <div className="col-6 mb-2">
                            <strong>Delivery In:</strong> {item.deliveryIn}{" "}
                            Minutes
                          </div>
                          <div className="col-6 mb-2">
                            <strong>Rate:</strong> Rs {item.mrp} /-
                          </div>
                          <div className="col-6 mb-2">
                            <strong>Units:</strong> {item.units}
                          </div>
                          <div className="col-6 mb-2">
                            <strong>Discount:</strong> {item.discount}%
                          </div>
                          <div className="col-6 mb-2">
                            <strong>Code:</strong> {item.code}
                          </div>
                          <div className="col-6 mb-2 text-success">
                            <strong>Final Price:</strong> Rs{" "}
                            {item.afterDiscount} /-
                          </div>
                          <div className="col-6 mb-2">
                            <strong>Manufacture Date:</strong>{" "}
                            {item.manufactureDate || "-"}
                          </div>
                          <div className="col-6 mb-2">
                            <strong>Stock Left:</strong> {item.stockLeft}
                          </div>
                          <div className="col-6 mb-2">
                            <strong>Expiry Date:</strong>{" "}
                            {item.expiryDate || "-"}
                          </div>
                          <div className="col-6 mb-2">
                            <strong>Limit:</strong> {item.limit}
                          </div>
                        </div>
                      </div>
                    </div>

                    <hr />

                    <div className="mb-2">
                      <strong className="d-block mb-1">Approval Status</strong>
                      <div className="d-flex gap-3">
                        <label className="d-flex align-items-center gap-1 mb-0">
                          <input
                            type="radio"
                            name={`recent-decision-${item.id}`}
                            checked={decision.decision === "Approve"}
                            onChange={() =>
                              setRecentDecision(item.id, "decision", "Approve")
                            }
                          />
                          Approve
                        </label>
                        <label className="d-flex align-items-center gap-1 mb-0">
                          <input
                            type="radio"
                            name={`recent-decision-${item.id}`}
                            checked={decision.decision === "Reject"}
                            onChange={() =>
                              setRecentDecision(item.id, "decision", "Reject")
                            }
                          />
                          Reject
                        </label>
                      </div>
                    </div>

                    <textarea
                      className="form-control mb-2"
                      placeholder="Comments (optional)"
                      rows={2}
                      value={decision.comment}
                      onChange={(e) =>
                        setRecentDecision(item.id, "comment", e.target.value)
                      }
                    />

                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-success btn-sm"
                        disabled={isSubmitting}
                        onClick={() => handleSubmitRecentDecision(item)}
                      >
                        {isSubmitting ? "Submitting..." : "Submit"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-warning btn-sm"
                        disabled={isSubmitting}
                        onClick={closeRecentModal}
                      >
                        Back
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ---- Recent Vendor Categories modal ---- */}

      {showCategoriesModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ background: "rgba(0,0,0,0.5)", zIndex: 1050 }}
          onClick={closeCategoriesModal}
        >
          <div
            className="bg-white rounded p-3"
            style={{
              maxWidth: 720,
              width: "95%",
              maxHeight: "85vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">Recent Vendor Categories</h5>
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={closeCategoriesModal}
              ></button>
            </div>

            {categoriesLoading && (
              <div className="d-flex justify-content-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            )}

            {!categoriesLoading && categoriesError && (
              <div className="alert alert-danger">{categoriesError}</div>
            )}

            {!categoriesLoading &&
              !recentCategories.length &&
              !categoriesError && (
                <p className="text-muted text-center py-3">
                  No categories found for this vendor.
                </p>
              )}

            {!categoriesLoading &&
              recentCategories.map((cat) => {
                const isSubmitting = categorySubmittingId === cat.id;
                const preview = categoryPhotoPreviews[cat.id];
                const existingImage = categoryImageUrls[cat.id];
                const status = cat.Status || cat.status || "";
                const categoryDisplayName =
                  cat.CategoryName ?? cat.categoryName ?? "Unnamed category";

                return (
                  <div key={cat.id} className="border rounded p-3 mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h6 className="mb-0">{categoryDisplayName}</h6>
                      {status && (
                        <span className={`badge ${statusBadgeClass(status)}`}>
                          {status}
                        </span>
                      )}
                    </div>

                    <div className="row g-3 align-items-center">
                      <div className="col-4">
                        <div
                          className="bg-light rounded d-flex align-items-center justify-content-center overflow-hidden"
                          style={{ height: 120 }}
                        >
                          {preview ? (
                            <img
                              src={preview}
                              alt={cat.CategoryName}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          ) : existingImage ? (
                            <img
                              src={existingImage}
                              alt={cat.CategoryName}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <span className="text-muted small">No image</span>
                          )}
                        </div>
                      </div>
                      <div className="col-8">
                        <label
                          className="form-label mb-1"
                          style={{ fontSize: "13px" }}
                        >
                          Category image
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          className="form-control form-control-sm"
                          onChange={(e) =>
                            handleCategoryPhotoChange(
                              cat.id,
                              e.target.files?.[0] || null,
                            )
                          }
                        />
                        <div className="text-muted small mt-1">
                          Choosing a photo and submitting will mark this
                          category as Approved.
                        </div>
                      </div>
                    </div>

                    <div className="d-flex gap-2 mt-3">
                      <button
                        type="button"
                        className="btn btn-success btn-sm"
                        disabled={isSubmitting}
                        onClick={() => handleSubmitCategoryApproval(cat)}
                      >
                        {isSubmitting ? "Submitting..." : "Submit"}
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>      
  );
};

export default SuperAdminVendorProductsPage;