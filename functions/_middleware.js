const COOKIE_NAME = "lumen_access";

const PUBLIC_PATHS = [
  "/login",
  "/favicon.ico"
];

function getCookie(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  return cookie
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`))
    ?.split("=")[1];
}

function isPublicAsset(pathname) {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/assets/") ||
    pathname.endsWith(".css") ||
    pathname.endsWith(".js") ||
    pathname.endsWith(".json") ||
    pathname.endsWith(".geojson") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".webp") ||
    pathname.endsWith(".ico")
  );
}

function loginPage(error = false) {
  return new Response(`<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Accès Lumen</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: radial-gradient(circle at 50% 10%, #1f2d46, #070a12 62%);
      color: #fff;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    form {
      width: min(390px, calc(100vw - 32px));
      padding: 32px;
      border: 1px solid rgba(255,255,255,.14);
      border-radius: 28px;
      background: rgba(255,255,255,.08);
      box-shadow: 0 24px 80px rgba(0,0,0,.35);
      backdrop-filter: blur(18px);
    }
    h1 { margin: 0 0 8px; font-size: 32px; letter-spacing: -0.04em; }
    p { margin: 0 0 22px; color: rgba(255,255,255,.72); line-height: 1.45; }
    input, button {
      width: 100%;
      min-height: 48px;
      border: 0;
      border-radius: 14px;
      font: inherit;
    }
    input { padding: 0 14px; background: rgba(255,255,255,.95); color: #111; }
    button { margin-top: 12px; cursor: pointer; font-weight: 700; background: #fff; color: #111; }
    .error { margin-top: 14px; margin-bottom: 0; color: #ff9a9a; }
  </style>
</head>
<body>
  <form method="POST" action="/login">
    <h1>Lumen</h1>
    <p>Prototype privé — accès réservé au projet de fin d'études.</p>
    <input name="code" type="password" placeholder="Code d'accès" autocomplete="current-password" required />
    <button type="submit">Entrer</button>
    ${error ? `<p class="error">Code incorrect.</p>` : ""}
  </form>
</body>
</html>`, {
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // Ne bloque jamais les appels API : ils seront gérés par le Worker /api/*.
  if (url.pathname.startsWith("/api/")) {
    return next();
  }

  if (url.pathname === "/login" && request.method === "GET") {
    return loginPage(false);
  }

  if (url.pathname === "/login" && request.method === "POST") {
    const formData = await request.formData();
    const submittedCode = String(formData.get("code") || "");
    const expectedCode = env.LUMEN_ACCESS_CODE;

    if (!expectedCode) {
      return new Response("Variable Cloudflare manquante : LUMEN_ACCESS_CODE", { status: 500 });
    }

    if (submittedCode === expectedCode) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: "/",
          "Set-Cookie": `${COOKIE_NAME}=ok; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`
        }
      });
    }

    return loginPage(true);
  }

  if (isPublicAsset(url.pathname)) {
    return next();
  }

  const hasAccess = getCookie(request, COOKIE_NAME) === "ok";

  if (!hasAccess) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/login" }
    });
  }

  return next();
}
