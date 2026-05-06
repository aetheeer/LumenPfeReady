import maplibregl from "https://esm.sh/maplibre-gl@4.7.1";
import { MAP_CONFIG, VIEW_MODES } from "./config.js";
import { SKILL_LABELS, VALUE_LABELS } from "./corpus.js";

let map;
let currentViewMode = VIEW_MODES.SKILLS;
let searchQuery = "";
let isIsometricView = true;
let userMarker = null;
let userAccuracyCircle = null;
let localizeButton = null;
let tooltip = null;

const SOURCES = {
  perimeter: "nantes-perimeter-source",
  spikes: "lumen-spikes-source"
};

const LAYERS = {
  perimeterFill: "nantes-perimeter-fill",
  perimeterLine: "nantes-perimeter-line",
  spikesCircle: "lumen-spikes-circle",
  spikesLabel: "lumen-spikes-label"
};

const SESSION_KEY = "lumen.onboarding.session";
const SPIKE_TOOLTIP_MESSAGE =
  "Ces indicateurs seront affinés avec les moteurs de calcul et les APIs du POC final.";

function toRad(value) {
  return (value * Math.PI) / 180;
}

function toDeg(value) {
  return (value * 180) / Math.PI;
}

function haversineKm(a, b) {
  const r = 6371;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * r * Math.asin(Math.sqrt(h));
}

function bearingDeg(from, to) {
  const lon1 = toRad(from[0]);
  const lat1 = toRad(from[1]);
  const lon2 = toRad(to[0]);
  const lat2 = toRad(to[1]);
  const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function destinationPoint(origin, distanceKm, bearing) {
  const r = 6371;
  const delta = distanceKm / r;
  const theta = toRad(bearing);
  const lat1 = toRad(origin[1]);
  const lon1 = toRad(origin[0]);
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(delta) +
      Math.cos(lat1) * Math.sin(delta) * Math.cos(theta)
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(theta) * Math.sin(delta) * Math.cos(lat1),
      Math.cos(delta) - Math.sin(lat1) * Math.sin(lat2)
    );
  return [toDeg(lon2), toDeg(lat2)];
}

function buildCircle(center, radiusKm, steps = 96) {
  const points = [];
  for (let i = 0; i <= steps; i += 1) {
    const angle = (i / steps) * 360;
    points.push(destinationPoint(center, radiusKm, angle));
  }
  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [points] },
    properties: {}
  };
}

function getBoundsFromCircle(center, radiusKm) {
  const north = destinationPoint(center, radiusKm, 0);
  const south = destinationPoint(center, radiusKm, 180);
  const east = destinationPoint(center, radiusKm, 90);
  const west = destinationPoint(center, radiusKm, 270);
  return [
    [west[0], south[1]],
    [east[0], north[1]]
  ];
}

function parseSessionData() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function mulberry32(seed) {
  let t = seed;
  return function next() {
    t += 0x6d2b79f5;
    let v = Math.imul(t ^ (t >>> 15), t | 1);
    v ^= v + Math.imul(v ^ (v >>> 7), v | 61);
    return ((v ^ (v >>> 14)) >>> 0) / 4294967296;
  };
}

function normalizeQuery(value) {
  return (value || "").trim().toLowerCase();
}

function getBaseLabels() {
  return currentViewMode === VIEW_MODES.SKILLS ? SKILL_LABELS : VALUE_LABELS;
}

function getPreferredLabels() {
  const session = parseSessionData();
  if (currentViewMode === VIEW_MODES.SKILLS && Array.isArray(session.skills) && session.skills.length > 0) {
    return session.skills;
  }
  if (currentViewMode === VIEW_MODES.VALUES && Array.isArray(session.values) && session.values.length > 0) {
    return session.values;
  }
  return [];
}

function generateSpikeFeatures() {
  const center = MAP_CONFIG.nantesCenter;
  const radiusKm = MAP_CONFIG.hardLimitRadiusKm;
  const query = normalizeQuery(searchQuery);
  const baseLabels = getBaseLabels();
  const preferred = getPreferredLabels();
  const labelsPool = [...new Set([...preferred, ...baseLabels])];
  const filteredPool = query
    ? labelsPool.filter((label) => label.toLowerCase().includes(query))
    : labelsPool;

  if (filteredPool.length === 0) {
    return [];
  }

  const random = mulberry32(4206 + currentViewMode.length + query.length);
  const count = Math.min(160, Math.max(45, filteredPool.length * 4));
  const features = [];

  for (let i = 0; i < count; i += 1) {
    const theta = random() * Math.PI * 2;
    const dist = Math.sqrt(random()) * radiusKm * 0.94;
    const dLat = dist / 111;
    const dLng = dist / (111 * Math.cos(toRad(center[1])));
    const lng = center[0] + Math.cos(theta) * dLng;
    const lat = center[1] + Math.sin(theta) * dLat;
    const label = filteredPool[Math.floor(random() * filteredPool.length)];
    const weight = random();
    const score = Math.round(30 + weight * 70);

    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties: {
        label,
        score,
        radius: 5 + weight * 8
      }
    });
  }

  return features;
}

