export const SKILL_CATEGORIES = [
  {
    title: "Compétences relationnelles et communication",
    tags: [
      "Communication écrite",
      "Communication orale",
      "Écoute active",
      "Prise de parole",
      "Travail en équipe",
      "Coopération",
      "Relation client",
      "Accueil du public",
      "Négociation",
      "Médiation",
      "Pédagogie",
      "Animation de groupe"
    ]
  },
  {
    title: "Organisation, méthode et pilotage",
    tags: [
      "Organisation",
      "Gestion du temps",
      "Priorisation",
      "Rigueur",
      "Autonomie",
      "Fiabilité",
      "Gestion du stress",
      "Adaptabilité",
      "Résolution de problème",
      "Prise d'initiative",
      "Gestion de projet",
      "Leadership"
    ]
  },
  {
    title: "Compétences administratives et gestion",
    tags: [
      "Bureautique",
      "Rédaction professionnelle",
      "Gestion documentaire",
      "Saisie de données",
      "Suivi administratif",
      "Planification",
      "Comptabilité de base",
      "Gestion budgétaire",
      "Lecture de tableaux de bord",
      "Coordination d'activités",
      "Reporting"
    ]
  },
  {
    title: "Compétences commerciales et service",
    tags: [
      "Vente",
      "Conseil client",
      "Argumentation",
      "Fidélisation",
      "Gestion de caisse",
      "Merchandising",
      "Sens du service",
      "Gestion des réclamations",
      "Prospection",
      "Suivi commercial",
      "Négociation commerciale",
      "Relation partenaires"
    ]
  },
  {
    title: "Compétences logistiques et opérationnelles",
    tags: [
      "Gestion des flux",
      "Planification logistique",
      "Approvisionnement",
      "Gestion des stocks",
      "Préparation de commandes",
      "Réception et contrôle des livraisons",
      "Expédition",
      "Traçabilité",
      "Inventaire",
      "Coordination d'équipe terrain",
      "Application des procédures qualité"
    ]
  },
  {
    title: "Compétences techniques et manuelles",
    tags: [
      "Montage / assemblage",
      "Maintenance de premier niveau",
      "Diagnostic de panne simple",
      "Bricolage",
      "Mécanique de base",
      "Électricité de base",
      "Plomberie de base",
      "Entretien des locaux",
      "Préparation de matériel",
      "Travail en atelier",
      "Travail en extérieur",
      "Application des consignes de sécurité",
      "Petites réparations"
    ]
  },
  {
    title: "Compétences d'accompagnement, éducation et soin",
    tags: [
      "Soin et accompagnement",
      "Aide à la personne",
      "Écoute et soutien",
      "Pédagogie",
      "Animation d'activités",
      "Gestion de groupe",
      "Observation",
      "Transmission de savoirs",
      "Sens de l'éthique",
      "Patience",
      "Empathie"
    ]
  },
  {
    title: "Compétences numériques, analyse et création",
    tags: [
      "Recherche d'information",
      "Culture numérique",
      "Création de contenus",
      "Design graphique",
      "UI Design",
      "UX Design",
      "Design industriel",
      "Design system",
      "Wireframing",
      "Prototypage",
      "Recherche utilisateur",
      "Tests utilisateurs",
      "Photographie / vidéo",
      "Marketing",
      "Communication digitale",
      "Analyse de données",
      "Développement web",
      "Programmation",
      "Utilisation d'outils no-code",
      "Langues étrangères"
    ]
  }
];

export const VALUE_CATEGORIES = [
  {
    title: "Équilibre de vie étudiante et perso",
    tags: [
      "Équilibre de vie",
      "Santé mentale",
      "Bien-être",
      "Temps libre",
      "Stabilité",
      "Sécurité"
    ]
  },
  {
    title: "Progression et employabilité",
    tags: [
      "Apprentissage",
      "Montée en compétences",
      "Évolution professionnelle",
      "Expérience valorisable",
      "Autonomie",
      "Challenge"
    ]
  },
  {
    title: "Sens et impact",
    tags: [
      "Utilité sociale",
      "Impact concret",
      "Sens",
      "Éthique",
      "Durabilité",
      "Engagement"
    ]
  },
  {
    title: "Cadre de travail et opportunités",
    tags: [
      "Bonne ambiance",
      "Collaboration",
      "Reconnaissance",
      "Flexibilité",
      "Proximité",
      "Mobilité",
      "Rémunération",
      "Avantages",
      "Perspectives d'avenir"
    ]
  }
];

