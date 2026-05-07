import maplibregl from "https://esm.sh/maplibre-gl@4.7.1";
import { MAP_CONFIG, VIEW_MODES } from "./config.js";
import { searchFranceTravailOffers } from "../apis/lumenApi.js";
import { inferOfferInsights } from "./offersInsights.js";

let map;
let currentViewMode = VIEW_MODES.SKILLS;
let searchQuery = "";
let isIsometricView = true;
let userMarker = null;
let localizeButton = null;
let tooltip = null;
let offersData = [];
let selectedSkills = [];
let selectedValues = [];
let filterByUserTags = false;
let currentOfferViewMode = "compatibility";
let offersMeta = {
  loading: false,
  loaded: false,
  error: null,
  total: 0,
  localized: 0,
  precise: 0,
  fallback: 0
};

const SOURCES = {
  perimeter: "nantes-perimeter-source",
  offers: "lumen-offers-source"
};

const LAYERS = {
  perimeterFill: "nantes-perimeter-fill",
  perimeterLine: "nantes-perimeter-line",
  offersCircle: "lumen-offers-circle"
};

const OFFERS_FETCH_BATCHES = ["0-149", "150-299"];
const SKILL_TAG_COLORS = ["#D24B87", "#3FBAB4", "#762BE2", "#DE82FF", "#1364C3"];
const VALUE_TAG_COLORS = ["#F2970F", "#EE5FAF", "#2E8AE6", "#52D66A", "#F2C14E"];
const PIE_ICON_SIZE = 64;
const DEFAULT_MARKER_ICON_KEY = "offer-marker-8ab4ff";
const markerIconCache = new Map();
const SIMULATED_OFFERS = [
  {
    id: "sim-uxui-kookline-niwanet",
    intitule: "Alternance - UX/UI Designer (F/H)",
    entreprise: { nom: "Kookline / Niwanet" },
    lieuTravail: {
      libelle: "44980 Sainte-Luce-sur-Loire",
      latitude: 47.2556,
      longitude: -1.4849
    },
    description:
      "Alternance UX/UI Designer. Missions: conception d'interfaces web, ateliers UX, wireframes, prototypage, tests utilisateurs, collaboration produit et developpement.",
    qualitesProfessionnelles: [{ libelle: "Creativite" }, { libelle: "Travail en equipe" }]
  },
  {
    id: "sim-po-chef-projet-digital-beapp",
    intitule: "PO / Chef-fe de projet digital",
    entreprise: { nom: "BeApp" },
    lieuTravail: {
      libelle: "44200 Nantes",
      latitude: 47.2019,
      longitude: -1.5439
    },
    description:
      "Pilotage produit digital, cadrage fonctionnel, priorisation, coordination equipe, suivi roadmap et conception UX en lien avec les parties prenantes.",
    qualitesProfessionnelles: [{ libelle: "Organisation" }, { libelle: "Gestion de projet" }]
  }
];
const AGGLO_CITY_COORDS = {
  nantes: [-1.553621, 47.218371],
  rezé: [-1.5688, 47.1906],
  reze: [-1.5688, 47.1906],
  "saint-herblain": [-1.6479, 47.2136],
  "saint herblain": [-1.6479, 47.2136],
  orvault: [-1.6212, 47.2717],
  carquefou: [-1.4906, 47.2964],
  "la chapelle-sur-erdre": [-1.5522, 47.2986],
  "la chapelle sur erdre": [-1.5522, 47.2986],
  vertou: [-1.4708, 47.1689],
  bouguenais: [-1.6212, 47.1775],
  "basse-goulaine": [-1.4666, 47.2113],
  "basse goulaine": [-1.4666, 47.2113],
  "sainte-luce-sur-loire": [-1.4849, 47.2556],
  "sainte luce sur loire": [-1.4849, 47.2556],
  coueron: [-1.7247, 47.2141],
  "thouaré-sur-loire": [-1.4388, 47.267],
  "thouare-sur-loire": [-1.4388, 47.267],
  "thouare sur loire": [-1.4388, 47.267],
  indre: [-1.668, 47.1969],
  sautron: [-1.6734, 47.2615],
  "les sorinieres": [-1.53, 47.1517],
  "les sorinières": [-1.53, 47.1517],
  "saint-sebastien-sur-loire": [-1.4998, 47.2082],
  "saint sebastien sur loire": [-1.4998, 47.2082],
  "saint-aignan-grandlieu": [-1.6292, 47.1257],
  "saint aignan grandlieu": [-1.6292, 47.1257]
};

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

