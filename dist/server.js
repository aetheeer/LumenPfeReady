import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";



dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRANCE_TRAVAIL_AUTH_URL =
  "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire";
const FRANCE_TRAVAIL_API_BASE_URL =
  "https://api.francetravail.io/partenaire/offresdemploi/v2";

let cachedToken = null;
let tokenExpiresAt = 0;

function requireEnv(name) {
  const value = process.env[name];
  if (!value || value.includes("COLLE_TA_CLE")) {
    throw new Error(`Variable d'environnement manquante ou invalide : ${name}`);
  }
  return value;
}

async function getFranceTravailToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const clientId = requireEnv("FRANCE_TRAVAIL_CLIENT_ID");
  const clientSecret = requireEnv("FRANCE_TRAVAIL_CLIENT_SECRET");
  const scope = process.env.FRANCE_TRAVAIL_SCOPE || "api_offresdemploiv2";

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope
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
    throw new Error(`Erreur OAuth France Travail ${response.status} : ${responseText}`);
  }

  const data = JSON.parse(responseText);
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + Math.max(0, Number(data.expires_in || 1500) - 60) * 1000;

  return cachedToken;
}

function forwardableQueryParams(query) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      value.forEach((entry) => params.append(key, entry));
    } else {
      params.set(key, String(value));
    }
  }

  if (!params.has("range")) {
    params.set("range", "0-49");
  }

  return params;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "lumen-local-api" });
});

app.get("/api/france-travail/offres", async (req, res) => {
  try {
    const token = await getFranceTravailToken();
    const params = forwardableQueryParams(req.query);

    const response = await fetch(`${FRANCE_TRAVAIL_API_BASE_URL}/offres/search?${params}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      }
    });

    const text = await response.text();
    if (!response.ok && !text.trim()) {
      return res.status(response.status).json({
        ok: false,
        error: `France Travail API a repondu ${response.status} (corps vide).`,
        hint: "Verifie CLIENT_ID/CLIENT_SECRET, les droits de l'application et le scope autorise."
      });
    }
    res.status(response.status);
    res.type(response.headers.get("content-type") || "application/json");
    res.send(text);
  } catch (error) {
    console.error("[Lumen API]", error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

app.get("/api/france-travail/offres/:id", async (req, res) => {
  try {
    const token = await getFranceTravailToken();
    const response = await fetch(`${FRANCE_TRAVAIL_API_BASE_URL}/offres/${encodeURIComponent(req.params.id)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      }
    });

    const text = await response.text();
    if (!response.ok && !text.trim()) {
      return res.status(response.status).json({
        ok: false,
        error: `France Travail API a repondu ${response.status} (corps vide).`,
        hint: "Verifie CLIENT_ID/CLIENT_SECRET, les droits de l'application et le scope autorise."
      });
    }
    res.status(response.status);
    res.type(response.headers.get("content-type") || "application/json");
    res.send(text);
  } catch (error) {
    console.error("[Lumen API]", error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// Fallback court compatible avec l'échange précédent : /api/offres
app.get("/api/offres", (req, res) => {
  const query = new URLSearchParams(req.query).toString();
  res.redirect(307, `/api/france-travail/offres${query ? `?${query}` : ""}`);
});

// Sert le prototype existant sans modifier son architecture front.
app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log("----------------------------------------");
  console.log("Lumen local + API France Travail");
  console.log(`URL prototype : http://localhost:${PORT}`);
  console.log(`Test API      : http://localhost:${PORT}/api/health`);
  console.log("----------------------------------------");
});
