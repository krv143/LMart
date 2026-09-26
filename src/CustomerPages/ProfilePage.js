import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "../App.css";
import { Modal, Button } from "react-bootstrap";
import ImageCache from "../utils/ImageCache";
import { getGroceryItems } from "../utils/groceryStore";
import axios from "axios";
import Footer from "../CommonPages/Footer.js";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import StorefrontIcon from "@mui/icons-material/Storefront";
import DeliveryDiningIcon from "@mui/icons-material/DeliveryDining";
import PermIdentityIcon from "@mui/icons-material/PermIdentity";
import { playNotificationSound } from "../CommonPages/notificationSound";
import { speakAlert, speakTeluguAlert } from "../CommonPages/speechAlert";
import { useNavigate, useParams } from "react-router-dom";
import Logo from "../img/Hm_Logo 1.png";
import SearchIcon from "@mui/icons-material/Search";
import LogoutIcon from "@mui/icons-material/Logout";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import ApartmentIcon from "@mui/icons-material/Apartment";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import MenuIcon from "@mui/icons-material/Menu";
import Electrical from "../img/Electrical.jpeg";
import Electronics from "../img/Electronics.jpeg";
import Plumbing from "../img/Plumbing.jpeg";
import Hardware from "../img/Hardware.jpeg";
import HomeDecor from "../img/HomeDecor.jpeg";
import HomeAppliances from "../img/Kitchenware.jpeg";
import BabyKidsImg from "../img/BabyKids.jpeg";
import PoojaImg from "../img/Pooja.jpeg";
import FoodImg from "../img/food.jpg";
import HairImg from "../img/HairCare.jpeg";
import BathBodyImg from "../img/BathBody.jpeg";
import RavvaImg from "../img/RiceRavva.jpeg";
import AttaImg from "../img/AttaFlours.jpeg";
import OilsImg from "../img/OilDals.jpeg";
import SugarImg from "../img/SugarSalt.jpeg";
import MasalaImg from "../img/MasalaPickles.jpeg";
import MilkImg from "../img/MilkGhee.jpeg";
import BreadsImg from "../img/BreadEggs.jpeg";
import DrinkImg from "../img/DrinkJuice.jpeg";
import BakeryImg from "../img/BakerySweets.jpeg";
import VegetablesImg from "../img/Vegetables.jpeg";
import FruitsImg from "../img/Fruits.jpeg";
import DryfruitsImg from "../img/Bakery.jpeg";
import SoupsImg from "../img/SoupsSauces.jpeg";
import KitchenImg from "../img/Kitchenware.jpeg";
import BiscuitsImg from "../img/Biscuits.jpeg";
import HealthImg from "../img/HealthCare.jpeg";
import SkinImg from "../img/SkinFace.jpeg";
import TeaImg from "../img/teacoffee.jpeg";
import NamkeenImg from "../img/InstantFoodImg.jpeg";
import HouseHoldImg from "../img/HouseHold.jpeg";
import ChickenImg from "../img/Chicken.jpeg";
import StationaryImg from "../img/Stationary.jpeg";
import KidsImg from "../img/KidsZone.jpeg";
import { CartStorage } from "../CommonPages/CartStorage";
import IcecreamImg from "../img/IceCreams.jpeg";
import DwakraProducts from "../img/DwakraLogo.jpeg";
import UnbeatableImg from "../img/MilkOffers.jpeg";
import ComboPackImg from "../img/ComboPack.jpeg";
import AddIcCallIcon from "@mui/icons-material/AddIcCall";
import RoyalImg from "../img/LMartLogo.jpeg";
import HomeElectricalImg from "../img/HomeElectrical.jpeg";
import HomePlumbingImg from "../img/HomePlumbing.jpeg";
import OffersBannerModal from "../CustomerPages/OffersBannerModal.js";
import LiveChatWidget from "../components/LiveChatWidget";
import PushNotificationService from "../utils/PushNotificationService";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import {
  getVendorProfileById,
  makePlaceholderImage,
  getVendorIcon,
} from "../utils/vendorStorage";
import { getVendorsByPincode } from "../utils/vendorListStore";
import PotRewardGame from "./PotRewardGame.js";
// import { appConfig } from "./config";

const getMenuList = (
  userType,
  userId,
  category,
  district,                                       
  ZipCode,
  technicianFullName,
  isMobile,
) => {
  const iconSize = isMobile ? 20 : 40;
  const customer = [
    {
      MenuIcon: <SupportAgentIcon sx={{ fontSize: 40 }} />,
      MenuTitle: "Raise Ticket",
      TargetUrl: `/raiseTicket/${userType}/${userId}`,
    },
    {
      MenuIcon: <PersonOutlineIcon sx={{ fontSize: 40 }} />,
      MenuTitle: "Book Technician",
      TargetUrl: `/bookTechnician/${userType}/${userId}`,
    },
    // {
    //   MenuIcon: <StorefrontIcon sx={{ fontSize: 40 }} />,
    //   MenuTitle: "Buy Products",
    //   TargetUrl: `/buyProducts/${userType}/${userId}`,
    // },
    ...(!isMobile
      ? [
          {
            MenuIcon: <LocalOfferIcon sx={{ fontSize: iconSize }} />,
            MenuTitle: "Buy Product Offers",
            TargetUrl: `/offersIcons/${userType}/${userId}`,
          },
        ]
      : []),
    {
      MenuIcon: <ApartmentIcon sx={{ fontSize: 40 }} />,
      MenuTitle: isMobile
        ? "Apartment AMC" 
        : "Apartment Common Area Maintenance",
      TargetUrl: `/aboutApartmentRaiseTicket/${userType}/${userId}`,
    },
    {
      MenuIcon: <StorefrontIcon sx={{ fontSize: 40 }} />,
      MenuTitle: "Vendor Portal",
      TargetUrl: "/vendor/login",
    },
    ...(!isMobile
      ? [
          {
            MenuIcon: <PermIdentityIcon sx={{ fontSize: iconSize }} />,
            MenuTitle: "Accounts",
          },
        ]
      : []),
    ...(!isMobile
      ? [
          {
            MenuIcon: <DeliveryDiningIcon sx={{ fontSize: iconSize }} />,
            MenuTitle: "Delivery Partner",
            TargetUrl: `/deliveryPartner/${userType}/${userId}`,
          },
        ]
      : []),
  ];
  switch (userType) {
    case "customer":
      return customer;
    default:
      return [];
  }
};
const categories = [
  { label: "Home Decors", value: "Home Decors", image: HomeDecor },
  { label: "Home Appliances", value: "Home Appliances", image: HomeAppliances },
  { label: "Electrical Items", value: "Electrical items", image: Electrical },
  {
    label: "Electronics Appliances",
    value: "Electronics appliances",
    image: Electronics,
  },
  { label: "Plumbing & Sanitary", value: "Sanitary items", image: Plumbing },
  { label: "Hardware Items", value: "Hardware items", image: Hardware },
];

const groceryCategories = [
  {
    label: "Grocery Value Combo Packs",
    value: "Grocery Value Combo Packs",
    image: ComboPackImg,
  },
  { label: "LMart Products", value: "LMart Special", image: RoyalImg },
  {
    label: "Unbeatable 10 Offers",
    value: "Unbeatable Offers",
    image: UnbeatableImg,
  },
  { label: "Rice & Ravva", value: "Rice & Ravva", image: RavvaImg },
  { label: "Atta & Flours", value: "Atta & Flours", image: AttaImg },
  { label: "Vegetables", value: "Vegetables", image: VegetablesImg },
  { label: "Fruits", value: "Fruits", image: FruitsImg },
  { label: "Oils & Dals", value: "Oils & Dals", image: OilsImg },
  {
    label: "Masala, Spices & Pickles",
    value: "Masala, Spices & Pickles",
    image: MasalaImg,
  },
  {
    label: "Instant Food, Chips & Namkeen",
    value: "Instant Food, Chips & Namkeen",
    image: NamkeenImg,
  },
  { label: "Skin & Face Care", value: "Skin & Face Care", image: SkinImg },
  { label: "Bath & Body Care", value: "Bath & Body Care", image: BathBodyImg },
  { label: "Hair Care", value: "Hair Care", image: HairImg },
  { label: "Soups & Sauces", value: "Soups & Sauces", image: SoupsImg },
  { label: "Tea & Coffee", value: "Tea & Coffee", image: TeaImg },
  {
    label: "Biscuits & Chocolates",
    value: "Biscuits & Chocolates",
    image: BiscuitsImg,
  },
  { label: "Milk, Curd & Ghee", value: "Milk, Curd & Ghee", image: MilkImg },
  {
    label: "Sugar, Salt & Jaggery",
    value: "Sugar, Salt & Jaggery",
    image: SugarImg,
  },
  {
    label: "Dry Fruits & Bakery",
    value: "Dry Fruits & Bakery",
    image: DryfruitsImg,
  },
  { label: "Food Hub", value: "Food Hub", image: FoodImg },
  { label: "Pooja Essentials", value: "Puja Essentials", image: PoojaImg },
  { label: "Health Care", value: "Health Care", image: HealthImg },
  { label: "Drinks & Juices", value: "Drinks & Juices", image: DrinkImg },
  { label: "Bread & Eggs", value: "Bread & Eggs", image: BreadsImg },
  { label: "Home Needs", value: "Home Needs", image: HouseHoldImg },
  { label: "Ice Creams", value: "Ice Creams", image: IcecreamImg },
  { label: "Sweets & Snacks", value: "Sweets & Snacks", image: BakeryImg },
  { label: "Stationary", value: "Stationary", image: StationaryImg },
  { label: "Baby Products", value: "Baby Products", image: BabyKidsImg },
  { label: "Kids Zone", value: "Kids Zone", image: KidsImg },
  { label: "DWCRA Products", value: "DWCRA", image: DwakraProducts },
  { label: "Chicken", value: "Chicken", image: ChickenImg },
  { label: "Electrical", value: "Electrical Products", image: HomeElectricalImg,},
  { label: "Plumbing", value: "Plumbing Products", image: HomePlumbingImg, },
  { label: "Kitchenware", value: "Kitchenware Appliances", image: KitchenImg,},
  {  label: "Home Decors",  value: "Home Decors", image: HomeDecor,},
  { label: 'Electronics Appliances', value: 'Electronics appliances', image: Electronics },   
  { label: 'Hardware Items', value: 'Hardware items', image: Hardware },
  // { label: 'Hangers & Hooks', value: 'Hangers & Hooks', image: Hardware },  
];


const BLOB_BASE_URL =
  "https://lmartfiles.blob.core.windows.net/userattechements";

