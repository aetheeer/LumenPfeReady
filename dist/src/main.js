import {
  initMap,
  resizeMap,
  zoomIn,
  zoomOut,
  resetView,
  toggleViewMode,
  setSearchQuery,
  setUserContext,
  setUserFilterActive
} from "./mapView.js?v=1000";
import { initControls, initViewToggle, initViewTypeToggle } from "./uiControls.js?v=1000";
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

function renderTagList(host, tags, emptyText, kind) {
  if (!host) return;
  host.innerHTML = "";
  if (!Array.isArray(tags) || tags.length === 0) {
    const empty = document.createElement("span");
    empty.className = "map-side-panel-empty";
    empty.textContent = emptyText;
    host.appendChild(empty);
    return;
  }
  tags.forEach((tag, index) => {
    const item = document.createElement("span");
    const colorClass = kind === "values"
      ? `map-value-color-${index % 5}`
      : `map-skill-color-${index % 5}`;
    item.className = `onboarding-tag is-active map-side-panel-tag ${colorClass}`;
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

  renderTagList(skillsHost, data?.skills || [], "Aucune compétence sélectionnée", "skills");
  renderTagList(valuesHost, data?.values || [], "Aucune valeur sélectionnée", "values");

  const isUrgent = data?.selectedProfile === "urgent";
  if (deadlineSection) {
    deadlineSection.hidden = !isUrgent;
  }
  if (isUrgent) {
    renderTagList(deadlineHost, data?.deadline ? [data.deadline] : [], "Aucun délai sélectionné", "values");
  } else if (deadlineHost) {
    deadlineHost.innerHTML = "";
  }

  setUserContext({
    skills: data?.skills || [],
    values: data?.values || []
  });

  const panel = document.getElementById("user-context-panel");
  const collapseToggle = document.getElementById("user-context-toggle");
  const filterToggle = document.getElementById("user-filter-toggle");
  if (!panel || !collapseToggle || !filterToggle || collapseToggle.dataset.bound === "true") return;

  collapseToggle.addEventListener("click", () => {
    const isCollapsed = panel.classList.toggle("is-collapsed");
    collapseToggle.textContent = isCollapsed ? "⟩" : "⟨";
    collapseToggle.setAttribute("aria-label", isCollapsed ? "Ouvrir le panneau" : "Replier le panneau");
  });

  filterToggle.addEventListener("click", () => {
    const active = filterToggle.getAttribute("aria-pressed") !== "true";
    filterToggle.setAttribute("aria-pressed", String(active));
    filterToggle.textContent = active ? "ON" : "OFF";
    setUserFilterActive(active);
  });

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
    }
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

