export function initControls(root = document) {
  const buttons = root.querySelectorAll(".btn-control");
  const handlers = {
    "zoom-in": null,
    "zoom-out": null,
    reset: null
  };

  buttons.forEach((btn) => {
    const action = btn.getAttribute("data-action");
    if (!action) return;
    btn.addEventListener("click", () => {
      const handler = handlers[action];
      if (typeof handler === "function") {
        handler();
      }
    });
  });

  return {
    onZoomIn(fn) {
      handlers["zoom-in"] = fn;
    },
    onZoomOut(fn) {
      handlers["zoom-out"] = fn;
    },
    onReset(fn) {
      handlers.reset = fn;
    }
  };
}

import { VIEW_MODES } from './config.js';

export function initViewToggle(onModeChange) {
  const container = document.querySelector('#view-toggle');
  if (!container) return;

  const buttons = Array.from(container.querySelectorAll('[data-view]'));
  if (buttons.length === 0) return;

  let currentMode = VIEW_MODES.SKILLS;

  const activateButton = mode => {
    buttons.forEach(btn => {
      if (btn.dataset.view === mode) {
        btn.classList.add('is-active');
      } else {
        btn.classList.remove('is-active');
      }
    });
  };

  activateButton(currentMode);

  buttons.forEach(button => {
    button.addEventListener('click', () => {
      const mode = button.dataset.view;
      if (!mode || mode === currentMode) return;

      currentMode = mode;
      activateButton(currentMode);

      if (typeof onModeChange === 'function') {
        onModeChange(currentMode);
      }
    });
  });
}

export function initViewTypeToggle(onToggle) {
  const toggleBtn = document.querySelector('.btn-view-toggle');
  if (!toggleBtn) {
    console.warn('[Lumen] Bouton de toggle de vue introuvable');
    return;
  }

  // S'assurer que l'état initial est bien défini
  if (!toggleBtn.getAttribute('data-view-type')) {
    toggleBtn.setAttribute('data-view-type', 'isometric');
  }

  const handleClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    const currentType = toggleBtn.getAttribute('data-view-type') || 'isometric';
    const newType = currentType === 'isometric' ? '2d' : 'isometric';
    
    console.log('[Lumen] Switch vue:', currentType, '->', newType);
    
    toggleBtn.setAttribute('data-view-type', newType);
    toggleBtn.setAttribute('aria-label', 
      newType === 'isometric' ? 'Basculer vers vue 2D' : 'Basculer vers vue isométrique'
    );
    
    if (typeof onToggle === 'function') {
      onToggle(newType === 'isometric');
    }
  };

  // Utiliser addEventListener au lieu d'onclick pour Safari
  toggleBtn.addEventListener('click', handleClick);
  toggleBtn.addEventListener('touchend', handleClick); // Support tactile
  
  console.log('[Lumen] Toggle de vue initialisé');
}

export function initMapSearch(onSearch) {
  const searchInput = document.getElementById('map-search-input');
  if (!searchInput) return;

  // Update placeholder based on current view mode
  const updatePlaceholder = (mode) => {
    if (mode === VIEW_MODES.SKILLS) {
      searchInput.placeholder = 'Rechercher une compétence...';
      searchInput.setAttribute('aria-label', 'Rechercher une compétence');
    } else if (mode === VIEW_MODES.VALUES) {
      searchInput.placeholder = 'Rechercher une valeur...';
      searchInput.setAttribute('aria-label', 'Rechercher une valeur');
    }
  };

  // Initial placeholder
  updatePlaceholder(VIEW_MODES.SKILLS);

  // Handle search input
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    if (typeof onSearch === 'function') {
      onSearch(query);
    }
  });

  // Function to clear search
  const clearSearch = (skipCallback = false) => {
    searchInput.value = '';
    // Only trigger search callback if not skipped (used when mode change will trigger render)
    if (!skipCallback && typeof onSearch === 'function') {
      onSearch('');
    }
  };

  // Return functions to control search from outside
  return {
    updatePlaceholder,
    clearSearch
  };
}


