/**
 * orderMap.js — one small map interface with two engines, used by the
 * delivery "New Orders" page:
 *
 *  - Leaflet + OpenStreetMap (default): interactive map with every order as a
 *    pin, no API key and no billing.
 *  - Google Maps JavaScript API: used automatically when
 *    REACT_APP_GOOGLE_MAPS_API_KEY is set; falls back to Leaflet if Google
 *    can't load.
 *
 * Both return the same methods, so the page doesn't care which one it got:
 *   setMe(loc|null)            blue "you are here" dot
 *   setRadius(loc|null, km)    circle around me (km <= 0 or no loc removes it)
 *   setPins(pins, onClick)     pins: [{id, lat, lng, label, color, selected, title}]
 *   fitPoints(points)          zoom to show these points
 *   fitRadius(loc, km)         zoom to show the whole circle
 *   panTo({lat,lng})           move the map to a point
 *   invalidate()               call after the container changes size
 *   destroy()
 */
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { hasMapsKey, loadGoogleMaps } from "./maps";

const radiusBounds = (loc, km) => {
  const dLat = km / 111.32;
  const dLng = km / (111.32 * Math.max(Math.cos((loc.lat * Math.PI) / 180), 0.01));
  return [
    { lat: loc.lat - dLat, lng: loc.lng - dLng },
    { lat: loc.lat + dLat, lng: loc.lng + dLng },
  ];
};

// ---------------------------------------------------------------- Leaflet
const escapeMarkup = (value) =>
  String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);

