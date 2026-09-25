import React, { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import "./App.css";
import DialogHost from "./CommonPages/DialogSystem";
import {
  useNavigate,
  useLocation,
  BrowserRouter as Router,
  Route,
  Routes,
} from "react-router-dom";
import RaiseTicket from "./CustomerPages/RaiseTicket";
import Sidebar from "./CommonPages/Sidebar";
import AdminProductApproval from "./AdminPages/AdminProductApproval.js";
import AdminProductList from "./AdminPages/AdminProductList.js";
import AdminUpdateProduct from "./AdminPages/AdminUpdateProduct.js";
import AdminUploadForm from "./AdminPages/AdminUploadForm.js";
import AdminSidebar from "./AdminPages/AdminSidebar";
import AdminNotifications from "./AdminPages/AdminNotifications.js";
import RaiseTicketActionView from "./AdminPages/RaiseTicketActionView.js";
import RaiseTicketNotifications from "./AdminPages/RaiseTicketNotifications.js";
import BookTechnician from "./CustomerPages/BookTechnician.js";
import BookTechnicianActionView from "./AdminPages/BookTechnicianActionView.js";
import UploadBookTechnician from "./AdminPages/UploadBookTechnician.js";
import BookTechnicianList from "./AdminPages/BookTechnicianList.js";
import BookTechnicianPaymentPage from "./CustomerPages/BookTechnicianPaymentPage.js";
import UpdateBookTechnician from "./AdminPages/UpdateBookTechnician.js";
import BookTechnicianNotificationGrid from "./AdminPages/BookTechnicianNotificationGrid.js";
import ProfilePage from "./CustomerPages/ProfilePage.js";
import HandyManLogo from "./CustomerPages/HandyManLogo.js";
import LoginPage from "./CustomerPages/LoginPage.js";
import VendorLoginPage from "./VendorPages/VendorLoginPage.js";
import VendorRegisterPage from "./VendorPages/VendorRegisterPage.js";
import VendorStockUpdatePage from "./VendorPages/VendorStockUpdatePage.js";
import VendorPreviewPage from "./VendorPages/VendorPreviewPage.js";
import VendorOrdersPage from "./VendorPages/VendorOrdersPage.js";
import SuperAdminVendorsPage from "./SuperAdminPages/SuperAdminVendorsPage.js";
import SuperAdminVendorProductsPage from "./SuperAdminPages/SuperAdminVendorProductsPage.js";
import SuperAdminGuard from "./SuperAdminPages/SuperAdminGuard.js";
import OTPVerificationPage from "./CustomerPages/OTPVerificationPage.js";
import ApartmentRaiseTicket from "./CustomerPages/ApartmentRaiseTicket.js";
import AboutApartmentRaiseTicket from "./CustomerPages/AboutApartmentRaiseTicket.js";
import GroceryItems from "./CustomerPages/GroceryItems.js";
import AdminUploadGrocery from "./AdminPages/AdminUploadGrocery.js";
import AdminUpdateGrocery from "./AdminPages/AdminUpdateGrocery.js";
import AdminGroceryList from "./AdminPages/AdminGroceryList.js";
import AdminGroceryApproval from "./AdminPages/AdminGroceryApproval.js";
import GroceryCartPage from "./CustomerPages/GroceryCartPage.js";
import AdminGroceryOrderPage from "./AdminPages/AdminGroceryOrderPage.js";
import GroceryPaymentmethod from "./CustomerPages/GroceryPaymentMethod.js";
import DeliveryPartner from "./DeliveryPartnerPages/DeliveryPartner.js";
import { getLoginData } from "./utils/auth";
import MartHomeAppliances from "./CustomerPages/MartHomeAppliances.js";
import AdminOfferForm from "./AdminPages/AdminOfferForm.js";
import AdminBannerList from "./AdminPages/AdminBannerList.js";
import AdminGroceryZoneDashboard from "./AdminPages/AdminGroceryZoneDashboard.js";
import DeliveryPartnerPaymentMethod from "./DeliveryPartnerPages/DeliveryPartnerPaymentMethod.js";
import AdminRegistrationNumbers from "./AdminPages/AdminRegisterationNumbers.js";
import AdminLiveChat from "./AdminPages/AdminLiveChat.js";
import DeliveryPartnerDashboard from "./DeliveryPartnerPages/DeliveryPartnerDashboard.js";
import DeliveryOrderDetailsPage from "./DeliveryPartnerPages/DeliveryOrderDetailsPage.js";
import DeliveryNewOrdersPage from "./DeliveryPartnerPages/DeliveryNewOrdersPage.js";
import AddressPage from "./CustomerPages/AddressPage.js";

import SuperAdminDeliveryPartnersPage from "./SuperAdminPages/SuperAdminDeliveryPartnersPage.js";

import SuperAdminOrdersPage from "./SuperAdminPages/SuperAdminOrdersPage.js";

import AdminOrderClose from "./AdminPages/AdminOrderClose.js";
// import OneRupeeGroceryItems from './OneRupeeGroceryItems.js';
// import CustomerLocation from "./CustomerLocation.js";
const PreventBackNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === "/") {
      const newUserId = getLoginData();
      if (newUserId) {
        navigate(`/profilePage/customer/${newUserId}`, { replace: true });
      } else {
        navigate("/loginnew", { replace: true });
      }
    }
  }, [navigate, location]);

  // Android hardware back button (native app only). On the login / home
  // screens it closes the app; everywhere else it goes back one screen.
  const locationRef = useRef(location);
  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    let handle = null;
    let removed = false;
    CapacitorApp.addListener("backButton", () => {
      const path = locationRef.current.pathname;
      const atRoot =
        path === "/" || path === "/loginnew" || path.startsWith("/profilePage/");
      if (atRoot) CapacitorApp.exitApp();
      else navigate(-1);
    }).then((h) => {
      if (removed) h.remove();
      else handle = h;
    });
    return () => {
      removed = true;
      if (handle) handle.remove();
    };
  }, [navigate]);

  useEffect(() => {
    // The web-only "reload on back" trick below would fight the native back
    // handling above, so it is skipped inside the app.
    if (Capacitor.isNativePlatform()) return undefined;
    const handlePopState = (event) => {
      event.preventDefault();
      window.location.reload();
    };

    window.history.pushState(null, null, window.location.href);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);
  return null;
};

