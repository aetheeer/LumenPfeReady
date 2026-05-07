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
  setActiveTagFilters
} from "./mapView.js?v=1000";
import { initControls, initOfferViewToggle, initViewToggle, initViewTypeToggle } from "./uiControls.js?v=1000";
import { setViewMode } from './mapView.js?v=1000';
import { VIEW_MODES } from './config.js?v=1000';
import { Onboarding } from './onboarding.js?v=1000';

const SESSION_KEY = "lumen.onboarding.session";

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

function renderTagList(host, tags, emptyText, kind, activeFilters, onToggle) {
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
    const isActive = kind === "skills"
      ? activeFilters.skills.has(tag)
      : activeFilters.values.has(tag);
    const isValueSelectionLocked = kind === "values" && activeFilters.values.size >= 3 && !isActive;
    item.classList.add(isActive ? "is-active" : "is-inactive");
    if (isValueSelectionLocked) {
      item.classList.add("is-disabled");
      item.disabled = true;
      item.setAttribute("aria-disabled", "true");
    }
    item.setAttribute("aria-pressed", String(isActive));
    item.addEventListener("click", () => onToggle(kind, tag));
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
    renderTagList(skillsHost, data?.skills || [], "Aucune compétence sélectionnée", "skills", activeFilters, toggleFilterTag);
    renderTagList(valuesHost, data?.values || [], "Aucune valeur sélectionnée", "values", activeFilters, toggleFilterTag);
    applyActiveFilters();
  };
  renderTagList(skillsHost, data?.skills || [], "Aucune compétence sélectionnée", "skills", activeFilters, toggleFilterTag);
  renderTagList(valuesHost, data?.values || [], "Aucune valeur sélectionnée", "values", activeFilters, toggleFilterTag);

  const isUrgent = data?.selectedProfile === "urgent";
  if (deadlineSection) {
    deadlineSection.hidden = !isUrgent;
  }
  if (isUrgent) {
    renderTagList(deadlineHost, data?.deadline ? [data.deadline] : [], "Aucun délai sélectionné", "deadline", activeFilters, toggleFilterTag);
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
  renderUserContextPanel(onboardingData);

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
      // Change mode (this will trigger animated render with all spikes)
      setViewMode(mode);
      updateCompatibilityLegend(mode);
    }
  });
  updateCompatibilityLegend(VIEW_MODES.SKILLS);

  initOfferViewToggle((mode) => {
    setOfferViewMode(mode);
  });

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

