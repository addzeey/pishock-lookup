const PISHOCK_API_BASE = "https://api.pishock.com";
const PISHOCK_V3_DOCS_URL = "https://docs.pishock.com/pishock/pishock-v3-documentation.html";

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return htmlResponse(renderApp());
    }

    if (request.method === "POST" && url.pathname === "/api/shockers") {
      return handleListShockers(request);
    }

    if (request.method === "POST" && url.pathname === "/api/shocker") {
      return handleGetShocker(request);
    }

    return jsonResponse({ error: "Not found" }, 404);
  },
};

async function handleListShockers(request) {
  const body = await readJson(request);
  const credentialsError = validateCredentials(body, false);
  if (credentialsError) {
    return jsonResponse({ error: credentialsError }, 400);
  }

  return proxyPiShockRequest(`${PISHOCK_API_BASE}/Shockers`, body);
}

async function handleGetShocker(request) {
  const body = await readJson(request);
  const credentialsError = validateCredentials(body, true);
  if (credentialsError) {
    return jsonResponse({ error: credentialsError }, 400);
  }

  const shockerId = body.shockerId.trim();
  return proxyPiShockRequest(`${PISHOCK_API_BASE}/Shockers/${encodeURIComponent(shockerId)}`, body);
}

async function proxyPiShockRequest(url, body) {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: buildPiShockHeaders(body),
      cf: { cacheTtl: 0, cacheEverything: false },
    });

    const text = await response.text();
    const maybeJson = parseJson(text);

    return jsonResponse(
      {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        data: maybeJson,
        raw: maybeJson === null ? text : undefined,
        guidance: response.status === 406
          ? `PiShock reports that this hardware is not V3. See ${PISHOCK_V3_DOCS_URL}`
          : undefined,
      },
      response.ok ? 200 : response.status,
    );
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        status: 502,
        statusText: "Bad Gateway",
        error: "Failed to reach PiShock API.",
        detail: error instanceof Error ? error.message : String(error),
      },
      502,
    );
  }
}

function buildPiShockHeaders(body) {
  return {
    Accept: "application/json",
    "X-PiShock-Api-Key": body.apiKey.trim(),
  };
}

