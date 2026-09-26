import React, { useState, useEffect} from "react";
import "../App.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Footer from '../CommonPages/Footer.js';
import "bootstrap/dist/css/bootstrap.min.css";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowBack} from '@mui/icons-material';
import ForwardIcon from '@mui/icons-material/Forward';
import { Button, Form, Row, Col, Modal } from 'react-bootstrap';
import axios from "axios";
// import { appConfig } from "./config";

const AdminGroceryOrderPage = () => {
  const navigate = useNavigate(); 
  const {groceryItemId} = useParams();
  const [martId, setMartId] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  // const [showMenu, setShowMenu] = useState(false);
  const [imageUrls, setImageUrls] = useState({});
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [pincode, setPincode] = useState('');
  const [address, setAddress] = useState(''); 
  const [id, setId] = useState("");  
const [loading, setLoading] = useState(true);
const [paymentMode, setPaymentMode] = useState('');
const [transactionDetails, setTransactionDetails] = useState('');
const [customerId, setCustomerId] = useState('');
const [mobileNumber, setMobileNumber] = useState('');
const [customerName, setCustomerName] = useState('');
const [date, setDate] = useState('');
const [items, setItems] = useState([]);
const [deliveryPartners, setDeliveryPartners] = useState([]);
const [selectedPartner, setSelectedPartner] = useState(""); 
const [longitude, setLongitude] = useState(""); 
const [latitude, setLatitude] = useState(""); 
const [grandTotal, setGrandTotal] = useState(""); 
const [paidAmount, setPaidAmount] = useState(""); 
const [transactionNumber, setTransactionNumber] = useState(""); 
const [transactionStatus, setTransactionStatus] = useState(""); 
 const [totalItemsSelected, setTotalItemsSelected] = useState(""); 
const [cartData, setCartData] = useState(null);
const [code, setCode] = useState("");
const [units, setUnits] = useState("");
 const [groceryData, setgroceryData] = useState();
  const [groceryId, setgroceryId] = useState();
const [status, setStatus] = useState();
 const [showZoomModal, setShowZoomModal] = useState(false);
 const [remainingAmount,setRemainingAmount] =useState('');
  const [zoomImage, setZoomImage] = useState("");
  const [zoomProduct, setZoomProduct] = useState(null);  
  const [availedAmount, setAvailedAmount] = useState('');
    const [selectedDate, setSelectedDate] = useState("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");

  const timeSlots = [
    "7:00 AM - 9:00 AM",
    "9:00 AM - 11:00 AM",
    "11:00 AM - 1:00 PM",
    "1:00 PM - 2:00 PM",
    "2:00 PM - 4:00 PM",
    "4:00 PM - 6:00 PM",
    "6:00 PM - 8:00 PM",
    "8:00 PM - 10:00 PM",
  ];

   const deliveryDateTime =
    selectedDate && selectedTimeSlot
      ? `${selectedDate} ${selectedTimeSlot}`
      : "";

  console.log(deliveryDateTime);

  useEffect(() => {
  console.log(status,groceryData,groceryId, id, customerId, loading, longitude, latitude, grandTotal, paidAmount, transactionNumber, transactionStatus, totalItemsSelected, cartData, code, units);
}, [status,groceryData, groceryId,id,customerId, loading, longitude, latitude, grandTotal, paidAmount, transactionNumber, transactionStatus, totalItemsSelected, cartData, code, units]);

useEffect(() => {
    const fetchCart = async () => {
      if (!groceryItemId) return;

      const ctrl = new AbortController();
      try {
        const res1 = await fetch(
          `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/Mart/GetProductDetails?id=${groceryItemId}`,
          { signal: ctrl.signal }
        );
        if (!res1.ok) throw new Error("Failed to fetch product details");
        const data = await res1.json();
        setCartData(data);
        setMartId(data.martId);
        setGrandTotal(data.grandTotal);
        setRemainingAmount(data.remainingAmount);
        setAvailedAmount(data.availedAmount);
        setTotalItemsSelected(data.totalItemsSelected);
        setCustomerName(data.customerName);
        setStatus(data.status);
        const products = (data?.categories ?? []).flatMap(
          (c) => c?.products ?? []
        );
        const selected = products.filter(
          (p) =>
            p?.isSelected || p?.selected || (p?.qty ?? p?.quantity ?? 0) > 0
        );
        const baseList = selected.length ? selected : products;
        const productNames = Array.from(
          new Set(baseList.map((p) => p?.productName?.trim()).filter(Boolean))
        );

        if (productNames.length === 0) {
          console.warn("⚠️ No product names found in the first API response");
          setgroceryData([]);
          setgroceryId(null);
          return;
        }

        const requests = productNames.map(async (name) => {
          const url = `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/UploadGrocery/GetGroceryItemsByProductName?productName=${encodeURIComponent(
            name
          )}`;
          const res = await fetch(url, { signal: ctrl.signal });
          if (!res.ok)
            throw new Error(
              `UploadGrocery failed for "${name}" (HTTP ${res.status})`
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
        console.error("Error fetching cart data:", err);
      }
      return () => ctrl.abort();
    };
    fetchCart();
  }, [groceryItemId]);


useEffect(() => {
  const fetchDeliveryPartners = async () => {
    try {
      const response = await axios.get(`https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/DeliveryPartner/GetAllDeliveryPartners`);
      const partners = response.data.filter(partner => partner.status === "open");
      setDeliveryPartners(partners);
    } catch (error) {
      console.error("Error fetching delivery partners:", error);
    }
  };
  fetchDeliveryPartners();
}, []);

useEffect(() => {
  const fetchGroceryData = async () => {
    try {
      const response = await fetch(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/Mart/GetProductDetails?id=${groceryItemId}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch grocery product data");
      }
      const data = await response.json();
      console.log("Fetched Grocery Data:", data);
      setCartData(data);
      setCustomerId(data.userId);
      setId(data.id);
      setMartId(data.martId); 
      setCustomerName(data.customerName);
      setMobileNumber(data.customerPhoneNumber);
      setAddress(data.address);
      setState(data.state);
      setDistrict(data.district);
      setPincode(data.zipCode);
      setPaymentMode(data.paymentMode);
      setTransactionDetails(data.utrTransactionNumber);
      setLongitude(data.longitude);
      setLatitude(data.latitude);
      setGrandTotal(data.grandTotal);
      setRemainingAmount(data.remainingAmount);
      setPaymentMode(data.paymentMode);
      setTotalItemsSelected(data.totalItemsSelected);
      setTransactionStatus(data.transactionStatus);
      setPaidAmount(data.paidAmount);
      setTransactionNumber(data.transactionNumber);
        setDate(data.date);
      let allProducts = [];
      // eslint-disable-next-line 
      let totalAmountFromApi = 0;    

      if (data.categories && Array.isArray(data.categories)) {
        data.categories.forEach((cat) => {
          totalAmountFromApi += Number(cat.totalAmount) || 0;
          cat.products.forEach((p, idx) => {
            allProducts.push({
               id: p.productImage, 
              serial: allProducts.length + 1,
              name: p.productName,
              category: cat.categoryName,
              mrp: p.mrp,
              discount: Math.round(p.discount),
              afterDiscountPrice: p.afterDiscountPrice,
              quantity: p.noOfQuantity,
              total: Math.round(p.afterDiscountPrice * p.noOfQuantity),
              code: p.code,
              units: p.units,
              image: p.productImage,
            });
          });
        });
        setItems(allProducts);
        if (allProducts.length > 0) {
        setCode(allProducts[0].code || "");
        setUnits(allProducts[0].units || "");
        }
      }
    } catch (error) {
      console.error("Error fetching grocery product data:", error);
    } finally {
      setLoading(false);
    }
  };   
  if (groceryItemId) {
    fetchGroceryData();
  }
}, [groceryItemId, grandTotal, items]);    
   
// const handleAssignedToChange = (e) => {
//   const selectedAssignedTo = e.target.value;
//   setAssignedTo(selectedAssignedTo);
// };

// ForwardIcon 
  const handleUpdatePaymentMethod = async () => {
    try {   
      const partner = deliveryPartners.find(p => p.deliveryPartnerId === selectedPartner);
  const payload = {
    ...cartData,
    customerName: customerName,
    address: address, 
    state: state,
    district: district,
    zipCode: pincode,
    customerPhoneNumber: mobileNumber,
    id: groceryItemId,
    userId: customerId, 
    martId: martId,
    date: date,
    grandTotal: grandTotal,
    totalItemsSelected: totalItemsSelected,
    status: "In Progress", 
    paymentMode: paymentMode,
    utrTransactionNumber: transactionDetails,
    transactionNumber: transactionNumber,
    transactionStatus: transactionStatus,
    paidAmount: paidAmount,
    AssignedTo: partner? partner.deliveryPartnerName: "",
    DeliveryPartnerUserId: partner? partner.userId: "",
    deliveryAssignedTime: new Date().toISOString(),
    deliverySubmitTime: "",
    latitude: latitude,
    longitude: longitude,
    code: code,
    units: units,
    slotTime:`${selectedDate} ${selectedTimeSlot}`,
  };

    let response = await fetch(`https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/Mart/UpdateProductDetails/${groceryItemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error('Failed to Update Delivery Partner.');
    }
    alert(`Ticket has been assigned to ${partner ? partner.deliveryPartnerName : ""}`);
    navigate(`/adminGroceryZoneDashboard`);
  } catch (error) {
    console.error('Error:', error);
    window.alert('Failed to Update Delivery Partner. Please try again later.');
  }
};

const handleCancelOrder = async () => {
  try {
    const detailsResponse = await fetch(
      `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/Mart/GetProductDetails?id=${groceryItemId}`
    );
    if (!detailsResponse.ok) throw new Error("Failed to fetch latest order details");
    const latestData = await detailsResponse.json();

    const cancelPayload = {
      ...latestData,
      id: groceryItemId,
      status: "Cancel",
      AssignedTo: "",
      DeliveryPartnerUserId: "",
      deliveryAssignedTime: "",
      deliverySubmitTime: "",
      SlotTime: "",
      VendorId: "",
    };

    const cancelResponse = await fetch(
      `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/Mart/UpdateProductDetails/${groceryItemId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cancelPayload),
      }
    );
    if (!cancelResponse.ok) throw new Error("Failed to cancel order");

    let allProducts = [];
    if (latestData.categories && Array.isArray(latestData.categories)) {
      latestData.categories.forEach((cat) => {
        cat.products.forEach((p) => {
          allProducts.push({
            productName: p.productName,   
            quantity: p.noOfQuantity,     
          });
        });
      });
    }

    const stockUpdateResults = await Promise.allSettled(
      allProducts.map(async ({ productName, quantity }) => {
        const getRes = await fetch(
          `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/UploadGrocery/GetGroceryItemsByProductName?productName=${encodeURIComponent(productName)}`
        );
        if (!getRes.ok) throw new Error(`GET failed for "${productName}"`);
        const groceryItems = await getRes.json();

        const matched = Array.isArray(groceryItems)
          ? groceryItems.find(
              (g) =>
                g.name?.trim().toLowerCase() === productName?.trim().toLowerCase()
            )
          : null;

        if (!matched) {
          console.warn(`No matching grocery item found for "${productName}"`);
          return;
        }

        const currentStock = parseInt(matched.stockLeft) || 0;
        const updatedStock = currentStock + parseInt(quantity);

        const putPayload = {
          id: matched.id,
          Date: matched.date,
          GroceryItemId: matched.groceryItemId,
          Name: matched.name,
          Category: matched.category,
          Images: matched.images,
          MRP: matched.mrp,
          Discount: matched.discount,
          AfterDiscount: matched.afterDiscount,
          StockLeft: updatedStock.toString(),   
          DeliveryIn: matched.deliveryIn,
          Status: matched.status,
          code: matched.code,
          units: matched.units,
          RequestedBy: matched.requestedBy || "Admin",
          manufactureDate: matched.manufactureDate || "",
          expireDate: matched.expireDate || "",
          Limit: matched.limit,
        };

        const putRes = await fetch(
          `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/UploadGrocery/UpdateGroceryItems?id=${matched.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(putPayload),
          }
        );
        if (!putRes.ok) throw new Error(`PUT failed for "${productName}"`);

        console.log(`✅ Stock restored for "${productName}": ${currentStock} + ${quantity} = ${updatedStock}`);
      })
    );

    stockUpdateResults.forEach((result, idx) => {
      if (result.status === "rejected") {
        console.error(`Stock update failed for item ${idx + 1}:`, result.reason);
      }
    });

    alert("Order has been cancelled and stock has been restored successfully");
    navigate(`/adminGroceryZoneDashboard`);

  } catch (error) {
    console.error("Cancel Error:", error);
    alert("Failed to cancel order. Try again.");
  }
};
  // Detect screen size for responsiveness
useEffect(() => {
  const handleResize = () => setIsMobile(window.innerWidth <= 768);
  handleResize(); 
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);

   const handleSubmit = (e) => {
     e.preventDefault();
   };

const addHeader = (doc, martId) => {
  doc.setTextColor(0, 0, 0); 
  doc.setFontSize(12);
  doc.setFont("Roboto", "bold");
  doc.text("Handyman", 14, 12);
  doc.text("Lakshmi Mart", 195, 12, { align: "right" });
  doc.setLineWidth(0.5);
  doc.line(14, 15, 195, 15);
  doc.setFontSize(11);
  doc.setFont("Roboto", "bold");
  doc.text(`Order Number: ${martId}`, 105, 22, { align: "center" });
};

const addFooter = (doc) => {
  const pageHeight = doc.internal.pageSize.height;
  doc.setLineWidth(0.5);
   doc.line(
    20,                
    pageHeight - 15,    
    190,                
    pageHeight - 15    
  );
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont("Roboto", "bold");
  doc.text(
    "For Support : Call / WhatsApp 6281198953 | Mon–Sun : 7:00 AM – 9:00 PM",
    105,    
    pageHeight - 10,
    { align: "center" }            
  );
};

const handleDownloadPDF = () => {
  const doc = new jsPDF("p", "mm", "a4");
  const PAGE_HEIGHT = doc.internal.pageSize.height;
  const FOOTER_SPACE = 25;
  const TOP_MARGIN = 30;
  addHeader(doc, martId);
  addFooter(doc);
  doc.setFont("Roboto", "normal");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Customer Name: ${customerName || ""}`, 14, 28);  const addressText = `Customer Address: ${[
    address,
    district,
    state,
    pincode,
    mobileNumber,
  ].filter(Boolean).join(", ")}`;

  doc.text(addressText || "", 14, 32, { maxWidth: 180 });
  doc.text(`Date: ${date ? date.split("T")[0] : ""}`, 14, 42);  autoTable(doc, {
    startY: 48,
    head: [[
      "S.No",
      "Photo",
      "Item Name",
      "Category",
      "MRP",
      "Dis (%)",
      "Price",
      "Qty",
      "Total",
    ]],
    body: items.map((item, index) => [
      index + 1,
      "",
      item.name,
      item.category,
      `Rs. ${Math.round(item.mrp)}`,
      `${Math.round(item.discount)}%`,
      `Rs. ${Math.round(item.afterDiscountPrice)}`,
      item.quantity,
      `Rs. ${Math.round(item.total)}`,
    ]),
    styles: {
      fontSize: 9,
      cellPadding: 3,
      textColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: [0, 128, 0],
      textColor: [255, 255, 255],
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 25 },
      2: { cellWidth: 40 },
      3: { cellWidth: 25 },
      4: { cellWidth: 20, halign: "right" },
      5: { cellWidth: 15, halign: "right" },
      6: { cellWidth: 23, halign: "right" },
      7: { cellWidth: 12, halign: "center" },
      8: { cellWidth: 23, halign: "right" },
    },
    didDrawCell(data) {
      if (data.column.index === 1 && data.cell.section === "body") {
        const item = items[data.row.index];
        const imgData = imageUrls[item?.id];
        if (!imgData) return;

        const size = 14;
        const x = data.cell.x + (data.cell.width - size) / 2;
        const y = data.cell.y + (data.cell.height - size) / 2;

        doc.addImage(imgData, "JPEG", x, y, size, size);
      }
    },
    didDrawPage() {
      addHeader(doc, martId);
      addFooter(doc);
    },
  });

  doc.setFont("Roboto", "normal");
  doc.setTextColor(0, 0, 0);

let currentY = doc.lastAutoTable.finalY + 10;

  let requiredHeight = 12;
  if (currentY + requiredHeight > PAGE_HEIGHT - FOOTER_SPACE) {
    doc.addPage();
    addHeader(doc, martId);
    addFooter(doc);
    currentY = TOP_MARGIN + 10;
  }
  doc.setFont("Roboto", "bold");
  doc.setFontSize(11);
  doc.setTextColor(200, 0, 0);
  doc.text(
    `Cashback Earned : Rs. ${availedAmount}`,
    195,
    currentY,
    { align: "right" }
  );

  currentY += 6; 
  doc.text(
    `Grand Total : Rs. ${grandTotal}`,
    195,
    currentY,
    { align: "right" }
  );
  currentY += 6; 
  doc.text(
    `Remaining Wallet Balance : Rs. ${remainingAmount}`,
    195,
    currentY,
    { align: "right" }
  );

  currentY += 6;

  doc.setFontSize(10);
doc.setTextColor(200, 0, 0);
     
  doc.text(
    "For every Rs.100 order value, Rs.10 will be used from wallet on next order.",
    105, 
    currentY,
    { align: "center" }
  );
    doc.save(`Grocery_Order_${martId}.pdf`);
};
     
// const fmtDate = (iso) => {
//   if (!iso) return "";
//   const d = new Date(iso);
//   return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
// };
 
// const fmtDateTime = (d) => {
//   const day = String(d.getDate()).padStart(2, "0");
//   const mon = String(d.getMonth() + 1).padStart(2, "0");
//   const yr = d.getFullYear();
//   let h = d.getHours();
//   const min = String(d.getMinutes()).padStart(2, "0");
//   const ampm = h >= 12 ? "PM" : "AM";
//   h = h % 12 || 12;
//   return `${day}/${mon}/${yr}  ${h}:${min} ${ampm}`;
// };
 
// const GREEN     = [26, 110, 42];   
// const WHITE     = [255, 255, 255];
// const BLACK     = [0, 0, 0];
// const DARK_GRAY = [60, 60, 60];
// const MID_GRAY  = [120, 120, 120];
// const LIGHT_BG  = [245, 250, 246];
// const RED_TEXT  = [180, 0, 0];
// const GREEN_TEXT= [26, 110, 42];
 
 
// const drawPageHeader = (doc, martId) => {
//   const W = doc.internal.pageSize.width;
 
//   doc.setFillColor(...GREEN);
//   doc.rect(0, 0, W, 22, "F");
 
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(14);
//   doc.setTextColor(...WHITE);
//   doc.text("Lakshmi Mart", 14, 10);
 
//   doc.setFont("helvetica", "normal");
//   doc.setFontSize(8);
//   doc.text("Handyman Grocery Services", 14, 16);
 
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(11);
//   doc.text("TAX INVOICE", W - 14, 10, { align: "right" });
 
//   doc.setFont("helvetica", "normal");
//   doc.setFontSize(8);
//   doc.text(`Order: ${martId}`, W - 14, 16, { align: "right" });
// };
 
// const drawPageFooter = (doc) => {
//   const W = doc.internal.pageSize.width;
//   const H = doc.internal.pageSize.height;
 
//   doc.setDrawColor(...MID_GRAY);
//   doc.setLineWidth(0.3);
//   doc.line(14, H - 14, W - 14, H - 14);
 
//   doc.setFont("helvetica", "normal");
//   doc.setFontSize(8);
//   doc.setTextColor(...MID_GRAY);
//   doc.text(
//     "Support: Call / WhatsApp 6281198953  |  Mon–Sun 7:00 AM – 9:00 PM",
//     W / 2,
//     H - 8,
//     { align: "center" }
//   );
// };
 
// const handleDownloadPDF = () => {
//   const doc = new jsPDF("p", "mm", "a4");
//   const PAGE_W  = doc.internal.pageSize.width;  
//   const PAGE_H  = doc.internal.pageSize.height;  
//   const FOOTER_SPACE = 16;
//   const HEADER_HEIGHT = 16;
 
//   const invNumber   = (martId || "").slice(-4);
//   const invDateTime = fmtDateTime(new Date());
//   const poDate      = fmtDate(date);
//   const fullAddress = [address, district, state, pincode, mobileNumber]
//     .filter(Boolean)
//     .join(", ");
//   const productsTotal = items.reduce((s, it) => s + Number(it.total), 0);
//   const grandTotalNum = parseFloat(grandTotal) || 0;
//   const availedNum    = parseFloat(availedAmount) || 0;
//   const remainingNum  = parseFloat(remainingAmount) || 0;
//   const paidNum       = parseFloat(paidAmount) || 0;
 
//   drawPageHeader(doc, martId);
//   drawPageFooter(doc);
 
//   let curY = HEADER_HEIGHT + 6;
 
//   doc.setFillColor(...LIGHT_BG);
//   doc.rect(0, curY, PAGE_W, 14, "F");
 
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(8);
//   doc.setTextColor(...GREEN_TEXT);
//   const metaFields = [
//     [`Invoice No.`, `No${invNumber}`],
//     [`Invoice Date`, invDateTime],
//     [`PO No.`,       martId],
//     [`PO Date`,      poDate],
//     [`State of Supply`, "Andhra Pradesh"],
//   ];
//   const colW = PAGE_W / metaFields.length;
//   metaFields.forEach(([label, val], i) => {
//     const x = 14 + i * colW;
//     doc.setFont("helvetica", "normal");
//     doc.setFontSize(7);
//     doc.setTextColor(...MID_GRAY);
//     doc.text(label.toUpperCase(), x, curY + 4);
//     doc.setFont("helvetica", "bold");
//     doc.setFontSize(8);
//     doc.setTextColor(...DARK_GRAY);
//     doc.text(String(val), x, curY + 10);
//   });
//   curY += 18;
 
//   const halfW = (PAGE_W - 28) / 2;
 
//   doc.setDrawColor(...MID_GRAY);
//   doc.setLineWidth(0.3);
//   doc.roundedRect(14, curY, halfW, 18, 2, 2, "S");
//   doc.roundedRect(14 + halfW + 4, curY, halfW, 18, 2, 2, "S");
 
//   doc.setFillColor(...GREEN);
//   doc.roundedRect(14, curY, halfW, 6, 2, 2, "F");
//   doc.roundedRect(14 + halfW + 4, curY, halfW, 6, 2, 2, "F");
 
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(7.5);
//   doc.setTextColor(...WHITE);
//   doc.text("BILLING ADDRESS", 17, curY + 4.2);
//   doc.text("SHIPPING ADDRESS", 17 + halfW + 4, curY + 4.2);
 
//   const addrLines = doc.splitTextToSize(fullAddress, halfW - 6);
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(8.5);
//   doc.setTextColor(...DARK_GRAY);
//   doc.text((customerName || "").trim(), 17, curY + 11);
//   doc.text((customerName || "").trim(), 17 + halfW + 4, curY + 11);
 
//   doc.setFont("helvetica", "normal");
//   doc.setFontSize(7.5);
//   doc.setTextColor(...MID_GRAY);
//   doc.text(addrLines, 17, curY + 16);
//   doc.text(addrLines, 17 + halfW + 4, curY + 16);
 
//   curY += 22;
 
//   autoTable(doc, {
//   startY: curY + 2,
//   margin: { left: 8, right: 8 },

//   head: [[
//     "No",
//     "Item Name",
//     "Category",
//     "MRP",
//     "Qty",
//     "Disc %",
//     "Amount"
//   ]],

//   body: items.map((item, idx) => [
//     idx + 1,
//     (item.name || "").substring(0, 35),
//     (item.category || "").substring(0, 20),
//     Math.round(item.mrp),
//     item.quantity,
//     `${Math.round(item.discount)}%`,
//     item.total.toFixed(0),
//   ]),

//   styles: {
//   fontSize: 5.5,
//   cellPadding: 0.5,
//   minCellHeight: 4,
//   overflow: "hidden",
//   textColor: [60, 60, 60],
//   lineColor: [220, 220, 220],
//   lineWidth: 0.1,
// },

//   headStyles: {
//     fillColor: [26, 110, 42],
//     textColor: [255, 255, 255],
//     fontSize: 7,
//     fontStyle: "bold",
//     halign: "center",
//   },

//   alternateRowStyles: {
//     fillColor: [248, 250, 248],
//   },

//   columnStyles: {
//   0: { cellWidth: 8, halign: "center" },   
//   1: { cellWidth: 55 },                   
//   2: { cellWidth: 35 },                    
//   3: { cellWidth: 15, halign: "right" },   
//   4: { cellWidth: 10, halign: "center" },  
//   5: { cellWidth: 12, halign: "center" },  
//   6: { cellWidth: 20, halign: "right" },   
// },

//   didDrawPage() {
//     drawPageHeader(doc, martId);
//     drawPageFooter(doc);
//   }
// });
 
//   curY = doc.lastAutoTable.finalY + 4;
 
//   const TOTAL_X    = PAGE_W - 14 - 110; 
//   const TOTAL_W    = 100;
//   const LINE_H     = 7;
 
//   const totalsRows = [
//     { label: "Products total",          value: `Rs ${productsTotal.toFixed(2)}`,    bold: false, color: DARK_GRAY },
//   ];
 
//   if (grandTotalNum !== productsTotal) {
//     const diff = productsTotal - grandTotalNum;
//     if (diff > 0) {
//       totalsRows.push({ label: "Discount", value: ` Rs ${diff.toFixed(2)}`, bold: false, color: RED_TEXT });
//     }
//   }
//   if (availedNum > 0) {
//     totalsRows.push({ label: "Cashback applied",          value: ` Rs ${availedNum.toFixed(2)}`,    bold: false, color: GREEN_TEXT });
//   }
//   totalsRows.push(   { label: "Grand Total",             value: `Rs ${grandTotalNum.toFixed(2)}`,   bold: true,  color: BLACK,      divider: true });
//   totalsRows.push(   { label: "Remaining wallet balance",value: `Rs ${remainingNum.toFixed(2)}`,    bold: false, color: MID_GRAY });
 
//   const totalsBoxH = totalsRows.length * LINE_H + 12;
 
//   const PAYMENT_BOX_H = 25;
//   const NOTE_H = 4;
//   const NEEDED = totalsBoxH + PAYMENT_BOX_H + NOTE_H + 4;
 
//   if (curY + NEEDED > PAGE_H - FOOTER_SPACE) {
//     doc.addPage();
//     drawPageHeader(doc, martId);
//     drawPageFooter(doc);
//     curY = HEADER_HEIGHT + 10;
//   }
 
//   doc.setDrawColor(...MID_GRAY);
//   doc.setLineWidth(0.3);
//   doc.roundedRect(TOTAL_X, curY, TOTAL_W, totalsBoxH, 2, 2, "S");
 
//   doc.setFillColor(...GREEN);
//   doc.roundedRect(TOTAL_X, curY, TOTAL_W, 7, 2, 2, "F");
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(7.5);
//   doc.setTextColor(...WHITE);
//   doc.text("ORDER SUMMARY", TOTAL_X + 4, curY + 4.8);
 
//   let rowY = curY + 12;
//   totalsRows.forEach((row) => {
//     if (row.divider) {
//       doc.setDrawColor(...GREEN);
//       doc.setLineWidth(0.4);
//       doc.line(TOTAL_X + 3, rowY - 2, TOTAL_X + TOTAL_W - 3, rowY - 2);
//       rowY += 1;
//     }
//     doc.setFont("helvetica", row.bold ? "bold" : "normal");
//     doc.setFontSize(row.bold ? 9 : 8);
//     doc.setTextColor(...row.color);
//     doc.text(row.label, TOTAL_X + 4, rowY);
//     doc.text(row.value, TOTAL_X + TOTAL_W - 4, rowY, { align: "right" });
//     rowY += LINE_H;
//   });
 
//   curY += totalsBoxH + 8;
 
//   doc.setDrawColor(...MID_GRAY);
//   doc.setLineWidth(0.3);
//   doc.roundedRect(TOTAL_X, curY, TOTAL_W, PAYMENT_BOX_H, 2, 2, "S");
 
//   doc.setFillColor(...LIGHT_BG);
//   doc.roundedRect(TOTAL_X, curY, TOTAL_W, 7, 2, 2, "F");
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(7.5);
//   doc.setTextColor(...GREEN_TEXT);
//   doc.text("PAYMENT DETAILS", TOTAL_X + 4, curY + 4.8);
 
//   const payRows = [
//     { label: "Amount paid",   value: `Rs ${paidNum.toFixed(2)}`,   color: GREEN_TEXT },
//     { label: "Payment mode",  value: String(paymentMode || "—").toUpperCase(), color: DARK_GRAY },
//   ];
 
//   let pRowY = curY + 13;
//   payRows.forEach((row) => {
//     doc.setFont("helvetica", "bold");
//     doc.setFontSize(8.5);
//     doc.setTextColor(...row.color);
//     doc.text(row.label, TOTAL_X + 4, pRowY);
//     doc.text(row.value, TOTAL_X + TOTAL_W - 4, pRowY, { align: "right" });
//     pRowY += 8;
//   });
 
//   curY += PAYMENT_BOX_H + 6;
 
//   doc.setFillColor(253, 247, 238);
//   doc.roundedRect(14, curY, PAGE_W - 28, NOTE_H, 2, 2, "F");
//   doc.setFont("helvetica", "italic");
//   doc.setFontSize(7.5);
//   doc.setTextColor("red");
//   doc.text(
//     "Note: For every Rs 100 order value, Rs 10 will be used from wallet on next order.",
//     PAGE_W / 2,
//     curY + 5.5,
//     { align: "center" }
//   );
 
//   doc.save(`Invoice_${martId}.pdf`);
// };

useEffect(() => {
  if (!items.length) return;   
  const currentItems = items;     
  const controller = new AbortController();
  async function loadImages() {
    const map = {};
    await Promise.all(
      currentItems.map(async (item) => {    
        if (!item.image) return;    
        try {
          const res = await fetch(
            `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/FileUpload/download?generatedfilename=${encodeURIComponent(
              item.image
            )}`,
            { signal: controller.signal }
          );
          const json = await res.json();
          if (!json?.imageData) return;
          map[item.id] = `data:image/jpeg;base64,${json.imageData}`;
        } catch (err) {
          if (err?.name === "AbortError") return;
          console.error("Image fetch failed:", err);
        }
      })
    );

    if (!controller.signal.aborted) {
      setImageUrls(map);
    }
  }
  loadImages();
  return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, [items.length]); 

const handleImageClick = (imageSrc, product) => {
    setZoomImage(imageSrc);
    setZoomProduct(product);
    setShowZoomModal(true);
  };
  
   const itemsTotal = items.reduce((sum, item) => sum + Number(item.total), 0);

  const deliveryCharge = itemsTotal >= 150 ? 0 : 15;

  const handlingCharge = itemsTotal >= 150 ? 5 : 5;

  return (
  <>
<div className="d-flex flex-row justify-content-start align-items-start" style={{marginTop: "130px"}}>
      {/* Sidebar menu for Larger Screens */}
      {/* {!isMobile && (
        <div className=" ml-0 p-0 adm_mnu h-90">
          <AdminSidebar />
        </div>
      )} */}   

      {/* {isMobile && (
        <div className="floating-menu">
          <Button
            variant="primary"
            className="rounded-circle shadow"
            onClick={() => setShowMenu(!showMenu)}
          >
            <MoreVertIcon />
          </Button>
          {showMenu && (
            <div className="sidebar-container">
              <AdminSidebar />
            </div>
          )}
        </div>
      )} */}

      {/* Main Content */}
      <div className={`container ${isMobile ? 'w-100' : 'w-75'}`}>
      <h3 className="text-center">Grocery Items Orders</h3>
        <div className="rounded-3bx_sdw w-100">
          <form className="form" onSubmit={handleSubmit}>
                <div className="text-center">
                <strong className="fs-5">Order Number:<span>{martId}</span></strong>
                </div>
                <div className="row">
                <div className="col-md-6 form-group">
              <label>
                Customer Name <span className="req_star">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                value={customerName}
                placeholder="Customer Name"
                readOnly
              />
            </div>
            
            <div className="col-md-6 form-group">
          <label>
            Customer Address <span className="req_star">*</span>
          </label>
          <textarea
            className="form-control"
            style={{
              overflow: "hidden",
              resize: "none",
              minHeight: "80px",
            }}
            value={[address, district, state, pincode, mobileNumber]
              .filter(Boolean)
              .join(", ")}
            onInput={(e) => {
              e.target.style.height = "auto";
              e.target.style.height = e.target.scrollHeight + "px";
            }}
            onFocus={(e) => {
              e.target.style.height = "auto";
              e.target.style.height = e.target.scrollHeight + "px";
            }}
            placeholder="Customer Address"
            readOnly
          ></textarea>
        </div>
          <div className="col-md-6 form-group">Date: {date ? date.split("T")[0] : ""}</div> 
               </div>     
      <h4 className="m-0">Grocery Items</h4>
<table className="table table-bordered table-striped">
  <thead>
    <tr>
      <th style={{ background: "green", color: "white" }}>Sl. No</th>
      <th style={{ background: "green", color: "white" }}>Item Name</th>
      <th style={{ background: "green", color: "white" }}>Photo</th>
      <th style={{ background: "green", color: "white" }}>Code</th>
      <th style={{ background: "green", color: "white" }}>Category</th>
      <th style={{ background: "green", color: "white" }}>MRP</th>
      <th style={{ background: "green", color: "white" }}>Discount (%)</th>
      <th style={{ background: "green", color: "white" }}>
        After Discount <br /> Price
      </th>
      <th style={{ background: "green", color: "white" }}>
        Required <br /> Quantity
      </th>
      <th style={{ background: "green", color: "white" }}>Total</th>
    </tr>
  </thead>
  <tbody>
    {items.map((item, idx) => (
      <tr key={idx}>
        <td>{item.serial}</td>
        <td>{item.name}</td>
        <td>
          {imageUrls[item.id] ? (
            <img
              src={imageUrls[item.id]}
              alt={item.name}
              onClick={() => handleImageClick(imageUrls[item.id], item)}
              style={{
                width: "50px",
                height: "50px",
                objectFit: "contain",
                borderRadius: "6px",
                border: "1px solid red",
              }}
            />
          ) : (
            <span className="text-muted small">Loading</span>
          )}
        </td>
        <td>{item.code}</td>
        <td>{item.category}</td>
        <td>Rs {item.mrp}</td>
        <td>{item.discount}%</td>
        <td>Rs {item.afterDiscountPrice.toFixed(0)}</td>
        <td>{item.quantity}</td>
        <td>Rs {item.total.toFixed(0)}</td>
      </tr>
    ))}
  </tbody>
  <tfoot>
     <tr>
  <td colSpan="5" className="text-end fw-bold text-danger">
    Delivery Charge: {deliveryCharge === 0 ? "FREE" : `Rs ${deliveryCharge} /-`}
  </td>
  
  <td colSpan="5" className="text-end fw-bold text-danger">
    Handling Charge: {handlingCharge === 0 ? "FREE" : `Rs ${handlingCharge} /-`}
  </td>      
</tr>
{availedAmount > 0 && (
<tr>
  <td colSpan="9" className="text-end fw-bold text-success">
    Cashback Applied:
  </td>
  <td className="fw-bold text-success">
    Rs {availedAmount}
  </td>
</tr>
)}
    <tr>
      <td colSpan="9" className="text-end fw-bold">
        Grand Total:
      </td>
      <td className="fw-bold">     
        Rs {grandTotal}
      </td>
    </tr> 
 <tr>
      <td colSpan="9" className=" text-danger text-end fw-bold">
        Your's current wallet balance :
      </td>
      <td className="fw-bold">     
        Rs {remainingAmount}
      </td>  
      </tr>
  </tfoot>  
</table>
<div className="text-end">
  <button
          style={{
            background: "red",
            color: "white",
            borderRadius: "20px",
            padding: "8px",
          }}
          onClick={handleDownloadPDF}
        >
          Download PDF
        </button>
</div>

<Row>
                {/* Delivery Date */}
                <Col md={6}>
                  <Form.Group>
                    <label>Delivery Date</label>
                    <Form.Control
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      required
                    />
                  </Form.Group>
                </Col>

                {/* Time Slot */}
                <Col md={6}>
                  <Form.Group>
                    <label>Time Slot</label>
                    <Form.Control
                      as="select"
                      value={selectedTimeSlot}
                      onChange={(e) => setSelectedTimeSlot(e.target.value)}
                      required
                    >
                      <option value="">Select Time Slot</option>

                      {timeSlots.map((slot, index) => (
                        <option key={index} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </Form.Control>
                  </Form.Group>
                </Col>
              </Row>


        {/* <div className='payment'>
        <label className='fw-bold fs-5 w-100 p-2' style={{ background: "green", color: "white", borderRadius: "15px", width: "25px" }}>Payment Mode</label>
        <label className='fs-5 '>
            <input 
            type="radio" 
            className="form-check-input border-secondary m-2 border-dark"
            checked={paymentMode === 'online'}
            readOnly
             />
            Pay Through Online
          </label>
          <label className='fs-5'>
            <input 
            type="radio" 
            className="form-check-input border-secondary border-dark m-2"
            checked={paymentMode === 'cash'}
            readOnly
            />
            Cash On Delivery
          </label>
    </div>  */}

    {/* <div className="form-group mt-0">
              <label>Payment Transaction Details </label>
              <input
                type="text"
                className="form-control "
                value={transactionDetails}
                onChange={(e) => setTransactionDetails(e.target.value)}
                placeholder="Payment Transaction Details"
                readOnly
              />
            </div> */}
            <Row>
                  {/* Assigned To
                  <Col md={12}>
                    <Form.Group>
                      <label>Assigned To</label>
                      <Form.Control as="select" value={assignedTo} onChange={handleAssignedToChange} required>
                        <option value="">Select Assigned</option>
                        <option value="Delivery Partner">Delivery Partner</option>
                      </Form.Control>
                      {error.assignedTo && <p className="text-danger">{error.assignedTo}</p>}
                    </Form.Group>
                  </Col> */}

                   {/* New Delivery Partner Names Dropdown */}
                  <Col md={12}>
                    <Form.Group>
                      <label>Delivery Partner Names</label>
                      <Form.Control
                        as="select"
                        value={selectedPartner}
                        onChange={(e) => setSelectedPartner(e.target.value)}
                        required
                      >
                        <option value="">Select Delivery Partner</option>
                        {deliveryPartners.map((partner) => (
                          <option key={partner.id} value={partner.deliveryPartnerId}>
                            {partner.deliveryPartnerName}
                          </option>
                        ))}
                      </Form.Control>
                    </Form.Group>
                  </Col>
                </Row> 
            <div className="mt-2 d-flex justify-content-between">
            <Button type="submit" className=" text-white mx-2" style={{background: 'green'}} onClick={() => navigate(`/adminGroceryZoneDashboard`)} title="Back">
                <ArrowBack />
                </Button>
                <Button
                  type="submit"
                  className="text-white mx-2"
                  style={{ background: 'green' }}
                  title="Forward"
                  onClick={handleUpdatePaymentMethod}
                 disabled={!!paidAmount || !selectedPartner}
                >
                  <ForwardIcon />
                </Button>
                <Button
                  className="text-white mx-2"
                  style={{ background: "red" }}
                  onClick={handleCancelOrder}
                  title="Cancel Order"
                  disabled={selectedPartner}
                >
                  Cancel
                </Button>
            </div>
          </form>
        </div>
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
                    src={zoomImage}
                    alt={zoomProduct?.name || "Zoomed Product"}
                    className="zoom-image"
                  />
                </div>
                <h6
                className="text-start fw-bold m-0"
                style={{ fontSize: "20px" }}
              >
                {zoomProduct?.name || ""}
              </h6>
              </Modal.Body>
            </Modal>
      {/* Styles for floating menu */}
<style jsx>{`
        .floating-menu {
          position: fixed;
          top: 80px; /* Increased from 20px to avoid overlapping with the logo */
          left: 20px; /* Adjusted for placement on the left side */
          z-index: 1000;
        }
        .menu-popup {
          position: absolute;
          top: 50px; /* Keeps the popup aligned below the floating menu */
          left: 0; /* Aligns the popup to the left */
          background: white;
          border: 1px solid #ddd;
          border-radius: 5px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          width: 200px;
        }
      `}</style>    
    </div>
    <Footer /> 
    </>
  );
};
 
export default AdminGroceryOrderPage;