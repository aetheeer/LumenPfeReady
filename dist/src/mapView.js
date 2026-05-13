import maplibregl from "https://esm.sh/maplibre-gl@4.7.1";
import { MAP_CONFIG, VIEW_MODES } from "./config.js";
import { searchFranceTravailOffers } from "../apis/lumenApi.js";
import {
  inferOfferInsights,
  inferDisplayCorpusSkillsForOffer,
  offerPredominantlyRequiresHardUnmasteredSkills,
  offerHasOnlyAccessibleDisplayedSkills
} from "./offersInsights.js";
import { FR_DEPARTMENTS_GEOJSON } from "./frDepartmentsGeojson.js";

let map;
let currentViewMode = VIEW_MODES.SKILLS;
let searchQuery = "";
let isIsometricView = true;
let userMarker = null;
let compatibilityCenterMarker = null;
let localizeButton = null;
let tooltip = null;
let offerPopup = null;
let currentOfferViewMode = "localization";
let onboardingProfileId = null;
let urgentProfileActive = false;
let urgentUserAnchor = null;
let offersData = [];
let offersRawById = new Map();
let offersRevision = 0;
let departmentOfferSignals = new Map();
let selectedSkills = [];
let selectedValues = [];
let activeSkillFilters = [];
let activeValueFilters = [];
/** Mode compatibilité : vivier figé côté compétences pour réutiliser les mêmes offres en vue Valeurs. */
let compatibilitySkillOfferIds = null;
let sectorizationDominantSkills = new Set();
let sectorizationDominantValues = new Set();
let lastSectorizationDataSignature = "";
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
  offers: "lumen-offers-source",
  labels: "lumen-labels-source",
  pdlFocus: "lumen-pdl-focus-source",
  urgentRadius: "lumen-urgent-radius-source",
  sectorDepartments: "lumen-sector-departments-source",
  sectorDepartmentLabels: "lumen-sector-departments-labels-source",
  compatibilityRings: "lumen-compatibility-rings-source",
  compatibilityCenter: "lumen-compatibility-center-source"
};

const LAYERS = {
  perimeterFill: "nantes-perimeter-fill",
  perimeterLine: "nantes-perimeter-line",
  offersCircle: "lumen-offers-circle",
  labels: "lumen-labels",
  pdlFocusFill: "lumen-pdl-focus-fill",
  pdlFocusLine: "lumen-pdl-focus-line",
  sectorDepartmentsFill: "lumen-sector-departments-fill",
  sectorDepartmentsLine: "lumen-sector-departments-line",
  sectorDepartmentsLabel: "lumen-sector-departments-label",
  compatibilityRingInner: "lumen-compatibility-ring-inner",
  compatibilityRingMid: "lumen-compatibility-ring-mid",
  compatibilityRingOuter: "lumen-compatibility-ring-outer",
  compatibilityCenterDot: "lumen-compatibility-center-dot",
  compatibilityCenterLabel: "lumen-compatibility-center-label",
  urgentRadiusFill: "lumen-urgent-radius-fill",
  urgentRadiusLine: "lumen-urgent-radius-line"
};

const OFFERS_FETCH_BATCHES = ["0-149", "150-299"];
const OFFERS_TARGET_DEPARTMENTS = ["44", "49", "53", "72", "85"];
const PDL_DEPARTMENT_CODES = new Set(OFFERS_TARGET_DEPARTMENTS);
const SECTOR_VIEW_CENTER = [-0.95, 47.38];
const SECTOR_VIEW_ZOOM = MAP_CONFIG.minZoom;
const SECTOR_MIN_ZOOM = Math.max(4.6, MAP_CONFIG.minZoom - 3.2);
const VIEW_TRANSITION_DURATION_MS = 820;
/** Profil urgence : filtre géographique des offres (km autour de la position). */
const URGENT_SEARCH_RADIUS_KM = 10;

const FORMATION_LEVEL_ORDER = ["easy", "medium", "hard"];
const FORMATION_META = {
  easy: { label: "Formation simple", cssClass: "lumen-formation-simple" },
  medium: { label: "Formation modérée", cssClass: "lumen-formation-moderee" },
  hard: { label: "Formation longue", cssClass: "lumen-formation-longue" }
};

const SKILL_BASE_COLOR = "#7EB5FF";
const VALUE_BASE_COLOR = "#F2C14E";
const SKILL_COMPAT_PALETTE = ["#DCEEFF", "#A8CDFF", "#5D9EFF", "#2E73DA", "#15458F"];
const VALUE_COMPAT_PALETTE = ["#FFF6D8", "#FFE8A3", "#FFD35C", "#E8B23E", "#B9851D"];
const MARKER_ICON_SIZE = 72;
const markerIconCache = new Map();
const INSUFFICIENT_SECTOR_LABEL = "Données insuffisantes";
const INSUFFICIENT_SKILL_LABEL = "Non déterminée";
const INSUFFICIENT_VALUE_LABEL = "Non déterminée";
const FR_DEPARTMENT_CODES = (Array.isArray(FR_DEPARTMENTS_GEOJSON?.features) ? FR_DEPARTMENTS_GEOJSON.features : [])
  .map((feature) => String(feature?.properties?.code || ""))
  .filter(Boolean);
const SECTOR_TARGET_DEPARTMENT_CODES = FR_DEPARTMENT_CODES.filter((code) => PDL_DEPARTMENT_CODES.has(code));
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
const CITY_AND_HOTSPOT_LABELS = [
  { name: "Nantes", kind: "city", coordinates: [-1.5536, 47.2184] },
  { name: "Rennes", kind: "city", coordinates: [-1.6778, 48.1173] },
  { name: "Le Mans", kind: "city", coordinates: [0.1996, 48.0061] },
  { name: "Cholet", kind: "city", coordinates: [-0.8787, 47.0594] },
  { name: "Angers", kind: "city", coordinates: [-0.5632, 47.4784] },
  { name: "Laval", kind: "city", coordinates: [-0.7718, 48.0700] },
  { name: "La Roche-sur-Yon", kind: "city", coordinates: [-1.4260, 46.6705] },
  { name: "Saint-Nazaire", kind: "city", coordinates: [-2.2137, 47.2735] },
  { name: "Pornic", kind: "city", coordinates: [-2.1032, 47.1120] },
  { name: "Challans", kind: "city", coordinates: [-1.8783, 46.8440] },
  { name: "Saumur", kind: "city", coordinates: [-0.0781, 47.2596] },
  { name: "Rezé", kind: "city", coordinates: [-1.5688, 47.1906] },
  { name: "Saint-Herblain", kind: "city", coordinates: [-1.6479, 47.2136] }
];

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

function getCompatibilityMapCenterLngLat() {
  if (urgentProfileActive && Array.isArray(urgentUserAnchor) && urgentUserAnchor.length === 2) {
    return urgentUserAnchor;
  }
  return MAP_CONFIG.nantesCenter;
}

