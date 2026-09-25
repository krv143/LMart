import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import "../App.css";
import Sidebar from "../CommonPages/Sidebar.js";
import "bootstrap/dist/css/bootstrap.min.css";
import { Dashboard as MoreVertIcon } from "@mui/icons-material";
import { Button, Modal } from "react-bootstrap";
import SearchIcon from "@mui/icons-material/Search";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import { CartStorage, MAIN_STORE_ID } from "../CommonPages/CartStorage";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Footer from "../CommonPages/Footer.js";      
// import { appConfig } from "./config";
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

const GroceryCard = () => {
  const navigate = useNavigate();
  // const location = useLocation();
  const { userType, userId, selectedUserType } = useParams();
  const location = useLocation();
  const encodedCategory =
    location.state?.encodedCategory || localStorage.getItem("encodedCategory");
  const [selectedCategory, setSelectedCategory] = useState(null); 
  const [isMobile, setIsMobile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [products, setProducts] = useState([]);
  const [imageUrls, setImageUrls] = useState({});
  const [showZoomModal, setShowZoomModal] = useState(false);
  const [zoomImage, setZoomImage] = useState("");
  const [cart, setCart] = useState({});
  const [checked, setChecked] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [likedProducts, setLikedProducts] = useState({});
  const [zoomProduct, setZoomProduct] = useState(null);
  const [grandSummary, setGrandSummary] = useState({ items: 0, total: 0 });
  const FREE_DELIVERY_LIMIT = 150;
  const total = Number(grandSummary?.total || 0);
  const amountNeeded = FREE_DELIVERY_LIMIT - total;
  const [productLimits, setProductLimits] = useState({});
  const [vendorStockMap, setVendorStockMap] = useState({});
   useEffect(() => {
    console.log(checked, grandSummary, productLimits);
  }, [checked, grandSummary, productLimits]);   

  const firstCategories = products;
  const [vendorData] = useState(() => {
    if (location.state?.isVendorGrocery) {
      return location.state;
    }

    try {
      return JSON.parse(
        localStorage.getItem("vendorGrocerySelection") || "null",
      );
    } catch {
      return null;
    }
  });

   console.log("DEBUG encodedCategory:", encodedCategory);
  console.log("DEBUG vendorData:", vendorData);
  console.log("DEBUG selectedCategory:", selectedCategory);
  console.log("DEBUG products:", products);
  console.log("DEBUG imageUrls:", imageUrls);
 const incomingStoreId = vendorData?.isVendorGrocery
    ? vendorData.vendorId
    : MAIN_STORE_ID;
  const incomingStoreName = vendorData?.isVendorGrocery
    ? vendorData.storeName || "this store"
    : "LMart Products";

  const [storeReady, setStoreReady] = useState(null);
  const [conflictStore, setConflictStore] = useState(null);

  useEffect(() => {
    if (CartStorage.isDifferentStore(incomingStoreId)) {
      setConflictStore(CartStorage.getStore());
      setStoreReady(false);
    } else {
      CartStorage.setStore(incomingStoreId, incomingStoreName);
      setConflictStore(null);
      setStoreReady(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingStoreId]);

  const handleClearCartForNewStore = () => {
    CartStorage.switchToStore(incomingStoreId, incomingStoreName);
    setCart({});
    setConflictStore(null);
    setStoreReady(true);
  };

  const handleKeepExistingCart = () => {
    navigate(-1);
  };

  useEffect(() => {
  if (!vendorData?.isVendorGrocery) return;

  const vendorProducts = Array.isArray(vendorData.products)
    ? vendorData.products
    : [];

  const vendorCategory =
    vendorData.category ||
    vendorData.selectedCategory ||
    vendorProducts[0]?.category ||
    "";

  if (vendorCategory) {
    setSelectedCategory(vendorCategory);
  }

  const sortedVendorProducts = [...vendorProducts].sort((a, b) => {
    const timeA = getItemTime(a);
    const timeB = getItemTime(b);

    if (timeA !== timeB) {
      return timeB - timeA;
    }

    return String(b.id).localeCompare(
      String(a.id),
      undefined,
      { numeric: true }
    );
  });


  // Create Azure image URLs
  const directImageUrls = {};

  sortedVendorProducts.forEach((product) => {
    const photo = Array.isArray(product.images)
      ? product.images[0]
      : product.images;

    if (photo) {
      directImageUrls[product.id] = getAzureImageUrl(photo);
    }
  });

  setImageUrls(directImageUrls);

  // IMPORTANT:
  // Vendor products must also be placed into `products`
setProducts(sortedVendorProducts);
}, [vendorData]);

useEffect(() => {
  if (!vendorData?.isVendorGrocery || !vendorData?.vendorId) {
    return;
  }

  const controller = new AbortController();

  const fetchVendorProductData = async () => {
    try {
      const response = await axios.get(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/VendorUploadProducts/GetVendorProductsvalues?vendorId=${encodeURIComponent(
          vendorData.vendorId
        )}`,
        { signal: controller.signal }
      );
      const vendorResponse = Array.isArray(response.data) ? response.data : [];
      const limitData = {};
      const stockData = {};
      vendorResponse.forEach((vendor) => {
        vendor?.categorie?.forEach((category) => {
          category?.products?.forEach((vendorProduct) => {
            const vendorProductId = String(vendorProduct.productIds);
            const vendorLimit =
              vendorProduct.limit !== null && vendorProduct.limit !== undefined
                ? Number(vendorProduct.limit)
                : null;
            limitData[vendorProductId] = vendorLimit;
           const vendorQty =
              vendorProduct.quantity !== null && vendorProduct.quantity !== undefined
                ? Number(vendorProduct.quantity)
                : 0;
            stockData[vendorProductId] = Number.isFinite(vendorQty) ? vendorQty : 0;
          });
        });
      });
      setProductLimits(limitData);
      setVendorStockMap(stockData);
    } catch (error) {
      if (error?.name !== "CanceledError" && error?.name !== "AbortError") {
        console.error("Error fetching vendor limits/stock:", error);
      }
    }
  };
  fetchVendorProductData();
  return () => controller.abort();
}, [vendorData]);


 
  const mobileNumber = localStorage.getItem("customerMobileNumber");
  console.log("Mobile Number from localStorage:", mobileNumber);

  useEffect(() => {
    if (!storeReady) return; 
    const saved = CartStorage.getAll() || [];
    const categories = Array.isArray(saved) ? saved : [saved];

    const exist = categories.find((c) => c.categoryName === selectedCategory);
    if (exist) {
      const restored = {};
      (exist.products || []).forEach((p) => {
        restored[String(p.productId)] = Number(p.qty);
      });
      setCart(restored);
    }
  }, [selectedCategory, storeReady]);

  useEffect(() => {
    if (!selectedCategory) return;
    if (!storeReady) return; 

    // Convert cart state → product list
    const current = Object.entries(cart).map(([productId, qty]) => {
      const product = products.find((p) => String(p.id) === String(productId));
      return {
        productId,
        productName: product?.name || "",
        qty: Number(qty),
        mrp: Number(product?.mrp || 0),
        discount: Number(product?.discount || 0),
        afterDiscountPrice: Number(product?.afterDiscount || 0),
        stockLeft: Number(product?.stockLeft || 0),
        image: getAzureImageUrl(
  Array.isArray(product?.images)
    ? product.images[0]
    : product?.images
),
        code: product?.code || "",
        units: product?.units || "",
      };
    });
    CartStorage.upsertCategory(selectedCategory, current);
    setGrandSummary(CartStorage.grandSummary());
  }, [cart, selectedCategory, products, storeReady]);

  // const handleAdd = (productId) => setCart(prev => ({ ...prev, [productId]: 1 }));

  const handleIncrement = (productId) => {
  if (!storeReady) return;

  setCart((prev) => {
    const product = products.find(
      (p) => String(p.id) === String(productId)
    );

    const stock = getStock(product);
    const limit = getLimit(product);
    const currentQty = Number(prev[productId] || 0);

    if (currentQty >= stock) return prev;
    if (currentQty >= limit) return prev;

    return {
      ...prev,
      [productId]: currentQty + 1,
    };
  });
};

  const handleDecrementClick = (productId) => {
    if (!storeReady) return;
    setCart((prev) => {
      const next = (prev[productId] || 0) - 1;
      const copy = { ...prev };
      if (next <= 0) delete copy[productId];
      else copy[productId] = next;
      return copy;
    });
  };

  useEffect(() => {
    localStorage.setItem("cartData", JSON.stringify(cart));
  }, [cart]);

  const toggleLike = (productId) => {
    setLikedProducts((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  const handleImageClick = (imageSrc, product) => {
    setZoomImage(imageSrc);
    setZoomProduct(product);
    setShowZoomModal(true);
  };

  const getQty = (id) => Number(cart?.[id] || 0);

 const canAddMore = (id) => {
  const product = products.find(
    (p) => String(p.id) === String(id)
  );

  const stock = getStock(product);
  const limit = getLimit(product);
  const currentQty = getQty(id);

  return currentQty < stock && currentQty < limit;
};

  const handleAddClick = (id) => {
  if (!storeReady) return;

  const product = products.find(
    (p) => String(p.id) === String(id)
  );

  const stock = getStock(product);
  const limit = getLimit(product);

  if (stock <= 0) return;
  if (limit <= 0) return;

  setCart((prev) => ({
    ...prev,
    [id]: 1,
  }));

  setChecked(true);
};
const getStock = (product) => {
  if (!product) return 0;

  const productId = String(product.id);

  if (vendorData?.isVendorGrocery) {
    const vendorStock = vendorStockMap[productId];
    if (vendorStock !== undefined) {
      return Number.isFinite(vendorStock) ? vendorStock : 0;
    }
    return Number(product.stockLeft || 0);
  }

  return Number(product.stockLeft || 0);
};

const getLimit = (product) => {
  if (!product) {
    return Infinity;
  }

  const productId = String(product.id);

  // For vendor grocery, use limit from GetVendorProductsvalues API
  if (vendorData?.isVendorGrocery) {
    const vendorLimit = productLimits[productId];

    if (
      vendorLimit !== null &&
      vendorLimit !== undefined &&
      Number.isFinite(Number(vendorLimit))
    ) {
      const numericVendorLimit = Number(vendorLimit);

      if (numericVendorLimit === 0) {
        return Infinity;
      }

      if (numericVendorLimit > 0) {
        return numericVendorLimit;
      }
    }
  }

  // Normal grocery product limit
  const apiLimit = Number(product.limit);

  if (apiLimit === 0) {
    return Infinity;
  }

  if (Number.isFinite(apiLimit) && apiLimit > 0) {
    return apiLimit;
  }

  return Infinity;
};

 function getItemTime(p) {
  if (!p) return 0;
  const candidates = [
    p.createdAt,
    p.created_at,
    p.created_on,
    p.createdDate,
    p.createDate,
    p.addedDate,
    p.added_at,
    p.date,
    p.updatedAt,
    p.updated_at,
    p.updated_on,
    p.modifiedAt,
    p.modified_on,
    p.timestamp,
    p.timeStamp,
  ];

  for (const value of candidates) {
    if (!value) continue;
    const time = Date.parse(value);
    if (!Number.isNaN(time)) {
      return time;
    }
  }
  if (typeof p.id === "number") {
    return p.id;
  }
  const idNum =
    Number(String(p.id || "").replace(/\D/g, "")) || 0;
  return idNum;
}

 useEffect(() => {
  if (vendorData?.isVendorGrocery) return;
  if (!encodedCategory) return;

  const decodedCat = decodeURIComponent(encodedCategory);
  setSelectedCategory(decodedCat);

  const controller = new AbortController();

  const fetchProducts = async () => {
    try {
      const url =
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/` +
        `api/UploadGrocery/GetGroceryItemsBycategory?Category=${encodeURIComponent(
          decodedCat
        )}`;

      const { data: items } = await axios.get(url, {
        signal: controller.signal,
      });

      const safeItems = Array.isArray(items) ? items : [];

      const sorted = [...safeItems].sort((a, b) => {
        const stockA = Number(a.stockLeft || 0);
        const stockB = Number(b.stockLeft || 0);

        if (stockA <= 0 && stockB > 0) return 1;
        if (stockA > 0 && stockB <= 0) return -1;

        const timeA = getItemTime(a);
        const timeB = getItemTime(b);

        if (timeA !== timeB) {
          return timeB - timeA;
        }

         return String(b.id).localeCompare(
          String(a.id),
          undefined,
          { numeric: true }
        );
      });

      setProducts(sorted);

      // Azure images
      const directImageUrls = {};

      sorted.forEach((product) => {
        const photo = Array.isArray(product.images)
          ? product.images[0]
          : product.images;

        if (photo) {
          directImageUrls[product.id] =
            getAzureImageUrl(photo);
        }
      });

      setImageUrls(directImageUrls);

    } catch (err) {
      if (
        err?.name !== "CanceledError" &&
        err?.name !== "AbortError"
      ) {
        console.error("Error fetching products:", err);
        setProducts([]);
        setImageUrls({});
      }
    }
  };

  fetchProducts();

  return () => controller.abort();
}, [encodedCategory, vendorData]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let savedCategories = [];

    try {
      const raw = localStorage.getItem("allCategories");
      if (raw) {
        const parsed = JSON.parse(raw);
        savedCategories = Array.isArray(parsed) ? parsed : [parsed];
      }
    } catch (e) {
      console.error("Invalid JSON in localStorage for allCategories:", e);
    }

    const currentCategory = decodeURIComponent(encodedCategory);

    const existingCategory = savedCategories.find(
      (c) => c.categoryName === currentCategory,
    );

    if (existingCategory) {
      const restoredCart = {};
      (existingCategory.products || []).forEach((p) => {
        restoredCart[p.productId] = p.qty;
      });
      setCart(restoredCart);
    }
  }, [encodedCategory]);

  return (
    <>
      <div>
        <div>
          <h1
            style={{
              background: "green",
              color: "white",
              fontFamily: "'Baloo 2'",
              fontSize: "25px",
              padding: "2px",
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
            <br />
            <span
              style={{
                fontSize: "12px",
                fontWeight: "bold",
                display: "block",
                marginTop: "2px",
                textAlign: "center",
                fontFamily: "Roboto",
              }}
            >
              FSSAI LIC Number - 20125051001066
            </span>
            <span
              style={{
                fontSize: "12px",
                fontWeight: "bold",
                display: "block",
                marginTop: "2px",
                textAlign: "center",
                fontFamily: "Roboto",
              }}
            >
              Delivery Timings : 07:00 AM -09:00 PM
            </span>
          </h1>
        </div>

        <div
          className="wrapper d-flex"
          style={{ marginTop: isMobile ? "65px" : "250px" }}
        >
          {/* Sidebar */}
          {!isMobile ? (
            <div className="ml-0 p-0 sde_mnu">
              <Sidebar userType={selectedUserType} />
            </div>
          ) : (
            <div className="groceryfloating-menu">
              <Button
                variant="primary"
                className="rounded-circle shadow"
                onClick={() => setShowMenu(!showMenu)}
              >
                <MoreVertIcon />
              </Button>

              {showMenu && (
                <div className="sidebar-container">
                  <Sidebar userType={selectedUserType} />
                </div>
              )}
            </div>
          )}

          <div className={`container ${isMobile ? "w-100" : "w-75"} `}>
            <div
              style={{
                position: "fixed",
                top: "65px",
                left: 0,
                width: "100%",
                background: "white",
                zIndex: 999,
                padding: "8px 12px",
                boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
              }}
            >
              <div className="position-relative flex-grow-1 ms-5">
                <input
                  type="text"
                  className="form-control w-60 mt-2 ps-5 "
                  placeholder="Search Products"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value.trimStart())}
                />
                <SearchIcon
                  className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"
                  style={{ pointerEvents: "none" }}
                />
              </div>
              {selectedCategory === "DWCRA" && (
                <div
                  className="mt-1 text-center"
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "green",
                    letterSpacing: "1px",
                  }}
                >
                  DWCRA MANUFACTURING PRODUCTS
                </div>
              )}

              {selectedCategory && (
                <>
                  <div className="d-flex align-items-center">
                    <ArrowBackIcon
                      className="me-2"
                      style={{ color: "green", cursor: "pointer" }}
                      onClick={() =>
                        navigate(`/profilePage/${userType}/${userId}`)
                      }
                    />
                    <h4 className="fw-bold mt-1">{selectedCategory}</h4>
                  </div>
                  {(selectedCategory === "Chicken" ||
                    selectedCategory === "Ice Creams") && (
                    <div
                      className="mt-1 rounded-3"
                      style={{
                        backgroundColor: "#fff3e0",
                        color: "red",
                        fontSize: "13px",
                        fontWeight: "600",
                        border: "1px solid #ffd180",
                      }}
                    >
                      📝 Delivery is only for Yendada and Madhurawada.
                    </div>
                  )}
                  {selectedCategory === "Chicken" && (
                    <div
                      className="mt-1 rounded-3"
                      style={{
                        backgroundColor: "#e3f2fd",
                        color: "red",
                        fontSize: "13px",
                        fontWeight: "600",
                        border: "1px solid #90caf9",
                      }}
                    >
                      {" "}
                      📝 Chicken Available Pre-Booking Only. <br />
                      🕒 Pre Booking Orders from Saturday 5:00PM to Sunday
                      9:00AM. <br />
                      🛍️ Delivery Time Tomorrow Sunday Between 7:00AM to
                      10:00AM.
                    </div>
                  )}
                </>
              )}
            </div>

            {selectedCategory && (
              <>
                <div
                  className="d-flex justify-content-end"
                  style={{
                    marginTop:
                      selectedCategory === "Chicken" ? "230px" : "120px",
                  }}
                >
                  <span className="text-success text-xs">
                    Selected Qty:{" "}
                    <span className="text-danger fw-bold">
                      {Object.values(cart).reduce((sum, qty) => sum + qty, 0)}
                    </span>
                  </span>

                  <span className="text-success text-xs ms-2">
                    Total Price: Rs{" "}
                    <span className="text-danger fw-bold">
                      {Math.round(
                        Object.entries(cart).reduce((sum, [productId, qty]) => {
                          const product = products.find(
                            (p) => String(p.id) === String(productId),
                          );
                          return (
                            sum +
                            (product ? Number(product.afterDiscount) * qty : 0)
                          );
                        }, 0),
                      )}
                    </span>
                    /-
                  </span>
                </div>

                <div
                  className="grocery-row flex flex-wrap gap-1"
                  style={{ marginBottom: "60px" }}
                >
                  {firstCategories
                    .filter(
                      (p) =>
                        p.category?.toLowerCase() ===
                          selectedCategory.toLowerCase() &&
                        p.status === "Approved" &&
                        (searchQuery === "" ||
                          p.name
                            ?.toLowerCase()
                            .includes(searchQuery.toLowerCase())),
                    )
                    .map((product) => {
                      const stock = getStock(product);
                      const isOutOfStock = stock <= 0;
                      return (
                        <div
                          key={product.id}
                          className="w-[200px] flex flex-col p-2 bg-white rounded shadow-sm border position-relative"
                          style={{
                            minHeight: "230px",
                            opacity: isOutOfStock ? 0.6 : 1,
                          }}
                        >
                          <div className="d-flex flex-row justify-content-between absolute top-0 left-0 w-full">
                            {Number(product.discount) > 0 && !isOutOfStock && (
                              <span className="discount-badge">
                                {Math.round(Number(product.discount))}%
                              </span>
                            )}
                            {!isOutOfStock && (
                              <span
                                style={{
                                  cursor: "pointer",
                                  marginRight: "6px",
                                  marginTop: "2px",
                                  zIndex: 3,
                                }}
                                onClick={() => toggleLike(product.id)}
                              >
                                {likedProducts[product.id] ? (
                                  <FavoriteIcon style={{ color: "red" }} />
                                ) : (
                                  <FavoriteBorderIcon
                                    style={{ color: "grey" }}
                                  />
                                )}
                              </span>
                            )}
                          </div>
                          {/* Product Image*/} 
                          <div
                            className="d-flex justify-content-center align-items-center position-relative"
                            style={{ height: "90px" }}
                          >
                            {imageUrls[product.id] ? (
                              <img
                                src={imageUrls[product.id]}
                                alt={product.name}
                                loading="lazy"
                                decoding="async"
                                style={{
                                  maxHeight: "80px",
                                  maxWidth: "100%",
                                  objectFit: "contain",
                                  cursor: isOutOfStock
                                    ? "not-allowed"
                                    : "pointer",
                                  borderRadius: "6px",
                                  backgroundColor: "#f5f5f5",
                                }}
                                onClick={() =>
                                  !isOutOfStock &&
                                  handleImageClick(
                                    imageUrls[product.id],
                                    product,
                                  )
                                }
                              />
                            ) : (
                              <div
                                style={{
                                  width: "60px",
                                  height: "60px",
                                  backgroundColor: "#f0f0f0",
                                  borderRadius: "6px",
                                }}
                              />
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
                            <div
                              className="text-start m-0"
                              style={{ fontSize: "11px" }}
                            >
                              {product.afterDiscount != null && (
                                <b className="text-success me-2">
                                  ₹{Math.round(Number(product.afterDiscount))}
                                </b>
                              )}
                              {product.mrp != null && (
                                <s className="text-muted">₹{product.mrp}</s>
                              )}
                              {product.units && (
                                <b
                                  className="text-success"
                                  style={{ marginLeft: "5px" }}
                                >
                                  {product.units}
                                </b>
                              )}
                            </div>
                          )}
                          {(() => {
                            const limit = getLimit(product);
                            return Number.isFinite(limit) && limit > 0 ? (
                              <div
                                style={{
                                  color: "#db1818",
                                  paddingBottom: "2px",
                                  fontSize: "10px",
                                  fontWeight: 600,
                                  marginBottom: "28px",
                                }}
                              >
                                Max {limit} per customer
                              </div>
                            ) : null;
                          })()}

                          {/* Checkbox */}
                          {!isOutOfStock && (
                            <div
                              style={{
                                position: "absolute",
                                bottom: "8px",
                                left: "8px",
                              }}
                            >
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
                            <div
                              style={{
                                position: "absolute",
                                bottom: "8px",
                                right: "8px",
                              }}
                            >
                              {cart[product.id] ? (
                                <div
                                  className="d-flex align-items-center justify-content-between"
                                  style={{
                                    backgroundColor: "green",
                                    color: "white",
                                    borderRadius: "8px",
                                    padding: "2px",
                                    minWidth: "60px",
                                    // position: "relative",
                                  }}
                                >
                                  <button
                                    className="btn btn-sm p-0 text-white"
                                    style={{
                                      fontWeight: "bold",
                                      width: "25px",
                                      height: "25px",
                                    }}
                                    onClick={() =>
                                      handleDecrementClick(product.id)
                                    }
                                  >
                                    –
                                  </button>
                                  <span className="fw-bold">
                                    {cart[product.id]}
                                  </span>
                                  <button
                                    className="btn btn-sm p-0 text-white"
                                    style={{
                                      fontWeight: "bold",
                                      width: "25px",
                                      height: "25px",
                                      opacity: canAddMore(product.id) ? 1 : 0.5,
                                      cursor: canAddMore(product.id)
                                        ? "pointer"
                                        : "not-allowed",
                                    }}
                                    onClick={() =>
                                      canAddMore(product.id) &&
                                      handleIncrement(product.id)
                                    }
                                    disabled={!canAddMore(product.id)}
                                    title={
                                        getQty(product.id) >= getLimit(product)
                                          ? `Maximum ${getLimit(product)} allowed`
                                          : !canAddMore(product.id)
                                            ? "No more stock"
                                            : "Add one"
                                      }
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
                                  onClick={() => handleAddClick(product.id)}
                                >
                                  ADD
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                  {total > 0 && total < FREE_DELIVERY_LIMIT && (
                    <div
                      style={{
                        position: "fixed",
                        bottom: "92px",
                        left: "10px",
                        right: "10px",
                        backgroundColor: "#FFF3CD",
                        color: "#D10000",
                        padding: "8px",
                        borderRadius: "8px",
                        textAlign: "center",
                        fontWeight: "600",
                        fontSize: "13px",
                        zIndex: 2001,
                        boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
                      }}
                    >
                      🎉 Add ₹{amountNeeded} more to unlock save{" "}
                      <strong style={{ fontSize: "15px" }}>₹20</strong> FREE
                      DELIVERY & Handling Charges
                    </div>
                  )}

                  {/* Cart Bar */}
                  {(() => {
                    // Safe reader that ALWAYS returns an array of categories
                    const readAllCategories = () => {
                      if (typeof window === "undefined") return []; // SSR guard
                      try {
                        const raw = localStorage.getItem("allCategories");
                        if (!raw) return [];
                        const parsed = JSON.parse(raw);
                        const arr = Array.isArray(parsed) ? parsed : [parsed];
                        // ensure each category has an array `products`
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
                          marginTop: "10px",
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
                            navigate(`/groceryCart/${userType}/${userId}`, {
                              state: { mobileNumber },
                            })
                          }
                        >
                          View Cart →
                        </button>
                      </div>
                    ) : null;
                  })()}
                </div>
              </>
            )}
          </div>
        </div>
        <Footer />
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
          className="close-button text-end mt-0"
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
          <h6 className="text-start fw-bold m-0" style={{ fontSize: "12px" }}>
            {zoomProduct?.name || ""}
          </h6>
          {/* <p className="text-start text-muted m-0" style={{ fontSize: "12px" }}>
     MRP: ₹{zoomProduct?.mrp ?? ""}
   </p> */}
          {zoomProduct?.afterDiscount != null && (
            <p className="text-start m-0" style={{ fontSize: "12px" }}>
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

      <Modal show={Boolean(conflictStore)} centered backdrop="static">
        <Modal.Body className="text-center">
          <h6 className="fw-bold mb-2">Start a new order?</h6>
          <p style={{ fontSize: "13px" }} className="text-muted mb-3">
            Your cart has items from{" "}
            <b>{conflictStore?.storeName || "another store"}</b>. You can
            only order from one store at a time — adding items from{" "}
            <b>{incomingStoreName}</b> will clear that cart.
          </p>
          <div className="d-flex justify-content-center gap-2">
            <Button variant="outline-secondary" onClick={handleKeepExistingCart}>
              Keep existing cart
            </Button>
            <Button variant="danger" onClick={handleClearCartForNewStore}>
              Clear cart &amp; continue
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
};
<style jsx>{`
  .zoomable-image {
    transition: transform 0.3s ease-in-out;
  }
  .zoomable-image:hover {
    transform: scale(1.1);
  }
  .zoom-container {
    position: relative;
    display: inline-block;
  }
  .close-button {
    position: absolute;
    top: 4px;
    right: 5px;
    background: red;
    border: none;
    font-size: 24px;
    color: white;
    padding: 5px;
    border-radius: 50%;
    cursor: pointer;
    transition: 0.3s;
  }
  .close-button:hover {
    background: darkred;
  }
  .zoom-image {
    max-width: 70%;
    height: 50%;
    border-radius: 5px;
  }
`}</style>;
export default GroceryCard;