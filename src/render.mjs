const HTML_ESCAPE = /[&<>"']/g;
const HTML_ENTITIES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#39;"
};

export function renderProofHtml(proof, options = {}) {
  const normalized = normalizeProof(proof);
  const sourceName = options.sourceName || "proof.json";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(normalized.title)} - Technocore Proof Receipt</title>
  <style>
    :root {
      color-scheme: dark;
      --base: #0A1128;
      --panel: #101A36;
      --ink: #F5F7FA;
      --muted: #A8B0BA;
      --cyan: #00B4D8;
      --line: #26324F;
      --ok: #38D996;
      --warn: #F6C756;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background: var(--base);
      color: var(--ink);
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
      line-height: 1.5;
    }
    main {
      width: min(1120px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 40px 0 56px;
    }
    header {
      border-bottom: 1px solid var(--line);
      padding-bottom: 24px;
      margin-bottom: 24px;
    }
    .chip {
      width: 48px;
      height: 48px;
      background: var(--cyan);
      clip-path: polygon(25% 0, 75% 0, 100% 25%, 100% 75%, 75% 100%, 25% 100%, 0 75%, 0 25%);
      margin-bottom: 20px;
    }
    h1 {
      font-size: clamp(28px, 5vw, 56px);
      line-height: 1;
      margin: 0;
      letter-spacing: 0;
    }
    .subtitle {
      color: var(--muted);
      max-width: 760px;
      margin: 14px 0 0;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 12px;
      margin: 24px 0;
    }
    .card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 16px;
      min-width: 0;
    }
    .label {
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .value {
      overflow-wrap: anywhere;
      font-size: 14px;
    }
    .status {
      color: var(--ok);
      font-weight: 700;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
      display: block;
    }
    thead, tbody, tr {
      display: table;
      width: 100%;
      table-layout: fixed;
    }
    th, td {
      border-bottom: 1px solid var(--line);
      padding: 12px;
      text-align: left;
      vertical-align: top;
      overflow-wrap: anywhere;
    }
    th {
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
    }
    tr:last-child td { border-bottom: 0; }
    pre {
      overflow: auto;
      background: #060B1B;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 16px;
      color: var(--ink);
    }
    a { color: var(--cyan); }
  </style>
</head>
<body>
  <main>
    <header>
      <div class="chip" aria-hidden="true"></div>
      <h1>${escapeHtml(normalized.title)}</h1>
      <p class="subtitle">${escapeHtml(normalized.summary)}</p>
    </header>
    ${renderCards(normalized.cards)}
    ${normalized.rows.length ? renderTable(normalized.rows) : ""}
    <section>
      <h2>Raw Proof</h2>
      <pre>${escapeHtml(JSON.stringify(proof, null, 2))}</pre>
    </section>
    <footer class="subtitle">Rendered offline from ${escapeHtml(sourceName)}. This receipt does not verify signatures by itself; it preserves the proof material for human review.</footer>
  </main>
</body>
</html>`;
}

export function normalizeProof(proof) {
  if (!proof || typeof proof !== "object" || Array.isArray(proof)) {
    throw new Error("proof JSON must be an object");
  }

  if (proof.schema === "technocore-contribution-proof-v1") {
    return normalizeContributionProof(proof);
  }

  if (proof.tool === "technocore-tclk-proof" || proof.contracts || proof.summary) {
    return normalizeTclkAudit(proof);
  }

  throw new Error("unsupported proof shape");
}

function normalizeContributionProof(proof) {
  for (const field of ["artifact_url", "commit", "did", "signature"]) {
    if (typeof proof[field] !== "string" || proof[field].length === 0) {
      throw new Error(`missing contribution proof field: ${field}`);
    }
  }
  if (!/^[0-9a-fA-F]{40}$|^[0-9a-fA-F]{64}$/.test(proof.commit)) {
    throw new Error("commit must be a full 40- or 64-character hex revision");
  }

  return {
    title: "Technocore Contribution Proof",
    summary: "A signed DID receipt for a public artifact revision.",
    cards: [
      ["Schema", proof.schema],
      ["Artifact", proof.artifact_url],
      ["Commit", proof.commit],
      ["DID", proof.did],
      ["Signature", proof.signature]
    ],
    rows: []
  };
}

function normalizeTclkAudit(proof) {
  const summary = proof.summary && typeof proof.summary === "object" ? proof.summary : {};
  const contracts = Array.isArray(proof.contracts) ? proof.contracts : [];
  return {
    title: "Technocore TCLK Proof",
    summary: "An offline receipt for TCLK room messages folded into contract state.",
    cards: [
      ["Contracts", String(summary.contracts ?? contracts.length)],
      ["Frames", String(summary.frames ?? "unknown")],
      ["Rooms", Array.isArray(summary.rooms) ? summary.rooms.join(", ") : String(summary.rooms ?? "unknown")],
      ["Status", summary.status || "parsed"]
    ],
    rows: contracts.map((contract) => ({
      id: contract.id || contract.contractId || "unknown",
      state: contract.state || contract.status || "unknown",
      frames: String(contract.frames?.length ?? contract.frameCount ?? "unknown"),
      detail: contract.room || contract.payer || contract.payee || ""
    }))
  };
}

function renderCards(cards) {
  return `<section class="grid">
${cards.map(([label, value]) => `      <article class="card"><div class="label">${escapeHtml(label)}</div><div class="value">${linkify(value)}</div></article>`).join("\n")}
    </section>`;
}

function renderTable(rows) {
  return `<section>
      <h2>Contracts</h2>
      <table>
        <thead><tr><th>Contract</th><th>State</th><th>Frames</th><th>Detail</th></tr></thead>
        <tbody>
${rows.map((row) => `          <tr><td>${escapeHtml(row.id)}</td><td class="status">${escapeHtml(row.state)}</td><td>${escapeHtml(row.frames)}</td><td>${escapeHtml(row.detail)}</td></tr>`).join("\n")}
        </tbody>
      </table>
    </section>`;
}

function linkify(value) {
  const text = String(value);
  if (/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/.test(text)) {
    return `<a href="${escapeHtml(text)}">${escapeHtml(text)}</a>`;
  }
  return escapeHtml(text);
}

function escapeHtml(value) {
  return String(value).replace(HTML_ESCAPE, (char) => HTML_ENTITIES[char]);
}