function sortRankedRowsByFormationTier(rows) {
  const out = [];
  FORMATION_LEVEL_ORDER.forEach((tier) => {
    (rows || []).forEach((row) => {
      const lev =
        row.learnability === "easy" || row.learnability === "hard" || row.learnability === "medium"
          ? row.learnability
          : "medium";
      if (lev === tier) out.push(row);
    });
  });
  return out;
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

/** Clé stable pour fusionner les doublons « même annonce » (IDs France Travail parfois distincts). */
function normalizeOfferFingerprint(offer) {
  const title = normalizeQuery((offer?.intitule || offer?.appellationlibelle || "").replace(/\s+/g, " "));
  const city = normalizeQuery((offer?.lieuTravail?.libelle || "").replace(/\s+/g, " "));
  const company = normalizeQuery((offer?.entreprise?.nom || "").replace(/\s+/g, " "));
  return `${title}|${city}|${company}`;
}

function hasPreciseOfferCoords(offer) {
  const lat = Number(offer?.lieuTravail?.latitude);
  const lng = Number(offer?.lieuTravail?.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng);
}

function toSectorSlug(value) {
  const normalized = normalizeQuery(value);
  return normalized
    .replace(/&/g, " ")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function inferDominantSectorFromOffer(offer) {
  const extractRomeCode = (entry) => {
    const candidates = [
      entry?.codeRome,
      entry?.romeCode,
      entry?.appellation?.codeRome,
      entry?.metier?.codeRome,
      entry?.familleRome?.code,
      entry?.origineOffre?.codeRome
    ];
    const fromList = Array.isArray(entry?.romeCodes) ? entry.romeCodes[0] : null;
    if (fromList) candidates.push(fromList);
    const found = candidates.find((value) => typeof value === "string" && /^[A-Z]\d{4}$/i.test(value.trim()));
    return found ? found.trim().toUpperCase() : "";
  };
  const ROME_SECTOR_BY_PREFIX = {
    A: "Agriculture / environnement",
    B: "Arts / artisanat",
    C: "Banque / assurance / immobilier",
    D: "Commerce / vente",
    E: "Communication / multimédia",
    F: "BTP / construction",
    G: "Hôtellerie / restauration / tourisme",
    H: "Industrie",
    I: "Installation / maintenance",
    J: "Santé",
    K: "Services à la personne / action sociale",
    L: "Spectacle",
    M: "Support entreprise / gestion",
    N: "Transport / logistique"
  };
  const romeCode = extractRomeCode(offer);
  if (romeCode) {
    const sector = ROME_SECTOR_BY_PREFIX[romeCode[0]];
    if (sector) return sector;
  }

  const text = normalizeQuery([
    offer?.intitule,
    offer?.description,
    offer?.entreprise?.nom
  ].filter(Boolean).join(" "));
  if (!text) return "Autres services";
  // Strict fallback keywords only when ROME is unavailable.
  if (/(informatique|logiciel|developpeur|developpement|data|cybersecurit|ux|ui design|numerique)/.test(text)) return "Numérique & services";
  if (/(infirm|soignant|medical|medic|sante|social|aide a domicile)/.test(text)) return "Santé";
  if (/(logist|transport|entrepot|supply|cariste|livraison)/.test(text)) return "Transport / logistique";
  if (/(production|industrie|usinage|maintenance|qualite)/.test(text)) return "Industrie";
  if (/(vente|commerce|conseil client|negociation)/.test(text)) return "Commerce / vente";
  if (/(tourisme|hotel|restauration|accueil)/.test(text)) return "Hôtellerie / restauration / tourisme";
  if (/(gestion|administratif|comptabil|support|rh|ressources humaines)/.test(text)) return "Support entreprise / gestion";
  if (/(btp|chantier|construction|macon|electricien|plombier)/.test(text)) return "BTP / construction";
  if (/(agricol|environnement|paysagiste|espaces verts)/.test(text)) return "Agriculture / environnement";
  return "Autres services";
}

function getDepartmentCodeFromOffer(offer, feature) {
  const departementRaw = offer?.lieuTravail?.codeDepartement || offer?.lieuTravail?.codePostal || offer?._requestedDepartment || "";
  const clean = String(departementRaw).trim();
  if (/^\d{2}/.test(clean)) {
    return clean.slice(0, 2);
  }
  const cityKey = parseCityKey(offer?.lieuTravail?.libelle || feature?.properties?.city || "");
  if (!cityKey) return "";
  const cityDept = {
    nantes: "44",
    "saint herblain": "44",
    reze: "44",
    "la roche sur yon": "85",
    angers: "49",
    laval: "53",
    "le mans": "72"
  };
  return cityDept[cityKey] || "";
}

function applyPdlFocusGeojson(features) {
  if (!map?.getSource(SOURCES.pdlFocus)) return;
  map.getSource(SOURCES.pdlFocus).setData({
    type: "FeatureCollection",
    features: Array.isArray(features) ? features : []
  });
}

function hexToRgb(hexColor) {
  const hex = (hexColor || "").replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16)
  };
}

function mixHexColors(colorA, colorB, ratio) {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  if (!a || !b) return colorA;
  const t = Math.max(0, Math.min(1, ratio));
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bVal = Math.round(a.b + (b.b - a.b) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bVal.toString(16).padStart(2, "0")}`.toUpperCase();
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

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getUserMasteredSkillNormSet() {
  const src = activeSkillFilters.length > 0 ? activeSkillFilters : selectedSkills;
  return new Set((src || []).map((t) => normalizeQuery(t)).filter(Boolean));
}

function buildUrgentFormationGroupsHtml(rows) {
  let list = Array.isArray(rows) ? [...rows] : [];
  const mastered = getUserMasteredSkillNormSet();
  list = list.filter((row) => !mastered.has(normalizeQuery(row.label)));
  if (list.length === 0) return "";
  const sorted = sortRankedRowsByFormationTier(list);
  const chunks = [];
  FORMATION_LEVEL_ORDER.forEach((tier) => {
    const tierRows = sorted.filter((row) => {
      const lev =
        row.learnability === "easy" || row.learnability === "hard" || row.learnability === "medium"
          ? row.learnability
          : "medium";
      return lev === tier;
    });
    if (tierRows.length === 0) return;
    const meta = FORMATION_META[tier];
    chunks.push(`<div class="lumen-formation-group">`);
    chunks.push(`<div class="lumen-formation-heading ${meta.cssClass}">${escapeHtml(meta.label)}</div>`);
    tierRows.forEach((row) => {
      chunks.push(`<div class="lumen-formation-line">${escapeHtml(row.label || "")}</div>`);
    });
    chunks.push("</div>");
  });
  return chunks.join("");
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
  const computedMatches = getFeatureTagMatches(feature);
  const computedLabels = computedMatches.map((entry) => entry.label).slice(0, 3);
  const matchedTagLabels = storedMatchedLabels.length > 0 ? storedMatchedLabels : computedLabels;
  const fallbackTag = currentViewMode === VIEW_MODES.SKILLS ? p.dominantSkill : p.dominantValue;
  const chipLabels = matchedTagLabels.length > 0 ? matchedTagLabels : [fallbackTag || "Tag"];
  const tagColor = currentViewMode === VIEW_MODES.VALUES ? VALUE_BASE_COLOR : "#7EB5FF";
  const tagsHtml = chipLabels.map((label, index) => {
    const suffix = index === 0 && !urgentProfileActive ? ` - ${compatibility}%` : "";
    return `<span class="onboarding-tag is-active lumen-tooltip-top-tag" style="background:${tagColor};border-color:${tagColor};color:#091127;">${escapeHtml(label)}${suffix}</span>`;
  }).join(" ");

  let rankedHtml = "";
  if (urgentProfileActive && typeof p.rankedCorpusSkillsJson === "string" && p.rankedCorpusSkillsJson) {
    try {
      const rows = JSON.parse(p.rankedCorpusSkillsJson);
      if (Array.isArray(rows) && rows.length > 0) {
        const formationHtml = buildUrgentFormationGroupsHtml(rows);
        rankedHtml = formationHtml ? `<div class="lumen-tooltip-ranked">${formationHtml}</div>` : "";
      }
    } catch (_) {
      rankedHtml = "";
    }
  }

  tooltip.innerHTML = `
    ${tagsHtml}<br>
    ${rankedHtml}
    <strong>${escapeHtml(p.title || "Offre d'emploi")}</strong><br>
    ${escapeHtml(p.company || "Entreprise non renseignee")}<br>
    ${escapeHtml(p.city || "")}
  `;
  tooltip.style.display = "block";
  const x = Math.max(12, Math.min(event.point.x + 18, rect.width - 280));
  const y = Math.max(12, Math.min(event.point.y + 18, rect.height - 120));
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
}

function showSectorTooltip(event, feature) {
  ensureTooltip();
  if (!tooltip || !feature?.properties) return;
  const host = document.querySelector(".map-wrapper");
  if (!host) return;
  const rect = host.getBoundingClientRect();
  const p = feature.properties;
  const valueLine = urgentProfileActive
    ? ""
    : `<br>Valeur dominante : ${escapeHtml(p.dominantValue || "Non renseignée")}`;
  tooltip.innerHTML = `
    <span class="onboarding-tag is-active lumen-tooltip-top-tag" style="background:${escapeHtml(p.sectorColor || "#4EA1FF")};border-color:${escapeHtml(p.sectorColor || "#4EA1FF")};color:#081022;">${escapeHtml(p.dominantSector || "Secteur")}</span><br>
    <strong>${escapeHtml(p.nom || `Département ${p.code || ""}`)}</strong><br>
    Compétence dominante : ${escapeHtml(p.dominantSkill || "Non renseignée")}${valueLine}
  `;
  tooltip.style.display = "block";
  const x = Math.max(12, Math.min(event.point.x + 18, rect.width - 320));
  const y = Math.max(12, Math.min(event.point.y + 18, rect.height - 150));
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
}

function colorWithAlpha(hexColor, alpha = 1) {
  const hex = (hexColor || "").replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return hexColor;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

function getOfferMatchRatio(feature) {
  const matchedCount = getFeatureTagMatches(feature).length;
  const matchRatioByCount = {
    0: 0,
    1: 0,
    2: 0.78,
    3: 1
  };
  return matchRatioByCount[Math.min(3, Math.max(0, matchedCount))] ?? 0;
}

function getGradientTargetHexByRatio(ratio) {
  const palette = currentViewMode === VIEW_MODES.VALUES ? VALUE_COMPAT_PALETTE : SKILL_COMPAT_PALETTE;
  const clamped = Math.max(0, Math.min(1, ratio));
  const index = Math.round(clamped * (palette.length - 1));
  return palette[index] || palette[0];
}

function getSectorCompatibilityColorByRatio(ratio) {
  const clamped = Math.max(0, Math.min(1, ratio));
  const index = Math.round(clamped * (SKILL_COMPAT_PALETTE.length - 1));
  return SKILL_COMPAT_PALETTE[index] || SKILL_COMPAT_PALETTE[0];
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

function extractOfferUrl(offer) {
  const title = (offer?.intitule || offer?.appellationlibelle || "").trim();
  const city = (offer?.lieuTravail?.libelle || "").trim();
  const searchTerms = [title, city].filter(Boolean).join(" ");
  if (searchTerms) {
    return `https://candidat.francetravail.fr/offres/recherche?motsCles=${encodeURIComponent(searchTerms)}`;
  }
  const offerId = typeof offer?.id === "string" ? offer.id.trim() : "";
  if (offerId) {
    return `https://candidat.francetravail.fr/offres/recherche?motsCles=${encodeURIComponent(offerId)}`;
  }
  const candidates = [
    offer?.origineOffre?.urlOrigine,
    offer?.origineOffre?.url,
    offer?.urlOrigine,
    offer?.url,
    offer?.lienPostulation
  ];
  const found = candidates.find((value) => typeof value === "string" && /^https?:\/\//i.test(value.trim()));
  return found ? found.trim() : "";
}