function App() {
  return (
    <Router>
      <PreventBackNavigation />
      <DialogHost />
      <div className="App">
        <main>
          {/* className="mt-100" */}
          <Routes>
            <Route
              path="/addressPage/:userType/:userId"
              element={<AddressPage />}
            />
           <Route path="/adminLiveChat/Admin" element={<AdminLiveChat />} />
            <Route
              path="/adminRegistrations/Admin"
              element={<AdminRegistrationNumbers />}
            />
            <Route
              path="/deliverypartnerPaymentMethod"
              element={<DeliveryPartnerPaymentMethod />}
            />
            <Route
              path="/deliveryPartnerDashboard/:userType/:userId"
              element={<DeliveryPartnerDashboard />}
            />
            <Route
              path="/deliveryNewOrders/:userType/:userId"
              element={<DeliveryNewOrdersPage />}
            />
            <Route
              path="/deliveryOrderDetails/:userType/:userId/:orderId"
              element={<DeliveryOrderDetailsPage />}
            />
            <Route
              path="/adminGroceryZoneDashboard"
              element={<AdminGroceryZoneDashboard />}
            />
           <Route
              path="/martHomeAppliances/:userType/:userId"
              element={<MartHomeAppliances />}
            />
            <Route
              path="/deliveryPartner/:userType/:userId"
              element={<DeliveryPartner />}
            />
           
          <Route
              path="/grocery/:userType/:userId"
              element={<GroceryItems />}
            />
            <Route
              path="/groceryCart/:userType/:userId"
              element={<GroceryCartPage />}
            />
           <Route path="/adminOfferModal/Admin" element={<AdminOfferForm />} />
            <Route
              path="/adminCashbackOfferCreate/Admin"
              element={<AdminOfferForm />}
            />
            <Route
              path="/adminBannerList/Admin"
              element={<AdminBannerList />}
            />
           <Route
              path="/adminUploadGrocery/Admin"
              element={<AdminUploadGrocery />}
            />
            <Route
              path="/adminUpdateGrocery/:id/Admin"
              element={<AdminUpdateGrocery />}
            />
            <Route
              path="/adminGroceryApproval/:id/Admin"
              element={<AdminGroceryApproval />}
            />
            <Route
              path="/adminGroceryList/Admin"
              element={<AdminGroceryList />}
            />
           <Route
              path="/adminGroceryOrderPage/:groceryItemId"
              element={<AdminGroceryOrderPage />}
            />
            <Route
              path="/groceryPaymentMethod/:userType/:userId/:groceryItemId"
              element={<GroceryPaymentmethod />}
            />
           <Route
              path="/profilePage/:userType/:userId"
              element={<ProfilePage />}
            />
            <Route path="/vendor/login" element={<VendorLoginPage />} />
            <Route path="/vendor/register" element={<VendorRegisterPage />} />
            <Route
              path="/vendor/stock-update/:vendorId"
              element={<VendorStockUpdatePage />}
            />
            <Route
              path="/vendor/preview/:vendorId"
              element={<VendorPreviewPage />}
            />
            <Route
              path="/vendor/orders/:vendorId"
              element={<VendorOrdersPage />}
            />
            <Route
              path="/superadmin/vendors"
              element={
                <SuperAdminGuard>
                  <SuperAdminVendorsPage />
                </SuperAdminGuard>
              }
            />
            <Route
              path="/superadmin/vendor/:vendorId/products"
              element={
                <SuperAdminGuard>
                  <SuperAdminVendorProductsPage />
                </SuperAdminGuard>
              }
            />
            <Route path="/" element={<HandyManLogo />} />
            <Route path="/loginnew" element={<LoginPage />} />
            <Route path="/otpVerification" element={<OTPVerificationPage />} />
            <Route
              path="/raiseTicket/:userType/:userId"
              element={<RaiseTicket />}
            />
            <Route path="/sidebar/:userType" element={<Sidebar />} />
           <Route
              path="/adminUploadForm/Admin"
              element={<AdminUploadForm />}
            />
            <Route
              path="/adminProductApproval/:id/Admin"
              element={<AdminProductApproval />}
            />
            <Route
              path="/adminProductList/Admin"
              element={<AdminProductList />}
            />
            <Route
              path="/adminUpdateProduct/:id/Admin"
              element={<AdminUpdateProduct />}
            />
            <Route path="/adminSidebar" element={<AdminSidebar />} />
            <Route
              path="/adminNotifications"
              element={<AdminNotifications />}
            />
            <Route
              path="/raiseTicketActionView/:raiseTicketId"
              element={<RaiseTicketActionView />}
            />
            <Route
              path="/raiseTicketNotification"
              element={<RaiseTicketNotifications />}
            />
            <Route
              path="/bookTechnician/:userType/:userId"
              element={<BookTechnician />}
            />
            <Route
              path="/bookTechnicianActionView/:raiseTicketId"
              element={<BookTechnicianActionView />}
            />
            <Route
              path="/uploadBookTechnician"
              element={<UploadBookTechnician />}
            />
            <Route
              path="/bookTechnicianList"
              element={<BookTechnicianList />}
            />
            <Route
              path="/bookTechnicianPaymentPage/:userType/:userId/:raiseTicketId"
              element={<BookTechnicianPaymentPage />}
            />
            <Route
              path="/updateBookTechnician/:id"
              element={<UpdateBookTechnician />}
            />
            <Route
              path="/bookTechnicianNotificationGrid"
              element={<BookTechnicianNotificationGrid />}
            />
           <Route
              path="/adminOrderClose/:groceryItemId"
              element={<AdminOrderClose />} 
            />
            <Route
              path="/apartmentRaiseTicket/:userType/:userId"
              element={<ApartmentRaiseTicket />}
            />
           <Route
              path="/superadmin/orders"
              element={
                <SuperAdminGuard>
                  <SuperAdminOrdersPage />
                </SuperAdminGuard>
              }
            />

            <Route
              path="/superadmin/delivery-partners"
              element={
                <SuperAdminGuard>
                  {" "}
                  <SuperAdminDeliveryPartnersPage />
                </SuperAdminGuard>
              }
            />

            <Route
              path="/aboutApartmentRaiseTicket/:userType/:userId"
              element={<AboutApartmentRaiseTicket />}
            />
            {/* <Route path="/customerLocation/:fullName/:martId/:userType/:userId/:groceryItemId" element={<CustomerLocation />} /> */}
          </Routes>
        </main>
        {/* <Footer /> */}
      </div>
    </Router>
  );
}

export default App;
