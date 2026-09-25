import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { FaEdit, FaTrash, FaEye } from "react-icons/fa";
import { confirmDialog } from "../CommonPages/DialogSystem";
// import { appConfig } from "./config";

const AdminGroceryList = () => {
  const [loading, setLoading] = useState(true);
  const [finalGroceries, setFinalGroceries] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [statusList, setStatusList] = useState([]);
  const [category, setCategory] = useState("");
  const [grocerystatus, setGrocerystatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const rowsPerPage = 15;
  const navigate = useNavigate();
  const toInt = (v) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : 0;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const url = `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/UploadGrocery/GetAllGroceryItemsForAdmin`;
        const { data } = await axios.get(url);
        const groceries = (Array.isArray(data) ? data : []).map((g) => ({
          ...g,
          name: (g.name || "").trim(),
          mrp: parseFloat(g.mrp) || 0,
          discount: parseFloat(g.discount) || 0,
          afterDiscount: parseFloat(g.afterDiscount) || 0,
          stockLeft: toInt(g.stockLeft),
          category: g.category ?? "",
          status: g.status ?? "",
          expireDate: g.expireDate ?? "",
          manufactureDate: g.manufactureDate ?? "",
        }));
        groceries.sort((a, b) => a.name.localeCompare(b.name));
        if (cancelled) return;
        setFinalGroceries(groceries);
        setFilteredData(groceries);
        setCategories(
          [...new Set(groceries.map((p) => p.category).filter(Boolean))].sort(),
        );
        setStatusList(
          [...new Set(groceries.map((p) => p.status).filter(Boolean))].sort(),
        );
      } catch (e) {
        console.error("Error fetching grocery data:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDelete = async (groceryId) => {
    if (!(await confirmDialog("Are you sure you want to delete this grocery?")))
      return;
    try {
      await axios.delete(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/UploadGrocery?id=${groceryId}`,
      );
      const prune = (arr) => arr.filter((g) => g.id !== groceryId);
      setFinalGroceries((prev) => prune(prev));
      setFilteredData((prev) => prune(prev));
    } catch (e) {
      console.error("Error deleting grocery:", e);
    }
  };

  useEffect(() => {
    let filtered = finalGroceries;
    if (category) {
      filtered = filtered.filter((g) => g.category === category);
    }
    if (grocerystatus) {
      filtered = filtered.filter((g) => g.status === grocerystatus);
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter((g) => g.name.toLowerCase().includes(q));
    }
    setFilteredData(filtered);
    setCurrentPage(1);
  }, [category, grocerystatus, searchTerm, finalGroceries]);

  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentGrocery = useMemo(
    () => filteredData.slice(indexOfFirst, indexOfLast),
    [filteredData, indexOfFirst, indexOfLast],
  );

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container my-2 ">
      <h2 className="text-center mb-2 mt-mob-50">All Grocery</h2>
      {/* Search Bar */}
      <div className="form-group col-md-3">
        <label>Search Products Here</label>
        <input
          type="text"
          className="form-control"
          placeholder="Search by product name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Filters + Add */}
      <div className="d-flex align-items-center justify-content-between">
        {/* Category */}
        <div className="form-group text-start col-md-2 m-2 ml-2 mb-3">
          <label>Category</label>
          <select
            className="form-control"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c, i) => (
              <option key={i} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div className="form-group">
          <label>Grocery Status</label>
          <select
            className="form-control"
            value={grocerystatus}
            onChange={(e) => setGrocerystatus(e.target.value)}
          >
            <option value="">All Grocery Status</option>
            {statusList.map((s, i) => (
              <option key={i} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Add New Product */}
        <div className="d-flex justify-content-end align-items-center col-md-6">
          <button
            className="btn btn-success"
            onClick={() => navigate(`/adminUploadGrocery/Admin`)}
          >
            Add New Grocery
          </button>
        </div>
      </div>

      {filteredData.length === 0 ? (
        <div className="text-center mt-5">
          <h4>No {category || ""} Grocery Items Available</h4>
        </div>
      ) : (
        <>
          <table className="table table-bordered">
            <thead>
              <tr>
                <th>Grocery Name</th>
                <th>Price</th>
                <th>Discount</th>
                <th>Discount Price</th>
                <th>Requested By</th>
                <th>MFG Date</th>
                <th>EXP Date</th>
                <th>Stock Left</th>
                <th>code</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {currentGrocery.map((g, index) => (
                <tr key={g.id ?? index}>
                  <td className="product-name-cell">{g.name}</td>
                  <td>₹{Math.round(g.mrp)}</td>
                  <td className="fw-bold">
                    {g.discount ? `${Math.round(g.discount)}%` : "No discount"}
                  </td>
                  <td>₹{Math.round(g.afterDiscount)}</td>
                  <td>
                    {g.requestedBy ? (
                      <span
                        style={{
                          textDecoration: "underline",
                          color: "blue",
                          cursor: "pointer",
                        }}
                        title={g.requestedBy}
                      >
                        {g.requestedBy}
                      </span>
                    ) : (
                      "N/A"
                    )}
                  </td>
                  <td>{g.manufactureDate}</td>
                  <td>{g.expireDate}</td>
                  <td>
                    {(Number(g.stockLeft) || 0) <= 0
                      ? "No Stock"
                      : Number(g.stockLeft)}
                  </td>
                  <td>{g.code}</td>
                  <td className="d-flex">
                    <Link
                      to={`/adminUpdateGrocery/${g.id}/Admin`}
                      className="btn btn-warning m-1"
                    >
                      <FaEdit />
                    </Link>
                    <Link
                      to={`/adminGroceryApproval/${g.id}/Admin`}
                      className="btn btn-info m-1"
                    >
                      <FaEye />
                    </Link>
                    <button
                      onClick={() => handleDelete(g.id)}
                      className="btn btn-danger m-1"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="d-flex justify-content-center mt-3">
            <nav aria-label="Page navigation">
              <ul className="pagination">
                <li
                  className={`page-item ${currentPage === 1 ? "disabled" : ""}`}
                >
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  >
                    &laquo;
                  </button>
                </li>
                {Array.from(
                  { length: Math.ceil(filteredData.length / rowsPerPage) },
                  (_, i) => i + 1,
                )
                  .filter(
                    (page) =>
                      page === 1 ||
                      page === Math.ceil(filteredData.length / rowsPerPage) ||
                      (page >= currentPage - 2 && page <= currentPage + 2),
                  )
                  .map((page, i, arr) => {
                    const prevPage = arr[i - 1];
                    if (prevPage && page - prevPage > 1) {
                      return (
                        <React.Fragment key={page}>
                          <li className="page-item disabled">
                            <span className="page-link">...</span>
                          </li>
                          <li
                            className={`page-item ${page === currentPage ? "active" : ""}`}
                          >
                            <button
                              className="page-link"
                              onClick={() => setCurrentPage(page)}
                            >
                              {page}
                            </button>
                          </li>
                        </React.Fragment>
                      );
                    }
                    return (
                      <li
                        key={page}
                        className={`page-item ${page === currentPage ? "active" : ""}`}
                      >
                        <button
                          className="page-link"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </button>
                      </li>
                    );
                  })}
                <li
                  className={`page-item ${
                    currentPage === Math.ceil(filteredData.length / rowsPerPage)
                      ? "disabled"
                      : ""
                  }`}
                >
                  <button
                    className="page-link"
                    onClick={() =>
                      setCurrentPage((p) =>
                        Math.min(
                          p + 1,
                          Math.ceil(filteredData.length / rowsPerPage),
                        ),
                      )
                    }
                  >
                    &raquo;
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminGroceryList;