function buildOfferFeature(offer) {
  const located = parseOfferCoordinates(offer);
  if (!located) return null;
  const { coordinates, source } = located;

  const insights = inferOfferInsights(offer);
  const rankedCorpusSkills = inferDisplayCorpusSkillsForOffer(offer);
  const title = offer?.intitule || offer?.appellationlibelle || "Offre France Travail";
  const company = offer?.entreprise?.nom || "";
  const city = offer?.lieuTravail?.libelle || "";
  const offerUrl = extractOfferUrl(offer);
  const offerSkillLikeText = Array.isArray(offer?.competences)
    ? offer.competences.map((item) => item?.libelle || item?.code).filter(Boolean).join(" ")
    : "";
  const offerValueLikeText = Array.isArray(offer?.qualitesProfessionnelles)
    ? offer.qualitesProfessionnelles.map((item) => item?.libelle || item?.description).filter(Boolean).join(" ")
    : "";
  const offerDescription = (offer?.description || "").trim();
  // Texte de correspondance par axe : évite qu'un tag compétence matche via la
  // valeur dominante inférée (et inversement) lors du filtrage / multicalcule.
  const skillMatchText = normalizeQuery(
    [title, company, city, insights.dominantSkill, offerSkillLikeText, offerDescription].filter(Boolean).join(" ")
  );
  const valueMatchText = normalizeQuery(
    [title, company, city, insights.dominantValue, offerValueLikeText, offerDescription].filter(Boolean).join(" ")
  );
  const searchText = normalizeQuery(
    [title, company, city, insights.dominantSkill, insights.dominantValue, offerDescription, offerSkillLikeText, offerValueLikeText]
      .filter(Boolean)
      .join(" ")
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
      offerDescription,
      offerUrl,
      rawOfferId: offer?.id || "",
      dominantSkill: insights.dominantSkill,
      dominantValue: insights.dominantValue,
      skillScore: insights.dominantSkillScore,
      valueScore: insights.dominantValueScore,
      radius: 5 + Math.min(11, Math.max(0, score / 10)),
      searchText,
      skillMatchText,
      valueMatchText,
      locationSource: source,
      baseLng: coordinates[0],
      baseLat: coordinates[1],
      overlapKey: `${coordinates[0].toFixed(5)}|${coordinates[1].toFixed(5)}`,
      rankedCorpusSkillsJson: JSON.stringify(
        rankedCorpusSkills.map(({ label, learnability, rawScore }) => ({ label, learnability, rawScore }))
      )
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
  const basePx = isFallback ? 16 : 12;
  const ringStepPx = isFallback ? 8 : 6;
  const zoomFactor = Math.max(0.75, Math.min(1.2, (12 - zoom) * 0.08 + 1));
  const densityFactor = 1 + Math.min(0.95, Math.max(0, groupSize - 2) * 0.06);
  const pixels = (basePx + ring * ringStepPx) * zoomFactor * densityFactor;
  const rawRadiusKm = (pixels * mpp) / 1000;
  // Keep centroid spreading visually tight at regional zoom levels.
  const maxRadiusKm = zoom <= 8 ? 2.2 : zoom <= 9.5 ? 1.6 : zoom <= 11 ? 1.05 : 0.62;
  return Math.min(rawRadiusKm, maxRadiusKm);
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

function hashFromString(value) {
  const text = String(value || "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function getCompatibilityBand(ratio) {
  if (ratio >= 0.9) return "inner";
  if (ratio >= 0.5) return "middle";
  return "outer";
}

function buildCompatibilityFeatures(features) {
  const center = getCompatibilityMapCenterLngLat();
  const ringRadiusKm = {
    inner: 2.4,
    middle: 4.4,
    outer: 6.6
  };
  return features.map((feature) => {
    const ratio = getOfferMatchRatio(feature);
    const band = getCompatibilityBand(ratio);
    const hash = hashFromString(feature?.properties?.offerId || feature?.properties?.title || "");
    const angle = hash % 360;
    const jitter = ((hash % 1000) / 1000 - 0.5) * 0.6;
    const radius = Math.max(1.4, ringRadiusKm[band] + jitter);
    const redistributed = destinationPoint(center, radius, angle);
    return {
      ...feature,
      geometry: {
        ...feature.geometry,
        coordinates: redistributed
      },
      properties: {
        ...feature.properties,
        compatibilityBand: band
      }
    };
  });
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

function passesUrgentRadiusFilter(feature) {
  if (!urgentProfileActive) return true;
  if (!Array.isArray(urgentUserAnchor) || urgentUserAnchor.length !== 2) return false;
  const lng = feature?.properties?.baseLng;
  const lat = feature?.properties?.baseLat;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return false;
  return haversineKm(urgentUserAnchor, [lng, lat]) <= URGENT_SEARCH_RADIUS_KM;
}

function stableOfferFeatureId(feature) {
  const p = feature?.properties;
  return String(p?.offerId || p?.rawOfferId || p?.overlapKey || "").trim();
}

function getFilteredFeatures(options = {}) {
  const restrictToOfferIds = options.restrictToOfferIds;
  const query = normalizeQuery(searchQuery);
  const searchFiltered = query
    ? offersData.filter((feature) => feature.properties.searchText.includes(query))
    : offersData;

  // Vivier d'offres aligné sur les compétences ; en vue Valeurs on restreint au même ensemble
  // (restrictToOfferIds) tout en réappliquant recherche / urgence / filtre compétence sur les données à jour.
  const normalizedSkillTags = (activeSkillFilters.length > 0 ? activeSkillFilters : selectedSkills)
    .map((tag) => normalizeQuery(tag))
    .filter(Boolean);

  if (normalizedSkillTags.length === 0) {
    return [];
  }

  return searchFiltered.filter((feature) => {
    if (restrictToOfferIds && restrictToOfferIds.size > 0) {
      const oid = stableOfferFeatureId(feature);
      if (!oid || !restrictToOfferIds.has(oid)) return false;
    }
    const blob = feature?.properties?.skillMatchText || "";
    const skillMatch = normalizedSkillTags.some((tag) => blob.includes(tag));

    if (urgentProfileActive) {
      if (!passesUrgentRadiusFilter(feature)) return false;
      const raw = offersRawById.get(feature?.properties?.rawOfferId || "");
      if (!raw) return false;
      if (skillMatch) {
        return !offerPredominantlyRequiresHardUnmasteredSkills(raw, selectedSkills);
      }
      return offerHasOnlyAccessibleDisplayedSkills(raw);
    }

    if (!skillMatch) return false;
    return true;
  });
}

function resolveFeatureColor(feature) {
  const ratio = getOfferMatchRatio(feature);
  return colorWithAlpha(getGradientTargetHexByRatio(ratio), 0.9);
}

function getFeatureMatchIndexes(feature) {
  const blobKey = currentViewMode === VIEW_MODES.SKILLS ? "skillMatchText" : "valueMatchText";
  const text = feature?.properties?.[blobKey] || "";
  const selected = currentViewMode === VIEW_MODES.SKILLS ? selectedSkills : selectedValues;
  return selected
    .map((tag, index) => ({ index, hit: text.includes(normalizeQuery(tag)) }))
    .filter((entry) => entry.hit)
    .slice(0, 3)
    .map((entry) => entry.index);
}

function getFeatureTagMatches(feature) {
  const selected = currentViewMode === VIEW_MODES.SKILLS ? selectedSkills : selectedValues;
  const matchIndexes = getFeatureMatchIndexes(feature);
  if (matchIndexes.length === 0) return [];
  return matchIndexes.map((index) => ({ label: selected[index] })).filter((entry) => Boolean(entry.label));
}

function buildGradientMarkerImage(targetColor) {
  const canvas = document.createElement("canvas");
  canvas.width = MARKER_ICON_SIZE;
  canvas.height = MARKER_ICON_SIZE;
  const context = canvas.getContext("2d");
  if (!context) return null;

  const center = MARKER_ICON_SIZE / 2;
  const radius = MARKER_ICON_SIZE / 2 - 4;
  const baseColor = currentViewMode === VIEW_MODES.VALUES ? VALUE_BASE_COLOR : SKILL_BASE_COLOR;
  const gradient = context.createLinearGradient(0, MARKER_ICON_SIZE, MARKER_ICON_SIZE, 0);
  const isBaseOnly = String(targetColor).toUpperCase() === String(baseColor).toUpperCase();
  gradient.addColorStop(0, baseColor);
  gradient.addColorStop(0.42, isBaseOnly ? baseColor : mixHexColors(baseColor, targetColor, 0.58));
  gradient.addColorStop(1, isBaseOnly ? baseColor : targetColor);

  context.beginPath();
  context.arc(center, center, radius + 0.5, 0, Math.PI * 2);
  context.closePath();
  context.fillStyle = currentViewMode === VIEW_MODES.VALUES
    ? "rgba(242, 193, 78, 0.17)"
    : "rgba(126, 181, 255, 0.17)";
  context.fill();

  context.beginPath();
  context.arc(center, center, radius, 0, Math.PI * 2);
  context.closePath();
  context.shadowColor = currentViewMode === VIEW_MODES.VALUES
    ? "rgba(242, 193, 78, 0.42)"
    : "rgba(126, 181, 255, 0.42)";
  context.shadowBlur = 7;
  context.fillStyle = gradient;
  context.fill();
  context.shadowBlur = 0;

  context.beginPath();
  context.arc(center, center, radius, 0, Math.PI * 2);
  context.strokeStyle = "rgba(255,255,255,0.7)";
  context.lineWidth = 2.2;
  context.stroke();

  return context.getImageData(0, 0, MARKER_ICON_SIZE, MARKER_ICON_SIZE);
}

function ensureGradientMarkerIcon(targetColor) {
  const modePrefix = currentViewMode === VIEW_MODES.VALUES ? "values" : "skills";
  const key = `offer-gradient-${modePrefix}-${String(targetColor).replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}`;
  if (markerIconCache.has(key)) return key;
  if (!map) return null;
  if (!map.hasImage(key)) {
    const imageData = buildGradientMarkerImage(targetColor);
    if (imageData) {
      map.addImage(key, imageData, { pixelRatio: 2 });
    }
  }
  markerIconCache.set(key, true);
  return key;
}

function refreshOffers() {
  if (!map || !map.getSource(SOURCES.offers)) return;
  if (currentOfferViewMode === "sectorization") {
    setOfferMarkersVisibility(false);
    setCompatibilityGuidesVisibility(false);
    refreshSectorizationFromOffers();
    return;
  }
  setOfferMarkersVisibility(true);
  let filtered = getFilteredFeatures(
    currentOfferViewMode === "compatibility" &&
      currentViewMode === VIEW_MODES.VALUES &&
      compatibilitySkillOfferIds &&
      compatibilitySkillOfferIds.size > 0
      ? { restrictToOfferIds: compatibilitySkillOfferIds }
      : {}
  );

  if (currentOfferViewMode === "compatibility") {
    if (currentViewMode === VIEW_MODES.SKILLS) {
      compatibilitySkillOfferIds = new Set(filtered.map(stableOfferFeatureId).filter(Boolean));
    }
  } else {
    compatibilitySkillOfferIds = null;
  }

  const zoom = map.getZoom();
  const baseFeatures = currentOfferViewMode === "compatibility"
    ? buildCompatibilityFeatures(filtered)
    : buildDisplayFeaturesForZoom(filtered, zoom);
  const displayFeatures = baseFeatures.map((feature) => {
    const tagMatches = getFeatureTagMatches(feature);
    const ratio = getOfferMatchRatio(feature);
    const targetHex = getGradientTargetHexByRatio(ratio);
    const markerSize = 0.68 + ratio * 0.22;
    return {
      ...feature,
      properties: {
        ...feature.properties,
        pointColor: resolveFeatureColor(feature),
        matchedTagLabels: tagMatches.map((entry) => entry.label),
        markerIcon: ensureGradientMarkerIcon(targetHex),
        markerSize
      }
    };
  });
  const data = {
    type: "FeatureCollection",
    features: displayFeatures
  };
  map.getSource(SOURCES.offers).setData(data);
  setCompatibilityGuidesVisibility(currentOfferViewMode === "compatibility");
  if (urgentProfileActive) {
    setUrgentRadiusLayersVisibility(currentOfferViewMode === "localization");
  }
  updateOffersStatus();
}

function buildSectorizationDataSignature() {
  const part = (list) => (Array.isArray(list) ? [...list].map((v) => normalizeQuery(v)).sort().join("|") : "");
  return [
    offersRevision,
    offersRawById.size,
    part(selectedSkills),
    part(selectedValues),
    part(activeSkillFilters),
    part(activeValueFilters)
  ].join("::");
}

function enforceStrictRadius() {
  return;
}

function addPerimeterLayers() {
  // Perimeter intentionally disabled since localization now covers
  // the broader Pays de la Loire area without hard radius constraints.
  return;
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
      "fill-opacity": 0.035
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

function addContextLabelsLayer() {
  const features = CITY_AND_HOTSPOT_LABELS.map((entry) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: entry.coordinates },
    properties: {
      name: entry.name,
      kind: entry.kind
    }
  }));

  map.addSource(SOURCES.labels, {
    type: "geojson",
    data: { type: "FeatureCollection", features }
  });

  map.addLayer({
    id: LAYERS.labels,
    type: "symbol",
    source: SOURCES.labels,
    layout: {
      "text-field": ["get", "name"],
      "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 7.8, 11, 10, 12, 12.5, 14],
      "text-allow-overlap": true,
      "text-ignore-placement": true
    },
    paint: {
      "text-color": [
        "match",
        ["get", "kind"],
        "city",
        "rgba(196, 220, 255, 0.92)",
        "rgba(169, 198, 242, 0.78)"
      ],
      "text-halo-color": "rgba(7, 12, 30, 0.95)",
      "text-halo-width": 1.2,
      "text-opacity": ["interpolate", ["linear"], ["zoom"], 7.8, 0.62, 9.5, 0.72, 11.5, 0.82, 14, 0.9]
    }
  });
}

function addPdlFocusLayers() {
  const pdlFeatures = (Array.isArray(FR_DEPARTMENTS_GEOJSON?.features) ? FR_DEPARTMENTS_GEOJSON.features : [])
    .filter((feature) => PDL_DEPARTMENT_CODES.has(String(feature?.properties?.code || "")));

  map.addSource(SOURCES.pdlFocus, {
    type: "geojson",
    data: { type: "FeatureCollection", features: pdlFeatures }
  });

  map.addLayer({
    id: LAYERS.pdlFocusFill,
    type: "fill",
    source: SOURCES.pdlFocus,
    layout: { visibility: "visible" },
    paint: {
      "fill-color": "#9DCBFF",
      "fill-opacity": 0.095
    }
  });

  map.addLayer({
    id: LAYERS.pdlFocusLine,
    type: "line",
    source: SOURCES.pdlFocus,
    layout: { visibility: "visible" },
    paint: {
      "line-color": "rgba(157, 203, 255, 0.78)",
      "line-width": 0.8,
      "line-opacity": 0.72
    }
  });
  syncPdlFocusLayerVisibility();
}

function buildDepartmentSectorProfiles() {
  const aggregates = new Map();
  offersData.forEach((feature) => {
    const rawOfferId = feature?.properties?.rawOfferId || "";
    const rawOffer = offersRawById.get(rawOfferId) || {};
    const departmentCode = getDepartmentCodeFromOffer(rawOffer, feature);
    if (!departmentCode) return;
    if (!aggregates.has(departmentCode)) {
      aggregates.set(departmentCode, { sectorCounts: new Map(), skillCounts: new Map(), valueCounts: new Map() });
    }
    const bucket = aggregates.get(departmentCode);
    const sector = inferDominantSectorFromOffer(rawOffer);
    const skill = feature?.properties?.dominantSkill || "Compétence non renseignée";
    const value = feature?.properties?.dominantValue || "Valeur non renseignée";
    bucket.sectorCounts.set(sector, (bucket.sectorCounts.get(sector) || 0) + 1);
    bucket.skillCounts.set(skill, (bucket.skillCounts.get(skill) || 0) + 1);
    bucket.valueCounts.set(value, (bucket.valueCounts.get(value) || 0) + 1);
  });

  // Merge reliable department-level signals from the fetch layer itself.
  const mergedCountsByDepartment = new Map();
  const mergeCounts = (target, source) => {
    if (!(source instanceof Map)) return;
    source.forEach((count, key) => {
      target.set(key, (target.get(key) || 0) + count);
    });
  };
  SECTOR_TARGET_DEPARTMENT_CODES.forEach((code) => {
    const merged = { sectorCounts: new Map(), skillCounts: new Map(), valueCounts: new Map() };
    const fetchedSignals = departmentOfferSignals.get(code);
    const localizedSignals = aggregates.get(code);
    const fetchedTotal = fetchedSignals?.sectorCounts instanceof Map
      ? [...fetchedSignals.sectorCounts.values()].reduce((acc, count) => acc + count, 0)
      : 0;
    // Use department fetch signals as source of truth.
    // Fallback to localized geo signals only when a department has no fetched offers.
    if (fetchedTotal > 0) {
      mergeCounts(merged.sectorCounts, fetchedSignals?.sectorCounts);
      mergeCounts(merged.skillCounts, fetchedSignals?.skillCounts);
      mergeCounts(merged.valueCounts, fetchedSignals?.valueCounts);
    } else {
      mergeCounts(merged.sectorCounts, localizedSignals?.sectorCounts);
      mergeCounts(merged.skillCounts, localizedSignals?.skillCounts);
      mergeCounts(merged.valueCounts, localizedSignals?.valueCounts);
    }
    mergedCountsByDepartment.set(code, merged);
  });

  const pickTopMajority = (counts, fallbackValue) => {
    if (!(counts instanceof Map) || counts.size === 0) {
      return { value: fallbackValue, total: 0, topCount: 0, entries: [] };
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const [topValue, topCount] = sorted[0];
    const total = sorted.reduce((acc, [, count]) => acc + count, 0);
    return {
      value: topValue,
      total,
      topCount,
      entries: sorted
    };
  };

  const profiles = {};
  const selectedSkillRefs = new Set((activeSkillFilters.length > 0 ? activeSkillFilters : selectedSkills).map((tag) => normalizeQuery(tag)).filter(Boolean));
  const selectedValueRefs = new Set((activeValueFilters.length > 0 ? activeValueFilters : selectedValues).map((tag) => normalizeQuery(tag)).filter(Boolean));
  const hasSkillRef = selectedSkillRefs.size > 0;
  const hasValueRef = selectedValueRefs.size > 0;
  const denominator = (hasSkillRef ? 1 : 0) + (hasValueRef ? 1 : 0) || 1;
  SECTOR_TARGET_DEPARTMENT_CODES.forEach((code) => {
    const bucket = mergedCountsByDepartment.get(code);
    const dominantSectorEntry = pickTopMajority(bucket?.sectorCounts, INSUFFICIENT_SECTOR_LABEL);
    const dominantSkillEntry = pickTopMajority(bucket?.skillCounts, INSUFFICIENT_SKILL_LABEL);
    const dominantValueEntry = pickTopMajority(bucket?.valueCounts, INSUFFICIENT_VALUE_LABEL);
    const dominantSector = dominantSectorEntry.value;
    const dominantSkill = dominantSkillEntry.value;
    const dominantValue = dominantValueEntry.value;
    const sectorSlug = toSectorSlug(dominantSector);
    const skillHit = hasSkillRef ? selectedSkillRefs.has(normalizeQuery(dominantSkill)) : false;
    const valueHit = hasValueRef ? selectedValueRefs.has(normalizeQuery(dominantValue)) : false;
    const compatibilityRatio = (Number(skillHit) + Number(valueHit)) / denominator;
    profiles[code] = {
      dominantSector,
      dominantSkill,
      dominantValue,
      sectorSlug,
      sectorColor: getSectorCompatibilityColorByRatio(compatibilityRatio),
      compatibilityRatio,
      departmentLabel: dominantSector
    };
  });

  const sectorDebugRows = SECTOR_TARGET_DEPARTMENT_CODES.map((code) => {
    const sectorCounts = mergedCountsByDepartment.get(code)?.sectorCounts;
    const entries = sectorCounts instanceof Map ? [...sectorCounts.entries()].sort((a, b) => b[1] - a[1]) : [];
    const total = entries.reduce((acc, [, count]) => acc + count, 0);
    const [topSector = INSUFFICIENT_SECTOR_LABEL, topCount = 0] = entries[0] || [];
    const sectorsCounted = entries.length > 0
      ? entries.map(([sector, count]) => `${sector} (${count})`).join(" | ")
      : "Aucun";
    return {
      departement: code,
      offresAnalysees: total,
      secteursComptes: sectorsCounted,
      secteurRetenu: topSector,
      occurrencesSecteurRetenu: topCount
    };
  });
  console.table(sectorDebugRows);

  return profiles;
}

function emitSectorizationState() {
  const dominantSkills = [...sectorizationDominantSkills];
  const dominantValues = [...sectorizationDominantValues];
  window.dispatchEvent(new CustomEvent("lumen:sectorization-state", {
    detail: {
      mode: currentOfferViewMode,
      dominantSkills,
      dominantValues
    }
  }));
}

function buildSectorizationFeatureCollection() {
  const profiles = buildDepartmentSectorProfiles();
  sectorizationDominantSkills = new Set(Object.values(profiles).map((item) => normalizeQuery(item?.dominantSkill)).filter(Boolean));
  sectorizationDominantValues = new Set(Object.values(profiles).map((item) => normalizeQuery(item?.dominantValue)).filter(Boolean));
  const features = (Array.isArray(FR_DEPARTMENTS_GEOJSON?.features) ? FR_DEPARTMENTS_GEOJSON.features : [])
    .filter((feature) => PDL_DEPARTMENT_CODES.has(String(feature?.properties?.code || "")))
    .map((feature) => {
      const code = String(feature?.properties?.code || "");
      const profile = profiles[code] || {
        dominantSector: INSUFFICIENT_SECTOR_LABEL,
        dominantSkill: INSUFFICIENT_SKILL_LABEL,
        dominantValue: INSUFFICIENT_VALUE_LABEL,
        sectorSlug: toSectorSlug(INSUFFICIENT_SECTOR_LABEL),
        sectorColor: getSectorCompatibilityColorByRatio(0),
        departmentLabel: INSUFFICIENT_SECTOR_LABEL
      };
      return {
        ...feature,
        properties: {
          ...feature.properties,
        nom: feature?.properties?.nom || "",
          dominantSector: profile.dominantSector,
          dominantSkill: profile.dominantSkill,
          dominantValue: profile.dominantValue,
          sectorSlug: profile.sectorSlug,
          sectorColor: profile.sectorColor,
          departmentLabel: profile.departmentLabel
        }
      };
    });
  return { type: "FeatureCollection", features };
}

function computeFeatureAnchorPoint(feature) {
  const coords = feature?.geometry?.coordinates;
  if (!coords) return [0, 0];
  let sumLng = 0;
  let sumLat = 0;
  let count = 0;
  const visit = (node) => {
    if (!Array.isArray(node)) return;
    if (typeof node[0] === "number" && typeof node[1] === "number") {
      sumLng += node[0];
      sumLat += node[1];
      count += 1;
      return;
    }
    node.forEach(visit);
  };
  visit(coords);
  if (count === 0) return [0, 0];
  return [sumLng / count, sumLat / count];
}

function buildSectorizationLabelCollection(featureCollection) {
  const features = (featureCollection?.features || []).map((feature) => ({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: computeFeatureAnchorPoint(feature)
    },
    properties: {
      code: feature?.properties?.code || "",
      nom: feature?.properties?.nom || "",
      departmentLabel: feature?.properties?.departmentLabel || "",
      sectorColor: feature?.properties?.sectorColor || SKILL_COMPAT_PALETTE[0]
    }
  }));
  return { type: "FeatureCollection", features };
}

function addSectorizationLayers() {
  const initialVisibility = currentOfferViewMode === "sectorization" ? "visible" : "none";
  const departmentFeatures = buildSectorizationFeatureCollection();
  map.addSource(SOURCES.sectorDepartments, {
    type: "geojson",
    data: departmentFeatures
  });
  map.addSource(SOURCES.sectorDepartmentLabels, {
    type: "geojson",
    data: buildSectorizationLabelCollection(departmentFeatures)
  });

  map.addLayer({
    id: LAYERS.sectorDepartmentsFill,
    type: "fill",
    source: SOURCES.sectorDepartments,
    layout: { visibility: initialVisibility },
    paint: {
      "fill-color": ["coalesce", ["get", "sectorColor"], SKILL_COMPAT_PALETTE[0]],
      "fill-opacity": 0.44
    }
  });

  map.addLayer({
    id: LAYERS.sectorDepartmentsLine,
    type: "line",
    source: SOURCES.sectorDepartments,
    layout: { visibility: initialVisibility },
    paint: {
      "line-color": "rgba(130, 180, 235, 0.65)",
      "line-width": 0.9,
      "line-opacity": 0.62
    }
  });

  map.addLayer({
    id: LAYERS.sectorDepartmentsLabel,
    type: "symbol",
    source: SOURCES.sectorDepartmentLabels,
    layout: {
      visibility: initialVisibility,
      "text-field": ["get", "departmentLabel"],
      "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 4.6, 7, 5.6, 7.8, 6.6, 8.8, 8.2, 10.2, 10, 11.2, 12, 12.4],
      "text-line-height": 1.2,
      "symbol-placement": "point",
      "text-max-width": 7,
      "text-allow-overlap": true,
      "text-ignore-placement": true
    },
    paint: {
      "text-color": "rgba(241, 247, 255, 0.98)",
      "text-halo-color": "rgba(7, 12, 30, 0.95)",
      "text-halo-width": 1.15,
      "text-opacity": ["interpolate", ["linear"], ["zoom"], 4.6, 0.56, 5.8, 0.66, 7.4, 0.78, 9.5, 0.9, 12, 0.96]
    }
  });

  map.on("mouseenter", LAYERS.sectorDepartmentsFill, () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", LAYERS.sectorDepartmentsFill, () => {
    map.getCanvas().style.cursor = "";
    hideTooltip();
  });
  map.on("mousemove", LAYERS.sectorDepartmentsFill, (event) => {
    const feature = event.features?.[0];
    showSectorTooltip(event, feature);
  });
}

async function loadSectorizationData() {
  if (!map) return;
  try {
    const departmentFeatures = buildSectorizationFeatureCollection();
    map.getSource(SOURCES.sectorDepartments)?.setData(departmentFeatures);
    map.getSource(SOURCES.sectorDepartmentLabels)?.setData(buildSectorizationLabelCollection(departmentFeatures));
    emitSectorizationState();
  } catch (error) {
    console.warn("[Lumen] Impossible de charger la sectorisation :", error?.message || error);
  }
}

function refreshSectorizationFromOffers() {
  if (!map) return;
  const signature = buildSectorizationDataSignature();
  if (signature === lastSectorizationDataSignature) return;
  const departmentsSource = map.getSource(SOURCES.sectorDepartments);
  const labelsSource = map.getSource(SOURCES.sectorDepartmentLabels);
  if (departmentsSource) {
    const departmentFeatures = buildSectorizationFeatureCollection();
    departmentsSource.setData(departmentFeatures);
    if (labelsSource) {
      labelsSource.setData(buildSectorizationLabelCollection(departmentFeatures));
    }
    lastSectorizationDataSignature = signature;
    emitSectorizationState();
  }
}

function addCompatibilityGuideLayers() {
  const center = MAP_CONFIG.nantesCenter;
  const rings = [
    { radius: 2.4, band: "inner" },
    { radius: 4.4, band: "middle" },
    { radius: 6.6, band: "outer" }
  ].map((item) => ({
    ...buildCircle(center, item.radius),
    properties: { band: item.band }
  }));

  map.addSource(SOURCES.compatibilityRings, {
    type: "geojson",
    data: { type: "FeatureCollection", features: rings }
  });
  map.addSource(SOURCES.compatibilityCenter, {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        geometry: { type: "Point", coordinates: center },
        properties: { label: "Vous" }
      }]
    }
  });

  const ringPaint = (opacity) => ({
    "line-color": "rgba(157, 198, 255, 0.68)",
    "line-width": 1.35,
    "line-opacity": opacity
  });

  map.addLayer({
    id: LAYERS.compatibilityRingInner,
    type: "line",
    source: SOURCES.compatibilityRings,
    filter: ["==", ["get", "band"], "inner"],
    layout: { visibility: "none" },
    paint: ringPaint(0.85)
  });
  map.addLayer({
    id: LAYERS.compatibilityRingMid,
    type: "line",
    source: SOURCES.compatibilityRings,
    filter: ["==", ["get", "band"], "middle"],
    layout: { visibility: "none" },
    paint: ringPaint(0.62)
  });
  map.addLayer({
    id: LAYERS.compatibilityRingOuter,
    type: "line",
    source: SOURCES.compatibilityRings,
    filter: ["==", ["get", "band"], "outer"],
    layout: { visibility: "none" },
    paint: ringPaint(0.42)
  });

  map.addLayer({
    id: LAYERS.compatibilityCenterDot,
    type: "circle",
    source: SOURCES.compatibilityCenter,
    layout: { visibility: "none" },
    paint: {
      "circle-radius": 9,
      "circle-color": "rgba(126, 181, 255, 0.95)",
      "circle-stroke-width": 2.4,
      "circle-stroke-color": "rgba(255,255,255,0.82)"
    }
  });
  map.addLayer({
    id: LAYERS.compatibilityCenterLabel,
    type: "symbol",
    source: SOURCES.compatibilityCenter,
    layout: {
      visibility: "none",
      "text-field": ["get", "label"],
      "text-size": 12,
      "text-offset": [0, 1.4],
      "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"]
    },
    paint: {
      "text-color": "rgba(228, 239, 255, 0.95)",
      "text-halo-color": "rgba(7, 12, 30, 0.95)",
      "text-halo-width": 1.1
    }
  });
}

