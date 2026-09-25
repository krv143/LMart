import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import "../App.css";
import Sidebar from "../CommonPages/Sidebar.js";
import "bootstrap/dist/css/bootstrap.min.css";
import { Dashboard as MoreVertIcon } from "@mui/icons-material";
import { Button, Modal } from "react-bootstrap";
import SearchIcon from '@mui/icons-material/Search';
import FavoriteIcon from "@mui/icons-material/Favorite"; 
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder"; 
import { CartStorage } from "../CommonPages/CartStorage";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
// import ImageCache from "./utils/ImageCache";
import Footer from "../CommonPages/Footer.js";
// import { appConfig } from "./config";

const BLOB_BASE_URL =
  "https://lmartfiles.blob.core.windows.net/userattechements";

const getAzureImageUrl = (imageValue) => {
  if (!imageValue) return "";

  const value = String(imageValue).trim();

  if (!value) return "";

  // If API already returns a complete URL
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  // Remove leading slash
  const cleanName = value.replace(/^\/+/, "");

  // Encode spaces, brackets, etc.
  return `${BLOB_BASE_URL}/${encodeURIComponent(cleanName)}`;
};

const MartHomeAppliances = () => { 
  const navigate = useNavigate();
  const { userType, userId, selectedUserType } = useParams();
  const location = useLocation();
  const encodedCategory = location.state?.encodedCategory || localStorage.getItem("encodedCategory");
const [selectedCategory, setSelectedCategory] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [products, setProducts] = useState([]);
  const [imageUrls, setImageUrls] = useState({});
  const [imageLoading, setImageLoading] = useState(true);
  const [showZoomModal, setShowZoomModal] = useState(false);
  const [zoomImage, setZoomImage] = useState("");
  const [cart, setCart] = useState({});
 const [checked, setChecked] = useState(false);
const [searchQuery, setSearchQuery] = useState('');
const [likedProducts, setLikedProducts] = useState({}); 
const [zoomProduct, setZoomProduct] = useState(null);
const [grandSummary, setGrandSummary] = useState({ items: 0, total: 0 });     

 useEffect(() => { 
console.log(zoomImage, checked, imageLoading, grandSummary);
}, [zoomImage, checked, imageLoading, grandSummary]);
              
const mobileNumber = localStorage.getItem("customerMobileNumber");
console.log("Mobile Number from localStorage:", mobileNumber);

useEffect(() => {
  const saved = CartStorage.getAll() || [];
  const categories = Array.isArray(saved) ? saved : [saved]; 

  const exist = categories.find(c => c.categoryName === selectedCategory);
  if (exist) {
    const restored = {};
    (exist.products || []).forEach(p => {
      restored[String(p.productId)] = Number(p.qty);
    });
    setCart(restored);
  }
}, [selectedCategory]);

useEffect(() => {
  if (!selectedCategory) return;

  // Convert cart state → product list
  const current = Object.entries(cart).map(([productId, qty]) => {
  const product = products.find(p => String(p.id) === String(productId));
  return {
    productId,
    productName: product?.name || "",
    qty: Number(qty),
    mrp: Number(product?.mrp || 0),
    discount: Number(product?.discount || 0),
    afterDiscountPrice: Number(product?.afterDiscount || 0),
    stockLeft: Number(product?.stockLeft || 0),
    image: product?.images?.[0] || "",
    code: product?.code || "",
    units: product?.units || "",
  };
});  
  CartStorage.upsertCategory(selectedCategory, current);
  setGrandSummary(CartStorage.grandSummary());
}, [cart, selectedCategory, products]);

const handleAdd = (productId) => setCart(prev => ({ ...prev, [productId]: 1 }));
const handleIncrement = (productId) =>
  setCart(prev => {
    const product = products.find(p => String(p.id) === String(productId));
    const stock = Number(product?.stockLeft || 0);
    const cur = Number(prev[productId] || 0);
    if (cur >= stock) return prev;
    return { ...prev, [productId]: cur + 1 };
  });

const handleDecrementClick = (productId) =>
  setCart(prev => {
    const next = (prev[productId] || 0) - 1;
    const copy = { ...prev };
    if (next <= 0) delete copy[productId];
    else copy[productId] = next;
    return copy;
  });

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
  const product = products.find(p => String(p.id) === String(id));
  const stock = Number(product?.stockLeft || 0);
  return getQty(id) < stock;
};

