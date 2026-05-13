import { SKILL_LABELS, VALUE_LABELS, getSkillLearnability } from "./corpus.js";

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
  Maintenance: ["maintenance", "entretien", "intervention", "niveau 1"],
  HSE: ["securite", "hse", "consigne", "eip", "risques"],
  "Aide à la personne": ["domicile", "dependance", "personne", "soin"],
  Empathie: ["ecoute", "bienveillance", "soutien"],
  "Développement web": ["javascript", "frontend", "backend", "api", "web"],
  Programmation: ["code", "developpement", "logiciel", "python", "java"],
  "Analyse de données": ["donnees", "reporting", "kpi", "tableau de bord"],
  "Communication digitale": ["social", "seo", "campagne", "contenu"],
  "UI Design": ["ui", "interface", "maquette", "figma", "composant"],
  "UX Design": ["ux", "parcours", "experience utilisateur", "user research", "interview utilisateur"],
  "Design industriel": [
    "design industriel",
    "industrial design",
    "conception industrielle",
    "design for manufacturing",
    "dfm",
    "id design"
  ],
  "Design system": ["design system", "tokens", "library", "composants"],
  Wireframing: ["wireframe", "zoning", "arborescence"],
  Prototypage: ["prototype", "prototypage", "interactive"],
  "Recherche utilisateur": ["recherche utilisateur", "user research", "entretien", "persona"],
  "Tests utilisateurs": ["test utilisateur", "usabilite", "a/b test"],
  "Assistants IA au travail": ["assistant", "copilot", "ia generative", "outils ia"],
  "Automatisation avec l'IA": ["automatisation", "workflow", "macros", "rpa"],
  "Prompts IA": ["prompt", "prompting", "llm", "chatgpt", "copilot", "genai", "generatif", "ia generative"],
  "Accueil en hôtellerie": ["hotel", "hotellerie", "concierge", "bagage", "lobby"],
  "Préparation chambres & espaces": ["housekeeping", "chambre", "menage", "linge", "etages"],
  "Réception hôtellerie": ["reservation", "pms", "check in", "check out", "front office"],
  "Service en salle & caisse": ["restaurant", "salle", "service", "carte", "addition", "tips"],
  "Restauration rapide": ["fast food", "quick service", "qsr", "caisse rapide"],
  "Cuisine aide & préparation": ["cuisine", "mise en place", "plonge", "commis", "dressage"],
  "Hygiène alimentaire (HACCP)": ["haccp", "hygiene", "tracabilite", "denrees"],
  "Gestion de bar": ["bar", "cocktail", "service bar", "barman", "barmaid", "carte boissons"],
  "Vente-conseil": ["retail", "reseau", "franchise", "grande distribution", "gms", "conseiller vente", "point de vente"],
  Merchandising: ["linear", "implantation", "facing", "promo", "merchandising", "lineaire"],
  "Prévention vol magasin": ["prevention pertes", "videoprotection", "agent securite magasin", "rfid"],
  Réseau: [
    "reseau",
    "network",
    "tcp",
    "ip",
    "lan",
    "wifi",
    "routeur",
    "switch",
    "firewall",
    "vpn",
    "fibre",
    "box",
    "telecom",
    "operateur",
    "sav telecom",
    "connexion internet",
    "diagnostic reseau"
  ],
  "Livraison & tournées": ["livraison", "tournee", "livreur", "dernier kilometre", "messagerie"],
  "Organisation d'événements": ["evenementiel", "event", "conference", "seminaire", "colloque", "salon"],
  "Logistique sur site": ["logistique evenement", "montage stand", "transport materiel", "timing", "site evenement"],
  "Accueil événements": ["controle acces", "badge", "file", "orientation public", "accueil evenement"],
  Sécurité: ["pcs", "evacuation", "erp", "reglementation securite", "securite evenement"],
  "Son, lumière & captation": ["regie", "console son", "lumiere scene", "video live", "sono", "micro", "captation", "mixage live"],
  Scénographie: ["scenographie", "decor", "mise en scene", "plateau", "evenement"],
  Signalétique: ["signaletique", "wayfinding", "parcours visiteur", "orientation"],
  "Coordination prestataires": ["prestataires", "brief", "coordination fournisseurs", "planning prestataires"],
  "Conception architecturale": ["architecte", "esquisse", "volumetrie", "concept"],
  "Lecture plans bâtiment": ["plans", "coupe", "facade", "cotation", "construction"],
  "Maquettes & visualisation archi": ["maquette", "maquette physique", "rendu 3d", "viz"],
  "Modélisation BIM": ["bim", "ifc", "revit", "maquette numerique batiment"],
  "Design d'intérieur": ["interieur", "agencement", "mobilier", "ambiance"],
  "Patrimoine & réhabilitation": ["patrimoine", "rehabilitation", "monument historique", "restauration batiment"],
  "Suivi chantier BTP": ["chantier", "reunion chantier", "entreprises generales", "coordination corps etat", "btp"],
  "Parcours de soins": ["parcours soins", "coordination soins", "patient", "orientation patient"],
  "Hygiène & prévention": ["hygiene hospitaliere", "infection", "desinfection", "isolement", "prevention"],
  "Dossier patient": ["dossier medical", "administratif sante", "coordination dossier", "dossier administratif"],
  Télésoins: ["telesoin", "teleconsultation", "telemedecine", "relation distance"],
  "Handicap & autonomie": ["handicap", "autonomie", "aide vie", "apa", "perte autonomie"],
  "Médiation santé / médico-social": ["mediation sante", "ehpad", "institution", "medico social"],
  "Éducation thérapeutique": ["education therapeutique", "etp", "therapeutique", "patient"],
  "Arts plastiques": ["arts plastiques", "volume", "sculpture", "installation artistique"],
  Illustration: ["illustration", "bd", "storyboard", "narration visuelle"],
  "Conservation musée": ["conservation preventive", "inventaire musee", "catalogage oeuvre", "reserves", "musee"],
  "Scénographie d'exposition": ["scenographie exposition", "museographie", "parcours exposition"],
  "Médiation & ateliers": ["mediation culturelle", "atelier public", "visite guidee", "mediation"],
  "Danse & théâtre": ["danse", "theatre", "corps scene", "jeu scenique"],
  "Musique en groupe": ["musique", "orchestre", "ensemble", "partition", "pratique collective"],
  "Montage d'exposition": ["curatorial", "commissariat exposition", "montage expo", "recherche curatoriale"],
  "Bilan carbone": [
    "bilan carbone",
    "scope 1",
    "scope 2",
    "scope 3",
    "ges",
    "ghg",
    "reduction emissions",
    "decarbonation",
    "bas carbone",
    "neutralite carbone",
    "compensation carbone"
  ],
  "Reporting RSE": ["reporting rse", "esg", "csrd", "extra financier", "indicateurs", "non financier"],
  "Achats responsables": ["achats responsables", "audit fournisseurs", "charte achats", "fournisseurs durables", "supply chain"],
  "Éco-conception": ["eco conception", "conception durable", "emballage recyclable", "cycle de vie", "emballages"],
  "Déchets & recyclage": ["dechets", "collecte selective", "valorisation dechets", "recyclage", "tri"],
  "Énergie & eau": ["suivi energetique", "eau industrielle", "fluides", "bes", "performance energetique", "eau sur site"],
  "Économie circulaire": ["economie circulaire", "reemploi", "circularite", "boucle locale", "terrain"],
  Biodiversité: ["biodiversite", "habitats", "natura", "evitement impacts", "ern", "prevention biodiversite"],
  "Qualité de l'environnement": ["qualite air", "eau", "pollution", "sol", "prelevement", "analyse environnement", "milieux"],
  "Green IT": ["green it", "sobriete numerique", "datacenter", "empreinte numerique", "sobriete"],
  Concertation: ["parties prenantes", "concertation", "gouvernance", "transparence", "dialogue"],
  "Fournisseurs & droits humains": ["travail decent", "droits humains", "chaine valeur", "onu", "audit social", "supply"],
  "Projets de territoire": ["territoire", "local", "mecenat", "solidarite locale", "projet associatif"],
  "Diversité & inclusion": ["inclusion", "diversite", "egalite chances", "formation diversite", "qvt", "di"],
  "Manutention & chargement": ["manutention", "palettier", "cariste", "chargement", "quai"],
  "Contrôle qualité pièces": ["controle qualite", "non conformite", "metrologie", "inspection visuelle"],
  "Lecture gamme / mode opératoire": ["gamme", "mode operatoire", "instruction travail", "of"],
  "Réglage poste production": ["reglage", "machine production", "ajustement", "premiere piece"]
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
  "Durabilité": ["durable", "environnement", "rse", "climat", "carbone", "ecologie", "vert"],
  Engagement: ["engagement", "implication", "motivation"],
  "Respect du vivant": ["vivant", "nature", "faune", "flore", "ecosysteme"],
  "Justice sociale et équité": ["justice sociale", "equite", "egalite", "lutte discriminations"],
  Collaboration: ["equipe", "collectif", "cooperation"],
  Reconnaissance: ["reconnaissance", "valorisation", "feedback"],
  "Flexibilité": ["teletravail", "flexibilite", "hybride"],
  "Proximité": ["proximite", "local", "territoire"],
  "Mobilité": ["deplacement", "vehicule", "mobilite"],
  "Rémunération": ["salaire", "prime", "remuneration"],
  Avantages: ["tickets restaurant", "mutuelle", "avantages"],
  "Perspectives d'avenir": ["avenir", "developpement", "perspective"],
  "Curiosité pour les nouveaux outils": ["nouveaux outils", "veille techno", "experimentation"],
  "Usage responsable de l'IA": ["ia responsable", "ethique ia", "transparence", "biais"],
  "Ouverture au changement technologique": ["changement", "transformation digitale", "adaptation outils"],
  "Intérêt pour l'automatisation au service des équipes": ["automatisation", "productivite", "simplification"]
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