function updateCompatibilityGuideGeometry(centerLngLat) {
  if (!map?.getSource(SOURCES.compatibilityRings)) return;
  const center =
    Array.isArray(centerLngLat) && centerLngLat.length === 2 ? centerLngLat : MAP_CONFIG.nantesCenter;
  const rings = [
    { radius: 2.4, band: "inner" },
    { radius: 4.4, band: "middle" },
    { radius: 6.6, band: "outer" }
  ].map((item) => ({
    ...buildCircle(center, item.radius),
    properties: { band: item.band }
  }));
  map.getSource(SOURCES.compatibilityRings).setData({ type: "FeatureCollection", features: rings });
  map.getSource(SOURCES.compatibilityCenter).setData({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: center },
        properties: { label: "Vous" }
      }
    ]
  });
  ensureCompatibilityCenterMarker();
  compatibilityCenterMarker?.setLngLat(center);
}

function addUrgentRadiusLayers() {
  map.addSource(SOURCES.urgentRadius, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] }
  });
  map.addLayer({
    id: LAYERS.urgentRadiusFill,
    type: "fill",
    source: SOURCES.urgentRadius,
    layout: { visibility: "none" },
    paint: {
      "fill-color": "#7EB5FF",
      "fill-opacity": 0.07
    }
  });
  map.addLayer({
    id: LAYERS.urgentRadiusLine,
    type: "line",
    source: SOURCES.urgentRadius,
    layout: { visibility: "none" },
    paint: {
      "line-color": "rgba(126, 181, 255, 0.55)",
      "line-width": 1.6,
      "line-opacity": 0.9
    }
  });
}

