import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { confirmDialog } from "../CommonPages/DialogSystem";
import { FaEdit, FaTrash, FaEye } from "react-icons/fa";
// import { appConfig } from "./config";

const AdminProductList = () => {
  const [productData, setProductData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [catalogues, setCatalogues] = useState([]);
  const [status, setStatus] = useState([]);
  const [category, setCategory] = useState("");
  const [productstatus, setproductstatus] = useState("");
  const [catalogue, setCatalogue] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const rowsPerPage = 15;
  const navigate = useNavigate();

  // Fetch product data, categories, and catalogues
  useEffect(() => {
    setLoading(true);
    const url = `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/Product/GetAdminProductList?ProductOwnedBy=Admin`;
    axios
      .get(url)
      .then((response) => {
        const products = response.data.map((product) => ({
          ...product,
          afterDiscountPrice: product.discount
            ? product.rate - (product.rate * product.discount) / 100
            : product.rate,
        }));
        setProductData(products);
        setFilteredData(products);

        // Extract unique categories, catalogues, and status
        const uniqueCategories = [
          ...new Set(products.map((product) => product.category)),
        ];
        const uniqueCatalogues = [
          ...new Set(products.map((product) => product.catalogue)),
        ];
        const uniqueStatus = [
          ...new Set(products.map((product) => product.productStatus)),
        ];
        setCategories(uniqueCategories);
        setCatalogues(uniqueCatalogues);
        setStatus(uniqueStatus);
      })
      .catch((error) => {
        console.error("Error fetching product data:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Handle delete functionality
  const handleDelete = async (productId) => {
    const confirmDelete = await confirmDialog(
      "Are you sure you want to delete this product?",
    );
    if (confirmDelete) {
      axios
        .delete(`https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/Product/${productId}`)
        .then(() => {
          setProductData((prevData) =>
            prevData.filter((product) => product.id !== productId),
          );
          setFilteredData((prevData) =>
            prevData.filter((product) => product.id !== productId),
          );
        })
        .catch((error) => {
          console.error("Error deleting product:", error);
        });
    }
  };

  // Filter data based on selected category and catalogue
  useEffect(() => {
    let filtered = productData;
    if (category) {
      filtered = filtered.filter((product) => product.category === category);
    }
    if (catalogue) {
      filtered = filtered.filter((product) => product.catalogue === catalogue);
    }
    if (productstatus) {
      filtered = filtered.filter(
        (product) => product.productStatus === productstatus,
      );
    }
    if (searchTerm) {
      filtered = filtered.filter((product) =>
        product.productName.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }
    setFilteredData(filtered);
    setCurrentPage(1);
  }, [category, catalogue, productstatus, searchTerm, productData]);

  const indexOfLastProduct = currentPage * rowsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - rowsPerPage;
  const currentProducts = filteredData.slice(
    indexOfFirstProduct,
    indexOfLastProduct,
  );

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mt-mob-50">
      <h2 className="text-center">All Products</h2>
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
            {categories.map((categoryOption, index) => (
              <option key={index} value={categoryOption}>
                {categoryOption}
              </option>
            ))}
          </select>
        </div>

        {/* Catalogue */}
        <div className="form-group col-md-2 m-2 mb-3">
          <label>Catalogues</label>
          <select
            className="form-control"
            value={catalogue}
            onChange={(e) => setCatalogue(e.target.value)}
          >
            <option value="">All Catalogues</option>
            {catalogues.map((catalogueOption, index) => (
              <option key={index} value={catalogueOption}>
                {catalogueOption}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div className="form-group col-md-2 m-2 mb-3">
          <label>Product Status</label>
          <select
            className="form-control"
            value={productstatus}
            onChange={(e) => setproductstatus(e.target.value)}
          >
            <option value="">All Product Status</option>
            {status.map((statusoption, index) => (
              <option key={index} value={statusoption}>
                {statusoption}
              </option>
            ))}
          </select>
        </div>

        {/* Add New Product Button */}
        <div className="d-flex justify-content-end col-md-6 mb-1 gap-2">
          <button
            className="btn btn-success"
            onClick={() => navigate(`/adminUploadForm/Admin`)}
          >
            Add New Product
          </button>
        </div>
      </div>

      {filteredData.length === 0 ? (
        <div className="text-center my-5">
          <h4>No Products Available</h4>
        </div>
      ) : (
        <>
          <table className="table table-bordered">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Price</th>
                <th>Discount</th>
                <th>After Discount Price</th>
                <th>Requested By</th>
                <th>Stock Left</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentProducts.map((product, index) => (
                <tr key={index}>
                  <td className="product-name-cell">{product.productName}</td>
                  <td>₹{product.rate}</td>
                  <td>
                    {product.discount
                      ? `${Math.round(product.discount)}%`
                      : "No discount"}
                  </td>
                  <td>₹{product.afterDiscountPrice.toFixed(0) || "N/A"}</td>
                  <td>
                    {product.productOwnedBy ? (
                      <span
                        style={{
                          textDecoration: "underline",
                          color: "blue",
                          cursor: "pointer",
                        }}
                        title={product.productOwnedBy}
                      >
                        {product.productOwnedBy}
                      </span>
                    ) : (
                      "N/A"
                    )}
                  </td>
                  <td>
                    {product.numberOfStockAvailable <= 0
                      ? "No Stock"
                      : product.numberOfStockAvailable}
                  </td>
                  <td className="actions-cell">
                    <Link
                      to={`/adminUpdateProduct/${product.id}/Admin`}
                      className="btn btn-warning"
                      title="Edit"
                    >
                      <FaEdit />
                    </Link>
                    <Link
                      to={`/adminProductApproval/${product.id}/Admin`}
                      className="btn btn-info mx-2"
                      title="View"
                    >
                      <FaEye />
                    </Link>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="btn btn-danger"
                      title="Delete"
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

export default AdminProductList;
