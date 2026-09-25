import seedCashbackOffers from "../data/cashbackOffers.json";

const STORAGE_KEY = "handyman-local-cashback-offers";
export const CASHBACK_CONFIG_TITLE = "Grocery Cashback Rules";
export const CASHBACK_CONFIG_HEADER = "cashback-config";
export const CASHBACK_CONFIG_FOOTER = "Admin-managed cashback thresholds";

const canUseStorage = () => typeof window !== "undefined" && !!window.localStorage;

const cloneSeed = () =>
  (Array.isArray(seedCashbackOffers) ? seedCashbackOffers : []).map((offer) => ({ ...offer }));

const normalizeDateValue = (value, fallback) => {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
};

export const serializeCashbackRules = (rules) =>
  (Array.isArray(rules) ? rules : [])
    .map((rule) => ({
      minAmount: String(rule.minAmount || "").trim(),
      maxAmount: String(rule.maxAmount || "").trim(),
      cashback: String(rule.cashback || "").trim(),
    }))
    .filter((rule) => rule.minAmount && rule.cashback)
    .map((rule) =>
      rule.maxAmount ? `${rule.minAmount}-${rule.maxAmount}=${rule.cashback}` : `${rule.minAmount}=${rule.cashback}`,
    )
    .join("\n");

export const parseCashbackRules = (value) => {
  if (!value) return [];

  return String(value)
    .split(/\r?\n|;/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(?:>=\s*)?(\d+)(?:\s*-\s*(\d+)|\s*\+)?\s*[:=,>]\s*(\d+)$/);
      if (!match) return null;
      return {
        minAmount: match[1] || "",
        maxAmount: match[2] || "",
        cashback: match[3] || "",
      };
    })
    .filter(Boolean);
};

export const getLocalCashbackOffers = () => {
  if (!canUseStorage()) return cloneSeed();

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = cloneSeed();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Fall through to reseed.
  }

  const seeded = cloneSeed();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
};

export const saveLocalCashbackOffers = (offers) => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(offers));
};

export const createLocalCashbackOffer = ({ cashbackRules, startDate, endDate }) => {
  const nowIso = new Date().toISOString();
  const nextOffer = {
    id: `cashback-offer-${Date.now()}`,
    title: CASHBACK_CONFIG_TITLE,
    header: CASHBACK_CONFIG_HEADER,
    footer: CASHBACK_CONFIG_FOOTER,
    description: serializeCashbackRules(cashbackRules),
    createdDate: nowIso,
    updatedDate: nowIso,
    startDate: normalizeDateValue(startDate, nowIso),
    endDate: normalizeDateValue(endDate, nowIso),
    image: [],
  };

  const existing = getLocalCashbackOffers();
  const updated = [nextOffer, ...existing];
  saveLocalCashbackOffers(updated);
  return nextOffer;
};

export const updateLocalCashbackOffer = (offerId, { cashbackRules, startDate, endDate }) => {
  const existing = getLocalCashbackOffers();
  const updated = existing.map((offer) => {
    if (offer.id !== offerId) return offer;
    return {
      ...offer,
      title: CASHBACK_CONFIG_TITLE,
      header: CASHBACK_CONFIG_HEADER,
      footer: CASHBACK_CONFIG_FOOTER,
      description: serializeCashbackRules(cashbackRules),
      updatedDate: new Date().toISOString(),
      startDate: normalizeDateValue(startDate, offer.startDate),
      endDate: normalizeDateValue(endDate, offer.endDate),
      image: [],
    };
  });
  saveLocalCashbackOffers(updated);
  return updated;
};

export const deleteLocalCashbackOffer = (offerId) => {
  const updated = getLocalCashbackOffers().filter((offer) => offer.id !== offerId);
  saveLocalCashbackOffers(updated);
  return updated;
};
