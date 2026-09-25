import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { confirmDialog } from "../CommonPages/DialogSystem";
import {
  Table,
  Button,
  Modal,
  Carousel,
  Spinner,
  Form,
  Row,
  Col,
} from "react-bootstrap";
import Header from "../CommonPages/Header";
import Footer from "../CommonPages/Footer";
import { useNavigate } from "react-router-dom";

const CASHBACK_CONFIG_TITLE = "Grocery Cashback Rules";
const CASHBACK_CONFIG_HEADER = "cashback-config";
const createEmptyCashbackRule = () => ({
  minAmount: "",
  maxAmount: "",
  cashback: "",
});

const isCashbackConfigBanner = (banner) =>
  String(banner?.header || "")
    .trim()
    .toLowerCase() === CASHBACK_CONFIG_HEADER;

const parseCashbackRules = (value) => {
  if (!value) return [];

  return String(value)
    .split(/\r?\n|;/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(
        /^(?:>=\s*)?(\d+)(?:\s*-\s*(\d+)|\s*\+)?\s*[:=,>]\s*(\d+)$/,
      );
      if (!match) return null;
      return {
        minAmount: match[1] || "",
        maxAmount: match[2] || "",
        cashback: match[3] || "",
      };
    })
    .filter(Boolean);
};

const serializeCashbackRules = (rules) =>
  rules
    .map((rule) => ({
      minAmount: String(rule.minAmount || "").trim(),
      maxAmount: String(rule.maxAmount || "").trim(),
      cashback: String(rule.cashback || "").trim(),
    }))
    .filter((rule) => rule.minAmount && rule.cashback)
    .map((rule) =>
      rule.maxAmount
        ? `${rule.minAmount}-${rule.maxAmount}=${rule.cashback}`
        : `${rule.minAmount}=${rule.cashback}`,
    )
    .join("\n");

