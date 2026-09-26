import React, { useEffect, useState, useCallback } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import axios from "axios";
import "../App.css";
import { useParams, useNavigate } from "react-router-dom";
import { Modal, Button, Form } from "react-bootstrap";
import Footer from "../CommonPages/Footer.js";
import { getLocalCashbackOffers } from "../utils/localCashbackOffers";
import { CartStorage } from "../CommonPages/CartStorage";
import { invalidateVendorProductsCache } from "../utils/vendorListStore";
// import { appConfig } from "./config";
  
const GET_VENDOR_PRODUCTS_URL =
  "https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/VendorUploadProducts/GetVendorProductsvalues";
const UPDATE_VENDOR_PRODUCTS_URL =
  "https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/VendorUploadProducts/UpdateVendorProductsValues";

const DEFAULT_CASHBACK_RULES = [
  { minAmount: 499, maxAmount: 998, cashback: 30 },
  { minAmount: 999, maxAmount: 1498, cashback: 50 },
  { minAmount: 1499, maxAmount: 1998, cashback: 100 },
  { minAmount: 1999, maxAmount: 2998, cashback: 150 },
  { minAmount: 2999, maxAmount: null, cashback: 250 },
];

const CASHBACK_CONFIG_TOKENS = [
  "grocery cashback rules",
  "cashback rules",
  "cashback config",
  "cashback-config",
];

const normalizeRuleNumber = (value) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const normalizeCashbackRule = (rule) => {
  if (!rule || typeof rule !== "object") return null;
  const minAmount = normalizeRuleNumber(
    rule.minAmount ?? rule.min ?? rule.greaterThan ?? rule.threshold,
  );
  const maxAmount = normalizeRuleNumber(rule.maxAmount ?? rule.max ?? null);
  const cashback = normalizeRuleNumber(
    rule.cashback ?? rule.amount ?? rule.reward,
  );

  if (minAmount === null || cashback === null) return null;
  return {
    minAmount,
    maxAmount,
    cashback,
  };
};

const parseCashbackRules = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map(normalizeCashbackRule).filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      const jsonRules = parseCashbackRules(parsed);
      if (jsonRules.length > 0) {
        return jsonRules;
      }
    } catch {
      // Fallback to line-based parsing below.
    }

    return trimmed
      .split(/\r?\n|;/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const match = line.match(
          /^(?:>=\s*)?(\d+)(?:\s*-\s*(\d+)|\s*\+)?\s*[:=,>]\s*(\d+)$/,
        );
        if (!match) return null;
        return normalizeCashbackRule({
          minAmount: match[1],
          maxAmount: match[2] ?? null,
          cashback: match[3],
        });
      })
      .filter(Boolean);
  }
  return [];
};

const sortCashbackRules = (rules) =>
  [...rules].sort((a, b) => {
    if (a.minAmount !== b.minAmount) return a.minAmount - b.minAmount;
    if (a.maxAmount === null) return 1;
    if (b.maxAmount === null) return -1;
    return a.maxAmount - b.maxAmount;
  });

const isCashbackConfigBanner = (banner) => {
  const haystack = [banner?.title, banner?.header, banner?.footer]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return CASHBACK_CONFIG_TOKENS.some((token) => haystack.includes(token));
};

const getActiveCashbackRulesFromBanners = (banners) => {
  const now = Date.now();
  const configBanner = (Array.isArray(banners) ? banners : [])
    .filter(isCashbackConfigBanner)
    .filter((banner) => {
      const start = banner?.startDate ? Date.parse(banner.startDate) : null;
      const end = banner?.endDate ? Date.parse(banner.endDate) : null;
      const startOk = start === null || Number.isNaN(start) || start <= now;
      const endOk = end === null || Number.isNaN(end) || end >= now;
      return startOk && endOk;
    })
    .sort((a, b) => {
      const aTime = Date.parse(a?.updatedDate || a?.createdDate || 0) || 0;
      const bTime = Date.parse(b?.updatedDate || b?.createdDate || 0) || 0;
      return bTime - aTime;
    })[0];

  if (!configBanner) return [];

  return sortCashbackRules(
    parseCashbackRules(
      configBanner.description || configBanner.footer || configBanner.header,
    ),
  );
};

const computeCashback = (total, rules) => {
  const numericTotal = Number(total) || 0;

  for (const rule of rules) {
    const min = Number(rule.minAmount);

    const max =
      rule.maxAmount === null ||
      rule.maxAmount === undefined ||
      rule.maxAmount === ""
        ? Infinity
        : Number(rule.maxAmount);

    if (numericTotal >= min && numericTotal <= max) {
      return Number(rule.cashback) || 0;
    }
  }

  return 0;
};

