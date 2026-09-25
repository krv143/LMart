/**
 * nativeFile.js — file export that works both in the browser and inside the
 * Capacitor Android/iOS app.
 *
 * Why: a WebView can't "download" a file the way a browser tab does. doc.save(),
 * file-saver's saveAs() and XLSX.writeFile() all silently do nothing in the
 * native app. On native we write the file to the app cache and open the system
 * share sheet, so the user can save it to Files / Drive, open it, or send it
 * on WhatsApp. On the web the original behaviour is unchanged.
 */
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { saveAs } from "file-saver";

const isNative = () => Capacitor.isNativePlatform();

const safeName = (name) => String(name || "file").replace(/[\\/:*?"<>|]+/g, "_");

const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

async function shareBase64(base64, filename) {
  const name = safeName(filename);
  try {
    const { uri } = await Filesystem.writeFile({
      path: name,
      data: base64,
      directory: Directory.Cache,
    });
    await Share.share({ title: name, url: uri, dialogTitle: `Save or share ${name}` });
  } catch (err) {
    // The user closing the share sheet is not an error worth alerting about.
    if (err && /cancel/i.test(String(err.message || err))) return;
    console.error("Could not save file:", err);
    alert("Could not save the file. Please try again.");
  }
}

/** jsPDF: replaces doc.save(filename) */
export async function savePdf(doc, filename) {
  if (!isNative()) return doc.save(filename);
  const dataUri = doc.output("datauristring");
  return shareBase64(dataUri.split(",")[1], filename);
}

/** Any Blob: replaces file-saver's saveAs(blob, filename) */
export async function saveBlob(blob, filename) {
  if (!isNative()) return saveAs(blob, filename);
  return shareBase64(await blobToBase64(blob), filename);
}

/** SheetJS: replaces XLSX.writeFile(workbook, filename) */
export async function saveWorkbook(XLSX, workbook, filename) {
  if (!isNative()) return XLSX.writeFile(workbook, filename);
  const base64 = XLSX.write(workbook, { bookType: "xlsx", type: "base64" });
  return shareBase64(base64, filename);
}
