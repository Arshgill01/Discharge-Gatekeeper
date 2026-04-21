#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

OUTPUT_ROOT="${PROMPT_OPINION_E2E_OUTPUT_ROOT:-${REPO_ROOT}/output/prompt-opinion-e2e}"
RUN_ID="${PROMPT_OPINION_E2E_RUN_ID:-$(date -u +"%Y%m%dT%H%M%SZ")}"
SKIP_NPM_CI="${PROMPT_OPINION_SKIP_NPM_CI:-0}"
RUN_DIR="${OUTPUT_ROOT}/runs/${RUN_ID}"
LOG_DIR="${RUN_DIR}/logs"
REPORTS_DIR="${RUN_DIR}/reports"
NOTES_DIR="${RUN_DIR}/notes"
SCREENSHOTS_DIR="${RUN_DIR}/screenshots"
RESULTS_FILE="${REPORTS_DIR}/command-results.tsv"

mkdir -p "${LOG_DIR}" "${REPORTS_DIR}" "${NOTES_DIR}" "${SCREENSHOTS_DIR}"
: > "${RESULTS_FILE}"

BRANCH_NAME="$(git -C "${REPO_ROOT}" branch --show-current 2>/dev/null || echo unknown)"
COMMIT_SHA="$(git -C "${REPO_ROOT}" rev-parse HEAD 2>/dev/null || echo unknown)"

cat > "${REPORTS_DIR}/run-metadata.json" <<EOF
{
  "run_id": "${RUN_ID}",
  "generated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "branch": "${BRANCH_NAME}",
  "commit": "${COMMIT_SHA}"
}
EOF

cat > "${SCREENSHOTS_DIR}/README.md" <<'EOF'
# Prompt Opinion screenshot slot

Store manual Prompt Opinion screenshots for this run in this folder.
Use this filename order:
- `01-po-login-page.png`
- `02-po-workspace-launchpad.png`
- `03-po-mcp-servers-registered.png`
- `04-po-a2a-connection-status.png`
- `05-po-byo-agent-config.png`
- `06-po-prompt1-result.png`
- `07-po-prompt2-result-or-stall.png`
- `08-po-prompt3-result-or-stall.png`
EOF

if [[ -f "${REPO_ROOT}/docs/templates/prompt-opinion-validation-notes-template.md" ]]; then
  cp "${REPO_ROOT}/docs/templates/prompt-opinion-validation-notes-template.md" "${NOTES_DIR}/validation-notes.md"
fi

if [[ -f "${REPO_ROOT}/docs/templates/prompt-opinion-workspace-evidence-template.md" ]]; then
  cp "${REPO_ROOT}/docs/templates/prompt-opinion-workspace-evidence-template.md" "${NOTES_DIR}/workspace-evidence.md"
fi

overall_rc=0

cleanup() {
  "${SCRIPT_DIR}/stop-a2a-local.sh" >/dev/null 2>&1 || true
  "${SCRIPT_DIR}/stop-two-mcp-local.sh" >/dev/null 2>&1 || true
}

trap cleanup EXIT

run_cmd() {
  local label="$1"
  local slug="$2"
  local command="$3"
  local log_file="${LOG_DIR}/${slug}.log"
  local start_ms end_ms duration_ms status

  start_ms="$(node -p 'Date.now()')"
  if (cd "${REPO_ROOT}" && bash -lc "${command}") >"${log_file}" 2>&1; then
    status="green"
  else
    status="red"
    overall_rc=1
  fi
  end_ms="$(node -p 'Date.now()')"
  duration_ms="$((end_ms - start_ms))"

  printf "%s|%s|%s|%s|%s\n" \
    "${label}" \
    "${command}" \
    "${status}" \
    "${duration_ms}" \
    "${log_file}" >> "${RESULTS_FILE}"

  echo "[po-rehearsal] ${label}: ${status} (${duration_ms}ms)"
}

echo "[po-rehearsal] run_id=${RUN_ID}"
echo "[po-rehearsal] branch=${BRANCH_NAME} commit=${COMMIT_SHA}"

if [[ "${SKIP_NPM_CI}" != "1" ]]; then
  run_cmd \
    "Install dependencies (Discharge Gatekeeper MCP)" \
    "00-npm-ci-typescript" \
    "npm --prefix po-community-mcp-main/typescript ci"

  run_cmd \
    "Install dependencies (Clinical Intelligence MCP)" \
    "00-npm-ci-clinical-intelligence" \
    "npm --prefix po-community-mcp-main/clinical-intelligence-typescript ci"

  run_cmd \
    "Install dependencies (external A2A orchestrator)" \
    "00-npm-ci-external-a2a" \
    "npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript ci"
