const PREFIX = "img_b64_";
const DB_NAME = "LakshmiMartImages";
const STORE = "images";
const META_STORE = "meta";
const blobCache = {};

const MAX_IMAGES = 500;
const EXPIRY_MS = 3 * 24 * 60 * 60 * 1000;

// ─── Build version: changes automatically on every deploy ────────────────
// Picks up a build-time value injected by your build tool (CRA/Vite), or
// falls back to a value baked in at module-load time so it's at least
// unique per server restart/deploy. No manual edits needed on each deploy
// as long as one of the env vars below is set in your build pipeline.
const BUILD_VERSION =
  (typeof process !== "undefined" && process.env && process.env.REACT_APP_BUILD_ID) ||
  "default-build";

let dbInstance = null;

// ─── Open DB 
function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      // stores { base64, savedAt } together
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
    };

    req.onsuccess = (e) => {
      dbInstance = e.target.result;

      // If another tab deletes the DB, reset our instance
      dbInstance.onversionchange = () => {
        dbInstance.close();
        dbInstance = null;
      };

      resolve(dbInstance);
    };

    req.onerror = (e) => reject(e.target.error);

    req.onblocked = () => {
      console.warn("DB open blocked by another tab");
    };
  });
}

// ─── Check whether the cached build version matches the current deploy ───
async function getStoredBuildVersion(db) {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(META_STORE, "readonly");
      const req = tx.objectStore(META_STORE).get("buildVersion");
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function setStoredBuildVersion(db, version) {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(META_STORE, "readwrite");
      tx.objectStore(META_STORE).put(version, "buildVersion");
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

// ─── Save image with timestamp 
async function saveToDB(db, filename, base64) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(
      { base64, savedAt: Date.now() },
      PREFIX + filename
    );
    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(e.target.error);
  });
}

async function evictIfNeeded(db) {
  try {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const now = Date.now();
   
    const keys = await new Promise((res, rej) => {
      const r = store.getAllKeys();
      r.onsuccess = () => res(r.result || []);
      r.onerror = (e) => rej(e.target.error);
    });

    const values = await new Promise((res, rej) => {
      const r = store.getAll();
      r.onsuccess = () => res(r.result || []);
      r.onerror = (e) => rej(e.target.error);
    });

    // pair keys with values
    const entries = keys.map((key, i) => ({
      key,
      savedAt: values[i]?.savedAt || 0,
    }));

    // Step 1: delete expired images (older than 3 days)
    const expired = entries.filter((e) => now - e.savedAt > EXPIRY_MS);
    for (const entry of expired) {
      store.delete(entry.key);
      delete blobCache[entry.key.replace(PREFIX, "")];
    }

    // Step 2: if still over limit, delete oldest first
    const remaining = entries.filter((e) => now - e.savedAt <= EXPIRY_MS);
    if (remaining.length > MAX_IMAGES) {
      remaining.sort((a, b) => a.savedAt - b.savedAt);
      const overflow = remaining.length - MAX_IMAGES;
      const toDelete = remaining.slice(0, overflow + Math.ceil(MAX_IMAGES * 0.1));
      for (const entry of toDelete) {
        store.delete(entry.key);
        delete blobCache[entry.key.replace(PREFIX, "")];
      }
    }

    await new Promise((res) => { tx.oncomplete = res; tx.onerror = res; });

    if (expired.length > 0) {
      console.log(`Removed ${expired.length} expired images from cache`);
    }
  } catch (e) {
    console.warn("Eviction failed silently:", e);
  }
}
const ImageCache = {

  // Save base64 image to IndexedDB
  async setBase64(filename, base64) {
    try {
      const db = await openDB();
      await evictIfNeeded(db);
      await saveToDB(db, filename, base64);

      // Mark this build as the current one. After this, getBase64 for
      // ANY filename will use the cache normally (no forced API refetch)
      // until the next deploy changes BUILD_VERSION.
      const storedVersion = await getStoredBuildVersion(db);
      if (storedVersion !== BUILD_VERSION) {
        await setStoredBuildVersion(db, BUILD_VERSION);
      }
    } catch (e) {
      if (e?.name === "QuotaExceededError") {
        // Storage full — wipe everything and save fresh
        console.warn("Storage full — clearing cache and retrying");
        await ImageCache.clearAll();
        try {
          const db = await openDB();
          await saveToDB(db, filename, base64);
        } catch (e2) {
          console.error("Save failed after quota clear:", e2);
        }
      }
      // any other error — skip silently, image will load from API next time
    }
  },

  // Get base64 image — returns null if not cached, expired, or this is the
  // first call after a new deploy (so caller fetches fresh from API)
  async getBase64(filename) {
    try {
      const db = await openDB();

      // ─── Deploy check: if the build version changed since last visit,
      // treat ALL cached images as stale on this first call, so the page
      // fetches fresh images from the API. setBase64 (called when the
      // fresh image is saved) will update the stored build version, so
      // subsequent calls in this same session/visit use the cache normally.
      const storedVersion = await getStoredBuildVersion(db);
      if (storedVersion !== BUILD_VERSION) {
        return null; // forces API fetch; setBase64 will update the version
      }

      const record = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).get(PREFIX + filename);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = (e) => reject(e.target.error);
      });

      if (!record) return null;

      // Check if expired
      if (Date.now() - record.savedAt > EXPIRY_MS) {
        try {
          const tx = db.transaction(STORE, "readwrite");
          tx.objectStore(STORE).delete(PREFIX + filename);
        } catch {}
        delete blobCache[filename];
        return null; 
      }

      return record.base64;
    } catch (e) {
      return null; 
    }
  },

  getBlobUrl(filename) {
    return blobCache[filename] || null;
  },

  setBlobUrl(filename, blobUrl) {
    blobCache[filename] = blobUrl;
  },

  async clearAll() {
    try {
      if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
      }
      await new Promise((resolve) => {
        const req = indexedDB.deleteDatabase(DB_NAME);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve(); 
        req.onblocked = () => setTimeout(resolve, 2000); 
      });
      Object.keys(blobCache).forEach((k) => delete blobCache[k]);
      console.log("Image cache cleared");
    } catch (e) {
      console.error("Cache clear failed:", e);
    }
  },
};