const handleAddClick = (id) => {
  const product = products.find(p => String(p.id) === String(id));
  const stock = Number(product?.stockLeft || 0);
  if (stock <= 0) return; 
  handleAdd(id);
  setChecked(true);
};

function getItemTime(p) {
  if (!p?.date || p.date.startsWith("0001")) return 0;
  const t = Date.parse(p.date);
  if (!Number.isNaN(t)) return t;

  const candidates = [
    p.createdAt, p.created_on, p.createdDate, p.createDate,
    p.updatedAt, p.updated_on, p.modifiedAt, p.modified_on,
    p.addedDate, p.added_at, p.timestamp, p.timeStamp,
  ];
  for (const c of candidates) {
    const time = Date.parse(c);
    if (!Number.isNaN(time)) return time;
  }
  if (typeof p.id === "number") return p.id;
  const idNum = Number(String(p.id || "").replace(/\D/g, "")) || 0;
  return idNum;
}

const mapApiProductToUI = (p) => {
  const rate = Number(p.rate || 0);
  const discount = Number(p.discount || 0);
  return {
    id: p.id,
    name: p.productName,
    category: p.category,
    images: Array.isArray(p.productPhotos) ? p.productPhotos : [],
    mrp: rate,
    discount: discount,
    afterDiscount: Math.round(rate - (rate * discount) / 100),
    stockLeft: Number(p.numberOfStockAvailable || 0),
    units: p.units || "",
    status: (p.productStatus || p.status || "Approved").trim(),
    code: p.productId,
    date: p.date,
    catalogue: p.catalogue,
    productSize: p.productSize,
    color: p.color,
    specifications: p.specifications || [],
    specificationDesc: p.specificationDesc,
    warranty: p.warranty,
  };
};

 useEffect(() => {
    if (!encodedCategory) return;
    const decodedCat = decodeURIComponent(encodedCategory);
    setSelectedCategory(decodedCat);
    let cancelled = false;
    const controller = new AbortController();
    // const POLL_MS = 2000; 
    // let pollId = null;
    async function fetchProductsAndFirstImages(warm = false, signal) {
      try {   
        if (!warm) setImageLoading(true);
        const url = `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/Product/GetProductsByCategory?Category=${encodeURIComponent(
          decodedCat
        )}`;
        const { data } = await axios.get(url, { signal });
        const safeItems = Array.isArray(data) ? data.map(mapApiProductToUI) : [];
        const sorted = [...safeItems].sort((a, b) => {
          const stockA = Number(a.stockLeft || 0);
          const stockB = Number(b.stockLeft || 0);
          if (stockA <= 0 && stockB > 0) return 1;
          if (stockA > 0 && stockB <= 0) return -1;
          const timeA = getItemTime(a);
          const timeB = getItemTime(b);
          return timeB - timeA;
        });
         if (cancelled) return;
        setProducts(sorted);
        const directImageUrls = {};

sorted.forEach((product) => {
  const photos = Array.isArray(product.images)
    ? product.images
    : [];

  if (photos.length > 0) {
    directImageUrls[product.id] = photos.map((photo) =>
      getAzureImageUrl(photo)
    );
  }
});

setImageUrls(directImageUrls);
      } catch (err) {
        if (err?.name !== "CanceledError" && err?.name !== "AbortError") {
          console.error("Error fetching grocery products:", err);
          if (!warm) {
            setProducts([]);
            setImageUrls({});
          }
        }
      } finally {
        if (!cancelled) setImageLoading(false);
      }
    }
    fetchProductsAndFirstImages( controller.signal);
    // pollId = setInterval(() => {
    //   const pollController = new AbortController();
    //   fetchProductsAndFirstImages(true, pollController.signal);
    // }, POLL_MS);      

    return () => {
      cancelled = true;
      controller.abort();
      // if (pollId) clearInterval(pollId);
    };
  }, [encodedCategory]);

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
    (c) => c.categoryName === currentCategory
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
              fontSize: "26px",
              padding: "2px",
              fontWeight: "bold",
              textAlign: "center",
              width: "100%",
              boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
              letterSpacing: "1px",
              marginBottom: "4px",
              position: "fixed",
              top: 0,
              left: 0,
              zIndex: 1000,  
            }}
          >
            Home Appliances
            <span
              style={{
                fontSize: "14px",
                fontWeight: "bold",
                display: "block",
                marginTop: "2px",
                textAlign: "center",
                fontFamily: "Roboto",
              }}
            >
                Delivery Timings : 06:00 AM -09:00 PM
            </span>
          </h1>
        </div>

        <div className="wrapper d-flex" style={{ marginTop: isMobile ? "50px" : "200px" }}>
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
                    top: "65px",     left: 0,
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
                        style={{ pointerEvents: 'none' }}
                      />
                    </div>

          {selectedCategory && (
            <>
            <div className="d-flex align-items-center">
              <ArrowBackIcon
                className="me-2"
                style={{ color: "green", cursor: "pointer" }}
                onClick={() => navigate(`/profilePage/${userType}/${userId}`)}
              />
              <h4 className="fw-bold mt-1">{selectedCategory}</h4>
            </div>
            </>
          )}
        </div>
  {selectedCategory && (
    <>
  <div className="d-flex justify-content-end" style={{ marginTop: selectedCategory === "Chicken" ? "230px" : "120px"}}>  
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
          (p) => String(p.id) === String(productId)
        );
        return (
          sum + (product ? Number(product.afterDiscount) * qty : 0)
        );
      }, 0)
    )}
  </span>
  /-
