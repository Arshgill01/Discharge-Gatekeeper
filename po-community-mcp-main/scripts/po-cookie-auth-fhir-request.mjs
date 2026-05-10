#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(__filename);
const PO_ROOT = path.resolve(SCRIPT_DIR, "..");

const workspaceFhirUrl = process.env.PO_WORKSPACE_FHIR_URL?.trim();
const operationsJson = process.env.PO_FHIR_OPERATIONS_JSON?.trim();
const email = process.env.PROMPT_OPINION_EMAIL?.trim();
const password = process.env.PROMPT_OPINION_PASSWORD?.trim();
const runtimeProfileDir =
  process.env.PROMPT_OPINION_BROWSER_PROFILE_DIR?.trim() ||
  path.join(PO_ROOT, ".runtime", "prompt-opinion-browser-profile");

if (!workspaceFhirUrl) {
  throw new Error("PO_WORKSPACE_FHIR_URL is required.");
}
if (!operationsJson) {
  throw new Error("PO_FHIR_OPERATIONS_JSON is required.");
}
if (!email || !password) {
  throw new Error("PROMPT_OPINION_EMAIL and PROMPT_OPINION_PASSWORD are required.");
}

const operations = JSON.parse(operationsJson);
if (!Array.isArray(operations) || operations.length === 0) {
  throw new Error("PO_FHIR_OPERATIONS_JSON must be a non-empty array.");
}

const workspaceMatch = workspaceFhirUrl.match(/\/workspaces\/([^/]+)\/fhir/i);
const launchpadUrl = workspaceMatch
  ? `https://app.promptopinion.ai/workspaces/${workspaceMatch[1]}/launchpad`
  : "https://app.promptopinion.ai/";

const ensureLoggedIn = async (page) => {
  await page.goto(launchpadUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);
  if (!page.url().includes("/login") && !(await page.locator('input[type="password"]').count())) {
    return;
  }

  const emailInput = page
    .locator('input[type="email"], input[name*="email" i], input[placeholder*="email" i]')
    .first();
  await emailInput.fill(email, { timeout: 20000 });
  const continueButton = page.getByRole("button", { name: /continue|next|submit/i }).first();
  if (await continueButton.count()) {
    await continueButton.click({ timeout: 5000 }).catch(() => {});
  } else {
    await emailInput.press("Enter");
  }
  await page.waitForTimeout(1500);

  const passwordInput = page.locator('input[type="password"], input[name*="password" i]').first();
  await passwordInput.fill(password, { timeout: 30000 });
  const submitButton = page
    .getByRole("button", { name: /log in|login|sign in|continue|submit/i })
    .first();
  if (await submitButton.count()) {
    await submitButton.click({ timeout: 5000 }).catch(() => {});
  } else {
    await passwordInput.press("Enter");
  }
  await page.waitForLoadState("domcontentloaded", { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(5000);
};

const context = await chromium.launchPersistentContext(runtimeProfileDir, {
  headless: true,
  viewport: { width: 1440, height: 980 },
});

try {
  const page = context.pages()[0] || (await context.newPage());
  await ensureLoggedIn(page);

  const results = [];
  for (const operation of operations) {
    const result = await page.evaluate(async (op) => {
      const response = await fetch(op.url, {
        method: op.method,
        credentials: "include",
        headers: {
          accept: "application/fhir+json, application/json, */*",
          ...(op.body ? { "content-type": "application/fhir+json" } : {}),
        },
        ...(op.body ? { body: JSON.stringify(op.body) } : {}),
      });
      return {
        method: op.method,
        url: op.url,
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
        text: await response.text(),
      };
    }, operation);
    results.push(result);
  }

  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
} finally {
  await context.close();
}