export default ImageCache;

// const PREFIX = "img_b64_";
// const DB_NAME = "LakshmiMartImages";
// const STORE = "images";
// const blobCache = {};

// const MAX_IMAGES = 500;
// const EXPIRY_MS = 3 * 24 * 60 * 60 * 1000;

// let dbInstance = null;

// // ─── Open DB 
// function openDB() {
//   if (dbInstance) return Promise.resolve(dbInstance);
//   return new Promise((resolve, reject) => {
//     const req = indexedDB.open(DB_NAME, 1);

//     req.onupgradeneeded = (e) => {
//       const db = e.target.result;
//       // stores { base64, savedAt } together
//       if (!db.objectStoreNames.contains(STORE)) {
//         db.createObjectStore(STORE);
//       }
//     };

//     req.onsuccess = (e) => {
//       dbInstance = e.target.result;

//       // If another tab deletes the DB, reset our instance
//       dbInstance.onversionchange = () => {
//         dbInstance.close();
//         dbInstance = null;
//       };

//       resolve(dbInstance);
//     };

//     req.onerror = (e) => reject(e.target.error);

//     req.onblocked = () => {
//       console.warn("DB open blocked by another tab");
//     };
//   });
// }

// // ─── Save image with timestamp 
// async function saveToDB(db, filename, base64) {
//   return new Promise((resolve, reject) => {
//     const tx = db.transaction(STORE, "readwrite");
//     tx.objectStore(STORE).put(
//       { base64, savedAt: Date.now() },
//       PREFIX + filename
//     );
//     tx.oncomplete = () => resolve(true);
//     tx.onerror = (e) => reject(e.target.error);
//   });
// }

// async function evictIfNeeded(db) {
//   try {
//     const tx = db.transaction(STORE, "readwrite");
//     const store = tx.objectStore(STORE);
//     const now = Date.now();
   
//     const keys = await new Promise((res, rej) => {
//       const r = store.getAllKeys();
//       r.onsuccess = () => res(r.result || []);
//       r.onerror = (e) => rej(e.target.error);
//     });

//     const values = await new Promise((res, rej) => {
//       const r = store.getAll();
//       r.onsuccess = () => res(r.result || []);
//       r.onerror = (e) => rej(e.target.error);
//     });

//     // pair keys with values
//     const entries = keys.map((key, i) => ({
//       key,
//       savedAt: values[i]?.savedAt || 0,
//     }));

//     // Step 1: delete expired images (older than 3 days)
//     const expired = entries.filter((e) => now - e.savedAt > EXPIRY_MS);
//     for (const entry of expired) {
//       store.delete(entry.key);
//       delete blobCache[entry.key.replace(PREFIX, "")];
//     }

//     // Step 2: if still over limit, delete oldest first
//     const remaining = entries.filter((e) => now - e.savedAt <= EXPIRY_MS);
//     if (remaining.length > MAX_IMAGES) {
//       remaining.sort((a, b) => a.savedAt - b.savedAt);
//       const overflow = remaining.length - MAX_IMAGES;
//       const toDelete = remaining.slice(0, overflow + Math.ceil(MAX_IMAGES * 0.1));
//       for (const entry of toDelete) {
//         store.delete(entry.key);
//         delete blobCache[entry.key.replace(PREFIX, "")];
//       }
//     }

//     await new Promise((res) => { tx.oncomplete = res; tx.onerror = res; });

//     if (expired.length > 0) {
//       console.log(`Removed ${expired.length} expired images from cache`);
//     }
//   } catch (e) {
//     console.warn("Eviction failed silently:", e);
//   }
// }
// const ImageCache = {