const getAzureImageUrl = (imageName) => {
  if (!imageName) return "";

  const value = String(imageName).trim();

  // API already returned a complete URL
  if (
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  // API returned Base64 image directly
  if (value.startsWith("data:image/")) {
    return value;
  }

  // Otherwise use Azure Blob Storage
  const cleanName = value.replace(/^\/+/, "");

  return `${BLOB_BASE_URL}/${encodeURIComponent(cleanName)}`;
};

const VENDOR_ORDERS_API_BASE = "https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api";
const GET_VENDOR_ORDERS_URL = `${VENDOR_ORDERS_API_BASE}/Mart/GetVendorOrdersByVendorId`;
const GET_VENDOR_CATEGORIES_URL = `${VENDOR_ORDERS_API_BASE}/Categorie/GetCategorieDetailsByVendorId`;
const VENDOR_ORDERS_POLL_INTERVAL_MS = 25000;

const DEFAULT_PINCODE = "530048";

const ProfilePage = () => {
  const [allProducts, setAllProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [imageUrls, setImageUrls] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  // vendorId -> [{ id, categoryName, image }]  (Approved only)
const [vendorCategoryDetails, setVendorCategoryDetails] = useState({});
  const navigate = useNavigate();
  const handleVendorPortal = () => {
     const vendorId = localStorage.getItem("vendorSession");
    if (vendorId) {
      navigate(`/vendor/preview/${vendorId}`);
      return;
    }

    const customerMobile = profile?.mobileNumber?.trim();

    if (userId) {
      localStorage.setItem("vendorRegistrationUserId", userId);
      console.log("Vendor registration userId saved:", userId);
    }
    if (userType && userId) {
      localStorage.setItem("vendorReturnUserId", userId);
      localStorage.setItem("vendorReturnUserType", userType);
    }
    if (customerMobile) {
      localStorage.setItem("vendorRegistrationMobileNumber", customerMobile);

      console.log("Vendor registration mobile saved:", customerMobile);
    }

    if (userType && userId) {
      localStorage.setItem(
        "vendorReturnProfile",
        `/profilePage/${userType}/${userId}`,
      );
    }

    navigate("/vendor/login");
  };

  const [vendorSessionId, setVendorSessionId] = useState(
    () => localStorage.getItem("vendorSession") || "",
  );
  const [vendorProfile, setVendorProfile] = useState(null);
  const [vendorSelectedCategories, setVendorSelectedCategories] = useState([]);
  const [activeVendorCategoryTab, setActiveVendorCategoryTab] = useState("");

 const [vendorOrderCount, setVendorOrderCount] = useState(0);
  const [vendorHasNewOrder, setVendorHasNewOrder] = useState(false);
  const vendorKnownOrderIdsRef = useRef(null);
  const vendorKnownOrderStatusRef = useRef(null);
  const { userId } = useParams();
  const { userType } = useParams();
  const [category, setCategory] = useState("");
  const [fullName, setFullName] = useState("");
  const [menuList, setMenuList] = useState([]);
  const [profile, setProfile] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const fileInputRef = useRef(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showMenu, setShowMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [allTickets, setAllTickets] = useState([]);
  const menuRef = useRef(null);
  const ticketScrollRef = useRef(null);
  const [products] = useState([]);
  const [cartSummary, setCartSummary] = useState({
    items: 0,
    total: 0,
    products: [],
  });
  const [deliveryProfile, setDeliveryProfile] = useState(null);
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [selectedOption, setSelectedOption] = useState("");
  const [groceryData, setGroceryData] = useState([]);
  const [state, setState] = useState("");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("");
  const [zipCode, setZipCode] = useState(DEFAULT_PINCODE);
  const [approvedVendorListJson, setApprovedVendorListJson] = useState([]);
  const [vendorStoreImages, setVendorStoreImages] = useState({});
  const [mobileNumber, setMobileNumber] = useState("");
  const [status, setStatus] = useState("");
  const [id, setId] = useState("");
  const [pinCode, setPinCode] = useState(DEFAULT_PINCODE);
  const [martId, setMartId] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const clickLock = useRef(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [partnerStatus, setPartnerStatus] = useState("");
   const [deliveryOrderCount, setDeliveryOrderCount] = useState(0);
  const [deliveryHasNewOrder, setDeliveryHasNewOrder] = useState(false);
  const deliveryKnownOrderIdsRef = useRef(null);
   const locationRequestRef = useRef(false);
  const [paidAmount] = useState("");
  const [items] = useState("");
  const HEADER_H = 0;
  const MOBILE_ICONS_H = 0;
  const MOBILE_EXTRA = 0;
  const MOBILE_PADDING_TOP = HEADER_H + MOBILE_ICONS_H + MOBILE_EXTRA;
  const [cartImages, setCartImages] = useState({});
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [cashbackAmount, setCashbackAmount] = useState(0);
  const [cart, setCart] = useState({});
  const [showZoomModal, setShowZoomModal] = useState(false);
  const [zoomImage, setZoomImage] = useState("");
  const [zoomProduct, setZoomProduct] = useState(null);
  const displayProducts =
    searchQuery.trim().length > 0 ? filteredProducts : products;
  const [imageLoading] = useState(true); 
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [showOffersModal, setShowOffersModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [searchOrderId, setSearchOrderId] = useState("");
  const [walletAmount, setWalletAmount] = useState("0");
  const [walletLoading, setWalletLoading] = useState(true);
  const [showWalletMessage, setShowWalletMessage] = useState(false);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(
    () => localStorage.getItem(`hm_push_enabled_${userId}`) === "true",
  );
  const [pushDismissed, setPushDismissed] = useState(
    () => sessionStorage.getItem("hm_push_dismissed") === "true",
  );
  const [pushLoading, setPushLoading] = useState(false);
  const pushSupported = PushNotificationService.isSupported();
  const [deliveryTicketsLoading, setDeliveryTicketsLoading] = useState(false);
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState("");
  const [trackedOrder, setTrackedOrder] = useState(null);
  const [autoOrderPrompt, setAutoOrderPrompt] = useState(null);
  const martTicketSyncRef = useRef(false);
  const [selectedMartTab, setSelectedMartTab] = useState("Lakshmi Mart");
  const [selectedVendorJsonCategory, setSelectedVendorJsonCategory] =
    useState("");
    const [preferLMartDefault, setPreferLMartDefault] = useState(false);
  const vendorTabsRef = useRef(null);

  useEffect(() => {
    if (!selectedMartTab || !vendorTabsRef.current) return;

    const activeTab = vendorTabsRef.current.querySelector(
      `[data-vendor-id="${selectedMartTab}"]`,
    );

    if (activeTab) {
      activeTab.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [selectedMartTab]);
  useEffect(() => {
    const vendor = approvedVendorListJson.find(
      (v) => v.vendorId === selectedMartTab,
    );
    setSelectedVendorJsonCategory(vendor?.categories?.[0]?.category || "");
  }, [selectedMartTab, approvedVendorListJson]);

  const scrollVendorTabs = (direction) => {
    if (!vendorTabsRef.current) return;
    vendorTabsRef.current.scrollBy({ left: direction * 180, behavior: "smooth" });
  };

  const LMART_FALLBACK_PINCODE = DEFAULT_PINCODE; 
  useEffect(() => {
    const effectivePincode =
      String(zipCode || pinCode || DEFAULT_PINCODE).trim() ||
      DEFAULT_PINCODE;

    let cancelled = false;

    (async () => {
      try {
        const vendors = await getVendorsByPincode(
          effectivePincode,
        );

        if (cancelled) return;

       
let approvedVendors = (Array.isArray(vendors) ? vendors : [])
  .filter(
    (v) =>
      String(v?.status || "").trim().toLowerCase() === "approved" &&
      v?.vendorId
  )
  .filter((vendor, index, array) => {
    const normalizedName = String(vendor?.storeName || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");

    // Keep vendors without a store name separate
    if (!normalizedName) return true;

    // Keep only the first occurrence of each store name
    return (
      array.findIndex((item) => {
        const itemName = String(item?.storeName || "")
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "");

        return itemName === normalizedName;
      }) === index
    );
  });

        const isDistrictVisakhapatnam =
        (district || "").trim().toLowerCase() === "visakhapatnam";

      let usedFallback = false;

      if (approvedVendors.length === 0 && isDistrictVisakhapatnam) {
        try {
          const fallbackVendors = await getVendorsByPincode(
            LMART_FALLBACK_PINCODE,
          );
          const fallbackApproved = (Array.isArray(fallbackVendors)
              ? fallbackVendors
              : []
            ).filter(
              (v) =>
                String(v?.status || "").trim().toLowerCase() === "approved" &&
                v?.vendorId
            );
          const lmartVendor = fallbackApproved.find(
            (v) =>
              String(v.storeName || "")
                .trim()
                .toLowerCase()
                .replace(/\s+/g, "") === "lmart",
          );
          if (lmartVendor) {
            approvedVendors = [lmartVendor];
            usedFallback = true;
          }
        } catch (fallbackErr) {
          console.error("LMart fallback fetch failed:", fallbackErr);
        }
      }
        setApprovedVendorListJson(
          approvedVendors,
        );

        if (approvedVendors.length > 0) {
          setSelectedMartTab((current) => {
  let lastOrderedVendor = null;

  try {
    lastOrderedVendor = JSON.parse(
      localStorage.getItem("lastOrderedVendor") || "null"
    );
  } catch (error) {
    console.error("Invalid lastOrderedVendor:", error);
  }

  // 1. Select the vendor from the most recent successful order
  const lastOrderedMatch = approvedVendors.find(
    (v) => v.vendorId === lastOrderedVendor?.vendorId
  );

  if (lastOrderedMatch) {
    localStorage.setItem(
      "selectedVendorId",
      lastOrderedMatch.vendorId
    );

    return lastOrderedMatch.vendorId;
  }

  // 2. Keep the currently selected vendor if it still exists
  const currentExists = approvedVendors.some(
    (v) => v.vendorId === current
  );

  if (currentExists && !usedFallback) {
    return current;
  }

  // 3. Existing fallback/default behavior
  let nextVendorId;

  if (usedFallback) {
    nextVendorId = approvedVendors[0].vendorId;
  } else if (preferLMartDefault) {
    const lmartVendor = approvedVendors.find(
      (v) =>
        String(v.storeName || "")
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "") === "lmart"
    );

    nextVendorId = lmartVendor
      ? lmartVendor.vendorId
      : approvedVendors[0].vendorId;
  } else {
    nextVendorId = approvedVendors[0].vendorId;
  }

  if (nextVendorId) {
    localStorage.setItem("selectedVendorId", nextVendorId);
  }

  return nextVendorId || "";
});
} else {
  setSelectedMartTab("");
  localStorage.removeItem("selectedVendorId");
}
      } catch (error) {
        console.error(
          "Error fetching vendors for pincode:",
          error,
        );
        if (!cancelled) {
          setApprovedVendorListJson([]);
          setSelectedMartTab("");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zipCode, pinCode, preferLMartDefault, district]);

  useEffect(() => {
  if (!approvedVendorListJson.length) {
    setVendorStoreImages({});
    return;
  }

  let cancelled = false;

  const loadVendorStoreImages = async () => {
    try {
      const results = await Promise.all(
        approvedVendorListJson.map(async (vendor) => {
          const currentVendorId = vendor?.vendorId;

          if (!currentVendorId) {
            return {
              vendorId: "",
              imageUrl: "",
            };
          }

          try {
            const response = await axios.get(
              "https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/VendorUploadProducts/GetVendorProductsvalues",
              {
                params: {
                  vendorId: currentVendorId,
                },
              }
            );

            const data = Array.isArray(response?.data)
              ? response.data[0]
              : response?.data;

            if (!data) {
              return {
                vendorId: currentVendorId,
                imageUrl: "",
              };
            }

            /*
             * API response:
             *
             * image: [
             *   "data:image/jpeg;base64,/9j/4AAQ..."
             * ]
             *
             * Use the actual image returned by the API.
             */
            const imageValue =
              Array.isArray(data?.image) && data.image.length > 0
                ? data.image[0]
                : data?.image || data?.imageName || data?.ImageName || "";

            const imageUrl = getAzureImageUrl(imageValue);

            console.log(
              "Vendor:",
              data?.storeName,
              "VendorId:",
              currentVendorId,
              "Image:",
              imageUrl ? "FOUND" : "NOT FOUND"
            );

            return {
              vendorId: currentVendorId,
              imageUrl,
            };
          } catch (error) {
            console.error(
              `Failed to load store image for vendor ${currentVendorId}:`,
              error
            );

            return {
              vendorId: currentVendorId,
              imageUrl: "",
            };
          }
        })
      );

      if (cancelled) return;

      const imageMap = {};

      results.forEach((item) => {
        if (item.vendorId && item.imageUrl) {
          imageMap[item.vendorId] = item.imageUrl;
        }
      });

      console.log("Vendor Store Images:", imageMap);

      setVendorStoreImages(imageMap);
    } catch (error) {
      console.error("Failed to load vendor store images:", error);

      if (!cancelled) {
        setVendorStoreImages({});
      }
    }
  };

  loadVendorStoreImages();

  return () => {
    cancelled = true;
  };
}, [approvedVendorListJson]);

useEffect(() => {
  if (!approvedVendorListJson.length) {
    setVendorCategoryDetails({});
    return;
  }

  let cancelled = false;

  const loadVendorCategoryDetails = async () => {
    try {
      const results = await Promise.all(
        approvedVendorListJson.map(async (vendor) => {
          const currentVendorId = vendor?.vendorId;
          if (!currentVendorId) return { vendorId: "", categories: [] };

          try {
            const response = await axios.get(GET_VENDOR_CATEGORIES_URL, {
              params: { vendorId: currentVendorId },
            });

            const data = Array.isArray(response?.data) ? response.data : [];

            // Only bind categories the admin has actually approved
            const approvedCategories = data
              .filter((c) => String(c?.status).toLowerCase() === "approved")
              .map((c) => ({
                id: c.id,
                categoryName: c.categoryName || "",
                image:
                  Array.isArray(c.images) && c.images.length > 0
                    ? getAzureImageUrl(c.images[0])
                    : "",
              }));

            return { vendorId: currentVendorId, categories: approvedCategories };
          } catch (error) {
            console.error(
              `Failed to load categories for vendor ${currentVendorId}:`,
              error,
            );
            return { vendorId: currentVendorId, categories: [] };
          }
        }),
      );

      if (cancelled) return;

      const map = {};
      results.forEach((item) => {
        if (item.vendorId) map[item.vendorId] = item.categories;
      });

      setVendorCategoryDetails(map);
    } catch (error) {
      console.error("Failed to load vendor category details:", error);
      if (!cancelled) setVendorCategoryDetails({});
    }
  };

  loadVendorCategoryDetails();

  return () => {
    cancelled = true;
  };
}, [approvedVendorListJson]);

  const getVendorFromJson = (vendorId) =>
    approvedVendorListJson.find((v) => v.vendorId === vendorId);

  const getVendorCategoriesFromJson = (vendorId) =>
    (getVendorFromJson(vendorId)?.categories || []).map((c) => c.category);

  useEffect(() => {
    const loadVendorSession = () => {
      const currentVendorId = localStorage.getItem("vendorSession") || "";
      setVendorSessionId(currentVendorId);
      if (!currentVendorId) {
        setVendorProfile(null);
        setVendorSelectedCategories([]);
        return;
      }
      const storedProfile = getVendorProfileById(currentVendorId);
      const jsonVendor = getVendorFromJson(currentVendorId);
      setVendorProfile(
        storedProfile || (jsonVendor && { name: jsonVendor.storeName }) || null,
      );

      try {
        const storedCategories = JSON.parse(
          localStorage.getItem(`vendorSelectedCategories-${currentVendorId}`) ||
            "[]",
        );
        const safeCategories =
          Array.isArray(storedCategories) && storedCategories.length
            ? storedCategories
            : getVendorCategoriesFromJson(currentVendorId);
        setVendorSelectedCategories(safeCategories);
        setActiveVendorCategoryTab((prev) =>
          safeCategories.includes(prev) ? prev : safeCategories[0] || "",
        );
      } catch {
        setVendorSelectedCategories(
          getVendorCategoriesFromJson(currentVendorId),
        );
        setActiveVendorCategoryTab("");
      }
    };
    loadVendorSession();
    window.addEventListener("storage", loadVendorSession);
    return () => window.removeEventListener("storage", loadVendorSession);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speakNewOrderAlert = useCallback((order) => {
    const customerName = order?.customerName?.trim() || "a customer";
    const zip = order?.zipCode?.toString().trim();
    const message = zip
      ? `New order received from ${customerName}, zip code ${zip}.`
      : `New order received from ${customerName}.`;
    speakAlert(message);
  }, []);

 const speakOrderDeliveredAlert = useCallback((order) => {
    const orderLabel = order?.martId || "your order";
    const message = `Order ${orderLabel} has been delivered.`;
    speakAlert(message);
  }, []);

  useEffect(() => {
    if (!vendorSessionId) {
      setVendorOrderCount(0);
      vendorKnownOrderIdsRef.current = null;
      vendorKnownOrderStatusRef.current = null;
      return;
    }
    let cancelled = false;

    const pollVendorOrders = async () => {
      try {
        const response = await fetch(
          `${GET_VENDOR_ORDERS_URL}?vendorId=${encodeURIComponent(vendorSessionId)}`,
        );
        if (!response.ok || cancelled) return;
        const data = await response.json();
        const list = Array.isArray(data) ? data : [];
        setVendorOrderCount(list.length);

        const ids = new Set(list.map((o) => o.id));
        const previousStatusById = vendorKnownOrderStatusRef.current;
        if (vendorKnownOrderIdsRef.current) {
          const arrivedOrders = list.filter(
            (o) => !vendorKnownOrderIdsRef.current.has(o.id),
          );
          if (arrivedOrders.length) {
            setVendorHasNewOrder(true);
            try {
              playNotificationSound();
            } catch {
            }
             setTimeout(() => {
              arrivedOrders.forEach((order) => speakNewOrderAlert(order));
            }, 600);
          }

          if (previousStatusById) {
            const justDelivered = list.filter((o) => {
              const prevStatus = previousStatusById.get(o.id);
              const nowDelivered = String(o.status).toLowerCase() === "delivered";
              const wasDelivered = String(prevStatus || "").toLowerCase() === "delivered";
              return prevStatus !== undefined && nowDelivered && !wasDelivered;
            });
            if (justDelivered.length) {
              setTimeout(() => {
                justDelivered.forEach((order) => speakOrderDeliveredAlert(order));
              }, 600);
            }
          }
        }
        vendorKnownOrderIdsRef.current = ids;
        vendorKnownOrderStatusRef.current = new Map(
          list.map((o) => [o.id, o.status]),
        );
      } catch (err) {
        console.error("Failed to poll vendor orders:", err);
      }
    };

    pollVendorOrders();
    const interval = setInterval(pollVendorOrders, VENDOR_ORDERS_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [vendorSessionId, speakNewOrderAlert, speakOrderDeliveredAlert]);

  const handleVendorOrdersBellClick = (e) => {
    e.stopPropagation();
    setVendorHasNewOrder(false);
    if (vendorSessionId) {
      navigate(`/vendor/orders/${vendorSessionId}`);
    } else {
      navigate("/vendor/login");
    }
  };

   const renderVendorOrderBell = () =>
    vendorSessionId ? (
      <>
        <span
          onClick={handleVendorOrdersBellClick}
          title="View vendor orders"
          className={`d-inline-flex align-items-center justify-content-center rounded-circle bg-white position-absolute${
            vendorHasNewOrder ? " vendor-bell-ring" : ""
          }`}
          style={{
            width: 20,
            height: 20,
            top: -4,
            right: -4,
            color: "#10301F",
            boxShadow: "0 1px 4px rgba(0,0,0,.35)",
            cursor: "pointer",
            zIndex: 2,
          }}
        >
          <NotificationsActiveIcon style={{ fontSize: 12 }} />
          {vendorOrderCount > 0 && (
            <span
              className="badge rounded-pill bg-danger position-absolute"
              style={{ top: -6, right: -6, fontSize: 9, padding: "2px 4px" }}
            >
              {vendorOrderCount}
            </span>
          )}
        </span>
        <style>{`
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
        `}</style>
      </>
    ) : null;

 const speakNewDeliveryAssignmentAlert = useCallback((order) => {
    const orderLabel = order?.martId || "a new order";
    const message = `New order assigned to you, order ${orderLabel}.`;
    speakAlert(message);
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(
          `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/DeliveryPartner/GetDeliveryPartnerDetailsByUserId?userId=${userId}`,
        );
        if (cancelled) return;
        const raw = res?.data ?? null;
        const profile = Array.isArray(raw)
          ? raw.length > 0
            ? raw[0]
            : null
          : raw && typeof raw === "object" && Object.keys(raw).length > 0
            ? raw
            : null;
        setDeliveryProfile(profile);
        setIsRegistered(profile?.isRegistered === true);
        setPartnerStatus((profile?.status || "").toLowerCase());
      } catch (err) {
         }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

 useEffect(() => {
    if (!(isRegistered && partnerStatus === "open")) {
      setDeliveryOrderCount(0);
      deliveryKnownOrderIdsRef.current = null;
      return;
    }
    let cancelled = false;

    const pollDeliveryOrders = async () => {
      try {
        const response = await fetch(
          `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/Mart/GetMartTicketsByUserId?userId=${userId}`,
        );
        if (!response.ok || cancelled) return;
        const data = await response.json();
        const tickets = Array.isArray(data)
          ? data
          : data && typeof data === "object"
            ? [data]
            : [];
        const assigned = tickets.filter(
          (item) => String(item?.status || "").toLowerCase() === "in progress",
        );
        setDeliveryOrderCount(assigned.length);

        const ids = new Set(assigned.map((o) => o.id));
        if (deliveryKnownOrderIdsRef.current) {
          const arrivedOrders = assigned.filter(
            (o) => !deliveryKnownOrderIdsRef.current.has(o.id),
          );
          if (arrivedOrders.length) {
            setDeliveryHasNewOrder(true);
            try {
              playNotificationSound();
            } catch {
            }
            setTimeout(() => {
              arrivedOrders.forEach((order) => speakNewDeliveryAssignmentAlert(order));
            }, 600);
          }
        }
        deliveryKnownOrderIdsRef.current = ids;
      } catch (err) {
        console.error("Failed to poll delivery partner orders:", err);
      }
    };

    pollDeliveryOrders();
    const interval = setInterval(pollDeliveryOrders, VENDOR_ORDERS_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isRegistered, partnerStatus, userId, speakNewDeliveryAssignmentAlert]);

  const handleDeliveryOrdersBellClick = (e) => {
    e.stopPropagation();
    setDeliveryHasNewOrder(false);
    navigate(`/deliveryPartnerDashboard/${userType}/${userId}`);
  };

  const renderDeliveryOrderBell = () =>
    isRegistered && partnerStatus === "open" ? (
      <>
        <span
          onClick={handleDeliveryOrdersBellClick}
          title="View assigned orders"
          className={`d-inline-flex align-items-center justify-content-center rounded-circle bg-white position-absolute${
            deliveryHasNewOrder ? " vendor-bell-ring" : ""
          }`}
          style={{
            width: 20,
            height: 20,
            top: -4,
            right: -4,
            color: "#10301F",
            boxShadow: "0 1px 4px rgba(0,0,0,.35)",
            cursor: "pointer",
            zIndex: 2,
          }}
        >
          <NotificationsActiveIcon style={{ fontSize: 12 }} />
          {deliveryOrderCount > 0 && (
            <span
              className="badge rounded-pill bg-danger position-absolute"
              style={{ top: -6, right: -6, fontSize: 9, padding: "2px 4px" }}
            >
              {deliveryOrderCount}
            </span>
          )}
        </span>
      </>
    ) : null;

  const handleEnablePush = async () => {
    setPushLoading(true);
    try {
      const result = await PushNotificationService.initialize(userId);
      if (result.granted) {
        setPushEnabled(true);
        localStorage.setItem(`hm_push_enabled_${userId}`, "true");
        PushNotificationService.show(
          "Notifications Enabled!",
          "You will now receive order updates and offers from Handyman.",
        );
      } else {
        alert(
          result.reason ||
            "Could not enable notifications. Please allow notifications in your browser settings.",
        );
      }
    } catch (err) {
      console.error("Push notification error:", err);
    } finally {
      setPushLoading(false);
    }
  };

  const handleDismissPush = () => {
    setPushDismissed(true);
    sessionStorage.setItem("hm_push_dismissed", "true");
  };

  /* ── Smart cache refresh: clear stale cache once per day ── */
  useEffect(() => {
    const CACHE_KEY = "hm_cache_last_cleared";
    const ONE_DAY = 24 * 60 * 60 * 1000;
    const last = Number(localStorage.getItem(CACHE_KEY) || 0);
    if (Date.now() - last > ONE_DAY) {
      ImageCache.clearAll().then(() => {
        localStorage.setItem(CACHE_KEY, String(Date.now()));
      });
    }
  }, []);

  useEffect(() => {
    console.log(
      activeVendorCategoryTab,
      vendorProfile,
      windowSize,
      state,
      address,
      mobileNumber,
      id,
      pinCode,
      paidAmount,
      paymentMode,
      martId,
      status,
      imageLoading,
      zoomProduct,
      zoomImage,
      showZoomModal,
      cartSummary,
      items,
      showMenu,
    );
  }, [
    activeVendorCategoryTab,
    vendorProfile,
    windowSize,
    state,
    address,
    mobileNumber,
    id,
    pinCode,
    paidAmount,
    paymentMode,
    martId,
    status,
    imageLoading,
    zoomProduct,
    zoomImage,
    showZoomModal,
    cartSummary,
    items,
    showMenu,
  ]);

  /* ── Vendor session: load vendor profile + their locally-saved selected categories ── */
  useEffect(() => {
    const loadVendorSession = () => {
      const currentVendorId = localStorage.getItem("vendorSession") || "";
      setVendorSessionId(currentVendorId);
      if (!currentVendorId) {
        setVendorProfile(null);
        setVendorSelectedCategories([]);
        return;
      }
      const storedProfile = getVendorProfileById(currentVendorId);
      setVendorProfile(storedProfile || null);
      try {
        const storedCategories = JSON.parse(
          localStorage.getItem(`vendorSelectedCategories-${currentVendorId}`) ||
            "[]",
        );
        const safeCategories = Array.isArray(storedCategories)
          ? storedCategories
          : [];
        setVendorSelectedCategories(safeCategories);
        setActiveVendorCategoryTab((prev) =>
          safeCategories.includes(prev) ? prev : safeCategories[0] || "",
        );
      } catch {
        setVendorSelectedCategories([]);
        setActiveVendorCategoryTab("");
      }
    };
    loadVendorSession();
    window.addEventListener("storage", loadVendorSession);
    return () => window.removeEventListener("storage", loadVendorSession);
  }, []);

  const vendorSelectedProducts = useMemo(() => {
    if (!vendorSessionId || vendorSelectedCategories.length === 0) return {};
    return vendorSelectedCategories.reduce((acc, cat) => {
      acc[cat] = allProducts.filter(
        (p) => (p.category || "Unspecified") === cat,
      );
      return acc;
    }, {});
  }, [vendorSessionId, vendorSelectedCategories, allProducts]);

  const getVendorCategoryImage = (cat) => {
    const match =
      groceryCategories.find((c) => c.value === cat) ||
      categories.find((c) => c.value === cat);
    if (match) return match.image; 
    return makePlaceholderImage(cat, "ff5722", "ffffff");
  };

  const getVendorCategoryImageFromApi = (vendorId, categoryName) => {
  const apiCategories = vendorCategoryDetails[vendorId] || [];
  const match = apiCategories.find((c) => c.categoryName === categoryName);
  if (match?.image) return match.image;
  // Fallback to the existing static/placeholder logic if this vendor's
  // category has no approved image yet (e.g. "Pending Approval")
  return getVendorCategoryImage(categoryName);
};

const VENDOR_PALETTES = [
  { gradient: "linear-gradient(135deg,#ff6b35,#d84315)", solid: "#d84315", light: "#ffd1c2", shadow: "rgba(216,67,21,0.35)" },
  { gradient: "linear-gradient(135deg,#9c6cff,#4527a0)", solid: "#4527a0", light: "#ddd0ff", shadow: "rgba(69,39,160,0.35)" },
  { gradient: "linear-gradient(135deg,#00d4c7,#00695c)", solid: "#00695c", light: "#b8eee9", shadow: "rgba(0,105,92,0.35)" },
  { gradient: "linear-gradient(135deg,#7ed957,#1b5e20)", solid: "#1b5e20", light: "#c9efbd", shadow: "rgba(27,94,32,0.35)" },
  { gradient: "linear-gradient(135deg,#ff4f9a,#880e4f)", solid: "#880e4f",  light: "#f8c4dd", shadow: "rgba(136,14,79,0.35)" },
  { gradient: "linear-gradient(135deg,#ffd54f,#e65100)", solid: "#e65100", light: "#ffe8a3", shadow: "rgba(230,81,0,0.35)" },
];

const getVendorGradient = (name = "") => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const idx = Math.abs(hash) % VENDOR_PALETTES.length;
  return VENDOR_PALETTES[idx];
};

  useEffect(() => {
  const allVendorProducts = Object.values(vendorSelectedProducts).flat();

  if (!allVendorProducts.length) return;

  const imageMap = {};

  allVendorProducts.forEach((p) => {
    const photo = Array.isArray(p.images) ? p.images[0] : "";

    if (photo && !imageUrls[p.id]) {
      imageMap[p.id] = getAzureImageUrl(photo);
    }
  });

  if (Object.keys(imageMap).length) {
    setImageUrls((prev) => ({
      ...prev,
      ...imageMap,
    }));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [vendorSelectedProducts]);

  const placeholderSuggestions = [
    'Search "Milk"',
    'Search "Freedom Refined Sunflower Oil"',
    'Search "Sona Masoori Rice"',
    'Search "Paneer"',
    'Search "Red Label"',
    'Search "Coffee"',
    'Search "Aashirvaad"',
    'Search "Surf Excel"',
    'Search "Toothpaste"',
    'Search "Lizol"',
    'Search "Maggi"',
    'Search "Horlicks"',
    'Search "Eggs"',
    'Search "Chocolate"',
    'Search "Butter"',
    'Search "Bread"',
    'Search "Chicken"',
    'Search "Shampoo"',
    'Search "Soap"',
  ];

  useEffect(() => {
    if (!profile.fullName) return;
    const name = profile.fullName.trim().toLowerCase();
    if (name === "guest") {
      setShowWelcomeMessage(true);
      const timer = setTimeout(() => setShowWelcomeMessage(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [profile.fullName]);

  useEffect(() => {
    const onResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholderSuggestions.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [placeholderSuggestions.length]);

  const fetchWalletAmount = useCallback(async () => {
    try {
      setWalletLoading(true);
      const response = await fetch(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/OffersTransactions/GetOfferTransactionByUserId?userId=${userId}`,
      );
      const data = await response.json();
      if (data && data.length > 0) {
        setWalletAmount(data[0].remainingAmount || "0");
      } else {
        setWalletAmount("0");
      }
    } catch (error) {
      console.error("Error fetching wallet amount:", error);
      setWalletAmount("0");
    } finally {
      setWalletLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchWalletAmount();
    }
  }, [userId, fetchWalletAmount]);


  const getMaxAllowedQty = (product) => {
    if (!product) return 0;
    return Math.min(
      product.stockLeft,
      product.limit > 0 ? product.limit : Infinity,
    );
  };

  useEffect(() => {
    const categories = JSON.parse(
      localStorage.getItem("allCategories") || "[]",
    );
    categories.forEach((cat) => {
      cat.products.forEach(async (p) => {
        // Skip if already cached or if fetch is in progress
        if (cartImages[p.id]) return;
        if (cartImages[p.id]) return;
        if (!p.imageFile || cartImages[p.id]) return;
        try {
        const imageUrl = getAzureImageUrl(p.imageFile);

        if (imageUrl) {
          setCartImages((prev) => ({
            ...prev,
            [p.id]: imageUrl,
          }));
        }
      } catch (err) {
        console.error("Cart image load failed", err);
      }
      });
    });
  }, [cartImages]);

  useEffect(() => {
    const raw = localStorage.getItem("allCategories");
    if (!raw) return;
    const categories = JSON.parse(raw);
    categories.forEach((cat) => {
      cat.products.forEach(async (item) => {
        if (!item.imageFile || cartImages[item.id]) return;
        try {
        const imageUrl = getAzureImageUrl(item.imageFile);

        if (imageUrl) {
          setCartImages((prev) => ({
            ...prev,
            [item.id]: imageUrl,
          }));
        }
      } catch (e) {
        console.error("Cart image fetch failed", e);
      }
      });
    });
  }, [cartImages]);

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleImageClick = (imageSrc, product) => {
    setZoomImage(imageSrc);
    setZoomProduct(product);
    setShowZoomModal(true);
  };
  /* ================ VOICE SEARCH ================= */
  const startVoiceSearch = () => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("Voice search not supported in this browser");
      return;
    }
    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;
    setListening(true);
    recognition.onresult = (event) => {
      const spokenText = event.results[0][0].transcript;
      setSearchQuery(spokenText);
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
  };

  const normalizeProduct = (p) => ({
    ...p,
    stockLeft: Number(p.stockLeft || 0),
    limit: Number(p.limit || 0),
    afterDiscount: Number(p.afterDiscount || 0),
    mrp: Number(p.mrp || 0),
  });

  useEffect(() => {
    const fetchProducts = async (showLoader = false) => {
      if (showLoader) setLoading(true);
      try {
       const items = await getGroceryItems();
        const normalized = items
          .map(normalizeProduct)
          .filter((p) => p.status === "Approved");
        setAllProducts((prev) => {
          if (
            prev.length === normalized.length &&
            prev.every(
              (p, i) =>
                p.id === normalized[i].id &&
                p.stockLeft === normalized[i].stockLeft &&
                p.limit === normalized[i].limit,
            )
          ) {
            return prev;
          }
          return normalized;
        });
      } catch (err) {
        console.error("Fetching grocery items failed", err);
      } finally {
        if (showLoader) setLoading(false);
      }
    };
    fetchProducts(true);
  }, [profile.mobileNumber]);

  /* ================= FILTER ================= */
  useEffect(() => {
    let result = allProducts.filter((p) => p.status === "Approved");
    if (searchQuery.trim()) {
      result = result.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    } else {
      result = [];
    }
    setFilteredProducts(result);
  }, [searchQuery, allProducts]);

  /* ================= FETCH IMAGES ================= */
  useEffect(() => {
    if (!filteredProducts.length) return;
    const controller = new AbortController();
    filteredProducts.forEach(async (p) => {
      if (!p.images?.[0] || imageUrls[p.id]) return;
      try {
        const imageUrl = getAzureImageUrl(p.images[0]);

      if (!imageUrl) return;

      setImageUrls((prev) => ({
        ...prev,
        [p.id]: imageUrl,
      }));
      } catch {}
    });
    return () => controller.abort();
  }, [filteredProducts, imageUrls]);

  const handleAddClick = (product) => {
    const maxQty = getMaxAllowedQty(product);
    if (maxQty <= 0) return;
    updateLocalStorageCart(
      { ...product, imageFile: product.images?.[0] || "" },
      1,
    );
    setCart((prev) => ({ ...prev, [product.id]: 1 }));
  };

  const handleIncrement = (product) => {
    const maxQty = getMaxAllowedQty(product);

    setCart((prev) => {
      const current = prev[product.id] || 0;
      if (current >= maxQty) return prev;

      const next = current + 1;
      updateLocalStorageCart(product, next);
      return { ...prev, [product.id]: next };
    });
  };

  const handleDecrementClick = (product) => {
    setCart((prev) => {
      const qty = prev[product.id] || 0;
      const newQty = qty - 1;

      updateLocalStorageCart(product, newQty);

      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[product.id];
        return copy;
      }
      return { ...prev, [product.id]: newQty };
    });
  };

  const renderProductCard = (product) => {
    const maxQty = getMaxAllowedQty(product);
    const isOutOfStock = maxQty <= 0;
    return (
      <div
        key={product.id}
        className="w-[200px] flex flex-col p-2 bg-white rounded shadow-sm border position-relative"
        style={{ minHeight: "250px", opacity: isOutOfStock ? 0.6 : 1 }}
      >
        <div className="d-flex flex-row justify-content-between absolute top-0 left-0 w-full">
          {Number(product.discount) > 0 && !isOutOfStock && (
            <span className="discount-badge">
              {Math.round(Number(product.discount))}%
            </span>
          )}
        </div>
        {/* Product Image */}
        <div
          className="d-flex justify-content-center align-items-center position-relative"
          style={{ height: "90px" }}
        >
          {imageUrls[product.id] ? (
            <img
              src={cartImages[product.id] || imageUrls[product.id]}
              alt={product.name}
              decoding="async"
              loading="eager"
              fetchpriority="high"
              style={{
                maxHeight: "80px",
                maxWidth: "100%",
                objectFit: "contain",
                cursor: isOutOfStock ? "not-allowed" : "pointer",
                borderRadius: "6px",
              }}
              onClick={() =>
                !isOutOfStock &&
                handleImageClick(
                  cartImages[product.id] || imageUrls[product.id],
                  product,
                )
              }
            />
          ) : (
            <span className="text-muted small">Loading Image</span>
          )}

          {isOutOfStock && (
            <div
              className="position-absolute d-flex justify-content-center align-items-center"
              style={{
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                background: "rgba(255,255,255,0.75)",
                borderRadius: "6px",
                zIndex: 2,
              }}
            >
              <span
                style={{
                  fontWeight: 500,
                  backgroundColor: "grey",
                  color: "white",
                  fontSize: "10px",
                  borderRadius: "6px",
                  margin: "1px",
                  padding: "2px",
                }}
              >
                Out of Stock
              </span>
            </div>
          )}
        </div>

        {/* Product Name */}
        <h6
          className="text-start fw-bold m-0"
          style={{
            fontSize: "11px",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            textOverflow: "ellipsis",
            lineHeight: "1.2em",
            maxHeight: "3.6em",
          }}
        >
          {product.name}
        </h6>

        {/* Price/MRP/Units — ONLY when in stock */}
        {!isOutOfStock && (
          <div className="text-start m-0" style={{ fontSize: "11px" }}>
            {product.afterDiscount != null && (
              <b className="text-success me-2">
                ₹{Math.round(Number(product.afterDiscount))}
              </b>
            )}
            {product.mrp != null && (
              <s className="text-muted">₹{product.mrp}</s>
            )}
            {product.units && (
              <b className="text-success" style={{ marginLeft: "5px" }}>
                {product.units}
              </b>
            )}
          </div>
        )}

        {Number(product.limit) > 0 && (
          <div
            style={{
              fontSize: "10px",
              marginBottom: "5px",
              color: "#d32f2f",
            }}
          >
            Max {Number(product.limit)} Per User
          </div>
        )}

        {/* Checkbox */}
        {!isOutOfStock && (
          <div style={{ position: "absolute", bottom: "8px", left: "8px" }}>
            <input
              type="checkbox"
              className="border-dark"
              checked={cart[product.id] > 0}
              readOnly
            />
          </div>
        )}

        {/* Add/Counter — ONLY when in stock */}
        {!isOutOfStock && (
          <div style={{ position: "absolute", bottom: "8px", right: "8px" }}>
            {cart[product.id] ? (
              <div
                className="d-flex align-items-center justify-content-between"
                style={{
                  backgroundColor: "green",
                  color: "white",
                  borderRadius: "8px",
                  padding: "2px",
                  minWidth: "60px",
                }}
              >
                {/* ➖ DECREMENT */}
                <button
                  className="btn btn-sm p-0 text-white"
                  onClick={() => handleDecrementClick(product)}
                >
                  –
                </button>
                <span className="fw-bold">{cart[product.id]}</span>
                {/* ➕ INCREMENT */}
                <button
                  className="btn btn-sm p-0 text-white"
                  disabled={(cart[product.id] || 0) >= maxQty}
                  onClick={() => handleIncrement(product)}
                >
                  +
                </button>
              </div>
            ) : (
              <button
                className="btn fw-bold"
                style={{
                  border: "1px solid green",
                  color: "green",
                  backgroundColor: "#f6fff6",
                  borderRadius: "8px",
                  padding: "2px 12px",
                  fontSize: "13px",
                }}
                onClick={() => handleAddClick(product)}
              >
                ADD
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const loadDeliveryPartnerTickets = useCallback(async () => {
    try {
      setDeliveryTicketsLoading(true);
      const response = await fetch(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/Mart/GetMartTicketsByUserId?userId=${userId}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch ticket data");
      }
      const data = await response.json();
      const tickets = Array.isArray(data)
        ? data
        : data && typeof data === "object"
          ? [data]
          : [];
      const inProgressTickets = tickets.filter(
        (item) => item.status && item.status.toLowerCase() === "in progress",
      );
      setGroceryData(inProgressTickets);
      const first = inProgressTickets[0] || {};
      setMartId(first.martId || "");
      setState(first.state || "");
      setDistrict(first.district || "");
      setPinCode(first.zipCode || first.pinCode || "");
      setAddress(first.address || "");
      setId(first.id || "");
      setPaymentMode(first.paymentMode || "");
      setStatus(first.status || "");
      setFullName(first.customerName || "");
      setMobileNumber(first.customerPhoneNumber || "");
    } catch (error) {
      console.error("Error fetching ticket data:", error);
      setGroceryData([]);
    } finally {
      setDeliveryTicketsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    console.log(deliveryProfile);
  }, [deliveryProfile]);

  const handleDeliveryPartnerClick = async () => {
    if (clickLock.current) return;
    clickLock.current = true;
    try {
      const res = await axios.get(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/DeliveryPartner/GetDeliveryPartnerDetailsByUserId?userId=${userId}`,
      );
      const raw = res?.data ?? null;
      const profile = Array.isArray(raw)
        ? raw.length > 0
          ? raw[0]
          : null
        : raw && typeof raw === "object" && Object.keys(raw).length > 0
          ? raw
          : null;
      setDeliveryProfile(profile);
      const reg = profile?.isRegistered === true;
      const st = (profile?.status || "").toLowerCase();
      setIsRegistered(reg);
      setPartnerStatus(st);
      if (reg && st === "open") {
        navigate(`/deliveryPartnerDashboard/${userType}/${userId}`);
      } else if (reg) {
        await loadDeliveryPartnerTickets();
        setShowNotificationModal(true);
      } else {
        setShowInterestModal(true);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
      setShowInterestModal(true);
    } finally {
      setTimeout(() => {
        clickLock.current = false;
      }, 200);
    }
  };

  const handleConfirmInterest = () => {
    if (selectedOption === "yes") {
      setShowInterestModal(false);
      navigate(`/deliveryPartner/${userType}/${userId}`);
    } else {
      setShowInterestModal(false);
    }
  };

  useEffect(() => {
    const summary = CartStorage.grandSummary();
    setCartSummary(summary);
  }, []);

  const isActionLocked =
    selectedOrder?.status === "Open" || selectedOrder?.status === "Return";

  const handleStatusUpdate = async (ticket, newStatus) => {
    try {
      const detailsResponse = await fetch(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/Mart/GetProductDetails?id=${ticket.id}`,
      );

      if (!detailsResponse.ok) {
        throw new Error("Failed to fetch order details");
      }
      const currentOrderData = await detailsResponse.json();
      const payload = {
        ...currentOrderData,
        id: ticket.id,
        userId: userId,
        martId: ticket.martId,
        date: ticket.date,
        status: newStatus,
        PaymentMode:
          newStatus === "Open" || newStatus === "Return"
            ? ""
            : ticket.paymentType,
        utrTransactionNumber: currentOrderData.utrTransactionNumber || "",
        transactionNumber: currentOrderData.transactionNumber || "",
        transactionStatus: currentOrderData.transactionStatus || "",
        PaidAmount:
          newStatus === "Open" || newStatus === "Return"
            ? ""
            : String(ticket.receivedAmount || 0),
        AssignedTo:
          newStatus === "Open"
            ? ` ${currentOrderData.assignedTo} has Declined`
            : newStatus === "Return"
              ? `${currentOrderData.assignedTo} Return`
              : currentOrderData.assignedTo,
        DeliveryPartnerUserId:
          newStatus === "Open" || newStatus === "Return"
            ? ""
            : currentOrderData.deliveryPartnerUserId,
        deliveryAssignedTime:
          newStatus === "Open" || newStatus === "Return"
            ? ""
            : currentOrderData.deliveryAssignedTime,
        deliverySubmitTime: new Date().toISOString(),
        latitude: currentOrderData.latitude,
        longitude: currentOrderData.longitude,
        isDelivered: true,
      };
      console.log("FINAL PAYLOAD:", payload);
      const response = await fetch(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/Mart/UpdateProductDetails/${ticket.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        throw new Error("Failed to update order");
      }
      if (newStatus === "Open") {
        alert("You declined the order.");
        setShowNotificationModal(false);
      } else if (newStatus === "Return") {
        alert("Order returned.");
        setShowNotificationModal(false);
      }
    } catch (error) {
      console.error("Status update error:", error);
    }
  };

  const handleUpdatePaymentMethod = async (ticket) => {
    try {
      const detailsResponse = await fetch(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/Mart/GetProductDetails?id=${ticket.id}`,
      );

      if (!detailsResponse.ok) {
        throw new Error("Failed to fetch order details");
      }
      const currentOrderData = await detailsResponse.json();
      const payload = {
        ...currentOrderData,
        id: ticket.id,
        userId: userId,
        martId: ticket.martId,
        date: ticket.date,
        status: "Delivered",
        utrTransactionNumber: currentOrderData.utrTransactionNumber || "",
        transactionNumber: currentOrderData.transactionNumber || "",
        transactionStatus: currentOrderData.transactionStatus || "",
        PaymentMode: ticket.paymentType,
        PaidAmount:
          ticket.paymentType?.toLowerCase() === "cash&online"
            ? `cash=${ticket.cashAmount || 0}, online=${ticket.onlineAmount || 0}`
            : String(ticket.receivedAmount || 0),
        AssignedTo: currentOrderData.assignedTo,
        DeliveryPartnerUserId: currentOrderData.deliveryPartnerUserId,
        deliveryAssignedTime: currentOrderData.deliveryAssignedTime,
        deliverySubmitTime: new Date().toISOString(),
        latitude: currentOrderData.latitude,
        longitude: currentOrderData.longitude,
        isDelivered: true,
      };
      console.log("FINAL PAYLOAD:", payload);
      const response = await fetch(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/Mart/UpdateProductDetails/${ticket.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        throw new Error("Failed to update order");
      }
      setGroceryData((prev) =>
        prev.map((g) =>
          g.id === ticket.id ? { ...g, status: "Delivered" } : g,
        ),
      );

      setSelectedTicket(null);
      alert("Order Delivered Successfully");
      setShowNotificationModal(false);
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to update. Please try again.");
    }
  };

  const handleVendorCategoryClick = (vendor, category) => {
    const mobileNumber = profile?.mobileNumber || "";

    const encodedCategory = encodeURIComponent(category.category);

   const resolvedProducts = (category.products || [])
      .map((entry) => {
        const base = allProducts.find(
          (p) => String(p.id) === String(entry.productId),
        );
        if (!base) return null;
        const mrp = Number(base.mrp || 0);
        const discount = Number(entry.discount ?? base.discount ?? 0);
        const afterDiscount =
          discount > 0
            ? Math.round(mrp - (mrp * discount) / 100)
            : Number(base.afterDiscount || mrp);
        return {
          ...base,
          discount,
          afterDiscount,
          stockLeft: Number(entry.qty ?? base.stockLeft ?? 0),
        };
      })
      .filter(Boolean);

    // Save exact vendor + category
    localStorage.setItem(
      "vendorGrocerySelection",
      JSON.stringify({
        isVendorGrocery: true,
        vendorId: vendor.vendorId,
        storeName: vendor.storeName,
        category: category.category,
        products: resolvedProducts,
      }),
    );
    localStorage.setItem( "selectedVendorId", vendor.vendorId);
    // Also save the EXACT category
    localStorage.setItem("encodedCategory", encodedCategory);

    navigate(`/grocery/${userType}/${userId}`, {
      state: {
        mobileNumber,
        isVendorGrocery: true,
        vendorId: vendor.vendorId,
        storeName: vendor.storeName,
        category: category.category,
        products: resolvedProducts,
        encodedCategory,
      },
    });
  };

  const handleGroceryCategoryClick = (category) => {
    const { value } = category;
    const mobileNumber = profile?.mobileNumber || "";
    const encodedCategory = encodeURIComponent(value);
    localStorage.setItem("encodedCategory", encodedCategory);
     localStorage.removeItem("vendorGrocerySelection");
    if (value === "Kitchenware Appliances") {
      navigate(`/grocery/${userType}/${userId}`, {
        state: { mobileNumber },
      });
      return;
    }
      if (value === "Electrical Products" || value === "Plumbing Products"  || value === "Home Decors" || value === "Electronics appliances" || value === "Hardware items") {
      navigate(`/martHomeAppliances/${userType}/${userId}`, {
        state: { applianceType: value },
      });
      return;
    }

    if (value === "Grocery Value Combo Packs") {
      navigate(`/groceryOffers/${userType}/${userId}`, {
        state: { mobileNumber },
      });
    } else {
      navigate(`/grocery/${userType}/${userId}`, {
        state: { mobileNumber },
      });
    }
  };

  const buildMartUpdateSignature = (ticket) =>
    [
      ticket?.status || "",
      ticket?.slotTime || "",
      ticket?.assignedTo || "",
      ticket?.deliveryAssignedTime || "",
      ticket?.deliverySubmitTime || "",
    ].join("|");

  const formatMartUpdateMessage = (ticket) => {
    const orderId = ticket?.martId || ticket?.id || "your order";
    if (ticket?.slotTime) {
      return `Order ${orderId} is scheduled for ${ticket.slotTime}.`;
    }
    if (ticket?.assignedTo) {
      return `Order ${orderId} is assigned to ${ticket.assignedTo}.`;
    }
    if (ticket?.status) {
      return `Order ${orderId} status updated to ${ticket.status}.`;
    }
    return `Order ${orderId} has a new update.`;
  };

  const notifyMartOrderUpdates = useCallback(
    (martTickets) => {
      const storageKey = `hm_seen_mart_updates_${userId}`;
      let seenMap = {};
      try {
        seenMap = JSON.parse(localStorage.getItem(storageKey) || "{}");
      } catch {
        seenMap = {};
      }

      const nextSeenMap = { ...seenMap };
      const updatedTickets = [];
      const startedDeliveries = [];

      (Array.isArray(martTickets) ? martTickets : []).forEach((ticket) => {
        const ticketKey = String(ticket?.id || ticket?.martId || "").trim();
        if (!ticketKey) return;

        const signature = buildMartUpdateSignature(ticket);
        if (!signature) return;

        if (!martTicketSyncRef.current) {
          nextSeenMap[ticketKey] = signature;
          return;
        }

        if (seenMap[ticketKey] !== signature) {
          nextSeenMap[ticketKey] = signature;
          updatedTickets.push(ticket);
          const previousStatus = String(seenMap[ticketKey] || "")
            .split("|")[0]
            .toLowerCase();
          if (
            previousStatus !== "in progress" &&
            String(ticket?.status || "").toLowerCase() === "in progress"
          ) {
            startedDeliveries.push(ticket);
          }
        }
      });

      localStorage.setItem(storageKey, JSON.stringify(nextSeenMap));

      if (updatedTickets.length > 0) {
        const latestTicket = updatedTickets[updatedTickets.length - 1];
        const message = formatMartUpdateMessage(latestTicket);
        setAutoOrderPrompt({
          title: "Order Update",
          message,
          ticket: latestTicket,
        });
        if (PushNotificationService.isEnabled()) {
          PushNotificationService.show("Handyman Order Update", message);
        }
      }

      if (startedDeliveries.length > 0) {
        const startedOrder = startedDeliveries[startedDeliveries.length - 1];
        speakTeluguAlert(
          `మీ ఆర్డర్ ${startedOrder?.martId || ""} డెలివరీ కోసం బయలుదేరింది. ట్రాక్ చేయడానికి ట్రాక్ డెలివరీ బటన్ నొక్కండి.`,
        );
      }

      martTicketSyncRef.current = true;
    },
    [userId],
  );

  const fetchAllTickets = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
        }
        const [
          ticketResponse,
          productResponse,
          technicianResponse,
          groceriesResponse,
          lakshmiResponse,
        ] = await Promise.all([
          fetch(
            `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/RaiseTicket/GetAllTicketsList?userId=${userId}&type=raiseTicket`,
          ),
          fetch(
            `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/RaiseTicket/GetAllTicketsList?userId=${userId}&type=buyProduct`,
          ),
          fetch(
            `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/RaiseTicket/GetAllTicketsList?userId=${userId}&type=bookTechnician`,
          ),
          fetch(
            `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/RaiseTicket/GetAllTicketsList?userId=${userId}&type=mart`,
          ),
          fetch(
            `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/RaiseTicket/GetAllTicketsList?userId=${userId}&type=collections`,
          ),
        ]);
        if (
          !ticketResponse.ok ||
          !productResponse.ok ||
          !technicianResponse ||
          !groceriesResponse ||
          !lakshmiResponse
        ) {
          throw new Error(
            "Failed to fetch ticket, product and technician data",
          );
        }
        const ticketData = await ticketResponse.json();
        const productData = await productResponse.json();
        const technicianData = await technicianResponse.json();
        const groceryData = await groceriesResponse.json();
        const collectionsData = await lakshmiResponse.json();
        const groceryOpenTickets = Array.isArray(groceryData)
          ? groceryData.filter((item) =>
              ["open", "in progress", "delivered"].includes(
                String(item?.status).toLowerCase(),
              ),
            )
          : [];
        const collectionOpenTickets = Array.isArray(collectionsData)
          ? collectionsData.filter(
              (item) => String(item?.status).toLowerCase() === "open",
            )
          : [];
        const nextTickets = [
          ...ticketData,
          ...productData,
          ...technicianData,
          ...groceryOpenTickets,
          ...collectionOpenTickets,
        ];
        setAllTickets(nextTickets);
        notifyMartOrderUpdates(groceryOpenTickets);
      } catch (error) {
        console.error("Error fetching ticket, product data:", error);
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [notifyMartOrderUpdates, userId],
  );

  useEffect(() => {
    fetchAllTickets();
  }, [fetchAllTickets]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      fetchAllTickets({ silent: true });
    }, 60000);
    return () => window.clearInterval(intervalId);
  }, [fetchAllTickets]);

  const calculateCashback = (ticket) => {
    if (!ticket || !ticket.categories) return 0;

    let totalAmountFromApi = 0;

    ticket.categories.forEach((cat) => {
      if (cat.totalAmount != null) {
        totalAmountFromApi += Number(cat.totalAmount) || 0;
      } else if (Array.isArray(cat.products)) {
        cat.products.forEach((p) => {
          const price = Number(p.afterDiscountPrice || 0);
          const qty = Number(p.noOfQuantity || 0);
          totalAmountFromApi += price * qty;
        });
      }
    });

    const grandTotalNumeric = Number(ticket.grandTotal) || 0;
    const cashback = totalAmountFromApi - grandTotalNumeric;
    if (
      (cashback >= 49 && cashback <= 51) ||
      (cashback >= 79 && cashback <= 81) ||
      (cashback >= 99 && cashback <= 101) ||
      (cashback >= 199 && cashback <= 201)
    ) {
      return cashback;
    }
    return 0;
  };

  const handleCustomerCareCall = () => {
    window.location.href = "tel:6281198953";
  };

  const handleTrackOrder = async (ticket) => {
    try {
      setShowTrackModal(true);
      setTrackLoading(true);
      setTrackError("");
      setTrackedOrder(null);
      const response = await fetch(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/Mart/GetProductDetails?id=${ticket.id}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch live order status");
      }
      const liveOrder = await response.json();
      setTrackedOrder(liveOrder);
    } catch (error) {
      console.error("Error fetching tracked order:", error);
      setTrackError(
        "Unable to load the latest order status right now. Please try again.",
      );
    } finally {
      setTrackLoading(false);
    }
  };

  const handleLiveDeliveryTracking = (ticket) => {
    setShowTrackModal(false);
    navigate(`/deliveryTracking/${ticket.id}`, {
      state: {
        trackingMode: "customer",
        returnTo: `/profilePage/${userType}/${userId}`,
      },
    });
  };

  const handleViewDetails = (ticket) => {
    setSelectedTicket(ticket);
    const cb = calculateCashback(ticket);
    setCashbackAmount(cb);
    setShowModal(true);
  };

  useEffect(() => {
    if (profile?.mobileNumber) {
      localStorage.setItem("customerMobileNumber", profile.mobileNumber);
    }
  }, [profile]);

  const handleMoreIconClick = () => {
    setShowProfile(!showProfile);
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        !document.getElementById("dropdown-container")?.contains(event.target)
      ) {
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleCloseMenuOnClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleCloseMenuOnClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleCloseMenuOnClickOutside);
  }, []);

  useEffect(() => {
    if (!userId || !userType) return;
    const fetchProfileData = async () => {
      try {
        let apiUrl = "";
        if (userType === "customer") {
          apiUrl = `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/customer/customerProfileData?profileType=${userType}&UserId=${userId}`;
        }
        if (!apiUrl) return;
        const response = await axios.get(apiUrl);
        setProfile(response.data);
        setCategory(response.data.category);
        const apiDistrict = (response.data.district || "").trim();
        const apiPincode = (response.data.zipCode || response.data.pinCode || "").toString().trim();

        setDistrict(apiDistrict);

       const isVisakhapatnamNoPincode =
          !apiPincode && apiDistrict.toLowerCase() === "visakhapatnam";
        setPreferLMartDefault(isVisakhapatnamNoPincode);

        const resolvedZip = apiPincode || DEFAULT_PINCODE;
        setZipCode(resolvedZip);
        setFullName(response.data.fullName);
        if (response.data.photoAttachmentId) {
          fetchImageUrl(response.data.photoAttachmentId);
        }
        setMenuList(
          getMenuList(
            userType,
            userId,
            response.data.category,   
            apiDistrict,
            resolvedZip,
            response.data.fullName,
            isMobile,
          ),
        );
      } catch (error) {
        console.log("Error Fetching Data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();
  }, [userType, userId, isMobile]);

   useEffect(() => {
    if (!userId || userType !== "customer") return;

    let cachedLocation = null;
    try {
      cachedLocation = JSON.parse(
        localStorage.getItem(`deliveryLocation-${userId}`) || "null",
      );
    } catch {
      localStorage.removeItem(`deliveryLocation-${userId}`);
    }
    if (cachedLocation?.latitude && cachedLocation?.longitude) {
      setProfile((previousProfile) => ({
        ...previousProfile,
        latitude: cachedLocation.latitude,
        longitude: cachedLocation.longitude,
      }));
    }

    const fetchCustomerAddress = async () => {
      try {
        const response = await axios.get(
          `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/Address/GetAddressById/${userId}`,
        );
        const data = Array.isArray(response.data)
          ? response.data[0]
          : response.data;
        if (!data) return;

        setProfile((previousProfile) => ({
          ...previousProfile,
          ...data,
          latitude:
            data.latitude ||
            data.Latitude ||
            data.userLatitude ||
            data.UserLatitude ||
            previousProfile.latitude ||
            cachedLocation?.latitude ||
            "",
          longitude:
            data.longitude ||
            data.Longitude ||
            data.userLongitude ||
            data.UserLongitude ||
            previousProfile.longitude ||
            cachedLocation?.longitude ||
            "",
        }));
      } catch (error) {
        console.error("Error fetching customer address:", error);
      }
    };

    fetchCustomerAddress();
  }, [userId, userType]);

  useEffect(() => {
    if (!userId || userType !== "customer") return;

    const locationKey = `deliveryLocation-${userId}`;
    if (localStorage.getItem(locationKey) || locationRequestRef.current) {
      return;
    }

    const latitude = profile.latitude ?? profile.Latitude;
    const longitude = profile.longitude ?? profile.Longitude;
    const hasLatitude = latitude !== undefined && latitude !== null && String(latitude).trim();
    const hasLongitude = longitude !== undefined && longitude !== null && String(longitude).trim();
    if (hasLatitude && hasLongitude) return;

    if (!navigator.geolocation) return;

    locationRequestRef.current = true;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const location = {
          latitude: String(coords.latitude),
          longitude: String(coords.longitude),
        };
        localStorage.setItem(locationKey, JSON.stringify(location));
        setProfile((previousProfile) => ({
          ...previousProfile,
          ...location,
        }));
      },
      (error) => {
        locationRequestRef.current = false;
        console.error("Unable to capture delivery location:", error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, [profile.latitude, profile.longitude, profile.Latitude, profile.Longitude, userId, userType]);


  useEffect(() => {
    if (category && district) {
      setMenuList(
        getMenuList(
          userType,
          userId,
          category,
          district,
          zipCode,
          fullName,
          isMobile,
        ),
      );
    }
  }, [category, district, userType, userId, zipCode, fullName, isMobile]);

  useEffect(() => {
    window.addEventListener("storage", () => {
      setCartImages({});
    });
    return () => window.removeEventListener("storage", () => {});
  }, []);

  const fetchImageUrl = async (photoId) => {
    try {
      if (!photoId) return;
      const response = await axios.get(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/FileUpload/download?generatedfilename=${photoId}`,
      );
      if (response.status === 200 && response.data.imageData) {
        const imageUrl = `data:image/jpeg;base64,${response.data.imageData}`;
        setProfileImage(imageUrl);
      }
    } catch (error) {
      console.error("Error fetching image:", error);
    }
  };

  if (loading) {
    return <div></div>;
  }

  const updateLocalStorageCart = (product, qty) => {
    const stored = JSON.parse(localStorage.getItem("allCategories")) || [];
    const categoryName = product.category || "Search Items";
    let category = stored.find((c) => c.categoryName === categoryName);
    if (!category) {
      category = { categoryName, products: [] };
      stored.push(category);
    }

    const index = category.products.findIndex(
      (p) => (p.productId || p.id) === product.id,
    );

    if (qty <= 0) {
      if (index !== -1) category.products.splice(index, 1);
    } else {
      const item = {
        productId: product.id,
        productName: product.name || product.productName,
        qty,
        mrp: product.mrp,         
        discount: product.discount,
        afterDiscountPrice: product.afterDiscount,
        stockLeft: product.stockLeft,
        units: product.units,
        code: product.code,
        image: product.imageFile || product.images?.[0] || "",
      };

      if (index === -1) {
        category.products.push(item);
      } else {
        category.products[index] = item;
      }
    }
    localStorage.setItem("allCategories", JSON.stringify(stored));
  };

  const filteredGroceryData = groceryData.filter((t) =>
    t.martId?.toString().toLowerCase().includes(searchOrderId.toLowerCase()),
  );

   let cachedProfileLocation = null;
  try {
    cachedProfileLocation = JSON.parse(
      localStorage.getItem(`deliveryLocation-${userId}`) || "null",
    );
  } catch {
    cachedProfileLocation = null;
  }
  const profileLatitude =
    profile.latitude || profile.Latitude || cachedProfileLocation?.latitude;
  const profileLongitude =
    profile.longitude || profile.Longitude || cachedProfileLocation?.longitude;
  const hasProfileLocation =
    String(profileLatitude).trim() !== "" &&
    String(profileLongitude).trim() !== "" &&
    Number.isFinite(Number(profileLatitude)) &&
    Number.isFinite(Number(profileLongitude));
  const renderProfileMap = () =>
    hasProfileLocation ? (
      <iframe
        title="Saved delivery location"
        src={`https://www.google.com/maps?q=${encodeURIComponent(
          `${profileLatitude},${profileLongitude}`,
        )}&z=15&output=embed`}
        width="100%"
        height="220"
        style={{ border: 0, borderRadius: "8px" }}
        loading="lazy"
        allowFullScreen
      />
    ) : (
      <small className="text-muted">Delivery location not captured yet.</small>
    );

  return (
    <>
      <OffersBannerModal />
      {showWelcomeMessage && (
        <div
          style={{
            position: "fixed",
            top: isMobile ? "175px" : "80px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#fff8e1",
            border: "2px solid #ffca28",
            borderRadius: "12px",
            padding: "16px 20px",
            zIndex: 9999,
            maxWidth: "340px",
            width: "90%",
            boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
            textAlign: "center",
          }}
        >
          <button
            onClick={() => setShowWelcomeMessage(false)}
            style={{
              position: "absolute",
              top: "8px",
              right: "12px",
              background: "none",
              border: "none",
              fontSize: "18px",
              cursor: "pointer",
              color: "#555",
            }}
          >
            &times;
          </button>
          <p
            style={{
              margin: 0,
              fontSize: "15px",
              fontWeight: "600",
              color: "#333",
            }}
          >
            🎉 Welcome to Handyman App! Place your first order and get{" "}
            <span style={{ color: "green", fontWeight: "bold" }}>
              ₹50 bonus
            </span>{" "}
            added to your wallet.
          </p>
        </div>
      )}
      <header
        className="header d-flex align-items-center justify-content-between p-2 bg-white shadow-sm"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          width: "100%",
          zIndex: 1000,
        }}
      >
        {isMobile ? (
          <div onClick={handleMoreIconClick} style={{ cursor: "pointer" }}>
            <MenuIcon className="floating-menuIcon" fontSize="medium" />
          </div>
        ) : null}
        <img
          loading="lazy"
          decoding="async"
          src={Logo}
          alt="Handy Man Logo"
          className="logo-img"
        />
        <div className="spacer"></div>
        <div className="d-flex align-items-center w-100"></div>
        <div className="hdr_icns d-flex align-items-center ">
          <div
            id="dropdown-container"
            className="dropdown-container"
            style={{ position: "relative" }}
          >
            <div className="d-flex align-items-center">
              {/* Customer Care Number */}
              <div
                className="d-flex align-items-start"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  cursor: "pointer",
                }}
                onClick={handleCustomerCareCall}
              >
                <AddIcCallIcon style={{ color: "green", fontSize: "30px" }} />
                <small
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                ></small>
              </div>
              <div className="d-flex align-items-center">
              </div>

              {/* Wallet Amount */}
              <div
                className="coin-wrap"
                style={{ marginLeft: 10, cursor: "pointer" }}
                onMouseEnter={() => setShowWalletMessage(true)}
                onMouseLeave={() => setShowWalletMessage(false)}
                onClick={() => setShowWalletMessage(true)}
              >
                <span className="coin-value" style={{ color: "blue" }}>
                  ₹ {walletLoading ? "0" : walletAmount}
                </span>
              </div>
              {/* Profile Image */}
              <div className="profile-img-wrapper">
                <img
                  loading="lazy"
                  decoding="async"
                  src={profileImage}
                  alt="Profile"
                  className="profile-img"
                />
              </div>
            </div>
          </div>
        </div>
      </header>
      {showWalletMessage && (
        <div
          className="alert alert-danger"
          style={{
            position: "fixed",
            top: "80px",
            right: "20px",
            zIndex: 9999,
            maxWidth: "320px",
            cursor: "default",
          }}
          onTouchEnd={() => setTimeout(() => setShowWalletMessage(false), 2500)}
        >
          <div className="d-flex justify-content-between align-items-start">
            <span className="blinking-icon" style={{ fontSize: "15px" }}>
              Wallet Balance: <strong>₹{walletAmount}.</strong> Enjoy
              <strong> ₹10 </strong>
              off from your wallet for every<strong> ₹100 </strong> spent.
            </span>
            <button
              type="button"
              className="btn-close"
              onClick={() => setShowWalletMessage(false)}
            ></button>
          </div>
        </div>
      )}

      <div className="pt-1 mt-100">
        <div
          className={`container m-1`}
          style={{
            padding: isMobile ? "8px" : "0px",
            borderRadius: "5px",
            minHeight: "100vh",
            paddingTop: isMobile ? "70px" : "0px",
          }}
        >
          <div className="row">
            <div className="col-md-3">
              <div>
                {/* Desktop Profile Details */}
                {!isMobile ? (
                  <div className="profile-card">
                    <div className="profile-img-container ">
                      <div className="profile-container">
                        <div className="profile-info">
                          <div className="webprofile-section">
                            <div className="text-primary fw-bold cust-name">
                              Welcome{" "}
                              <small
                                className="text-dark"
                                style={{ fontFamily: "Poppins, sans-serif" }}
                              >
                                {profile.fullName}{" "}
                              </small>
                            </div>
                            {/* {renderVendorPanel()} */}
                            <div className="fw-bold fs-4">
                              Lakshmi Sai Service Providers
                            </div>
                            <div className="webprofile-img-wrapper">
                              <img
                                loading="lazy"
                                decoding="async"
                                src={profileImage}
                                alt="Profile"
                                className="webprofile-img"
                              />
                              <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: "none" }}
                                accept="image/*"
                              />
                            </div>
                            <div className="label fw-bold fs-5">Name</div>
                            <p className="value">{profile.fullName}</p>
                            <hr />
                            <div className="label fw-bold mt-0 fs-5">
                              Mobile
                            </div>
                            <p className="value">{profile.mobileNumber}</p>
                            <hr />
                            <div className="label fw-bold mt-0 fs-5">
                              Address
                            </div>
                            <p className="value">{profile.address}</p>
                            <div className="mt-2 mb-2">{renderProfileMap()}</div>
                            <hr />
                            <p
                              className="logout-btn m-1"
                              onClick={() =>
                                (window.location.href = "/loginnew")
                              }
                            >
                              <LogoutIcon />
                              <span className="fs-5">Logout</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
              {/* Mobile Profile Details */}
              {showProfile && !showInterestModal && !showNotificationModal && (
                <div
                  className="floating-profile-menu"
                  style={{
                    position: "fixed",
                    top: "60px",
                    left: "10px",
                    backgroundColor: "#fff",
                    zIndex: 1200,
                    borderRadius: "8px",
                    boxShadow: "0px 4px 10px rgba(0,0,0,0.2)",
                    padding: "10px",
                    width: "180px",
                  }}
                >
                  <div className="profile-info">
                    <div className="fw-bold">Name</div>
                    <p className="mb-2">{profile.fullName}</p>
                    <hr style={{ margin: "4px 0" }} />
                    <div className="fw-bold">Mobile</div>
                    <p className="mb-2">{profile.mobileNumber}</p>
                    <hr style={{ margin: "4px 0" }} />
                    <div className="fw-bold">Address</div>
                    <p className="mb-2">{profile.address}</p>
                      <div className="mt-2 mb-2">{renderProfileMap()}</div>
                    <hr style={{ margin: "4px 0" }} />
                    <div
                      className="d-flex align-items-start"
                      style={{ cursor: "pointer" }}
                      onClick={handleDeliveryPartnerClick}
                    >
                      <DeliveryDiningIcon
                        sx={{ fontSize: 24, marginRight: "4px" }}
                      />
                      <small
                        style={{
                          fontSize: "12px",
                          fontFamily: "Poppins",
                          lineHeight: "28px",
                        }}
                      >
                        Delivery Partner
                      </small>
                    </div>
                    <hr style={{ margin: "4px 0" }} />
                    <div
                      className="d-flex align-items-start"
                      style={{ cursor: "pointer" }}
                      onClick={() =>
                        document
                          .getElementById("myTicketsSection")
                          ?.scrollIntoView({ behavior: "smooth" })
                      }
                    >
                      <ConfirmationNumberIcon
                        sx={{ fontSize: 24, marginRight: "8px" }}
                      />
                      <small
                        style={{
                          fontSize: "12px",
                          fontFamily: "Poppins",
                          lineHeight: "28px",
                        }}
                      >
                        My Tickets
                      </small>
                    </div>
                    <hr style={{ margin: "4px 0" }} />
                    <div
                      className="d-flex align-items-center logout-btn"
                      style={{ cursor: "pointer" }}
                      onClick={() => (window.location.href = "/loginnew")}
                    >
                      <LogoutIcon className="me-2" />
                      <span>Logout</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Interest Modal */}
            <Modal
              show={showInterestModal}
              onHide={() => setShowInterestModal(false)}
              centered
            >
              <Modal.Header closeButton>
                <Modal.Title>
                  Are you interested in joining as a delivery partner?
                </Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <div className="d-flex flex-column">
                  <label>
                    <input
                      type="radio"
                      name="interest"
                      value="yes"
                      checked={selectedOption === "yes"}
                      onChange={(e) => setSelectedOption(e.target.value)}
                    />{" "}
                    Yes
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="interest"
                      value="no"
                      checked={selectedOption === "no"}
                      onChange={(e) => setSelectedOption(e.target.value)}
                    />{" "}
                    No
                  </label>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="secondary"
                  onClick={() => setShowInterestModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleConfirmInterest}
                  disabled={!selectedOption}
                >
                  Continue
                </Button>
              </Modal.Footer>
            </Modal>

            <Modal
              show={!!autoOrderPrompt}
              onHide={() => setAutoOrderPrompt(null)}
              centered
            >
              <Modal.Header closeButton>
                <Modal.Title>
                  {autoOrderPrompt?.title || "Order Update"}
                </Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <p className="mb-2">{autoOrderPrompt?.message}</p>
                <div className="small text-muted">
                  Tap Track Now to view the latest delivery slot and order
                  assignment details.
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="secondary"
                  onClick={() => setAutoOrderPrompt(null)}
                >
                  Dismiss
                </Button>
                <Button
                  variant="success"
                  onClick={() => {
                    const ticket = autoOrderPrompt?.ticket;
                    setAutoOrderPrompt(null);
                    if (ticket) {
                      handleTrackOrder(ticket);
                    }
                  }}
                >
                  Track Now
                </Button>
              </Modal.Footer>
            </Modal>

            {/* Notification Modal */}
            <Modal
              show={showNotificationModal}
              onHide={() => setShowNotificationModal(false)}
              centered
            >
              <Modal.Header closeButton>
                <Modal.Title>Notification</Modal.Title>
              </Modal.Header>

              <Modal.Body>
                {isRegistered && partnerStatus === "open" ? (
                  deliveryTicketsLoading ? (
                    <p>Loading tickets…</p>
                  ) : (
                    <>
                      {/* Search */}
                      <input
                        type="text"
                        className="form-control mb-3"
                        placeholder="Search by Order ID..."
                        value={searchOrderId}
                        onChange={(e) => setSearchOrderId(e.target.value)}
                      />
                      {filteredGroceryData.length === 0 ? (
                        <p>No Tickets Found.</p>
                      ) : (
                        <div className="notification-list">
                          {filteredGroceryData.map((t) => (
                            <div
                              key={t.id || t.martId}
                              className="notification-item mb-3 p-2 border rounded"
                            >
                              <div>
                                <strong>Order Id:</strong>{" "}
                                <span
                                  style={{ color: "blue", cursor: "pointer" }}
                                  onClick={() => {
                                    setSelectedTicket(t);
                                    setSelectedOrder({
                                      ...t,
                                      paymentType: t.paymentType || "",
                                      receivedAmount: t.receivedAmount || "",
                                      cashAmount: t.cashAmount || "",
                                      onlineAmount: t.onlineAmount || "",
                                    });
                                    setShowOrderModal(true);
                                  }}
                                >
                                  {t.martId}
                                </span>
                                <br />
                                <strong>Name:</strong>{" "}
                                <span
                                  style={{ color: "blue", cursor: "pointer" }}
                                >
                                  {t.customerName}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )
                ) : (
                  <p>You are already registered, pending for admin approval.</p>
                )}
              </Modal.Body>
            </Modal>
            <Modal
              show={showOrderModal}
              onHide={() => setShowOrderModal(false)}
              centered
            >
              <Modal.Header
                closeButton
                style={{ backgroundColor: "green", color: "white" }}
              >
                <Modal.Title>Order Details</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                {selectedOrder && (
                  <>
                    {/* Customer Info */}
                    <div className="mb-1">
                      <strong>Order Id:</strong> {selectedOrder.martId} <br />
                      <strong>Customer Name:</strong>{" "}
                      {selectedOrder.customerName}
                    </div>
                    <div className="mb-1">
                      <strong>Address:</strong>{" "}
                      {[
                        selectedOrder.address,
                        selectedOrder.district,
                        selectedOrder.state,
                        selectedOrder.zipCode,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                     {Number.isFinite(Number(selectedOrder.latitude)) &&
                      Number.isFinite(Number(selectedOrder.longitude)) && (
                        <div className="mb-2">
                          <strong>Delivery Location:</strong>
                          <iframe
                            title="Customer delivery location"
                            src={`https://www.google.com/maps?q=${encodeURIComponent(
                              `${selectedOrder.latitude},${selectedOrder.longitude}`,
                            )}&z=15&output=embed`}
                            width="100%"
                            height="220"
                            style={{ border: 0, borderRadius: "8px" }}
                            loading="lazy"
                            allowFullScreen
                          />
                        </div>
                      )}
                    {/* View Details Link */}
                    <div className="mb-1">
                      <span
                        onClick={() => setShowDetails(!showDetails)}
                        style={{
                          color: "blue",
                          cursor: "pointer",
                          textDecoration: "underline",
                          fontWeight: "500",
                        }}
                      >
                        {showDetails ? "Hide Details" : "View Details"}
                      </span>
                    </div>

                    {/* Table - Show only when clicked */}
                    {showDetails && (
                      <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                        <table className="table table-bordered text-center">
                          <thead
                            style={{
                              backgroundColor: "#cfe2d9",
                              position: "sticky",
                              top: 0,
                              zIndex: 1,
                            }}
                          >
                            <tr>
                              <th>S.No</th>
                              <th>Product Name</th>
                              <th>Quantity</th>
                              <th>Price (₹)</th>
                            </tr>
                          </thead>

                          <tbody>
                            {selectedOrder.categories
                              ?.flatMap((cat) => cat.products)
                              ?.map((p, index) => (
                                <tr key={index}>
                                  <td>{index + 1}</td>
                                  <td>{p.productName}</td>
                                  <td>{p.noOfQuantity}</td>
                                  <td>{p.afterDiscountPrice.toFixed(0)}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {/* Totals */}
                    <div className="text-center text-danger mt-1">
                      <h6>
                        <strong>Total Amount:</strong> ₹
                        {selectedOrder.categories?.reduce(
                          (sum, cat) => sum + (cat.totalAmount || 0),
                          0,
                        )}
                      </h6>
                      <h6>
                        <strong>Grand Total:</strong> ₹
                        {selectedOrder.grandTotal}
                      </h6>
                    </div>
                    {/* EXPANDED DETAILS */}
                    {selectedOrder.status !== "Delivered" && (
                      <div className="mt-2 p-2 border-top">
                        {/* Payment Type */}
                        <div className="mt-2">
                          <input
                            type="radio"
                            name="paymentType"
                            disabled={isActionLocked}
                            checked={selectedOrder.paymentType === "cash"}
                            onChange={() =>
                              setSelectedOrder((prev) => ({
                                ...prev,
                                paymentType: "cash",
                                receivedAmount: "",
                                cashAmount: "",
                                onlineAmount: "",
                              }))
                            }
                          />{" "}
                          Cash
                          <input
                            type="radio"
                            name="paymentType"
                            className="ms-3"
                            disabled={isActionLocked}
                            checked={selectedOrder.paymentType === "online"}
                            onChange={() =>
                              setSelectedOrder((prev) => ({
                                ...prev,
                                paymentType: "online",
                                receivedAmount: "",
                                cashAmount: "",
                                onlineAmount: "",
                              }))
                            }
                          />{" "}
                          Online
                          <input
                            type="radio"
                            name="paymentType"
                            className="ms-3"
                            disabled={isActionLocked}
                            checked={
                              selectedOrder.paymentType === "Cash&Online"
                            }
                            onChange={() =>
                              setSelectedOrder((prev) => ({
                                ...prev,
                                paymentType: "Cash&Online",
                                receivedAmount: "",
                                cashAmount: "",
                                onlineAmount: "",
                              }))
                            }
                          />{" "}
                          Cash & Online
                        </div>

                        {/* Payment Inputs */}
                        {selectedOrder.paymentType === "Cash&Online" ? (
                          <div className="mt-2 d-flex gap-3 flex-wrap align-items-end">
                            <div>
                              <label>Cash:</label>
                              <input
                                type="number"
                                className="form-control"
                                style={{ width: "120px" }}
                                disabled={isActionLocked}
                                value={selectedOrder.cashAmount || ""}
                                onChange={(e) => {
                                  const cash = Number(e.target.value);
                                  const online = Number(
                                    selectedOrder.onlineAmount || 0,
                                  );

                                  setSelectedOrder((prev) => ({
                                    ...prev,
                                    cashAmount: cash,
                                    receivedAmount: cash + online,
                                  }));
                                }}
                              />
                            </div>

                            <div>
                              <label>Online:</label>
                              <input
                                type="number"
                                className="form-control"
                                style={{ width: "120px" }}
                                disabled={isActionLocked}
                                value={selectedOrder.onlineAmount || ""}
                                onChange={(e) => {
                                  const online = Number(e.target.value);
                                  const cash = Number(
                                    selectedOrder.cashAmount || 0,
                                  );

                                  setSelectedOrder((prev) => ({
                                    ...prev,
                                    onlineAmount: online,
                                    receivedAmount: cash + online,
                                  }));
                                }}
                              />
                            </div>

                            <div className="mb-1">
                              <strong>
                                Total: ₹ {selectedOrder.receivedAmount || 0}
                              </strong>
                            </div>
                            <button
                              className="btn btn-success"
                              onClick={() => {
                                handleUpdatePaymentMethod(selectedOrder);
                                setGroceryData((prev) =>
                                  prev.map((item) =>
                                    item.id === selectedOrder.id
                                      ? selectedOrder
                                      : item,
                                  ),
                                );
                                setShowOrderModal(false);
                              }}
                              disabled={
                                isActionLocked ||
                                !selectedOrder.cashAmount ||
                                Number(selectedOrder.cashAmount) <= 0 ||
                                !selectedOrder.onlineAmount ||
                                Number(selectedOrder.onlineAmount) <= 0
                              }
                            >
                              Submit
                            </button>
                            {/* Decline */}
                            <div className="mb-1">
                              <button
                                className="btn btn-danger"
                                onClick={() => {
                                  handleStatusUpdate(selectedOrder, "Open");
                                  setGroceryData((prev) =>
                                    prev.map((item) =>
                                      item.id === selectedOrder.id
                                        ? { ...item, status: "Open" }
                                        : item,
                                    ),
                                  );

                                  setShowOrderModal(false);
                                }}
                              >
                                Decline
                              </button>
                              <button
                                className="btn btn-warning ms-2"
                                onClick={() => {
                                  handleStatusUpdate(selectedOrder, "Return");

                                  setGroceryData((prev) =>
                                    prev.map((item) =>
                                      item.id === selectedOrder.id
                                        ? { ...item, status: "Return" }
                                        : item,
                                    ),
                                  );
                                }}
                              >
                                Return
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-1 d-flex align-items-center gap-2 flex-wrap">
                            <label className="mb-0">Amount:</label>
                            <input
                              type="number"
                              className="form-control"
                              style={{ width: "110px" }}
                              placeholder="Enter Amount"
                              value={selectedOrder.receivedAmount || ""}
                              onChange={(e) =>
                                setSelectedOrder((prev) => ({
                                  ...prev,
                                  receivedAmount: Number(e.target.value),
                                }))
                              }
                            />
                            <button
                              className="btn btn-success"
                              onClick={() => {
                                handleUpdatePaymentMethod(selectedOrder);

                                setGroceryData((prev) =>
                                  prev.map((item) =>
                                    item.id === selectedOrder.id
                                      ? selectedOrder
                                      : item,
                                  ),
                                );

                                setShowOrderModal(false);
                              }}
                              disabled={
                                !selectedOrder.paymentType ||
                                !selectedOrder.receivedAmount ||
                                Number(selectedOrder.receivedAmount) <= 0
                              }
                            >
                              Submit
                            </button>
                            {/* Decline */}
                            <div className="mb-2">
                              <button
                                className="btn btn-danger"
                                onClick={() => {
                                  handleStatusUpdate(selectedOrder, "Open");

                                  setGroceryData((prev) =>
                                    prev.map((item) =>
                                      item.id === selectedOrder.id
                                        ? { ...item, status: "Open" }
                                        : item,
                                    ),
                                  );

                                  setShowOrderModal(false);
                                }}
                              >
                                Decline
                              </button>
                              <button
                                className="btn btn-warning ms-2"
                                onClick={() => {
                                  handleStatusUpdate(selectedOrder, "Return");
                                  setGroceryData((prev) =>
                                    prev.map((item) =>
                                      item.id === selectedOrder.id
                                        ? { ...item, status: "Return" }
                                        : item,
                                    ),
                                  );
                                }}
                              >
                                Return
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </Modal.Body>
            </Modal>
      
            {isMobile && (
              <div>
                <div
                  style={{
                    padding: "12px",
                    maxWidth: "1100px",
                    margin: "auto",
                  }}
                >
                  {/* 🔍 SEARCH + 🎤 MIC */}
                  <div style={{ position: "relative", marginBottom: "12px" }}>
                    <input
                      className="form-control ps-5 pe-5"
                      placeholder={placeholderSuggestions[placeholderIndex]}
                      style={{ border: "2px solid #000", borderRadius: "6px" }}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />

                    <SearchIcon
                      style={{
                        position: "absolute",
                        left: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#000",
                      }}
                    />

                    {/* 🎤 Better Mic Button */}
                    <button
                      onClick={startVoiceSearch}
                      title="Speak product name"
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        border: listening
                          ? "2px solid red"
                          : "2px solid transparent",
                        background: listening
                          ? "rgba(255,0,0,0.1)"
                          : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        transition: "0.2s ease-in-out",
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        height="22"
                        viewBox="0 0 24 24"
                        width="22"
                        fill={listening ? "red" : "#000"}
                      >
                        <path d="M12 14a2 2 0 0 0 2-2V6a2 2 0 1 0-4 0v6a2 2 0 0 0 2 2zm5-2a5 5 0 0 1-10 0H5a7 7 0 0 0 14 0h-2zm-5 9c-1.1 0-2-.9-2-2h4a2 2 0 0 1-2 2z" />
                      </svg>
                    </button>
                  </div>
                  {/* 📦 PRODUCTS */}
                  {loading && <p>Loading products...</p>}
                  <div
                    className="grocery-row flex flex-wrap gap-1"
                    style={{ marginBottom: "5px" }}
                  >
                    {displayProducts.map((product) =>
                      renderProductCard(product),
                    )}
                    {/* Cart Bar */}
                    {(() => {
                      const readAllCategories = () => {
                        if (typeof window === "undefined") return [];
                        try {
                          const raw = localStorage.getItem("allCategories");
                          if (!raw) return [];
                          const parsed = JSON.parse(raw);
                          const arr = Array.isArray(parsed) ? parsed : [parsed];
                          return arr.filter(Boolean).map((cat) => ({
                            ...cat,
                            products: Array.isArray(cat?.products)
                              ? cat.products
                              : [],
                          }));
                        } catch (e) {
                          console.error("Invalid JSON in allCategories:", e);
                          return [];
                        }
                      };
                      const allCategories = readAllCategories();
                      const summary = allCategories.reduce(
                        (acc, cat) => {
                          for (const p of cat.products) {
                            const qty = Number(p?.qty) || 0;
                            if (!qty) continue;
                            const price =
                              Number(
                                p?.afterDiscountPrice ??
                                  p?.price ??
                                  p?.finalPrice ??
                                  0,
                              ) || 0;
                            acc.items += qty;
                            acc.total += price * qty;
                          }
                          return acc;
                        },
                        { items: 0, total: 0 },
                      );
                      const items = summary.items;
                      const total = Math.round(summary.total);
                      return items > 0 ? (
                        <div
                          style={{
                            position: "fixed",
                            bottom: "40px",
                            left: 0,
                            width: "100%",
                            backgroundColor: "green",
                            color: "white",
                            padding: "12px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontWeight: "bold",
                            zIndex: 2000,
                            borderRadius: "20px",
                            marginTop: "0px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                            }}
                          >
                            🛒
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                lineHeight: "1.2",
                              }}
                            >
                              <span style={{ fontSize: "12px" }}>
                                {items} items
                              </span>
                              <span style={{ fontSize: "12px" }}>₹{total}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="text-white fw-bold d-flex align-items-center gap-1"
                            style={{
                              fontSize: "12px",
                              cursor: "pointer",
                              background: "transparent",
                              border: "none",
                            }}
                            onClick={() =>
                              navigate(`/groceryCart/${userType}/${userId}`)
                            }
                          >
                            View Cart →
                          </button>
                        </div>
                      ) : null;
                    })()}
                  </div>
                  <Modal
                    show={showZoomModal}
                    onHide={() => {
                      setShowZoomModal(false);
                      setZoomProduct(null);
                    }}
                    centered
                  >
                    <button
                      className="close-button text-end"
                      onClick={() => {
                        setShowZoomModal(false);
                        setZoomProduct(null);
                      }}
                    >
                      &times;
                    </button>
                    <Modal.Body className="text-center">
                      <div className="zoom-container">
                        <img
                          loading="lazy"
                          decoding="async"
                          src={zoomImage}
                          alt={zoomProduct?.name || "Zoomed Product"}
                          className="zoom-image"
                        />
                      </div>
                      <h6
                        className="text-start fw-bold"
                        style={{ fontSize: "12px" }}
                      >
                        {zoomProduct?.name || ""}
                      </h6>
                      {zoomProduct?.afterDiscount != null && (
                        <p className="text-start" style={{ fontSize: "12px" }}>
                          <b className="text-success me-2">
                            ₹{Math.round(Number(zoomProduct.afterDiscount))}
                          </b>
                          {zoomProduct?.mrp ? (
                            <s className="text-muted">₹{zoomProduct.mrp}</s>
                          ) : null}
                        </p>
                      )}
                    </Modal.Body>
                  </Modal>
                  <div className="text-primary fw-bold fs-5">
                    Welcome{" "}
                    <small className="text-dark">{profile.fullName}</small>
                  </div>
                  {/* {renderVendorPanel()} */}
                </div>
              </div>
            )}

            {/* Mobile Dashboard Icons */}
            {/* Mobile Dashboard Icons */}
{/* Mobile Dashboard Icons */}
{isMobile && (
  <div
    className="mobile-top-icons position-fixed start-0 end-0 bg-white border-bottom shadow-sm"
    style={{
      top: "80px",
      zIndex: 1050,
      height: "90px",
      padding: "8px",
      overflowY: "hidden",
    }}
  >
    <div className="d-flex flex-wrap justify-content-around align-items-center">
      {menuList.map((menu, index) =>
        menu.MenuTitle === "Vendor Portal" ? (
          <button
            key={index}
            type="button"
            onClick={handleVendorPortal}
            className="btn p-0 border-0 bg-transparent d-flex flex-column align-items-center justify-content-center text-decoration-none text-dark ms-1"
            style={{ minWidth: "10px", flex: "0 0 auto" }}
          >
            <div
              style={{
                backgroundColor: "#dc3545",
                borderRadius: "50%",
                padding: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "40px",
                height: "40px",
                boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                position: "relative",
              }}
            >
              {vendorSessionId ? (
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: "bold",
                    color: "#fff",
                  }}
                >
                  {getVendorIcon(vendorProfile?.name)}
                </span>
              ) : (
                React.cloneElement(menu.MenuIcon, {
                  sx: { fontSize: 22, color: "#fff" },
                })
              )}
              {renderVendorOrderBell()}
            </div>
            <small
              style={{
                fontSize: "12px",
                fontFamily: "Roboto",
                fontWeight: "bold",
                textAlign: "center",
                lineHeight: "14px",
                marginTop: "4px",
                color: "#333",
                letterSpacing: "0.5px",
              }}
            >
              {(vendorSessionId
                ? vendorProfile?.name || menu.MenuTitle
                : menu.MenuTitle
              )
                .split(" ")
                .map((word, idx, arr) => (
                  <React.Fragment key={idx}>
                    {word}
                    {idx !== arr.length - 1 && <br />}
                  </React.Fragment>
                ))}
            </small>
          </button>
        ) : (
          <a
            key={index}
            href={menu.TargetUrl}
            className="d-flex flex-column align-items-center justify-content-center text-decoration-none text-dark ms-1"
            style={{ minWidth: "10px", flex: "0 0 auto" }}
          >
            <div
              style={{
                backgroundColor: "#ffc107",
                borderRadius: "50%",
                padding: "8px",
                display: "flex",       
                alignItems: "center",
                justifyContent: "center",
                width: "40px",
                height: "40px",
                boxShadow: "0 2px 6px rgba(131, 122, 122, 0.15)",
              }}
            >
              {React.cloneElement(menu.MenuIcon, {
                sx: { fontSize: 22, color: "#000" },
              })}
            </div>
            <small
              style={{
                fontSize: "12px",
                fontFamily: "Roboto",
                fontWeight: "bold",
                textAlign: "center",
                lineHeight: "14px",
                marginTop: "4px",
                color: "#333",
                letterSpacing: "0.5px",
              }}
            >
              {menu.MenuTitle.split(" ").map((word, idx) => (
                <React.Fragment key={idx}>
                  {word}
                  {idx !== menu.MenuTitle.split(" ").length - 1 && (
                    <br />
                  )}
                </React.Fragment>
              ))}
            </small>
          </a>
        )
      )}
    </div>
  </div>
)}      
            <div className="col-md-9">
               {/* 🥚 DAILY POT REWARD GAME */}
              <PotRewardGame
                userId={userId}
                onWalletCredited={(newAmount) =>
                  setWalletAmount(String(newAmount))
                }
              />    

              <div
                className="container"
                style={{
                  minHeight: "60vh",
                  paddingTop: isMobile ? `${MOBILE_PADDING_TOP}px` : "0px",
                }}
              >
                <div className="shadow-lg p-2 rounded-5 text-center bg-transparent border-0">
                  {/* Vendor Tabs */}
                  <div className="d-flex align-items-center mb-3" style={{ gap: "6px", marginBottom: "5px" }}>
                  <button
                    type="button"
                    onClick={() => scrollVendorTabs(-1)}
                    aria-label="Scroll stores left"
                    style={{
                      flex: "0 0 auto",
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      border: "1px solid #ffddcc",
                      background: "#fff3ed",
                      color: "#ff5722",
                      fontWeight: "bold",
                      fontSize: "16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      lineHeight: 1,
                      cursor: "pointer",
                    }}
                  >
                      <ArrowBackIcon style={{ fontSize: 16 }} />
                  </button>
                  <div
                    ref={vendorTabsRef}
                    className="vendor-tabs-wrapper "
                    style={{
                      width: "100%",
                      overflowX: "auto",
                      overflowY: "hidden",
                      WebkitOverflowScrolling: "touch",
                      scrollbarWidth: "none",
                      padding: "8px",
                    }}
                  >
                    <div
                      className="d-flex align-items-center gap-2"
                      style={{
                        width: "max-content",
                      }}
                    >
{/* Vendor Store Cards */}
{approvedVendorListJson.map((v) => {
  const isActive = selectedMartTab === v.vendorId;
  const palette = getVendorGradient(v.storeName);
  const vendorImage = vendorStoreImages[v.vendorId];

  return (
    <button
      type="button"
      key={v.vendorId}
      data-vendor-id={v.vendorId}
      onClick={() => {
        setSelectedMartTab(v.vendorId);
        localStorage.setItem("selectedVendorId", v.vendorId);
      }}
      className="vendor-store-card"
      style={{
        border: isActive
          ? `2px solid ${palette.solid}`
          : "1px solid #eee",
        boxShadow: isActive
          ? `0 4px 12px ${palette.shadow}`
          : "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      {/* Store Icon */}
      <div
        className="vendor-store-icon"
        style={{
          border: `2px solid ${palette.light}`,
          background: "#fff",
        }}
      >
        {vendorImage ? (
          <img
            src={vendorImage}
            alt={v.storeName || "Vendor"}
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <span className="vendor-store-placeholder">
            {(v.storeName || "S").charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Store Name */}
      <span
        className="vendor-store-name"
        style={{
          color: isActive ? palette.solid : "#333",
        }}
      >
        {v.storeName || "Vendor Store"}
      </span>

      {/* Selected Indicator */}
      {isActive && (
        <span
          className="vendor-store-selected"
          style={{ background: palette.solid }}
        >
          ✓
        </span>
      )}
    </button>
  );
})}

                    </div>
                  </div>
                    
                <button
                  type="button"
                  onClick={() => scrollVendorTabs(1)}
                  aria-label="Scroll stores right"
                  style={{
                    flex: "0 0 auto",
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    border: "1px solid #ffddcc",
                    background: "#fff3ed",
                    color: "#ff5722",
                    fontWeight: "bold",
                    fontSize: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",    
                    lineHeight: 1,
                    cursor: "pointer",
                  }}
                >
                 <ArrowForwardIcon style={{ fontSize: 16 }} />
                </button>
              </div>
              {/* Selected Vendor Store Name */}
{(() => {
  const selectedVendor = approvedVendorListJson.find(
    (v) => v.vendorId === selectedMartTab
  );
  return selectedVendor ? (
    <div className="selected-vendor-heading">
      <h5>{selectedVendor.storeName || "Vendor Store"}</h5>
    </div>
  ) : null;
})()}


                  {/* ── Selected Vendor's categories + products (from vendorlist.json) ── */}
                  {selectedMartTab !== "Lakshmi Mart" &&
                    (() => {
                      const vendor = approvedVendorListJson.find(
                        (v) => v.vendorId === selectedMartTab,
                      );
                      if (!vendor) return null;
                      return (
                        <>
                          <div className="row row-cols-3 row-cols-md-6 g-1">
                            {vendor.categories.map((catObj) => {
                              const isActive =
                                selectedVendorJsonCategory === catObj.category;
                              return (     
                                <div
                                  className="col"
                                  key={catObj.category}
                                  onClick={() =>
                                    handleVendorCategoryClick(vendor, catObj)
                                  }
                                  style={{ cursor: "pointer" }}
                                >
                                  <div
                                    className="groceryIcon-card border-0 shadow-sm text-center d-flex flex-column align-items-center justify-content-between"
                                    style={{
                                      height: isMobile ? "130px" : "140px",
                                      width: isMobile ? "90px" : "120px",
                                      padding: "6px",
                                      margin: "5px",
                                      boxShadow: isActive
                                        ? "0 0 0 2px #ff5722, 0 4px 10px rgba(0,0,0,0.15)"
                                        : undefined,
                                    }}
                                  >
                                    <img
                                      loading="lazy"
                                      decoding="async"
                                       src={getVendorCategoryImageFromApi(vendor.vendorId, catObj.category)}
                                      alt={catObj.category}
                                      style={{
                                        height: "80px",
                                        width: "80px",
                                        borderRadius: "8px",
                                        marginTop: "2px",
                                        objectFit: "cover",
                                      }}
                                    />
                                    <span
                                      style={{
                                        fontSize: "12px",
                                        fontWeight: "bold",
                                        marginTop: "6px",
                                        minHeight: "24px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        textAlign: "center",
                                        lineHeight: "1.2",
                                        color: isActive ? "#ff5722" : "#000",
                                      }}
                                    >
                                      {catObj.category}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}
                </div>

                     <div
                className="shadow-lg rounded-4 p-3 mb-2"
                style={{
                  color: "#000",
                }}
              >
                <h6
                  className="fw-bold text-center mb-2"
                 style={{ letterSpacing: "1px", color: "#ff5722", fontSize: "20px"}}>
                  Home Appliances
                </h6>
                <div className="d-flex justify-content-around align-items-center row row-cols-3 row-cols-md-6">
                  {[
                    { label: "Electrical", value: "Electrical Products", image: HomeElectricalImg,},
                    { label: "Plumbing", value: "Plumbing Products", image: HomePlumbingImg, },
                    { label: "Kitchenware", value: "Kitchenware Appliances", image: KitchenImg,},
                    {  label: "Home Decors",  value: "Home Decors", image: HomeDecor,},
                   { label: 'Electronics Appliances', value: 'Electronics appliances', image: Electronics },   
                    { label: 'Hardware Items', value: 'Hardware items', image: Hardware },  
                  ].map((item) => (
                    <div
                      key={item.value}
                      onClick={() => handleGroceryCategoryClick(item)}
                      style={{
                        cursor: "pointer",
                        textAlign: "center",
                        width: "90px",
                      }}
                    >
                      <img
                        loading="lazy"
                        decoding="async"
                        src={item.image}
                        alt={item.label}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                        }}
                      />
                      <small
                        className="d-block mt-2 fw-semibold"
                        style={{ fontSize: "12px" }}
                      >
                        {item.label}
                      </small>
                    </div>
                  ))}
                </div>
              </div>
              </div>

              {/* Dashboard Desktop */}
              {!isMobile ? (
                <>
                  <h5 className="mb-2 fs-4">Dashboard</h5>
                  <div className="row g-2">
                    {menuList.map((menu, index) => (
                      <div className="col-4" key={index}>
                        {menu.MenuTitle === "Delivery Partner" ||
                        menu.MenuTitle === "Vendor Portal" ? (
                          <div
                            className="text-decoration-none"
                            style={{ color: "inherit", cursor: "pointer" }}
                            onClick={
                              menu.MenuTitle === "Vendor Portal"
                                ? handleVendorPortal
                                : handleDeliveryPartnerClick
                            }
                          >
                            <div className="mnu_mn text-center d-flex flex-column justify-content-center align-items-center">
                              <span
                                className="material-symbols-outlined custom-icon position-relative d-inline-flex"
                                style={{ fontSize: "40px" }}
                              >
                                {menu.MenuTitle === "Vendor Portal" && vendorSessionId ? (
                                  <span
                                    className="d-inline-flex align-items-center justify-content-center rounded-circle"
                                    style={{
                                      width: 40,
                                      height: 40,
                                      backgroundColor: "#10301F",
                                      color: "#fff",
                                      fontSize: 16,
                                      fontWeight: "bold",
                                    }}
                                  >
                                    {getVendorIcon(vendorProfile?.name)}
                                  </span>
                                ) : menu.MenuTitle === "Delivery Partner" &&
                                  isRegistered &&
                                  partnerStatus === "open" ? (
                                  <span
                                    className="d-inline-flex align-items-center justify-content-center rounded-circle"
                                    style={{
                                      width: 40,
                                      height: 40,
                                      backgroundColor: "#10301F",
                                      color: "#fff",
                                      fontSize: 16,
                                      fontWeight: "bold",
                                    }}
                                  >
                                    {getVendorIcon(deliveryProfile?.deliveryPartnerName)}
                                  </span>
                                ) : (
                                  menu.MenuIcon
                                )}
                                {menu.MenuTitle === "Vendor Portal" && renderVendorOrderBell()}
                                {menu.MenuTitle === "Delivery Partner" && renderDeliveryOrderBell()}
                              </span>
                              <span className="fs-6">
                                {menu.MenuTitle === "Vendor Portal" && vendorSessionId
                                  ? vendorProfile?.name || menu.MenuTitle
                                  : menu.MenuTitle === "Delivery Partner" &&
                                      isRegistered &&
                                      partnerStatus === "open"
                                    ? deliveryProfile?.deliveryPartnerName || menu.MenuTitle
                                    : menu.MenuTitle}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <a
                            href={menu.TargetUrl}
                            className="text-decoration-none"
                            style={{ color: "inherit" }}
                          >
                            <div
                              className="mnu_mn text-center d-flex flex-column justify-content-center align-items-center"
                              style={{ cursor: "pointer" }}
                            >
                              <span
                                className="material-symbols-outlined custom-icon"
                                style={{ fontSize: "40px" }}
                              >
                                {menu.MenuIcon}
                              </span>
                              <span className="fs-6">{menu.MenuTitle}</span>
                            </div>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : null}

              {/* Tickets Section */}
              <div id="myTicketsSection" className="ticket-container">
                <div className="ticket-header">
                  <h4 className="ticket-title">My Tickets</h4>
                </div>
                <div className="ticket-scroll" ref={ticketScrollRef}>
                  {!loading && allTickets.length > 0
                    ? allTickets.map((ticket, index) => (
                        <div
                          key={index}
                          className={`ticket-card1 ${ticket.raiseTicketId ? "raise-ticket-bg" : ticket.martId ? "mart-ticket-bg" : ticket.lakshmiCollectionId ? "lakshmi-collection-bg" : ticket.buyProductId ? "buy-product-bg" : "book-technician-bg"}`}
                        >
                          <div className="ticket-content">
                            <p>
                              <strong>
                                {ticket.raiseTicketId
                                  ? "Raise TicketId"
                                  : ticket.martId
                                    ? "Order Id"
                                    : ticket.lakshmiCollectionId
                                      ? "Collection Id"
                                      : ticket.buyProductId
                                        ? "Buy ProductId"
                                        : "Book TechnicianId"}
                                :
                              </strong>{" "}
                              {ticket.raiseTicketId ||
                                ticket.martId ||
                                ticket.lakshmiCollectionId ||
                                ticket.buyProductId ||
                                ticket.bookTechnicianId}
                            </p>
                            {/* Show View Order only for Mart orders */}
                            {ticket.martId && (
                              <>
                                <p className="ticket-content fw-bold">
                                  Tracking:&nbsp;
                                  <button
                                    type="button"
                                    onClick={() => handleTrackOrder(ticket)}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      padding: 0,
                                      color: "blue",
                                      textDecoration: "underline",
                                      cursor: "pointer",
                                    }}
                                  >
                                    Track Now
                                  </button>
                                </p>
                                <p className="fw-bold">
                                  Grand Total : {ticket.grandTotal} /-
                                </p>
                              </>
                            )}

                            <p>
                              <strong>
                                {ticket.subject
                                  ? "Subject:"
                                  : ticket.productName
                                    ? "Product Name"
                                    : ticket?.categoriess?.[0]?.productName
                                      ? "Collection Name"
                                      : ticket.productName
                                        ? "Job Description"
                                        : ""}
                              </strong>{" "}
                              {ticket.subject ||
                                ticket.productName ||
                                ticket?.categoriess?.[0]?.productName ||
                                ticket.jobDescription}
                            </p>
                            <p>
                              <strong>
                                {ticket.category || ticket.lakshmiCollectionId
                                  ? "Category:"
                                  : ""}{" "}
                              </strong>{" "}
                              {ticket.category ||
                                ticket?.categoriess?.[0]?.categoryName ||
                                ticket.category}
                            </p>
                            <p>
                              <strong>Status:</strong>
                              <span className={ticket.status.toLowerCase()}>
                                {" "}
                                {ticket.status}
                              </span>
                            </p>
                            <p>
                              <strong>
                                {ticket.assignedTo
                                  ? "Assigned To"
                                  : "Payment Mode"}
                                :{" "}
                              </strong>{" "}
                              {ticket.assignedTo ||
                                ticket.assignedTo ||
                                ticket.assignedTo ||
                                `${ticket.paymentMode} or UPI`}
                            </p>
                            <p>
                              <strong>Date:</strong>{" "}
                              {ticket.date
                                ? new Date(ticket.date).toLocaleDateString(
                                    "en-GB",
                                  )
                                : "N/A"}
                            </p>
                            {ticket?.martId && (
                              <p>
                                <strong>
                                  {ticket.slotTime
                                    ? `Scheduled Delivery: ${ticket.slotTime}`
                                    : "Delivery Time Intimated Shortly!"}
                                </strong>
                              </p>
                            )}
                            {/* View Details Button */}
                            {ticket.paidAmount && (
                              <>
                                {/* Only show these if payment is done */}
                                <p>
                                  <strong>Transaction Status:</strong>{" "}
                                  {ticket.transactionStatus}
                                </p>
                                <p>
                                  <strong>Paid Date:</strong> {ticket.orderDate}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    : !loading && <p>No tickets found for this {userType}.</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        show={showTrackModal}
        onHide={() => setShowTrackModal(false)}
        centered
      >
        <Modal.Header
          closeButton
          style={{ backgroundColor: "#198754", color: "white" }}
        >
          <Modal.Title style={{ color: "white" }}>Track Order</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {trackLoading ? (
            <p className="mb-0">Loading latest order status...</p>
          ) : trackError ? (
            <p className="text-danger mb-0">{trackError}</p>
          ) : trackedOrder ? (
            <>
              <div className="mb-2">
                <strong>Order Id:</strong>{" "}
                {trackedOrder.martId || trackedOrder.id}
              </div>
              <div className="mb-2">
                <strong>Status:</strong> {trackedOrder.status || "N/A"}
              </div>
              <div className="mb-2">
                <strong>Assigned To:</strong>{" "}
                {trackedOrder.assignedTo ||
                  "Delivery partner will be assigned shortly"}
              </div>
              <div
                className={`alert ${trackedOrder.slotTime ? "alert-success" : "alert-info"} mb-2`}
              >
                {trackedOrder.slotTime ? (
                  <>
                    <strong>Scheduled Delivery:</strong> {trackedOrder.slotTime}
                  </>
                ) : (
                  <>
                    <strong>Delivery Time Update:</strong> Delivery time will be
                    intimated shortly.
                  </>
                )}
              </div>
              <div className="small text-muted">
                {trackedOrder.deliveryAssignedTime
                  ? `Last assigned update: ${new Date(trackedOrder.deliveryAssignedTime).toLocaleString("en-GB")}`
                  : "We will update this screen as soon as the admin schedules the order."}
              </div>
            </>
          ) : (
            <p className="mb-0">No tracking details available.</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          {String(trackedOrder?.status || "").toLowerCase() === "in progress" && (
            <Button
              variant="success"
              onClick={() => handleLiveDeliveryTracking(trackedOrder)}
            >
              Track delivery live
            </Button>
          )}
          {trackedOrder?.categories?.length ? (
            <Button
              variant="outline-primary"
              onClick={() => {
                handleViewDetails(trackedOrder);
                setShowTrackModal(false);
              }}
            >
              View Items
            </Button>
          ) : null}
          <Button variant="secondary" onClick={() => setShowTrackModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal for Mart Ticket Details */}
      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        centered
        size="lg"
      >
        <Modal.Header
          closeButton
          style={{ backgroundColor: "green", color: "white" }}
        >
          <Modal.Title style={{ color: "white" }}>Order Details</Modal.Title>
        </Modal.Header>

        <Modal.Body style={{ padding: 0 }}>
          {selectedTicket && (
            <div>
              {/* Table Header */}
              <table className="table table-bordered table-striped mb-0">
                <thead className="table-success" style={{ top: 0, zIndex: 2 }}>
                  <tr>
                    <th style={{ width: "10%" }}>S.No</th>
                    <th style={{ width: "40%" }}>Product Name</th>
                    <th style={{ width: "20%" }}>Quantity</th>
                    <th style={{ width: "30%" }}>Price (₹)</th>
                  </tr>
                </thead>
              </table>

              {/* Scrollable Table Body */}
              <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                <table className="table table-bordered table-striped mb-0">
                  <tbody>
                    {selectedTicket.categories
                      ?.flatMap((cat) => cat.products)
                      .map((p, idx) => (
                        <tr key={idx}>
                          <td style={{ width: "10%" }}>{idx + 1}</td>
                          <td style={{ width: "40%" }}>{p.productName}</td>
                          <td style={{ width: "20%" }}>{p.noOfQuantity}</td>
                          <td style={{ width: "30%" }}>
                            {Math.round(p.afterDiscountPrice)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Modal.Body>
        {/* Fixed Footer */}
        <Modal.Footer
          style={{
            position: "sticky",
            bottom: 0,
            background: "white",
            zIndex: 2,
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              width: "100%",
              gap: "20px",
              flexWrap: "wrap",
              textAlign: "right",
            }}
          >
            <h5 className="mb-0">
              Total Amount: ₹
              {selectedTicket?.categories?.reduce(
                (sum, category) => sum + (category.totalAmount || 0),
                0,
              )}{" "}
              /-
            </h5>

            {cashbackAmount > 0 && (
              <div className="fw-bold mb-0">
                <span className="text-danger me-2">Cashback Applied:</span>
                <span className="text-success">
                  ₹{Math.round(cashbackAmount)} /-
                </span>
              </div>
            )}
            <h5 className="mb-0">
              Grand Total: ₹{selectedTicket?.grandTotal} /-
            </h5>
          </div>
        </Modal.Footer>
      </Modal>
      <Modal
        show={showOffersModal}
        onHide={() => setShowOffersModal(false)}
        centered
        scrollable
      >
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: "15px", fontWeight: "bold" }}>
            🎉Handyman Special Offer Sale!
          </Modal.Title>
        </Modal.Header>
        <Modal.Footer>
          <Button variant="success" onClick={() => setShowOffersModal(false)}>
            Shop Now 🛒
          </Button>
        </Modal.Footer>
      </Modal>

     {pushSupported && !pushEnabled && !pushDismissed && userId && (
        <div className="push-notification-banner">
          <div className="push-notification-banner-content">
            <NotificationsActiveIcon
              style={{ fontSize: 24, color: "#ff9800" }}
            />
            <div style={{ flex: 1 }}>
              <strong>Stay Updated!</strong>
              <p style={{ margin: 0, fontSize: 13 }}>
                Get instant alerts on orders, offers & more
              </p>
            </div>
            <button
              className="btn btn-sm btn-warning"
              onClick={handleEnablePush}
              disabled={pushLoading}
              style={{ whiteSpace: "nowrap" }}
            >
              {pushLoading ? "Enabling..." : "Enable"}
            </button>
            <button
              className="btn btn-sm btn-light ms-1"
              onClick={handleDismissPush}
              style={{ padding: "2px 8px", fontSize: 16, lineHeight: 1 }}
              title="Dismiss"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Live Chat Widget */}
      <LiveChatWidget
        userId={userId}
        userName={profile.fullName || fullName || "Customer"}
        userType={userType}
      />
      <Footer />
    </>
  );
};
export default ProfilePage;