function updateUrgentSearchRadiusPolygon(centerLngLat) {
  if (!map?.getSource(SOURCES.urgentRadius)) return;
  if (!Array.isArray(centerLngLat) || centerLngLat.length !== 2) {
    map.getSource(SOURCES.urgentRadius).setData({ type: "FeatureCollection", features: [] });
    return;
  }
  const circle = buildCircle(centerLngLat, URGENT_SEARCH_RADIUS_KM);
  map.getSource(SOURCES.urgentRadius).setData({ type: "FeatureCollection", features: [circle] });
}

function setUrgentRadiusLayersVisibility(isVisible) {
  const visibility =
    isVisible && urgentProfileActive && Array.isArray(urgentUserAnchor) && urgentUserAnchor.length === 2
      ? "visible"
      : "none";
  [LAYERS.urgentRadiusFill, LAYERS.urgentRadiusLine].forEach((layerId) => {
    if (map?.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", visibility);
    }
  });
}

function setCompatibilityGuidesVisibility(isVisible) {
  const visibility = isVisible ? "visible" : "none";
  [LAYERS.compatibilityRingInner, LAYERS.compatibilityRingMid, LAYERS.compatibilityRingOuter, LAYERS.compatibilityCenterDot, LAYERS.compatibilityCenterLabel]
    .forEach((layerId) => {
      if (map?.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", visibility);
      }
    });
  if (isVisible && map?.getLayer(LAYERS.offersCircle)) {
    if (map.getLayer(LAYERS.compatibilityCenterDot)) map.moveLayer(LAYERS.compatibilityCenterDot);
    if (map.getLayer(LAYERS.compatibilityCenterLabel)) map.moveLayer(LAYERS.compatibilityCenterLabel);
  }
  ensureCompatibilityCenterMarker();
  if (compatibilityCenterMarker?.getElement()) {
    compatibilityCenterMarker.getElement().style.display = isVisible ? "block" : "none";
  }
}

