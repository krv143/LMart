import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const zoneData = {
  A: ["530001", "530002", "530003", "530004"],
  B: ["530005", "530013", "530016", "530020", "530024", "530022", "530017"],
  C: ["530007", "530008", "530009", "530012", "530018"],
  D: ["530011", "530031", "530029", "530026", "530032", "530049"],
  E: ["530027", "530028", "530040"],
  F: ["530014", "530041", "530043", "530045", "530048"],
  G: ["531162", "531163", "531173"],
};

const AdminGroceryZoneDashboard = () => {
  const navigate = useNavigate();
  const [selectedZone, setSelectedZone] = useState(null);
  const allZones = [
    "Grocery",
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "Others",
    "In Progress",
    "Delivered Tickets",
    "Return Orders",
    "Cancel Tickets",
    "All Grocery",
  ];

  const [groceryList, setGroceryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [blinkingZones, setBlinkingZones] = useState({});
  const prevZoneCountsRef = useRef({});

  useEffect(() => {
    console.log(loading);
  }, [loading]);

  const fetchGroceryData = useCallback(async (isInitial = false) => {
    try {
      const res = await fetch(
        "https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/Mart/GetAllMartItems",
      );
      const data = await res.json();

      setGroceryList((prev) => {
        if (isInitial || prev.length === 0) {
          return data.sort((a, b) => new Date(b.date) - new Date(a.date));
        }

        const prevMap = new Map(prev.map((i) => [i.martId, i]));
        const hasChanges =
          data.length !== prev.length ||
          data.some((item) => {
            const old = prevMap.get(item.martId);
            return (
              !old ||
              old.status !== item.status ||
              old.assignedTo !== item.assignedTo
            );
          });

        if (!hasChanges) return prev;

        const merged = data.map((item) => {
          const existing = prevMap.get(item.martId);
          if (!existing) return item;
          return existing.status === item.status &&
            existing.assignedTo === item.assignedTo
            ? existing
            : item;
        });

        return merged.sort((a, b) => new Date(b.date) - new Date(a.date));
      });
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchGroceryData(true);
  }, [fetchGroceryData]);

  useEffect(() => {
    let intervalId = null;

    const ACTIVE_INTERVAL = 30_000;
    const HIDDEN_INTERVAL = 120_000;

    const start = (ms) => {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => fetchGroceryData(false), ms);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        start(HIDDEN_INTERVAL);
      } else {
        fetchGroceryData(false);
        start(ACTIVE_INTERVAL);
      }
    };

    const handleOnline = () => start(ACTIVE_INTERVAL);
    const handleOffline = () => {
      if (intervalId) clearInterval(intervalId);
    };

    start(ACTIVE_INTERVAL);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [fetchGroceryData]);

  const zoneMap = useMemo(() => {
    const map = {};
    Object.entries(zoneData).forEach(([zone, pincodes]) => {
      pincodes.forEach((p) => (map[p] = zone));
    });
    return map;
  }, []);

  const zoneCounts = useMemo(() => {
    const zones = {};

    const addTo = (key, item) => {
      if (!zones[key]) zones[key] = { count: 0, tickets: [] };
      zones[key].tickets.push(item);
      zones[key].count++;
    };

    groceryList.forEach((item) => {
      const status = item.status?.toLowerCase().trim();
      const zip = item.zipCode?.trim();
      const zone = zip && zoneMap[zip] ? zoneMap[zip] : "Others";

      if (status === "open") {
        addTo(zone, item);
        addTo("Grocery", item);
      }
      if (status === "in progress") addTo("In Progress", item);
      if (status === "delivered") addTo("Delivered Tickets", item);
      if (status === "return") addTo("Return Orders", item);
      if (status === "cancel") addTo("Cancel Tickets", item);
      if (["open", "in progress", "delivered"].includes(status))
        addTo("All Grocery", item);
    });

    Object.keys(zones).forEach((zone) => {
      zones[zone].tickets.sort((a, b) => new Date(b.date) - new Date(a.date));
    });

    return zones;
  }, [groceryList, zoneMap]);

  useEffect(() => {
    const newBlinking = {};
    const prev = prevZoneCountsRef.current;

    Object.keys(zoneCounts).forEach((zone) => {
      if ((zoneCounts[zone]?.count || 0) > (prev[zone] || 0)) {
        newBlinking[zone] = true;
        setTimeout(
          () => setBlinkingZones((s) => ({ ...s, [zone]: false })),
          5000,
        );
      }
    });

    setBlinkingZones((s) => ({ ...s, ...newBlinking }));
    prevZoneCountsRef.current = Object.fromEntries(
      Object.entries(zoneCounts).map(([z, v]) => [z, v.count]),
    );
  }, [zoneCounts]);

  const totalValidTickets = useMemo(
    () =>
      groceryList.filter((i) => i.status?.toLowerCase().trim() === "open")
        .length,
    [groceryList],
  );

  const handleGroceryClick = (martId) => {
    navigate(`/adminGroceryOrderPage/${martId}`, { state: { martId } });
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>
        <ArrowBackIcon
          fontSize="large"
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/adminNotifications")}
        />{" "}
        Grocery Orders{" "}
        <span
          className="badge bg-danger"
          style={{ color: "#fff", padding: "5px 10px", borderRadius: "10px" }}
        >
          {totalValidTickets}
        </span>
      </h2>

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "20px",
        }}
      >
        {allZones.map((zone) => {
          const data = zoneCounts[zone] || { count: 0 };
          return (
            <div
              key={zone}
              onClick={() => setSelectedZone(zone)}
              style={{
                background: selectedZone === zone ? "#ffffff" : "#ffc107",
                padding: "10px 20px",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: "bold",
                minWidth: "80px",
                textAlign: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              }}
            >
              {zone}
              <div
                className="badge bg-danger"
                style={{
                  color: "#fff",
                  borderRadius: "8px",
                  marginTop: "5px",
                  marginLeft: "5px",
                  animation: blinkingZones?.[zone]
                    ? "blink 1s infinite"
                    : "none",
                }}
              >
                {data.count}
              </div>
            </div>
          );
        })}
      </div>

      {selectedZone && zoneCounts[selectedZone] && (
        <div>
          <h3 className="text-danger">Zone {selectedZone} Orders</h3>
          {(zoneCounts[selectedZone]?.tickets || []).map((item) => (
            <div
              key={item.martId}
              style={{
                border: "1px solid #ddd",
                padding: "10px",
                marginBottom: "10px",
                borderRadius: "6px",
              }}
            >
              <strong>ID: </strong>
              <span
                onClick={() => handleGroceryClick(item.id)}
                style={{
                  color: "blue",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                {item.martId}
              </span>
              <div>
                <strong>Name:</strong> {item.customerName}
              </div>
              <div>
                <strong>Address:</strong> {item.address}, {item.district},{" "}
                {item.state}, {item.zipCode}, {item.customerPhoneNumber}
              </div>
              <div>
                <strong>Grand Total:</strong> Rs {item.grandTotal} /-
              </div>
              <div>
                <strong>Date:</strong> {new Date(item.date).toLocaleString()}
              </div>
              <div>
                <strong>Delivery Partner:</strong> {item.assignedTo}
              </div>
              {item.status === "In Progress" && (
                <div>
                  <strong>Delivery Assigned Time:</strong>{" "}
                  {new Date(item.deliveryAssignedTime).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                  })}
                </div>
              )}
              {item.status === "Delivered" && (
                <div>
                  <strong>Delivery Submit Time:</strong>{" "}
                  {new Date(item.deliverySubmitTime).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                  })}
                </div>
              )}
              <div>
                <strong>Customer Paid Amount:</strong> Rs {item.paidAmount} /-
              </div>
              <div>
                <strong>Payment Mode:</strong> {item.paymentMode}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminGroceryZoneDashboard;