function normalizeQuery(value) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function rgbaToHex(rgbaColor) {
  const match = rgbaColor.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) return rgbaColor;
  const r = Number(match[1]).toString(16).padStart(2, "0");
  const g = Number(match[2]).toString(16).padStart(2, "0");
  const b = Number(match[3]).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`.toUpperCase();
}

function parseCityKey(value) {
  const normalized = normalizeQuery(value);
  if (!normalized) return "";
  const base = normalized.split("(")[0].trim();
  const compact = base.split("-").join(" ").replace(/\s+/g, " ").trim();
  return compact;
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
  const p = feature.properties;
  const score = currentViewMode === VIEW_MODES.SKILLS ? p.skillScore : p.valueScore;
  const compatibility = Math.round(score || 0);
  const storedMatchedLabels = Array.isArray(p.matchedTagLabels) ? p.matchedTagLabels.slice(0, 3) : [];
  const storedMatchedColors = Array.isArray(p.matchedTagColors) ? p.matchedTagColors.slice(0, 3) : [];
  const computedMatches = currentOfferViewMode === "compatibility" ? getFeatureTagMatches(feature) : [];
  const computedLabels = computedMatches.map((entry) => entry.label).slice(0, 3);
  const computedColors = computedMatches.map((entry) => entry.color).slice(0, 3);
  const matchedTagLabels = storedMatchedLabels.length > 0 ? storedMatchedLabels : computedLabels;
  const matchedTagColors = storedMatchedColors.length > 0 ? storedMatchedColors : computedColors;
  const fallbackTag = currentViewMode === VIEW_MODES.SKILLS ? p.dominantSkill : p.dominantValue;
  const fallbackColor = rgbaToHex(resolveFeatureColor(feature));
  const chipLabels = matchedTagLabels.length > 0 ? matchedTagLabels : [fallbackTag || "Tag"];
  const chipColors = matchedTagColors.length > 0 ? matchedTagColors : [fallbackColor];
  const tagsHtml = chipLabels.map((label, index) => {
    const tagColor = chipColors[index] || chipColors[0] || "#8AB4FF";
    const suffix = index === 0 ? ` - ${compatibility}%` : "";
    return `<span class="onboarding-tag is-active lumen-tooltip-top-tag" style="background:${tagColor};border-color:${tagColor};color:#091127;">${label}${suffix}</span>`;
  }).join(" ");
  tooltip.innerHTML = `
    ${tagsHtml}<br>
    <strong>${p.title || "Offre d'emploi"}</strong><br>
    ${p.company || "Entreprise non renseignee"}<br>
    ${p.city || ""}
  `;
  tooltip.style.display = "block";
  const x = Math.max(12, Math.min(event.point.x + 18, rect.width - 280));
  const y = Math.max(12, Math.min(event.point.y + 18, rect.height - 120));
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
}

function getSkillColorByIndex(index) {
  if (index < 0) return null;
  return SKILL_TAG_COLORS[index % SKILL_TAG_COLORS.length];
}

function getValueColorByIndex(index) {
  if (index < 0) return null;
  return VALUE_TAG_COLORS[index % VALUE_TAG_COLORS.length];
}

function colorWithAlpha(hexColor, alpha = 1) {
  const hex = (hexColor || "").replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return hexColor;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

function parseOfferCoordinates(offer) {
  const lat = Number(offer?.lieuTravail?.latitude);
  const lng = Number(offer?.lieuTravail?.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return {
      coordinates: [lng, lat],
      source: "precise"
    };
  }

  const cityRaw = offer?.lieuTravail?.libelle || "";
  const cityKey = parseCityKey(cityRaw);
  if (!cityKey) return null;
  const fallbackCoords = AGGLO_CITY_COORDS[cityKey];
  if (!fallbackCoords) return null;

  return {
    coordinates: fallbackCoords,
    source: "fallback"
  };
}

function buildOfferFeature(offer) {
  const located = parseOfferCoordinates(offer);
  if (!located) return null;
  const { coordinates, source } = located;

  const distanceToCenter = haversineKm(MAP_CONFIG.nantesCenter, coordinates);
  if (distanceToCenter > MAP_CONFIG.hardLimitRadiusKm + 10) return null;

  const insights = inferOfferInsights(offer);
  const title = offer?.intitule || offer?.appellationlibelle || "Offre France Travail";
  const company = offer?.entreprise?.nom || "";
  const city = offer?.lieuTravail?.libelle || "";
  const offerSkillLikeText = Array.isArray(offer?.competences)
    ? offer.competences.map((item) => item?.libelle || item?.code).filter(Boolean).join(" ")
    : "";
  const offerValueLikeText = Array.isArray(offer?.qualitesProfessionnelles)
    ? offer.qualitesProfessionnelles.map((item) => item?.libelle || item?.description).filter(Boolean).join(" ")
    : "";
  const searchText = normalizeQuery(
    [
      title,
      company,
      city,
      insights.dominantSkill,
      insights.dominantValue,
      offer?.description,
      offerSkillLikeText,
      offerValueLikeText
    ].filter(Boolean).join(" ")
  );
  const score = currentViewMode === VIEW_MODES.SKILLS ? insights.dominantSkillScore : insights.dominantValueScore;

  return {
    type: "Feature",
    geometry: { type: "Point", coordinates },
    properties: {
      offerId: offer?.id || "",
      title,
      company,
      city,
      dominantSkill: insights.dominantSkill,
      dominantValue: insights.dominantValue,
      skillScore: insights.dominantSkillScore,
      valueScore: insights.dominantValueScore,
      radius: 5 + Math.min(11, Math.max(0, score / 10)),
      searchText,
      locationSource: source,
      baseLng: coordinates[0],
      baseLat: coordinates[1],
      overlapKey: `${coordinates[0].toFixed(5)}|${coordinates[1].toFixed(5)}`
    }
  };
}

function metersPerPixel(latitudeDeg, zoom) {
  return (156543.03392 * Math.cos(toRad(latitudeDeg))) / (2 ** zoom);
}

function spreadRadiusKmByZoom(feature, zoom, ring, groupSize = 1) {
  const isFallback = feature?.properties?.locationSource === "fallback";
  const lat = feature?.properties?.baseLat || MAP_CONFIG.nantesCenter[1];
  const mpp = metersPerPixel(lat, zoom);
  const basePx = isFallback ? 36 : 26;
  const ringStepPx = isFallback ? 18 : 13;
  const zoomFactor = Math.max(0.85, Math.min(2.35, (13 - zoom) * 0.25 + 1));
  const densityFactor = 1 + Math.min(0.95, Math.max(0, groupSize - 2) * 0.06);
  const pixels = (basePx + ring * ringStepPx) * zoomFactor * densityFactor;
  return (pixels * mpp) / 1000;
}

function buildDisplayFeaturesForZoom(features, zoom) {
  if (!Array.isArray(features) || features.length === 0) return [];
  const cloned = features.map((feature) => ({
    ...feature,
    geometry: {
      ...feature.geometry,
      coordinates: [feature.properties.baseLng, feature.properties.baseLat]
    }
  }));
  const grouped = new Map();
  cloned.forEach((feature) => {
    const key = feature.properties.overlapKey;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(feature);
  });

  grouped.forEach((group) => {
    if (group.length <= 1) return;

    const originLng = group[0].properties.baseLng;
    const originLat = group[0].properties.baseLat;

    group.forEach((feature, index) => {
      if (index === 0) return;
      const ring = Math.floor((index - 1) / 8);
      const slotInRing = (index - 1) % 8;
      const angle = (slotInRing / 8) * 360;
      const radius = spreadRadiusKmByZoom(feature, zoom, ring, group.length);
      const shifted = destinationPoint([originLng, originLat], radius, angle);
      feature.geometry.coordinates = shifted;
    });
  });

  return cloned;
}

function setStatusContent(message, type = "info") {
  void message;
  void type;
}

function ensureOffersStatus() {
  return;
}

function updateOffersStatus() {
  return;
}

function getFilteredFeatures() {
  const query = normalizeQuery(searchQuery);
  const searchFiltered = query
    ? offersData.filter((feature) => feature.properties.searchText.includes(query))
    : offersData;

  if (!filterByUserTags) {
    return searchFiltered;
  }

  const normalizedSkills = selectedSkills.map((tag) => normalizeQuery(tag)).filter(Boolean);
  const normalizedValues = selectedValues.map((tag) => normalizeQuery(tag)).filter(Boolean);
  const hasActiveTagFilter = normalizedSkills.length > 0 || normalizedValues.length > 0;
  if (!hasActiveTagFilter) {
    return searchFiltered;
  }

  return searchFiltered.filter((feature) => {
    const searchText = feature?.properties?.searchText || "";
    const matchesSkill = normalizedSkills.some((tag) => searchText.includes(tag));
    const matchesValue = normalizedValues.some((tag) => searchText.includes(tag));
    return matchesSkill || matchesValue;
  });
}

function getDefaultModeColor() {
  return currentViewMode === VIEW_MODES.SKILLS ? "rgba(255, 200, 50, 0.88)" : "rgba(138, 180, 255, 0.88)";
}

function resolveFeatureColor(feature) {
  if (currentViewMode === VIEW_MODES.SKILLS) {
    const idx = selectedSkills.indexOf(feature.properties.dominantSkill);
    const base = getSkillColorByIndex(idx);
    return base ? colorWithAlpha(base, 0.78) : getDefaultModeColor();
  }
  const idx = selectedValues.indexOf(feature.properties.dominantValue);
  const base = getValueColorByIndex(idx);
  return base ? colorWithAlpha(base, 0.78) : getDefaultModeColor();
}

function getFeatureMatchIndexes(feature) {
  const text = feature?.properties?.searchText || "";
  const selected = currentViewMode === VIEW_MODES.SKILLS ? selectedSkills : selectedValues;
  return selected
    .map((tag, index) => ({ index, hit: text.includes(normalizeQuery(tag)) }))
    .filter((entry) => entry.hit)
    .slice(0, 3)
    .map((entry) => entry.index);
}

function getFeatureTagMatches(feature) {
  const matchIndexes = getFeatureMatchIndexes(feature);
  if (matchIndexes.length === 0) return [];
  const selected = currentViewMode === VIEW_MODES.SKILLS ? selectedSkills : selectedValues;
  return matchIndexes.map((index) => {
    const label = selected[index];
    const color = currentViewMode === VIEW_MODES.SKILLS
      ? getSkillColorByIndex(index)
      : getValueColorByIndex(index);
    return { label, color };
  }).filter((entry) => Boolean(entry.label && entry.color));
}

function getFeatureSliceColorsFromMatches(feature, matches) {
  if (currentOfferViewMode === "localization") {
    return feature?.properties?.locationSource === "precise" ? ["#8AB4FF"] : ["#B58EFF"];
  }
  if (!Array.isArray(matches) || matches.length === 0) {
    return [rgbaToHex(resolveFeatureColor(feature))];
  }
  return matches.slice(0, 3).map((entry) => entry.color).filter(Boolean);
}

function buildPieImageData(colors) {
  const canvas = document.createElement("canvas");
  canvas.width = PIE_ICON_SIZE;
  canvas.height = PIE_ICON_SIZE;
  const context = canvas.getContext("2d");
  if (!context) return null;

  const cx = PIE_ICON_SIZE / 2;
  const cy = PIE_ICON_SIZE / 2;
  const radius = PIE_ICON_SIZE / 2 - 3;
  const slices = Math.max(1, colors.length);

  for (let i = 0; i < slices; i += 1) {
    const start = (-Math.PI / 2) + (i / slices) * Math.PI * 2;
    const end = (-Math.PI / 2) + ((i + 1) / slices) * Math.PI * 2;
    context.beginPath();
    context.moveTo(cx, cy);
    context.arc(cx, cy, radius, start, end);
    context.closePath();
    context.fillStyle = colors[i] || colors[0];
    context.fill();
  }

  context.beginPath();
  context.arc(cx, cy, radius, 0, Math.PI * 2);
  context.strokeStyle = "rgba(255, 255, 255, 0.72)";
  context.lineWidth = 2.25;
  context.stroke();

  return context.getImageData(0, 0, PIE_ICON_SIZE, PIE_ICON_SIZE);
}

function ensureMarkerIcon(colors) {
  const safeColors = (Array.isArray(colors) && colors.length > 0 ? colors : ["#8AB4FF"]).slice(0, 3);
  const key = `offer-marker-${safeColors.join("-").replace(/[^a-zA-Z0-9-]/g, "").toLowerCase()}`;
  if (markerIconCache.has(key)) return key;
  if (!map) return null;
  if (!map.hasImage(key)) {
    const imageData = buildPieImageData(safeColors);
    if (imageData) {
      map.addImage(key, imageData, { pixelRatio: 2 });
    }
  }
  markerIconCache.set(key, true);
  return key;
}

function refreshOffers() {
  if (!map || !map.getSource(SOURCES.offers)) return;
  const filtered = getFilteredFeatures();
  const zoom = map.getZoom();
  const displayFeatures = buildDisplayFeaturesForZoom(filtered, zoom).map((feature) => {
    const tagMatches = currentOfferViewMode === "compatibility" ? getFeatureTagMatches(feature) : [];
    const sliceColors = getFeatureSliceColorsFromMatches(feature, tagMatches);
    return {
      ...feature,
      properties: {
        ...feature.properties,
        pointColor: resolveFeatureColor(feature),
        markerIcon: ensureMarkerIcon(sliceColors),
        matchedTagLabels: tagMatches.map((entry) => entry.label),
        matchedTagColors: tagMatches.map((entry) => entry.color),
        markerSize: Math.max(0.44, Math.min(0.95, (feature.properties.radius || 6) / 12))
      }
    };
  });
  const data = {
    type: "FeatureCollection",
    features: displayFeatures
  };
  map.getSource(SOURCES.offers).setData(data);
  updateOffersStatus();
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

function addOfferLayers() {
  map.addSource(SOURCES.offers, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] }
  });

  ensureMarkerIcon(["#8AB4FF"]);
  map.addLayer({
    id: LAYERS.offersCircle,
    type: "symbol",
    source: SOURCES.offers,
    layout: {
      "icon-image": ["coalesce", ["get", "markerIcon"], DEFAULT_MARKER_ICON_KEY],
      "icon-size": ["coalesce", ["get", "markerSize"], 0.6],
      "icon-allow-overlap": true,
      "icon-ignore-placement": true
    }
  });

  map.on("mouseenter", LAYERS.offersCircle, () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", LAYERS.offersCircle, () => {
    map.getCanvas().style.cursor = "";
    hideTooltip();
  });
  map.on("mousemove", LAYERS.offersCircle, (event) => {
    const feature = event.features?.[0];
    showTooltip(event, feature);
  });
  map.on("click", LAYERS.offersCircle, (event) => {
    const feature = event.features?.[0];
    showTooltip(event, feature);
  });
}

async function loadOffers() {
  offersMeta = {
    ...offersMeta,
    loading: true,
    error: null
  };
  updateOffersStatus();

  try {
    const responses = await Promise.all(
      OFFERS_FETCH_BATCHES.map((range) =>
        searchFranceTravailOffers({
          departement: "44",
          rayon: 50,
          range,
          tri: 0
        })
      )
    );
    const merged = responses.flatMap((response) => (Array.isArray(response?.resultats) ? response.resultats : []));
    const dedup = new Map();
    merged.forEach((offer) => {
      if (!offer?.id || dedup.has(offer.id)) return;
      dedup.set(offer.id, offer);
    });
    SIMULATED_OFFERS.forEach((offer) => {
      if (!dedup.has(offer.id)) {
        dedup.set(offer.id, offer);
      }
    });
    const results = [...dedup.values()];
    offersData = results.map(buildOfferFeature).filter(Boolean);
    const precise = offersData.filter((feature) => feature.properties.locationSource === "precise").length;
    const fallback = offersData.length - precise;
    offersMeta = {
      loading: false,
      loaded: true,
      error: null,
      total: results.length,
      localized: offersData.length,
      precise,
      fallback
    };
    refreshOffers();
  } catch (error) {
    offersData = [];
    offersMeta = {
      loading: false,
      loaded: true,
      error: error?.message || "Echec de recuperation des offres.",
      total: 0,
      localized: 0,
      precise: 0,
      fallback: 0
    };
    refreshOffers();
  }
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
    addOfferLayers();
    loadOffers();
    initLocalizeButton();
    enforceStrictRadius();
  });

  map.on("moveend", () => {
    enforceStrictRadius();
  });
  map.on("zoom", () => {
    refreshOffers();
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
  if (!map || !map.getLayer(LAYERS.offersCircle)) return;
  refreshOffers();
}

export function setSearchQuery(query, skipRender = false) {
  const normalized = query || "";
  if (searchQuery === normalized) return;
  searchQuery = normalized;
  if (!skipRender) refreshOffers();
}

export function getViewMode() {
  return currentViewMode;
}

export function refreshSessionCriteria() {
  refreshOffers();
}

export function setUserContext(context = {}) {
  selectedSkills = Array.isArray(context.skills) ? context.skills : [];
  selectedValues = Array.isArray(context.values) ? context.values : [];
  refreshOffers();
}

export function setUserFilterActive(active) {
  filterByUserTags = Boolean(active);
  refreshOffers();
}

export function setOfferViewMode(mode) {
  currentOfferViewMode = mode === "localization" ? "localization" : "compatibility";
  refreshOffers();
}