function ensureCompatibilityCenterMarker() {
  if (!map || compatibilityCenterMarker) return;
  const markerEl = document.createElement("div");
  markerEl.className = "lumen-compatibility-center-marker";
  markerEl.style.width = "14px";
  markerEl.style.height = "14px";
  markerEl.style.borderRadius = "999px";
  markerEl.style.background = "rgba(126, 181, 255, 0.97)";
  markerEl.style.border = "2px solid rgba(255,255,255,0.88)";
  markerEl.style.boxShadow = "0 0 0 2px rgba(8, 12, 30, 0.55)";
  markerEl.style.pointerEvents = "none";

  compatibilityCenterMarker = new maplibregl.Marker({
    element: markerEl,
    anchor: "center"
  })
    .setLngLat(MAP_CONFIG.nantesCenter)
    .addTo(map);
  compatibilityCenterMarker.getElement().style.display = "none";
}

function setGeographicLayersVisibility(isVisible) {
  const visibility = isVisible ? "visible" : "none";
  const ids = ["osm-base", LAYERS.labels];
  ids.forEach((layerId) => {
    if (map?.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", visibility);
    }
  });
}

function setPerimeterVisibility(isVisible) {
  const visibility = isVisible ? "visible" : "none";
  [LAYERS.perimeterFill, LAYERS.perimeterLine].forEach((layerId) => {
    if (map?.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", visibility);
    }
  });
}

