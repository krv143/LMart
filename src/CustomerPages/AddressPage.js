import React, { useState, useEffect, useCallback } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { Form, Button } from "react-bootstrap";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import Header from "../CommonPages/Header.js";
import Footer from "../CommonPages/Footer.js";

const AddressPage = () => {
  const navigate = useNavigate();
  const { userType, userId } = useParams();
 const [stateId, setStateId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressData, setAddressData] = useState(null);
  // const [district, setDistrict] = useState("");
  // const [state, setState] = useState("");
  const [addressForm, setAddressForm] = useState({
    fullName: "",
    mobileNumber: "",
    address: "",
    state: "",
    stateId: "",
    district: "",
    districtId: "",
    zipCode: "",
  });
const [districtList, setDistrictList] = useState([]);
const [stateList, setStateList] = useState([]);
const [statesLoading, setStatesLoading] = useState(false);
const [districtsLoading, setDistrictsLoading] =  useState(false);
const [pincodeList, setPincodeList] =  useState([]);
const [pincodesLoading, setPincodesLoading] =  useState(false);

  // useEffect(() => {
  //   console.log(state, district);
  // }, [state, district]);

  const hasAddress = Boolean(  
    addressData?.address &&
      addressData?.district &&
      addressData?.state &&
      addressData?.zipCode
  );
const isFormValid = Boolean(
    addressForm.fullName.trim() &&
      addressForm.address.trim() &&
      addressForm.zipCode.trim() &&
      addressForm.state.trim() &&
      addressForm.district.trim()
  ); 

  const fetchAddressData = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await axios.get(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/Address/GetAddressById/${userId}`
      );
      const data = Array.isArray(response.data) ? response.data[0] : response.data;
      if (data) {
        setAddressData(data);
        setAddressForm({       
          fullName: (data.fullName || "").trim(),
          mobileNumber: data.mobileNumber || "",
          address: data.address || "",
          state: data.state || "",
          district: data.district || "",
          zipCode: data.zipCode || "",
        });
         setStateId(data.stateId ? String(data.stateId) : "");
         setDistrictId(data.districtId ? String(data.districtId) : "");
      }
    } catch (error) {
      console.error("Error fetching address:", error);
    }
  }, [userId]);

  useEffect(() => {
    fetchAddressData();
  }, [fetchAddressData]);

  useEffect(() => {
    if (addressForm.state) {
      setStateId(stateId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressForm.state]);
 
  useEffect(() => {
    if (addressForm.district) {
      setDistrictId(districtId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressForm.district]);
 
  useEffect(() => {
      setStatesLoading(true);
      axios
        .get(
          "https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/MasterData/getStates"
        )
        .then((response) => {
          setStateList(response.data);
        })
        .catch((error) => {
          console.error(
            "Error fetching states:",
            error
          );
  
          // setError(
          //   "Could not load states. Please refresh and try again."
          // );
        })
        .finally(() => {
          setStatesLoading(false);
        });
    }, []);
  
    // ============================================================
    // Load Districts using State ID
    // ============================================================
    useEffect(() => {
      if (!addressForm.stateId) {
        setDistrictList([]);
        return;
      }
  
      setDistrictsLoading(true);
      setDistrictList([]);
  
      axios
        .get(
          `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/MasterData/getDistricts/${addressForm.stateId}`
        )
        .then((response) => {
          setDistrictList(response.data);
        })
        .catch((error) => {
          console.error(
            "Error fetching districts:",
            error
          );
  
          // setError(
          //   "Could not load districts. Please try again."
          // );
  
          setDistrictList([]);
        })
        .finally(() => {
          setDistrictsLoading(false);
        });
    }, [addressForm.stateId]);
  
    // ============================================================
    // Load Pincodes using District ID
    // ============================================================
    useEffect(() => {
      if (!addressForm.districtId) {
        setPincodeList([]);
        setPincodesLoading(false);
        return;
      }
  
      setPincodesLoading(true);
      setPincodeList([]);
  
      axios
        .get(
          `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/MasterData/getPincodes/${addressForm.districtId}`
        )
        .then((response) => {
          setPincodeList(response.data);
        })
        .catch((error) => {
          console.error(
            "Error fetching pincodes:",
            error
          );
  
          // setError(
          //   "Could not load pincodes. Please try again."
          // );
  
          setPincodeList([]);
        })
        .finally(() => {
          setPincodesLoading(false);
        });
    }, [addressForm.districtId]);

    const handleStateChange = (e) => {
    const selectedStateId =
      String(e.target.value);

    const selectedState =
      stateList.find(
        (s) =>
          String(s.StateId) ===
          selectedStateId
      );

    setAddressForm((prev) => ({
      ...prev,

      stateId: selectedStateId,

      state: selectedState
        ? selectedState.StateName
        : "",

      // Reset district
      districtId: "",
      district: "",

      // Reset pincode
      zipCode: "",
    }));

    setDistrictList([]);
    setPincodeList([]);
  };

  // ============================================================
  // District Change
  // ============================================================
  const handleDistrictChange = (e) => {
    const selectedDistrictId =
      String(e.target.value);

    const selectedDistrict =
      districtList.find(
        (d) =>
          String(d.districtId) ===
          selectedDistrictId
      );

    setAddressForm((prev) => ({
      ...prev,

      districtId:
        selectedDistrictId,

      district: selectedDistrict
        ? selectedDistrict.districtName
        : "",

      // Reset pincode
      zipCode: "",
    }));

    setPincodeList([]);
  };

  // ============================================================
  // Pincode Radio Change
  // ============================================================
  const handlePincodeChange = (e) => {
    const selectedPincode =
      String(e.target.value);
    setAddressForm((prev) => ({
      ...prev,
      zipCode:
        selectedPincode,
    }));
  };

  const handleSaveAddress = async () => {
    const { fullName, mobileNumber, address, state, district, zipCode } = addressForm;

    if (!fullName || !address || !zipCode || !state || !district) {
      alert("Please fill in all required fields.");
      return;
    }
    if (fullName.trim().toLowerCase() === "guest") {
      alert("Please remove Guest and enter your full name.");
      return;
    }
    if (!/^\d{6}$/.test(zipCode)) {
      alert("Pincode must be exactly 6 digits.");
      return;
    }

    const payload3 = {
      id: addressData.id,
      profileType: "profileType",
      addressId: addressData.addressId,
      isPrimaryAddress: true,
      address: address,
      state: state,
      district: district,
      StateId: stateId,
      DistrictId: districtId,
      zipCode: zipCode,
      mobileNumber: mobileNumber,
      emailAddress: "emailAddress",
      userId: userId,
      firstName: fullName,
      lastName: "lastName",
      fullName: fullName,
      walletAmount: "0",
    };

    try {
      setSavingAddress(true);
      const response = await fetch(
        `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/Customer/CustomerAddressEdit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload3),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error Response:", errorText);
        throw new Error("Failed to edit address.");
      }

      await fetchAddressData();
      alert("Address Updated Successfully!");
      navigate(`/profilePage/${userType}/${userId}`);
    } catch (err) {
      console.error("Error saving address:", err);
      alert("Failed to save address. Please try again.");
    } finally {
      setSavingAddress(false);
    }
  };

  return (
    <>
    <Header/>
    <div className="container py-3" style={{ maxWidth: "600px", marginTop: "100px" }}>
      <div className="d-flex align-items-center mb-1">
        <ArrowBackIcon
          style={{ cursor: "pointer", marginRight: "10px" }}     
          onClick={() => navigate(`/loginnew`)}
        />
        <h5 className="fw-bold mb-0 d-flex align-items-center">
          <LocationOnIcon className="me-1" style={{ color: "#008000" }} />
          {hasAddress ? "Edit Address" : "Add Your Delivery Address"}
        </h5>
      </div>

      <div className="shadow-sm rounded-4 p-3 bg-white">
          {!hasAddress && (
            <p className="text-danger small mb-2">
              Please add your address to continue using the app.
            </p>
          )}
          <Form>
            <Form.Group className="mb-2">
              <Form.Label>
                Full Name <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                type="text"
                value={addressForm.fullName}
                onChange={(e) =>
                  setAddressForm((p) => ({ ...p, fullName: e.target.value }))
                }
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>
                Address <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                type="text"
                placeholder="House no, street, area"
                value={addressForm.address}
                onChange={(e) =>
                  setAddressForm((p) => ({ ...p, address: e.target.value }))
                }
              />
            </Form.Group>
                 <div className="vr-row">
              {/* State */}
              <div className="vr-field">
                <label className="vr-label">
                  State
                </label>
                <select
                  className="vr-input"
                  value={
                    addressForm.stateId
                  }
                  onChange={
                    handleStateChange
                  }
                  required
                  disabled={
                    statesLoading
                  }
                >
                  <option value="">
                    {statesLoading
                      ? "Loading states..."
                      : "Select state"}
                  </option>
                  {stateList.map(
                    (s) => (
                      <option
                        key={
                          s.StateId
                        }
                        value={String(
                          s.StateId
                        )}
                      >
                        {
                          s.StateName
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* District */}
              <div className="vr-field">
                <label className="vr-label">
                  District
                </label>
                <select
                  className="vr-input"
                  value={
                    addressForm.districtId
                  }
                  onChange={
                    handleDistrictChange
                  }
                  required
                  disabled={
                    !addressForm.stateId ||
                    districtsLoading
                  }
                >
                  <option value="">
                    {!addressForm.stateId
                      ? "Select state first"
                      : districtsLoading
                      ? "Loading districts..."
                      : "Select district"}
                  </option>
                  {districtList.map(
                    (d) => (
                      <option
                        key={
                          d.districtId
                        }
                        value={String(
                          d.districtId
                        )}
                      >
                        {
                          d.districtName
                        }
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
        
            <div className="row">
              <div className="col-6">
             <Form.Group className="mb-2"> 
              <Form.Label>
                Mobile Number <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control type="text" value={addressForm.mobileNumber} readOnly />
            </Form.Group>
             </div>
             <div className="vr-field">

                <label className="vr-label">
                  ZipCode / PIN Code
                </label>

                {!addressForm.stateId ? (
                  <div className="vr-radio-message">
                    Please select a state first
                  </div>
                ) : !addressForm.districtId ? (
                  <div className="vr-radio-message">
                    Please select a district first
                  </div>
                ) : pincodesLoading ? (
                  <div className="vr-radio-message">
                    Loading pincodes...
                  </div>
                ) : pincodeList.length ===
                  0 ? (
                  <div className="vr-radio-message">
                    No pincodes available for this district
                  </div>
                ) : (
                  <div className="vr-pincode-list">

                    {pincodeList.map(
                      (
                        pincode,
                        index
                      ) => {

                        const pincodeValue =
                          typeof pincode ===
                          "string"
                            ? pincode
                            : String(
                                pincode.pincode ??
                                  pincode.Pincode ??
                                  pincode.pinCode ??
                                  pincode.PinCode ??
                                  ""
                              );

                        if (
                          !pincodeValue
                        ) {
                          return null;
                        }

                        return (
                          <label
                            key={`${pincodeValue}-${index}`}
                            className="vr-pincode-option"
                          >

                            <input
                              type="radio"
                              name="vendorPincode"
                              value={
                                pincodeValue
                              }
                              checked={
                                addressForm.zipCode ===
                                pincodeValue
                              }
                              onChange={
                                handlePincodeChange
                              }
                              required
                            />

                            <span>
                              {
                                pincodeValue
                              }
                            </span>

                          </label>
                        );
                      }
                    )}

                  </div>
                )}

              </div>
            </div>
            <Button
              style={{ backgroundColor: "#008000", borderColor: "#008000" }}
              onClick={handleSaveAddress}
              disabled={savingAddress || !isFormValid}
            >
              {savingAddress ? "Saving..." : "Save & Continue"}
            </Button>
          </Form>
        </div>
    </div>
    <Footer />
    </>
  );
};

export default AddressPage;