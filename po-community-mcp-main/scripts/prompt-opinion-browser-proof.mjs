#!/usr/bin/env node
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(__filename);
const PO_ROOT = path.resolve(SCRIPT_DIR, "..");
const REPO_ROOT = path.resolve(PO_ROOT, "..");

const PROMPTS = {
  prompt1: "Is this patient safe to discharge today?",
  prompt2: "What hidden risk changed that answer? Show me the contradiction and the evidence.",
  prompt3: "What exactly must happen before discharge, and prepare the transition package.",
};

const A2A_ROUTE_LOCK_VARIANTS = [
  {
    id: "A",
    attemptId: "A2A-VA-01",
    name: "Prompt 2 as first A2A turn",
    prompt:
      "Consult Care Transitions Command and ask: Is this patient safe to discharge today? Reconcile the structured discharge posture with hidden narrative risks from the notes.",
    expectedTokens: ["care transitions command", "structured", "hidden", "not_ready", "contradiction"],
  },
  {
    id: "B",
    attemptId: "A2A-VB-01",
    name: "Exact external agent name included",
    prompt:
      "Ask Care Transitions Command to reconcile structured discharge readiness with Clinical Intelligence hidden-risk findings for the canonical trap patient.",
    expectedTokens: ["care transitions command", "clinical intelligence", "hidden", "not_ready", "evidence"],
  },
  {
    id: "C",
    attemptId: "A2A-VC-01",
    name: "Explicit forward instruction",
    prompt:
      "Use the selected external A2A agent for this question. Do not answer directly. Forward the case to Care Transitions Command: is this patient safe to discharge today?",
    expectedTokens: ["care transitions command", "not_ready", "structured", "hidden", "forward"],
  },
  {
    id: "D",
    attemptId: "A2A-VD-01",
    name: "Existing Prompt 3 control",
    prompt: PROMPTS.prompt3,
    expectedTokens: ["transition", "handoff", "before discharge", "not_ready"],
  },
];

const A2A_ROUTE_LOCK_SKIPPED_VARIANTS = [
  {
    id: "E",
    name: "Consultation prompt override comparison",
    status: "skipped",
    reason:
      "The General Chat consult-system forwarding prompt is not configurable from this repo or runbook automation. Variant E remains an operator-side/manual check only.",
  },
];

const BLOCKER_LABELS = [
  "registration_only",
  "chat_path_not_routed",
  "runtime_hit_but_no_transcript",
  "runtime_hit_but_downstream_failure",
  "workspace_auth_failed",
  "workspace_ui_unreachable",
  "workspace_agent_not_found",
];

const nowIso = () => new Date().toISOString();

const getenv = (name, fallback = "") => {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
};

const providerEvidence = {
  provider: getenv("CLINICAL_INTELLIGENCE_LLM_PROVIDER", "heuristic"),
  model: getenv("CLINICAL_INTELLIGENCE_GOOGLE_MODEL", "gemma-4-31b-it"),
  google_api_key_present: Boolean(getenv("GOOGLE_API_KEY")),
  gemini_api_key_present: Boolean(getenv("GEMINI_API_KEY")),
  google_proof_eligible:
    getenv("CLINICAL_INTELLIGENCE_LLM_PROVIDER", "heuristic") === "google" &&
    (Boolean(getenv("GOOGLE_API_KEY")) || Boolean(getenv("GEMINI_API_KEY"))),
};

const mustEnv = (name) => {
  const value = getenv(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const ensureDir = async (dir) => {
  await fsp.mkdir(dir, { recursive: true });
};

const readJsonIfExists = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
};

const resolveLatestRunDir = () => {
  const explicit = getenv("PROMPT_OPINION_E2E_RUN_DIR");
  if (explicit) {
    return path.resolve(explicit);
  }

  const latest = path.join(REPO_ROOT, "output/prompt-opinion-e2e/latest");
  try {
    return fs.realpathSync(latest);
  } catch {
    return latest;
  }
};

const safeBasename = (value) => value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-|-$/g, "");

const runDir = resolveLatestRunDir();
const runMetadata = readJsonIfExists(path.join(runDir, "reports/run-metadata.json")) || {};
const runId = getenv("PROMPT_OPINION_E2E_RUN_ID", runMetadata.run_id || safeBasename(path.basename(runDir)) || "manual");
const outputPlaywrightDir = path.join(REPO_ROOT, "output/playwright", runId);
const runScreenshotsDir = path.join(runDir, "screenshots");
const reportsDir = path.join(runDir, "reports");
const notesDir = path.join(runDir, "notes");
const runtimeProfileDir = getenv(
  "PROMPT_OPINION_BROWSER_PROFILE_DIR",
  path.join(PO_ROOT, ".runtime/prompt-opinion-browser-profile"),
);

const browserBaseUrl = getenv("PROMPT_OPINION_BASE_URL", "https://app.promptopinion.ai/");
const email = mustEnv("PROMPT_OPINION_EMAIL");
const password = mustEnv("PROMPT_OPINION_PASSWORD");
const headless = getenv("PROMPT_OPINION_BROWSER_HEADLESS", "0") === "1";
const promptTimeoutMs = Number(getenv("PROMPT_OPINION_PROMPT_TIMEOUT_MS", "180000"));
const browserSlowMoMs = Number(getenv("PROMPT_OPINION_BROWSER_SLOW_MO_MS", "0"));
const updateRegistrations = getenv("PROMPT_OPINION_UPDATE_REGISTRATIONS", "0") === "1";
const postSettleRuntimeGraceMs = Number(getenv("PROMPT_OPINION_POST_SETTLE_RUNTIME_GRACE_MS", "20000"));
const finalSettleDelayMs = Number(getenv("PROMPT_OPINION_FINAL_SETTLE_DELAY_MS", "3000"));
const settlePollMs = Number(getenv("PROMPT_OPINION_SETTLE_POLL_MS", "2000"));
const normalizeLaneToken = (value) => String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const enabledBrowserLanes = new Set(
  (getenv("PROMPT_OPINION_BROWSER_LANES", "all") || "all")
    .split(",")
    .map((item) => normalizeLaneToken(item))
    .filter(Boolean),
);
const enabledDirectPrompts = new Set(
  (getenv("PROMPT_OPINION_DIRECT_PROMPTS", "prompt1,prompt2,prompt3") || "prompt1,prompt2,prompt3")
    .split(",")
    .map((item) => normalizeLaneToken(item))
    .filter(Boolean),
);

const PROMPT_KEYS = Object.fromEntries(Object.entries(PROMPTS).map(([key, value]) => [value, key]));
const laneEnabled = (lane) => enabledBrowserLanes.has("all") || enabledBrowserLanes.has(normalizeLaneToken(lane));
const directPromptEnabled = (promptKey) => enabledDirectPrompts.has("all") || enabledDirectPrompts.has(normalizeLaneToken(promptKey));

const normalizeWhitespace = (value) => String(value || "").replace(/\s+/g, " ").trim();
const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const parseRegexSpec = (value) => {
  if (value instanceof RegExp) {
    return value;
  }
  if (typeof value !== "string") {
    return new RegExp(escapeRegex(String(value || "")), "i");
  }
  const trimmed = value.trim();
  if (trimmed.startsWith("/") && trimmed.lastIndexOf("/") > 0) {
    const lastSlash = trimmed.lastIndexOf("/");
    const source = trimmed.slice(1, lastSlash);
    const flags = trimmed.slice(lastSlash + 1) || "i";
    return new RegExp(source, flags);
  }
  return new RegExp(escapeRegex(trimmed), "i");
};

