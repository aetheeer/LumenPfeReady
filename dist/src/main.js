import {
  initMap,
  resizeMap,
  zoomIn,
  zoomOut,
  resetView,
  toggleViewMode,
  setSearchQuery,
  setUserContext,
  setUserFilterActive,
  setOfferViewMode,
  setActiveTagFilters,
  setViewMode,
  getViewMode
} from "./mapView.js?v=1034";
import { initControls, initOfferViewToggle, initViewToggle, initViewTypeToggle } from "./uiControls.js?v=1034";
import { VIEW_MODES } from './config.js?v=1034';
import { Onboarding } from './onboarding.js?v=1034';

const SESSION_KEY = "lumen.onboarding.session";

/** Dernière vue offre (localisation / compatibilité / sectorisation) pour le panneau latéral */
let lastOfferViewModeForPanel = "localization";

function parseSessionData() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function updateCompatibilityLegend(mode) {
  const legend = document.querySelector(".map-side-panel-legend");
  if (!legend) return;
  legend.classList.toggle("is-values-mode", mode === VIEW_MODES.VALUES);
}

/**
 * En localisation / compatibilité : une seule section (axe du tab compétences / valeurs).
 * En sectorisation : les deux sections restent visibles.
 */
function syncContextPanelSections(skillsValuesMode, offerViewMode) {
  const skillsSection = document.getElementById("user-skills-section");
  const valuesSection = document.getElementById("user-values-section");
  const showBoth = offerViewMode === "sectorization";
  if (skillsSection) {
    skillsSection.hidden = showBoth ? false : skillsValuesMode === VIEW_MODES.VALUES;
  }
  if (valuesSection) {
    valuesSection.hidden = showBoth ? false : skillsValuesMode === VIEW_MODES.SKILLS;
  }
}

function setSkillsValuesToggleDisabled(disabled) {
  const container = document.querySelector("#view-toggle");
  if (!container) return;
  container.classList.toggle("is-disabled", Boolean(disabled));
  const buttons = container.querySelectorAll("[data-view]");
  buttons.forEach((button) => {
    button.disabled = Boolean(disabled);
    button.setAttribute("aria-disabled", String(Boolean(disabled)));
    if (disabled) {
      button.style.pointerEvents = "none";
    } else {
      button.style.pointerEvents = "";
    }
  });
}

function updateOfferLegendForMode(mode) {
  const legend = document.querySelector(".map-side-panel-legend");
  if (!legend) return;
  const labels = legend.querySelectorAll(".map-side-panel-legend-scale span");
  if (labels.length < 2) return;
  labels[0].textContent = "Compatibilité faible";
  labels[1].textContent = "Compatibilité forte";
}

function normalizeTag(value) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function renderTagList(host, tags, emptyText, kind, activeFilters, onToggle, sectorizationState = {}) {
  if (!host) return;
  host.innerHTML = "";
  if (!Array.isArray(tags) || tags.length === 0) {
    const empty = document.createElement("span");
    empty.className = "map-side-panel-empty";
    empty.textContent = emptyText;
    host.appendChild(empty);
    return;
  }
  tags.forEach((tag) => {
    if (kind === "deadline") {
      const item = document.createElement("span");
      item.className = "onboarding-tag is-active map-side-panel-tag";
      item.textContent = tag;
      host.appendChild(item);
      return;
    }
    const item = document.createElement("button");
    item.type = "button";
    item.className = "onboarding-tag map-side-panel-tag";
    if (kind === "values") {
      item.classList.add("map-side-panel-tag-values");
    }
    const isActiveByFilter = kind === "skills"
      ? activeFilters.skills.has(tag)
      : activeFilters.values.has(tag);
    const isSectorizationMode = sectorizationState.mode === "sectorization" && (kind === "skills" || kind === "values");
    const dominantSet = kind === "skills" ? (sectorizationState.dominantSkills || new Set()) : (sectorizationState.dominantValues || new Set());
    const isDominantInSectorization = dominantSet.has(normalizeTag(tag));
    const isActive = isSectorizationMode ? isDominantInSectorization : isActiveByFilter;
    const isValueSelectionLocked = !isSectorizationMode && kind === "values" && activeFilters.values.size >= 3 && !isActive;
    item.classList.add(isActive ? "is-active" : "is-inactive");
    if (isValueSelectionLocked) {
      item.classList.add("is-disabled");
      item.disabled = true;
      item.setAttribute("aria-disabled", "true");
    } else if (isSectorizationMode) {
      // In sectorization mode we keep a strict active/inactive visual state,
      // while preventing interactions without applying the disabled opacity style.
      item.disabled = true;
      item.setAttribute("aria-disabled", "true");
      item.style.pointerEvents = "none";
    }
    item.setAttribute("aria-pressed", String(isActive));
    if (!isSectorizationMode) {
      item.addEventListener("click", () => onToggle(kind, tag));
    }
    item.textContent = tag;
    host.appendChild(item);
  });
}