//   // Save base64 image to IndexedDB
//   async setBase64(filename, base64) {
//     try {
//       const db = await openDB();
//       await evictIfNeeded(db);
//       await saveToDB(db, filename, base64);
//     } catch (e) {
//       if (e?.name === "QuotaExceededError") {
//         // Storage full — wipe everything and save fresh
//         console.warn("Storage full — clearing cache and retrying");
//         await ImageCache.clearAll();
//         try {
//           const db = await openDB();
//           await saveToDB(db, filename, base64);
//         } catch (e2) {
//           console.error("Save failed after quota clear:", e2);
//         }
//       }
//       // any other error — skip silently, image will load from API next time
//     }
//   },

//   // Get base64 image — returns null if not cached or expired
//   async getBase64(filename) {
//     try {
//       const db = await openDB();
//       const record = await new Promise((resolve, reject) => {
//         const tx = db.transaction(STORE, "readonly");
//         const req = tx.objectStore(STORE).get(PREFIX + filename);
//         req.onsuccess = () => resolve(req.result || null);
//         req.onerror = (e) => reject(e.target.error);
//       });

//       if (!record) return null;

//       // Check if expired
//       if (Date.now() - record.savedAt > EXPIRY_MS) {
//         try {
//           const tx = db.transaction(STORE, "readwrite");
//           tx.objectStore(STORE).delete(PREFIX + filename);
//         } catch {}
//         delete blobCache[filename];
//         return null; 
//       }

//       return record.base64;
//     } catch (e) {
//       return null; 
//     }
//   },

//   getBlobUrl(filename) {
//     return blobCache[filename] || null;
//   },

//   setBlobUrl(filename, blobUrl) {
//     blobCache[filename] = blobUrl;
//   },

//   async clearAll() {
//     try {
//       if (dbInstance) {
//         dbInstance.close();
//         dbInstance = null;
//       }
//       await new Promise((resolve) => {
//         const req = indexedDB.deleteDatabase(DB_NAME);
//         req.onsuccess = () => resolve();
//         req.onerror = () => resolve(); 
//         req.onblocked = () => setTimeout(resolve, 2000); 
//       });
//       Object.keys(blobCache).forEach((k) => delete blobCache[k]);
//       console.log("Image cache cleared");
//     } catch (e) {
//       console.error("Cache clear failed:", e);
//     }
//   },
// };

// export default ImageCache;

// // const PREFIX = "img_b64_";

// // // Memory cache for blob URLs (fast access within same session)
// // const blobCache = {};

// // const ImageCache = {

// //   // ✅ GET base64 from localStorage (persists across sessions)
// //   getBase64(generatedFilename) {
// //     try {
// //       return localStorage.getItem(PREFIX + generatedFilename) || null;
// //     } catch {
// //       return null;
// //     }
// //   },

// //   // ✅ SAVE base64 to localStorage (persists across sessions)
// //   setBase64(generatedFilename, base64) {
// //     try {
// //       localStorage.setItem(PREFIX + generatedFilename, base64);
// //     } catch (e) {
// //       // localStorage full — clear old image cache and retry
// //       console.warn("Storage full, clearing image cache...");
// //       ImageCache.clearAll();
// //       try {
// //         localStorage.setItem(PREFIX + generatedFilename, base64);
// //       } catch (e2) {
// //         console.error("Cache save failed after clear:", e2);
// //       }
// //     }
// //   },

// //   // ✅ Check if image exists in cache
// //   has(generatedFilename) {
// //     return !!ImageCache.getBase64(generatedFilename);
// //   },

// //   // Blob URL cache (in-memory only, for fast re-renders in same session)
// //   getBlobUrl(generatedFilename) {
// //     return blobCache[generatedFilename] || null;
// //   },

// //   setBlobUrl(generatedFilename, blobUrl) {
// //     blobCache[generatedFilename] = blobUrl;
// //   },

// //   // ✅ Clear all cached images from localStorage
// //   clearAll() {
// //     try {
// //       Object.keys(localStorage)
// //         .filter(key => key.startsWith(PREFIX))
// //         .forEach(key => localStorage.removeItem(key));
// //       // Also clear blob cache
// //       Object.keys(blobCache).forEach(k => delete blobCache[k]);
// //     } catch (e) {
// //       console.error("Cache clear failed:", e);
// //     }
// //   }
// // };

// // export default ImageCache;

// // // const PREFIX = "img_b64_";

// // // // memory cache for blob urls (fast access)
// // // const blobCache = {};

// // // const ImageCache = {
// // //   getBase64(generatedFilename) {
// // //     try {
// // //       return sessionStorage.getItem(PREFIX + generatedFilename) || null;
// // //     } catch {
// // //       return null;
// // //     }
// // //   },

// // //   setBase64(generatedFilename, base64) {
// // //     try {
// // //       sessionStorage.setItem(PREFIX + generatedFilename, base64);
// // //     } catch {
// // //     }
// // //   },

// // //   getBlobUrl(generatedFilename) {
// // //     return blobCache[generatedFilename] || null;
// // //   },

// // //   setBlobUrl(generatedFilename, blobUrl) {
// // //     blobCache[generatedFilename] = blobUrl;
// // //   }
// // // };

// // // export default ImageCache;