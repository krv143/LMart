export const IMAGE_DOWNLOAD_URL =
  "https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/FileUpload/download?generatedfilename=";

const isDirectUrl = (value) => /^(?:https?:|data:|blob:)/i.test(value);

export const getImageFilename = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const parameterIndex = raw.indexOf("generatedfilename=");
  if (parameterIndex >= 0) {
    const encoded = raw
      .slice(parameterIndex + "generatedfilename=".length)
      .split("&")[0];
    try {
      return decodeURIComponent(encoded);
    } catch {
      return encoded;
    }
  }

  const legacyMatch = raw.match(/(?:^|\/)api\/img\/([^?#/]+)(?:[?#].*)?$/i);
  if (legacyMatch) {
    try {
      return decodeURIComponent(legacyMatch[1]);
    } catch {
      return legacyMatch[1];
    }
  }

  return isDirectUrl(raw) ? "" : raw;
};

export const imageValueToUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (isDirectUrl(raw)) return raw;

  const filename = getImageFilename(raw);
  return filename ? `${IMAGE_DOWNLOAD_URL}${encodeURIComponent(filename)}` : "";
};
