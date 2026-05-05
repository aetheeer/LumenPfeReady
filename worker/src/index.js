const FRANCE_TRAVAIL_AUTH_URL =
  "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire";

const FRANCE_TRAVAIL_API_BASE_URL =
  "https://api.francetravail.io/partenaire/offresdemploi/v2";

let cachedToken = null;
let tokenExpiresAt = 0;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

function requireSecret(env, name) {
  const value = env[name];
  if (!value) {
    throw new Error(`Secret Cloudflare manquant : ${name}`);
  }
  return value;
}

async function getFranceTravailToken(env) {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: requireSecret(env, "FRANCE_TRAVAIL_CLIENT_ID"),
    client_secret: requireSecret(env, "FRANCE_TRAVAIL_CLIENT_SECRET"),
    scope: env.FRANCE_TRAVAIL_SCOPE || "api_offresdemploiv2"
  });

  const response = await fetch(FRANCE_TRAVAIL_AUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`OAuth France Travail ${response.status} : ${responseText}`);
  }

  const data = JSON.parse(responseText);
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + Math.max(0, Number(data.expires_in || 1500) - 60) * 1000;

  return cachedToken;
}

function forwardableQueryParams(searchParams) {
  const params = new URLSearchParams();

  for (const [key, value] of searchParams.entries()) {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, value);
    }
  }

  if (!params.has("range")) {
    params.set("range", "0-49");
  }

  return params;
}

async function proxyFranceTravail(request, env) {
  const url = new URL(request.url);
  const token = await getFranceTravailToken(env);

  let targetUrl;

  if (url.pathname === "/api/offres") {
    const params = forwardableQueryParams(url.searchParams);
    targetUrl = `${FRANCE_TRAVAIL_API_BASE_URL}/offres/search?${params.toString()}`;
  } else if (url.pathname.startsWith("/api/offres/")) {
    const offerId = decodeURIComponent(url.pathname.replace("/api/offres/", ""));
    if (!offerId) return json({ ok: false, error: "Identifiant d'offre manquant." }, 400);
    targetUrl = `${FRANCE_TRAVAIL_API_BASE_URL}/offres/${encodeURIComponent(offerId)}`;
  } else {
    return json({ ok: false, error: "Route introuvable." }, 404);
  }

  const response = await fetch(targetUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json"
    }
  });

  const responseText = await response.text();

  return new Response(responseText, {
    status: response.status,
    headers: {
      ...corsHeaders,
      "Content-Type": response.headers.get("Content-Type") || "application/json; charset=utf-8"
    }
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    if (request.method !== "GET") {
      return json({ ok: false, error: "Méthode non autorisée." }, 405);
    }

    if (url.pathname === "/api/health") {
      return json({ ok: true, service: "lumen-france-travail-worker" });
    }

    try {
      return await proxyFranceTravail(request, env);
    } catch (error) {
      return json({ ok: false, error: error.message }, 500);
    }
  }
};