const pinIcon = ({ label, color = "#dc3545", selected, kind }) => {
  if (kind === "fleet") {
    const name = escapeMarkup(label || "Delivery partner");
    return L.divIcon({
      className: "hm-pin",
      html:
        `<div style="display:flex;align-items:center;gap:4px;width:164px;height:36px;white-space:nowrap">` +
        `<span style="width:32px;height:32px;flex:0 0 32px;border:2px solid #fff;border-radius:50%;background:${color};box-shadow:0 2px 8px rgba(0,0,0,.4);display:grid;place-items:center;color:#fff;font:bold 14px sans-serif">D</span>` +
        `<span style="max-width:124px;overflow:hidden;text-overflow:ellipsis;padding:3px 7px;border-radius:10px;background:#fff;color:#263238;box-shadow:0 1px 5px rgba(0,0,0,.3);font:600 11px/1.2 sans-serif">${name}</span>` +
        `</div>`,
      iconSize: [164, 36],
      iconAnchor: [16, 18],
    });
  }
  if (kind === "courier") {
    return L.divIcon({
      className: "hm-pin",
      html: '<div style="width:34px;height:34px;border:2px solid #fff;border-radius:50%;background:#16864a;box-shadow:0 2px 8px rgba(0,0,0,.4);display:grid;place-items:center;color:#fff;font:bold 16px sans-serif">D</div>',
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });
  }
  if (kind === "delivered") {
    return L.divIcon({
      className: "hm-pin",
      html: '<div style="width:30px;height:30px;border:2px solid #fff;border-radius:50%;background:#198754;box-shadow:0 2px 7px rgba(0,0,0,.4);display:grid;place-items:center;color:#fff;font:bold 20px sans-serif">✓</div>',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
  }
  const size = selected ? 38 : 30;
  const html =
    `<div style="position:relative;width:${size}px;height:${size}px">` +
    `<div style="width:${size}px;height:${size}px;background:${color};border:2px solid #fff;` +
    `border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.45)"></div>` +
    `<span style="position:absolute;top:${selected ? 8 : 6}px;left:0;width:100%;text-align:center;color:#fff;` +
    `font:700 ${selected ? 14 : 12}px/1.2 sans-serif">${label ?? ""}</span></div>`;
  return L.divIcon({
    className: "hm-pin",
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });
};

const meIcon = L.divIcon({
  className: "hm-pin",
  html:
    '<div style="width:18px;height:18px;border-radius:50%;background:#1a73e8;border:3px solid #fff;' +
    'box-shadow:0 0 0 2px rgba(26,115,232,.35)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function createLeafletEngine(el, { center, zoom }, { onTileError } = {}) {
  const map = L.map(el, { center: [center.lat, center.lng], zoom });
  const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);
  // If the very first tile fails (offline, DNS/firewall block, ad-blocker),
  // let the caller show a message — pins still work, only the base map is
  // missing, and a blank-looking map with no explanation is confusing.
  if (onTileError) {
    let reported = false;
    tiles.on("tileerror", () => {
      if (!reported) {
        reported = true;
        onTileError();
      }
    });
    tiles.on("tileload", () => {
      reported = true; // at least one tile worked — stop watching
    });
  }
  const pinsLayer = L.layerGroup().addTo(map);
  const routesLayer = L.layerGroup().addTo(map);
  let me = null;
  let circle = null;

  return {
    kind: "leaflet",
    setMe(loc) {
      if (me) me.remove();
      me = null;
      if (loc) {
        me = L.marker([loc.lat, loc.lng], {
          icon: meIcon,
          interactive: false,
          keyboard: false,
          zIndexOffset: 1000,
        }).addTo(map);
      }
    },
    setRadius(loc, km) {
      if (circle) circle.remove();
      circle = null;
      if (loc && km > 0) {
        try {
          circle = L.circle([loc.lat, loc.lng], {
            radius: km * 1000,
            color: "#1a73e8",
            weight: 2,
            opacity: 0.7,
            fillColor: "#1a73e8",
            fillOpacity: 0.07,
            interactive: false,
          }).addTo(map);
        } catch (e) {
          // the circle is only decoration; never let it break the pins
          console.warn("Could not draw distance circle:", e);
          circle = null;
        }
      }
    },
    setPins(pins, onClick) {
      pinsLayer.clearLayers();
      pins.forEach((p) => {
        const m = L.marker([p.lat, p.lng], {
          icon: pinIcon(p),
          title: p.title,
          zIndexOffset: p.selected ? 900 : 0,
        });
        if (p.popupContent) {
          m.bindPopup(() => {
            const content = document.createElement("div");
            content.style.whiteSpace = "pre-line";
            content.textContent = p.popupContent;
            return content;
          });
        }
        m.on("click", () => onClick(p.id));
        pinsLayer.addLayer(m);
      });
    },
    setRoutes(routes) {
      routesLayer.clearLayers();
      routes.forEach((route) => {
        L.polyline(route.path.map((point) => [point.lat, point.lng]), {
          color: route.color,
          weight: route.weight || 5,
          opacity: 0.85,
          dashArray: route.dashed ? "9 9" : null,
        }).addTo(routesLayer);
      });
    },
    fitPoints(points) {
      if (points.length === 1) map.setView([points[0].lat, points[0].lng], 14);
      else if (points.length > 1)
        map.fitBounds(points.map((p) => [p.lat, p.lng]), { padding: [40, 40] });
    },
    fitRadius(loc, km) {
      const [sw, ne] = radiusBounds(loc, km);
      map.fitBounds([[sw.lat, sw.lng], [ne.lat, ne.lng]], { padding: [10, 10] });
    },
    panTo(c) {
      map.panTo([c.lat, c.lng]);
    },
    invalidate() {
      map.invalidateSize();
    },
    destroy() {
      map.remove();
    },
  };
}

// ----------------------------------------------------------------- Google
async function createGoogleEngine(el, { center, zoom }) {
  const maps = await loadGoogleMaps();
  const map = new maps.Map(el, {
    center,
    zoom,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
  });
  let markers = [];
  let routeLines = [];
  let me = null;
  let circle = null;

  return {
    kind: "google",
    setMe(loc) {
      if (me) me.setMap(null);
      me = null;
      if (loc) {
        me = new maps.Marker({
          position: loc,
          map,
          title: "You are here",
          zIndex: 1000,
          icon: {
            path: maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#1a73e8",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 3,
          },
        });
      }
    },
    setRadius(loc, km) {
      if (circle) circle.setMap(null);
      circle = null;
      if (loc && km > 0) {
        circle = new maps.Circle({
          map,
          center: loc,
          radius: km * 1000,
          strokeColor: "#1a73e8",
          strokeOpacity: 0.7,
          strokeWeight: 2,
          fillColor: "#1a73e8",
          fillOpacity: 0.07,
          clickable: false,
        });
      }
    },
    setPins(pins, onClick) {
      markers.forEach((m) => m.setMap(null));
      markers = pins.map((p) => {
        const name = String(p.label || "Delivery partner").slice(0, 24)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        const fleetSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="190" height="42" viewBox="0 0 190 42"><circle cx="19" cy="21" r="16" fill="${p.color || "#16864a"}" stroke="white" stroke-width="3"/><text x="19" y="26" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" font-weight="700" fill="white">D</text><rect x="38" y="5" width="148" height="32" rx="14" fill="white" stroke="${p.color || "#16864a"}" stroke-width="2"/><text x="46" y="25" font-family="Arial,sans-serif" font-size="12" font-weight="700" fill="#263238">${name}</text></svg>`;
        const m = new maps.Marker({
          position: { lat: p.lat, lng: p.lng },
          map,
          title: p.title,
          icon: p.kind === "fleet"
            ? {
                url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(fleetSvg)}`,
                scaledSize: new maps.Size(190, 42),
                anchor: new maps.Point(19, 21),
              }
            : p.kind === "courier"
            ? {
                path: maps.SymbolPath.CIRCLE,
                scale: 12,
                fillColor: "#16864a",
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 2,
              }
            : {
                path: maps.SymbolPath.CIRCLE,
                scale: p.selected ? 13 : 10,
                fillColor: p.color || "#dc3545",
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 2,
              },
          label: p.kind === "fleet"
            ? undefined
            : { text: String(p.label ?? ""), color: "#ffffff", fontWeight: "700", fontSize: "12px" },
          zIndex: p.selected ? 999 : 1,
          animation: p.selected ? maps.Animation.BOUNCE : null,
        });
        if (p.popupContent) {
          const content = document.createElement("div");
          content.style.whiteSpace = "pre-line";
          content.textContent = p.popupContent;
          const info = new maps.InfoWindow({ content });
          m.addListener("click", () => info.open({ map, anchor: m }));
        }
        m.addListener("click", () => onClick(p.id));
        return m;
      });
    },
    setRoutes(routes) {
      routeLines.forEach((line) => line.setMap(null));
      routeLines = routes.map((route) => new maps.Polyline({
        map,
        path: route.path,
        strokeColor: route.color,
        strokeOpacity: 0.88,
        strokeWeight: route.weight || 5,
        ...(route.dashed ? {
          icons: [{
            icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 },
            offset: "0",
            repeat: "14px",
          }],
          strokeOpacity: 0,
        } : {}),
      }));
    },
    fitPoints(points) {
      if (points.length === 1) {
        map.setCenter(points[0]);
        map.setZoom(14);
      } else if (points.length > 1) {
        const b = new maps.LatLngBounds();
        points.forEach((p) => b.extend(p));
        map.fitBounds(b, 60);
      }
    },
    fitRadius(loc, km) {
      const [sw, ne] = radiusBounds(loc, km);
      const b = new maps.LatLngBounds();
      b.extend(sw);
      b.extend(ne);
      map.fitBounds(b, 20);
    },
    panTo(c) {
      map.panTo(c);
    },
    invalidate() {},
    destroy() {
      markers.forEach((m) => m.setMap(null));
      routeLines.forEach((line) => line.setMap(null));
      if (me) me.setMap(null);
      if (circle) circle.setMap(null);
      el.innerHTML = "";
    },
  };
}

/**
 * Creates the map inside `el`. Uses Google only if a key is set (and works).
 * `onTileError` (optional) fires once if the OpenStreetMap base tiles fail to
 * load — the map is likely still usable (pins work either way), but the
 * background will look blank/grey, which is otherwise unexplained.
 */
export async function createOrderMap(
  el,
  opts,
  { forceLeaflet = false, onTileError } = {},
) {
  if (!forceLeaflet && hasMapsKey()) {
    try {
      return await createGoogleEngine(el, opts);
    } catch (e) {
      console.warn("Google Maps unavailable, using OpenStreetMap:", e);
    }
  }
  return createLeafletEngine(el, opts, { onTileError });
}
