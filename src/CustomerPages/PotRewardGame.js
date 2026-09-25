import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { showToast } from "../CommonPages/toast";

// ======================================================
// API URLS
// ======================================================
     
const API_BASE =
  "https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api";

const GET_OFFER_TRANSACTION_URL =
  `${API_BASE}/OffersTransactions/GetOfferTransactionByUserId`;

const CREATE_OFFER_TRANSACTION_URL =
  `${API_BASE}/OffersTransactions/UploadOffersTransactionsDetails`;

const UPDATE_OFFER_TRANSACTION_URL =
  `${API_BASE}/OffersTransactions/UpdateOffersTransactionsDetails`;

// ======================================================
// GAME SETTINGS
// ======================================================

// Exactly ONE ₹10 pot and TWO ₹0 pots
const REWARD_POOL = [10, 0, 0];

// Random cooldown after playing
const COOLDOWN_HOURS = [3, 6, 8, 12, 18];

// ======================================================
// CREATE RANDOM POTS
// ======================================================

const shuffledRewards = () => {
  const arr = [...REWARD_POOL];

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr.map((amount, index) => ({
    id: index,
    amount,
  }));
};

// ======================================================
// RANDOM COOLDOWN
// ======================================================

const getRandomCooldownHours = () => {
  const index = Math.floor(
    Math.random() * COOLDOWN_HOURS.length
  );

  return COOLDOWN_HOURS[index];
};

// ======================================================
// STORAGE
// ======================================================

const gameStorageKey = (userId) =>
  `potRewardGame_${userId}`;

// ======================================================
// FORMAT TIMER
// ======================================================

const formatTimeLeft = (milliseconds) => {
  if (milliseconds <= 0) {
    return "00:00:00";
  }

  const totalSeconds = Math.ceil(
    milliseconds / 1000
  );

  const hours = Math.floor(
    totalSeconds / 3600
  );

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  );

  const seconds =
    totalSeconds % 60;

  return (
    `${String(hours).padStart(2, "0")}:` +
    `${String(minutes).padStart(2, "0")}:` +
    `${String(seconds).padStart(2, "0")}`
  );
};

// ======================================================
// CREDIT WALLET
// ======================================================

async function creditWallet(userId, amount) {
  try {
    console.log(
      "🎁 Pot Reward Amount:",
      amount
    );

    // ------------------------------------------
    // GET EXISTING WALLET
    // ------------------------------------------

    const response = await axios.get(
      GET_OFFER_TRANSACTION_URL,
      {
        params: {
          userId,
        },
      }
    );

    const data = response.data;

    console.log(
      "📦 Existing Offer Transaction:",
      data
    );

    // ------------------------------------------
    // CREATE NEW WALLET
    // ------------------------------------------

    if (!data || data.length === 0) {
      const payload = {
        id: "string",
        UserId: userId,
        CreatedDate:
          new Date().toISOString(),
        UpdatedDate:
          new Date().toISOString(),
        TicketId: "",
        TotalWalletAmount:
          String(amount),
        AvailedAmount: "0",
        RemainingAmount:
          String(amount),
      };

      console.log(
        "📤 Creating wallet:",
        payload
      );

      await axios.post(
        CREATE_OFFER_TRANSACTION_URL,
        payload
      );

      console.log(
        `✅ New wallet created with ₹${amount}`
      );

      return Number(amount);
    }

    // ------------------------------------------
    // EXISTING WALLET
    // ------------------------------------------

    const existing = data[0];

    const existingWalletAmount =
      Number(
        existing.remainingAmount || 0
      );

    const existingTotalWalletAmount =
      Number(
        existing.totalWalletAmount || 0
      );

    const existingAvailedAmount =
      Number(
        existing.availedAmount || 0
      );

    const rewardAmount =
      Number(amount);

    const updatedWalletAmount =
      existingWalletAmount +
      rewardAmount;

    const updatedTotalWalletAmount =
      existingTotalWalletAmount +
      rewardAmount;

    // ------------------------------------------
    // UPDATE WALLET
    // ------------------------------------------

    const payload = {
      id: existing.id,
      userId: userId,
      createdDate:
        existing.createdDate,
      updatedDate:
        new Date().toISOString(),

      totalWalletAmount:
        String(
          updatedTotalWalletAmount
        ),

      availedAmount:
        String(
          existingAvailedAmount
        ),

      remainingAmount:
        String(
          updatedWalletAmount
        ),
    };

    console.log(
      "📤 Updating wallet:",
      payload
    );

    await axios.put(
      `${UPDATE_OFFER_TRANSACTION_URL}/${existing.id}`,
      payload
    );

    console.log(
      `✅ Wallet updated to ₹${updatedWalletAmount}`
    );

    return updatedWalletAmount;

  } catch (error) {
    console.error(
      "❌ Wallet credit error:",
      error.response?.data ||
        error.message
    );

    throw error;
  }
}

