import React, { useEffect, useMemo, useState } from "react";
import {
  getDraftDeliveryPartners,
  getAllVendors,
  assignDeliveryPartnerToVendor,
} from "../utils/superAdminStore";
import SuperAdminNav from "./SuperAdminNav";

const SuperAdminDeliveryPartnersPage = () => {
  const [partners, setPartners] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [selectedVendorByPartner, setSelectedVendorByPartner] = useState({});
  const [assigning, setAssigning] = useState({});

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [partnerList, vendorList] = await Promise.all([
        getDraftDeliveryPartners(),
        getAllVendors(),
      ]);
      setPartners(partnerList);
      setVendors(vendorList.filter((v) => Boolean(v.vendorId)));
    } catch (err) {
      console.error("Failed to load delivery partners", err);
      setError("Unable to load delivery partners right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await loadData();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAssign = async (partner) => {
    const vendorId = selectedVendorByPartner[partner.id];
    const vendor = vendors.find((v) => v.vendorId === vendorId);
    if (!vendor) {
      setError("Pick a vendor before mapping this delivery partner.");
      return;
    }
    setError("");
    setMessage("");
    setAssigning((prev) => ({ ...prev, [partner.id]: true }));
    try {
      await assignDeliveryPartnerToVendor(partner, vendor);
      // Mapped partners flip out of Draft, so they simply drop off this
      // (Draft-only) list rather than needing a status re-fetch.
      setPartners((prev) => prev.filter((p) => p.id !== partner.id));
      setMessage(
        `${partner.deliveryPartnerName || "Delivery partner"} mapped to ${vendor.storeName || "vendor"}.`,
      );
    } catch (err) {
      console.error("Failed to map delivery partner to vendor", err);
      setError("Unable to save this mapping right now. Please try again.");
    } finally {
      setAssigning((prev) => ({ ...prev, [partner.id]: false }));
    }
  };

  const query = search.trim().toLowerCase();
  const filteredPartners = useMemo(() => {
    if (!query) return partners;
    return partners.filter((p) =>
      [p.deliveryPartnerName, p.phoneNumber, p.zipcode, p.district, p.state]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(query)),
    );
  }, [partners, query]);

  return (
    <div className="container py-4">
      <SuperAdminNav active="/superadmin/delivery-partners" />
      <h3 className="mb-1">Map Delivery Partners to Vendors</h3>
      <p className="text-muted small mb-3">
        Newly registered delivery partners land here until they're mapped to a
        vendor. Once mapped, they start receiving that vendor's orders.
      </p>

      <input
        type="text"
        className="form-control mb-4"
        placeholder="Search by name, phone, pincode, district, or state"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {message && (
        <div className="alert alert-success py-2 small" role="status">
          {message}
        </div>
      )}
      {error && (
        <div className="alert alert-danger py-2 small" role="alert">
          {error}
        </div>
      )}

      {loading && (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      {!loading && filteredPartners.length === 0 && (
        <div className="text-muted text-center py-5">
          No pending delivery partners to map right now.
        </div>
      )}

      {!loading && filteredPartners.length > 0 && (
        <div className="row g-3">
          {filteredPartners.map((partner) => (
            <div className="col-12 col-md-6 col-lg-4" key={partner.id}>
              <div className="card h-100 shadow-sm">
                <div className="card-body d-flex flex-column">
                  <h5 className="card-title mb-1">
                    {partner.deliveryPartnerName || "Unnamed partner"}
                  </h5>
                  <div className="small mb-3">
                    <div>
                      <strong>Phone:</strong> {partner.phoneNumber || "—"}
                    </div>
                    <div>
                      <strong>Address:</strong>{" "}
                      {[
                        partner.address,
                        partner.district,
                        partner.state,
                        partner.zipcode,
                      ]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </div>
                    <div>
                      <strong>License:</strong>{" "}
                      {partner.drivingLicenseNumber || "—"}
                    </div>
                  </div>

                  <div className="mt-auto">
                    <label className="form-label small text-muted mb-1">
                      Map to vendor
                    </label>
                    <div className="d-flex gap-2">
                      <select
                        className="form-select form-select-sm"
                        value={selectedVendorByPartner[partner.id] || ""}
                        onChange={(e) =>
                          setSelectedVendorByPartner((prev) => ({
                            ...prev,
                            [partner.id]: e.target.value,
                          }))
                        }
                      >
                        <option value="">Select a vendor</option>
                        {vendors.map((v) => (
                          <option key={v.vendorId} value={v.vendorId}>
                            {v.storeName || v.fullName || v.vendorId}
                          </option>
                        ))}
                      </select>
                      <button
                        className="btn btn-sm btn-primary flex-shrink-0"
                        disabled={
                          assigning[partner.id] ||
                          !selectedVendorByPartner[partner.id]
                        }
                        onClick={() => handleAssign(partner)}
                      >
                        {assigning[partner.id] ? "Mapping…" : "Map"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SuperAdminDeliveryPartnersPage;