const defaultSemanticAnchorSets = {
  prompt1: {
    required_any: [
      {
        name: "final posture is not_ready",
        patterns: [/final[_ ]verdict["': ]+not[_ -]?ready/i, /not[_ -]?ready/i, /unsafe to discharge/i, /hold discharge/i],
      },
      {
        name: "structured posture is summarized",
        patterns: [
          /structured baseline/i,
          /deterministic/i,
          /discharge spine/i,
          /baseline[^.\n]{0,80}\bready\b/i,
          /\bstructured\b[^.\n]{0,80}\bready\b/i,
        ],
      },
      {
        name: "hidden narrative contradiction is surfaced",
        patterns: [/clinical_intelligence_status["': ]+ok/i, /hidden[- ]risk narrative review[^.\n]{0,80}\bok\b/i, /hidden risk/i, /contradiction/i, /narrative evidence/i, /note[- ]level/i],
      },
      {
        name: "narrative sources were reviewed",
        patterns: [
          /narrative_source_count["': ]+[1-9]/i,
          /narrative source count[^.\n]{0,40}[1-9]/i,
          /hidden[- ]risk review status[^.\n]{0,80}\bok\b/i,
        ],
      },
      {
        name: "hidden-risk result is present",
        patterns: [
          /hidden_risk_result["': ]+hidden_risk_present/i,
          /result=hidden_risk_present/i,
          /hidden risk present/i,
          /hidden[- ]risk status[^.\n]{0,80}present/i,
        ],
      },
      {
        name: "patient-specific evidence is mentioned",
        patterns: [
          /nursing note/i,
          /case management/i,
          /hospitalist/i,
          /home oxygen/i,
          /oxygen/i,
          /stairs/i,
          /82%/i,
        ],
      },
      {
        name: "nursing evidence anchor is visible",
        patterns: [/Nursing Note 2026-04-18 20:40/i],
      },
      {
        name: "case-management evidence anchor is visible",
        patterns: [/Case Management Addendum 2026-04-18 20:55/i],
      },
    ],
    forbidden_any: [/safe to discharge(?: home)? today/i, /verdict[^.\n]{0,20}(?<!not[_ -])\bready\b/i, /routine discharge/i],
  },
  prompt2: {
    required_any: [
      {
        name: "final posture remains not_ready",
        patterns: [/not[_ -]?ready/i, /unsafe to discharge/i, /cannot discharge/i],
      },
      {
        name: "recommendation changes because of hidden narrative risk",
        patterns: [
          /hidden risk/i,
          /narrative evidence/i,
          /contradiction/i,
          /changed that answer/i,
          /forced escalation/i,
        ],
      },
      {
        name: "structured posture and note contradiction are both visible",
        patterns: [
          /structured baseline/i,
          /baseline[^.\n]{0,80}\bready\b/i,
          /nursing note/i,
          /case management/i,
          /hospitalist/i,
          /notes?\b/i,
        ],
      },
    ],
    forbidden_any: [/safe to discharge(?: home)? today/i, /no hidden risk/i, /discharge as normal/i],
  },
  prompt3: {
    required_any: [
      {
        name: "transition package or handoff is prepared",
        patterns: [
          /transition package/i,
          /handoff/i,
          /patient[- ]friendly/i,
          /patient[- ]facing/i,
          /discharge instructions/i,
          /next steps/i,
        ],
      },
      {
        name: "posture stays conservative and contradiction-aware",
        patterns: [/not[_ -]?ready/i, /hold discharge/i, /before discharge/i, /manual clinician review/i],
      },
      {
        name: "actions are concrete",
        patterns: [/owner/i, /timing/i, /case management/i, /home oxygen/i, /follow[- ]up/i],
      },
    ],
    forbidden_any: [/discharge as normal/i, /routine discharge/i, /safe to discharge(?: home)? today/i],
  },
};

const overrideSemanticAnchorSets = (() => {
  const raw = getenv("PROMPT_OPINION_SEMANTIC_ANCHORS_JSON");
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn(
      `[po-browser-proof] ignoring PROMPT_OPINION_SEMANTIC_ANCHORS_JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return {};
  }
})();

const publicEndpoints = {
  dischargeGatekeeperMcp: getenv("PROMPT_OPINION_DGK_PUBLIC_URL"),
  clinicalIntelligenceMcp: getenv("PROMPT_OPINION_CI_PUBLIC_URL"),
  externalA2a: getenv("PROMPT_OPINION_A2A_PUBLIC_URL"),
};

const runtimeLogFiles = {
  a2a: getenv("PROMPT_OPINION_A2A_LOG", path.join(PO_ROOT, ".pids/external-a2a.log")),
  dischargeGatekeeper: getenv(
    "PROMPT_OPINION_DGK_LOG",
    path.join(PO_ROOT, ".runtime/two-mcp/discharge-gatekeeper.log"),
  ),
  clinicalIntelligence: getenv(
    "PROMPT_OPINION_CI_LOG",
    path.join(PO_ROOT, ".runtime/two-mcp/clinical-intelligence.log"),
  ),
};

const redactPatterns = [
  /(?:[A-Z0-9._%+-]+%40[A-Z0-9.-]+\.[A-Z]{2,}|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi,
  /bearer\s+[a-z0-9._~+/=-]+/gi,
  /AIza[0-9A-Za-z_-]{20,}/g,
  /(api[_-]?key["':=\s]+)([^"',\s]+)/gi,
  /(password["':=\s]+)([^"',\s]+)/gi,
  /(authorization["':=\s]+)([^"',\s]+)/gi,
  /(cookie["':=\s]+)([^"',\n]+)/gi,
  /(apiKey["':=\s]+)([^"',\s]+)/gi,
  /(access[_-]?token["':=\s]+)([^"',\s]+)/gi,
  /(refresh[_-]?token["':=\s]+)([^"',\s]+)/gi,
  /(id[_-]?token["':=\s]+)([^"',\s]+)/gi,
];

const redactText = (text) => {
  if (typeof text !== "string") {
    return text;
  }

  let redacted = text.replaceAll(email, "[redacted-email]");
  for (const pattern of redactPatterns) {
    redacted = redacted.replace(pattern, "$1[redacted]");
  }
  return redacted;
};

const redactHeaders = (headers) => {
  const result = {};
  for (const [name, value] of Object.entries(headers || {})) {
    const lower = name.toLowerCase();
    if (["authorization", "cookie", "set-cookie", "x-csrf-token", "x-xsrf-token"].includes(lower)) {
      result[lower] = "[redacted]";
      continue;
    }
    result[lower] = redactText(String(value));
  }
  return result;
};

const truncate = (value, max = 2400) => {
  if (typeof value !== "string") {
    return value;
  }
  return value.length > max ? `${value.slice(0, max)}...[truncated ${value.length - max} chars]` : value;
};

const shapeOf = (value, depth = 0) => {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return depth > 2 ? "array" : value.slice(0, 4).map((item) => shapeOf(item, depth + 1));
  }
  if (typeof value === "object") {
    if (depth > 2) {
      return "object";
    }
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 24)
        .map(([key, item]) => [key, shapeOf(item, depth + 1)]),
    );
  }
  return typeof value;
};

const describeBody = (body) => {
  if (!body) {
    return null;
  }

  const redacted = redactText(body);
  try {
    const parsed = JSON.parse(redacted);
    return {
      kind: "json",
      shape: shapeOf(parsed),
      preview: truncate(JSON.stringify(parsed), 1200),
    };
  } catch {
    return {
      kind: "text",
      shape: "text",
      preview: truncate(redacted, 1200),
    };
  }
};

const getHost = (url) => {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
};

const runtimeHosts = Object.values(publicEndpoints)
  .filter(Boolean)
  .map(getHost)
  .filter(Boolean);

const statLogOffsets = () => {
  const offsets = {};
  for (const [key, file] of Object.entries(runtimeLogFiles)) {
    try {
      offsets[key] = fs.statSync(file).size;
    } catch {
      offsets[key] = 0;
    }
  }
  return offsets;
};

const readLogDeltas = (startOffsets) => {
  const result = {};
  for (const [key, file] of Object.entries(runtimeLogFiles)) {
    const start = startOffsets[key] || 0;
    try {
      const current = fs.statSync(file).size;
      if (current <= start) {
        result[key] = [];
        continue;
      }
      const fd = fs.openSync(file, "r");
      const buffer = Buffer.alloc(current - start);
      fs.readSync(fd, buffer, 0, buffer.length, start);
      fs.closeSync(fd);
      result[key] = buffer
        .toString("utf8")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return { raw: redactText(line) };
          }
        });
    } catch {
      result[key] = [];
    }
  }
  return result;
};

const summarizeRuntimeDelta = (delta) => {
  const a2aRequests = (delta.a2a || []).filter((entry) => entry.message === "HTTP request received");
  const a2aResponses = (delta.a2a || []).filter((entry) => entry.message === "HTTP request completed");
  const a2aTasksStarted = (delta.a2a || []).filter((entry) => entry.message === "A2A task execution started");
  const a2aTasksFinished = (delta.a2a || []).filter((entry) => entry.message === "A2A task execution finished");
  const dgkMcpRequests = (delta.dischargeGatekeeper || []).filter((entry) => entry.message === "MCP request received");
  const ciMcpRequests = (delta.clinicalIntelligence || []).filter((entry) => entry.message === "MCP request received");

  return {
    a2a_request_count: a2aRequests.length,
    a2a_response_count: a2aResponses.length,
    a2a_2xx_response_count: a2aResponses.filter((entry) => Number(entry.status_code) >= 200 && Number(entry.status_code) < 300).length,
    a2a_task_started_count: a2aTasksStarted.length,
    a2a_task_finished_count: a2aTasksFinished.length,
    a2a_paths: [...new Set(a2aRequests.map((entry) => entry.path).filter(Boolean))],
    a2a_response_paths: [...new Set(a2aResponses.map((entry) => entry.path).filter(Boolean))],
    a2a_status_codes: [...new Set(a2aResponses.map((entry) => entry.status_code).filter((value) => value !== undefined))],
    a2a_request_ids: [
      ...new Set(
        [...a2aRequests, ...a2aResponses, ...a2aTasksStarted, ...a2aTasksFinished]
          .map((entry) => entry.request_id)
          .filter(Boolean),
      ),
    ],
    a2a_task_ids: [...new Set(a2aTasksStarted.map((entry) => entry.task_id).filter(Boolean))],
    a2a_correlation_ids: [
      ...new Set(
        [...a2aTasksStarted, ...a2aTasksFinished].map((entry) => entry.correlation_id).filter(Boolean),
      ),
    ],
    discharge_gatekeeper_mcp_request_count: dgkMcpRequests.length,
    clinical_intelligence_mcp_request_count: ciMcpRequests.length,
    both_mcps_hit:
      dgkMcpRequests.length > 0 &&
      ciMcpRequests.length > 0,
    discharge_gatekeeper_request_ids: [...new Set(dgkMcpRequests.map((entry) => entry.request_id).filter(Boolean))],
    clinical_intelligence_request_ids: [...new Set(ciMcpRequests.map((entry) => entry.request_id).filter(Boolean))],
  };
};

const steps = [];
const attempts = [];
const networkEvents = [];
const requestIds = new WeakMap();
let networkSeq = 0;
let registrationSummary = null;

const recordStep = (name, status, details = {}) => {
  const step = {
    name,
    status,
    at: nowIso(),
    ...details,
  };
  steps.push(step);
  console.log(`[po-browser-proof] ${name}: ${status}`);
  return step;
};

const normalizeStatus = (status) => status.toLowerCase();

const normalizeUrl = (value) => String(value || "").trim().replace(/\/+$/g, "");

const writeJson = async (file, payload) => {
  await ensureDir(path.dirname(file));
  await fsp.writeFile(file, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
};

const pageText = async (page) => {
  try {
    return await page.locator("body").innerText({ timeout: 5000 });
  } catch {
    return "";
  }
};

const capture = async (page, filename, label) => {
  const screenshotFile = path.join(runScreenshotsDir, filename);
  const outputFile = path.join(outputPlaywrightDir, filename);
  const textFile = screenshotFile.replace(/\.png$/i, ".txt");
  const outputTextFile = outputFile.replace(/\.png$/i, ".txt");

  await ensureDir(runScreenshotsDir);
  await ensureDir(outputPlaywrightDir);
  await page.screenshot({ path: screenshotFile, fullPage: true });
  await fsp.copyFile(screenshotFile, outputFile);

  const text = redactText(await pageText(page));
  await fsp.writeFile(textFile, text, "utf8");
  await fsp.writeFile(outputTextFile, text, "utf8");

  return {
    label,
    screenshot: path.relative(runDir, screenshotFile),
    output_screenshot: path.relative(REPO_ROOT, outputFile),
    text: path.relative(runDir, textFile),
    url: page.url(),
  };
};

const clickIfVisible = async (page, locator, timeout = 2500) => {
  try {
    const count = await locator.count();
    if (count === 0) {
      return false;
    }
    const first = locator.first();
    await first.waitFor({ state: "visible", timeout });
    await first.click({ timeout });
    return true;
  } catch {
    return false;
  }
};

const fillLogin = async (page) => {
  const emailInput = page.locator('input[type="email"], input[name*="email" i], input[placeholder*="email" i]').first();
  await emailInput.fill(email, { timeout: 20000 });

  let passwordInput = page.locator('input[type="password"], input[name*="password" i]').first();
  if ((await passwordInput.count()) === 0 || !(await passwordInput.isVisible().catch(() => false))) {
    const continueButton = page.getByRole("button", { name: /continue|next|submit/i }).first();
    if (!(await clickIfVisible(page, continueButton, 5000))) {
      await emailInput.press("Enter");
    }
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1500);
  }

  passwordInput = page.locator('input[type="password"], input[name*="password" i]').first();
  await passwordInput.fill(password, { timeout: 30000 });

  const submit = page.getByRole("button", { name: /log in|login|sign in|continue|submit/i }).first();
  if (!(await clickIfVisible(page, submit, 5000))) {
    await passwordInput.press("Enter");
  }
};

const ensureLoggedIn = async (page) => {
  await page.goto(browserBaseUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  const loginEvidence = await capture(page, "01-po-login-page.png", "Login page");
  const text = await pageText(page);
  const needsLogin =
    page.url().includes("/login") ||
    /password/i.test(text) ||
    (await page.locator('input[type="password"]').count()) > 0;

  if (needsLogin) {
    await fillLogin(page);
    await page.waitForLoadState("domcontentloaded", { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(5000);
  }

  const postLoginText = await pageText(page);
  const authed = !page.url().includes("/login") && /workspace|launchpad|agents|arsh/i.test(postLoginText);
  const workspaceEvidence = await capture(page, "02-po-workspace-launchpad.png", "Workspace launchpad");

  recordStep("login", authed ? "green" : "red", {
    url: page.url(),
    evidence: [loginEvidence, workspaceEvidence],
  });

  return authed;
};

const discoverWorkspaceId = async (page) => {
  const fromUrl = page.url().match(/\/workspaces\/([^/?#]+)/)?.[1];
  if (fromUrl) {
    return fromUrl;
  }

  const hrefs = await page.locator("a[href]").evaluateAll((links) =>
    links.map((link) => link.getAttribute("href")).filter(Boolean),
  );
  for (const href of hrefs) {
    const match = href.match(/\/workspaces\/([^/?#]+)/);
    if (match) {
      return match[1];
    }
  }

  return null;
};

const gotoWorkspaceRoute = async (page, workspaceId, route) => {
  const url = new URL(`/workspaces/${workspaceId}/${route}`, browserBaseUrl).toString();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);
};

const verifyWorkspaceSurface = async (page, workspaceId, route, screenshotName, label, requiredTokens) => {
  await gotoWorkspaceRoute(page, workspaceId, route);
  const evidence = await capture(page, screenshotName, label);
  const text = await pageText(page);
  const missing = requiredTokens.filter((token) => !text.toLowerCase().includes(token.toLowerCase()));
  recordStep(label, missing.length === 0 ? "green" : "yellow", {
    route,
    missing_tokens: missing,
    evidence: [evidence],
  });
  return { text, evidence, missing };
};

const apiFetch = async (page, apiPath, { method = "GET", body = null } = {}) => {
  const apiUrl = new URL(apiPath.replace(/^\/+/, ""), browserBaseUrl).toString();
  return page.evaluate(
    async ({ url, method: requestMethod, body: requestBody }) => {
      const options = {
        method: requestMethod,
        credentials: "include",
      };
      if (requestBody !== null && requestBody !== undefined) {
        options.headers = { "content-type": "application/json" };
        options.body = JSON.stringify(requestBody);
      }

      const response = await fetch(url, options);
      const text = await response.text();
      let parsed = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = text;
      }

      return {
        ok: response.ok,
        status: response.status,
        url: response.url,
        body: parsed,
      };
    },
    { url: apiUrl, method, body },
  );
};

const mcpUpdatePayload = (entry, endpoint) => ({
  name: entry.name,
  endpoint,
  transportType: entry.transportType || "StreamableHttp",
  authType: entry.authType || "Open",
  apiKeyHeaderName: entry.apiKeyHeaderName || "",
  apiKeyHeaderValue: entry.apiKeyHeaderValue || "",
  basicAuthUsername: entry.basicAuthUsername || "",
  basicAuthPassword: entry.basicAuthPassword || "",
  sendFhirContext: Boolean(entry.sendFhirContext),
  fhirCtxAuthorizedScopes: Array.isArray(entry.fhirCtxAuthorizedScopes) ? entry.fhirCtxAuthorizedScopes : [],
});

const a2aUpdatePayload = (entry, url) => {
  const payload = {
    url,
    displayName: entry.displayName || entry.poAgentCard?.name || "external A2A orchestrator",
    sendFhirContextIfExtExists: Boolean(entry.sendFhirContextIfExtExists),
    fhirCtxAuthorizedScopes: Array.isArray(entry.fhirCtxAuthorizedScopes) ? entry.fhirCtxAuthorizedScopes : [],
  };

  if (entry.securityType && entry.securityType !== "Open") {
    payload.securityType = entry.securityType;
  }
  if (entry.timeoutSeconds && entry.timeoutSeconds > 0) {
    payload.timeoutSeconds = entry.timeoutSeconds;
  }
  if (entry.securitySchemeName && entry.securitySchemeName !== "NONE") {
    payload.securitySchemeName = entry.securitySchemeName;
  }
  return payload;
};

const makeRegistrationStatus = ({ kind, name, expectedUrl, beforeEntry, afterEntry, checkResult, updateResult }) => {
  const beforeUrl = kind === "mcp" ? beforeEntry?.endpoint : beforeEntry?.cardEndpoint;
  const afterUrl = kind === "mcp" ? afterEntry?.endpoint : afterEntry?.cardEndpoint;
  const currentUrlVerified = Boolean(expectedUrl) && normalizeUrl(afterUrl) === normalizeUrl(expectedUrl);
  const connectionVerified = checkResult ? checkResult.ok : null;
  let status = "green";
  if (!afterEntry || !currentUrlVerified) {
    status = updateRegistrations ? "red" : "yellow";
  } else if (connectionVerified === false) {
    status = "yellow";
  }

  return {
    kind,
    name,
    id: afterEntry?.id || beforeEntry?.id || null,
    expected_url: expectedUrl || null,
    before_url: beforeUrl || null,
    after_url: afterUrl || null,
    update_requested: updateRegistrations,
    update_result: updateResult
      ? {
          ok: updateResult.ok,
          status: updateResult.status,
          body_shape: shapeOf(updateResult.body),
          body_preview: truncate(redactText(JSON.stringify(updateResult.body)), 1200),
        }
      : null,
    connection_check: checkResult
      ? {
          ok: checkResult.ok,
          status: checkResult.status,
          body_shape: shapeOf(checkResult.body),
          body_preview: truncate(redactText(JSON.stringify(checkResult.body)), 1200),
        }
      : null,
    current_url_verified: currentUrlVerified,
    status,
  };
};

const verifyAndMaybeUpdateRegistrations = async (page, workspaceId) => {
  const mcpPath = `/api/workspaces/${workspaceId}/mcp-servers`;
  const a2aPath = `/api/workspaces/${workspaceId}/a2a-connections/list`;

  const beforeMcp = await apiFetch(page, mcpPath);
  const beforeA2a = await apiFetch(page, a2aPath);
  const beforeMcpEntries = Array.isArray(beforeMcp.body) ? beforeMcp.body : [];
  const beforeA2aEntries = Array.isArray(beforeA2a.body) ? beforeA2a.body : [];
  const updates = [];

  const expectedMcps = [
    {
      name: "Discharge Gatekeeper MCP",
      expectedUrl: publicEndpoints.dischargeGatekeeperMcp,
    },
    {
      name: "Clinical Intelligence MCP",
      expectedUrl: publicEndpoints.clinicalIntelligenceMcp,
    },
  ];

  for (const expected of expectedMcps) {
    const beforeEntry = beforeMcpEntries.find((entry) => entry.name === expected.name);
    if (!beforeEntry || !expected.expectedUrl || normalizeUrl(beforeEntry.endpoint) === normalizeUrl(expected.expectedUrl)) {
      continue;
    }

    if (!updateRegistrations) {
      updates.push({
        kind: "mcp",
        name: expected.name,
        action: "skipped",
        reason: "PROMPT_OPINION_UPDATE_REGISTRATIONS is not enabled",
        before_url: beforeEntry.endpoint,
        expected_url: expected.expectedUrl,
      });
      continue;
    }

    const payload = mcpUpdatePayload(beforeEntry, expected.expectedUrl);
    const updateResult = await apiFetch(page, `${mcpPath}/${beforeEntry.id}`, { method: "POST", body: payload });
    updates.push({
      kind: "mcp",
      name: expected.name,
      action: "updated",
      before_url: beforeEntry.endpoint,
      expected_url: expected.expectedUrl,
      ok: updateResult.ok,
      status: updateResult.status,
    });
  }

  const beforeA2aEntry = beforeA2aEntries.find(
    (entry) =>
      entry.displayName === "external A2A orchestrator" ||
      entry.poAgentCard?.name === "external A2A orchestrator",
  );
  if (
    beforeA2aEntry &&
    publicEndpoints.externalA2a &&
    normalizeUrl(beforeA2aEntry.cardEndpoint) !== normalizeUrl(publicEndpoints.externalA2a)
  ) {
    if (!updateRegistrations) {
      updates.push({
        kind: "a2a",
        name: "external A2A orchestrator",
        action: "skipped",
        reason: "PROMPT_OPINION_UPDATE_REGISTRATIONS is not enabled",
        before_url: beforeA2aEntry.cardEndpoint,
        expected_url: publicEndpoints.externalA2a,
      });
    } else {
      const payload = a2aUpdatePayload(beforeA2aEntry, publicEndpoints.externalA2a);
      const updateResult = await apiFetch(page, `/api/workspaces/${workspaceId}/a2a-connections/${beforeA2aEntry.id}`, {
        method: "POST",
        body: payload,
      });
      updates.push({
        kind: "a2a",
        name: "external A2A orchestrator",
        action: "updated",
        before_url: beforeA2aEntry.cardEndpoint,
        expected_url: publicEndpoints.externalA2a,
        ok: updateResult.ok,
        status: updateResult.status,
      });
    }
  }

  const afterMcp = await apiFetch(page, mcpPath);
  const afterA2a = await apiFetch(page, a2aPath);
  const afterMcpEntries = Array.isArray(afterMcp.body) ? afterMcp.body : [];
  const afterA2aEntries = Array.isArray(afterA2a.body) ? afterA2a.body : [];
  const statuses = [];

  for (const expected of expectedMcps) {
    const beforeEntry = beforeMcpEntries.find((entry) => entry.name === expected.name);
    const afterEntry = afterMcpEntries.find((entry) => entry.name === expected.name);
    let checkResult = null;
    if (afterEntry && expected.expectedUrl && normalizeUrl(afterEntry.endpoint) === normalizeUrl(expected.expectedUrl)) {
      checkResult = await apiFetch(page, `${mcpPath}/test`, {
        method: "POST",
        body: mcpUpdatePayload(afterEntry, expected.expectedUrl),
      });
    }
    const updateResult = null;
    statuses.push(makeRegistrationStatus({ kind: "mcp", ...expected, beforeEntry, afterEntry, checkResult, updateResult }));
  }

  const afterA2aEntry = afterA2aEntries.find(
    (entry) =>
      entry.displayName === "external A2A orchestrator" ||
      entry.poAgentCard?.name === "external A2A orchestrator",
  );
  let a2aCheckResult = null;
  if (
    afterA2aEntry &&
    publicEndpoints.externalA2a &&
    normalizeUrl(afterA2aEntry.cardEndpoint) === normalizeUrl(publicEndpoints.externalA2a)
  ) {
    a2aCheckResult = await apiFetch(
      page,
      `/api/workspaces/${workspaceId}/a2a-connections/external-agent-card?url=${encodeURIComponent(publicEndpoints.externalA2a)}`,
    );
  }
  statuses.push(
    makeRegistrationStatus({
      kind: "a2a",
      name: "external A2A orchestrator",
      expectedUrl: publicEndpoints.externalA2a,
      beforeEntry: beforeA2aEntry,
      afterEntry: afterA2aEntry,
      checkResult: a2aCheckResult,
      updateResult: null,
    }),
  );

  const summary = {
    generated_at: nowIso(),
    update_requested: updateRegistrations,
    before_fetch: {
      mcp_status: beforeMcp.status,
      a2a_status: beforeA2a.status,
    },
    after_fetch: {
      mcp_status: afterMcp.status,
      a2a_status: afterA2a.status,
    },
    updates,
    registrations: statuses,
  };

  const allPresent = statuses.every((status) => status.id);
  const allCurrent = statuses.every((status) => status.current_url_verified);
  const anyRed = statuses.some((status) => status.status === "red");
  recordStep("registration endpoint verification", allPresent && allCurrent && !anyRed ? "green" : anyRed ? "red" : "yellow", {
    update_requested: updateRegistrations,
    updates,
    registrations: statuses.map((status) => ({
      name: status.name,
      status: status.status,
      before_url: status.before_url,
      after_url: status.after_url,
      current_url_verified: status.current_url_verified,
      connection_check_status: status.connection_check?.status || null,
    })),
  });

  registrationSummary = summary;
  await writeJson(path.join(reportsDir, "registration-verification.json"), summary);
  return summary;
};

const selectConsultAgent = async (page, agentName) => {
  const combo = page.locator('[role="combobox"][aria-haspopup="listbox"]').last();
  const selectedAlready = await combo.innerText({ timeout: 3000 }).catch(() => "");
  if (selectedAlready.toLowerCase().includes(agentName.toLowerCase())) {
    const evidence = await capture(page, "a2a-consult-selected.png", "A2A consult selection");
    return {
      verified: true,
      selectedText: selectedAlready,
      evidence,
    };
  }

  const opened =
    (await clickIfVisible(page, combo, 5000)) ||
    (await clickIfVisible(page, page.getByText("None", { exact: true }).last(), 5000)) ||
    (await clickIfVisible(page, page.locator('[data-pc-name="select"]').last(), 5000));
  if (!opened) {
    recordStep("A2A consult selection", "red", {
      agent_name: agentName,
      reason: "consult combobox not found or not clickable",
    });
    return {
      verified: false,
      selectedText: selectedAlready,
      evidence: null,
    };
  }

  await page.waitForTimeout(1000);
  const selected =
    (await clickIfVisible(page, page.getByRole("option", { name: new RegExp(agentName, "i") }).first(), 5000)) ||
    (await clickIfVisible(page, page.getByText(agentName, { exact: false }).last(), 5000));
  await page.waitForTimeout(1000);
  const selectedText = await combo.innerText({ timeout: 3000 }).catch(() => "");
  const verified = selected && selectedText.toLowerCase().includes(agentName.toLowerCase());
  const evidence = await capture(page, "a2a-consult-selected.png", "A2A consult selection");
  recordStep("A2A consult selection", verified ? "green" : "red", {
    agent_name: agentName,
    selected_text: selectedText,
    evidence: [evidence],
  });
  return {
    verified,
    selectedText,
    evidence,
  };
};

const findPromptInput = async (page) => {
  const candidates = [
    page.getByPlaceholder(/enter a prompt/i).first(),
    page.locator("textarea").last(),
    page.locator('[contenteditable="true"]').last(),
    page.locator('input[type="text"]').last(),
  ];

  for (const candidate of candidates) {
    try {
      if ((await candidate.count()) > 0) {
        await candidate.waitFor({ state: "visible", timeout: 3000 });
        return candidate;
      }
    } catch {
      // try the next candidate
    }
  }

  return null;
};

const waitForPromptInputReady = async (page, timeoutMs = 30000) => {
  const deadline = Date.now() + timeoutMs;
  let lastInput = null;

  while (Date.now() < deadline) {
    const input = await findPromptInput(page);
    if (input) {
      lastInput = input;
      const enabled = await input.isEnabled().catch(() => false);
      const editable = await input.isEditable().catch(() => enabled);
      if (enabled && editable) {
        return { input, blocked: false };
      }
    }
    await page.waitForTimeout(1000);
  }

  return { input: lastInput, blocked: true };
};

const isPromptInputReadyNow = async (page) => {
  const input = await findPromptInput(page);
  if (!input) {
    return false;
  }
  const enabled = await input.isEnabled().catch(() => false);
  const editable = await input.isEditable().catch(() => enabled);
  return enabled && editable;
};

const hasRespondingIndicator = (text) => /(^|\n)\s*Po\s*\nResponding\.\.\.|Responding\.\.\./i.test(text);

const visibleErrorPatterns = [
  /something went wrong/i,
  /failed to (?:load|send|generate|respond)/i,
  /unable to (?:load|generate|respond|connect)/i,
  /LLM took too long to respond/i,
  /operation was cancelled/i,
  /request timed out/i,
  /\btimeout\b/i,
  /network error/i,
  /connection lost/i,
  /try again/i,
  /platform error/i,
];

const prompt3SettleErrorPatterns = [
  { label: "The LLM took too long to respond", pattern: /The LLM took too long to respond/i },
  { label: "operation was cancelled", pattern: /operation was cancelled/i },
  { label: "Error", pattern: /(^|\n)\s*Error\s*(\n|$)/i },
  { label: "timeout", pattern: /\btimeout\b/i },
  { label: "cancelled", pattern: /\bcancelled\b/i },
];

const transcriptToolPatterns = [/response/i, /verdict/i, /hidden[_ -]?risk/i, /transition/i, /not[_ -]?ready/i, /\bready\b/i];

const getPromptKey = (prompt) => PROMPT_KEYS[prompt] || null;

const getExpectedRuntimeHit = ({ lane, promptKey, runtimeSummary }) => {
  if (lane === "A2A-main") {
    return runtimeSummary.a2a_request_count > 0 || runtimeSummary.a2a_task_started_count > 0;
  }
  if (promptKey === "prompt1") {
    return runtimeSummary.discharge_gatekeeper_mcp_request_count > 0;
  }
  if (promptKey === "prompt2" || promptKey === "prompt3") {
    return runtimeSummary.clinical_intelligence_mcp_request_count > 0;
  }
  return (
    runtimeSummary.discharge_gatekeeper_mcp_request_count > 0 ||
    runtimeSummary.clinical_intelligence_mcp_request_count > 0
  );
};

const mergeAnchorConfig = (promptKey) => {
  const defaults = defaultSemanticAnchorSets[promptKey] || { required_any: [], forbidden_any: [] };
  const override = overrideSemanticAnchorSets[promptKey] || {};
  return {
    required_any: (override.required_any || defaults.required_any).map((group) => ({
      name: group.name,
      patterns: (group.patterns || []).map(parseRegexSpec),
    })),
    forbidden_any: (override.forbidden_any || defaults.forbidden_any).map(parseRegexSpec),
  };
};

const evaluateSemanticAnchors = (promptKey, assistantText, pageLevelText) => {
  const config = mergeAnchorConfig(promptKey);
  const assistant = normalizeWhitespace(assistantText);
  const combined = normalizeWhitespace(`${assistant}\n${pageLevelText}`);
  const anchorResults = config.required_any.map((group) => {
    const matchedPattern = group.patterns.find((pattern) => pattern.test(assistant) || pattern.test(combined)) || null;
    return {
      name: group.name,
      passed: Boolean(matchedPattern),
      matched_pattern: matchedPattern ? matchedPattern.toString() : null,
    };
  });
  const forbiddenMatches = config.forbidden_any
    .filter((pattern) => assistant && pattern.test(assistant))
    .map((pattern) => pattern.toString());

  return {
    passed: anchorResults.every((result) => result.passed),
    groups: anchorResults,
    forbidden_matches: forbiddenMatches,
    checked_text: assistant || combined,
  };
};

const extractTranscriptSnapshot = async (page) =>
  page.evaluate(() => {
    const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim();
    const isVisible = (element) => {
      if (!element) {
        return false;
      }
      const style = window.getComputedStyle(element);
      if (style.visibility === "hidden" || style.display === "none") {
        return false;
      }
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    const collectTexts = (selectors) => {
      const texts = [];
      const seen = new Set();
      for (const selector of selectors) {
        let nodes = [];
        try {
          nodes = Array.from(document.querySelectorAll(selector));
        } catch {
          continue;
        }
        for (const node of nodes) {
          if (!isVisible(node)) {
            continue;
          }
          const text = normalize(node.innerText || node.textContent || "");
          if (!text || text.length < 8 || seen.has(text)) {
            continue;
          }
          seen.add(text);
          texts.push(text);
        }
      }
      return texts;
    };

    const assistantSelectors = [
      '[data-message-author="assistant"]',
      '[data-message-role="assistant"]',
      '[data-author="assistant"]',
      '[data-testid*="assistant" i]',
      '[class*="assistant" i]',
      '[aria-label*="assistant" i]',
      'article[data-author="assistant"]',
      'section[data-author="assistant"]',
    ];
    const transcriptSelectors = [
      '[data-testid*="message" i]',
      '[class*="message" i]',
      '[role="article"]',
      'article',
      'main section',
      'main div',
    ];

    const assistantCandidates = collectTexts(assistantSelectors);
    const transcriptCandidates = collectTexts(transcriptSelectors);
    return {
      assistantText: assistantCandidates.at(-1) || "",
      assistantCandidates: assistantCandidates.slice(-5),
      transcriptTail: transcriptCandidates.slice(-8),
    };
  });

const collectAttemptState = async ({ page, lane, prompt, promptKey, expectedTool, startOffsets }) => {
  const bodyText = await pageText(page);
  const transcriptSnapshot = await extractTranscriptSnapshot(page).catch(() => ({
    assistantText: "",
    assistantCandidates: [],
    transcriptTail: [],
  }));
  const assistantText = redactText(transcriptSnapshot.assistantText || "");
  const runtimeSummary = summarizeRuntimeDelta(readLogDeltas(startOffsets));
  const inputReady = await isPromptInputReadyNow(page);
  const responding = hasRespondingIndicator(bodyText);
  const semantic = evaluateSemanticAnchors(promptKey, assistantText, bodyText);
  const lower = bodyText.toLowerCase();
  const promptExcerpt = normalizeWhitespace(prompt).toLowerCase().slice(0, 48);
  const assistantMessagePresent =
    assistantText.length >= 24 ||
    transcriptSnapshot.assistantCandidates.some((candidate) => candidate.length >= 24) ||
    semantic.passed;
  const errorSignals = visibleErrorPatterns.filter((pattern) => pattern.test(bodyText)).map((pattern) => pattern.toString());
  if (promptKey === "prompt3") {
    for (const { label, pattern } of prompt3SettleErrorPatterns) {
      if (pattern.test(bodyText)) {
        errorSignals.push(`prompt3-dom:${label}`);
      }
    }
  }
  const expectedRuntimeHit = getExpectedRuntimeHit({ lane, promptKey, runtimeSummary });
  const a2aRuntimeHit = runtimeSummary.a2a_request_count > 0 || runtimeSummary.a2a_task_started_count > 0;
  const directRuntimeHit =
    runtimeSummary.discharge_gatekeeper_mcp_request_count > 0 || runtimeSummary.clinical_intelligence_mcp_request_count > 0;
  const contradictsExpectedNotReady =
    !/not[_ -]?ready/i.test(assistantText) &&
    /(safe to discharge|ready for discharge|routine discharge|verdict[^.\n]{0,20}\bready\b)/i.test(assistantText);

  return {
    bodyText,
    assistantText,
    transcriptSnapshot,
    runtimeSummary,
    inputReady,
    responding,
    semantic,
    expectedRuntimeHit,
    a2aRuntimeHit,
    directRuntimeHit,
    assistantMessagePresent,
    transcriptFlags: {
      user_prompt_persisted: lower.includes(promptExcerpt),
      function_call_persisted: expectedTool ? lower.includes(expectedTool.toLowerCase()) : false,
      tool_response_persisted: transcriptToolPatterns.some((pattern) => pattern.test(lower)),
      assistant_message_present: assistantMessagePresent,
      assistant_transcript_persisted: assistantMessagePresent && !responding,
      expected_text_visible: assistantMessagePresent && !responding,
      assembled_answer_visible:
        assistantMessagePresent &&
        !responding &&
        /not_ready|ready_with_caveats|ready|contradiction|transition|handoff|hidden/i.test(assistantText || bodyText),
      semantic_anchor_passed: semantic.passed,
      forbidden_text_present: semantic.forbidden_matches.length > 0,
      wrong_clinical_recommendation: contradictsExpectedNotReady || semantic.forbidden_matches.length > 0,
    },
    errorSignals,
    settleReady: (inputReady || !responding) && assistantMessagePresent && errorSignals.length === 0,
  };
};

const summarizeSettleTrace = (trace) =>
  trace.map((entry) => ({
    at: entry.at,
    input_ready: entry.input_ready,
    responding: entry.responding,
    assistant_message_present: entry.assistant_message_present,
    semantic_anchor_passed: entry.semantic_anchor_passed,
    expected_runtime_hit: entry.expected_runtime_hit,
    error_signals: entry.error_signals,
    body_text_snapshot: entry.body_text_snapshot,
  }));

const disabledPromptAttempt = async ({ page, lane, attemptId, prompt, expectedTool, observedRoute }) => {
  const evidence = await capture(page, `${attemptId.toLowerCase()}-input-disabled.png`, `${attemptId} prompt input disabled`);
  const attempt = {
    attempt_id: attemptId,
    lane,
    prompt,
    status: "red",
    expected_tool: expectedTool,
    observed_route: observedRoute,
    evidence: [evidence],
    runtime_summary: summarizeRuntimeDelta({}),
    transcript_flags: {
      user_prompt_persisted: false,
      function_call_persisted: false,
      tool_response_persisted: false,
      assistant_message_present: false,
      assistant_transcript_persisted: false,
      expected_text_visible: false,
      semantic_anchor_passed: false,
      forbidden_text_present: false,
      wrong_clinical_recommendation: false,
    },
  };
  attempts.push(attempt);
  return attempt;
};

const startSession = async (page, workspaceId, agentName, lane, screenshotName) => {
  await gotoWorkspaceRoute(page, workspaceId, "launchpad");
  await page.waitForTimeout(2500);
  await capture(page, screenshotName, `${lane} launchpad`);

  const agentCard = page.getByText(agentName, { exact: false }).first();
  const clicked = await clickIfVisible(page, agentCard, 6000);
  if (!clicked) {
    recordStep(`${lane} session start`, "red", {
      agent_name: agentName,
      blocker: "workspace_agent_not_found",
      url: page.url(),
    });
    return false;
  }

  await page.waitForLoadState("domcontentloaded", { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await clickIfVisible(page, page.getByRole("button", { name: /start|new session|continue/i }).first(), 2500);
  await page.waitForTimeout(3000);

  const input = await findPromptInput(page);
  const ready = Boolean(input);
  recordStep(`${lane} session start`, ready ? "green" : "red", {
    agent_name: agentName,
    url: page.url(),
  });
  return ready;
};

const enableToolCalls = async (page) => {
  const text = await pageText(page);
  if (!/show tool calls/i.test(text)) {
    return;
  }

  const switchControl = page.getByRole("switch").first();
  await clickIfVisible(page, switchControl, 2500);
};

const sendPrompt = async ({
  page,
  lane,
  attemptId,
  prompt,
  expectedTokens,
  expectedTool,
  routeLockVariant = null,
  selectedAgent = null,
}) => {
  await enableToolCalls(page);
  const promptKey = getPromptKey(prompt);
  const { input, blocked } = await waitForPromptInputReady(page, 30000);
  if (!input) {
    const evidence = await capture(page, `${attemptId.toLowerCase()}-no-input.png`, `${attemptId} no prompt input`);
    const attempt = {
      attempt_id: attemptId,
      lane,
      prompt,
      status: "red",
      expected_tool: expectedTool,
      observed_route: "prompt input not found",
      evidence: [evidence],
      runtime_summary: summarizeRuntimeDelta({}),
      transcript_flags: {
        user_prompt_persisted: false,
        function_call_persisted: false,
        tool_response_persisted: false,
        assistant_message_present: false,
        assistant_transcript_persisted: false,
        expected_text_visible: false,
        semantic_anchor_passed: false,
        forbidden_text_present: false,
        wrong_clinical_recommendation: false,
      },
    };
    attempts.push(attempt);
    return attempt;
  }
  if (blocked) {
    return disabledPromptAttempt({
      page,
      lane,
      attemptId,
      prompt,
      expectedTool,
      observedRoute: "prompt input disabled before send; prior turn likely still streaming or transcript persistence is blocked",
    });
  }

  const startOffsets = statLogOffsets();
  const beforeNetworkCount = networkEvents.length;
  const startedAt = nowIso();
  await input.fill(prompt);
  await input.press("Enter");
  await page.waitForTimeout(2500);

  const deadline = Date.now() + promptTimeoutMs;
  const settleTrace = [];
  let settleStartedAt = null;
  let finalState = null;
  let timedOut = false;
  let settleReason = "timeout";
  const transientErrorSignals = new Set();
  const transientPrompt3ErrorSignals = new Set();
  const effectiveSettlePollMs = promptKey === "prompt3" ? Math.min(settlePollMs, 1000) : settlePollMs;
  while (Date.now() < deadline) {
    finalState = await collectAttemptState({ page, lane, prompt, promptKey, expectedTool, startOffsets });
    for (const signal of finalState.errorSignals) {
      transientErrorSignals.add(signal);
      if (/prompt3-dom:|LLM took too long|operation was cancelled|timeout|cancelled/i.test(signal)) {
        transientPrompt3ErrorSignals.add(signal);
      }
    }
    const expectedTokensMatched = expectedTokens.some((token) =>
      finalState.bodyText.toLowerCase().includes(token.toLowerCase()) || finalState.assistantText.toLowerCase().includes(token.toLowerCase()),
    );
    const bodyTextSnapshot = promptKey === "prompt3" || finalState.errorSignals.length > 0
      ? truncate(redactText(finalState.bodyText), 4000)
      : undefined;
    settleTrace.push({
      at: nowIso(),
      input_ready: finalState.inputReady,
      responding: finalState.responding,
      assistant_message_present: finalState.transcriptFlags.assistant_message_present,
      semantic_anchor_passed: finalState.transcriptFlags.semantic_anchor_passed,
      expected_runtime_hit: finalState.expectedRuntimeHit,
      error_signals: finalState.errorSignals,
      expected_tokens_matched: expectedTokensMatched,
      body_text_snapshot: bodyTextSnapshot,
    });
    if (promptKey !== "prompt3" && settleTrace.length > 16) {
      settleTrace.shift();
    }

    const settlePassed =
      finalState.settleReady &&
      finalState.transcriptFlags.assistant_transcript_persisted &&
      finalState.transcriptFlags.semantic_anchor_passed &&
      !finalState.transcriptFlags.wrong_clinical_recommendation;
    if (settlePassed && settleStartedAt === null) {
      settleStartedAt = Date.now();
    } else if (!settlePassed) {
      settleStartedAt = null;
    }

    if (settleStartedAt !== null && Date.now() - settleStartedAt >= finalSettleDelayMs && finalState.expectedRuntimeHit) {
      settleReason = "settled_with_runtime";
      break;
    }
    if (settleStartedAt !== null && Date.now() - settleStartedAt >= postSettleRuntimeGraceMs) {
      settleReason = finalState.expectedRuntimeHit ? "settled_runtime_grace_elapsed" : "settled_transcript_runtime_missing";
      break;
    }
    if (finalState.errorSignals.length > 0 && !finalState.directRuntimeHit && !finalState.a2aRuntimeHit) {
      settleReason = "visible_error_before_runtime";
      break;
    }
    await page.waitForTimeout(effectiveSettlePollMs);
  }
  if (!finalState) {
    finalState = await collectAttemptState({ page, lane, prompt, promptKey, expectedTool, startOffsets });
  } else {
    timedOut = settleReason === "timeout";
  }

  await page.waitForTimeout(finalSettleDelayMs);
  finalState = await collectAttemptState({ page, lane, prompt, promptKey, expectedTool, startOffsets });
  const evidence = await capture(page, `${attemptId.toLowerCase()}-result.png`, `${attemptId} result`);
  const runtimeDelta = readLogDeltas(startOffsets);
  const runtimeSummary = summarizeRuntimeDelta(runtimeDelta);
  const relevantNetwork = networkEvents.slice(beforeNetworkCount);
  finalState.runtimeSummary = runtimeSummary;
  finalState.expectedRuntimeHit = getExpectedRuntimeHit({ lane, promptKey, runtimeSummary });
  finalState.a2aRuntimeHit = runtimeSummary.a2a_request_count > 0 || runtimeSummary.a2a_task_started_count > 0;
  finalState.directRuntimeHit =
    runtimeSummary.discharge_gatekeeper_mcp_request_count > 0 || runtimeSummary.clinical_intelligence_mcp_request_count > 0;
  const transcriptFlags = finalState.transcriptFlags;

  const a2aRuntimeHit = finalState.a2aRuntimeHit;
  const directRuntimeHit = finalState.directRuntimeHit;
  const promptStreamRequests = relevantNetwork.filter((event) => event.event === "request" && /prompt-stream|chat|conversation/i.test(event.url));
  const networkErrorSignals = relevantNetwork
    .filter((event) => event.event === "response")
    .flatMap((event) => {
      const preview = String(event.body?.preview || "");
      const matches = [...preview.matchAll(/"messageType"\s*:\s*"Error"[^{}]*"errorMessage"\s*:\s*"([^"]+)"/g)];
      return matches.map((match) => `network:${match[1]}`);
    });
  const allErrorSignals = [
    ...new Set([
      ...finalState.errorSignals,
      ...transientErrorSignals,
      ...networkErrorSignals,
    ]),
  ];
  const visibleTimeoutOrErrorBanner = allErrorSignals.some((signal) =>
    /llm took too long|operation was cancelled|request timed out|timeout|cancelled|something went wrong|platform error/i.test(signal),
  );
  const prompt3TimeoutOrErrorObserved = promptKey === "prompt3" && (
    transientPrompt3ErrorSignals.size > 0 ||
    allErrorSignals.some((signal) => /prompt3-dom:|llm took too long|operation was cancelled|timeout|cancelled/i.test(signal))
  );

  let observedRoute = "no visible runtime route";
  if (lane === "A2A-main" && a2aRuntimeHit) {
    observedRoute = "Prompt Opinion -> external A2A runtime";
  } else if (lane === "Direct-MCP fallback" && runtimeSummary.both_mcps_hit) {
    observedRoute = "Prompt Opinion -> both MCPs";
  } else if (lane === "Direct-MCP fallback" && directRuntimeHit) {
    observedRoute = "Prompt Opinion -> one MCP";
  } else if (promptStreamRequests.length > 0) {
    observedRoute = "Prompt Opinion prompt-stream without observed external runtime hit";
  }

  let status = "red";
  const finalTranscriptVisible =
    transcriptFlags.assistant_transcript_persisted && transcriptFlags.assistant_message_present && !finalState.responding;
  const wrongClinicalRecommendation = transcriptFlags.wrong_clinical_recommendation;
  if (wrongClinicalRecommendation || allErrorSignals.length > 0 || prompt3TimeoutOrErrorObserved) {
    status = "red";
  } else if (lane === "A2A-main") {
    const selectedAgentVerified = Boolean(selectedAgent?.verified);
    const a2aAccepted = runtimeSummary.a2a_2xx_response_count > 0;
    if (
      selectedAgentVerified &&
      finalTranscriptVisible &&
      transcriptFlags.assembled_answer_visible &&
      transcriptFlags.semantic_anchor_passed &&
      !wrongClinicalRecommendation &&
      a2aRuntimeHit &&
      a2aAccepted &&
      runtimeSummary.both_mcps_hit
    ) {
      status = "green";
    } else if (selectedAgentVerified && (finalTranscriptVisible || a2aRuntimeHit || promptStreamRequests.length > 0)) {
      status = "yellow";
    }
  } else if (
    finalTranscriptVisible &&
    transcriptFlags.semantic_anchor_passed &&
    !wrongClinicalRecommendation &&
    finalState.expectedRuntimeHit
  ) {
    status = "green";
  } else if (!directRuntimeHit && !finalTranscriptVisible && !promptStreamRequests.length) {
    status = "red";
  } else if (finalTranscriptVisible || directRuntimeHit || transcriptFlags.function_call_persisted) {
    status = "yellow";
  }

  const attempt = {
    attempt_id: attemptId,
    lane,
    prompt,
    route_lock_variant: routeLockVariant,
    expected_tool: expectedTool,
    started_at: startedAt,
    finished_at: nowIso(),
    status,
    observed_route: observedRoute,
    conversation_url: page.url(),
    selected_agent_verified: selectedAgent?.verified ?? null,
    selected_agent_text: selectedAgent?.selectedText ?? null,
    runtime_summary: runtimeSummary,
    transcript_flags: transcriptFlags,
    semantic_anchors: finalState.semantic,
    assistant_text_preview: truncate(finalState.assistantText, 1200),
    error_signals: allErrorSignals,
    visible_timeout_or_error_banner: visibleTimeoutOrErrorBanner,
    prompt3_timeout_or_error_observed: prompt3TimeoutOrErrorObserved,
    settle: {
      reason: settleReason,
      timed_out: timedOut || settleReason === "timeout",
      final_settle_delay_ms: finalSettleDelayMs,
      post_settle_runtime_grace_ms: postSettleRuntimeGraceMs,
      effective_poll_ms: effectiveSettlePollMs,
      expected_runtime_hit: finalState.expectedRuntimeHit,
      final_transcript_visible: finalTranscriptVisible,
      trace: summarizeSettleTrace(settleTrace),
    },
    prompt_stream_request_count: promptStreamRequests.length,
    evidence: [selectedAgent?.evidence, evidence].filter(Boolean),
  };
  attempts.push(attempt);
  return attempt;
};

const getResponseStatus = (requestEvent) => {
  const response = networkEvents.find((event) => event.event === "response" && event.id === requestEvent.id);
  return response?.status || null;
};

const summarizeNetwork = () => {
  const requests = networkEvents.filter((event) => event.event === "request");
  const promptOpinionRequests = requests.filter((event) => /promptopinion/i.test(event.host));
  const runtimeBrowserRequests = requests.filter((event) => runtimeHosts.includes(event.host));
  const interestingRequests = requests.filter((event) =>
    /prompt-stream|conversation|message|agent|a2a|mcp|external|tool|connection/i.test(event.url),
  );

  return {
    generated_at: nowIso(),
    total_events: networkEvents.length,
    prompt_opinion_request_count: promptOpinionRequests.length,
    runtime_browser_request_count: runtimeBrowserRequests.length,
    runtime_hosts: runtimeHosts,
    prompt_opinion_calls: interestingRequests
      .filter((event) => /promptopinion/i.test(event.host))
      .map((event) => ({
        id: event.id,
        method: event.method,
        url: event.url,
        status: getResponseStatus(event),
        resource_type: event.resource_type,
        post_data: event.post_data,
      })),
    runtime_browser_calls: runtimeBrowserRequests.map((event) => ({
      id: event.id,
      method: event.method,
      url: event.url,
      status: getResponseStatus(event),
      post_data: event.post_data,
    })),
    websocket_count: networkEvents.filter((event) => event.event === "websocket").length,
  };
};

const classifyBlocker = (laneStatus, laneAttempts) => {
  if (laneStatus === "green") {
    return "none";
  }

  if (laneAttempts.length === 0) {
    return "workspace_ui_unreachable";
  }

  if (laneAttempts.some((attempt) => attempt.lane === "A2A-main")) {
    const anyA2aHit = laneAttempts.some(
      (attempt) => attempt.runtime_summary.a2a_request_count > 0 || attempt.runtime_summary.a2a_task_started_count > 0,
    );
    if (!anyA2aHit) {
      return "chat_path_not_routed";
    }
    const anyTranscript = laneAttempts.some((attempt) => attempt.transcript_flags.assistant_transcript_persisted);
    if (!anyTranscript) {
      return "runtime_hit_but_no_transcript";
    }
    return "runtime_hit_but_downstream_failure";
  }

  const anyMcpHit = laneAttempts.some(
    (attempt) =>
      attempt.runtime_summary.discharge_gatekeeper_mcp_request_count > 0 ||
      attempt.runtime_summary.clinical_intelligence_mcp_request_count > 0,
  );
  const anyExpectedText = laneAttempts.some((attempt) => attempt.transcript_flags.assistant_transcript_persisted);
  if (!anyMcpHit) {
    return "chat_path_not_routed";
  }
  if (anyMcpHit && !anyExpectedText) {
    return "runtime_hit_but_no_transcript";
  }
  return "runtime_hit_but_downstream_failure";
};

const laneStatus = (lane) => {
  const laneAttempts = attempts.filter((attempt) => attempt.lane === lane);
  if (laneAttempts.length === 0) {
    return "red";
  }
  if (laneAttempts.every((attempt) => attempt.status === "green")) {
    return "green";
  }
  if (laneAttempts.some((attempt) => attempt.status === "red")) {
    return "red";
  }
  if (laneAttempts.some((attempt) => attempt.status === "yellow")) {
    return "yellow";
  }
  return "red";
};

const mdStatus = (status) => `\`${status}\``;

const bestA2AVariant = () => {
  const a2aAttempts = attempts.filter((attempt) => attempt.lane === "A2A-main");
  if (a2aAttempts.length === 0) {
    return null;
  }

  const score = (attempt) => {
    let total = 0;
    if (attempt.status === "green") total += 100;
    else if (attempt.status === "yellow") total += 50;
    if (attempt.selected_agent_verified) total += 20;
    if (attempt.runtime_summary.a2a_request_count > 0) total += 10;
    if (attempt.runtime_summary.a2a_2xx_response_count > 0) total += 10;
    if (attempt.runtime_summary.both_mcps_hit) total += 10;
    if (attempt.transcript_flags.assembled_answer_visible) total += 10;
    return total;
  };

  return [...a2aAttempts].sort((left, right) => score(right) - score(left))[0];
};

const buildA2ARouteLockMatrix = ({ a2aStatus, a2aBlocker }) => {
  const variantAttempts = A2A_ROUTE_LOCK_VARIANTS.map((variant) => {
    const attempt = attempts.find((candidate) => candidate.attempt_id === variant.attemptId) || null;
    return {
      variant_id: variant.id,
      variant_name: variant.name,
      prompt: variant.prompt,
      status: attempt?.status || "not_run",
      selected_agent_verified: attempt?.selected_agent_verified ?? false,
      selected_agent_text: attempt?.selected_agent_text || null,
      observed_route: attempt?.observed_route || "not run",
      prompt_stream_request_count: attempt?.prompt_stream_request_count || 0,
      transcript_visible: attempt?.transcript_flags?.assembled_answer_visible || false,
      a2a_request_ids: attempt?.runtime_summary?.a2a_request_ids || [],
      a2a_task_ids: attempt?.runtime_summary?.a2a_task_ids || [],
      a2a_message_ids: (attempt?.runtime_summary?.a2a_task_ids || []).map((taskId) => `${taskId}-status-message`),
      response_status_codes: attempt?.runtime_summary?.a2a_status_codes || [],
      response_paths: attempt?.runtime_summary?.a2a_response_paths || [],
      both_mcps_hit: attempt?.runtime_summary?.both_mcps_hit || false,
      evidence: attempt?.evidence || [],
    };
  });

  return {
    generated_at: nowIso(),
    lane: "A2A-main",
    status: a2aStatus,
    blocker: a2aBlocker,
    variants: variantAttempts,
    skipped_variants: A2A_ROUTE_LOCK_SKIPPED_VARIANTS,
    best_variant: bestA2AVariant()
      ? {
          attempt_id: bestA2AVariant().attempt_id,
          route_lock_variant: bestA2AVariant().route_lock_variant,
          status: bestA2AVariant().status,
          observed_route: bestA2AVariant().observed_route,
        }
      : null,
  };
};

const renderExperimentMatrix = ({ a2aStatus, fallbackStatus, a2aBlocker, fallbackBlocker }) => {
  const rows = attempts.map((attempt) => {
    const expectedRoute =
      attempt.lane === "A2A-main"
        ? "`Prompt Opinion -> external A2A orchestrator -> both MCPs`"
        : `\`${attempt.expected_tool || "direct MCP tool"}\``;
    const requestIds = [
      ...attempt.runtime_summary.a2a_request_ids,
      ...attempt.runtime_summary.a2a_task_ids,
      ...attempt.runtime_summary.discharge_gatekeeper_request_ids,
      ...attempt.runtime_summary.clinical_intelligence_request_ids,
    ].join(", ") || "none";
    const evidence = attempt.evidence.map((item) => `\`${item.screenshot}\``).join(", ");
    const surface =
      attempt.lane === "A2A-main"
        ? `Browser proof harness (${attempt.route_lock_variant?.id || "route-lock"})`
        : "Browser proof harness";
    return `| ${attempt.attempt_id} | \`${attempt.started_at}\` | \`${attempt.lane}\` | ${surface} | \`${attempt.prompt}\` | ${expectedRoute} | ${attempt.observed_route} | \`${attempt.conversation_url}\` | ${requestIds} | \`${attempt.status}\` | ${evidence}; settle=\`${attempt.settle?.reason || "n/a"}\`; anchors=${attempt.transcript_flags.semantic_anchor_passed ? "pass" : "fail"}; timeout/error banner=${attempt.visible_timeout_or_error_banner ? "yes" : "no"} |`;
  });

  return [
    "# Prompt Opinion Experiment Matrix",
    "",
    `Generated by \`prompt-opinion-browser-proof.mjs\` at \`${nowIso()}\`.`,
    "",
    "## Attempt matrix",
    "| Attempt ID | Date (UTC) | Lane | Surface or agent | Prompt | Expected route | Observed route | Conversation ID | Request/task IDs | Result (`green`/`yellow`/`red`) | Evidence |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...rows,
    "",
    "## Blocker isolation attempts",
    "| Attempt ID | Why this isolation run exists | Narrowest blocker under test | Outcome | Evidence |",
    "| --- | --- | --- | --- | --- |",
    `| ISO-A2A | Determine whether Prompt Opinion chat reaches the external runtime and accepts one assembled turn | ${a2aBlocker} | A2A-main lane is ${a2aStatus} | \`reports/a2a-route-lock-matrix.json\`, \`reports/a2a-runtime-correlation-summary.json\` |`,
    `| ISO-FALLBACK | Determine whether dual-tool BYO hits both MCPs and persists visible output | ${fallbackBlocker} | Direct-MCP fallback lane is ${fallbackStatus} | \`reports/browser-network-summary.json\`, \`reports/runtime-log-delta.json\` |`,
    "",
    "## Lane decision summary",
    "| Lane | Status (`green`/`yellow`/`red`) | Why |",
    "| --- | --- | --- |",
    `| \`A2A-main\` | \`${a2aStatus}\` | ${a2aBlocker === "none" ? "one route-lock variant proved selected agent, runtime acceptance, both MCP hits, and visible assembled answer" : `blocker classified as \`${a2aBlocker}\``} |`,
    `| \`Direct-MCP fallback\` | \`${fallbackStatus}\` | ${fallbackBlocker === "none" ? "all three fallback prompt attempts completed visibly" : `blocker classified as \`${fallbackBlocker}\``} |`,
    "",
  ].join("\n");
};

const renderRequestCorrelation = ({ a2aStatus, fallbackStatus, a2aBlocker, fallbackBlocker }) => {
  const a2aRows = attempts
    .filter((attempt) => attempt.lane === "A2A-main")
    .map((attempt) => {
      const runtime = attempt.runtime_summary;
      const notes = [
        `variant=${attempt.route_lock_variant?.id || "n/a"}`,
        `selected_agent=${attempt.selected_agent_verified ? "yes" : "no"}`,
        `2xx=${runtime.a2a_2xx_response_count > 0 ? "yes" : "no"}`,
        `prompt-stream requests=${attempt.prompt_stream_request_count}`,
      ].join("; ");
      return `| ${attempt.attempt_id} | \`${attempt.prompt}\` | \`${attempt.conversation_url}\` | ${attempt.observed_route} | ${runtime.a2a_request_ids.join(", ") || "none"} | ${runtime.a2a_task_ids.join(", ") || "none"} | ${runtime.both_mcps_hit ? "both MCPs hit" : "not proven"} | \`${attempt.status}\` | ${notes} |`;
    });
  const fallbackRows = attempts
    .filter((attempt) => attempt.lane === "Direct-MCP fallback")
    .map((attempt) => {
      const flags = attempt.transcript_flags;
      return `| ${attempt.attempt_id} | \`${attempt.prompt}\` | \`${attempt.conversation_url}\` | \`${attempt.expected_tool}\` | ${flags.function_call_persisted ? "yes" : "no"} | ${flags.tool_response_persisted ? "yes" : "no"} | ${flags.assistant_transcript_persisted ? "yes" : "no"} | \`${attempt.status}\` | settle=${attempt.settle?.reason || "n/a"}; anchors=${flags.semantic_anchor_passed ? "pass" : "fail"}; timeout/error banner=${attempt.visible_timeout_or_error_banner ? "yes" : "no"}; route=${attempt.observed_route} |`;
    });

  return [
    "# Prompt Opinion Request-ID Correlation",
    "",
    `Generated by \`prompt-opinion-browser-proof.mjs\` at \`${nowIso()}\`.`,
    "",
    "## Workspace A2A correlation",
    "| Attempt ID | Prompt | Prompt Opinion conversation ID | Browser or host request clue | A2A `request_id` | A2A `task_id` | Downstream header evidence | Result | Notes |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...(a2aRows.length ? a2aRows : ["| none |  |  |  |  |  |  | `red` | no A2A attempts completed |"]),
    "",
    "## Direct-MCP fallback correlation",
    "| Attempt ID | Prompt | Conversation ID | Tool path | Function call persisted | Tool response persisted | Final assistant transcript persisted | Result | Notes |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...(fallbackRows.length
      ? fallbackRows
      : ["| none |  |  |  | no | no | no | `red` | no fallback attempts completed |"]),
    "",
    "## Blocker classification",
    `- Current A2A blocker: \`${a2aBlocker}\``,
    `- Current fallback blocker: \`${fallbackBlocker}\``,
    `- A2A-main status: \`${a2aStatus}\``,
    `- Direct-MCP fallback status: \`${fallbackStatus}\``,
    `- Exact evidence files: \`reports/a2a-route-lock-matrix.json\`, \`reports/a2a-runtime-correlation-summary.json\`, \`reports/a2a-downstream-mcp-hit-summary.json\`, \`screenshots/\``,
    "",
    "Known blocker labels:",
    ...BLOCKER_LABELS.map((label) => `- \`${label}\``),
    "",
  ].join("\n");
};

const renderWorkspaceEvidence = ({ a2aStatus, fallbackStatus, a2aBlocker, fallbackBlocker, workspaceId }) => {
  const attemptRows = attempts.map((attempt) => {
    const runtimeIds = [
      ...attempt.runtime_summary.a2a_task_ids,
      ...attempt.runtime_summary.discharge_gatekeeper_request_ids,
      ...attempt.runtime_summary.clinical_intelligence_request_ids,
    ].join(", ") || "none";
    const surface =
      attempt.lane === "A2A-main"
        ? `Browser proof harness (${attempt.route_lock_variant?.id || "route-lock"})`
        : "Browser proof harness";
    return `| ${attempt.attempt_id} | \`${attempt.lane}\` | ${surface} | \`${attempt.prompt}\` | \`${attempt.expected_tool || "external A2A orchestrator -> both MCPs"}\` | \`${attempt.conversation_url}\` | ${runtimeIds} | \`${attempt.status}\` | ${attempt.observed_route}; settle=\`${attempt.settle?.reason || "n/a"}\`; anchors=${attempt.transcript_flags.semantic_anchor_passed ? "pass" : "fail"}; timeout/error banner=${attempt.visible_timeout_or_error_banner ? "yes" : "no"} |`;
  });
  const registrationRows = (registrationSummary?.registrations || []).map(
    (registration) =>
      `| \`${registration.name}\` | ${registration.id ? "yes" : "no"} | ${registration.current_url_verified ? "yes" : "no"} | \`${registration.status}\` | before: \`${registration.before_url || "missing"}\`; after: \`${registration.after_url || "missing"}\`; check: \`${registration.connection_check?.status || "not-run"}\` |`,
  );

  return [
    "# Prompt Opinion Workspace Evidence",
    "",
    "## Workspace metadata",
    "- Org: captured from authenticated browser if visible in screenshots",
    `- Session date (UTC): \`${nowIso()}\``,
    `- Browser: Playwright Chromium, headless=${headless}`,
    `- Prompt Opinion environment URL: \`${browserBaseUrl}\``,
    `- Workspace ID: \`${workspaceId || "not discovered"}\``,
    "",
    "## Active public endpoints",
    `- \`Discharge Gatekeeper MCP\`: \`${publicEndpoints.dischargeGatekeeperMcp || "not provided"}\``,
    `- \`Clinical Intelligence MCP\`: \`${publicEndpoints.clinicalIntelligenceMcp || "not provided"}\``,
    `- \`external A2A orchestrator\`: \`${publicEndpoints.externalA2a || "not provided"}\``,
    "",
    "## Registration status",
    "| Surface | Existing entry reused | Current URL verified | Connection or discovery result | Notes |",
    "| --- | --- | --- | --- | --- |",
    ...(registrationRows.length
      ? registrationRows
      : [
          "| `Discharge Gatekeeper MCP` | see screenshot | see screenshot/text | browser-captured | `03-po-mcp-servers-registered.png` |",
          "| `Clinical Intelligence MCP` | see screenshot | see screenshot/text | browser-captured | `03-po-mcp-servers-registered.png` |",
          "| `external A2A orchestrator` | see screenshot | see screenshot/text | browser-captured | `04-po-a2a-connection-status.png` |",
        ]),
    `- Registration update mode: \`${updateRegistrations ? "enabled" : "disabled"}\``,
    "- Exact registration API evidence: `reports/registration-verification.json`",
    "",
    "## Screenshot checklist",
    "| Screenshot | Captured | File |",
    "| --- | --- | --- |",
    "| Login page | yes | `screenshots/01-po-login-page.png` |",
    "| Workspace launchpad | yes | `screenshots/02-po-workspace-launchpad.png` |",
    "| MCP registrations | yes | `screenshots/03-po-mcp-servers-registered.png` |",
    "| A2A connection status | yes | `screenshots/04-po-a2a-connection-status.png` |",
    "| BYO agent config | yes | `screenshots/05-po-byo-agent-config.png` |",
    "| Selected external A2A agent | yes | `screenshots/a2a-consult-selected.png` |",
    "| A2A route-lock variants | see attempt screenshots | `screenshots/a2a-v*-result.png` |",
    "| Prompt 1 result | see attempt screenshots | `screenshots/*p1*result.png` |",
    "| Prompt 2 result or stall | see attempt screenshots | `screenshots/*p2*result.png` |",
    "| Prompt 3 result or stall | see attempt screenshots | `screenshots/*p3*result.png` |",
    "",
    "## Prompt-by-prompt evidence",
    "| Attempt ID | Lane | Surface or agent | Prompt | Expected tool path | Conversation ID | Request or task IDs | Result (`green`/`yellow`/`red`) | Notes |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...attemptRows,
    "",
    "## A2A path evidence",
    `- A2A prompt execution result: \`${a2aStatus}\``,
    `- Blocker classification if not proven: \`${a2aBlocker}\``,
    "- Route-lock matrix: `reports/a2a-route-lock-matrix.json`",
    "- External runtime logs: `reports/runtime-log-delta.json`",
    "- Matching request/task evidence: `reports/a2a-runtime-correlation-summary.json`, `notes/request-id-correlation.md`",
    "- Downstream MCP hit summary: `reports/a2a-downstream-mcp-hit-summary.json`",
    "",
    "## Dual-tool BYO path evidence",
    ...attempts
      .filter((attempt) => attempt.lane === "Direct-MCP fallback")
      .flatMap((attempt) => [
        `- ${attempt.attempt_id} function call persisted: ${attempt.transcript_flags.function_call_persisted ? "yes" : "no"}`,
        `- ${attempt.attempt_id} tool response persisted: ${attempt.transcript_flags.tool_response_persisted ? "yes" : "no"}`,
        `- ${attempt.attempt_id} assistant transcript persisted: ${attempt.transcript_flags.assistant_transcript_persisted ? "yes" : "no"}`,
        `- ${attempt.attempt_id} semantic anchors passed: ${attempt.transcript_flags.semantic_anchor_passed ? "yes" : "no"}`,
        `- ${attempt.attempt_id} settle reason: ${attempt.settle?.reason || "n/a"}`,
        `- ${attempt.attempt_id} timeout/error banner visible: ${attempt.visible_timeout_or_error_banner ? "yes" : "no"}`,
      ]),
    "",
    "## Final lane statuses",
    `- A2A-main lane (\`green\`/\`yellow\`/\`red\`): \`${a2aStatus}\``,
    `- Direct-MCP fallback lane (\`green\`/\`yellow\`/\`red\`): \`${fallbackStatus}\``,
    `- Preferred live lane from this run folder: ${a2aStatus === "green" && fallbackStatus === "green" ? "`A2A-main`" : fallbackStatus === "green" ? "`Direct-MCP fallback`" : "none"}`,
    "",
  ].join("\n");
};

const renderValidationNotes = ({ a2aStatus, fallbackStatus, a2aBlocker, fallbackBlocker }) => {
  const commandResults = readJsonIfExists(path.join(reportsDir, "command-results.json"));
  const commandRows = (commandResults?.checks || []).map(
    (check) =>
      `| ${check.label} | \`${check.command}\` | \`${normalizeStatus(check.status)}\` | \`${check.durationMs}\` | \`${check.logFile}\` |`,
  );
  const phase9Call =
    a2aStatus === "green" && fallbackStatus === "green"
      ? "GO for Phase 9: A2A-main can be primary because both required lanes are green."
      : fallbackStatus === "green"
        ? "CONDITIONAL GO for Phase 9: use Direct-MCP fallback as the live lane and document A2A-main as downgraded."
        : "NO-GO for Phase 9: neither required live lane is green from current authenticated workspace evidence.";

  return [
    "# Prompt Opinion Validation Notes",
    "",
    "## Operator",
    "- Operator: Codex browser-proof harness",
    "- Prompt Opinion org: see authenticated workspace screenshots",
    `- Browser session window: \`${nowIso()}\``,
    "",
    "## Automated check status board",
    "| Check | Command | Status (`green`/`yellow`/`red`) | Duration (ms) | Evidence log |",
    "| --- | --- | --- | --- | --- |",
    ...(commandRows.length ? commandRows : ["| Browser-only run | `po-community-mcp-main/scripts/run-prompt-opinion-browser-proof.sh` | `yellow` |  | `reports/browser-proof-summary.json` |"]),
    "",
    "## Lane status board",
    "| Lane | Status (`green`/`yellow`/`red`) | Evidence |",
    "| --- | --- | --- |",
    `| Local automated rehearsal lane | \`${commandResults?.totals?.red === 0 ? "green" : "red"}\` | \`reports/status-summary.md\`, \`reports/request-id-correlation.md\` |`,
    `| Prompt Opinion A2A-main workspace lane | \`${a2aStatus}\` | \`reports/a2a-route-lock-matrix.json\`, \`reports/a2a-runtime-correlation-summary.json\` |`,
    `| Prompt Opinion Direct-MCP fallback workspace lane | \`${fallbackStatus}\` | \`notes/workspace-evidence.md\`, \`screenshots/\` |`,
    `| Current blocker-isolation conclusion | \`${a2aStatus === "green" && fallbackStatus === "green" ? "green" : "red"}\` | A2A: \`${a2aBlocker}\`; fallback: \`${fallbackBlocker}\` |`,
    "",
    "## Request-id conclusion",
    `- A2A one-turn assembled proof green: ${a2aStatus === "green" ? "yes" : "no"}`,
    `- A2A runtime hit proven: ${a2aBlocker === "none" ? "yes" : "no"}`,
    `- If not proven, narrowest blocker: \`${a2aBlocker}\``,
    `- Direct-MCP fallback blocker: \`${fallbackBlocker}\``,
    "",
    "## Phase 9 go/no-go call",
    `- ${phase9Call}`,
    "",
    "## Open risks",
    "1. Prompt Opinion platform behavior can still change independently of repo-side validation.",
    "2. Browser automation depends on valid operator credentials and a reachable Prompt Opinion workspace.",
    "3. Public tunnel hostnames must match current Prompt Opinion registration URLs or the browser pass will correctly downgrade the lane.",
    "",
  ].join("\n");
};

const renderStatusSummary = ({ a2aStatus, fallbackStatus, a2aBlocker, fallbackBlocker }) => {
  const commandResults = readJsonIfExists(path.join(reportsDir, "command-results.json"));
  const checkRows = (commandResults?.checks || []).map(
    (check) => `| ${check.label} | ${check.status.toUpperCase()} | ${check.durationMs} | \`${check.logFile}\` |`,
  );
  const registrationRows = (registrationSummary?.registrations || []).map(
    (registration) =>
      `| ${registration.name} | ${registration.status.toUpperCase()} | ${registration.current_url_verified ? "yes" : "no"} | \`${registration.after_url || "missing"}\` |`,
  );
  const localStatus = commandResults?.totals?.red === 0 ? "GREEN" : "RED";
  const phase9Call =
    a2aStatus === "green" && fallbackStatus === "green"
      ? "GO"
      : fallbackStatus === "green"
        ? "CONDITIONAL GO"
        : "NO-GO";

  return [
    "# Prompt Opinion Rehearsal Status",
    "",
    `Run ID: \`${runId}\``,
    "",
    "## Run metadata",
    "| Field | Value |",
    "| --- | --- |",
    `| Branch | \`${runMetadata.branch || "unknown"}\` |`,
    `| Commit | \`${runMetadata.commit || "unknown"}\` |`,
    `| Run folder | \`output/prompt-opinion-e2e/runs/${runId}\` |`,
    "",
    "## Provider Evidence",
    "| Field | Value |",
    "| --- | --- |",
    `| Hidden-risk provider | \`${providerEvidence.provider}\` |`,
    `| Hidden-risk model | \`${providerEvidence.model}\` |`,
    `| Google/Gemini key present | ${providerEvidence.google_api_key_present || providerEvidence.gemini_api_key_present ? "yes" : "no"} |`,
    `| Google-backed proof eligible | ${providerEvidence.google_proof_eligible ? "yes" : "no"} |`,
    "",
    "## Local automated checks",
    "| Check | Status | Duration (ms) | Log |",
    "| --- | --- | --- | --- |",
    ...(checkRows.length ? checkRows : ["| Browser proof only | YELLOW |  | `reports/browser-proof-summary.json` |"]),
    "",
    "## Lane status board",
    "| Lane | Status | Reason |",
    "| --- | --- | --- |",
    `| Local automated rehearsal lane | ${localStatus} | ${localStatus === "GREEN" ? "All automated local checks passed in this run folder." : "One or more automated local checks failed."} |`,
    `| Prompt Opinion A2A-main workspace lane | ${a2aStatus.toUpperCase()} | ${a2aBlocker === "none" ? "Authenticated browser proof observed selected external A2A, 2xx runtime acceptance, both MCP hits, and visible assembled answer." : `Blocker: ${a2aBlocker}.`} |`,
    `| Prompt Opinion Direct-MCP fallback workspace lane | ${fallbackStatus.toUpperCase()} | ${fallbackBlocker === "none" ? "Authenticated browser proof observed visible fallback output for all prompts." : `Blocker: ${fallbackBlocker}.`} |`,
    "",
    "## Registration Endpoint Check",
    "| Surface | Status | Current URL verified | Active URL |",
    "| --- | --- | --- | --- |",
    ...(registrationRows.length ? registrationRows : ["| Not captured | YELLOW | no | `reports/registration-verification.json` missing |"]),
    "",
    "## Browser/network evidence",
    "| Artifact | Purpose |",
    "| --- | --- |",
    "| `reports/direct-mcp-status.json` | Direct-MCP lane status, blocker, and per-prompt settle results |",
    "| `reports/a2a-route-lock-matrix.json` | one-turn A2A experiment matrix with best variant and skipped Variant E rationale |",
    "| `reports/a2a-runtime-correlation-summary.json` | request/task/message correlation summary for A2A route-lock attempts |",
    "| `reports/a2a-downstream-mcp-hit-summary.json` | downstream MCP hit summary for each A2A route-lock variant |",
    "| `reports/a2a-one-turn-status.json` | final A2A one-turn assembled proof status board |",
    "| `reports/browser-network-events.json` | sanitized browser request/response event log |",
    "| `reports/browser-network-summary.json` | endpoint and request-shape summary |",
    "| `reports/runtime-log-delta.json` | A2A/MCP runtime log deltas captured during browser attempts |",
    "| `screenshots/` | authenticated workspace screenshots and prompt attempts |",
    "",
    "## Phase 9 call",
    `| Call | ${phase9Call} |`,
    "| --- | --- |",
    `| Basis | A2A-main=${a2aStatus}; Direct-MCP fallback=${fallbackStatus}; A2A blocker=${a2aBlocker}; fallback blocker=${fallbackBlocker} |`,
    "",
  ].join("\n");
};

const writeEvidenceNotes = async ({ workspaceId }) => {
  const a2aStatus = laneStatus("A2A-main");
  const fallbackStatus = laneStatus("Direct-MCP fallback");
  const a2aBlocker = classifyBlocker(a2aStatus, attempts.filter((attempt) => attempt.lane === "A2A-main"));
  const fallbackBlocker = classifyBlocker(
    fallbackStatus,
    attempts.filter((attempt) => attempt.lane === "Direct-MCP fallback"),
  );

  const networkSummary = summarizeNetwork();
  const runtimeDelta = Object.fromEntries(
    attempts.map((attempt) => [attempt.attempt_id, attempt.runtime_summary]),
  );
  const a2aRouteLockMatrix = buildA2ARouteLockMatrix({ a2aStatus, a2aBlocker });
  const a2aRuntimeCorrelationSummary = attempts
    .filter((attempt) => attempt.lane === "A2A-main")
    .map((attempt) => ({
      attempt_id: attempt.attempt_id,
      variant_id: attempt.route_lock_variant?.id || null,
      prompt: attempt.prompt,
      selected_agent_verified: attempt.selected_agent_verified,
      selected_agent_text: attempt.selected_agent_text,
      conversation_url: attempt.conversation_url,
      prompt_stream_request_count: attempt.prompt_stream_request_count,
      request_ids: attempt.runtime_summary.a2a_request_ids,
      task_ids: attempt.runtime_summary.a2a_task_ids,
      message_ids: attempt.runtime_summary.a2a_task_ids.map((taskId) => `${taskId}-status-message`),
      correlation_ids: attempt.runtime_summary.a2a_correlation_ids,
      response_paths: attempt.runtime_summary.a2a_response_paths,
      response_status_codes: attempt.runtime_summary.a2a_status_codes,
      both_mcps_hit: attempt.runtime_summary.both_mcps_hit,
      assembled_answer_visible: attempt.transcript_flags.assembled_answer_visible,
      status: attempt.status,
    }));
  const a2aDownstreamMcpHitSummary = attempts
    .filter((attempt) => attempt.lane === "A2A-main")
    .map((attempt) => ({
      attempt_id: attempt.attempt_id,
      variant_id: attempt.route_lock_variant?.id || null,
      discharge_gatekeeper_mcp_request_count: attempt.runtime_summary.discharge_gatekeeper_mcp_request_count,
      clinical_intelligence_mcp_request_count: attempt.runtime_summary.clinical_intelligence_mcp_request_count,
      both_mcps_hit: attempt.runtime_summary.both_mcps_hit,
      discharge_gatekeeper_request_ids: attempt.runtime_summary.discharge_gatekeeper_request_ids,
      clinical_intelligence_request_ids: attempt.runtime_summary.clinical_intelligence_request_ids,
      status: attempt.status,
    }));
  const bestVariant = bestA2AVariant();
  const a2aOneTurnStatus = {
    generated_at: nowIso(),
    lane: "A2A-main",
    status: a2aStatus,
    blocker: a2aBlocker,
    best_variant: bestVariant
      ? {
          attempt_id: bestVariant.attempt_id,
          variant_id: bestVariant.route_lock_variant?.id || null,
          variant_name: bestVariant.route_lock_variant?.name || null,
          status: bestVariant.status,
        }
      : null,
    green_criteria: {
      selected_agent_verified: Boolean(bestVariant?.selected_agent_verified),
      browser_network_request_observed: Boolean(bestVariant?.prompt_stream_request_count),
      runtime_post_observed: Boolean(bestVariant?.runtime_summary?.a2a_request_count),
      runtime_2xx_observed: Boolean(bestVariant?.runtime_summary?.a2a_2xx_response_count),
      request_task_message_correlation_observed:
        Boolean(bestVariant?.runtime_summary?.a2a_request_ids?.length) &&
        Boolean(bestVariant?.runtime_summary?.a2a_task_ids?.length) &&
        Boolean(bestVariant?.runtime_summary?.a2a_task_ids?.map((taskId) => `${taskId}-status-message`).length),
      both_mcps_hit: Boolean(bestVariant?.runtime_summary?.both_mcps_hit),
      assembled_answer_visible: Boolean(bestVariant?.transcript_flags?.assembled_answer_visible),
    },
  };
  const browserProofSummary = {
    generated_at: nowIso(),
    run_id: runId,
    base_url: browserBaseUrl,
    provider_evidence: providerEvidence,
    public_endpoints: publicEndpoints,
    registrations: registrationSummary,
    steps,
    attempts,
    lane_statuses: {
      a2a_main: a2aStatus,
      direct_mcp_fallback: fallbackStatus,
    },
    blockers: {
      a2a_main: a2aBlocker,
      direct_mcp_fallback: fallbackBlocker,
    },
  };

  await writeJson(path.join(reportsDir, "a2a-route-lock-matrix.json"), a2aRouteLockMatrix);
  await writeJson(path.join(reportsDir, "a2a-runtime-correlation-summary.json"), a2aRuntimeCorrelationSummary);
  await writeJson(path.join(reportsDir, "a2a-downstream-mcp-hit-summary.json"), a2aDownstreamMcpHitSummary);
  await writeJson(path.join(reportsDir, "a2a-one-turn-status.json"), a2aOneTurnStatus);
  await writeJson(path.join(reportsDir, "browser-network-events.json"), networkEvents);
  await writeJson(path.join(reportsDir, "browser-network-summary.json"), networkSummary);
  await writeJson(path.join(reportsDir, "provider-evidence.json"), providerEvidence);
  await writeJson(path.join(reportsDir, "runtime-log-delta.json"), runtimeDelta);
  await writeJson(path.join(reportsDir, "browser-proof-summary.json"), browserProofSummary);
  await writeJson(path.join(reportsDir, "direct-mcp-status.json"), {
    generated_at: nowIso(),
    lane: "Direct-MCP fallback",
    status: fallbackStatus,
    blocker: fallbackBlocker,
    attempts: attempts.filter((attempt) => attempt.lane === "Direct-MCP fallback"),
  });
  await writeJson(path.join(reportsDir, "a2a-status.json"), {
    generated_at: nowIso(),
    lane: "A2A-main",
    status: a2aStatus,
    blocker: a2aBlocker,
    attempts: attempts.filter((attempt) => attempt.lane === "A2A-main"),
  });

  await fsp.writeFile(
    path.join(notesDir, "experiment-matrix.md"),
    renderExperimentMatrix({ a2aStatus, fallbackStatus, a2aBlocker, fallbackBlocker }),
    "utf8",
  );
  await fsp.writeFile(
    path.join(notesDir, "request-id-correlation.md"),
    renderRequestCorrelation({ a2aStatus, fallbackStatus, a2aBlocker, fallbackBlocker }),
    "utf8",
  );
  await fsp.writeFile(
    path.join(notesDir, "workspace-evidence.md"),
    renderWorkspaceEvidence({ a2aStatus, fallbackStatus, a2aBlocker, fallbackBlocker, workspaceId }),
    "utf8",
  );
  await fsp.writeFile(
    path.join(notesDir, "validation-notes.md"),
    renderValidationNotes({ a2aStatus, fallbackStatus, a2aBlocker, fallbackBlocker }),
    "utf8",
  );
  await fsp.writeFile(
    path.join(reportsDir, "status-summary.md"),
    renderStatusSummary({ a2aStatus, fallbackStatus, a2aBlocker, fallbackBlocker }),
    "utf8",
  );
  await fsp.copyFile(
    path.join(reportsDir, "status-summary.md"),
    path.join(REPO_ROOT, "output/prompt-opinion-e2e/status-summary-latest.md"),
  ).catch(() => {});

  return browserProofSummary;
};

const attachNetworkCapture = (context) => {
  context.on("request", async (request) => {
    const id = `req-${++networkSeq}`;
    requestIds.set(request, id);
    let headers = {};
    try {
      headers = redactHeaders(await request.allHeaders());
    } catch {
      headers = {};
    }
    networkEvents.push({
      id,
      event: "request",
      at: nowIso(),
      method: request.method(),
      url: redactText(request.url()),
      host: getHost(request.url()),
      resource_type: request.resourceType(),
      headers,
      post_data: describeBody(request.postData()),
    });
  });

  context.on("response", async (response) => {
    const request = response.request();
    const id = requestIds.get(request) || `req-${++networkSeq}`;
    const headers = redactHeaders(response.headers());
    let body = null;
    const contentType = headers["content-type"] || "";
    if (/json|text|event-stream/i.test(contentType) && /promptopinion|a2a|mcp|conversation|prompt-stream/i.test(response.url())) {
      try {
        body = describeBody(await response.text());
      } catch {
        body = { kind: "unavailable" };
      }
    }
    networkEvents.push({
      id,
      event: "response",
      at: nowIso(),
      method: request.method(),
      url: redactText(response.url()),
      host: getHost(response.url()),
      status: response.status(),
      headers,
      body,
    });
  });

  context.on("requestfailed", (request) => {
    const id = requestIds.get(request) || `req-${++networkSeq}`;
    networkEvents.push({
      id,
      event: "requestfailed",
      at: nowIso(),
      method: request.method(),
      url: redactText(request.url()),
      host: getHost(request.url()),
      failure: request.failure()?.errorText || "unknown",
    });
  });
};

const main = async () => {
  await ensureDir(runScreenshotsDir);
  await ensureDir(reportsDir);
  await ensureDir(notesDir);
  await ensureDir(outputPlaywrightDir);
  await ensureDir(runtimeProfileDir);

  const context = await chromium.launchPersistentContext(runtimeProfileDir, {
    headless,
    slowMo: browserSlowMoMs,
    viewport: { width: 1440, height: 980 },
  });
  attachNetworkCapture(context);

  const page = context.pages()[0] || (await context.newPage());
  page.on("websocket", (ws) => {
    networkEvents.push({
      id: `ws-${++networkSeq}`,
      event: "websocket",
      at: nowIso(),
      url: redactText(ws.url()),
      host: getHost(ws.url()),
    });
  });

  let workspaceId = null;
  try {
    const authed = await ensureLoggedIn(page);
    if (!authed) {
      await writeEvidenceNotes({ workspaceId });
      process.exitCode = 1;
      return;
    }

    workspaceId = await discoverWorkspaceId(page);
    if (!workspaceId) {
      recordStep("workspace discovery", "red", { url: page.url() });
      await writeEvidenceNotes({ workspaceId });
      process.exitCode = 1;
      return;
    }
    recordStep("workspace discovery", "green", { workspace_id: workspaceId });

    await verifyAndMaybeUpdateRegistrations(page, workspaceId);

    await verifyWorkspaceSurface(page, workspaceId, "mcp-servers", "03-po-mcp-servers-registered.png", "MCP registration verification", [
      "MCP Servers",
      "Discharge Gatekeeper MCP",
      "Clinical Intelligence MCP",
    ]);
    await verifyWorkspaceSurface(page, workspaceId, "a2a-connections", "04-po-a2a-connection-status.png", "external A2A connection verification", [
      "External",
      "A2A",
    ]);
    await verifyWorkspaceSurface(page, workspaceId, "byo-agents", "05-po-byo-agent-config.png", "BYO agent verification", [
      "BYO",
      "Care Transitions Command",
    ]);

    const runA2aLane = laneEnabled("a2a-main");
    const runDirectLane = laneEnabled("direct-mcp fallback") || laneEnabled("direct-mcp") || laneEnabled("direct_mcp_fallback");

    const a2aReady = runA2aLane
      ? await startSession(page, workspaceId, "General Chat Agent", "A2A-main", "a2a-launchpad.png")
      : false;
    if (a2aReady) {
      const selectedAgent = await selectConsultAgent(page, "external A2A orchestrator");
      for (const variant of A2A_ROUTE_LOCK_VARIANTS) {
        await sendPrompt({
          page,
          lane: "A2A-main",
          attemptId: variant.attemptId,
          prompt: variant.prompt,
          expectedTokens: variant.expectedTokens,
          expectedTool: null,
          routeLockVariant: variant,
          selectedAgent,
        });
      }
    }

    const fallbackReady = runDirectLane
      ? await startSession(
          page,
          workspaceId,
          "Care Transitions Command BYO Fallback",
          "Direct-MCP fallback",
          "fallback-launchpad.png",
        )
      : false;
    if (fallbackReady) {
      if (directPromptEnabled("prompt1")) {
        await sendPrompt({
          page,
          lane: "Direct-MCP fallback",
          attemptId: "FALLBACK-P1-01",
          prompt: PROMPTS.prompt1,
          expectedTokens: [
            "assess_discharge_readiness",
            "structured baseline",
            "result=hidden_risk_present",
            "not_ready",
          ],
          expectedTool: "assess_discharge_readiness",
        });
      }
      if (directPromptEnabled("prompt2")) {
        await sendPrompt({
          page,
          lane: "Direct-MCP fallback",
          attemptId: "FALLBACK-P2-01",
          prompt: PROMPTS.prompt2,
          expectedTokens: ["surface_hidden_risks", "contradiction", "Nursing Note", "hidden_risk_present"],
          expectedTool: "surface_hidden_risks",
        });
      }
      if (directPromptEnabled("prompt3")) {
        await sendPrompt({
          page,
          lane: "Direct-MCP fallback",
          attemptId: "FALLBACK-P3-01",
          prompt: PROMPTS.prompt3,
          expectedTokens: ["synthesize_transition_narrative", "transition", "Before discharge", "handoff"],
          expectedTool: "synthesize_transition_narrative",
        });
      }
    }

    const summary = await writeEvidenceNotes({ workspaceId });
    const failedLanes = summary.lane_statuses.a2a_main === "red" && summary.lane_statuses.direct_mcp_fallback === "red";
    process.exitCode = failedLanes ? 1 : 0;
  } catch (error) {
    recordStep("browser proof fatal error", "red", {
      error: error instanceof Error ? error.message : String(error),
    });
    await writeEvidenceNotes({ workspaceId }).catch(() => {});
    process.exitCode = 1;
  } finally {
    await context.close();
  }
};

void main();