const GroceryPaymentmethod = () => {
  const navigate = useNavigate();
  const { userType } = useParams();
  const { userId } = useParams();
  const { groceryItemId } = useParams();
  const [isMobile, setIsMobile] = useState(false);
  const [isChecked, setIsChecked] = useState(true);
  // const [selectedPayment] = useState("cash");
  const [error, setError] = useState("");
  const [martId, setMartId] = useState("");
  const [totalItemsSelected, setTotalItemsSelected] = useState("");
  const [limit, setLimit] = useState("");
  const [grandTotal, setGrandTotal] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [walletAmount] = useState("");
  // const [walletAmount, setWalletAmount] = useState("");
  const [cartData, setCartData] = useState(null);
  const [addressData, setAddressData] = useState({
    fullName: "",
    mobileNumber: "",
    address: "",
    state: "",
    district: "",
    zipCode: "",
    walletAmount: "",
  });
  const [addresses, setAddresses] = useState([]);
  const [newAddress, setNewAddress] = useState("");
  const [state, setState] = useState("");
  const [districtList, setDistrictList] = useState([]);
  const [stateList, setStateList] = useState([]);
  const [district, setDistrict] = useState("");
  const [fullName, setFullName] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showModals, setShowModals] = useState(false);
  const [mobileNumber, setMobileNumber] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [guestCustomerId, setGuestCustomerId] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [shouldBlink, setShouldBlink] = useState(false);
  const [groceryId, setgroceryId] = useState();
  const [groceryData, setgroceryData] = useState();
  // const [referralRec, setReferralRec] = useState(null);
  // const [referralPoints, setReferralPoints] = useState(0);
  // const [referralAmount, setReferralAmount] = useState(0);
  // const [netPayable, setNetPayable] = useState(0);
  const [vendorId, setVendorId] = useState("");
  const [isOffersOrder, setIsOffersOrder] = useState(false);
  const [isNewUser, setIsNewUser] = useState(true);
  const isGuestName = (name) => (name ?? "").trim().toLowerCase() === "guest";
  const [loading, setLoading] = useState(false);
  const [offerWalletAmount, setOfferWalletAmount] = useState(0);
  const [offerTransactionId, setOfferTransactionId] = useState("");
  const [offerTransaction, setOfferTransaction] = useState(null);
  const [cashbackRules, setCashbackRules] = useState(DEFAULT_CASHBACK_RULES);
  const [pincodeList, setPincodeList] = useState([]);
  const [pincodesLoading, setPincodesLoading] = useState(false);
  const [tempStateId, setTempStateId] = useState("");
  const [tempState, setTempState] = useState("");

  const [tempDistrictId, setTempDistrictId] = useState("");
  const [tempDistrict, setTempDistrict] = useState("");

  const [tempZipCode, setTempZipCode] = useState("");
  // const readServerPoints = (record) => {
  // const raw =
  // record?.referralPoints ??
  // record?.referralpoints ??
  // record?.ReferralPoints ??
  // 0;
  // const n = Number(raw);
  // return Number.isFinite(n) ? n : 0;
  // };

  useEffect(() => {
    console.log("Addresses:", addresses);
    const primary = addresses.find((a) => a.type === "primary");
    console.log("ZipCode:", primary?.zipCode);
  }, [addresses]);

  useEffect(() => {
    console.log(
      offerTransaction,
      isOffersOrder,
      error,
      limit,
      loading,
      isChecked,
      editingAddressId,
      customerName,
      groceryId,
    );
  }, [
    offerTransaction,
    isOffersOrder,
    error,
    limit,
    loading,
    isChecked,
    editingAddressId,
    customerName,
    groceryId,
  ]);

  useEffect(() => {
    let cancelled = false;

    const loadCashbackRules = async () => {
      try {
        const data = getLocalCashbackOffers();
        const rules = getActiveCashbackRulesFromBanners(data);
        if (!cancelled && rules.length > 0) {
          setCashbackRules(rules);
          return;
        }
        if (!cancelled) {
          setCashbackRules(DEFAULT_CASHBACK_RULES);
        }
      } catch (cashbackError) {
        console.error("Failed to load cashback rules:", cashbackError);
        if (!cancelled) {
          setCashbackRules(DEFAULT_CASHBACK_RULES);
        }
      }
    };

    loadCashbackRules();
    return () => {
      cancelled = true;
    };
  }, []);

  const numericGrandTotal = Number(grandTotal) || 0;
  const cashback = computeCashback(numericGrandTotal, cashbackRules);
  // let giftName = "";

  const isFirstOrderMinNotReached = isNewUser && numericGrandTotal < 150;
  const primaryAddress = addresses.find((addr) => addr.type === "primary");
  const wallet = Number(offerWalletAmount || 0);
  const gt = Number(grandTotal || 0);
  // FIRST ORDER
  let walletToUse = 0;

  if (wallet > 0 && gt >= 100) {
    const eligibleWalletUsage = Math.floor(gt / 100) * 10;

    walletToUse = Math.min(wallet, eligibleWalletUsage);
  }

  // Final payable amount
  const netPayables = gt - walletToUse;
  const remainingWallet = wallet - walletToUse;
  const finalWalletBalance = remainingWallet + cashback;

  useEffect(() => {
    const fetchCart = async () => {
      if (!groceryItemId) return;
      const ctrl = new AbortController();
      try {
        const res1 = await fetch(
          `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/Mart/GetProductDetails?id=${groceryItemId}`,
          { signal: ctrl.signal },
        );
        if (!res1.ok) throw new Error("Failed to fetch product details");
        const data = await res1.json();
        setCartData(data);
        const catNames = Array.isArray(data?.categories)
          ? data.categories.map((c) =>
              String(c?.categoryName || "")
                .trim()
                .toLowerCase(),
            )
          : [];
        const onlyOffers =
          catNames.length > 0 && catNames.every((n) => n === "offers");
        setIsOffersOrder(onlyOffers);
        setMartId(data.martId);
        setVendorId(data.vendorId);
        setGrandTotal(data.grandTotal);
        setTotalItemsSelected(data.totalItemsSelected);
        setCustomerName(data.customerName);
        setLimit(data.limit);

        const products = (data?.categories ?? []).flatMap(
          (c) => c?.products ?? [],
        );
        const selected = products.filter(
          (p) =>
            p?.isSelected || p?.selected || (p?.qty ?? p?.quantity ?? 0) > 0,
        );
        const baseList = selected.length ? selected : products;
        const productNames = Array.from(
          new Set(baseList.map((p) => p?.productName?.trim()).filter(Boolean)),
        );
        if (productNames.length === 0) {
          console.warn("⚠️ No product names found in the first API response");
          setgroceryData([]);
          setgroceryId(null);
          return;
        }
        const requests = productNames.map(async (name) => {
          const url = `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/UploadGrocery/GetGroceryItemsByProductName?productName=${encodeURIComponent(
            name,
          )}`;
          const res = await fetch(url, { signal: ctrl.signal });
          if (!res.ok)
            throw new Error(
              `UploadGrocery failed for "${name}" (HTTP ${res.status})`,
            );
          const items = await res.json();
          const arr = Array.isArray(items) ? items : items ? [items] : [];
          return arr.map((it) => ({ ...it, _matchedProductName: name }));
        });
        const settled = await Promise.allSettled(requests);
        const allItems = [];
        settled.forEach((r, idx) => {
          const n = productNames[idx];
          if (r.status === "fulfilled") {
            allItems.push(...r.value);
          } else {
            console.warn(`UploadGrocery lookup failed for "${n}":`, r.reason);
          }
        });
        setgroceryData(allItems);
        const firstId = allItems?.[0]?.id ?? null;
        setgroceryId(firstId);
        console.log("✅ Combined UploadGrocery items:", allItems);
        console.log("✅ First grocery id:", firstId);
      } catch (err) {
        if (err?.name === "AbortError") return;
        setError(err.message || String(err));
        console.error("Error fetching cart data:", err);
      }
      return () => ctrl.abort();
    };
    fetchCart();
  }, [groceryItemId]);

  const fetchCustomerData = useCallback(async () => {
    try {
      const response = await fetch(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/Address/GetAddressById/${userId}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch customer profile data");
      }

      const data = await response.json();

      console.log("Customer Address API Response:", data);

      const apiAddresses = Array.isArray(data) ? data : [data];

      const formattedAddresses = apiAddresses.map((addr) => ({
        id: addr.id,
        addressId: addr.addressId,
        type: addr.isPrimaryAddress ? "primary" : "secondary",

        address: addr.address || "",

        state: addr.state || "",

        stateId: addr.stateId ?? addr.StateId ?? "",

        district: addr.district || "",

        districtId: addr.districtId ?? addr.DistrictId ?? "",

        zipCode: addr.zipCode || "",

        emailAddress: addr.emailAddress || "",

        mobileNumber: addr.mobileNumber || "",

        fullName: addr.fullName || "",

        walletAmount: addr.walletAmount,
      }));

      console.log("Formatted Addresses:", formattedAddresses);

      setAddresses(formattedAddresses);

      const primary =
        formattedAddresses.find((addr) => addr.type === "primary") ||
        formattedAddresses[0];

      if (primary) {
        // Existing values
        setFullName(primary.fullName || "");
        setMobileNumber(primary.mobileNumber || "");
        setNewAddress(primary.address || "");

        setState(primary.state || "");
        setDistrict(primary.district || "");
        setZipCode(primary.zipCode || "");

        // Initialize temporary values from saved address
        setTempStateId(primary.stateId || "");
        setTempState(primary.state || "");

        setTempDistrictId(primary.districtId || "");
        setTempDistrict(primary.district || "");

        setTempZipCode(primary.zipCode || "");
        // Address data
        setAddressData({
          fullName: primary.fullName || "",
          mobileNumber: primary.mobileNumber || "",
          address: primary.address || "",
          state: primary.state || "",
          district: primary.district || "",
          zipCode: primary.zipCode || "",
          walletAmount: primary.walletAmount || "",
        });
        setGuestCustomerId(primary.id);
        setEditingAddressId(primary.addressId);
      }

      const apiFullName = primary?.fullName ?? "";

      if (!apiFullName || isGuestName(apiFullName)) {
        setIsNewUser(true);
      } else {
        setIsNewUser(false);
      }
    } catch (error) {
      console.error("Error fetching customer data:", error);
    }
  }, [userId]);

  useEffect(() => {
    fetchCustomerData();
  }, [fetchCustomerData]);

  // GET STATES
  useEffect(() => {
    axios
      .get(
        "https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/MasterData/getStates",
      )
      .then((response) => {
        const data = Array.isArray(response.data) ? response.data : [];
        console.log("States API Response:", data);
        setStateList(data);
      })
      .catch((error) => {
        console.error("Error fetching states:", error);
        setStateList([]);
      });
  }, []);

  // GET DISTRICTS WHEN TEMPORARY STATE CHANGES
  useEffect(() => {
    // No state selected
    if (!tempStateId) {
      setDistrictList([]);
      return;
    }

    console.log("Loading districts for StateId:", tempStateId);

    axios
      .get(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/MasterData/getDistricts/${tempStateId}`,
      )
      .then((response) => {
        const data = Array.isArray(response.data) ? response.data : [];

        console.log("District API Response:", data);

        setDistrictList(data);
      })
      .catch((error) => {
        console.error("Error fetching districts:", error);
        setDistrictList([]);
      });
  }, [tempStateId]);

  // GET PINCODES WHEN TEMPORARY DISTRICT CHANGES
  useEffect(() => {
    if (!tempDistrictId) {
      setPincodeList([]);
      setPincodesLoading(false);
      return;
    }

    console.log("Loading pincodes for DistrictId:", tempDistrictId);

    setPincodesLoading(true);
    setPincodeList([]);

    axios
      .get(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/MasterData/getPincodes/${tempDistrictId}`,
      )
      .then((response) => {
        const data = Array.isArray(response.data) ? response.data : [];

        console.log("Pincode API Response:", data);

        setPincodeList(data);
      })
      .catch((error) => {
        console.error("Error fetching pincodes:", error);
        setPincodeList([]);
      })
      .finally(() => {
        setPincodesLoading(false);
      });
  }, [tempDistrictId]);

  useEffect(() => {
    const fetchOfferWalletAmount = async () => {
      try {
        const response = await fetch(
          `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/OffersTransactions/GetOfferTransactionByUserId?userId=${userId}`,
        );
        if (!response.ok) throw new Error("Failed to fetch offer transaction");

        const data = await response.json();
        console.log("✅ Offer Transaction API Response:", JSON.stringify(data));

        if (Array.isArray(data) && data.length > 0) {
          const transaction = data[0];

          console.log("✅ Transaction Object:", transaction);
          console.log("✅ Transaction ID (id):", transaction.id);

          setOfferTransaction(transaction);
          setOfferTransactionId(transaction.id);
          setOfferWalletAmount(Number(transaction.remainingAmount || 0));

          console.log("✅ offerTransactionId set to:", transaction.id);
          console.log(
            "✅ offerWalletAmount set to:",
            transaction.remainingAmount,
          );
        } else {
          console.warn("⚠️ No offer transactions found for userId:", userId);
        }
      } catch (error) {
        console.error("❌ Error fetching offer wallet amount:", error);
      }
    };

    if (userId) {
      fetchOfferWalletAmount();
    }
  }, [userId]);

  console.log("Wallet Amount:", offerWalletAmount);

  // Reset address form fields
  const resetAddressForm = () => {
    setFullName("");
    setMobileNumber("");
    setNewAddress("");
    setState("");
    setDistrict("");
    setZipCode("");
  };

  const openAddAddress = () => {
    setFullName("");
    setMobileNumber("");
    setNewAddress("");
    const primary = addresses.find((addr) => addr.type === "primary");
    setMobileNumber(primary?.mobileNumber || "");
    setFullName(primary?.fullName || "");
    // Clear permanent values
    setState("");
    setDistrict("");
    setZipCode("");

    // Clear temporary values
    setTempStateId("");
    setTempState("");
    setTempDistrictId("");
    setTempDistrict("");
    setTempZipCode("");

    // Clear dependent lists
    setDistrictList([]);
    setPincodeList([]);

    setIsEditing(false);
    setShowModal(true);
  };

  // Handle address editing
  const handleAddressEdit = async () => {
    // Temporary values selected by the user
    const finalState = tempState;
    const finalStateId = tempStateId;

    const finalDistrict = tempDistrict;
    const finalDistrictId = tempDistrictId;

    const finalZipCode = tempZipCode;

    // Validate required fields
    if (
      !fullName?.trim() ||
      !newAddress?.trim() ||
      !finalState?.trim() ||
      !finalDistrict?.trim() ||
      !finalZipCode?.trim() ||
      !mobileNumber?.trim()
    ) {
      alert("Please fill in all required fields.");
      return;
    }
    if (fullName.trim().toLowerCase() === "guest") {
      alert("Please Change Your Full Name.");
      return;
    }
    // Validate pincode
    if (!/^\d{6}$/.test(finalZipCode)) {
      alert("Pincode must be exactly 6 digits.");
      return;
    }

    // Address object for local state
    const updatedAddress = {
      id: guestCustomerId,
      addressId: editingAddressId,
      fullName,
      mobileNumber,
      address: newAddress,
      state: finalState,
      stateId: finalStateId,
      district: finalDistrict,
      districtId: finalDistrictId,
      zipCode: finalZipCode,
    };

    // API payload
    const payload3 = {
      id: guestCustomerId,
      profileType: "profileType",
      addressId: editingAddressId,
      isPrimaryAddress: true,

      address: newAddress,

      state: finalState,
      district: finalDistrict,

      StateId: finalStateId,
      DistrictId: finalDistrictId,

      zipCode: finalZipCode,

      mobileNumber: mobileNumber,
      emailAddress: "emailAddress",
      userId: userId,
      firstName: fullName,
      lastName: "lastName",
      fullName: fullName,
      WalletAmount: "",
    };

    try {
      // Save address to API
      const response = await fetch(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/Customer/CustomerAddressEdit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload3),
        },
      );

      // IMPORTANT:
      // fetch() uses response.ok, NOT response.data
      if (!response.ok) {
        const errorText = await response.text();

        console.error("Error Response:", errorText);

        throw new Error("Failed to edit address.");
      }

      // =====================================================
      // API SUCCESS
      // ONLY NOW bind temporary values to permanent state
      // =====================================================

      setState(finalState);

      setDistrict(finalDistrict);

      setZipCode(finalZipCode);

      // Update address list locally
      setAddresses((prev) =>
        prev.map((addr) =>
          addr.id === guestCustomerId ? updatedAddress : addr,
        ),
      );

      // Update selected address data
      setAddressData(updatedAddress);

      // Refresh data from API
      await fetchCustomerData();

      // Close modal
      setShowModal(false);
      setIsEditing(false);
      setEditingAddressId(null);

      // Reset form
      resetAddressForm();

      alert("Address Updated Successfully!");
    } catch (error) {
      console.error("Error editing address:", error);

      alert(error.message || "Failed to edit address. Please try again later.");
    }
  };

  const getUserLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject("Geolocation is not supported");
      } else {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          (error) => reject(error),
        );
      }
    });
  };

  console.log("Address:", primaryAddress);

  const isAddressInvalid =
    !primaryAddress ||
    !newAddress?.trim() ||
    !state?.trim() ||
    !district?.trim() ||
    !zipCode?.trim();

  const isOrderDisabled = isAddressInvalid || isFirstOrderMinNotReached;
  useEffect(() => {
    if (isAddressInvalid) {
      setShouldBlink(true);
    } else {
      setShouldBlink(false);
    }
  }, [isAddressInvalid]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleUpdateMartOrder = async () => {
    const primaryAddress = addresses.find((addr) => addr.type === "primary");
    const state = primaryAddress?.state;
    const district = primaryAddress?.district || "";
    const pincode = primaryAddress?.zipCode || primaryAddress?.pincode;
    const mobileNumber = primaryAddress?.mobileNumber;
    const existingWallet = Number(offerWalletAmount || 0);
    const walletAfterUsage = existingWallet - walletToUse;
    const updatedWalletAmount = walletAfterUsage + cashback;
    const location = await getUserLocation();
    const payload = {
      ...cartData,
      customerName: addressData.fullName || fullName,
      address: addressData.address || primaryAddress?.address,
      state: addressData.state || state,
      district: addressData.district || district,
      zipCode: addressData.zipCode || pincode,
      customerPhoneNumber: addressData.mobileNumber || mobileNumber,
      id: groceryItemId,
      userId: userId,
      martId: martId,
      vendorid: vendorId,
      date: new Date(),
      grandTotal: String(netPayables),
      totalItemsSelected: totalItemsSelected,
      status: "Open",
      paymentMode: "",
      utrTransactionNumber: "",
      transactionNumber: "",
      transactionStatus: "",
      paidAmount: "",
      AssignedTo: "",
      DeliveryPartnerUserId: "",
      latitude: location.latitude,
      longitude: location.longitude,
      isPickUp: false,
      isDelivered: false,
      totalWalletAmount: String(updatedWalletAmount),
      availedAmount: String(walletToUse),
      remainingAmount: String(updatedWalletAmount),
      walletAmount: walletAmount,
      deliveryAssignedTime: "",
      deliverySubmitTime: "",
    };
    console.log("📦 Mart Payload:", payload);
    const response = await fetch(
      `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/Mart/UpdateProductDetails/${groceryItemId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    if (!response.ok) {
      const errText = await response.text();
      console.error("❌ Mart update failed:", errText);
      throw new Error("Failed to update mart order.");
    }
    console.log("✅ Mart order updated successfully");
    return updatedWalletAmount;
  };

  const handleUpdateOffersTransaction = async (updatedWalletAmount) => {
    console.log("🔍 offerTransactionId at PUT time:", offerTransactionId);
    console.log("🔍 offerTransaction object at PUT time:", offerTransaction);
    if (!offerTransactionId) {
      console.warn(
        "⚠️ offerTransactionId is missing — skipping offers transaction update",
      );
      return;
    }
    const offersTransactionPayload = {
      id: offerTransactionId,
      userId: userId,
      createdDate: offerTransaction?.createdDate,
      updatedDate: new Date().toISOString(),
      totalWalletAmount: String(updatedWalletAmount),
      availedAmount: String(walletToUse),
      remainingAmount: String(updatedWalletAmount),
    };
    console.log("📦 Offers Transaction Payload:", offersTransactionPayload);
    console.log(
      "📦 PUT URL:",
      `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/OffersTransactions/UpdateOffersTransactionsDetails/${offerTransactionId}`,
    );
    const response = await fetch(
      `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/OffersTransactions/UpdateOffersTransactionsDetails/${offerTransactionId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(offersTransactionPayload),
      },
    );
    if (!response.ok) {
      const errText = await response.text();
      console.error("❌ Offers Transaction update failed:", errText);
      return;
    }
    console.log("✅ Offers transaction updated successfully");
  };

  const handleUpdatePaymentMethod = async () => {
    try {
      const updatedWalletAmount = await handleUpdateMartOrder();
      await handleUpdateOffersTransaction(updatedWalletAmount);
      localStorage.removeItem(`cartSnapshot_${groceryItemId}`);
      localStorage.removeItem("activeOrderId");
      localStorage.removeItem("allCategories");
      CartStorage.clear();
      localStorage.removeItem(`cartMeta_${groceryItemId}`);
      window.alert(
        `🎉 Thank You for Choosing the Handyman App Lakshmi Mart Services!\n` +
          `Your Reference Order Number is ${martId}.\n` +
          `Cashback Earned: ₹${cashback}\n` +
          `Wallet Used: ₹${walletToUse}\n` +
          `Current Wallet Balance: ₹${updatedWalletAmount}.\n` +
          `Delivery Time Intimated Shortly!. 🎉`,
      );
      window.location.href = `/deliveryTracking/${groceryItemId}`;
    } catch (error) {
      console.error("❌ Order placement error:", error);
      alert("Something went wrong while placing the order. Please try again.");
    }
  };

  const normalizeName = (name) => {
    return (name ?? "")
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9]/g, "");
  };

  const buildProductMapFromCart = (cart) => {
    const products = (cart?.categories ?? []).flatMap((c) => c?.products ?? []);
    const map = new Map();
    for (const p of products) {
      const name = normalizeName(p?.productName);
      if (!name) continue;
      const qty =
        Number(
          p?.noOfQuantity ?? p?.noofQuantity ?? p?.qty ?? p?.quantity ?? 0,
        ) || 0;
      const stockLeft =
        Number(p?.stockLeft ?? p?.StockLeft ?? p?.stockleft ?? 0) || 0;
      map.set(name, { qty, stockLeft });
    }
    return map;
  };

  const handleUpdateStockLeft = async () => {
    try {
      if (!Array.isArray(groceryData) || groceryData.length === 0) {
        console.warn("No grocery data to update.");
        return;
      }
      if (!cartData) {
        console.warn("Cart data unavailable.");
        return;
      }
      const productMap = buildProductMapFromCart(cartData);
      const requests = groceryData.map(async (item) => {
        const key = normalizeName(item?._matchedProductName || item?.name);
        if (!key) return null;
        const info = productMap.get(key);
        if (!info) {
          console.warn(`No cart match for grocery item ${item.id} (${key})`);
          return null;
        }
        const prevStock = info.stockLeft;
        const newStock = prevStock;
        const payload = {
          id: item.id,
          date: item.date,
          GroceryItemId: item.groceryItemId,
          Name: item.name,
          Category: item.category,
          Images: Array.isArray(item.images) ? item.images : [],
          MRP: item.mrp,
          Discount: item.discount,
          AfterDiscount: item.afterDiscount,
          StockLeft: String(newStock),
          DeliveryIn: item.deliveryIn,
          RequestedBy: "Admin",
          Status: item.status,
          Code: item.code,
          Units: item.units,
          Limit: item.limit || 0,
        };
        const res = await fetch(
          `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/UploadGrocery/UpdateGroceryItems?id=${encodeURIComponent(item.id)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        if (!res.ok) {
          const msg = await res.text().catch(() => "");
          throw new Error(`Failed for ${item.id}: ${msg}`);
        }
        console.log(`✔ Stock unchanged for ${item.name}: ${prevStock}`);
        return true;
      });
      await Promise.allSettled(requests);
      console.log("Stock updated (unchanged).");
    } catch (error) {
      console.error("Error updating stock:", error);
      alert("Failed to update grocery stock.");
    }
  };

  const handleUpdateVendorProductQuantities = async () => {
    try {
      if (!vendorId) {
        console.warn(
          "[vendorStock] No vendorId available — skipping vendor stock update.",
        );
        return;
      }
      if (
        !Array.isArray(groceryData) ||
        groceryData.length === 0 ||
        !cartData
      ) {
        console.warn(
          "[vendorStock] No order/cart data available — skipping vendor stock update.",
          { groceryData, cartData },
        );
        return;
      }

      const productMap = buildProductMapFromCart(cartData);
      const orderedQtyById = new Map();
      groceryData.forEach((item) => {
        const key = normalizeName(item?._matchedProductName || item?.name);
        const info = productMap.get(key);
        const qty = Number(info?.qty || 0);
        if (item?.id && qty > 0) {
          orderedQtyById.set(String(item.id), qty);
        }
      });

      if (orderedQtyById.size === 0) {
        console.warn(
          "[vendorStock] No ordered quantities resolved — skipping vendor stock update.",
          { groceryData, cartData },
        );
        return;
      }

      const res = await fetch(
        `${GET_VENDOR_PRODUCTS_URL}?vendorId=${encodeURIComponent(vendorId)}`,
      );
      if (!res.ok) {
        console.warn(
          `[vendorStock] GET vendor products failed with HTTP ${res.status}`,
        );
        return;
      }
      const data = await res.json();
      const vendorProducts = Array.isArray(data) ? data[0] : data;

      if (!vendorProducts) {
        console.warn(
          "[vendorStock] No vendor products record found — skipping vendor stock update.",
        );
        return;
      }

      let changed = false;
      const categorieKey =
        "Categorie" in vendorProducts ? "Categorie" : "categorie";
      const updatedCategorie = (vendorProducts[categorieKey] || []).map(
        (cat) => {
          const productsKey = "Products" in cat ? "Products" : "products";
          return {
            ...cat,
            [productsKey]: (cat[productsKey] || []).map((p) => {
              const pid = String(p.ProductIds ?? p.productIds ?? "");
              const orderedQty = orderedQtyById.get(pid);
              if (!orderedQty) return p;
              const qtyKey = "Quantity" in p ? "Quantity" : "quantity";
              const currentQty = Number(p[qtyKey] ?? 0) || 0;
              const newQty = Math.max(0, currentQty - orderedQty);
              changed = true;
              console.log(
                `[vendorStock] ${pid}: ${currentQty} -> ${newQty} (ordered ${orderedQty})`,
              );
              return { ...p, [qtyKey]: String(newQty) };
            }),
          };
        },
      );

      if (!changed) {
        console.warn(
          "[vendorStock] No ProductIds in the vendor record matched the ordered item ids — skipping update.",
          {
            orderedQtyById: Array.from(orderedQtyById.entries()),
            vendorProductIds: (vendorProducts[categorieKey] || []).flatMap(
              (cat) =>
                (cat.Products || cat.products || []).map(
                  (p) => p.ProductIds ?? p.productIds,
                ),
            ),
          },
        );
        return;
      }

      const payload = { ...vendorProducts, [categorieKey]: updatedCategorie };

      const putRes = await fetch(
        `${UPDATE_VENDOR_PRODUCTS_URL}?id=${encodeURIComponent(vendorProducts.id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!putRes.ok) {
        const msg = await putRes.text().catch(() => "");
        throw new Error(`Failed to update vendor product quantities: ${msg}`);
      }
      invalidateVendorProductsCache(vendorId);
      console.log("✅ [vendorStock] Vendor product quantities decremented.");
    } catch (error) {
      console.error(
        "[vendorStock] Error decrementing vendor product quantities:",
        error,
      );
    }
  };

  const sendLmartsms = async () => {
    try {
      const primaryAddress = addresses.find((addr) => addr.type === "primary");
      const mobileNumber =
        primaryAddress?.mobileNumber || primaryAddress?.mobileNumber;
      const response = await fetch(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/Auth/sendLmartsms`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: addressData.fullName || fullName,
            ticketId: martId,
            phoneNumber: addressData.mobileNumber || mobileNumber,
            address: addressData.address || primaryAddress?.address,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("SMS API success:", data);
    } catch (error) {
      console.error("Error sending SMS:", error);
    }
  };

  const handlePaymentAndSms = async () => {
    try {
      setLoading(true);
       await handleUpdateStockLeft();
       await handleUpdateVendorProductQuantities();
        await sendLmartsms();
        await handleUpdatePaymentMethod();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const hasState = Boolean(state?.trim());
  const hasDistrict = Boolean(district?.trim());
  const hasPincode = Boolean(zipCode?.trim());

  return (
    <div>
      <div className="d-flex mt-80">
        <div>
          <h1
            style={{
              background: "#008000",
              color: "white",
              fontFamily: "'Baloo 2'",
              fontSize: "25px",
              padding: "12px",
              fontWeight: "bold",
              textAlign: "center",
              width: "100%",
              boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
              letterSpacing: "1px",
              marginBottom: "3px",
              position: "fixed",
              top: 0,
              left: 0,
              zIndex: 1000,
            }}
          >
            Lakshmi Mart
          </h1>
        </div>

        <div className={`container ${isMobile ? "w-100" : "w-75"}`}>
          <div className="d-flex align-items-center">
            <span
              className="me-2 text-success"
              role="button"
              style={{ cursor: "pointer" }}
              onClick={() => navigate(`/groceryCart/${userType}/${userId}`)}
            >
              <ArrowBackIcon />
            </span>
            <h2 className="title text-success mb-0">PAYMENT CONFIRMATION</h2>
          </div>
          {/* HANDYMAN */}
          <div className="d-flex justify-content-between align-items-center">
            <label className="mt-2 fs-6 fw-bold">
              Address <span className="req_star">*</span>
            </label>
            {/* Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)}>
              <Modal.Header
                closeButton
                style={{
                  backgroundColor: isEditing ? "#008000" : "#008000",
                  color: "white",
                }}
              >
                <Modal.Title className="w-100">
                  {isNewUser ? "Add Address" : "Edit Address"}
                </Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <Form>
                  <Form.Group className="mb-3">
                    <Form.Label>
                      Full Name <span className="req_star">*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter Full name"
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>
                      Mobile Number <span className="req_star">*</span>
                    </Form.Label>
                    <Form.Control
                      name="MobileNumber"
                      className="form-control"
                      placeholder="Enter Mobile Number"
                      maxLength="10"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      readOnly
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Control
                      type="hidden"
                      name="UserId"
                      className="form-control"
                      placeholder="UserId"
                      value={guestCustomerId}
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>
                      Address <span className="req_star">*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      placeholder="Enter address"
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>
                      State <span className="req_star">*</span>
                    </Form.Label>
                    {hasState ? (
                      <Form.Control
                        type="text"
                        value={state}
                        readOnly
                        disabled
                        style={{
                          backgroundColor: "#f5f5f5",
                          cursor: "not-allowed",
                        }}
                      />
                    ) : (
                      <Form.Select
                        value={tempStateId || ""}
                        onChange={(e) => {
                          const selectedId = e.target.value;

                          const selectedState = stateList.find(
                            (s) => String(s?.StateId) === String(selectedId),
                          );

                          setTempStateId(selectedId);
                          setTempState(selectedState?.StateName || "");

                          // Reset dependent temporary values
                          setTempDistrictId("");
                          setTempDistrict("");
                          setTempZipCode("");

                          // Clear old dependent lists
                          setDistrictList([]);
                          setPincodeList([]);
                        }}
                      >
                        <option value="">Select State</option>

                        {stateList
                          .filter((s) => s?.StateId && s?.StateName)
                          .map((s) => (
                            <option key={s.StateId} value={String(s.StateId)}>
                              {s.StateName}
                            </option>
                          ))}
                      </Form.Select>
                    )}
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>
                      District <span className="req_star">*</span>
                    </Form.Label>
                    {hasDistrict ? (
                      <Form.Control
                        type="text"
                        value={district}
                        readOnly
                        disabled
                        style={{
                          backgroundColor: "#f5f5f5",
                          cursor: "not-allowed",
                        }}
                      />
                    ) : (
                      <Form.Select
                        value={tempDistrictId || ""}
                        disabled={!tempStateId}
                        onChange={(e) => {
                          const selectedId = e.target.value;

                          const selectedDistrict = districtList.find(
                            (d) => String(d?.districtId) === String(selectedId),
                          );

                          setTempDistrictId(selectedId);
                          setTempDistrict(selectedDistrict?.districtName || "");

                          // Reset pincode
                          setTempZipCode("");
                          setPincodeList([]);
                        }}
                      >
                        <option value="">
                          {!tempStateId
                            ? "Select State First"
                            : "Select District"}
                        </option>

                        {districtList.map((d) => (
                          <option
                            key={d.districtId}
                            value={String(d.districtId)}
                          >
                            {d.districtName}
                          </option>
                        ))}
                      </Form.Select>
                    )}
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>
                      Pincode <span className="req_star">*</span>
                    </Form.Label>
                    {hasPincode ? (
                      <Form.Control
                        type="text"
                        value={zipCode}
                        readOnly
                        disabled
                        style={{
                          backgroundColor: "#f5f5f5",
                          cursor: "not-allowed",
                        }}
                      />
                    ) : (
                      <Form.Select
                        value={tempZipCode || ""}
                        disabled={!tempDistrictId || pincodesLoading}
                        onChange={(e) => {
                          setTempZipCode(e.target.value);
                        }}
                      >
                        <option value="">
                          {pincodesLoading
                            ? "Loading Pincodes..."
                            : !tempDistrictId
                              ? "Select District First"
                              : "Select Pincode"}
                        </option>

                        {pincodeList.map((pincode, index) => {
                          const value =
                            pincode?.pincode ??
                            pincode?.Pincode ??
                            pincode?.pinCode ??
                            pincode?.PinCode ??
                            pincode?.zipCode ??
                            pincode?.ZipCode ??
                            pincode?.code ??
                            pincode;

                          return (
                            <option
                              key={`${value}-${index}`}
                              value={String(value)}
                            >
                              {String(value)}
                            </option>
                          );
                        })}
                      </Form.Select>
                    )}
                  </Form.Group>
                  <Button
                    type="button"
                    style={{
                      backgroundColor: isAddressInvalid ? "#008000" : "#008000",
                      borderColor: isAddressInvalid ? "#008000" : "#008000",
                      color: "white",
                    }}
                    onClick={handleAddressEdit}
                  >
                    {isNewUser ? "Add Address" : "Edit Address"}
                  </Button>
                </Form>
              </Modal.Body>
            </Modal>
          </div>

          <div className="p-3 border rounded bg-light">
            {addresses.map((address) => (
              <div
                key={address.id}
                className="list-group-item d-flex justify-content-between align-items-center bg-white text-dark"
              >
                <div>
                  <span className="ml-2">{address.fullName}</span>
                  <br />
                  <span className="ml-2">{address.mobileNumber}</span>
                  <br />
                  <span className="ml-2">{address.address}</span>
                  <br />
                  <span className="ml-2">{address.state}</span>
                  <br />
                  <span className="ml-2">{address.district}</span>
                  <br />
                  <span className="ml-2">{address.zipCode}</span>
                  <br />
                </div>
                <div className="text-end">
                  <Button
                    key={address.id}
                    style={{
                      backgroundColor: isAddressInvalid ? "#008000" : "#008000",
                      borderColor: isAddressInvalid ? "#008000" : "#008000",
                      color: "white",
                    }}
                    className={`text-white mx-1 ${
                      shouldBlink ? "blinking-button" : ""
                    }`}
                    onClick={() => {
                      setGuestCustomerId(address.id);
                      setEditingAddressId(address.addressId);
                      console.log("=================================");
                      console.log("GET API Address Object:", address);
                      console.log("ID:", address.id);
                      console.log("Address ID:", address.addressId);
                      console.log("=================================");

                      if (address.address === "") {
                        openAddAddress();
                        return;
                      }
                      setFullName(address.fullName || "");
                      setMobileNumber(address.mobileNumber || "");
                      setNewAddress(address.address || "");
                      setTempStateId(address.stateId || "");
                      setTempState(address.state || "");
                      setTempDistrictId(address.districtId || "");
                      setTempDistrict(address.district || "");
                      setTempZipCode(address.zipCode || "");
                      setState(address.state || "");
                      setDistrict(address.district || "");
                      setZipCode(address.zipCode || "");
                      setIsEditing(true);
                      setShowModal(true);
                    }}
                  >
                    {address.address === "" ? "Add Address" : "Edit Address"}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {fullName.trim().toLowerCase() === "guest" && (
            <p className="text-danger">Note: Enter your Delivery Address</p>
          )}
          {/* <div className="m-2">
            {serviceUnavailable && (
              <div className="alert alert-danger">
                <strong>Note:</strong> Currently, the options to Raise a Ticket,
                Book Technician or Lakshmi Mart services are unavailable in your
                district. You can still purchase products through the "Buy
                Product" section. For further assistance, please contact our
                customer support at 6281198953.
              </div>
            )}
          </div> */}

          <div className="grocery-confirmation">
            <p className="text-center" style={{ fontSize: "13px" }}>
              <span className="name">{fullName}</span> Thank you for Choosing
              the Lakshmi Mart
            </p>

            {wallet > 0 && (
              <div
                className="text-danger"
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  textAlign: "center",
                }}
              >
                🎉 Thank you!{" "}
                <span style={{ color: "red" }}>₹{finalWalletBalance}</span>{" "}
                cashback will be credited to your wallet after your order is
                completed.
              </div>
            )}

            <table className="grocery-table m-2">
              <tbody>
                <tr>
                  <td style={{ width: "40%", fontSize: "14px" }}>Order Id</td>
                  <td style={{ width: "40%" }}>{martId}</td>
                </tr>
                <tr>
                  <td style={{ width: "40%", fontSize: "14px" }}>
                    Number of Items selected
                  </td>
                  <td style={{ width: "40%" }}>{totalItemsSelected}</td>
                </tr>
                <tr>
                  <td style={{ width: "40%", fontSize: "14px" }}>
                    Grand Total
                  </td>
                  <td style={{ width: "40%" }}>Rs {grandTotal} /-</td>
                </tr>

                <tr>
                  <td style={{ color: "red", fontSize: "13px" }}>
                    Deduct Wallet Amt
                  </td>
                  <td style={{ color: "red" }}>Rs {walletToUse} /-</td>
                </tr>
                <tr>
                  <td
                    style={{ width: "40%", fontSize: "14px", fontWeight: 600 }}
                  >
                    Total Payable
                  </td>
                  <td style={{ width: "40%", fontWeight: 700 }}>
                    Rs {netPayables} /-
                  </td>
                </tr>
                <tr>
                  <td style={{ color: "red", fontSize: "13px" }}>
                    Balance Wallet Amt
                  </td>
                  <td style={{ color: "red" }}>Rs {remainingWallet} /-</td>
                </tr>
                {cashback > 0 && (
                  <tr>
                    <td
                      style={{ width: "40%", fontSize: "13px", color: "red" }}
                    >
                      Added Wallet Amt
                    </td>
                    <td style={{ width: "40%", color: "red" }}>
                      {`Rs ${cashback} /-`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="payment m-2">
              <label
                className="text-white w-100 p-2"
                style={{
                  background: "#008000",
                  borderRadius: "15px",
                  fontSize: "14px",
                }}
              >
                Pay After Delivery – No Advance Needed
              </label>
            </div>

            <div className="note m-1">
              <div className="d-flex align-items-center">
                <input
                  type="checkbox"
                  className="form-check-input border-dark me-2"
                  checked={isChecked}
                  required
                  onChange={(e) => setIsChecked(e.target.checked)}
                  style={{ width: "13px", height: "13px" }}
                />
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setShowModals(true);
                  }}
                  className="p-0"
                  style={{
                    background: "none",
                    border: "none",
                    textDecoration: "underline",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    fontSize: "13px",
                    color: "#0000FF",
                  }}
                >
                  Terms & Conditions & Cancellation Policy
                </button>
              </div>
              {/* HANDYMAN */}
              {/* Modal for Terms and Conditions */}
              {showModals && (
                <div className="modal-overlay">
                  <div className="modal-content">
                    <button
                      onClick={() => setShowModals(false)}
                      style={{
                        color: "red",
                        position: "absolute",
                        top: "10px",
                        right: "15px",
                        background: "none",
                        border: "none",
                        fontSize: "20px",
                        fontWeight: "bold",
                        cursor: "pointer",
                      }}
                    >
                      ✕
                    </button>
                    <h3>Terms & Conditions</h3>
                    <div className="text-justify">
                      <div className="mt-10">
                        <h5>I. General</h5>
                        <p>
                          These Terms & Conditions apply to all grocery and
                          daily-need purchases made through Lakshmi Mart (via
                          APP or website). By placing an order, you agree to
                          abide by these T&C. Lakshmi Sai Service Provider
                          reserves the right to update policies without prior
                          notice.
                        </p>
                      </div>
                      <div className="mt-10">
                        <h5>II. Orders</h5>
                        <p>
                          Orders are accepted subject to stock availability.In
                          case of unavailability, Lakshmi Mart may cancel the
                          product and issue a refund/replacement. Customers must
                          provide accurate delivery address and contact
                          information. Incorrect details may lead to order
                          cancellation.
                        </p>
                      </div>
                      <div className="mt-10">
                        <h5>III. Pricing & Payment</h5>
                        <p>
                          All prices are inclusive of GST, unless otherwise
                          specified.Prices are subject to change depending on
                          market conditions and supplier updates. Payment
                          options: UPI, credit/debit cards, net banking, and
                          Cash on Delivery (COD, where available).
                        </p>
                      </div>
                      <div className="mt-10">
                        <h5>IV. Delivery</h5>
                        <p>
                          Groceries are delivered within the estimated time
                          shown at checkout. Free delivery is available on
                          eligible orders (e.g., above a specified order value).
                          Delivery times may vary due to traffic, weather, or
                          supply chain issues.
                        </p>
                      </div>
                      <div className="mt-10">
                        <h5>V. Returns & Refunds</h5>
                        <p>
                          Perishable items (milk, vegetables, fruits, bakery,
                          etc.) are non-returnable once delivered.
                          Non-perishable grocery items (packed pulses, rice,
                          oil, flour, etc.) can be returned only if:
                          <br />
                          <h5>Wrong item delivered</h5>
                          Damaged or defective packaging at the time of delivery
                          Returns must be initiated within 24 hours of delivery
                          by contacting customer support. Refunds (if
                          applicable) will be processed within 7–10 working days
                          to the original payment method.
                        </p>
                      </div>
                      <h3>Cancellation Policy</h3>
                      <div className="mt-10">
                        <h5>I. Order Cancellations</h5>
                        <p>
                          Orders can be cancelled before packing/dispatched at
                          no extra cost. Once the order is packed or out for
                          delivery, cancellation is not allowed. In case of COD
                          orders, repeated cancellations may lead to blocking of
                          the COD option for that customer.
                        </p>
                        <div className="mt-10">
                          <h4>II. Refund Timelines</h4>
                          <p>
                            For prepaid orders cancelled before dispatch, a full
                            refund will be processed. Refunds take 7–10 working
                            days to reflect in the original payment method.
                          </p>
                        </div>
                        <div className="mt-10">
                          <h5>III. Special Notes</h5>
                          <p>
                            Bulk or wholesale orders may have separate
                            cancellation/return terms.
                            Festival/offers/discounted items are not eligible
                            for return or cancellation once dispatched.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-center">
                      <button
                        className="btn btn-danger w-20"
                        title="close"
                        onClick={() => setShowModals(false)}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="button">
              {loading && (
                <div className="text-center mt-3">
                  <div className="spinner-border text-success" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2 text-success fw-bold">
                    Your order is being confirmed. Please wait....
                  </p>
                </div>
              )}
              <button
                className="btn btn-warning blinking-text"
                disabled={loading || isOrderDisabled}
                onClick={handlePaymentAndSms}
                title={
                  isFirstOrderMinNotReached
                    ? "Minimum order value ₹150 required on your first order to get ₹50 cashback."
                    : ""
                }
              >
                {loading ? "Confirming Order..." : "Order Now"}
              </button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
      {/* Styles for floating menu */}
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          padding: 20px;
          border-radius: 20px;
          width: 100%;
          font-size: 13px;
          max-width: 600px;
          max-height: 80vh;
          overflow-y: auto;
          text-align: left;
        }
      `}</style>
    </div>
  );
};

export default GroceryPaymentmethod;
