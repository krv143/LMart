import React, { useState } from "react";
import axios from "axios";
import { Card, Form, Button, Container } from "react-bootstrap";
import Header from "../CommonPages/Header";
import Footer from "../CommonPages/Footer";

const AdminRegistrationNumbers = () => {
  const [mobileNumber, setMobileNumber] = useState("");
  const [checkStatus, setCheckStatus] = useState(null);
  const [customerData, setCustomerData] = useState(null);
  const [checkLoading, setCheckLoading] = useState(false);
  const [checkError, setCheckError] = useState(null);
  const [transactionData, setTransactionData] = useState(null);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState(null);
  const [walletAmount, setWalletAmount] = useState("");
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletSuccess, setWalletSuccess] = useState(null);
  const [walletError, setWalletError] = useState(null);
  const [isNewTransaction, setIsNewTransaction] = useState(false);

  const resetAll = () => {
    setCheckStatus(null);
    setCustomerData(null);
    setTransactionData(null);
    setWalletSuccess(null);
    setWalletError(null);
    setCheckError(null);
    setTxError(null);
    setWalletAmount("");
    setIsNewTransaction(false);
  };

  const handleCheckMobile = async () => {
    if (!mobileNumber.trim()) {
      setCheckError("Please enter a mobile number.");
      return;
    }
    setCheckLoading(true);
    resetAll();

    try {
      const res = await axios.get(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/Customer/GuestUserExistingVerification/${mobileNumber}`,
      );
      console.log("[Step 1] Response:", res.data);

      if (res.data && res.data.length > 0) {
        const customer = res.data[0];
        setCheckStatus("registered");
        setCustomerData(customer);
        await fetchTransaction(customer.userId);
      } else {
        setCheckStatus("not_registered");
      }
    } catch (err) {
      console.error("[Step 1] Error:", err?.response || err);
      setCheckError(
        err?.response?.data?.message ||
          "Error checking mobile number. See console.",
      );
    } finally {
      setCheckLoading(false);
    }
  };

  const fetchTransaction = async (userId) => {
    setTxLoading(true);
    setTxError(null);
    setTransactionData(null);

    try {
      const txRes = await axios.get(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/OffersTransactions/GetOfferTransactionByUserId?userId=${userId}`,
      );
      console.log("[Step 2] Response:", txRes.data);

      // 👇 If empty array → flag as new (POST), otherwise use existing record (PUT)
      if (!txRes.data || txRes.data.length === 0) {
        console.log("[Step 2] No transaction found — will use POST.");
        setIsNewTransaction(true);
        setTransactionData(null);
      } else {
        console.log("[Step 2] Existing transaction found — will use PUT.");
        setIsNewTransaction(false);
        setTransactionData(txRes.data[0]);
      }
    } catch (err) {
      console.error("[Step 2] Error:", err?.response || err);
      setTxError("Failed to fetch wallet transaction. See console.");
    } finally {
      setTxLoading(false);
    }
  };

  const handleAddWallet = async () => {
    setWalletError(null);
    setWalletSuccess(null);

    if (!walletAmount || isNaN(walletAmount) || Number(walletAmount) <= 0) {
      setWalletError("Please enter a valid wallet amount.");
      return;
    }
    if (!customerData) {
      setWalletError("Customer data missing.");
      return;
    }

    // PUT guard — wallet already has balance
    if (
      !isNewTransaction &&
      transactionData &&
      transactionData.totalWalletAmount !== "0"
    ) {
      setWalletError(
        `Wallet already has ₹${transactionData.totalWalletAmount}. Cannot add again.`,
      );
      return;
    }

    setWalletLoading(true);

    try {
      const amount = String(walletAmount);

      if (isNewTransaction) {
        // ───── POST ─────
        const postPayload = {
          id: "string",
          UserId: customerData.userId,
          CreatedDate: new Date().toISOString(),
          UpdatedDate: new Date().toISOString(),
          TicketId: "",
          TotalWalletAmount: amount,
          AvailedAmount: "0",
          RemainingAmount: amount,
        };

        console.log("[Step 3] POST payload:", postPayload);
        const postRes = await axios.post(
          `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/OffersTransactions/UploadOffersTransactionsDetails`,
          postPayload,
        );
        console.log("[Step 3] POST response:", postRes.data);

        setWalletSuccess(
          `₹${walletAmount} wallet created successfully for ${customerData.firstName} ${customerData.lastName}!`,
        );
        setTransactionData({
          totalWalletAmount: amount,
          availedAmount: "0",
          remainingAmount: amount,
          createdDate: postPayload.CreatedDate,
          updatedDate: postPayload.UpdatedDate,
        });
        setIsNewTransaction(false);
      } else {
        // ───── PUT ─────
        if (!transactionData) {
          setWalletError("Transaction data missing for update.");
          return;
        }

        const putPayload = {
          id: transactionData.id,
          userId: customerData.userId,
          createdDate: transactionData.createdDate,
          updatedDate: new Date().toISOString(),
          ticketId: transactionData.ticketId || "",
          totalWalletAmount: amount,
          availedAmount: String(transactionData.availedAmount || "0"),
          remainingAmount: amount,
        };

        console.log("[Step 3] PUT payload:", putPayload);
        const putRes = await axios.put(
          `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/OffersTransactions/UpdateOffersTransactionsDetails/${transactionData.id}`,
          putPayload,
        );
        console.log("[Step 3] PUT response:", putRes.data);

        setWalletSuccess(
          `₹${walletAmount} added successfully to ${customerData.firstName} ${customerData.lastName}'s wallet!`,
        );
        setTransactionData((prev) => ({
          ...prev,
          totalWalletAmount: amount,
          remainingAmount: amount,
          updatedDate: new Date().toISOString(),
        }));
      }

      setWalletAmount("");
    } catch (err) {
      console.error("[Step 3] Error:", err?.response || err);
      setWalletError(
        err?.response?.data?.message ||
          err?.response?.statusText ||
          "Failed to process wallet amount. See console.",
      );
    } finally {
      setWalletLoading(false);
    }
  };

  const walletAlreadyFilled =
    !isNewTransaction &&
    transactionData &&
    transactionData.totalWalletAmount !== "0";

  return (
    <>
      <Header />
      <Container
        fluid
        className="d-flex justify-content-center align-items-center mt-mob-50"
        style={{
          minHeight: "70vh",
          background: "linear-gradient(135deg, #f5f7fa, #f5f7fa)",
          padding: "10px",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        <Card
          className="p-2"
          style={{
            width: "100%",
            maxWidth: "500px",
            borderRadius: "15px",
            border: "2px solid #e0e7ff",
          }}
        >
          <h2 className="text-center mb-3 fw-bold text-primary fs-5">
            💰 Wallet Management
          </h2>

          {/* Phone Number */}
          <Form.Group className="mb-2">
            <Form.Label className="fw-bold">Enter Phone Number</Form.Label>
            <div className="d-flex gap-2">
              <Form.Control
                type="tel"
                placeholder="Enter mobile number"
                value={mobileNumber}
                onChange={(e) => {
                  setMobileNumber(e.target.value);
                  resetAll();
                }}
                maxLength={10}
              />
              <Button
                variant="primary"
                onClick={handleCheckMobile}
                disabled={checkLoading || txLoading}
                style={{ whiteSpace: "nowrap", minWidth: "90px" }}
              >
                {checkLoading || txLoading ? "Checking..." : "Check"}
              </Button>
            </div>
          </Form.Group>

          {checkError && (
            <div
              className="mb-2 p-2 rounded"
              style={{
                background: "#fee2e2",
                border: "1px solid #fca5a5",
                color: "#991b1b",
                fontWeight: 600,
              }}
            >
              ⚠️ {checkError}
            </div>
          )}

          {/* Registration Status */}
          {checkStatus === "registered" && customerData && (
            <div
              className="mb-2 p-2 rounded"
              style={{ background: "#d1fae5", border: "1px solid #6ee7b7" }}
            >
              <span style={{ color: "#065f46", fontWeight: 600 }}>
                ✅ Registered
              </span>
            </div>
          )}
          {checkStatus === "not_registered" && (
            <div
              className="mb-3 p-2 rounded"
              style={{ background: "#fee2e2", border: "1px solid #fca5a5" }}
            >
              <span style={{ color: "#991b1b", fontWeight: 600 }}>
                ❌ Not Registered
              </span>
            </div>
          )}

          {/* Wallet Info */}
          {txError && (
            <div
              className="mb-2 p-2 rounded"
              style={{
                background: "#fff7ed",
                border: "1px solid #fdba74",
                color: "#92400e",
                fontWeight: 600,
              }}
            >
              ⚠️ {txError}
            </div>
          )}

          {transactionData && (
            <div
              className="mb-3 p-3 rounded"
              style={{ background: "#f0f9ff", border: "1px solid #bae6fd" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <span style={{ color: "#0369a1", fontWeight: 600 }}>
                  Total Wallet
                </span>
                <span style={{ color: "#0369a1", fontWeight: 700 }}>
                  ₹{transactionData.totalWalletAmount}
                </span>
              </div>
            </div>
          )}

          {/* New transaction badge */}
          {isNewTransaction && checkStatus === "registered" && (
            <div
              className="mb-2 p-2 rounded"
              style={{
                background: "#eff6ff",
                border: "1px solid #93c5fd",
                color: "#1e40af",
                fontWeight: 600,
              }}
            >
              🆕 No existing wallet — a new one will be created.
            </div>
          )}

          {walletAlreadyFilled && (
            <div
              className="mb-3 p-2 rounded text-center"
              style={{
                background: "#fefce8",
                border: "1px solid #fde047",
                color: "#854d0e",
                fontWeight: 600,
              }}
            >
              ⚠️ Wallet already has ₹{transactionData.totalWalletAmount}. Cannot
              add again.
            </div>
          )}

          {/* Wallet Amount input — show if registered and wallet not already filled */}
          {checkStatus === "registered" &&
            customerData &&
            !walletAlreadyFilled && (
              <>
                <Form.Group className="mb-2">
                  <Form.Label className="fw-bold">Wallet Amount (₹)</Form.Label>
                  <div className="d-flex gap-2">
                    <Form.Control
                      type="number"
                      placeholder="e.g. 20, 50, 100"
                      value={walletAmount}
                      min={1}
                      onChange={(e) => {
                        setWalletAmount(e.target.value);
                        setWalletSuccess(null);
                        setWalletError(null);
                      }}
                    />
                    <Button
                      variant="success"
                      onClick={handleAddWallet}
                      disabled={walletLoading}
                      style={{ whiteSpace: "nowrap", minWidth: "80px" }}
                    >
                      {walletLoading
                        ? "Adding..."
                        : isNewTransaction
                          ? "Create"
                          : "Add"}
                    </Button>
                  </div>
                </Form.Group>

                {walletError && (
                  <div
                    className="mb-2 p-2 rounded"
                    style={{
                      background: "#fee2e2",
                      border: "1px solid #fca5a5",
                      color: "#991b1b",
                      fontWeight: 600,
                    }}
                  >
                    ⚠️ {walletError}
                  </div>
                )}
              </>
            )}

          {walletSuccess && (
            <div
              className="mb-2 p-2 rounded text-center"
              style={{
                background: "#d1fae5",
                border: "1px solid #6ee7b7",
                color: "#065f46",
                fontWeight: 600,
              }}
            >
              ✅ {walletSuccess}
            </div>
          )}
        </Card>
      </Container>
      <Footer />
    </>
  );
};

export default AdminRegistrationNumbers;

// import React, { useState, useEffect } from "react";
// import 'bootstrap/dist/css/bootstrap.min.css';
// import "./App.css";
// import AdminSidebar from './AdminSidebar';
// import { Dashboard as MoreVertIcon,} from '@mui/icons-material';
// import {  Button } from 'react-bootstrap';
// import { useParams } from 'react-router-dom';

// const AdminRegistrationNumbers = () => {
//   const [isMobile, setIsMobile] = useState(false);
//   const [showMenu, setShowMenu] = useState(false);
//   const [mobileNumber, setMobileNumber] = useState("");
//   const [loading, setLoading] = useState(true);
//   const { selectedUserType} = useParams();
//   const [errorMessage, setErrorMessage] = useState('');
//   const [userData, setUserData] = useState(null);

//  useEffect(() => {
//     console.log(loading);
//  }, [loading]);

// useEffect(() => {
//   const handleResize = () => setIsMobile(window.innerWidth <= 768);
//   handleResize();
//   window.addEventListener('resize', handleResize);
//   return () => window.removeEventListener('resize', handleResize);
// }, []);

//  const handleSubmit = async () => {
//   if (!mobileNumber || mobileNumber.length !== 10) {
//     setErrorMessage("Please enter a valid 10-digit phone number.");
//     setUserData(null);
//     return;
//   }

//   setErrorMessage('');
//   setLoading(true);

//   try {
//     const response = await fetch(`https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/Customer/GuestUserExistingVerification/${mobileNumber}`);
//     if (!response.ok) {
//       throw new Error('Failed to fetch user data');
//     }
//     const result = await response.json();
//     if (result && result.length > 0) {
//       const user = result[0];
//       setUserData(user);
//     } else {
//       setErrorMessage("User not found.");
//       setUserData(null);
//     }
//   } catch (error) {
//     console.error('Error fetching user data:', error);
//     setErrorMessage("An error occurred while fetching data.");
//     setUserData(null);
//   } finally {
//     setLoading(false);
//   }
// };

//   return (
//       <div className="d-flex flex-row justify-content-start align-items-start">
//           {/* Sidebar */}
//           {!isMobile && (
//           <div className="ml-0 m-4 p-0 adm_mnu">
//           <AdminSidebar userType={selectedUserType}/>
//          </div>
//           )}

//           {/* Floating menu for mobile */}
//       {isMobile && (
//         <div className="floating-menu">
//           <Button
//             variant="primary"
//             className="rounded-circle shadow"
//             onClick={() => setShowMenu(!showMenu)}
//           >
//             <MoreVertIcon />
//           </Button>

//           {showMenu && (
//               <div className="sidebar-container">
//                 <AdminSidebar userType={selectedUserType} />
//               </div>
//           )}
//         </div>
//       )}

//        {/* <div className={`container m-3 ${isMobile ? 'w-100' : 'w-70'}`}> */}
//        <div className="m-3" style={{ maxWidth: "400px", width: "100%" }}>
//         <h3 className="mb-3 text-center">Search For Registered Users</h3>
//         <div className="bg-white rounded-3 p-3 bx_sdw">
//           <form>
//             {/* Phone Number */}
//             <div className="form-group">
//               <label>Phone Number <span className="req_star mb-2">*</span></label>
//                <div className="d-flex align-items-center">
//                 <input
//                   type="text"
//                   className="form-control w-50"
//                   value={mobileNumber}
//                   maxLength={10}
//                   onChange={(e) => {
//                     const value = e.target.value;
//                     if (/^\d{0,10}$/.test(value)) {
//                         setMobileNumber(value);
//                         setUserData(null);
//                     }
//                     }}
//                   placeholder="Enter 10-digit Phone Number"
//                 />
//                <button type="button" className="btn btn-primary mx-5" onClick={handleSubmit}>
//                 Submit
//               </button>
//               </div>
//              {userData && !loading && (
//                 <>
//                 <h5 className="mt-2">User Details:</h5>
//             <div className="bg-light p-3 rounded">
//                 <p className="fw-bold">First Name: <small>{userData.firstName}</small></p>
//                 <p className="fw-bold">Mobile Number: <small>{userData.mobileNumber}</small> </p>
//                 <p className="fw-bold">Date: <small>{new Date(userData.date).toLocaleDateString()}</small></p>
//             </div>
//             </>
//             )}
//               {errorMessage && (
//         <div style={{ color: 'red', marginTop: '5px' }}>{errorMessage}</div>
//       )}
//             </div>
//           </form>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default AdminRegistrationNumbers;