// ======================================================
// POT REWARD GAME
// ======================================================

const PotRewardGame = ({
  userId,
  onWalletCredited,
}) => {

  // ----------------------------------------------------
  // STATE
  // ----------------------------------------------------

  const [pots, setPots] = useState(
    () => shuffledRewards()
  );

  const [showPopup, setShowPopup] =
    useState(false);

  const [crackingId, setCrackingId] =
    useState(null);

  const [crediting, setCrediting] =
    useState(false);

  const [gameResult, setGameResult] =
    useState(null);

  const [cooldownUntil, setCooldownUntil] =
    useState(null);

  const [timeLeft, setTimeLeft] =
    useState(0);

  const [cooldownHours, setCooldownHours] =
    useState(null);

  // ====================================================
  // LOAD SAVED GAME
  // ====================================================

  useEffect(() => {
    if (!userId) {
      return;
    }

    try {
      const key =
        gameStorageKey(userId);

      const saved =
        localStorage.getItem(key);

      // ------------------------------------------
      // FIRST TIME
      // ------------------------------------------

      if (!saved) {
        setPots(
          shuffledRewards()
        );

        setGameResult(null);
        setCooldownUntil(null);
        setCooldownHours(null);

        return;
      }

      const parsed =
        JSON.parse(saved);

      const savedCooldown =
        Number(
          parsed.cooldownUntil || 0
        );

      // ------------------------------------------
      // COOLDOWN ACTIVE
      // ------------------------------------------

      if (
        savedCooldown >
        Date.now()
      ) {
        setPots(
          Array.isArray(parsed.pots) &&
            parsed.pots.length === 3
            ? parsed.pots
            : shuffledRewards()
        );

        setGameResult(
          parsed.gameResult || null
        );

        setCooldownUntil(
          savedCooldown
        );

        setCooldownHours(
          parsed.cooldownHours ||
            null
        );

        return;
      }

      // ------------------------------------------
      // COOLDOWN FINISHED
      // ------------------------------------------

      const newPots =
        shuffledRewards();

      setPots(newPots);
      setGameResult(null);
      setCooldownUntil(null);
      setCooldownHours(null);

      localStorage.removeItem(key);

    } catch (error) {
      console.error(
        "Error loading pot game:",
        error
      );

      setPots(
        shuffledRewards()
      );

      setGameResult(null);
      setCooldownUntil(null);
      setCooldownHours(null);
    }

  }, [userId]);

  // ====================================================
  // COUNTDOWN TIMER
  // ====================================================

  useEffect(() => {
    if (!cooldownUntil) {
      setTimeLeft(0);
      return;
    }

    const updateTimer = () => {
      const remaining =
        Math.max(
          0,
          cooldownUntil -
            Date.now()
        );

      setTimeLeft(
        remaining
      );

      // ------------------------------------------
      // COOLDOWN FINISHED
      // ------------------------------------------

      if (remaining <= 0) {

        const newPots =
          shuffledRewards();

        setPots(newPots);
        setGameResult(null);
        setCooldownUntil(null);
        setCooldownHours(null);

        localStorage.removeItem(
          gameStorageKey(userId)
        );
      }
    };

    updateTimer();

    const timer =
      setInterval(
        updateTimer,
        1000
      );

    return () =>
      clearInterval(timer);

  }, [
    cooldownUntil,
    userId,
  ]);

  // ====================================================
  // BREAK POT
  // ====================================================

  const handleBreakPot =
    useCallback(
      async (pot) => {

        // ------------------------------------------
        // PROTECTION
        // ------------------------------------------

        if (
          !userId ||
          !pot ||
          crediting ||
          crackingId !== null ||
          cooldownUntil
        ) {
          return;
        }

        // ------------------------------------------
        // START BREAK ANIMATION
        // ------------------------------------------

        setCrackingId(
          pot.id
        );

        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              750
            )
        );

        setCrediting(true);

        try {

          const amount =
            Number(
              pot.amount || 0
            );

          let newRemaining =
            null;

          // ----------------------------------------
          // ONLY ₹10 GETS CREDITED
          // ----------------------------------------

          if (amount === 10) {

            newRemaining =
              await creditWallet(
                userId,
                amount
              );

            if (
              onWalletCredited
            ) {
              onWalletCredited(
                newRemaining
              );
            }
          }

          // ----------------------------------------
          // RANDOM NEXT PLAY TIME
          // ----------------------------------------

          const selectedHours =
            getRandomCooldownHours();

          const nextCooldown =
            Date.now() +
            selectedHours *
              60 *
              60 *
              1000;

          // ----------------------------------------
          // RESULT
          // ----------------------------------------

          const result =
            amount === 10
              ? "WIN"
              : "LOSE";

          setGameResult(
            result
          );

          setCooldownUntil(
            nextCooldown
          );

          setCooldownHours(
            selectedHours
          );

          // ----------------------------------------
          // SAVE GAME
          // ----------------------------------------

          const savedData = {
            pots,
            gameResult:
              result,
            cooldownUntil:
              nextCooldown,
            cooldownHours:
              selectedHours,
          };

          localStorage.setItem(
            gameStorageKey(userId),
            JSON.stringify(
              savedData
            )
          );

          // ----------------------------------------
          // MESSAGE
          // ----------------------------------------

          if (amount === 10) {

            showToast(
              `🎉 Congratulations! You won ₹10! Your wallet balance is now ₹${newRemaining}.`
            );

          } else {

            showToast(
              "😔 Better luck next time! You got ₹0."
            );
          }

        } catch (error) {

          console.error(
            "Pot reward crediting failed:",
            error
          );

          showToast(
            "Couldn't credit your reward. Please try again."
          );

          // Allow retry
          setCrackingId(
            null
          );

          setCrediting(
            false
          );

          return;

        } finally {

          setCrediting(
            false
          );

          setCrackingId(
            null
          );
        }

      },
      [
        userId,
        crediting,
        crackingId,
        cooldownUntil,
        pots,
        onWalletCredited,
      ]
    );

  // ====================================================
  // NO USER
  // ====================================================

  if (!userId) {
    return null;
  }

  // ====================================================
  // COMPONENT
  // ====================================================

  return (
    <>
      {/* ==================================================
          PROFILE BUTTON
      ================================================== */}

      <button
        type="button"
        className="blinking-text"
        onClick={() =>
          setShowPopup(true)
        }
        style={{
          width: "100%",
          border: "none",
          borderRadius: "14px",
          padding: "12px 16px",
          background:
            "linear-gradient(135deg,#ff9800,#ff5722)",
          color: "#fff",
          fontWeight: "700",
          fontSize: "15px",
          cursor: "pointer",
          boxShadow:
            "0 5px 15px rgba(0,0,0,.18)",
        }}
      >
        🏺 Break your Lucky Pot 
        {/* Discover your Cashback Reward! */}
      </button>

      {/* ==================================================
          POPUP
      ================================================== */}

      {showPopup && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(0,0,0,.65)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "15px",
          }}
          onClick={(event) => {

            if (
              event.target ===
                event.currentTarget &&
              !crediting &&
              crackingId === null
            ) {
              setShowPopup(false);
            }

          }}
        >

          {/* ==================================================
              POPUP CARD
          ================================================== */}

          <div
            style={{
              width: "100%",
              maxWidth: "500px",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: "22px",
              padding: "22px 18px",
              position: "relative",
              textAlign: "center",
              boxShadow:
                "0 15px 50px rgba(0,0,0,.4)",
            }}
          >

            {/* CLOSE */}

            <button
              type="button"
              disabled={
                crediting ||
                crackingId !== null
              }
              onClick={() =>
                setShowPopup(false)
              }
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                border: "none",
                background:
                  "#D10000",
                fontSize: "20px",
                cursor:
                  crediting ||
                  crackingId !== null
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              ×
            </button>

            {/* TITLE */}

            <div
              style={{
                fontSize: "42px",
                marginBottom: "2px",
              }}
            >
              🏺
            </div>

            <h3
              style={{
                margin: "0",
                fontWeight: "900",
                color: "#7a4e00",
              }}
            >
              Tap Now Try your Luck!
            </h3>

            <p
              style={{
                fontSize: "13px",
                color: "#666",
                marginTop: "6px",
                marginBottom: "18px",
              }}
            >
              One pot contains
              <strong> ₹10</strong>.
              <br />
              The other two contain ₹0.
            </p>

            {/* ==================================================
                COOLDOWN / RESULT
            ================================================== */}

            {cooldownUntil &&
            timeLeft > 0 ? (

              <div
                style={{
                  padding: "22px",
                  borderRadius: "18px",
                  background:
                    gameResult === "WIN"
                      ? "#e8f5e9"
                      : "#f5f5f5",
                }}
              >

                {gameResult ===
                "WIN" ? (

                  <>
                    <div
                      style={{
                        fontSize: "60px",
                      }}
                    >
                      🎉
                    </div>

                    <h3
                      style={{
                        color:
                          "#2e7d32",
                        fontWeight:
                          "900",
                        marginBottom:
                          "5px",
                      }}
                    >
                      You Won ₹10!
                    </h3>

                    <p
                      style={{
                        color:
                          "#555",
                      }}
                    >
                      ₹10 has been
                      added to your
                      wallet.
                    </p>
                  </>

                ) : (

                  <>
                    <div
                      style={{
                        fontSize: "60px",
                      }}
                    >
                      😔
                    </div>

                    <h3
                      style={{
                        color:
                          "#777",
                        fontWeight:
                          "900",
                        marginBottom:
                          "5px",
                      }}
                    >
                      Better Luck
                      Next Time!
                    </h3>

                    <p
                      style={{
                        color:
                          "#555",
                      }}
                    >
                      You got ₹0.
                      <br />
                      Please try again
                      later.
                    </p>
                  </>

                )}

                {/* COUNTDOWN */}

                <div
                  style={{
                    background:
                      "#fff",
                    borderRadius:
                      "14px",
                    padding: "14px",
                    marginTop:
                      "15px",
                    border:
                      "1px solid #ddd",
                  }}
                >

                  <div
                    style={{
                      fontSize:
                        "12px",
                      color:
                        "#777",
                    }}
                  >
                    You can play
                    again in
                  </div>

                  <div
                    style={{
                      fontSize:
                        "32px",
                      fontWeight:
                        "900",
                      color:
                        "#ff5722",
                      letterSpacing:
                        "2px",
                      marginTop:
                        "4px",
                    }}
                  >
                    {formatTimeLeft(
                      timeLeft
                    )}
                  </div>

                  <div
                    style={{
                      fontSize:
                        "11px",
                      color:
                        "#999",
                    }}
                  >
                    Time remaining
                  </div>

                </div>

                {cooldownHours && (
                  <p
                    style={{
                      marginTop:
                        "10px",
                      marginBottom:
                        "0",
                      fontSize:
                        "11px",
                      color:
                        "#999",
                    }}
                  >
                    Next attempt:
                    after{" "}
                    <strong>
                      {cooldownHours} hours
                    </strong>
                  </p>
                )}

              </div>

            ) : (

              <>
                {/* ==================================================
                    POTS
                ================================================== */}

                <div
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "center",
                    gap: "14px",
                    marginTop:
                      "10px",
                  }}
                >

                  {pots.map(
                    (pot) => {

                      const breaking =
                        crackingId ===
                        pot.id;

                      return (
                        <button
                          key={pot.id}
                          type="button"
                          disabled={
                            crediting ||
                            crackingId !==
                              null
                          }
                          onClick={() =>
                            handleBreakPot(
                              pot
                            )
                          }
                          style={{
                            border:
                              "none",
                            background:
                              "transparent",
                            padding:
                              "5px",
                            cursor:
                              crediting ||
                              crackingId !==
                                null
                                ? "not-allowed"
                                : "pointer",
                          }}
                        >

                          {/* POT */}

                          <div
                            style={{
                              width:
                                "95px",
                              height:
                                "110px",
                              borderRadius:
                                "18px",
                              background:
                                breaking
                                  ? "#ddd"
                                  : "linear-gradient(145deg,#ffcc80,#ff7043)",
                              display:
                                "flex",
                              alignItems:
                                "center",
                              justifyContent:
                                "center",
                              fontSize:
                                "58px",
                              boxShadow:
                                "0 7px 15px rgba(0,0,0,.2)",
                              transform:
                                breaking
                                  ? "scale(.82) rotate(-10deg)"
                                  : "scale(1)",
                              transition:
                                "all .25s ease",
                            }}
                          >
                            {breaking
                              ? "💥"
                              : "🏺"}
                          </div>

                          <div
                            style={{
                              marginTop:
                                "7px",
                              fontWeight:
                                "800",
                              fontSize:
                                "13px",
                              color:
                                "#555",
                            }}
                          >
                            Pot{" "}
                            {pot.id + 1}
                          </div>

                        </button>
                      );
                    }
                  )}

                </div>

                <p
                  style={{
                    marginTop:
                      "18px",
                    marginBottom:
                      "0",
                    fontSize:
                      "12px",
                    color:
                      "#888",
                  }}
                >
                  👆 Choose one pot
                  and break it!
                </p>

              </>
            )}

            {/* ==================================================
                CREDITING
            ================================================== */}

            {crediting && (
              <div
                style={{
                  marginTop:
                    "15px",
                  padding:
                    "10px",
                  borderRadius:
                    "10px",
                  background:
                    "#fff3e0",
                  color:
                    "#e65100",
                  fontSize:
                    "13px",
                  fontWeight:
                    "700",
                }}
              >
                🪙 Adding your
                reward to wallet...
              </div>
            )}

          </div>
        </div>
      )}

      {/* ======================================================
          INLINE ANIMATION
      ====================================================== */}

      <style>
        {`
          @keyframes potShake {
            0% {
              transform: rotate(0deg);
            }

            25% {
              transform: rotate(-8deg);
            }

            50% {
              transform: rotate(8deg);
            }

            75% {
              transform: rotate(-5deg);
            }

            100% {
              transform: rotate(0deg);
            }
          }
        `}
      </style>
    </>
  );
};

export default PotRewardGame;