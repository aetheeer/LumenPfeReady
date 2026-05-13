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

function scoreIndex({ text, offerTokens, offerCompetenceTokens, corpusIndex }) {
  let best = {
    label: corpusIndex[0]?.label || "Inconnu",
    rawScore: -1
  };

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

    if (score > best.rawScore) {
      best = {
        label: item.label,
        rawScore: score
      };
    }
  });

  return best;
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
  const offerTokens = new Set(tokenize(text));
  const offerCompetenceTokens = listOfferCompetenceTexts(offer).map((entry) => uniqueTokens(entry));
  const skill = scoreIndex({
    text,
    offerTokens,
    offerCompetenceTokens,
    corpusIndex: SKILL_INDEX
  });
  const value = scoreIndex({
    text,
    offerTokens,
    offerCompetenceTokens,
    corpusIndex: VALUE_INDEX
  });
  const fallbackScore = pseudoScore(`${offer?.id || ""}-${offer?.intitule || ""}`);

  return {
    dominantSkill: skill.label,
    dominantValue: value.label,
    dominantSkillScore: skill.rawScore > 0 ? Math.min(100, 45 + skill.rawScore) : fallbackScore,
    dominantValueScore: value.rawScore > 0 ? Math.min(100, 45 + value.rawScore) : fallbackScore
  };
}
