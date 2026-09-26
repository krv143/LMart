import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";

const DeliveryPartnerPaymentDashboard = () => {
  const [martItems, setMartItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const downloadExcelData = () => {
    const excelData = summaryData.map((item, index) => ({
      "S.No": index + 1,
      "Delivery Partner": item.deliveryPartnerName,
      "Mart Id": item.martId,
      // "Grand Total": Number(item.grandTotal || 0).toFixed(2),

      "Grand Total":
        Number(item.grandTotal || 0) % 1 === 0
          ? Number(item.grandTotal || 0)
          : Number(item.grandTotal || 0).toFixed(2),

      Date: item.date,
      Cash: Number(item.cash || 0).toFixed(2),
      Online: Number(item.online || 0).toFixed(2),
      "Cash & Online": Number(item.cashAndOnline || 0).toFixed(2),
      "Total Orders": item.totalOrders,

      "Total Amount Received":
        filters.paymentType === "cash"
          ? item.cash.toFixed(2)
          : filters.paymentType === "online"
            ? item.online.toFixed(2)
            : filters.paymentType === "cash&online"
              ? item.cashAndOnline.toFixed(2)
              : (
                  Number(item.cash || 0) +
                  Number(item.online || 0) +
                  Number(item.cashAndOnline || 0)
                ).toFixed(2),
    }));

    // Gross Total
    const grossTotal = summaryData.reduce((sum, item) => {
      const amount =
        filters.paymentType === "cash"
          ? Number(item.cash || 0)
          : filters.paymentType === "online"
            ? Number(item.online || 0)
            : filters.paymentType === "cash&online"
              ? Number(item.cashAndOnline || 0)
              : Number(item.cash || 0) +
                Number(item.online || 0) +
                Number(item.cashAndOnline || 0);

      return sum + amount;
    }, 0);

    excelData.push({
      "S.No": "",
      "Delivery Partner": "Gross Total",
      "Mart Id": "",
      "Grand Total": "",
      Date: "",
      Cash: "",
      Online: "",
      "Cash & Online": "",
      "Total Orders": "",
      "Total Amount Received": grossTotal.toFixed(),
    });

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payment Report");

    // Download file
    XLSX.writeFile(workbook, `OrdersPaymentReport${filters.fromDate}.xlsx`);
  };

  const [filters, setFilters] = useState({
    paymentType: "All",
    deliveryPartner: "All",
    fromDate: "",
    toDate: "",
  });

  // API
  const MART_API =
    "https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/Mart/GetAllMartItems";

  // FETCH API
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const response = await fetch(MART_API);

      const data = await response.json();

      console.log("FULL API RESPONSE:", data);

      setMartItems(data?.data || data?.$values || data || []);
    } catch (error) {
      console.error("API ERROR:", error);
    } finally {
      setLoading(false);
    }
  };
  // DELIVERY PARTNERS ONLY DELIVERED

  const deliveryPartners = [
    "All",
    ...new Set(
      martItems
        .filter((item) => {
          const status = (item.status || item.Status || "")
            .toString()
            .trim()
            .toLowerCase();

          return status === "delivered";
        })
        .map((item) => {
          return item.assignedTo || item.AssignedTo;
        })
        .filter(Boolean),
    ),
  ].sort();

  // FILTER DATA
  const getFilteredItems = () => {
    if (!Array.isArray(martItems)) return [];

    return martItems.filter((item) => {
      // STATUS
      const status = (item.status || item.Status || "")
        .toString()
        .trim()
        .toLowerCase();

      // ONLY DELIVERED
      if (status !== "delivered") {
        return false;
      }

      // DATE (LOCAL TIMEZONE)
      const itemDate = item.date || item.Date;

      if (!itemDate) return false;

      // Convert UTC date to local date string (YYYY-MM-DD)
      const localDate = new Date(itemDate).toLocaleDateString("en-CA");

      // FROM DATE
      const fromDateValid = filters.fromDate
        ? localDate >= filters.fromDate
        : true;

      // TO DATE
      const toDateValid = filters.toDate ? localDate <= filters.toDate : true;

      // PAYMENT MODE
      const paymentType = (item.PaymentMode || item.paymentMode || "")
        .toString()
        .trim()
        .toLowerCase();

      // PAYMENT FILTER
      const paymentValid =
        filters.paymentType === "All"
          ? true
          : paymentType.includes(filters.paymentType.toLowerCase());

      // DELIVERY PARTNER
      const partnerName = item.assignedTo || item.AssignedTo || "Not Assigned";

      // DELIVERY PARTNER FILTER
      const deliveryPartnerValid =
        filters.deliveryPartner === "All"
          ? true
          : partnerName === filters.deliveryPartner;

      return (
        fromDateValid && toDateValid && paymentValid && deliveryPartnerValid
      );
    });
  };

  // GROUP DATA
  const groupedData = () => {
    const filtered = getFilteredItems();

    const grouped = {};

    filtered.forEach((item) => {
      // PARTNER NAME
      const partnerName = item.assignedTo || item.AssignedTo || "Not Assigned";

      const grandTotal = item.grandTotal || item.GrandTotal || 0;

      const martId = item.martId || item.MartId || "-";

      const date = item.date
        ? new Date(item.date).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          })
        : "-";

      const key = `${partnerName}_${date}_${grandTotal}_${martId}`;

      // CREATE GROUP
      if (!grouped[key]) {
        grouped[key] = {
          deliveryPartnerName: partnerName,

          martId: martId,

          grandTotal: grandTotal,

          date,

          cash: 0,
          online: 0,
          cashAndOnline: 0,

          totalOrders: 0,

          totalAmount: 0,
        };
      }

      const paymentType = (item.PaymentMode ?? item.paymentMode ?? "")
        .toString()
        .trim()
        .toLowerCase();

      const rawAmount =
        item.PaidAmount ??
        item.paidAmount ??
        item.GrandTotal ??
        item.grandTotal ??
        item.TotalAmount ??
        item.totalAmount ??
        item.Amount ??
        item.amount ??
        0;

      if (paymentType === "cash") {
        grouped[key].cash += Number(rawAmount) || 0;
      } else if (paymentType === "online") {
        grouped[key].online += Number(rawAmount) || 0;
      } else if (paymentType === "cash&online") {
        const cash = Number(rawAmount.match(/cash=(\d+)/i)?.[1] || 0);
        const online = Number(rawAmount.match(/online=(\d+)/i)?.[1] || 0);

        // DON'T add to cash
        // DON'T add to online

        grouped[key].cashAndOnline += cash + online;
      }

      grouped[key].totalOrders += 1;
    });

    return Object.values(grouped);
  };

  const summaryData = groupedData();

  // TOTALS
  const totalOrders = summaryData.reduce(
    (sum, item) => sum + item.totalOrders,
    0,
  );

  const totalCash = summaryData.reduce((sum, item) => sum + item.cash, 0);

  const totalOnline = summaryData.reduce((sum, item) => sum + item.online, 0);

  const totalCashOnline = summaryData.reduce(
    (sum, item) => sum + item.cashAndOnline,
    0,
  );

  const grandTotalAmount =
    (Number(totalCash) || 0) +
    (Number(totalOnline) || 0) +
    (Number(totalCashOnline) || 0);

  const grandTotal = summaryData.reduce(
    (sum, item) => sum + (Number(item.grandTotal) || 0),
    0,
  );

  return (
    <div className="dashboard-container">
      {/* HEADER */}
      <div className="header-card">
        <h1 className="main-title">Delivery Partner Payment Dashboard</h1>

        {/* FILTERS */}
        <div className="filters-row">
          {/* PAYMENT TYPE */}
          <div className="filter-box">
            <label className="filter-label">Payment Type</label>

            <select
              value={filters.paymentType}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  paymentType: e.target.value,
                })
              }
              className="filter-input"
            >
              <option value="All">All</option>

              <option value="cash">Cash</option>

              <option value="online">Online</option>

              <option value="cash&online">Cash & Online</option>
            </select>
          </div>

          {/* FROM DATE */}
          <div className="filter-box">
            <label className="filter-label">From Date</label>

            <input
              type="date"
              value={filters.fromDate}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => {
                const selectedDate = e.target.value;

                const today = new Date().toISOString().split("T")[0];

                // FUTURE DATE BLOCK
                if (selectedDate > today) {
                  alert("Current date should not exceed today's date");

                  setFilters({
                    ...filters,
                    fromDate: "",
                  });

                  return;
                }

                setFilters({
                  ...filters,
                  fromDate: selectedDate,
                });
              }}
              className="filter-input"
            />
          </div>

          {/* TO DATE */}
          <div className="filter-box">
            <label className="filter-label">To Date</label>

            <input
              type="date"
              value={filters.toDate}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => {
                const selectedDate = e.target.value;

                const today = new Date().toISOString().split("T")[0];

                // FUTURE DATE BLOCK
                if (selectedDate > today) {
                  alert("Current date should not exceed today's date");

                  setFilters({
                    ...filters,
                    toDate: "",
                  });

                  return;
                }

                // TO DATE VALIDATION
                if (filters.fromDate && selectedDate < filters.fromDate) {
                  alert("To Date should not be less than From Date");

                  setFilters({
                    ...filters,
                    toDate: "",
                  });

                  return;
                }

                setFilters({
                  ...filters,
                  toDate: selectedDate,
                });
              }}
              className="filter-input"
            />
          </div>

          {/* DELIVERY PARTNERS */}
          <div className="filter-box">
            <label className="filter-label">Delivery Partners</label>

            <select
              value={filters.deliveryPartner}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  deliveryPartner: e.target.value,
                })
              }
              className="filter-input"
            >
              {deliveryPartners.map((partner, index) => (
                <option key={index} value={partner}>
                  {partner}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="summary-row">
        {/* TOTAL ORDERS */}
        <div className="summary-card blue-card">
          <h3>Total Orders</h3>

          <p>{totalOrders}</p>
        </div>

        {/* GRAND TOTAL */}
        <div className="summary-card orange-card">
          <h3>Grand Total</h3>

          <p>₹{grandTotal.toFixed(2)}</p>
        </div>

        {/* TOTAL CASH */}
        <div className="summary-card green-card">
          <h3>Total Cash</h3>

          <p>₹{(Number(totalCash) || 0).toFixed(2)}</p>
        </div>

        {/* TOTAL ONLINE */}
        <div className="summary-card indigo-card">
          <h3>Total Online</h3>

          <p>₹{(Number(totalOnline) || 0).toFixed(2)}</p>
        </div>

        {/* CASH & ONLINE */}
        <div className="summary-card purple-card">
          <h3>Cash & Online</h3>

          <p>₹{(Number(totalCashOnline) || 0).toFixed(2)}</p>
        </div>

        {/* Total Amount Received */}
        <div className="summary-card purple-card">
          <h3>Total Amount Received</h3>

          <p>₹{(Number(grandTotalAmount) || 0).toFixed(2)}</p>
        </div>
      </div>

      {/* TABLE */}
      <div className="table-container">
        <table className="payment-table">
          <thead>
            <tr>
              <th>S.No</th>

              <th>Delivery Partner</th>

              <th>Mart Id</th>

              <th>Grand Total</th>

              <th>Date</th>

              <th>Cash</th>

              <th>Online</th>

              <th>Cash & Online</th>

              <th>Total Orders</th>

              <th>Total Amount Received</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="10" className="no-data">
                  Loading...
                </td>
              </tr>
            ) : summaryData.length === 0 ? (
              <tr>
                <td colSpan="10" className="no-data">
                  No Data Found
                </td>
              </tr>
            ) : (
              summaryData.map((item, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>

                  <td>{item.deliveryPartnerName}</td>

                  <td>{item.martId}</td>

                  <td className="bold-text">
                    ₹{(Number(item.grandTotal) || 0).toFixed(2)}
                  </td>

                  <td>{item.date}</td>

                  {/* CASH */}
                  <td className="green-text">₹{item.cash.toFixed(2)}</td>

                  {/* ONLINE */}
                  <td className="blue-text">₹{item.online.toFixed(2)}</td>

                  {/* CASH & ONLINE */}
                  <td className="purple-text">
                    ₹{item.cashAndOnline.toFixed(2)}
                  </td>

                  {/* TOTAL ORDERS */}
                  <td>{item.totalOrders}</td>

                  <td className="bold-text">
                    ₹
                    {filters.paymentType === "cash"
                      ? item.cash.toFixed(2)
                      : filters.paymentType === "online"
                        ? item.online.toFixed(2)
                        : filters.paymentType === "cash&online"
                          ? item.cashAndOnline.toFixed(2)
                          : (
                              Number(item.cash || 0) +
                              Number(item.online || 0) +
                              Number(item.cashAndOnline || 0)
                            ).toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="table-headers">
        <button onClick={downloadExcelData} className="download-btns">
          Download_OrdersPaymentReport_deliveryPartner
        </button>
      </div>

      {/* CSS */}
      <style>{`
        .dashboard-container{
          padding:20px;
          background:#f3f4f6;
          min-height:100vh;
          font-family:Arial;
        }

        .header-card{
          background:white;
          padding:25px;
          border-radius:15px;
          margin-bottom:20px;
          box-shadow:0 2px 10px rgba(0,0,0,0.1);
        }

        .main-title{
          color:#2563eb;
          font-size:32px;
          margin-bottom:25px;
          font-weight:bold;
        }



        .filters-row{
          display:flex;
          gap:20px;
          flex-wrap:wrap;
          align-items:end;
        }

        .filter-box{
          display:flex;
          flex-direction:column;
          min-width:250px;
        }

        .filter-label{
          color:#2563eb;
          font-weight:600;
          margin-bottom:8px;
        }

        .filter-input{
          padding:12px;
          border:1px solid #cbd5e1;
          border-radius:10px;
          font-size:15px;
        }

        .summary-row{
          display:grid;
          grid-template-columns:
          repeat(auto-fit,minmax(220px,1fr));
          gap:20px;
          margin-bottom:20px;
        }

        .summary-card{
          background:white;
          padding:20px;
          border-radius:15px;
          box-shadow:0 2px 10px rgba(0,0,0,0.1);
          border-left:6px solid;
        }

        .summary-card h3{
          margin-bottom:15px;
          font-size:15px;
        }

        .summary-card p{
          font-size:30px;
          font-weight:bold;
        }

        .blue-card{
          border-color:#2563eb;
        }

        .blue-card h3{
          color:#2563eb;
        }

        .green-card{
          border-color:#16a34a;
        }

        .green-card h3{
          color:#16a34a;
        }

        .indigo-card{
          border-color:#4f46e5;
        }

        .indigo-card h3{
          color:#4f46e5;
        }

        .orange-card{
          border-color:#ea580c;
        }

        .orange-card h3{
          color:#ea580c;
        }

        .purple-card{
          border-color:#7c3aed;
        }

        .purple-card h3{
          color:#7c3aed;
        }

        .table-container{
          background:white;
          border-radius:15px;
          overflow:auto;
          box-shadow:0 2px 10px rgba(0,0,0,0.1);
        }

        .payment-table{
          width:100%;
          border-collapse:collapse;
        }

        .payment-table thead{
          background:#2563eb;
          color:white;
        }

        .payment-table th{
          padding:15px;
          text-align:left;
        }

        .payment-table td{
          padding:15px;
          border-bottom:1px solid #e5e7eb;
        }

        .payment-table tr:hover{
          background:#f9fafb;
        }

        .green-text{
          color:#16a34a;
          font-weight:bold;
        }

        .blue-text{
          color:#2563eb;
          font-weight:bold;
        }

        .purple-text{
          color:#7c3aed;
          font-weight:bold;
        }

        .bold-text{
          font-weight:bold;
        }

        .no-data{
          text-align:center;
          padding:30px;
        }


.table-header {
  display: flex;
justify-content: flex-end;
  margin-bottom: 10px;
}

.table-headers {
  display: flex;

  margin-bottom: 10px;
}

.download-btn {
  background: #28a745;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 5px;
  cursor: pointer;
  margin-bottom: 10px;
}


.download-btns {
  background: #2835a7;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 5px;
  cursor: pointer;
  margin-bottom: 10px;
}

.download-btn:hover {
  background: #218838;
}
      `}</style>
    </div>
  );
};

export default DeliveryPartnerPaymentDashboard;
