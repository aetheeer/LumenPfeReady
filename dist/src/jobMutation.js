const MUTATION_LABEL_UP = "Métier en progression";
const MUTATION_LABEL_DOWN = "Métier sous tension";

const AUTOMATION_RISK_TERMS = [
  "saisie",
  "retranscription",
  "archivage",
  "codification",
  "facturation",
  "teleoperateur",
  "teleconseiller",
  "standardise",
  "repetitif",
  "repetitive",
  "processus simple",
  "tache repetitive",
  "operateur de production",
  "agent de production",
  "preparateur de commandes",
  "employe libre service",
  "caissier",
  "hotesse de caisse",
  "agent administratif",
  "assistant administratif",
  "secretaire",
  "archiviste",
  "documentaliste",
  "operateur call",
  "back office",
  "traitement de dossiers"
];

const AUGMENTATION_TERMS = [
  "intelligence artificielle",
  " ia ",
  "genai",
  "generative",
  "copilot",
  "prompt",
  "automatisation augmentee",
  "pilotage",
  "strategie",
  "expertise",
  "conseil",
  "ingenieur",
  "architecte",
  "recherche",
  "innovation",
  "soignant",
  "infirmier",
  "aide soignant",
  "medecin",
  "kinesitherapeute",
  "psychologue",
  "educateur",
  "artisan",
  "maintenance industrielle",
  "technicien expert",
  "relation humaine",
  "accompagnement",
  "therapeut",
  "design",
  "ux",
  "data scientist",
  "cybersecurite",
  "chef de projet",
  "responsable"
];

const SECTOR_MUTATION_BIAS = {
  "Numérique & services": 2,
  "Santé": 2,
  "Services à la personne / action sociale": 2,
  "Arts / artisanat": 2,
  "Installation / maintenance": 1,
  "Industrie": -1,
  "Commerce / vente": -1,
  "Support entreprise / gestion": -2,
  "Transport / logistique": -1,
  "Hôtellerie / restauration / tourisme": 0,
  "BTP / construction": 0,
  "Banque / assurance / immobilier": -1,
  "Communication / multimédia": 1,
  "Agriculture / environnement": 0,
  "Autres services": 0
};

function normalizeMutationText(value) {
  return ` ${(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, " ")
    .replace(/[^a-z0-9\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()} `;
}

function countTermHits(blob, terms) {
  let score = 0;
  terms.forEach((term) => {
    const needle = normalizeMutationText(term);
    if (needle.length < 3) return;
    if (blob.includes(needle)) score += 1;
  });
  return score;
}

export function inferJobMutationFromOffer(offer, sectorLabel = "") {
  const blob = normalizeMutationText([
    offer?.intitule,
    offer?.appellationlibelle,
    offer?.description,
    offer?.romeLibelle,
    offer?.entreprise?.nom
  ].filter(Boolean).join(" "));

  if (!blob.trim()) return null;

  let up = countTermHits(blob, AUGMENTATION_TERMS);
  let down = countTermHits(blob, AUTOMATION_RISK_TERMS);
  const sectorBias = SECTOR_MUTATION_BIAS[sectorLabel] ?? 0;
  if (sectorBias > 0) up += sectorBias;
  if (sectorBias < 0) down += Math.abs(sectorBias);

  const delta = up - down;
  if (delta >= 2) {
    return { trend: "up", label: MUTATION_LABEL_UP };
  }
  if (delta <= -2) {
    return { trend: "down", label: MUTATION_LABEL_DOWN };
  }
  return null;
}
