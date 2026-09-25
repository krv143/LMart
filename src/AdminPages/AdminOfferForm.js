import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Modal,
  Card,
  Form,
  Button,
  Row,
  Col,
  Container,
  Carousel,
} from "react-bootstrap";
import Header from "../CommonPages/Header";
import Footer from "../CommonPages/Footer";
import {
  CASHBACK_CONFIG_FOOTER,
  CASHBACK_CONFIG_HEADER,
  CASHBACK_CONFIG_TITLE,
  createLocalCashbackOffer,
} from "../utils/localCashbackOffers";

const CASHBACK_OFFERS_LIST_PATH = "/adminCashbackOffers/Admin";
const GENERAL_BANNERS_LIST_PATH = "/adminBannerList/Admin";
const createEmptyCashbackRule = () => ({
  minAmount: "",
  maxAmount: "",
  cashback: "",
});

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

const AdminOfferForm = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isDedicatedCashbackPage =
    location.pathname === "/adminCashbackOfferCreate/Admin";
  const defaultOfferType = isDedicatedCashbackPage
    ? "cashback-config"
    : "banner";
  const listPagePath = isDedicatedCashbackPage
    ? CASHBACK_OFFERS_LIST_PATH
    : GENERAL_BANNERS_LIST_PATH;
  const [formData, setFormData] = useState({
    id: "",
    offerType: defaultOfferType,
    title: isDedicatedCashbackPage ? CASHBACK_CONFIG_TITLE : "",
    header: isDedicatedCashbackPage ? CASHBACK_CONFIG_HEADER : "",
    footer: isDedicatedCashbackPage ? CASHBACK_CONFIG_FOOTER : "",
    files: [],
    createdDate: "",
    updatedDate: "",
    startDate: "",
    endDate: "",
    description: "",
  });
  const [showPreview, setShowPreview] = useState(false);
  const [previews, setPreviews] = useState([]);
  const [cashbackRules, setCashbackRules] = useState([
    createEmptyCashbackRule(),
  ]);

  // Handle Input Change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "offerType" && value === "cashback-config") {
        next.title = CASHBACK_CONFIG_TITLE;
        next.header = CASHBACK_CONFIG_HEADER;
        next.footer = CASHBACK_CONFIG_FOOTER;
        if (!serializeCashbackRules(cashbackRules)) {
          setCashbackRules([createEmptyCashbackRule()]);
        }
      }
      return next;
    });
  };

  const handleCashbackRuleChange = (index, field, value) => {
    const sanitizedValue = value.replace(/[^0-9]/g, "");
    setCashbackRules((prev) =>
      prev.map((rule, ruleIndex) =>
        ruleIndex === index ? { ...rule, [field]: sanitizedValue } : rule,
      ),
    );
  };

  const addCashbackRule = () => {
    setCashbackRules((prev) => [...prev, createEmptyCashbackRule()]);
  };

  const removeCashbackRule = (index) => {
    setCashbackRules((prev) =>
      prev.length === 1
        ? [createEmptyCashbackRule()]
        : prev.filter((_, ruleIndex) => ruleIndex !== index),
    );
  };

  // Handle File Upload (Max 5)
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);

    if (selectedFiles.length > 5) {
      alert("You can upload maximum 5 images");
      return;
    }

    setFormData({ ...formData, files: selectedFiles });

    const previewUrls = selectedFiles.map((file) => URL.createObjectURL(file));
    setPreviews(previewUrls);
  };

  const getFileByteArray = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const byteArray = new Uint8Array(reader.result);
        resolve(byteArray);
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const uploadFile = async (byteArray, fileName, mimeType) => {
    try {
      const formData = new FormData();
      formData.append(
        "file",
        new Blob([byteArray], { type: mimeType }),
        fileName,
      );
      formData.append("fileName", fileName);

      const response = await fetch(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/FileUpload/upload?filename=` + fileName,
        {
          method: "POST",
          headers: {
            Accept: "text/plain",
          },
          body: formData,
        },
      );
      const responseData = await response.text();
      return responseData || "";
    } catch (error) {
      console.error("Upload error:", error);
      return "";
    }
  };

  // Submit Form
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const isCashbackConfig = formData.offerType === "cashback-config";
      const uploadedImages = [];

      if (!isCashbackConfig) {
        for (let file of formData.files) {
          const byteArray = await getFileByteArray(file);
          const response = await uploadFile(byteArray, file.name, file.type);

          if (response) {
            uploadedImages.push(response);
          } else {
            alert("Image upload failed");
            return;
          }
        }
      }

      const serializedRules = serializeCashbackRules(cashbackRules);
      if (isCashbackConfig && !serializedRules) {
        alert("Please add at least one cashback rule.");
        return;
      }

      const payload = {
        id: formData.id || "",
        title: isCashbackConfig ? CASHBACK_CONFIG_TITLE : formData.title,
        date: "string",
        createdDate: new Date().toISOString(),
        updatedDate: new Date().toISOString(),
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        header: isCashbackConfig ? CASHBACK_CONFIG_HEADER : formData.header,
        footer: isCashbackConfig ? CASHBACK_CONFIG_FOOTER : formData.footer,
        description: isCashbackConfig ? serializedRules : formData.description,
        image: uploadedImages.map((url) => ({
          images: url,
        })),
      };

      console.log("Sending Payload:", payload);

      if (isCashbackConfig) {
        createLocalCashbackOffer({
          cashbackRules,
          startDate: formData.startDate,
          endDate: formData.endDate,
        });
      } else {
        await axios.post(
          "https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/UpLoadBannners/UploadBanners",
          payload,
        );
      }
      alert("Offer Uploaded Successfully!");
      navigate(listPagePath);
      // setFormData({
      //   id: "",
      //   header: "",
      //   footer: "",
      //   files: [],
      //   startDate: "",
      //   endDate: "",
      //   description: "",
      // });
      // setPreviews([]);
    } catch (err) {
      console.error("Error:", err);
      alert("Upload Failed");
    }
  };

  return (
    <>
      <Header />
      <Container
        fluid
        className="d-flex justify-content-center align-items-center mt-mob-50"
        style={{
          minHeight: "85vh",
          background: "linear-gradient(135deg, #f5f7fa, #e4ecf7)",
          padding: "20px",
        }}
      >
        <Card
          className="p-4"
          style={{
            width: "100%",
            maxWidth: "500px",
            borderRadius: "15px",
          }}
        >
          <h2 className="text-center mb-2 fw-bold text-primary fs-6">
            {formData.offerType === "cashback-config"
              ? "🎉 Create Cashback Offer"
              : "🎉 Create Offer"}
          </h2>
          <Form onSubmit={handleSubmit}>
            {!isDedicatedCashbackPage && (
              <Form.Group className="mb-2">
                <Form.Label className="fw-bold">Offer Type</Form.Label>
                <Form.Select
                  name="offerType"
                  value={formData.offerType}
                  onChange={handleChange}
                >
                  <option value="banner">Poster / Banner</option>
                  <option value="cashback-config">
                    Grocery Cashback Rules
                  </option>
                </Form.Select>
              </Form.Group>
            )}

            {formData.offerType === "banner" ? (
              <>
                <Form.Group className="mb-2">
                  <Form.Label className="fw-bold">Enter Header</Form.Label>
                  <Form.Control
                    type="text"
                    name="header"
                    placeholder="Enter Header"
                    value={formData.header}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-2">
                  <Form.Label className="fw-bold">Enter Title</Form.Label>
                  <Form.Control
                    type="text"
                    name="title"
                    placeholder="Enter Title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-2">
                  <Form.Label className="fw-bold">
                    Upload Images (Max 5)
                  </Form.Label>
                  <Form.Control
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    required
                  />
                </Form.Group>

                {previews.length > 0 && (
                  <div className="mb-3 text-center">
                    {previews.length === 1 ? (
                      <img
                        src={previews[0]}
                        alt="preview"
                        style={{
                          width: "100%",
                          maxHeight: "200px",
                          borderRadius: "10px",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <Carousel interval={2000}>
                        {previews.map((img, index) => (
                          <Carousel.Item key={index}>
                            <img
                              src={img}
                              alt={`slide-${index}`}
                              style={{
                                width: "100%",
                                height: "200px",
                                objectFit: "cover",
                                borderRadius: "10px",
                              }}
                            />
                          </Carousel.Item>
                        ))}
                      </Carousel>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <div
                  className="alert alert-info py-2"
                  style={{ fontSize: "13px" }}
                >
                  Create admin-managed cashback slabs here. Add one row per rule
                  such as order amount 300 gives cashback 20.
                </div>
                <Form.Group className="mb-2">
                  <Form.Label className="fw-bold">Config Title</Form.Label>
                  <Form.Control value={CASHBACK_CONFIG_TITLE} readOnly />
                </Form.Group>
                <div className="border rounded p-2 mb-3 bg-light">
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
                  {cashbackRules.map((rule, index) => (
                    <Row
                      key={`cashback-rule-${index}`}
                      className="g-2 align-items-end mb-2"
                    >
                      <Col xs={4}>
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
                      </Col>
                      <Col xs={4}>
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
                      </Col>
                      <Col xs={3}>
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
                      </Col>
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
              </>
            )}

            {/* Dates */}
            <Row>
              <Col>
                <Form.Group className="mb-2">
                  <Form.Label className="fw-bold">Start Date & Time</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>

              <Col>
                <Form.Group className="mb-2">
                  <Form.Label className="fw-bold">End Date & Time</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            {/* Footer */}
            {formData.offerType === "banner" && (
              <Form.Group className="mb-2">
                <Form.Label className="fw-bold">Enter Footer</Form.Label>
                <Form.Control
                  type="text"
                  name="footer"
                  placeholder="Enter Footer"
                  value={formData.footer}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
            )}
            {/* Description */}
            {formData.offerType === "banner" && (
              <Form.Group className="mb-2">
                <Form.Label className="fw-bold">Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="description"
                  placeholder="Enter Description"
                  value={formData.description}
                  onChange={handleChange}
                />
              </Form.Group>
            )}

            {/* Submit */}
            <Row className="mt-2">
              <Col>
                <Button
                  variant="danger"
                  className="w-100"
                  onClick={() => navigate(listPagePath)}
                >
                  Back
                </Button>
              </Col>
              <Col>
                <Button type="submit" className="btn btn-primary w-100">
                  Upload
                </Button>
              </Col>
            </Row>
          </Form>
        </Card>
      </Container>
      <Modal show={showPreview} onHide={() => setShowPreview(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Banner Preview</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <div style={{ textAlign: "center" }}>
            {/* Header */}
            <h5>{formData.header || "Header Preview"}</h5>
            {/* Image Preview */}
            {previews.length > 0 && (
              <img
                src={previews[0]}
                alt="preview"
                style={{
                  width: "100%",
                  height: "200px",
                  objectFit: "cover",
                  borderRadius: "10px",
                }}
              />
            )}
            {/* Description */}
            <p className="mt-2">
              {formData.description || "Description preview"}
            </p>
            {/* Footer */}
            <small>{formData.footer || "Footer Preview"}</small>
          </div>
        </Modal.Body>
      </Modal>
      <Footer />
    </>
  );
};

export default AdminOfferForm;
