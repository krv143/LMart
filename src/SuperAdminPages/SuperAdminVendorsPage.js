import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllVendors } from "../utils/superAdminStore";
import SuperAdminNav from "./SuperAdminNav";

const SuperAdminVendorsPage = () => {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const list = await getAllVendors();
        if (!cancelled) setVendors(list);
      } catch (err) {
        console.error("Failed to load vendors", err);
        if (!cancelled) setError("Unable to load vendors right now. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const query = search.trim().toLowerCase();
  const filteredVendors = !query
    ? vendors
    : vendors.filter((v) =>
        [v.storeName, v.fullName, v.mobileNumber, v.address]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(query))
      );

  return (
    <div className="container py-4">
      <SuperAdminNav active="/superadmin/vendors" />
      <h3 className="mb-3">Vendors</h3>

      <input
        type="text"
        className="form-control mb-4"
        placeholder="Search by store, owner, mobile, or address"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading && (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      {!loading && error && <div className="alert alert-danger">{error}</div>}

      {!loading && !error && filteredVendors.length === 0 && (
        <div className="text-muted text-center py-5">No vendors found.</div>
      )}

      {!loading && !error && filteredVendors.length > 0 && (
        <div className="row g-3">
          {filteredVendors.map((v) => {
            const hasVendorId = Boolean(v.vendorId);
            return (
              <div className="col-12 col-sm-6 col-lg-4" key={v.id || v.vendorId}>
                <div
                  className="card h-100 shadow-sm"
                  role="button"
                  style={{ cursor: hasVendorId ? "pointer" : "not-allowed", opacity: hasVendorId ? 1 : 0.6 }}
                  onClick={() => hasVendorId && navigate(`/superadmin/vendor/${v.vendorId}/products`)}
                >
                  <div className="card-body">
                    <h5 className="card-title mb-1">{v.storeName || "Unnamed store"}</h5>
                    <div className="text-muted small mb-2">{v.fullName}</div>
                    <div className="small">
                      <div>
                        <strong>Mobile:</strong> {v.mobileNumber || "—"}
                      </div>
                      <div>
                        <strong>Address:</strong> {v.address || "—"}
                      </div>
                    </div>
                    {!hasVendorId && (
                      <span className="badge bg-secondary mt-2">No vendor ID — can't view products</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SuperAdminVendorsPage;

