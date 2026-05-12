(() => {
  const WORKSPACE_ID = "019da8ef-cb09-71b0-9d7e-4e11591d55db";
  const DANIEL_PATIENT_ID = "db4b066b-200f-405f-9fe4-c52eefbc1425";
  const BASE = `/api/workspaces/${WORKSPACE_ID}/fhir`;
  const QUERIES = [
    {
      label: "Daniel DocumentReferences",
      url: `${BASE}/DocumentReference?subject=Patient/${DANIEL_PATIENT_ID}`,
      pick: (resource) => [
        resource.resourceType,
        resource.id,
        resource.status,
        resource.type?.text || resource.description || "",
        resource.date || resource.meta?.lastUpdated || "",
      ],
    },
    {
      label: "Daniel Task Ledger",
      url: `${BASE}/Task?patient=${DANIEL_PATIENT_ID}&_count=10`,
      pick: (resource) => [
        resource.resourceType,
        resource.id,
        resource.status,
        resource.code?.text || "",
        asArray(resource.reasonReference).map((item) => item.reference).filter(Boolean).join(", "),
      ],
    },
    {
      label: "Recent Provenance",
      url: `${BASE}/Provenance?_count=10`,
      pick: (resource) => [
        resource.resourceType,
        resource.id,
        resource.recorded || resource.meta?.lastUpdated || "",
        (resource.target || []).map((item) => item.reference).filter(Boolean).join(", "),
        resource.activity?.text || resource.activity?.coding?.[0]?.code || "",
      ],
    },
  ];

  const previous = document.getElementById("ctc-fhir-proof-viewer");
  if (previous) previous.remove();

  const asArray = (value) => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  };

  const root = document.createElement("section");
  root.id = "ctc-fhir-proof-viewer";
  root.style.cssText = [
    "position:fixed",
    "inset:24px 24px auto auto",
    "width:min(880px,calc(100vw - 48px))",
    "max-height:calc(100vh - 48px)",
    "overflow:auto",
    "z-index:2147483647",
    "background:#0f172a",
    "color:#e5e7eb",
    "border:1px solid #334155",
    "border-radius:14px",
    "box-shadow:0 24px 80px rgba(15,23,42,.45)",
    "font:13px/1.45 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace",
  ].join(";");

  root.innerHTML = `
    <div style="position:sticky;top:0;background:#111827;border-bottom:1px solid #334155;padding:14px 16px;display:flex;gap:12px;align-items:center;justify-content:space-between">
      <div>
        <div style="font:700 15px/1.2 system-ui,sans-serif;color:#fff">Care Transitions Command FHIR Proof</div>
        <div style="color:#94a3b8">Daniel Patient/${DANIEL_PATIENT_ID} via authenticated Prompt Opinion fetch</div>
      </div>
      <div style="display:flex;gap:8px">
        <button data-ctc-refresh style="background:#38bdf8;color:#082f49;border:0;border-radius:8px;padding:8px 10px;font-weight:700">Refresh</button>
        <button data-ctc-close style="background:#1f2937;color:#e5e7eb;border:1px solid #475569;border-radius:8px;padding:8px 10px">Close</button>
      </div>
    </div>
    <div data-ctc-body style="padding:14px 16px">Loading real FHIR resources...</div>
  `;

  document.body.appendChild(root);

  const body = root.querySelector("[data-ctc-body]");
  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const renderBundle = (query, payload) => {
    const entries = Array.isArray(payload.entry) ? payload.entry : [];
    const rows = entries.map((entry) => query.pick(entry.resource || {}));
    const total = payload.total ?? rows.length;
    return `
      <section style="margin:0 0 18px">
        <h3 style="font:700 14px/1.2 system-ui,sans-serif;margin:0 0 8px;color:#bae6fd">${escapeHtml(query.label)} <span style="color:#94a3b8;font-weight:500">total=${escapeHtml(total)}</span></h3>
        <table style="width:100%;border-collapse:collapse;background:#020617;border:1px solid #1e293b">
          <tbody>
            ${rows.length ? rows.map((row) => `
              <tr>
                ${row.map((cell) => `<td style="vertical-align:top;border-top:1px solid #1e293b;padding:7px 8px;color:#e5e7eb">${escapeHtml(cell)}</td>`).join("")}
              </tr>
            `).join("") : `<tr><td style="padding:9px;color:#fbbf24">No resources returned.</td></tr>`}
          </tbody>
        </table>
      </section>
    `;
  };

  const refresh = async () => {
    body.innerHTML = "Loading real FHIR resources...";
    try {
      const results = [];
      for (const query of QUERIES) {
        const response = await fetch(query.url, {
          credentials: "include",
          headers: { accept: "application/fhir+json, application/json, */*" },
        });
        const text = await response.text();
        if (!response.ok) {
          throw new Error(`${query.label} failed HTTP ${response.status}: ${text.slice(0, 240)}`);
        }
        results.push({ query, payload: JSON.parse(text) });
      }
      body.innerHTML = [
        `<div style="margin-bottom:12px;color:#86efac">Loaded at ${escapeHtml(new Date().toLocaleString())}. These rows came from Prompt Opinion FHIR using credentials: include.</div>`,
        ...results.map(({ query, payload }) => renderBundle(query, payload)),
      ].join("");
    } catch (error) {
      body.innerHTML = `<pre style="white-space:pre-wrap;color:#fecaca;background:#450a0a;padding:12px;border-radius:8px">${escapeHtml(error?.stack || error)}</pre>`;
    }
  };

  root.querySelector("[data-ctc-refresh]").addEventListener("click", refresh);
  root.querySelector("[data-ctc-close]").addEventListener("click", () => root.remove());
  void refresh();
})();