function ensureTooltip() {
  if (tooltip) return;
  const host = document.querySelector(".map-wrapper");
  if (!host) return;
  tooltip = document.createElement("div");
  tooltip.className = "lumen-spike-tooltip";
  tooltip.style.display = "none";
  host.appendChild(tooltip);
}

function hideTooltip() {
  if (!tooltip) return;
  tooltip.style.display = "none";
}

function showTooltip(event, feature) {
  ensureTooltip();
  if (!tooltip || !feature?.properties) return;
  const host = document.querySelector(".map-wrapper");
  if (!host) return;
  const rect = host.getBoundingClientRect();
  tooltip.innerHTML = `<strong>${feature.properties.label}</strong><br>${feature.properties.score}%<br>${SPIKE_TOOLTIP_MESSAGE}`;
  tooltip.style.display = "block";
  const x = Math.max(12, Math.min(event.point.x + 18, rect.width - 280));
  const y = Math.max(12, Math.min(event.point.y + 18, rect.height - 120));
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
}

function refreshSpikes() {
  if (!map || !map.getSource(SOURCES.spikes)) return;
  const data = {
    type: "FeatureCollection",
    features: generateSpikeFeatures()
  };
  map.getSource(SOURCES.spikes).setData(data);
}

function enforceStrictRadius() {
  if (!map) return;
  const center = MAP_CONFIG.nantesCenter;
  const maxKm = MAP_CONFIG.hardLimitRadiusKm;
  const current = map.getCenter();
  const currentCoord = [current.lng, current.lat];
  const distance = haversineKm(center, currentCoord);
  if (distance <= maxKm) return;
  const bearing = bearingDeg(center, currentCoord);
  const clamped = destinationPoint(center, maxKm - 0.15, bearing);
  map.easeTo({ center: clamped, duration: 240 });
}

function addPerimeterLayers() {
  const circleFeature = buildCircle(MAP_CONFIG.nantesCenter, MAP_CONFIG.hardLimitRadiusKm);
  map.addSource(SOURCES.perimeter, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [circleFeature] }
  });

  map.addLayer({
    id: LAYERS.perimeterFill,
    type: "fill",
    source: SOURCES.perimeter,
    paint: {
      "fill-color": "#4c6fff",
      "fill-opacity": 0.06
    }
  });

  map.addLayer({
    id: LAYERS.perimeterLine,
    type: "line",
    source: SOURCES.perimeter,
    paint: {
      "line-color": "#8ab4ff",
      "line-width": 2,
      "line-opacity": 0.85
    }
  });
}

function addSpikeLayers() {
  map.addSource(SOURCES.spikes, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] }
  });

  map.addLayer({
    id: LAYERS.spikesCircle,
    type: "circle",
    source: SOURCES.spikes,
    paint: {
      "circle-radius": ["coalesce", ["get", "radius"], 6],
      "circle-color":
        currentViewMode === VIEW_MODES.SKILLS ? "rgba(255, 200, 50, 0.9)" : "rgba(138, 180, 255, 0.9)",
      "circle-stroke-color": "rgba(255,255,255,0.6)",
      "circle-stroke-width": 1,
      "circle-opacity": 0.85
    }
  });

  map.addLayer({
    id: LAYERS.spikesLabel,
    type: "symbol",
    source: SOURCES.spikes,
    layout: {
      "text-field": ["get", "label"],
      "text-size": 11,
      "text-offset": [0, 1.2],
      "text-anchor": "top",
      "text-allow-overlap": false
    },
    paint: {
      "text-color": "rgba(245,245,255,0.92)",
      "text-halo-color": "rgba(6,10,24,0.95)",
      "text-halo-width": 1.1
    }
  });

  map.on("mouseenter", LAYERS.spikesCircle, () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", LAYERS.spikesCircle, () => {
    map.getCanvas().style.cursor = "";
    hideTooltip();
  });
  map.on("mousemove", LAYERS.spikesCircle, (event) => {
    const feature = event.features?.[0];
    showTooltip(event, feature);
  });
  map.on("click", LAYERS.spikesCircle, (event) => {
    const feature = event.features?.[0];
    showTooltip(event, feature);
  });
}

function initLocalizeButton() {
  localizeButton = document.getElementById("btn-locate");
  if (!localizeButton) return;
  localizeButton.addEventListener("click", () => locateUser());
}

