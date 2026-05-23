/**
 * Cloudflare Worker — GitHub OAuth proxy for Sveltia CMS
 *
 * Handles the OAuth handshake so Sveltia CMS can authenticate
 * against a GitHub repository when hosted on Cloudflare Pages.
 *
 * Required secrets (set via `wrangler secret put`):
 *   GITHUB_CLIENT_ID
 *   GITHUB_CLIENT_SECRET
 */

const GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const ALLOWED_ORIGINS = [
  // Add your Cloudflare Pages domain(s) here, e.g.:
  // "https://notallorder.pages.dev",
  // "https://notallorder.com",
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/auth") {
      return handleAuth(url, env);
    }

    if (url.pathname === "/callback") {
      return handleCallback(url, env);
    }

    return new Response("Not found", { status: 404 });
  },
};

function handleAuth(url, env) {
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: `${url.origin}/callback`,
    scope: "repo,user",
    state: crypto.randomUUID(),
  });
  return Response.redirect(`${GITHUB_AUTH_URL}?${params}`, 302);
}

async function handleCallback(url, env) {
  const code = url.searchParams.get("code");

  if (!code) {
    return postMessagePage("error", "github", "No code returned from GitHub");
  }

  const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const data = await tokenResponse.json();

  if (data.error || !data.access_token) {
    return postMessagePage("error", "github", data.error_description || "Token exchange failed");
  }

  return postMessagePage("success", "github", { token: data.access_token, provider: "github" });
}

function postMessagePage(status, provider, content) {
  const message =
    typeof content === "string"
      ? `authorization:${provider}:${status}:${content}`
      : `authorization:${provider}:${status}:${JSON.stringify(content)}`;

  const html = `<!doctype html><html><body><script>
    (function() {
      function sendMessage(e) {
        window.opener.postMessage(${JSON.stringify(message)}, e.origin);
      }
      window.addEventListener("message", sendMessage, false);
      window.opener.postMessage("authorizing:${provider}", "*");
    })();
  </script></body></html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
}