export const SKILL_LABELS = [...new Set(SKILL_CATEGORIES.flatMap((category) => category.tags))];

const LEARN_RANK = { easy: 0, medium: 1, hard: 2 };

function mergeLearnabilityMax(a, b) {
  return LEARN_RANK[a] >= LEARN_RANK[b] ? a : b;
}

/**
 * Difficulté de formation employable (profil urgence) — défaut par famille du corpus :
 * - **easy** : savoir-être, relationnel, posture (prise en main en semaines avec encadrement).
 * - **medium** : métiers, techniques, tertiaire opérationnel (type CAP / formation courte à moyenne).
 * - **hard** : uniquement via overrides — cursus long sans socle (souvent 9–18 mois+ pour un niveau recrutable).
 *
 * Un même libellé peut apparaître dans deux rubriques : on retient le niveau le plus exigeant des défauts.
 */
const SKILL_CATEGORY_DEFAULT_LEARNABILITY = [
  "easy", // Compétences relationnelles et communication
  "easy", // Organisation, méthode et pilotage
  "medium", // Compétences administratives et gestion
  "medium", // Compétences commerciales et service
  "medium", // Compétences logistiques et opérationnelles
  "medium", // Compétences techniques et manuelles (métier / « vraie formation » type CAP)
  "easy", // Compétences d'accompagnement, éducation et soin (savoir-être + relation d'aide)
  "medium" // Compétences numériques, analyse et création
];

function buildBaseLearnabilityByTag() {
  const map = new Map();
  SKILL_CATEGORIES.forEach((category, index) => {
    const band = SKILL_CATEGORY_DEFAULT_LEARNABILITY[index] || "medium";
    for (const tag of category.tags) {
      const prev = map.get(tag);
      map.set(tag, prev ? mergeLearnabilityMax(prev, band) : band);
    }
  });
  return map;
}

const BASE_LEARNABILITY_BY_TAG = buildBaseLearnabilityByTag();

/** Cursus typiquement long pour viser l'employabilité sans expérience dans le domaine. */
const HARD_LEARNABILITY_OVERRIDES = new Set([
  "Développement web",
  "Programmation",
  "Analyse de données",
  "Langues étrangères"
]);

/**
 * Postes ou tâches à onboarding court dans une rubrique au défaut « medium »
 * (emploi rapide possible avec consignes / tutorat interne).
 */
const EASY_LEARNABILITY_OVERRIDES = new Set([
  "Saisie de données",
  "Préparation de commandes",
  "Expédition",
  "Réception et contrôle des livraisons",
  "Inventaire",
  "Gestion de caisse",
  "Merchandising",
  "Sens du service",
  "Bricolage",
  "Petites réparations",
  "Entretien des locaux",
  "Application des consignes de sécurité",
  "Préparation de matériel",
  "Recherche d'information",
  "Culture numérique",
  "Utilisation d'outils no-code",
  "Application des procédures qualité"
]);

/**
 * Dans une rubrique au défaut « easy », compétences où un diplôme ou un socle métier reste courant.
 */
const MEDIUM_LEARNABILITY_OVERRIDES = new Set([
  "Gestion de projet",
  "Leadership",
  "Soin et accompagnement"
]);

export function getSkillLearnability(label) {
  const key = String(label || "").trim();
  if (!key) return "medium";
  if (HARD_LEARNABILITY_OVERRIDES.has(key)) return "hard";
  if (EASY_LEARNABILITY_OVERRIDES.has(key)) return "easy";
  if (MEDIUM_LEARNABILITY_OVERRIDES.has(key)) return "medium";
  return BASE_LEARNABILITY_BY_TAG.get(key) || "medium";
}

export const VALUE_LABELS = [...new Set(VALUE_CATEGORIES.flatMap((category) => category.tags))];