fi

run_cmd \
  "Full system validation" \
  "01-run-full-system-validation" \
  "./po-community-mcp-main/scripts/run-full-system-validation.sh"

run_cmd \
  "Boot two MCP runtimes" \
  "02-start-two-mcp-local" \
  "./po-community-mcp-main/scripts/start-two-mcp-local.sh"

run_cmd \
  "Boot external A2A runtime" \
  "03-start-a2a-local" \
  "./po-community-mcp-main/scripts/start-a2a-local.sh"

run_cmd \
  "Two-MCP readiness check" \
  "04-check-two-mcp-readiness" \
  "./po-community-mcp-main/scripts/check-two-mcp-readiness.sh"

run_cmd \
  "A2A readiness check" \
  "05-check-a2a-readiness" \
  "./po-community-mcp-main/scripts/check-a2a-readiness.sh"

cleanup

run_cmd \
  "Prompt Opinion rehearsal smoke" \
  "06-smoke-prompt-opinion-rehearsal" \
  "PROMPT_OPINION_E2E_OUTPUT_DIR='${OUTPUT_ROOT}' PROMPT_OPINION_E2E_RUN_ID='${RUN_ID}' npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:prompt-opinion-rehearsal"

node - "${RESULTS_FILE}" "${REPORTS_DIR}" "${RUN_ID}" <<'NODE'
const fs = require("node:fs");
const path = require("node:path");

const [resultsFile, reportsDir, runId] = process.argv.slice(2);
const lines = fs
  .readFileSync(resultsFile, "utf8")
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

const rows = lines.map((line) => {
  const [label, command, status, durationMs, logFile] = line.split("|");
  return { label, command, status, durationMs: Number(durationMs), logFile };
});

const greenCount = rows.filter((row) => row.status === "green").length;
const redCount = rows.filter((row) => row.status === "red").length;

const summary = {
  run_id: runId,
  generated_at: new Date().toISOString(),
  checks: rows,
  totals: {
    green: greenCount,
    red: redCount,
  },
  manual_status_defaults: [
    {
      gate: "Prompt Opinion A2A chat execution",
      status: "yellow",
      reason: "Manual workspace execution proof is required outside local smoke.",
    },
    {
      gate: "Dual-tool BYO Prompt 2/3 transcript persistence",
      status: "yellow",
      reason: "Manual workspace transcript evidence is required outside local smoke.",
    },
  ],
};

fs.writeFileSync(path.join(reportsDir, "command-results.json"), JSON.stringify(summary, null, 2));

const md = [
  "# Prompt Opinion Rehearsal Status",
  "",
  `Run ID: \`${runId}\``,
  "",
  "## Local automated checks",
  "| Check | Status | Duration (ms) | Log |",
  "| --- | --- | --- | --- |",
  ...rows.map(
    (row) =>
      `| ${row.label} | ${row.status.toUpperCase()} | ${row.durationMs} | \`${row.logFile}\` |`,
  ),
  "",
  "## Manual workspace checks (default until manually updated)",
  "| Check | Status | Evidence location |",
  "| --- | --- | --- |",
  "| Prompt Opinion A2A chat execution | YELLOW | `screenshots/` + `notes/workspace-evidence.md` |",
  "| Dual-tool BYO Prompt 2/3 transcript persistence | YELLOW | `screenshots/` + `notes/workspace-evidence.md` |",
  "",
  "Update this file to GREEN/YELLOW/RED after manual Prompt Opinion rehearsal.",
  "",
].join("\n");

fs.writeFileSync(path.join(reportsDir, "status-summary.md"), `${md}\n`);
NODE

ln -sfn "runs/${RUN_ID}" "${OUTPUT_ROOT}/latest"
cp "${REPORTS_DIR}/command-results.json" "${OUTPUT_ROOT}/command-results-latest.json"
cp "${REPORTS_DIR}/status-summary.md" "${OUTPUT_ROOT}/status-summary-latest.md"

if [[ "${overall_rc}" -ne 0 ]]; then
  echo "[po-rehearsal] FAIL: one or more automated checks are red"
  echo "[po-rehearsal] evidence bundle: ${RUN_DIR}"
  exit 1
fi

echo "[po-rehearsal] PASS: all automated checks are green"
echo "[po-rehearsal] evidence bundle: ${RUN_DIR}"