</span>
</div>

      <div className="grocery-row flex flex-wrap gap-1" style={{marginBottom: "60px"}}>
        {products
  .filter(
    (p) =>
      p.category?.toLowerCase() === selectedCategory.toLowerCase() &&
      p.status === "Approved" &&
      (searchQuery === "" ||
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()))
  )
  .map((product) => {
    const stock = Number(product.stockLeft || 0);
    const isOutOfStock = stock <= 0;
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
    {!isOutOfStock && (
      <span
        style={{ cursor: "pointer", marginRight: "6px", marginTop: "2px", zIndex: 3 }}
        onClick={() => toggleLike(product.id)}
      >
        {likedProducts[product.id] ? (
          <FavoriteIcon style={{ color: "red" }} />
        ) : (
          <FavoriteBorderIcon style={{ color: "grey" }} />
        )}
      </span>
    )}
  </div>
  {/* Product Image */}
  <div
    className="d-flex justify-content-center align-items-center position-relative"
    style={{ height: "90px" }}
  >
    {imageUrls[product.id]?.[0] ? (
      <img
        src={imageUrls[product.id]?.[0]}
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
        onClick={() => !isOutOfStock && handleImageClick(imageUrls[product.id][0], product)}
      />
    ) : (
      <span className="text-muted small">Loading Image</span>
    )}

    {isOutOfStock && (
      <div
        className="position-absolute d-flex justify-content-center align-items-center"
        style={{
          top: 0, left: 0, width: "100%", height: "100%",
          background: "rgba(255,255,255,0.75)", borderRadius: "6px", zIndex: 2,
        }}
      >
        <span
          style={{
            fontWeight: 500, backgroundColor: "grey", color: "white",
            fontSize: "10px", borderRadius: "6px", margin: "1px", padding: "2px",
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
      {product.mrp != null && <s className="text-muted">₹{product.mrp}</s>}
      {product.units && (
        <b className="text-success" style={{ marginLeft: "5px" }}>
          {product.units}
        </b>
      )}
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
          <button
            className="btn btn-sm p-0 text-white"
            style={{ fontWeight: "bold", width: "25px", height: "25px" }}
            onClick={() => handleDecrementClick(product.id)}
          >
            –
          </button>
          <span className="fw-bold">{cart[product.id]}</span>
          <button
            className="btn btn-sm p-0 text-white"
            style={{ fontWeight: "bold", width: "25px", height: "25px",  opacity: canAddMore(product.id) ? 1 : 0.5,
            cursor: canAddMore(product.id) ? "pointer" : "not-allowed" }}
            onClick={() => canAddMore(product.id) && handleIncrement(product.id)}
            disabled={!canAddMore(product.id)} 
            title={!canAddMore(product.id) ? "No more stock" : "Add one"}
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
      return arr
        .filter(Boolean)
        .map((cat) => ({
          ...cat,
          products: Array.isArray(cat?.products) ? cat.products : [],
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
          Number(p?.afterDiscountPrice ?? p?.price ?? p?.finalPrice ?? 0) || 0;
        acc.items += qty;
        acc.total += price * qty;
      }
      return acc;
    },
    { items: 0, total: 0 }
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
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        🛒
        <div style={{ display: "flex", flexDirection: "column", lineHeight: "1.2" }}>
          <span style={{ fontSize: "12px" }}>{items} items</span>
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
    <Footer/>
      </div>
      <Modal
  show={showZoomModal}
  onHide={() => {
    setShowZoomModal(false);
    setZoomProduct(null);
  }}
  centered
  size="lg"
>
  {/* Close Button */}
  <button
    className="close-button"
    onClick={() => {
      setShowZoomModal(false);
      setZoomProduct(null);
    }}
  >
    &times;
  </button>
  <Modal.Body className="text-start">
    <div
      className="d-flex gap-2 mb-3"
      style={{
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {zoomProduct?.images?.map((img, idx) => (
        <img
          key={idx}
          src={imageUrls[zoomProduct.id]?.[idx] || imageUrls[zoomProduct.id]?.[0]}
          alt={`product-${idx}`}
          style={{
            height: "200px",
            minWidth: "200px",
            objectFit: "contain",
            borderRadius: "8px",
            border: "1px solid #ddd",
            background: "#fff",
          }}  
        />
      ))}
    </div>
    <h5 className="mb-1"  style={{ fontSize: "16px", fontWeight:"bold" }}>{zoomProduct?.name}</h5>
    <div className="mb-2" style={{ fontSize: "14px" }}>
      <b className="text-success me-2">
        ₹{Math.round(zoomProduct?.afterDiscount || 0)}
      </b>
      {zoomProduct?.mrp && (
        <s className="text-muted me-2">₹{zoomProduct.mrp}</s>
      )}
      {zoomProduct?.discount > 0 && (
        <span className="text-danger">
          {zoomProduct.discount}%
        </span>
      )}
    </div>
    {zoomProduct?.specifications?.length > 0 && (
      <>
        <div>
          <b>Specifications:</b>
          <ul className="ps-3 mb-2">
            {zoomProduct.specifications.map((spec, idx) => (
              <li key={idx} style={{ fontSize: "13px" }}>
                <b>{spec.label}:</b> {spec.value}
              </li>
            ))}
          </ul>
        </div>
        <div style={{ fontSize: "13px" }}>
          <b>Description:</b>
          <p className="mb-1">{zoomProduct.specificationDesc}</p>
        </div>
      </>
    )}
    {zoomProduct?.warranty && (
      <>
        <div style={{ fontSize: "13px", marginBottom: "10px" }}>  
          <b>Warranty:</b> {zoomProduct.warranty}
        </div>
      </>
    )}
  </Modal.Body>
</Modal>

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
      `}</style>
      </>
);
};

export default MartHomeAppliances;