function setPdlFocusVisibility(isVisible) {
  const visibility = isVisible ? "visible" : "none";
  [LAYERS.pdlFocusFill, LAYERS.pdlFocusLine].forEach((layerId) => {
    if (map?.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", visibility);
    }
  });
}

/** PdL : visible seulement en localisation et hors profil urgence (le périmètre 10 km suffit en urgence). */
function syncPdlFocusLayerVisibility() {
  if (!map?.getLayer(LAYERS.pdlFocusFill)) return;
  if (currentOfferViewMode !== "localization") {
    setPdlFocusVisibility(false);
    return;
  }
  setPdlFocusVisibility(!urgentProfileActive);
}

function setOfferMarkersVisibility(isVisible) {
  if (!map?.getLayer(LAYERS.offersCircle)) return;
  map.setLayoutProperty(LAYERS.offersCircle, "visibility", isVisible ? "visible" : "none");
}

function setSectorizationLayersVisibility(isVisible) {
  const visibility = isVisible ? "visible" : "none";
  [
    LAYERS.sectorDepartmentsFill,
    LAYERS.sectorDepartmentsLine,
    LAYERS.sectorDepartmentsLabel
  ].forEach((layerId) => {
    if (map?.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", visibility);
    }
  });
  if (isVisible) {
    if (map?.getLayer(LAYERS.sectorDepartmentsFill)) map.moveLayer(LAYERS.sectorDepartmentsFill);
    if (map?.getLayer(LAYERS.sectorDepartmentsLine)) map.moveLayer(LAYERS.sectorDepartmentsLine);
    if (map?.getLayer(LAYERS.sectorDepartmentsLabel)) map.moveLayer(LAYERS.sectorDepartmentsLabel);
  }
}

function ensureSectorizationLayersReady() {
  if (!map) return;
  const hasSource = Boolean(map.getSource(SOURCES.sectorDepartments));
  if (!hasSource) {
    addSectorizationLayers();
  }
  loadSectorizationData();
}

