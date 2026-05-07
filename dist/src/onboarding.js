import { SKILL_CATEGORIES, VALUE_CATEGORIES } from "./corpus.js";

const DEADLINE_TAGS = [
  "Sous 1 mois", "Sous 2 mois", "Sous 3 mois", "Sous 6 mois", "Sous 12 mois"
];

const PROFILE_OPTIONS = [
  {
    id: "partial",
    title: "J’ai une idée partiellement construite de mon projet, et je veux savoir ou je peux valoriser mes compétences",
    titleHtml: `J’ai <span class="onboarding-keyword-value">une idée partiellement construite de mon projet</span>, et je veux savoir où je peux valoriser mes compétences`,
    description: ""
  },
  {
    id: "urgent",
    title: "J’ai besoin de trouver un job le plus vite possible",
    titleHtml: `J’ai besoin de trouver un job <span class="onboarding-keyword-value">le plus vite possible</span>`,
    description: ""
  },
  {
    id: "discovery",
    title: "Je n'ai pas forcément d'idée de projet professionnel",
    titleHtml: `Je n’ai <span class="onboarding-keyword-value">pas forcément d'idée</span> de projet professionnel`,
    description: ""
  }
];

const STEP_TYPES = {
  WELCOME: "welcome",
  EXPLAIN: "explain",
  PROFILE: "profile",
  SKILLS: "skills",
  VALUES: "values",
  DEADLINE: "deadline"
};

function getStepsForProfile(profileId) {
  const common = [
    { type: STEP_TYPES.WELCOME },
    { type: STEP_TYPES.EXPLAIN },
    { type: STEP_TYPES.PROFILE },
    { type: STEP_TYPES.SKILLS }
  ];

  if (profileId === "partial") {
    return [...common, { type: STEP_TYPES.VALUES }];
  }

  if (profileId === "urgent") {
    return [...common, { type: STEP_TYPES.DEADLINE }];
  }

  return common;
}

export class Onboarding {
  constructor(onComplete) {
    this.onComplete = onComplete;
    this.currentStep = 0;
    this.selectedProfile = null;
    this.selectedSkills = new Set();
    this.selectedValues = new Set();
    this.selectedDeadline = null;
    this.container = null;
    this.steps = getStepsForProfile(null);
    this.lockScrollY = 0;
    this.sessionStorageKey = "lumen.onboarding.session";
  }

  init() {
    this.restoreSessionData();
    this.lockPageScroll();
    this.createUI();
    this.render();
  }

