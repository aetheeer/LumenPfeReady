// Panneau de contrôle pour les paramètres du relief

// Performance: throttle function to limit re-renders
function throttle(func, delay) {
  let timeoutId = null;
  let lastArgs = null;
  
  return function(...args) {
    lastArgs = args;
    
    if (!timeoutId) {
      timeoutId = setTimeout(() => {
        func.apply(this, lastArgs);
        timeoutId = null;
      }, delay);
    }
  };
}

export class ReliefControls {
  constructor(onUpdate, container = document.body) {
    this.onUpdate = onUpdate;
    this.container = container;
    
    // Générer des valeurs aléatoires pour chaque chargement
    const randomZScale = Math.floor(Math.random() * 121) + 80; // Entre 80 et 200
    const randomDensity = 0.25 + Math.random() * 0.15; // Entre 0.25 et 0.40
    
    this.params = {
      seed: 152, // Seed fixé à 152 par défaut
      density: parseFloat(randomDensity.toFixed(2)),
      zScale: randomZScale,
      zExponent: 1.5,
      minThreshold: 0.1,
      spikeRadius: 1.5, // Plus fin par défaut
      showRelief: true,
      showLabels: true,
      maxLabels: 50
    };
    
    this.panel = null;
    this.isVisible = false; // Replié par défaut
    this.init();
  }
  
  init() {
    const panel = document.createElement('div');
    panel.id = 'relief-controls';
    panel.className = 'glass-effect';
    panel.innerHTML = `
      <div class="relief-controls-header">
        <span>Réglages</span>
        <button class="relief-toggle-btn" title="Déplier">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 10L8 6L12 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      <div class="relief-controls-body">
        <div class="relief-control-group">
          <label>Quantité <span class="value" data-param="density">${this.params.density.toFixed(2)}</span></label>
          <input type="range" data-param="density" min="0.1" max="2" value="${this.params.density}" step="0.01">
        </div>
        
        <div class="relief-control-group">
          <label>Hauteur <span class="value" data-param="zScale">${this.params.zScale}</span></label>
          <input type="range" data-param="zScale" min="20" max="300" value="${this.params.zScale}" step="10">
        </div>
        
        <div class="relief-control-group">
          <label>Épaisseur <span class="value" data-param="spikeRadius">${this.params.spikeRadius}</span></label>
          <input type="range" data-param="spikeRadius" min="1" max="10" value="${this.params.spikeRadius}" step="0.5">
        </div>
        
        <div class="relief-control-group">
          <label>Seed <span class="value" data-param="seed">${this.params.seed}</span></label>
          <input type="range" data-param="seed" min="1" max="999" value="${this.params.seed}" step="1">
        </div>
        
        <div class="relief-control-group relief-checkboxes">
          <label>
            <input type="checkbox" data-param="showRelief" checked>
            Spikes
          </label>
          <label>
            <input type="checkbox" data-param="showLabels" checked>
            Labels
          </label>
        </div>
      </div>
    `;
    
    this.panel = panel;
    this.container.appendChild(panel);
    
    // Replier le panneau par défaut
    if (!this.isVisible) {
      panel.classList.add('collapsed');
    }
    
    this.addStyles();
    this.bindEvents();
  }
  
