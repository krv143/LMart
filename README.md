# HandyMan — Android & iOS app (Capacitor)

Your existing React (Create React App) project, wrapped with **Capacitor 8** so it
builds as a real Android app and iOS app. The web code is the same code you sent,
plus a few small mobile fixes (listed below).

## 0. One thing to do first: bring back your `public/` folder

The zip you sent contained only `src/`. Copy your original **`public/`** folder
(manifest.json, logo192.png, favicon, `css/style.css`, `service-worker.js`, …) over
the `public/` folder here. This project's `public/` only has `index.html` and an
empty `css/style.css` placeholder.

Also check your original `package.json`: I rebuilt one from the imports in `src/`
(no versions were available). If you have the original, keep its dependency
versions and just add the `@capacitor/*` packages from this one.

## 1. Requirements

| | Android | iOS |
|---|---|---|
| OS | Windows / macOS / Linux | **macOS only** |
| IDE | Android Studio Otter (2025.2.1) or newer | **Xcode 26** or newer |
| Other | Android SDK 36, JDK 21 (bundled with Android Studio) | Xcode command line tools |
| Both | Node.js **22+** | |

Minimums: Android 7.0 (API 24), iOS 15.

## 2. Build and run

```bash
npm install
npm run assets          # regenerate icons/splash after you replace assets/*.png
npm run android         # builds the web app, syncs it, opens Android Studio
npm run ios             # (on a Mac) same, opens Xcode
```

After **any** change to `src/`, run `npm run cap:sync` (or `npm run android` / `npm run ios`) again.

- **Android:** in Android Studio press Run ▶ on an emulator or a USB-connected phone.
  For the Play Store: *Build → Generate Signed App Bundle (.aab)*.
- **iOS:** in Xcode select the *App* target → *Signing & Capabilities* → pick your
  Apple Developer team, then Run ▶. For the App Store: *Product → Archive*.
  (An Apple Developer account, $99/yr, is required to publish and to test on a real device for long.)

## 3. Decide these before publishing

1. **App ID** — set to `com.ShMJqnAZKkEl.natively` (the id of your existing Play app) in
   `capacitor.config.json`, `applicationId` in `android/app/build.gradle`, `strings.xml`, and
   the iOS bundle identifier. The Java `namespace` stays `com.handyman.app` on purpose; it is
   only the internal code package and does not affect the Play package name.
   **Before uploading, raise `versionCode` in `android/app/build.gradle`** (currently 1) above
   your latest release on Play, and update `versionName`.
2. **App name** — currently "HandyMan" (`capacitor.config.json`).
3. **Icon and splash** — `assets/icon-only.png` is a *placeholder* (yellow "HM").
   Replace `assets/icon-only.png` (1024×1024) and `assets/splash.png` (2732×2732)
   with your real artwork, then `npm run assets`.

## 4. Things you must check / fix

- **Backend CORS.** Inside the app, requests come from origin `https://localhost`
  (Android) and `capacitor://localhost` (iOS), not from your website. Your API
  (`lmartapiv1-…azurewebsites.net`) must allow both origins or every call will fail.
  If it uses the `CORS_ORIGINS` setting from `src/CommonPages/server.js`, add
  `https://localhost,capacitor://localhost`.
- **Secret in the client code.** `CustomerPages/RaiseTicket.js` and
  `CustomerPages/ApartmentRaiseTicket.js` contain a hard-coded WATI `Bearer …` token.
  Anything inside an app package can be extracted, so treat that token as public:
  rotate it and move the WhatsApp call to your backend.
- **Push notifications while the app is closed** are *not* included. The project had no
  FCM/APNs; `send-offer-notification` in `server.js` only stores a record. What works:
  the app shows system notifications (via local notifications) while it is running.
  Real background push needs Firebase (Android) + an APNs key (iOS) and a backend that sends them.
- **Barcode scanner** (`VendorStockUpdatePage`) uses the browser `BarcodeDetector`, which
  isn't available in the Android/iOS WebView. The page already falls back to manual code
  entry. For real scanning add `@capacitor-mlkit/barcode-scanning`.
- **App Store review (Apple 4.2):** Apple rejects apps that feel like a website in a wrapper.
  Yours has real functionality (orders, vendor tools, notifications, file export), which helps;
  make sure the reviewer can log in (provide a demo account and OTP path in review notes).
