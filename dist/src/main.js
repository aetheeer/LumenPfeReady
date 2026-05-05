import { initMap, resizeMap, zoomIn, zoomOut, resetView, toggleViewMode, setSearchQuery } from "./mapView.js?v=1000";
import { initControls, initViewToggle, initViewTypeToggle, initMapSearch } from "./uiControls.js?v=1000";
import { setViewMode } from './mapView.js?v=1000';
import { VIEW_MODES } from './config.js?v=1000';
import { Onboarding } from './onboarding.js?v=1000';

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

function initializeApp() {
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

  // Initialize map search
  const mapSearch = initMapSearch((query) => {
    // Filtrer les spikes selon la recherche
    setSearchQuery(query);
    console.log('[Lumen] Recherche:', query || '(tous)');
  });

  // Initialize view toggle (skills/values)
  initViewToggle(mode => {
    if (mode === VIEW_MODES.SKILLS || mode === VIEW_MODES.VALUES) {
      // Clear search input and reset query without rendering
      if (mapSearch) {
        mapSearch.clearSearch(true); // Skip callback to avoid double render
        mapSearch.updatePlaceholder(mode);
      }
      setSearchQuery('', true); // Reset query without rendering
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
  openOnboarding(() => {
    // Une fois l'onboarding terminé, initialiser l'application
    initializeApp();
  });
}

document.addEventListener("DOMContentLoaded", bootstrap);