  addStyles() {
    if (document.getElementById('relief-controls-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'relief-controls-styles';
    style.textContent = `
      #relief-controls {
        position: fixed;
        bottom: 20px;
        left: 20px;
        width: 280px;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        z-index: 100;
        font-family: var(--font-main);
        color: rgba(245, 245, 255, 0.9);
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        flex-direction: column-reverse;
      }
      
      /* Mode plein écran */
      :fullscreen #relief-controls,
      :-webkit-full-screen #relief-controls,
      :-moz-full-screen #relief-controls,
      :-ms-fullscreen #relief-controls {
        position: fixed !important;
        bottom: 20px !important;
        left: 20px !important;
        z-index: 2147483647 !important;
      }
      
      #relief-controls.collapsed .relief-controls-body {
        display: none;
      }
      
      .relief-controls-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        font-size: 14px;
        font-weight: 400;
        letter-spacing: 0.02em;
        cursor: pointer;
        user-select: none;
      }
      
      .relief-toggle-btn {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 999px;
        color: rgba(245, 245, 255, 0.9);
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
        padding: 0;
      }
      
      .relief-toggle-btn svg {
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      #relief-controls.collapsed .relief-toggle-btn svg {
        transform: rotate(0deg);
      }
      
      #relief-controls:not(.collapsed) .relief-toggle-btn svg {
        transform: rotate(180deg);
      }
      
      .relief-toggle-btn:hover {
        background: rgba(255, 255, 255, 0.15);
      }
      
      .relief-controls-body {
        padding: 12px 16px 16px;
        max-height: 500px;
        overflow-y: auto;
      }
      
      .relief-control-group {
        margin-bottom: 14px;
      }
      
      .relief-control-group label {
        display: flex;
        justify-content: space-between;
        font-size: 14px;
        margin-bottom: 6px;
        text-transform: none;
        letter-spacing: 0.02em;
        opacity: 0.8;
        font-weight: 400;
      }
      
      .relief-control-group .value {
        font-weight: 400;
        color: rgba(245, 245, 255, 0.9);
      }
      
      .relief-control-group input[type="range"] {
        width: 100%;
        height: 4px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 999px;
        outline: none;
        -webkit-appearance: none;
      }
      
      .relief-control-group input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        background: rgba(245, 245, 255, 0.9);
        border-radius: 50%;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .relief-control-group input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.2);
      }
      
      .relief-checkboxes {
        display: flex;
        gap: 12px;
      }
      
      .relief-checkboxes label {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 14px;
        text-transform: none;
        cursor: pointer;
        font-weight: 400;
        letter-spacing: 0.02em;
      }
      
      .relief-checkboxes input[type="checkbox"] {
        width: 16px;
        height: 16px;
        cursor: pointer;
      }
    `;
    
    document.head.appendChild(style);
  }
  
  bindEvents() {
    // Toggle collapse
    const header = this.panel.querySelector('.relief-controls-header');
    const toggleBtn = this.panel.querySelector('.relief-toggle-btn');
    
    header.addEventListener('click', () => {
      this.isVisible = !this.isVisible;
      this.panel.classList.toggle('collapsed');
      toggleBtn.setAttribute('title', this.isVisible ? 'Replier' : 'Déplier');
    });
    
    // Performance: throttle updates to avoid excessive re-renders
    const throttledUpdate = throttle((params) => {
      if (this.onUpdate) {
        this.onUpdate(params);
      }
    }, 50); // 50ms throttle = max 20 updates/sec
    
    // Range inputs with throttling
    const ranges = this.panel.querySelectorAll('input[type="range"]');
    ranges.forEach(input => {
      input.addEventListener('input', (e) => {
        const param = e.target.dataset.param;
        let value = parseFloat(e.target.value);
        
        if (param === 'seed') value = parseInt(value);
        
        this.params[param] = value;
        
        // Update display immediately (no performance impact)
        const valueSpan = this.panel.querySelector(`.value[data-param="${param}"]`);
        if (valueSpan) {
          valueSpan.textContent = param === 'seed' ? value : value.toFixed(2);
        }
        
        // Throttle the actual update callback
        throttledUpdate(this.params);
      });
    });
    
    // Checkboxes (no throttling needed, they're discrete)
    const checkboxes = this.panel.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(input => {
      input.addEventListener('change', (e) => {
        const param = e.target.dataset.param;
        this.params[param] = e.target.checked;
        
        if (this.onUpdate) {
          this.onUpdate(this.params);
        }
      });
    });
  }
  
  destroy() {
    if (this.panel && this.panel.parentNode) {
      this.panel.parentNode.removeChild(this.panel);
    }
  }
}