const BannerList = () => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;
  const [bannersList, setBannersList] = useState([]);
  const [selectedBanner, setSelectedBanner] = useState(null);
  const [bannerImages, setBannerImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editBanner, setEditBanner] = useState({
    id: "",
    title: "",
    description: "",
    header: "",
    footer: "",
    offerType: "banner",
    cashbackRules: [createEmptyCashbackRule()],
    createdDate: "",
    updatedDate: "",
    startDate: "",
    endDate: "",
    image: [],
  });

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        "https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/UpLoadBannners/GetBanners",
      );
      setBannersList(res.data || []);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch banners");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentBanners = useMemo(
    () => bannersList.slice(indexOfFirst, indexOfLast),
    [bannersList, indexOfFirst, indexOfLast],
  );

  const fetchBannerImages = async (banner) => {
    const imageRequests =
      banner.image?.map((photo) =>
        fetch(
          `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/FileUpload/download?generatedfilename=${photo.images}`,
        )
          .then((res) => res.json())
          .then((data) => ({
            src: photo.images,
            imageData: data.imageData,
          })),
      ) || [];

    return await Promise.all(imageRequests);
  };

  const handleView = async (banner) => {
    try {
      setSelectedBanner(banner);
      const images = await fetchBannerImages(banner);
      setBannerImages(images);
      setShowViewModal(true);
    } catch (err) {
      console.error(err);
      alert("Unable to load banner images");
    }
  };

  const handleEdit = async (banner) => {
    try {
      const images = await fetchBannerImages(banner);
      setBannerImages(images);
      const cashbackRules = parseCashbackRules(banner.description);
      const isCashbackConfig = isCashbackConfigBanner(banner);

      setEditBanner({
        id: banner.id,
        title: banner.title || "",
        description: banner.description || "",
        header: banner.header || "",
        footer: banner.footer || "",
        offerType: isCashbackConfig ? "cashback-config" : "banner",
        cashbackRules:
          isCashbackConfig && cashbackRules.length > 0
            ? cashbackRules
            : [createEmptyCashbackRule()],
        startDate: banner.startDate?.slice(0, 16),
        endDate: banner.endDate?.slice(0, 16),
        image: banner.image || [],
      });
      setShowEditModal(true);
    } catch (err) {
      console.error(err);
      alert("Failed to load banner data");
    }
  };

  const handleDelete = async (id) => {
    if (!(await confirmDialog("Delete this banner?"))) return;
    try {
      await axios.delete(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/UpLoadBannners/DeleteBanner/${id}`,
      );
      alert("Banner deleted successfully");
      fetchBanners();
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  };

  const handleCashbackRuleChange = (index, field, value) => {
    const sanitizedValue = value.replace(/[^0-9]/g, "");
    setEditBanner((prev) => ({
      ...prev,
      cashbackRules: prev.cashbackRules.map((rule, ruleIndex) =>
        ruleIndex === index ? { ...rule, [field]: sanitizedValue } : rule,
      ),
    }));
  };

  const addCashbackRule = () => {
    setEditBanner((prev) => ({
      ...prev,
      cashbackRules: [...prev.cashbackRules, createEmptyCashbackRule()],
    }));
  };

  const removeCashbackRule = (index) => {
    setEditBanner((prev) => ({
      ...prev,
      cashbackRules:
        prev.cashbackRules.length === 1
          ? [createEmptyCashbackRule()]
          : prev.cashbackRules.filter((_, ruleIndex) => ruleIndex !== index),
    }));
  };

  const handleUpdate = async () => {
    try {
      const isCashbackConfig = editBanner.offerType === "cashback-config";
      const serializedRules = serializeCashbackRules(
        editBanner.cashbackRules || [],
      );
      if (isCashbackConfig && !serializedRules) {
        alert("Please add at least one cashback rule.");
        return;
      }

      const payload = {
        id: editBanner.id,
        title: isCashbackConfig ? CASHBACK_CONFIG_TITLE : editBanner.title,
        description: isCashbackConfig
          ? serializedRules
          : editBanner.description,
        header: isCashbackConfig ? CASHBACK_CONFIG_HEADER : editBanner.header,
        footer: isCashbackConfig
          ? "Admin-managed cashback thresholds"
          : editBanner.footer,
        createdDate: editBanner.createdDate,
        updatedDate: new Date(),
        startDate: editBanner.startDate,
        endDate: editBanner.endDate,
        image: editBanner.image,
      };

      await axios.put(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/UpLoadBannners/UpdateBannerDetails?id=${editBanner.id}`,
        payload,
      );

      alert("Banner updated successfully");
      setShowEditModal(false);
      fetchBanners();
    } catch (err) {
      console.error(err);
      alert("Update failed");
    }
  };

  return (
    <>
      <Header />

      <div
        className="container"
        style={{ paddingTop: "80px", marginTop: "10px" }}
      >
        <div className="position-relative mb-3" style={{ height: "50px" }}>
          <h3
            className="text-center m-0"
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              width: "100%",
            }}
          >
            All Banners List
          </h3>

          <button
            className="btn btn-success"
            style={{ position: "absolute", right: 0 }}
            onClick={() => navigate("/adminOfferModal/Admin")}
          >
            Upload Poster
          </button>
        </div>

        {loading ? (
          <div className="text-center">
            <Spinner animation="border" />
          </div>
        ) : (
          <Table bordered hover responsive>
            <thead style={{ backgroundColor: "#cfe2d9" }}>
              <tr>
                <th>S.No</th>
                <th>Title</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>View</th>
                <th>Edit</th>
                <th>Delete</th>
              </tr>
            </thead>

            <tbody>
              {currentBanners.map((banner, index) => (
                <tr key={banner.id}>
                  <td>{indexOfFirst + index + 1}</td>
                  <td>{banner.title}</td>
                  <td>{new Date(banner.startDate).toLocaleString()}</td>
                  <td>{new Date(banner.endDate).toLocaleString()}</td>

                  <td>
                    <Button size="sm" onClick={() => handleView(banner)}>
                      View
                    </Button>
                  </td>

                  <td>
                    <Button
                      variant="warning"
                      size="sm"
                      onClick={() => handleEdit(banner)}
                    >
                      Edit
                    </Button>
                  </td>

                  <td>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(banner.id)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>

      {/* VIEW MODAL */}
      <Modal
        show={showViewModal}
        onHide={() => setShowViewModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Banner Details</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {selectedBanner && (
            <>
              <h4>{selectedBanner.title}</h4>

              {isCashbackConfigBanner(selectedBanner) ? (
                <div className="mb-3">
                  <strong>Cashback Rules:</strong>
                  <Table bordered size="sm" className="mt-2 mb-0">
                    <thead>
                      <tr>
                        <th>Min Amount</th>
                        <th>Max Amount</th>
                        <th>Cashback</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parseCashbackRules(selectedBanner.description).map(
                        (rule, index) => (
                          <tr key={`view-rule-${index}`}>
                            <td>{rule.minAmount}</td>
                            <td>{rule.maxAmount || "No limit"}</td>
                            <td>{rule.cashback}</td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <p>
                  <strong>Description:</strong> {selectedBanner.description}
                </p>
              )}
              <p>
                <strong>Start:</strong>{" "}
                {new Date(selectedBanner.startDate).toLocaleString()}
              </p>
              <p>
                <strong>End:</strong>{" "}
                {new Date(selectedBanner.endDate).toLocaleString()}
              </p>

              <Carousel>
                {bannerImages.map((img, i) => (
                  <Carousel.Item key={i}>
                    <img
                      src={`data:image/jpeg;base64,${img.imageData}`}
                      alt=""
                      style={{
                        width: "100%",
                        height: "350px",
                        objectFit: "contain",
                      }}
                    />
                  </Carousel.Item>
                ))}
              </Carousel>
            </>
          )}
        </Modal.Body>
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Edit Banner</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>Title</Form.Label>
              <Form.Control
                value={
                  editBanner.offerType === "cashback-config"
                    ? CASHBACK_CONFIG_TITLE
                    : editBanner.title
                }
                readOnly={editBanner.offerType === "cashback-config"}
                onChange={(e) =>
                  setEditBanner({ ...editBanner, title: e.target.value })
                }
              />
            </Form.Group>

            {editBanner.offerType === "cashback-config" ? (
              <div className="border rounded p-2 my-3 bg-light">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <Form.Label className="fw-bold mb-0">
                    Cashback Slabs
                  </Form.Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="success"
                    onClick={addCashbackRule}
                  >
                    Add Row
                  </Button>
                </div>
                {editBanner.cashbackRules.map((rule, index) => (
                  <Row
                    key={`edit-cashback-rule-${index}`}
                    className="g-2 align-items-end mb-2"
                  >
                    <Form.Group as={Col} xs={4}>
                      <Form.Label className="small fw-bold">
                        Min Amount
                      </Form.Label>
                      <Form.Control
                        type="text"
                        inputMode="numeric"
                        value={rule.minAmount}
                        onChange={(e) =>
                          handleCashbackRuleChange(
                            index,
                            "minAmount",
                            e.target.value,
                          )
                        }
                        placeholder="300"
                      />
                    </Form.Group>
                    <Form.Group as={Col} xs={4}>
                      <Form.Label className="small fw-bold">
                        Max Amount
                      </Form.Label>
                      <Form.Control
                        type="text"
                        inputMode="numeric"
                        value={rule.maxAmount}
                        onChange={(e) =>
                          handleCashbackRuleChange(
                            index,
                            "maxAmount",
                            e.target.value,
                          )
                        }
                        placeholder="Optional"
                      />
                    </Form.Group>
                    <Form.Group as={Col} xs={3}>
                      <Form.Label className="small fw-bold">
                        Cashback
                      </Form.Label>
                      <Form.Control
                        type="text"
                        inputMode="numeric"
                        value={rule.cashback}
                        onChange={(e) =>
                          handleCashbackRuleChange(
                            index,
                            "cashback",
                            e.target.value,
                          )
                        }
                        placeholder="20"
                      />
                    </Form.Group>
                    <Col xs={1} className="d-flex justify-content-end">
                      <Button
                        type="button"
                        variant="outline-danger"
                        size="sm"
                        onClick={() => removeCashbackRule(index)}
                      >
                        ×
                      </Button>
                    </Col>
                  </Row>
                ))}
              </div>
            ) : (
              <Form.Group>
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={editBanner.description}
                  onChange={(e) =>
                    setEditBanner({
                      ...editBanner,
                      description: e.target.value,
                    })
                  }
                />
              </Form.Group>
            )}

            <Form.Group>
              <Form.Label>Start Date & Time</Form.Label>
              <Form.Control
                type="datetime-local"
                value={editBanner.startDate}
                onChange={(e) =>
                  setEditBanner({
                    ...editBanner,
                    startDate: e.target.value,
                  })
                }
              />
            </Form.Group>

            <Form.Group>
              <Form.Label>End Date & Time</Form.Label>
              <Form.Control
                type="datetime-local"
                value={editBanner.endDate}
                onChange={(e) =>
                  setEditBanner({
                    ...editBanner,
                    endDate: e.target.value,
                  })
                }
              />
            </Form.Group>

            <Carousel className="mt-3">
              {bannerImages.map((img, i) => (
                <Carousel.Item key={i}>
                  <img
                    src={`data:image/jpeg;base64,${img.imageData}`}
                    alt=""
                    style={{
                      width: "100%",
                      height: "300px",
                      objectFit: "contain",
                    }}
                  />
                </Carousel.Item>
              ))}
            </Carousel>
          </Form>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button variant="success" onClick={handleUpdate}>
            Update
          </Button>
        </Modal.Footer>
      </Modal>
      {/* Pagination */}
      <div className="d-flex justify-content-center mt-3">
        <nav aria-label="Page navigation">
          <ul className="pagination">
            <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
              <button
                className="page-link"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              >
                &laquo;
              </button>
            </li>
            {Array.from(
              { length: Math.ceil(bannersList.length / rowsPerPage) },
              (_, i) => i + 1,
            )
              .filter(
                (page) =>
                  page === 1 ||
                  page === Math.ceil(bannersList.length / rowsPerPage) ||
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
                currentPage === Math.ceil(bannersList.length / rowsPerPage)
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
                      Math.ceil(bannersList.length / rowsPerPage),
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
      <Footer />
    </>
  );
};

export default BannerList;
