import React, { useEffect, useState, useRef } from "react";
import { Modal, Button, Carousel } from "react-bootstrap";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import Banner1 from "../img/BannerModal.jpg";
import "../App.css";

const BLOB_BASE_URL =
  "https://lmartfiles.blob.core.windows.net/userattechements";

const getAzureImageUrl = (imageName) => {
  if (!imageName) return "";

  if (
    typeof imageName === "string" &&
    (imageName.startsWith("http://") ||
      imageName.startsWith("https://"))
  ) {
    return imageName;
  }

  // Remove leading /
  const cleanName = String(imageName).replace(/^\/+/, "");

  return `${BLOB_BASE_URL}/${encodeURIComponent(cleanName)}`;
};

const OffersBannerModal = () => {
  const [showOffersModal, setShowOffersModal] = useState(false);
  const [offersData, setOffersData] = useState([]);
  const [offerImages, setOfferImages] = useState({});
  const [currentTime] = useState(new Date());
  const hasClosedRef = useRef(false);
  const [imagesLoading, setImagesLoading] = useState(true);
  useEffect(() => {
    setShowOffersModal(true);
  }, []);

  // 🔹 Fetch banners
  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const res = await axios.get(
          "https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/UpLoadBannners/GetBanners",
        );
        setOffersData(res.data);
      } catch (err) {
        console.error("Error fetching offers:", err);
      }
    };
    fetchOffers();
  }, []);

  useEffect(() => {
  if (!offersData.length) return;

  setImagesLoading(true);

  const imagesMap = {};

  offersData.forEach((offer) => {
    const images = Array.isArray(offer.image)
      ? offer.image
      : [];

    const imageUrls = images
      .map((imgObj) => {
        const filename =
          typeof imgObj === "string"
            ? imgObj
            : imgObj?.images;

        return getAzureImageUrl(filename);
      })
      .filter(Boolean);

    imagesMap[String(offer.id)] = imageUrls;
  });

  setOfferImages(imagesMap);
  setImagesLoading(false);
}, [offersData]);

  // 🔹 Active offers filter
  const activeOffers = offersData.filter((offer) => {
    const start = new Date(offer.startDate);
    const end = new Date(offer.endDate);
    return currentTime >= start && currentTime <= end;
  });

  const handleClose = () => {
    hasClosedRef.current = true;
    setShowOffersModal(false);
  };

  // 🔹 Control modal visibility
  useEffect(() => {
    if (offersData.length > 0 && !hasClosedRef.current) {
      const hasActive = offersData.some((offer) => {
        const start = new Date(offer.startDate);
        const end = new Date(offer.endDate);
        return currentTime >= start && currentTime <= end;
      });
      setShowOffersModal(hasActive);
    }
  }, [offersData, currentTime]);

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Modal
      show={showOffersModal}
      onHide={handleClose}
      centered
      size="lg"
      scrollable
      dialogClassName="offers-modal"
    >
      <Modal.Header closeButton>
        <Modal.Title style={{ fontSize: "15px", fontWeight: "bold" }}>
          🎉 {activeOffers[0]?.title || "Special Offers"}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {imagesLoading ? (
          <div
            style={{
              height: "300px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background:
                "linear-gradient(135deg, #fff8f0 0%, #fff3e0 50%, #fce4ec 100%)",
              borderRadius: "10px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Top shimmer bar */}
            <div
              className="banner-shimmer-bar"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "4px",
              }}
            />

            {/* Background shimmer skeleton rows */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                opacity: 0.1,
                padding: "10px",
              }}
            >
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="banner-shimmer-bar"
                  style={{
                    height: "50px",
                    marginBottom: "8px",
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>

            {/* Outer spinning ring */}
            <div
              className="banner-spin-outer"
              style={{
                width: "140px",
                height: "140px",
                borderRadius: "50%",
                border: "4px solid transparent",
                borderTop: "4px solid #ff5722",
                borderRight: "4px solid #ff9800",
                position: "absolute",
              }}
            />

            {/* Inner spinning ring (reverse) */}
            <div
              className="banner-spin-inner"
              style={{
                width: "112px",
                height: "112px",
                borderRadius: "50%",
                border: "3px solid transparent",
                borderBottom: "3px solid #ffc107",
                borderLeft: "3px solid #e91e63",
                position: "absolute",
              }}
            />

            {/* Logo center with pulse glow */}
            <div
              className="banner-pulse-glow"
              style={{
                width: "84px",
                height: "84px",
                borderRadius: "50%",
                background: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                position: "relative",
                zIndex: 2,
              }}
            >
              <img
                src={Banner1}
                alt="Loading Logo"
                style={{
                  width: "76px",
                  height: "76px",
                  objectFit: "contain",
                  borderRadius: "50%",
                }}
              />
            </div>

            {/* badge */}
            <div
              className="banner-float-badge"
              style={{
                marginTop: "104px",
                background: "linear-gradient(90deg, #ff5722, #ff9800)",
                color: "#fff",
                fontWeight: "700",
                fontSize: "12px",
                letterSpacing: "2px",
                padding: "5px 16px",
                borderRadius: "20px",
                boxShadow: "0 4px 14px rgba(255,87,34,0.35)",
                position: "relative",
                zIndex: 2,
              }}
            >
              🎉 Please Wait Offers Loading ..
            </div>

            {/* Bouncing dots */}
            <div
              style={{
                marginTop: "14px",
                display: "flex",
                alignItems: "flex-end",
                height: "28px",
                position: "relative",
                zIndex: 2,
              }}
            >
              <span className="banner-dot" style={{ background: "#ff5722" }} />
              <span
                className="banner-dot"
                style={{ background: "#ff9800", animationDelay: "0.16s" }}
              />
              <span
                className="banner-dot"
                style={{ background: "#ffc107", animationDelay: "0.32s" }}
              />
            </div>

            {/* Bottom shimmer bar */}
            <div
              className="banner-shimmer-bar"
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "4px",
              }}
            />
          </div>
        ) : activeOffers.length === 0 ? (
          <div
            style={{
              height: "250px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              fontWeight: "bold",
              color: "red",
            }}
          >
            Offer has expired ⏳
          </div>
        ) : (
          (() => {
            const allImages = activeOffers.flatMap(
              (offer) => offerImages[String(offer.id)] || [],
            );

            return (
              <>
                {/* Slider */}
                <Carousel
                  interval={2000}
                  indicators={false}
                  controls={true}
                  pause={false}
                  touch={true}
                >
                  {allImages.map((img, index) => (
                    <Carousel.Item key={index}>
                      <img
                        src={img}
                        alt={`offer-${index}`}
                          loading="lazy"
                          decoding="async"
                        style={{
                          width: "100%",
                          height: window.innerWidth <= 768 ? "400px" : "500px",
                          objectFit: "contain",
                          borderRadius: "10px",
                          background: "#fff",
                        }}
                      />
                    </Carousel.Item>
                  ))}
                </Carousel>

                <p
                  className="blinking-text"
                  style={{
                    textAlign: "center",
                    color: "red",
                    fontSize: "12px",
                    fontWeight: "400",
                    marginTop: "10px",
                  }}
                >
                  Offer valid till: {formatDateTime(activeOffers[0]?.endDate)}
                </p>

                <p
                  style={{
                    textAlign: "start",
                    color: "red",
                    fontSize: "12px",
                    fontWeight: "400",
                  }}
                >
                  {activeOffers[0]?.description}
                </p>
              </>
            );
          })()
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="success" onClick={handleClose}>
          Shop Now 🛒
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default OffersBannerModal;