  restoreSessionData() {
    try {
      const raw = sessionStorage.getItem(this.sessionStorageKey);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data?.selectedProfile) {
        this.selectedProfile = data.selectedProfile;
        this.steps = getStepsForProfile(this.selectedProfile);
      }
      if (Array.isArray(data?.skills)) {
        this.selectedSkills = new Set(data.skills);
      }
      if (Array.isArray(data?.values)) {
        this.selectedValues = new Set(data.values.slice(0, 3));
      }
      if (typeof data?.deadline === "string" || data?.deadline === null) {
        this.selectedDeadline = data.deadline;
      }
    } catch (_) {
      // Ignore session storage parsing issues to avoid blocking onboarding.
    }
  }

  persistSessionData() {
    const payload = {
      selectedProfile: this.selectedProfile,
      skills: Array.from(this.selectedSkills),
      values: Array.from(this.selectedValues),
      deadline: this.selectedDeadline
    };
    sessionStorage.setItem(this.sessionStorageKey, JSON.stringify(payload));
  }

  lockPageScroll() {
    this.lockScrollY = window.scrollY || window.pageYOffset || 0;
    document.body.classList.add("onboarding-lock");
    document.body.style.top = `-${this.lockScrollY}px`;
  }

  unlockPageScroll() {
    document.body.classList.remove("onboarding-lock");
    document.body.style.top = "";
    window.scrollTo(0, this.lockScrollY);
  }

  createUI() {
    this.container = document.createElement("div");
    this.container.id = "onboarding-overlay";
    this.container.innerHTML = `
      <div class="onboarding-content">
        <div class="onboarding-header">
          <h1 class="onboarding-title" id="onboarding-title"></h1>
          <p class="onboarding-description" id="onboarding-description"></p>
          <p class="onboarding-step-label" id="onboarding-step-label"></p>
        </div>

        <div class="onboarding-body">
          <div class="onboarding-stage" id="onboarding-stage"></div>
        </div>

        <div class="onboarding-footer">
          <div class="onboarding-navigation">
            <button class="onboarding-btn onboarding-btn-back" id="onboarding-back" type="button">Retour</button>
            <button class="onboarding-btn onboarding-btn-next" id="onboarding-next" type="button">
              <span id="onboarding-next-text">Continuer</span>
            </button>
          </div>
          <div class="onboarding-progress">
            <span class="onboarding-progress-text" id="onboarding-progress-text"></span>
            <div class="onboarding-progress-track">
              <div class="onboarding-progress-fill" id="onboarding-progress-fill"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.container);

    this.container.querySelector("#onboarding-back").addEventListener("click", () => this.previous());
    this.container.querySelector("#onboarding-next").addEventListener("click", () => this.next());
  }

  getCurrentStep() {
    return this.steps[this.currentStep];
  }

  updateProgress() {
    const totalSteps = this.steps.length;
    const current = this.currentStep + 1;
    const ratio = totalSteps > 1 ? this.currentStep / (totalSteps - 1) : 1;

    const text = this.container.querySelector("#onboarding-progress-text");
    const fill = this.container.querySelector("#onboarding-progress-fill");

    if (text) {
      text.textContent = `Étape ${current} sur ${totalSteps}`;
    }

    if (fill) {
      fill.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
    }
  }

  renderProfileOptions(stageContainer) {
    stageContainer.innerHTML = "";
    const profileContainer = document.createElement("div");
    profileContainer.className = "onboarding-profile-selector";

    PROFILE_OPTIONS.forEach((profile) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "onboarding-profile-card";
      if (this.selectedProfile === profile.id) {
        button.classList.add("is-selected");
      }
      button.dataset.profile = profile.id;
      button.innerHTML = `
        <span class="onboarding-profile-title">${profile.titleHtml || profile.title}</span>
        ${profile.description ? `<span class="onboarding-profile-desc">${profile.description}</span>` : ""}
      `;

      button.addEventListener("click", () => {
        this.selectedProfile = profile.id;
        this.steps = getStepsForProfile(this.selectedProfile);
        this.selectedValues.clear();
        this.selectedDeadline = null;
        this.persistSessionData();
        this.render();
      });

      profileContainer.appendChild(button);
    });

    stageContainer.appendChild(profileContainer);
  }

  renderTagButton(tag, type, selectedSet, shouldDisableForMax) {
    const isSingleChoice = type === STEP_TYPES.DEADLINE;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "onboarding-tag";
    button.dataset.tag = tag;

    const isActive = isSingleChoice
      ? this.selectedDeadline === tag
      : selectedSet.has(tag);

    const isInactive = !isActive && shouldDisableForMax;

    if (isActive) button.classList.add("is-active");
    if (isInactive) {
      button.classList.add("is-inactive");
      button.disabled = true;
    }

    button.setAttribute("aria-pressed", String(isActive));
    button.textContent = tag;

    button.addEventListener("click", () => {
      if (type === STEP_TYPES.DEADLINE) {
        this.selectedDeadline = this.selectedDeadline === tag ? null : tag;
      } else {
        if (selectedSet.has(tag)) {
          selectedSet.delete(tag);
        } else {
          selectedSet.add(tag);
        }
      }
      this.persistSessionData();
      this.render();
    });

    return button;
  }

  renderTagRows(tags, type) {
    const selectedSet = type === STEP_TYPES.SKILLS ? this.selectedSkills : this.selectedValues;
    const maxSelections = type === STEP_TYPES.VALUES ? 3 : 5;
    const shouldDisableForMax = (type === STEP_TYPES.SKILLS || type === STEP_TYPES.VALUES) && selectedSet.size >= maxSelections;
    const rowsCount = 2;
    const rows = Array.from({ length: rowsCount }, () => []);

    tags.forEach((tag, index) => {
      rows[index % rowsCount].push(tag);
    });

    const rowsContainer = document.createElement("div");
    rowsContainer.className = "onboarding-tag-rows";

    rows.forEach((rowTags) => {
      const row = document.createElement("div");
      row.className = "onboarding-tag-row";
      rowTags.forEach((tag) => {
        row.appendChild(this.renderTagButton(tag, type, selectedSet, shouldDisableForMax));
      });
      rowsContainer.appendChild(row);
    });

    return rowsContainer;
  }

  renderCategorizedTags(stageContainer, categories, type) {
    stageContainer.innerHTML = "";
    const categoriesContainer = document.createElement("div");
    categoriesContainer.className = "onboarding-categories";

    categories.forEach((category) => {
      const section = document.createElement("section");
      section.className = "onboarding-category";

      const title = document.createElement("h3");
      title.className = "onboarding-category-title";
      title.textContent = category.title;

      const slider = document.createElement("div");
      slider.className = "onboarding-category-slider";
      slider.appendChild(this.renderTagRows(category.tags, type));

      section.appendChild(title);
      section.appendChild(slider);
      categoriesContainer.appendChild(section);
    });

    stageContainer.appendChild(categoriesContainer);
  }

  renderDeadlineTags(stageContainer, tags, type) {
    stageContainer.innerHTML = "";
    const tagsContainer = document.createElement("div");
    tagsContainer.className = "onboarding-tags";
    const selectedSet = this.selectedValues;

    tags.forEach((tag) => {
      tagsContainer.appendChild(this.renderTagButton(tag, type, selectedSet, false));
    });

    stageContainer.appendChild(tagsContainer);
  }

  getStepContent(stepType) {
    if (stepType === STEP_TYPES.WELCOME) {
      return {
        title: "Bienvenue",
        description: "Lumen vous aide à y voir plus clair dans votre réorientation professionnelle, en reliant vos compétences et vos valeurs aux opportunités qui existent selon les territoires.",
        helper: ""
      };
    }

    if (stepType === STEP_TYPES.EXPLAIN) {
      return {
        title: "Avant de commencer",
        description: "Nous allons clarifier votre point de départ, puis vous proposer un parcours adapté à votre situation actuelle.",
        helper: ""
      };
    }

    if (stepType === STEP_TYPES.PROFILE) {
      return {
        title: "Choisissez votre profil",
        description: "",
        helper: ""
      };
    }

    if (stepType === STEP_TYPES.SKILLS) {
      const count = this.selectedSkills.size;
      return {
        title: `Vos compétences actuelles (${count}/5)`,
        description: "",
        helper: ""
      };
    }

    if (stepType === STEP_TYPES.VALUES) {
      const count = this.selectedValues.size;
      return {
        title: `Ce qui compte pour vous (${count}/3)`,
        description: "",
        helper: ""
      };
    }

    return {
      title: "Votre horizon temporel",
      description: "À quel délai souhaitez-vous atteindre votre objectif ?",
      helper: ""
    };
  }

  canContinue(stepType) {
    if (stepType === STEP_TYPES.PROFILE) return Boolean(this.selectedProfile);
    if (stepType === STEP_TYPES.SKILLS) return this.selectedSkills.size > 0;
    if (stepType === STEP_TYPES.VALUES) return this.selectedValues.size > 0;
    if (stepType === STEP_TYPES.DEADLINE) return Boolean(this.selectedDeadline);
    return true;
  }

  render() {
    const step = this.getCurrentStep();
    const content = this.getStepContent(step.type);
    const isTextStep = step.type === STEP_TYPES.WELCOME || step.type === STEP_TYPES.EXPLAIN;

    const titleEl = this.container.querySelector("#onboarding-title");
    const descEl = this.container.querySelector("#onboarding-description");
    const helperEl = this.container.querySelector("#onboarding-step-label");
    const stageContainer = this.container.querySelector("#onboarding-stage");
    const contentRoot = this.container.querySelector(".onboarding-content");
    const backBtn = this.container.querySelector("#onboarding-back");
    const nextBtn = this.container.querySelector("#onboarding-next");
    const nextText = this.container.querySelector("#onboarding-next-text");

    titleEl.textContent = content.title;
    descEl.textContent = content.description;
    helperEl.textContent = content.helper;
    titleEl.hidden = !content.title;
    descEl.hidden = !content.description;
    helperEl.hidden = !content.helper;
    contentRoot.classList.toggle("is-text-step", isTextStep);
    contentRoot.classList.toggle("is-profile-step", step.type === STEP_TYPES.PROFILE);

    stageContainer.innerHTML = "";

    if (step.type === STEP_TYPES.PROFILE) {
      this.renderProfileOptions(stageContainer);
    }

    if (step.type === STEP_TYPES.SKILLS) {
      this.renderCategorizedTags(stageContainer, SKILL_CATEGORIES, STEP_TYPES.SKILLS);
    }

    if (step.type === STEP_TYPES.VALUES) {
      this.renderCategorizedTags(stageContainer, VALUE_CATEGORIES, STEP_TYPES.VALUES);
    }

    if (step.type === STEP_TYPES.DEADLINE) {
      this.renderDeadlineTags(stageContainer, DEADLINE_TAGS, STEP_TYPES.DEADLINE);
    }

    backBtn.style.opacity = this.currentStep === 0 ? "0" : "1";
    backBtn.style.pointerEvents = this.currentStep === 0 ? "none" : "auto";
    backBtn.disabled = this.currentStep === 0;

    const isLastStep = this.currentStep === this.steps.length - 1;
    nextText.textContent = isLastStep ? "Accéder à la carte" : "Poursuivre";
    nextBtn.disabled = !this.canContinue(step.type);

    this.updateProgress();
  }

  next() {
    const step = this.getCurrentStep();
    if (!this.canContinue(step.type)) return;

    if (this.currentStep < this.steps.length - 1) {
      this.currentStep += 1;
      this.render();
      return;
    }

    this.complete();
  }

  previous() {
    if (this.currentStep > 0) {
      this.currentStep -= 1;
      this.render();
    }
  }

  complete() {
    const payload = {
      selectedProfile: this.selectedProfile,
      skills: Array.from(this.selectedSkills),
      values: Array.from(this.selectedValues),
      deadline: this.selectedDeadline
    };

    this.persistSessionData();

    this.container.style.opacity = "0";
    setTimeout(() => {
      this.container.remove();
      this.unlockPageScroll();
      this.onComplete(payload);
    }, 350);
  }
}