function renderUserContextPanel(onboardingData) {
  const data = onboardingData || parseSessionData();
  const skillsHost = document.getElementById("user-skills-list");
  const valuesHost = document.getElementById("user-values-list");
  const deadlineSection = document.getElementById("user-deadline-section");
  const deadlineHost = document.getElementById("user-deadline-list");
  const activeFilters = {
    skills: new Set(Array.isArray(data?.skills) ? data.skills : []),
    values: new Set(Array.isArray(data?.values) ? data.values.slice(0, 3) : [])
  };
  const sectorizationState = {
    mode: "localization",
    dominantSkills: new Set(),
    dominantValues: new Set()
  };

  const rerenderTags = () => {
    renderTagList(skillsHost, data?.skills || [], "Aucune compétence sélectionnée", "skills", activeFilters, toggleFilterTag, sectorizationState);
    renderTagList(valuesHost, data?.values || [], "Aucune valeur sélectionnée", "values", activeFilters, toggleFilterTag, sectorizationState);
  };

  const applyActiveFilters = () => {
    setActiveTagFilters({
      skills: Array.from(activeFilters.skills),
      values: Array.from(activeFilters.values)
    });
  };

  const toggleFilterTag = (kind, tag) => {
    const bucket = kind === "skills" ? activeFilters.skills : activeFilters.values;
    if (bucket.has(tag)) bucket.delete(tag);
    else if (kind !== "values" || bucket.size < 3) bucket.add(tag);
    rerenderTags();
    applyActiveFilters();
  };

  window.__lumenUserPanel = {
    resetFiltersToFullSelection() {
      activeFilters.skills = new Set(Array.isArray(data?.skills) ? data.skills : []);
      activeFilters.values = new Set(Array.isArray(data?.values) ? data.values.slice(0, 3) : []);
      rerenderTags();
      applyActiveFilters();
    }
  };

  rerenderTags();

  const isUrgent = data?.selectedProfile === "urgent";
  if (deadlineSection) {
    if (!isUrgent) {
      deadlineSection.hidden = true;
      deadlineSection.setAttribute("hidden", "");
      deadlineSection.style.display = "none";
    } else {
      deadlineSection.removeAttribute("hidden");
      deadlineSection.hidden = false;
      deadlineSection.style.display = "";
    }
  }
  if (isUrgent) {
    renderTagList(deadlineHost, data?.deadline ? [data.deadline] : [], "Aucun délai sélectionné", "deadline", activeFilters, toggleFilterTag, sectorizationState);
  } else if (deadlineHost) {
    deadlineHost.innerHTML = "";
  }

  setUserContext({
    skills: data?.skills || [],
    values: data?.values || []
  });

  const panel = document.getElementById("user-context-panel");
  const collapseToggle = document.getElementById("user-context-toggle");
  if (!panel || !collapseToggle || collapseToggle.dataset.bound === "true") return;

  collapseToggle.addEventListener("click", () => {
    const isCollapsed = panel.classList.toggle("is-collapsed");
    collapseToggle.textContent = isCollapsed ? "⟩" : "⟨";
    collapseToggle.setAttribute("aria-label", isCollapsed ? "Ouvrir le panneau" : "Replier le panneau");
  });

  setUserFilterActive(true);
  applyActiveFilters();

  if (!window.__lumenSectorizationStateBound) {
    window.addEventListener("lumen:sectorization-state", (event) => {
      const detail = event?.detail || {};
      sectorizationState.mode = detail.mode || "localization";
      sectorizationState.dominantSkills = new Set(Array.isArray(detail.dominantSkills) ? detail.dominantSkills : []);
      sectorizationState.dominantValues = new Set(Array.isArray(detail.dominantValues) ? detail.dominantValues : []);
      rerenderTags();
    });
    window.__lumenSectorizationStateBound = true;
  }

  collapseToggle.dataset.bound = "true";
}