function buildAccuracyPolygon(center, radiusMeters, steps = 48) {
  const radiusKm = radiusMeters / 1000;
  const coords = [];
  for (let i = 0; i <= steps; i += 1) {
    coords.push(destinationPoint(center, radiusKm, (360 * i) / steps));
  }
  return { type: "Feature", geometry: { type: "Polygon", coordinates: [coords] }, properties: {} };
}

export function locateUser() {
  if (!map || !navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const coords = [position.coords.longitude, position.coords.latitude];
      const distance = haversineKm(MAP_CONFIG.nantesCenter, coords);
      if (distance > MAP_CONFIG.hardLimitRadiusKm) {
        const bearing = bearingDeg(MAP_CONFIG.nantesCenter, coords);
        const clamped = destinationPoint(MAP_CONFIG.nantesCenter, MAP_CONFIG.hardLimitRadiusKm - 0.1, bearing);
        map.easeTo({ center: clamped, zoom: Math.max(map.getZoom(), 12), duration: 500 });
      } else {
        map.easeTo({ center: coords, zoom: Math.max(map.getZoom(), 13), duration: 500 });
      }

      if (userMarker) userMarker.remove();
      userMarker = new maplibregl.Marker({ color: "#8ab4ff" }).setLngLat(coords).addTo(map);

      const accuracyMeters = Math.min(position.coords.accuracy || 120, 1200);
      const accuracyFeature = buildAccuracyPolygon(coords, accuracyMeters);
      if (!map.getSource("user-accuracy-source")) {
        map.addSource("user-accuracy-source", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [accuracyFeature] }
        });
        map.addLayer({
          id: "user-accuracy-layer",
          type: "fill",
          source: "user-accuracy-source",
          paint: {
            "fill-color": "#8ab4ff",
            "fill-opacity": 0.12
          }
        });
      } else {
        map.getSource("user-accuracy-source").setData({
          type: "FeatureCollection",
          features: [accuracyFeature]
        });
      }
    },
    (error) => {
      console.warn("[Lumen] Géolocalisation indisponible :", error?.message || error);
      alert("Impossible d'accéder à la géolocalisation. Vérifiez l'autorisation navigateur.");
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
  );
}

export function initMap(container) {
  if (!container) return;
  container.innerHTML = "";
  ensureTooltip();

  const bounds = getBoundsFromCircle(MAP_CONFIG.nantesCenter, MAP_CONFIG.hardLimitRadiusKm);
  map = new maplibregl.Map({
    container,
    style: MAP_CONFIG.mapStyle,
    center: MAP_CONFIG.nantesCenter,
    zoom: MAP_CONFIG.initialZoom,
    pitch: 45,
    bearing: -15,
    minZoom: MAP_CONFIG.minZoom,
    maxZoom: MAP_CONFIG.maxZoom,
    maxBounds: bounds,
    attributionControl: false
  });

  map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");

  map.on("load", () => {
    addPerimeterLayers();
    addSpikeLayers();
    refreshSpikes();
    initLocalizeButton();
    enforceStrictRadius();
  });

  map.on("moveend", () => {
    enforceStrictRadius();
  });
}

export function resizeMap() {
  if (map) map.resize();
}

export function zoomIn() {
  if (!map) return;
  map.easeTo({ zoom: map.getZoom() + 0.8, duration: 200 });
}

export function zoomOut() {
  if (!map) return;
  map.easeTo({ zoom: map.getZoom() - 0.8, duration: 200 });
}

export function resetView() {
  if (!map) return;
  map.easeTo({
    center: MAP_CONFIG.nantesCenter,
    zoom: MAP_CONFIG.initialZoom,
    pitch: isIsometricView ? 45 : 0,
    bearing: isIsometricView ? -15 : 0,
    duration: 300
  });
}

export function toggleViewMode() {
  if (!map) return isIsometricView;
  isIsometricView = !isIsometricView;
  map.easeTo({
    pitch: isIsometricView ? 45 : 0,
    bearing: isIsometricView ? -15 : 0,
    duration: 450
  });
  return isIsometricView;
}

export function setViewMode(mode) {
  currentViewMode = mode;
  if (!map || !map.getLayer(LAYERS.spikesCircle)) return;
  map.setPaintProperty(
    LAYERS.spikesCircle,
    "circle-color",
    currentViewMode === VIEW_MODES.SKILLS ? "rgba(255, 200, 50, 0.9)" : "rgba(138, 180, 255, 0.9)"
  );
  refreshSpikes();
}

export function setSearchQuery(query, skipRender = false) {
  const normalized = query || "";
  if (searchQuery === normalized) return;
  searchQuery = normalized;
  if (!skipRender) refreshSpikes();
}

export function getViewMode() {
  return currentViewMode;
}

export function refreshSessionCriteria() {
  refreshSpikes();
}