function addOfferLayers() {
  map.addSource(SOURCES.offers, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] }
  });

  if (!map.hasImage("offer-gradient-fallback")) {
    const fallbackImage = buildGradientMarkerImage(currentViewMode === VIEW_MODES.VALUES ? VALUE_BASE_COLOR : SKILL_BASE_COLOR);
    if (fallbackImage) {
      map.addImage("offer-gradient-fallback", fallbackImage, { pixelRatio: 2 });
      markerIconCache.set("offer-gradient-fallback", true);
    }
  }

  map.addLayer({
    id: LAYERS.offersCircle,
    type: "symbol",
    source: SOURCES.offers,
    layout: {
      "icon-image": ["coalesce", ["get", "markerIcon"], "offer-gradient-fallback"],
      "icon-size": ["coalesce", ["get", "markerSize"], 0.78],
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
    if (!feature?.properties) return;
    const p = feature.properties;
    const description = escapeHtml((p.offerDescription || "").slice(0, 700));
    const url = typeof p.offerUrl === "string" && /^https?:\/\//i.test(p.offerUrl) ? p.offerUrl : "";
    const tags = Array.isArray(p.matchedTagLabels) ? p.matchedTagLabels.slice(0, 3) : [];
    const tagsHtml = tags.map((tag) =>
      `<span class="lumen-offer-popup-tag">${escapeHtml(tag)}</span>`
    ).join("");

    let rankedBlock = "";
    if (urgentProfileActive && typeof p.rankedCorpusSkillsJson === "string") {
      try {
        const rows = JSON.parse(p.rankedCorpusSkillsJson);
        if (Array.isArray(rows) && rows.length > 0) {
          const formationHtml = buildUrgentFormationGroupsHtml(rows);
          rankedBlock = formationHtml ? `<div class="lumen-offer-popup-ranked">${formationHtml}</div>` : "";
        }
      } catch (_) {
        rankedBlock = "";
      }
    }

    if (offerPopup) {
      offerPopup.remove();
      offerPopup = null;
    }

    offerPopup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: true,
      maxWidth: "380px",
      offset: 16,
      className: "lumen-offer-popup"
    })
      .setLngLat(feature.geometry.coordinates)
      .setHTML(`
        <div class="lumen-offer-popup-content">
          <div class="lumen-offer-popup-title">${escapeHtml(p.title || "Offre d'emploi")}</div>
          <div class="lumen-offer-popup-meta">${escapeHtml(p.company || "Entreprise non renseignée")} · ${escapeHtml(p.city || "")}</div>
          ${tagsHtml ? `<div class="lumen-offer-popup-tags">${tagsHtml}</div>` : ""}
          ${rankedBlock}
          ${description ? `<div class="lumen-offer-popup-desc">${description}</div>` : ""}
          ${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="lumen-offer-popup-link">Voir cette offre</a>` : ""}
        </div>
      `)
      .addTo(map);
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
    const requests = OFFERS_TARGET_DEPARTMENTS.flatMap((departement) =>
      OFFERS_FETCH_BATCHES.map((range) => ({ departement, range }))
    );
    const responses = await Promise.all(
      requests.map(({ departement, range }) =>
        searchFranceTravailOffers({
          departement,
          range,
          tri: 0
        })
      )
    );
    const merged = responses.flatMap((response, index) => {
      const requestedDepartment = requests[index]?.departement || "";
      const rawResults = Array.isArray(response?.resultats) ? response.resultats : [];
      return rawResults.map((offer) => ({
        ...offer,
        _requestedDepartment: requestedDepartment
      }));
    });
    departmentOfferSignals = new Map();
    const seenOfferIdsByDepartment = new Map();
    responses.forEach((response, index) => {
      const requestedDepartment = requests[index]?.departement || "";
      if (!requestedDepartment) return;
      if (!departmentOfferSignals.has(requestedDepartment)) {
        departmentOfferSignals.set(requestedDepartment, {
          sectorCounts: new Map(),
          skillCounts: new Map(),
          valueCounts: new Map()
        });
      }
      if (!seenOfferIdsByDepartment.has(requestedDepartment)) {
        seenOfferIdsByDepartment.set(requestedDepartment, new Set());
      }
      const signal = departmentOfferSignals.get(requestedDepartment);
      const seenIds = seenOfferIdsByDepartment.get(requestedDepartment);
      const rawResults = Array.isArray(response?.resultats) ? response.resultats : [];
      rawResults.forEach((offer) => {
        const offerId = offer?.id || "";
        if (offerId && seenIds.has(offerId)) return;
        if (offerId) seenIds.add(offerId);
        const sector = inferDominantSectorFromOffer(offer);
        const insights = inferOfferInsights(offer);
        const skill = insights?.dominantSkill || "Compétence non renseignée";
        const value = insights?.dominantValue || "Valeur non renseignée";
        signal.sectorCounts.set(sector, (signal.sectorCounts.get(sector) || 0) + 1);
        signal.skillCounts.set(skill, (signal.skillCounts.get(skill) || 0) + 1);
        signal.valueCounts.set(value, (signal.valueCounts.get(value) || 0) + 1);
      });
    });
    merged.sort((a, b) => {
      const pa = hasPreciseOfferCoords(a) ? 0 : 1;
      const pb = hasPreciseOfferCoords(b) ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return String(a?.id || "").localeCompare(String(b?.id || ""));
    });
    const seenIds = new Set();
    const seenFingerprints = new Set();
    const results = [];
    merged.forEach((offer) => {
      const id = String(offer?.id || "").trim();
      if (id && seenIds.has(id)) return;
      const fp = normalizeOfferFingerprint(offer);
      const fpCore = fp.replace(/\|/g, "").trim();
      if (fpCore.length >= 10 && seenFingerprints.has(fp)) return;
      if (id) seenIds.add(id);
      if (fpCore.length >= 10) seenFingerprints.add(fp);
      results.push(offer);
    });
    offersRevision += 1;
    offersRawById = new Map(results.map((offer) => [offer?.id || "", offer]));
    offersData = results.map(buildOfferFeature).filter(Boolean);
    compatibilitySkillOfferIds = null;
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
    compatibilitySkillOfferIds = null;
    offersRevision += 1;
    offersRawById = new Map();
    departmentOfferSignals = new Map();
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

function placeUserMarkerWithAccuracy(coords, accuracyMeters) {
  if (!map) return;
  if (userMarker) userMarker.remove();
  userMarker = new maplibregl.Marker({ color: "#8ab4ff" }).setLngLat(coords).addTo(map);

  const accuracyFeature = buildAccuracyPolygon(coords, Math.min(accuracyMeters || 120, 1200));
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
}

function flyMapToUserCoords(coords, minZoom = 13) {
  if (!map) return;
  if (urgentProfileActive) {
    map.easeTo({
      center: coords,
      zoom: Math.max(map.getZoom(), minZoom),
      pitch: 0,
      bearing: 0,
      duration: 550
    });
    return;
  }
  const distance = haversineKm(MAP_CONFIG.nantesCenter, coords);
  if (distance > MAP_CONFIG.hardLimitRadiusKm) {
    const bearing = bearingDeg(MAP_CONFIG.nantesCenter, coords);
    const clamped = destinationPoint(MAP_CONFIG.nantesCenter, MAP_CONFIG.hardLimitRadiusKm - 0.1, bearing);
    map.easeTo({ center: clamped, zoom: Math.max(map.getZoom(), 12), duration: 500 });
  } else {
    map.easeTo({ center: coords, zoom: Math.max(map.getZoom(), minZoom), duration: 500 });
  }
}

function commitUrgentViewportForLocation(lng, lat) {
  if (!urgentProfileActive || !map) return;
  urgentUserAnchor = [lng, lat];
  updateUrgentSearchRadiusPolygon(urgentUserAnchor);
  setUrgentRadiusLayersVisibility(currentOfferViewMode === "localization");
  if (currentOfferViewMode === "compatibility") {
    updateCompatibilityGuideGeometry(urgentUserAnchor);
  }
  refreshOffers();
}

/**
 * Profil urgence : géolocalisation, périmètre 10 km, carte centrée sur l'utilisateur.
 * Appeler après `setUserContext` avec `profile: "urgent"`.
 */
export function startUrgentLocationFlow() {
  if (!urgentProfileActive || !map) return;

  const runGeo = () => {
    if (!navigator.geolocation) {
      const [lng, lat] = MAP_CONFIG.nantesCenter;
      placeUserMarkerWithAccuracy([lng, lat], 500);
      flyMapToUserCoords([lng, lat], 10.5);
      commitUrgentViewportForLocation(lng, lat);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = [position.coords.longitude, position.coords.latitude];
        placeUserMarkerWithAccuracy(coords, position.coords.accuracy || 120);
        flyMapToUserCoords(coords, 11);
        commitUrgentViewportForLocation(coords[0], coords[1]);
      },
      () => {
        const [lng, lat] = MAP_CONFIG.nantesCenter;
        placeUserMarkerWithAccuracy([lng, lat], 500);
        flyMapToUserCoords([lng, lat], 10.5);
        commitUrgentViewportForLocation(lng, lat);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
    );
  };

  const startWhenMapReady = () => {
    if (map.getSource(SOURCES.urgentRadius)) {
      runGeo();
      return;
    }
    map.once("load", startWhenMapReady);
  };

  if (map.isStyleLoaded()) startWhenMapReady();
  else map.once("load", startWhenMapReady);
}

export function locateUser() {
  if (!map || !navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const coords = [position.coords.longitude, position.coords.latitude];
      flyMapToUserCoords(coords, 13);
      placeUserMarkerWithAccuracy(coords, position.coords.accuracy || 120);
      if (urgentProfileActive) {
        commitUrgentViewportForLocation(coords[0], coords[1]);
      }
    },
    (error) => {
      console.warn("[Lumen] Géolocalisation indisponible :", error?.message || error);
      if (!urgentProfileActive) {
        alert("Impossible d'accéder à la géolocalisation. Vérifiez l'autorisation navigateur.");
      }
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
  );
}

export function initMap(container) {
  if (!container) return;
  container.innerHTML = "";
  ensureTooltip();

  map = new maplibregl.Map({
    container,
    style: MAP_CONFIG.mapStyle,
    center: MAP_CONFIG.nantesCenter,
    zoom: MAP_CONFIG.initialZoom,
    pitch: 45,
    bearing: -15,
    minZoom: MAP_CONFIG.minZoom,
    maxZoom: MAP_CONFIG.maxZoom,
    attributionControl: false
  });

  map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");

  map.on("load", () => {
    addPerimeterLayers();
    addPdlFocusLayers();
    addUrgentRadiusLayers();
    addContextLabelsLayer();
    addSectorizationLayers();
    addCompatibilityGuideLayers();
    addOfferLayers();
    loadSectorizationData();
    loadOffers();
    setOfferViewMode(currentOfferViewMode);
    initLocalizeButton();
    enforceStrictRadius();
  });

  map.on("moveend", () => {
    enforceStrictRadius();
  });
  map.on("zoom", () => {
    if (currentOfferViewMode === "sectorization") return;
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
  if (urgentProfileActive && Array.isArray(urgentUserAnchor) && urgentUserAnchor.length === 2) {
    map.easeTo({
      center: urgentUserAnchor,
      zoom: 10.8,
      pitch: 0,
      bearing: 0,
      duration: 300
    });
    return;
  }
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
  if (typeof context.profile === "string") {
    onboardingProfileId = context.profile;
    urgentProfileActive = context.profile === "urgent";
    if (!urgentProfileActive) {
      urgentUserAnchor = null;
      if (map?.getSource(SOURCES.pdlFocus)) {
        const pdlFeatures = (Array.isArray(FR_DEPARTMENTS_GEOJSON?.features) ? FR_DEPARTMENTS_GEOJSON.features : []).filter((feature) =>
          PDL_DEPARTMENT_CODES.has(String(feature?.properties?.code || ""))
        );
        applyPdlFocusGeojson(pdlFeatures);
      }
      if (map?.getSource(SOURCES.urgentRadius)) {
        map.getSource(SOURCES.urgentRadius).setData({ type: "FeatureCollection", features: [] });
      }
      setUrgentRadiusLayersVisibility(false);
    }
  }
  document.querySelector(".map-wrapper")?.classList.toggle("is-urgent-profile", Boolean(urgentProfileActive));
  compatibilitySkillOfferIds = null;
  refreshOffers();
  syncPdlFocusLayerVisibility();
}

export function setActiveTagFilters(filters = {}) {
  activeSkillFilters = Array.isArray(filters.skills) ? filters.skills : [];
  activeValueFilters = Array.isArray(filters.values) ? filters.values : [];
  refreshOffers();
}

export function setUserFilterActive(active) {
  void active;
  refreshOffers();
}

export function setOfferViewMode(mode) {
  const nextMode = mode === "compatibility" || mode === "sectorization" ? mode : "localization";
  currentOfferViewMode = nextMode;
  const wrapper = document.querySelector(".map-wrapper");
  if (wrapper) {
    wrapper.classList.toggle("is-compatibility-mode", currentOfferViewMode === "compatibility");
    wrapper.classList.toggle("is-sectorization-mode", currentOfferViewMode === "sectorization");
  }
  if (map) {
    if (!map.isStyleLoaded()) {
      map.once("load", () => setOfferViewMode(currentOfferViewMode));
      return;
    }
    const smoothTransition = {
      duration: VIEW_TRANSITION_DURATION_MS + 120,
      curve: 1.25,
      speed: 0.62,
      essential: true,
      easing: (t) => 1 - ((1 - t) ** 3.2)
    };
    const compatCenter = getCompatibilityMapCenterLngLat();
    if (currentOfferViewMode === "compatibility") {
      updateCompatibilityGuideGeometry(compatCenter);
      map.setMinZoom(MAP_CONFIG.minZoom);
      setGeographicLayersVisibility(false);
      setPerimeterVisibility(false);
      setSectorizationLayersVisibility(false);
      setUrgentRadiusLayersVisibility(false);
      map.flyTo({
        center: compatCenter,
        zoom: urgentProfileActive ? 11.25 : 11.6,
        pitch: 0,
        bearing: 0,
        ...smoothTransition
      });
    } else if (currentOfferViewMode === "sectorization") {
      map.setMinZoom(SECTOR_MIN_ZOOM);
      ensureSectorizationLayersReady();
      setGeographicLayersVisibility(true);
      setPerimeterVisibility(false);
      setSectorizationLayersVisibility(true);
      setCompatibilityGuidesVisibility(false);
      setOfferMarkersVisibility(false);
      setUrgentRadiusLayersVisibility(false);
      refreshSectorizationFromOffers();
      map.flyTo({
        center: SECTOR_VIEW_CENTER,
        zoom: SECTOR_VIEW_ZOOM,
        pitch: 0,
        bearing: 0,
        ...smoothTransition
      });
    } else {
      map.setMinZoom(MAP_CONFIG.minZoom);
      setGeographicLayersVisibility(true);
      setPerimeterVisibility(true);
      setSectorizationLayersVisibility(false);
      setUrgentRadiusLayersVisibility(Boolean(urgentProfileActive && urgentUserAnchor));
      if (!urgentProfileActive) {
        map.flyTo({
          center: MAP_CONFIG.nantesCenter,
          zoom: MAP_CONFIG.initialZoom,
          pitch: isIsometricView ? 45 : 0,
          bearing: isIsometricView ? -15 : 0,
          ...smoothTransition
        });
      } else if (Array.isArray(urgentUserAnchor) && urgentUserAnchor.length === 2) {
        map.flyTo({
          center: urgentUserAnchor,
          zoom: 11.25,
          pitch: 0,
          bearing: 0,
          ...smoothTransition
        });
      } else {
        map.easeTo({ pitch: 0, bearing: 0, duration: 400 });
      }
    }
    syncPdlFocusLayerVisibility();
  }
  emitSectorizationState();
  refreshOffers();
}