- **Payments:** the project has no in-app payment code (only an unused Razorpay script tag
  in `public/index.html`). If you add digital-goods payments later, Apple/Google billing rules apply.

## 4c. Admin "All Orders — Map" page

`AdminPages/AdminOrdersMapPage.js`, route **`/adminOrdersMap/Admin`** — a read-only map of every order,
across every store, in one place:
- Fetches `Mart/GetAllMartItems` (no vendor scoping — this is the whole-business view) and plots every
  order that has a real latitude/longitude. Orders with no location (0,0 or missing) are counted but not
  pinned or listed.
- Pins are colored by status (red = Open, orange = In Progress, green = Delivered, grey = Cancelled, blue =
  anything else), with a legend and a status filter above the map.
- Tapping a pin opens a details panel: store, customer, address, who it's assigned to, total, date, an
  **Open in Maps** button (turn-by-turn directions), and an **Open order** button that goes to the existing
  grocery order admin page (`/adminGroceryOrderPage/:martId}`) for orders that have a `martId`.
- Refreshes every 30 seconds. Uses the same map module as the delivery New Orders page
  (`utils/orderMap.js` — OpenStreetMap by default, or Google Maps if `REACT_APP_GOOGLE_MAPS_API_KEY` is set).
- This page is **read-only** — no accept/assign/edit actions. Use the existing admin/vendor order pages for
  changes.

## 4b. Delivery "New Orders" map and OTP-free number

**OTP-free sign-in.** `src/config/loginBypass.js` lists `9885803193`. Entering that number on the login
screen skips the SMS/OTP step and opens **`/adminOrdersMap/Admin`** (the new admin orders-map page below).
To send a bypass number to a `:userType/:userId` route instead (like the delivery New Orders page used to),
set `otpBypassIsFixedPath` to `false` in the same file. To turn the bypass off entirely, empty
`OTP_BYPASS_NUMBERS`. *Anyone who knows the number can sign in as that user*, so use it only for a demo /
Play-review / test account. The safer version is to make the backend accept a fixed OTP for that number.

**New Orders page** (`DeliveryPartnerPages/DeliveryNewOrdersPage.js`, also reachable from the delivery
dashboard button "New orders on map"):
- **Finding the partner:** first by the signed-in user id (same call as the dashboard). If nothing comes
  back, it looks in the full partner list for a record with the same user id or the same mobile number,
  because a partner can be registered under a different user id than the one login returns. The page uses
  that record's own user id and store (`vendorId`). If none is found it says so and shows the mobile and
  user id it tried.
- **Which orders:** fetched from `Mart/GetAllMartItems` (every order, every vendor — the same feed the
  super-admin "all orders" view uses), then filtered in the app to: this partner's store (`vendorId`),
  status *Open*, not yet assigned, not a pick-up, **and has a real latitude/longitude** (0,0 or missing is
  excluded — those never show up here at all, on the map or in the list). Sorted nearest first, with the
  distance shown.
- **No matching partner record:** if the login can't be matched to any delivery-partner record, the page
  doesn't fully block — it shows every vendor's orders (still only ones with a real latitude/longitude),
  with a banner explaining why, so the map and list are still useful for testing or while the account is
  being fixed. **Accepting an order is still blocked** in that case (and while pending approval, or with no
  store assigned), with the same reason shown as the error.
- **Distance selector:** 5 km / 10 km / All (default 10 km, remembered). The map zooms to that distance around
  the partner, and only orders inside it are listed. If everything is filtered out, the message now names the
  closest matching order's actual distance ("closest one is 7.4 km away") — a quick way to tell "the data is
  there but too far for this radius" from "there's genuinely nothing open right now". Tap **All** to see it. Orders farther
  away, or without a map location, are counted in a note under the list. If GPS is off, all orders are shown.
  "Near me" re-zooms to the circle; "Show all" fits every pin.
- **My active deliveries** are found by the partner's user id or by name (as the vendor's assign page does).
- **Accept order** assigns it to the partner (same update the vendor's "Assign" does: status "In Progress",
  assignedTo, deliveryPartnerUserId). It re-checks first, so an order another partner just took is refused.