function computeCorpusItemRawScore(item, text, offerTokens, offerCompetenceTokens) {
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

  // Un seul meilleur alignement par offre (évite d'additionner des micro-overlaps
  // sur toutes les lignes « compétences » et de faire monter artificiellement tout le corpus).
  if (offerCompetenceTokens.length > 0) {
    let bestChunk = 0;
    offerCompetenceTokens.forEach((candidateTokens) => {
      const labelOverlap = overlapRatio(item.labelTokens, candidateTokens);
      const hintOverlap = overlapRatio(item.hintTokens, candidateTokens);
      const chunk = labelOverlap * 18 + hintOverlap * 10;
      if (chunk > bestChunk) bestChunk = chunk;
    });
    score += bestChunk;
  }

  return score;
}

function scoreIndex({ text, offerTokens, offerCompetenceTokens, corpusIndex }) {
  let best = {
    label: corpusIndex[0]?.label || "Inconnu",
    rawScore: -1
  };

  corpusIndex.forEach((item) => {
    const score = computeCorpusItemRawScore(item, text, offerTokens, offerCompetenceTokens);
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

function normalizeUserSkillRef(value) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/** Nombre max de compétences corpus affichées (popover / filtre urgence). */
export const URGENT_DISPLAY_MAX_SKILLS = 5;

/**
 * Compétences du corpus **pertinentes pour l'offre** (score + ancrage texte / fiches compétences),
 * plafonnées — utilisé pour l'affichage urgence et le filtre « formation longue ».
 */
export function inferDisplayCorpusSkillsForOffer(offer, maxItems = URGENT_DISPLAY_MAX_SKILLS) {
  const text = textFromOffer(offer);
  const offerTokens = new Set(tokenize(text));
  const offerCompetenceTokens = listOfferCompetenceTexts(offer).map((entry) => uniqueTokens(entry));

  const scored = SKILL_INDEX.map((item) => {
    const rawScore = computeCorpusItemRawScore(item, text, offerTokens, offerCompetenceTokens);
    const labelInText = countOccurrences(text, item.normalizedLabel) > 0;
    let maxCompOverlap = 0;
    offerCompetenceTokens.forEach((ct) => {
      if (!ct.length) return;
      maxCompOverlap = Math.max(
        maxCompOverlap,
        overlapRatio(item.labelTokens, ct),
        overlapRatio(item.hintTokens, ct)
      );
    });
    const strongTokenHit =
      item.labelTokens.some((tok) => offerTokens.has(tok)) && rawScore >= 22;
    const anchored = labelInText || maxCompOverlap >= 0.34 || strongTokenHit;
    return {
      label: item.label,
      learnability: getSkillLearnability(item.label),
      rawScore,
      anchored,
      maxCompOverlap
    };
  });

  const positives = scored.filter((s) => s.rawScore > 0).sort((a, b) => b.rawScore - a.rawScore);
  if (positives.length === 0) return [];

  const top = positives[0].rawScore;
  const threshold = Math.max(16, top * 0.46);

  let chosen = positives.filter((s) => s.rawScore >= threshold && s.anchored);
  if (chosen.length === 0) {
    chosen = positives.filter((s) => s.rawScore >= threshold);
  }
  if (chosen.length === 0) {
    chosen = positives.filter((s) => s.anchored && s.rawScore >= Math.max(12, top * 0.36));
  }
  if (chosen.length === 0) {
    chosen = positives.filter((s) => s.maxCompOverlap >= 0.38 || s.rawScore >= top * 0.55).slice(0, maxItems);
  }
  if (chosen.length === 0) {
    return positives.slice(0, Math.min(2, maxItems)).map(({ label, learnability, rawScore }) => ({
      label,
      learnability,
      rawScore
    }));
  }

  return chosen
    .sort((a, b) => b.rawScore - a.rawScore)
    .slice(0, maxItems)
    .map(({ label, learnability, rawScore }) => ({ label, learnability, rawScore }));
}

/**
 * Profil urgence : ne pas proposer l'offre si, parmi les compétences corpus retenues pour l'affichage,
 * une compétence « formation longue » (hard) est exigée alors que l'utilisateur ne la maîtrise pas.
 */
export function offerPredominantlyRequiresHardUnmasteredSkills(offer, userMasteredSkills) {
  const ranked = inferDisplayCorpusSkillsForOffer(offer, URGENT_DISPLAY_MAX_SKILLS);
  if (ranked.length === 0) return false;
  const userSet = new Set((userMasteredSkills || []).map(normalizeUserSkillRef).filter(Boolean));
  const nonMastered = ranked.filter((entry) => !userSet.has(normalizeUserSkillRef(entry.label)));
  if (nonMastered.length === 0) return false;
  return nonMastered.some((entry) => entry.learnability === "hard");
}

/**
 * Profil urgence — offres hors tags utilisateur : la liste corpus affichée pour l'offre
 * ne doit contenir que des compétences « formation simple » ou « formation modérée » (aucune longue).
 */
export function offerHasOnlyAccessibleDisplayedSkills(offer) {
  const ranked = inferDisplayCorpusSkillsForOffer(offer, URGENT_DISPLAY_MAX_SKILLS);
  if (ranked.length === 0) return false;
  return ranked.every((entry) => entry.learnability === "easy" || entry.learnability === "medium");
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
