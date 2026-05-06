const API_BASE_URL = "https://lumenpfe-api.uiuxdesigner.workers.dev/api";

export async function fetchPlaceholder() {
  return { ok: true, source: "lumen-api-stub" };
}

async function requestJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || data?.message || `Erreur API ${response.status}`);
  }

  return data;
}

/**
 * Recherche des offres d'emploi via le proxy Cloudflare Worker (/api/offres) ou le serveur local server.js.
 * Exemples de params :
 * - { motsCles: "designer", commune: "44109", rayon: 20, range: "0-49" }
 * - { codeROME: "E1205", departement: "44" }
 */
export async function searchFranceTravailOffers(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return requestJson(`${API_BASE_URL}/offres${suffix}`);
}

/**
 * Récupère le détail d'une offre France Travail.
 */
export async function getFranceTravailOfferDetail(offerId) {
  if (!offerId) {
    throw new Error("Identifiant d'offre manquant.");
  }

  return requestJson(`${API_BASE_URL}/offres/${encodeURIComponent(offerId)}`);
}
