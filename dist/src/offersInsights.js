import { SKILL_LABELS, VALUE_LABELS } from "./corpus.js";

const SKILL_HINTS = {
  "Communication orale": ["telephone", "client", "relation", "accueil", "negociation"],
  "Travail en équipe": ["equipe", "collaboration", "collectif", "coordonner"],
  Organisation: ["organise", "planifier", "planning", "prioriser"],
  Autonomie: ["autonomie", "autonome", "initiative"],
  "Gestion de projet": ["projet", "pilotage", "roadmap"],
  "Résolution de problème": ["analyser", "diagnostic", "probleme", "depannage"],
  "Relation client": ["client", "service", "satisfaction", "conseil"],
  Vente: ["vente", "commercial", "prospection", "devis", "objectif"],
  "Sens du service": ["service", "aider", "accompagnement", "ecoute"],
  "Gestion des stocks": ["stock", "inventaire", "approvisionnement"],
  "Préparation de commandes": ["commande", "picking", "expedition"],
  "Application des procédures qualité": ["qualite", "procedure", "controle"],
  "Maintenance de premier niveau": ["maintenance", "entretien", "intervention"],
  "Application des consignes de sécurité": ["securite", "hse", "consigne"],
  "Aide à la personne": ["domicile", "dependance", "personne", "soin"],
  Empathie: ["ecoute", "bienveillance", "soutien"],
  "Développement web": ["javascript", "frontend", "backend", "api", "web"],
  Programmation: ["code", "developpement", "logiciel", "python", "java"],
  "Analyse de données": ["donnees", "reporting", "kpi", "tableau de bord"],
  "Communication digitale": ["social", "seo", "campagne", "contenu"],
  "UI Design": ["ui", "interface", "maquette", "figma", "composant"],
  "UX Design": ["ux", "parcours", "experience utilisateur", "user research", "interview utilisateur"],
  "Design produit": ["product design", "design produit", "feature", "discovery", "roadmap produit"],
  "Design system": ["design system", "tokens", "library", "composants"],
  Wireframing: ["wireframe", "zoning", "arborescence"],
  Prototypage: ["prototype", "prototypage", "interactive"],
  "Recherche utilisateur": ["recherche utilisateur", "user research", "entretien", "persona"],
  "Tests utilisateurs": ["test utilisateur", "usabilite", "a/b test"]
};

const VALUE_HINTS = {
  "Équilibre de vie": ["temps partiel", "horaires", "equilibre", "amenage", "souplesse"],
  "Santé mentale": ["bienveillant", "soutien", "ecoute", "qualite de vie"],
  "Bien-être": ["confort", "bien-etre", "qvt", "respect"],
  "Stabilité": ["cdi", "durable", "stabilite", "perenne"],
  "Sécurité": ["securite", "protection", "prevention"],
  Apprentissage: ["formation", "apprentissage", "tutorat"],
  "Montée en compétences": ["competence", "certification", "progression"],
  "Évolution professionnelle": ["evolution", "mobilite interne", "carriere"],
  Challenge: ["challenge", "defi", "ambitieux"],
  "Utilité sociale": ["social", "service public", "solidarite", "utile"],
  "Impact concret": ["impact", "resultat", "terrain"],
  Sens: ["mission", "raison d etre", "valeurs"],
  "Éthique": ["ethique", "responsable", "integrite"],
  "Durabilité": ["durable", "environnement", "rse"],
  Engagement: ["engagement", "implication", "motivation"],
  Collaboration: ["equipe", "collectif", "cooperation"],
  Reconnaissance: ["reconnaissance", "valorisation", "feedback"],
  "Flexibilité": ["teletravail", "flexibilite", "hybride"],
  "Proximité": ["proximite", "local", "territoire"],
  "Mobilité": ["deplacement", "vehicule", "mobilite"],
  "Rémunération": ["salaire", "prime", "remuneration"],
  Avantages: ["tickets restaurant", "mutuelle", "avantages"],
  "Perspectives d'avenir": ["avenir", "developpement", "perspective"]
};

