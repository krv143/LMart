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
const pinIcon = ({ label, color = "#dc3545", selected }) => {
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

function createLeafletEngine(el, { center, zoom }) {
  const map = L.map(el, { center: [center.lat, center.lng], zoom });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);
  const pinsLayer = L.layerGroup().addTo(map);
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
        m.on("click", () => onClick(p.id));
        pinsLayer.addLayer(m);
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
        const m = new maps.Marker({
          position: { lat: p.lat, lng: p.lng },
          map,
          title: p.title,
          label: { text: String(p.label ?? ""), color: "#ffffff", fontWeight: "700" },
          zIndex: p.selected ? 999 : 1,
          animation: p.selected ? maps.Animation.BOUNCE : null,
        });
        m.addListener("click", () => onClick(p.id));
        return m;
      });
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
      if (me) me.setMap(null);
      if (circle) circle.setMap(null);
      el.innerHTML = "";
    },
  };
}

/** Creates the map inside `el`. Uses Google only if a key is set (and works). */
export async function createOrderMap(el, opts, { forceLeaflet = false } = {}) {
  if (!forceLeaflet && hasMapsKey()) {
    try {
      return await createGoogleEngine(el, opts);
    } catch (e) {
      console.warn("Google Maps unavailable, using OpenStreetMap:", e);
    }
  }
  return createLeafletEngine(el, opts);
}