function validateCredentials(body, requireShockerId) {
  if (!body || typeof body !== "object") {
    return "Request body must be valid JSON.";
  }

  if (!body.apiKey || !String(body.apiKey).trim()) {
    return "PiShock API key is required.";
  }

  if (requireShockerId && (!body.shockerId || !String(body.shockerId).trim())) {
    return "Shocker ID is required for individual shocker lookup.";
  }

  return null;
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function parseJson(text) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function htmlResponse(html) {
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=UTF-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function renderApp() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PiShock Shocker ID Lookup</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #101418;
        --panel: #1a2027;
        --panel-soft: #202833;
        --text: #f3f5f7;
        --muted: #a8b2bd;
        --line: #313b46;
        --accent: #7ab4ff;
        --danger: #ff9b9b;
        --success: #96d7a5;
      }

      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: Inter, Segoe UI, Roboto, Arial, sans-serif;
        background: var(--bg);
        color: var(--text);
      }

      .shell {
        max-width: 1100px;
        margin: 0 auto;
        padding: 32px 20px 56px;
      }

      .hero {
        margin-bottom: 24px;
      }

      h1 {
        margin: 0 0 10px;
        font-size: clamp(2rem, 5vw, 3.5rem);
        line-height: 0.95;
        letter-spacing: -0.04em;
      }

      .lead {
        max-width: 760px;
        color: var(--muted);
        font-size: 1rem;
        line-height: 1.6;
      }

      .notice {
        margin-top: 16px;
        padding: 14px 16px;
        border: 1px solid var(--line);
        border-radius: 14px;
        background: var(--panel-soft);
        color: var(--muted);
      }

      .notice strong { color: var(--text); }

      .subnotice {
        margin-top: 12px;
        padding: 12px 14px;
        border: 1px solid var(--line);
        border-radius: 14px;
        background: var(--panel-soft);
        color: var(--muted);
      }

      .subnotice a {
        color: var(--accent);
        text-decoration: none;
      }

      .grid {
        display: grid;
        grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
        gap: 20px;
      }

      .card {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 20px;
        padding: 18px;
      }

      .card h2 {
        margin: 0 0 6px;
        font-size: 1.1rem;
      }

      .card p {
        margin: 0 0 16px;
        color: var(--muted);
        line-height: 1.5;
      }

      label {
        display: block;
        margin: 0 0 8px;
        font-size: 0.92rem;
        color: var(--text);
      }

      .field { margin-bottom: 14px; }

      input {
        width: 100%;
        border: 1px solid var(--line);
        border-radius: 12px;
        background: #11161c;
        color: var(--text);
        padding: 12px 13px;
        font: inherit;
      }

      input:focus {
        outline: 2px solid rgba(116,176,255,0.28);
        border-color: var(--accent);
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      button {
        appearance: none;
        border: 0;
        border-radius: 999px;
        padding: 11px 16px;
        font: inherit;
        font-weight: 600;
        cursor: pointer;
        color: #0d1319;
        background: var(--accent);
      }

      button.secondary {
        color: var(--text);
        background: var(--panel-soft);
        border: 1px solid var(--line);
      }

      .status {
        min-height: 22px;
        margin-top: 14px;
        color: var(--muted);
      }

      .status.error { color: var(--danger); }
      .status.success { color: var(--success); }

      .result-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        margin-bottom: 12px;
      }

      .pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        border-radius: 999px;
        background: #24303d;
        color: var(--accent);
        font-size: 0.85rem;
      }

      .parsed-results {
        display: grid;
        gap: 12px;
        margin-bottom: 14px;
      }

      .parsed-empty {
        padding: 16px;
        border: 1px dashed var(--line);
        border-radius: 14px;
        color: var(--muted);
        background: var(--panel-soft);
      }

      .shocker-card {
        border: 1px solid var(--line);
        border-radius: 16px;
        background: var(--panel-soft);
        padding: 14px;
      }

      .shocker-title {
        margin: 0 0 10px;
        font-size: 1rem;
      }

      .kv-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }

      .kv-item {
        padding: 10px;
        border-radius: 12px;
        background: #131920;
        border: 1px solid #2a343f;
      }

      .kv-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 4px;
      }

      .kv-label {
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--muted);
      }

      .kv-value {
        font-size: 0.95rem;
        word-break: break-word;
      }

      .copy-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        padding: 0;
        border-radius: 8px;
        border: 1px solid #2f3a46;
        background: #1b232c;
        color: var(--muted);
      }

      .copy-button:hover {
        background: #24303d;
        color: var(--text);
      }

      .copy-button.copied {
        background: #23412b;
        border-color: #3d6a48;
        color: var(--success);
        transform: scale(1.06);
      }

      .copy-button.copied svg {
        transform: scale(1.08);
      }

      .copy-button:focus-visible {
        outline: 2px solid rgba(122,180,255,0.35);
        outline-offset: 1px;
      }

      .copy-button svg {
        width: 14px;
        height: 14px;
        fill: currentColor;
        transition: transform 120ms ease;
      }

      .copy-button,
      .copy-button svg {
        transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease, transform 120ms ease;
      }

      details.advanced {
        border-top: 1px solid var(--line);
        padding-top: 12px;
      }

      details.advanced summary {
        cursor: pointer;
        color: var(--accent);
        font-weight: 600;
        margin-bottom: 12px;
      }

      pre {
        margin: 0;
        overflow: auto;
        min-height: 420px;
        max-height: 68vh;
        border-radius: 14px;
        border: 1px solid #2a343f;
        background: #11161c;
        color: #d9e8ff;
        padding: 16px;
        font-size: 0.88rem;
        line-height: 1.55;
      }

      .footer {
        margin-top: 16px;
        color: var(--muted);
        font-size: 0.92rem;
      }

      .footer a {
        color: var(--accent);
        text-decoration: none;
      }

        @media (max-width: 860px) {
        .grid {
          grid-template-columns: 1fr;
        }

        .kv-grid {
          grid-template-columns: 1fr;
        }

        pre {
          min-height: 280px;
        }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="hero">
        <h1>PiShock Shocker ID Lookup</h1>
        <p class="lead">
          Find your <code>ShockerId</code> using the current PiShock API.
          This page uses your credentials only for the current request and does not save them in storage.
        </p>
        <div class="notice">
          <strong>Privacy:</strong> your API key is only used to make the lookup you request here.
          This page does not save your credentials for later use.
        </div>
        <div class="subnotice">
          PiShock V3 hardware is required for this API flow.
          <a href="${PISHOCK_V3_DOCS_URL}" target="_blank" rel="noreferrer">Open PiShock V3 docs</a>
        </div>
      </section>

      <section class="grid">
        <div class="card">
          <h2>Credentials</h2>
          <p>Enter the PiShock API key to query <code>/Shockers</code> or <code>/Shockers/{id}</code>.</p>

          <form id="lookup-form">
            <div class="field">
              <label for="apiKey">PiShock API Key</label>
              <input id="apiKey" name="apiKey" type="password" autocomplete="off" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" required />
            </div>

            <div class="field">
              <label for="shockerId">Specific Shocker ID</label>
              <input id="shockerId" name="shockerId" inputmode="numeric" autocomplete="off" placeholder="Optional for list lookup" />
            </div>

            <div class="actions">
              <button type="submit" data-action="list">List My Shockers</button>
              <button type="submit" class="secondary" data-action="single">Lookup Specific ID</button>
            </div>
          </form>

          <div id="status" class="status"></div>
        </div>

        <div class="card">
          <div class="result-toolbar">
            <h2>Response</h2>
            <span class="pill">No credentials stored</span>
          </div>
          <div id="parsedResults" class="parsed-results">
            <div class="parsed-empty">Run a lookup to see the parsed PiShock response here.</div>
          </div>
          <template id="parsedEmptyTemplate">
            <div class="parsed-empty"></div>
          </template>
          <template id="shockerCardTemplate">
            <section class="shocker-card">
              <h3 class="shocker-title"></h3>
              <div class="kv-grid"></div>
            </section>
          </template>
          <template id="kvItemTemplate">
            <div class="kv-item">
              <div class="kv-head">
                <div class="kv-label"></div>
                <button type="button" class="copy-button" aria-label="Copy value" title="Copy value">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1Zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H10V7h9v14Z" />
                  </svg>
                </button>
              </div>
              <div class="kv-value"></div>
            </div>
          </template>
          <details class="advanced">
            <summary>Advanced JSON response</summary>
            <pre id="output">Run a lookup to see the PiShock API response here.</pre>
          </details>
        </div>
      </section>
    </main>

    <script>
      const form = document.getElementById("lookup-form");
      const output = document.getElementById("output");
      const parsedResults = document.getElementById("parsedResults");
      const parsedEmptyTemplate = document.getElementById("parsedEmptyTemplate");
      const shockerCardTemplate = document.getElementById("shockerCardTemplate");
      const kvItemTemplate = document.getElementById("kvItemTemplate");
      const status = document.getElementById("status");
      let currentAction = "list";

      for (const button of form.querySelectorAll("button[type=submit]")) {
        button.addEventListener("click", () => {
          currentAction = button.dataset.action;
        });
      }

      form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const payload = {
          apiKey: document.getElementById("apiKey").value,
          shockerId: document.getElementById("shockerId").value,
        };

        const endpoint = currentAction === "single" ? "/api/shocker" : "/api/shockers";
        setStatus("Requesting PiShock data...", "");
        output.textContent = "Loading...";

        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          const data = await response.json();
          output.textContent = JSON.stringify(data, null, 2);
          renderParsedResults(data);

          if (response.ok && data.ok !== false) {
            setStatus("Lookup completed.", "success");
          } else {
            const message = data.error || data.guidance || data.statusText || "Lookup failed.";
            setStatus(message, "error");
          }
        } catch (error) {
          output.textContent = String(error);
          renderParsedResults(null);
          setStatus("Request failed before PiShock returned a response.", "error");
        }
      });

      function setStatus(message, kind) {
        status.textContent = message;
        status.className = kind ? "status " + kind : "status";
      }

      function renderParsedResults(payload) {
        const items = normalizeItems(payload);
        parsedResults.replaceChildren();

        if (!items.length) {
          const emptyNode = parsedEmptyTemplate.content.firstElementChild.cloneNode(true);
          emptyNode.textContent = "No parsed shocker data was returned. Open the Advanced JSON response for the full payload.";
          parsedResults.appendChild(emptyNode);
          return;
        }

        for (const [index, item] of items.entries()) {
          const title = item.Name || item.ShockerId || item.HubId || (index + 1);
          const card = shockerCardTemplate.content.firstElementChild.cloneNode(true);
          card.querySelector(".shocker-title").textContent = "Shocker " + (index + 1) + ": " + String(title);

          const grid = card.querySelector(".kv-grid");
          for (const [key, value] of Object.entries(item)) {
            const row = kvItemTemplate.content.firstElementChild.cloneNode(true);
            const textValue = formatValue(value);
            row.querySelector(".kv-label").textContent = splitLabel(key);
            row.querySelector(".kv-value").textContent = textValue;
            const copyButton = row.querySelector(".copy-button");
            copyButton.addEventListener("click", async () => {
              await copyValue(textValue);
              flashCopiedState(copyButton);
              setStatus(splitLabel(key) + " copied.", "success");
            });
            grid.appendChild(row);
          }

          parsedResults.appendChild(card);
        }
      }

      function normalizeItems(payload) {
        if (!payload || typeof payload !== "object") {
          return [];
        }

        const data = payload.data;
        if (Array.isArray(data)) {
          return data.filter((item) => item && typeof item === "object");
        }

        if (data && typeof data === "object") {
          return [data];
        }

        return [];
      }

      function splitLabel(value) {
        return String(value)
          .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
          .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
          .trim();
      }

      function formatValue(value) {
        if (typeof value === "boolean") {
          return value ? "Yes" : "No";
        }

        if (value === null || value === undefined || value === "") {
          return "-";
        }

        if (typeof value === "object") {
          return JSON.stringify(value);
        }

        return String(value);
      }

      async function copyValue(value) {
        await navigator.clipboard.writeText(String(value));
      }

      function flashCopiedState(button) {
        const previousLabel = button.getAttribute("aria-label") || "Copy value";
        const previousTitle = button.getAttribute("title") || "Copy value";
        button.classList.add("copied");
        button.setAttribute("aria-label", "Copied");
        button.setAttribute("title", "Copied");

        clearTimeout(button._copiedTimer);
        button._copiedTimer = setTimeout(() => {
          button.classList.remove("copied");
          button.setAttribute("aria-label", previousLabel);
          button.setAttribute("title", previousTitle);
        }, 1200);
      }
    </script>
  </body>
</html>`;
}