function openOnboarding(onComplete) {
  const onboarding = new Onboarding((onboardingData) => {
    if (onboardingData?.selectedProfile) {
      console.info("[Lumen] Profil onboarding sélectionné :", onboardingData.selectedProfile);
    }
    if (typeof onComplete === 'function') {
      onComplete(onboardingData);
    }
  });
  onboarding.init();
}

function initializeApp(onboardingData) {
  const mapRoot = document.getElementById("map-root");
  if (!mapRoot) {
    console.error("[Lumen] Élément #map-root introuvable");
    return;
  }

  // Afficher le contenu de l'application
  const appMain = document.querySelector('.app-main');
  const appFooter = document.querySelector('.app-footer');
  
  if (appMain) {
    appMain.style.opacity = '0';
    setTimeout(() => {
      appMain.style.opacity = '1';
    }, 100);
  }

  initMap(mapRoot);
  lastOfferViewModeForPanel = "localization";
  setOfferViewMode("localization");
  setSkillsValuesToggleDisabled(false);
  renderUserContextPanel(onboardingData);
  syncContextPanelSections(VIEW_MODES.SKILLS, lastOfferViewModeForPanel);

  const controls = initControls(document);
  controls.onZoomIn(() => {
    zoomIn();
  });
  controls.onZoomOut(() => {
    zoomOut();
  });
  controls.onReset(() => {
    resetView();
  });

  // Initialize view type toggle (isometric/2D)
  initViewTypeToggle((isIsometric) => {
    toggleViewMode();
  });

  // Initialize view toggle (skills/values)
  initViewToggle(mode => {
    if (mode === VIEW_MODES.SKILLS || mode === VIEW_MODES.VALUES) {
      setSearchQuery('', true);
      window.__lumenUserPanel?.resetFiltersToFullSelection();
      // Change mode (this will trigger animated render with all spikes)
      setViewMode(mode);
      updateCompatibilityLegend(mode);
      syncContextPanelSections(mode, lastOfferViewModeForPanel);
    }
  });
  updateCompatibilityLegend(VIEW_MODES.SKILLS);

  initOfferViewToggle((mode) => {
    lastOfferViewModeForPanel = mode;
    setOfferViewMode(mode);
    updateOfferLegendForMode(mode);
    setSkillsValuesToggleDisabled(mode === "sectorization");
    syncContextPanelSections(getViewMode(), mode);
  });
  updateOfferLegendForMode("localization");

  window.addEventListener("resize", () => {
    resizeMap();
  });

  console.info("[Lumen] Application initialisée");
}

function bootstrap() {
  openOnboarding((onboardingData) => {
    // Une fois l'onboarding terminé, initialiser l'application
    initializeApp(onboardingData);
  });
}

document.addEventListener("DOMContentLoaded", bootstrap);

