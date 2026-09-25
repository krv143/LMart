import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import { IconButton } from "@mui/material";
import { logoutSuperAdmin } from "../utils/superAdminStore";
import { playNotificationSound } from "../CommonPages/notificationSound";
import { speakTeluguAlert } from "../CommonPages/speechAlert";

// Small shared header used across the /superadmin/* pages so the super
// admin can hop between Vendors, Delivery Partners, and Orders without
// having to know the URLs.
const TABS = [
  { label: "Vendors", path: "/superadmin/vendors" },
  { label: "Delivery Partners", path: "/superadmin/delivery-partners" },
  { label: "Orders", path: "/superadmin/orders" },
];

// Same endpoint RaiseTicketNotifications.js / AdminNotifications.js read
// from — the full list of raised tickets across every customer.
const GET_TICKETS_NOTIFICATIONS_URL =
  "https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/RaiseTicket/GetTicketsNotifications";
const TICKET_POLL_INTERVAL_MS = 25000;

const SuperAdminNav = ({ active }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutSuperAdmin();
    navigate("/vendor/login");
  };

  const handleBack = () => {
    const userId = localStorage.getItem("userId");
    if (userId) {
      navigate(`/profilePage/customer/${userId}`);
    } else {
      navigate(-1);
    }
  };

  // ---- Ticket notification bell ----
  // Polls the same "all raised tickets" feed the Admin notification pages
  // use. Any ticket id not seen on a previous poll rings the bell: plays
  // the notification chime, then speaks a short Telugu voice alert naming
  // the customer and their pincode — same "sound first, voice a beat
  // later" pattern ProfilePage.js uses for new vendor orders.
  const [ticketCount, setTicketCount] = useState(0);
  const [hasNewTicket, setHasNewTicket] = useState(false);
  const knownTicketIdsRef = useRef(null);

  const speakNewTicketAlert = useCallback((ticket) => {
    const customerName = ticket?.customerName?.trim() || "కస్టమర్";
    const pincode = (ticket?.zipCode || ticket?.zipcode || "")
      .toString()
      .trim();
    const message = pincode
      ? `కొత్త టికెట్ వచ్చింది, కస్టమర్ పేరు ${customerName}, పిన్ కోడ్ ${pincode}.`
      : `కొత్త టికెట్ వచ్చింది, కస్టమర్ పేరు ${customerName}.`;
    speakTeluguAlert(message);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const pollTickets = async () => {
      try {
        const response = await fetch(GET_TICKETS_NOTIFICATIONS_URL);
        if (!response.ok || cancelled) return;
        const data = await response.json();
        const list = Array.isArray(data) ? data : [];
        setTicketCount(list.length);

        const ids = new Set(list.map((t) => t.id));
        if (knownTicketIdsRef.current) {
          const arrivedTickets = list.filter(
            (t) => !knownTicketIdsRef.current.has(t.id),
          );
          if (arrivedTickets.length) {
            setHasNewTicket(true);
            try {
              playNotificationSound();
            } catch {
              // audio playback blocked/unsupported — the bell still rings visually
            }
            // Slight delay so the ringtone and the voice line don't talk
            // over each other; each ticket gets its own spoken line.
            setTimeout(() => {
              arrivedTickets.forEach((ticket) => speakNewTicketAlert(ticket));
            }, 600);
          }
        }
        knownTicketIdsRef.current = ids;
      } catch (err) {
        console.error("Failed to poll ticket notifications:", err);
      }
    };

    pollTickets();
    const interval = setInterval(pollTickets, TICKET_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [speakNewTicketAlert]);

  const handleBellClick = () => {
    setHasNewTicket(false);
    navigate("/raiseTicketNotification");
  };

  return (
    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
      <div className="d-flex align-items-center gap-2">
        <button
          type="button"
          className="btn btn-outline-dark btn-sm d-inline-flex align-items-center gap-1"
          onClick={handleBack}
          aria-label="Back to profile"
        >
          <ArrowBackIcon fontSize="small" />
          <span>Back to Profile</span>
        </button>

        <div className="btn-group" role="group">
          {TABS.map((tab) => (
            <button
              key={tab.path}
              type="button"
              className={`btn btn-sm ${active === tab.path ? "btn-dark" : "btn-outline-dark"}`}
              onClick={() => navigate(tab.path)}
              disabled={active === tab.path}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="d-flex align-items-center gap-2">
        <IconButton
          size="small"
          onClick={handleBellClick}
          aria-label="ticket notifications"
          title="View raised tickets"
          style={{ position: "relative" }}
        >
          <NotificationsActiveIcon
            className={hasNewTicket ? "superadmin-bell-ring" : ""}
          />
          {ticketCount > 0 && (
            <span
              className="badge rounded-pill bg-danger position-absolute"
              style={{ top: 2, right: 2, fontSize: 9, padding: "2px 4px" }}
            >
              {ticketCount}
            </span>
          )}
        </IconButton>

        <button className="btn btn-outline-secondary btn-sm" onClick={handleLogout}>
          Log out
        </button>
      </div>

      <style>{`
        @keyframes superAdminBellRing {
          0%, 100% { transform: rotate(0deg); }
          10% { transform: rotate(-18deg); }
          20% { transform: rotate(16deg); }
          30% { transform: rotate(-14deg); }
          40% { transform: rotate(12deg); }
          50% { transform: rotate(-8deg); }
          60% { transform: rotate(6deg); }
          70%, 100% { transform: rotate(0deg); }
        }
        .superadmin-bell-ring {
          animation: superAdminBellRing 1s ease-in-out infinite;
          transform-origin: 50% 0%;
        }
      `}</style>
    </div>
  );
};

export default SuperAdminNav;