- After accepting, **Start ride** opens turn-by-turn directions to the customer in Google Maps.
  "Order details" opens the existing delivery details page to finish the delivery.
- The list refreshes every 20 seconds and plays the bell sound when a new order arrives.

**Map — no key needed.** The New Orders page shows an interactive map first thing on the page, even when
there are no orders (then it is an empty map around the partner's location). Every order that has a saved
location is a numbered red pin (numbers match the list below); the partner is a blue dot; the chosen 5 / 10 km
distance is a circle. **Tap a pin** (or a card) to open that order in a panel under the map, with **Accept
order**. After accepting, the pin turns green and the panel shows **Start ride** / **Order details**.
The map uses OpenStreetMap tiles (free, no key). OpenStreetMap's tile server is meant for light use; if the app
grows to many daily users, switch to a paid/hosted tile provider (change the URL in `src/utils/orderMap.js`).
*Optional:* to get Google's own map instead, create a Google Maps JavaScript API key (billing on; restrict it to
that API, not by website), put it in `.env` (see `.env.example`) and run `npm run cap:sync`. The same pins,
circle and panel work; if Google fails to load, the page falls back to OpenStreetMap.

**Things to know:**
- Order pins use the `latitude` / `longitude` saved on each order. Grocery orders now save the customer's
  GPS (see section 5). Orders placed before that, or where the customer denied location, have 0,0 and appear
  in the list as "No map location" (Start ride then navigates to the typed address).
- The backend must store `latitude` / `longitude` on the order. Check one new order in your database.
- The partner's store comes from `vendorId` on their delivery-partner profile (set by the super admin).
- Accepting is not atomic on the server: if two partners tap at the same instant, the last write wins.
  A server-side "accept only if unassigned" check would remove that.

## 5. What I changed in your code

| File | Change |
|---|---|
| `src/utils/nativeFile.js` (new) | PDF / ZIP / JSON / Excel exports. A WebView can't "download", so in the app the file is saved to cache and the share sheet opens (Save to Files/Drive, WhatsApp, …). On the web it behaves as before. |
| `AdminGroceryOrderPage`, `AdminOrderClose`, `VendorOrdersPage` | `doc.save()` → `savePdf()` |
| `RaiseTicketActionView`, `utils/vendorStorage.js` | `saveAs()` → `saveBlob()` |
| `DeliveryPartnerPaymentMethod` | `XLSX.writeFile()` → `saveWorkbook()` |
| `AdminOrdersMapPage.js` (new), `DeliveryNewOrdersPage.js`, `utils/orderMap.js`, `utils/maps.js`, `config/loginBypass.js` (new), `LoginPage.js`, `App.js`, `DeliveryPartnerDashboard.js` | OTP-free number + New Orders map (section 4b). |
| `src/App.js` | Android hardware Back button: closes the app on login/home, otherwise goes back one screen. The web "reload on back" trick is skipped inside the app. |
| `src/utils/PushNotificationService.js` | Uses native local notifications inside the app, browser notifications on the web. |
| `src/index.js` | Service worker only registers on the web. |
| `src/utils/getLocation.js` (new), `CustomerPages/GroceryPaymentMethod.js` | Grocery orders now save the customer's GPS latitude/longitude (was hard-coded 0,0). Uses `@capacitor/geolocation` in the app. If location is denied/off/times out, the order still goes through with 0,0. |
| `AndroidManifest.xml` | Explicitly removes `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` (Google Play photo/video policy). |
| `AndroidManifest.xml` / `Info.plist` | Camera, microphone, location, photo-library and notification permissions (+ the text iOS shows when asking). |
| `capacitor.config.json` | App id/name, splash, iOS safe-area handling. |

Left out of this package on purpose: `src/Screenshots/` (35 MB, not used by the code) and
`src/js/` (copies of bootstrap that `index.js` doesn't use — it imports bootstrap from npm).

## 6. Status of this package

- The web app compiles (`react-scripts build` succeeds) and syncs into both native projects.
- I could **not** compile the APK/IPA here (no Android SDK or Xcode in my environment), so the
  first native run on your machine is the first real test. If Android Studio or Xcode shows an
  error, send it to me and I'll fix it.
