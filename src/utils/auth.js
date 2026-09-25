// utils/auth.js
const STORAGE_KEY = "loginData";
const EXPIRY_DAYS = 120;

export const setLoginData = (newUserId) => {
  const now = new Date();
  const expiry = now.getTime() + EXPIRY_DAYS * 24 * 60 * 60 * 1000; // 120 days in ms

  const data = {
    newUserId,
    expiry,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const getLoginData = () => {
  const item = localStorage.getItem(STORAGE_KEY);
  if (!item) return null;

  const data = JSON.parse(item);
  const now = new Date();

  if (now.getTime() > data.expiry) {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }

  return data.newUserId;
};

export const clearLoginData = () => {
  localStorage.removeItem(STORAGE_KEY);
};