const STOP_WORDS = new Set([
  "de", "du", "des", "la", "le", "les", "un", "une", "et", "ou", "a", "au", "aux",
  "pour", "par", "avec", "dans", "sur", "en", "d", "l", "the", "to", "of"
]);

function normalizeText(value) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, " ")
    .replace(/[^a-z0-9\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function tokenize(value) {
  return normalizeText(value)
    .split(/[\s-]+/)
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

function uniqueTokens(value) {
  return [...new Set(tokenize(value))];
}

function textFromOffer(offer) {
  const chunks = [
    offer?.intitule,
    offer?.appellationlibelle,
    offer?.description,
    offer?.entreprise?.nom,
    offer?.lieuTravail?.libelle,
    offer?.romeCode,
    offer?.romeLibelle
  ];

  if (Array.isArray(offer?.competences)) {
    chunks.push(...offer.competences.map((item) => item?.libelle || item?.code));
  }
  if (Array.isArray(offer?.qualitesProfessionnelles)) {
    chunks.push(...offer.qualitesProfessionnelles.map((item) => item?.libelle || item?.description));
  }

  return normalizeText(chunks.filter(Boolean).join(" "));
}

function listOfferCompetenceTexts(offer) {
  const fromSkills = Array.isArray(offer?.competences)
    ? offer.competences.map((item) => item?.libelle || item?.code).filter(Boolean)
    : [];
  const fromQualities = Array.isArray(offer?.qualitesProfessionnelles)
    ? offer.qualitesProfessionnelles.map((item) => item?.libelle || item?.description).filter(Boolean)
    : [];
  return [...fromSkills, ...fromQualities];
}

function countOccurrences(haystack, needle) {
  if (!haystack || !needle) return 0;
  let index = 0;
  let count = 0;
  while ((index = haystack.indexOf(needle, index)) !== -1) {
    count += 1;
    index += needle.length;
  }
  return count;
}

function overlapRatio(aTokens, bTokens) {
  if (!aTokens.length || !bTokens.length) return 0;
  const bSet = new Set(bTokens);
  let common = 0;
  aTokens.forEach((token) => {
    if (bSet.has(token)) common += 1;
  });
  return common / Math.max(1, Math.min(aTokens.length, bTokens.length));
}

function buildCorpusIndex(labels, hints) {
  return labels.map((label) => ({
    label,
    normalizedLabel: normalizeText(label),
    labelTokens: uniqueTokens(label),
    hintTokens: uniqueTokens((hints[label] || []).join(" "))
  }));
}

const SKILL_INDEX = buildCorpusIndex(SKILL_LABELS, SKILL_HINTS);
const VALUE_INDEX = buildCorpusIndex(VALUE_LABELS, VALUE_HINTS);
const UNDETERMINED_LABEL = "Non déterminée";
const OFFER_INSIGHTS_CACHE = new Map();

const SKILL_CONTEXT_RULES = [
  {
    // Disambiguates "merchandising" retail cases (vendeur, rayon, boulangerie).
    when: /\b(merchandising|mise en rayon|rayon|vendeur|vente|caisse|boulangerie|libre service)\b/,
    boosts: {
      Vente: 18,
      "Conseil client": 16,
      "Relation client": 14,
      "Gestion des stocks": 10,
      "Sens du service": 10
    }
  },
  {
    // Distinguishes visual merchandising / scénographie / vitrine work.
    when: /\b(vitrine|scenograph|scenographie|display|agencement visuel|mise en scene|direction artistique)\b/,
    boosts: {
      "Design graphique": 18,
      "Création de contenus": 12,
      Prototypage: 8
    }
  },
  {
    when: /\b(logistique|entrepot|cariste|caces|expedition|preparation de commandes|supply chain|quai|magasinier)\b/,
    boosts: {
      "Gestion des stocks": 18,
      "Préparation de commandes": 18,
      "Gestion des flux": 14,
      Approvisionnement: 12,
      Inventaire: 10
    }
  },
  {
    when: /\b(soignant|infirm|ehpad|aide a domicile|accompagnement|patient|medical|handicap)\b/,
    boosts: {
      "Aide à la personne": 20,
      Empathie: 16,
      "Écoute active": 10,
      "Soin et accompagnement": 18,
      Observation: 10
    }
  },
  {
    when: /\b(developpeur|developpement|javascript|typescript|python|java|backend|frontend|api|sql|devops)\b/,
    boosts: {
      Programmation: 20,
      "Développement web": 20,
      "Analyse de données": 9,
      "Culture numérique": 8
    }
  },
  {
    when: /\b(ux|ui|figma|wireframe|prototype|design system|user research|test utilisateur|parcours utilisateur)\b/,
    boosts: {
      "UX Design": 20,
      "UI Design": 20,
      Wireframing: 16,
      Prototypage: 16,
      "Recherche utilisateur": 16,
      "Tests utilisateurs": 14,
      "Design system": 14,
      "Design produit": 12
    }
  },
  {
    when: /\b(comptable|comptabilite|facturation|administratif|assistant administratif|gestion documentaire|reporting|tableau de bord)\b/,
    boosts: {
      "Suivi administratif": 16,
      "Gestion documentaire": 14,
      "Comptabilité de base": 18,
      Reporting: 14,
      "Saisie de données": 12
    }
  },
  {
    when: /\b(chantier|btp|macon|plombier|electricien|ouvrage|second oeuvre|gros oeuvre)\b/,
    boosts: {
      "Application des consignes de sécurité": 14,
      "Maintenance de premier niveau": 10,
      "Travail en extérieur": 12,
      "Travail en atelier": 8
    }
  },
  {
    when: /\b(formateur|pedagogie|enseignant|animation|classe|apprenant|education)\b/,
    boosts: {
      Pédagogie: 18,
      "Transmission de savoirs": 18,
      "Animation de groupe": 14,
      "Gestion de groupe": 12
    }
  }
];

const VALUE_CONTEXT_RULES = [
  {
    when: /\b(cdi|long terme|durable|perenne|stabilite|emploi stable)\b/,
    boosts: {
      "Stabilité": 20,
      Sécurité: 10,
      "Perspectives d'avenir": 10
    }
  },
  {
    when: /\b(cdd|interim|saisonnier|mission courte)\b/,
    boosts: {
      "Flexibilité": 10,
      Mobilité: 6
    }
  },
  {
    when: /\b(teletravail|hybride|horaires flexibles|souplesse|temps partiel|amenage)\b/,
    boosts: {
      "Équilibre de vie": 18,
      "Flexibilité": 18,
      "Bien-être": 10
    }
  },
  {
    when: /\b(formation|certification|tutorat|mentor|montee en competences|alternance)\b/,
    boosts: {
      Apprentissage: 20,
      "Montée en compétences": 18,
      "Évolution professionnelle": 12,
      "Perspectives d'avenir": 10
    }
  },
  {
    when: /\b(prime|bonus|salaire|remuneration|13e mois|participation|interessement)\b/,
    boosts: {
      "Rémunération": 20,
      Avantages: 14,
      Reconnaissance: 8
    }
  },
  {
    when: /\b(mutuelle|tickets restaurant|ce|comite d entreprise|avantages sociaux)\b/,
    boosts: {
      Avantages: 20,
      "Bien-être": 8,
      "Équilibre de vie": 8
    }
  },
  {
    when: /\b(association|service public|solidarite|social|inclusion|impact|utilite)\b/,
    boosts: {
      "Utilité sociale": 18,
      Sens: 16,
      "Impact concret": 14,
      Engagement: 12,
      "Éthique": 10
    }
  },
  {
    when: /\b(rse|environnement|ecologique|durable|transition)\b/,
    boosts: {
      "Durabilité": 18,
      "Éthique": 12,
      Sens: 10
    }
  },
  {
    when: /\b(equipe|collectif|cooperation|entraide|ambiance)\b/,
    boosts: {
      Collaboration: 18,
      Reconnaissance: 8,
      "Bien-être": 8
    }
  },
  {
    when: /\b(proximite|local|sans deplacement|territoire)\b/,
    boosts: {
      "Proximité": 18,
      "Équilibre de vie": 8
    }
  }
];

function computeRuleBoostByLabel(text, contextRules) {
  if (!Array.isArray(contextRules) || contextRules.length === 0) return new Map();
  const boosts = new Map();
  contextRules.forEach((rule) => {
    if (!rule?.when?.test(text)) return;
    const entries = Object.entries(rule?.boosts || {});
    entries.forEach(([label, value]) => {
      boosts.set(label, (boosts.get(label) || 0) + Number(value || 0));
    });
  });
  return boosts;
}

function scoreIndex({ text, offerTokens, offerCompetenceTokens, corpusIndex, contextRules = [] }) {
  const scored = [];
  const ruleBoostByLabel = computeRuleBoostByLabel(text, contextRules);

  corpusIndex.forEach((item) => {
    let score = 0;

    score += countOccurrences(text, item.normalizedLabel) * 14;

    item.labelTokens.forEach((token) => {
      score += countOccurrences(text, token) * 3;
      if (offerTokens.has(token)) score += 4;
    });

    item.hintTokens.forEach((token) => {
      score += countOccurrences(text, token) * 2;
      if (offerTokens.has(token)) score += 2;
    });

    if (offerCompetenceTokens.length > 0) {
      offerCompetenceTokens.forEach((candidateTokens) => {
        const labelOverlap = overlapRatio(item.labelTokens, candidateTokens);
        const hintOverlap = overlapRatio(item.hintTokens, candidateTokens);
        score += labelOverlap * 18 + hintOverlap * 10;
      });
    }

    score += Number(ruleBoostByLabel.get(item.label) || 0);

    scored.push({
      label: item.label,
      rawScore: score
    });
  });

  scored.sort((a, b) => b.rawScore - a.rawScore);
  const top = scored[0] || { label: null, rawScore: 0 };
  const second = scored[1] || { label: null, rawScore: 0 };
  const margin = top.rawScore - second.rawScore;
  const hasSignal = top.rawScore >= 7;
  const isDistinct = margin >= 2 || top.rawScore >= 14;

  if (!hasSignal || !isDistinct) {
    return {
      label: UNDETERMINED_LABEL,
      rawScore: 0
    };
  }

  return top;
}

function pseudoScore(seedText) {
  const text = normalizeText(seedText);
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return (hash % 40) + 30;
}

export function inferOfferInsights(offer) {
  const text = textFromOffer(offer);
  const cacheKey = `${offer?.id || ""}::${text}`;
  const cached = OFFER_INSIGHTS_CACHE.get(cacheKey);
  if (cached) return cached;
  const offerTokens = new Set(tokenize(text));
  const offerCompetenceTokens = listOfferCompetenceTexts(offer).map((entry) => uniqueTokens(entry));
  const skill = scoreIndex({
    text,
    offerTokens,
    offerCompetenceTokens,
    corpusIndex: SKILL_INDEX,
    contextRules: SKILL_CONTEXT_RULES
  });
  const value = scoreIndex({
    text,
    offerTokens,
    offerCompetenceTokens,
    corpusIndex: VALUE_INDEX,
    contextRules: VALUE_CONTEXT_RULES
  });
  const fallbackScore = pseudoScore(`${offer?.id || ""}-${offer?.intitule || ""}`);
  const hasSkill = skill.label && skill.label !== UNDETERMINED_LABEL;
  const hasValue = value.label && value.label !== UNDETERMINED_LABEL;

  const result = {
    dominantSkill: hasSkill ? skill.label : UNDETERMINED_LABEL,
    dominantValue: hasValue ? value.label : UNDETERMINED_LABEL,
    dominantSkillScore: hasSkill ? Math.min(100, 45 + skill.rawScore) : fallbackScore,
    dominantValueScore: hasValue ? Math.min(100, 45 + value.rawScore) : fallbackScore
  };
  OFFER_INSIGHTS_CACHE.set(cacheKey, result);
  return result;
}
