# Discharge Gatekeeper Prompt Opinion Operator Runbook

This is the canonical operator flow for the TypeScript runtime.  
Goal: a teammate can go from zero setup to a working Prompt Opinion invocation of `assess_discharge_readiness` with no hidden assumptions.

## 1) Canonical runtime files

- MCP server entrypoint: `po-community-mcp-main/typescript/index.ts`
- Runtime env/config: `po-community-mcp-main/typescript/runtime-config.ts`
- Tool registration: `po-community-mcp-main/typescript/tools/index.ts`
- Shared workflow core: `po-community-mcp-main/typescript/discharge-readiness/workflow-core.ts`
- Env template: `po-community-mcp-main/typescript/.env.example`

## 2) Prerequisites

- Node.js 20+ and npm
- Prompt Opinion workspace access with MCP server connection permissions
- Tunnel tool for local-to-public bridge (ngrok assumed below)
- Optional: `jq` for JSON formatting in local checks

## 3) Local setup and boot

From repo root:

```bash
cd po-community-mcp-main/typescript
npm install
cp .env.example .env
```

Edit `.env`, then start:

```bash
npm run start
```

Expected local endpoints:
- MCP: `http://localhost:5055/mcp`
- Health: `http://localhost:5055/healthz`
- Readiness: `http://localhost:5055/readyz`

## 4) Environment variable reference

Configure these in `po-community-mcp-main/typescript/.env`:

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `PO_ENV` | No | `local` | Must be one of `local`, `dev`, `prod`. Invalid values fail startup with a clear error. |
| `HOST` | No | `0.0.0.0` | Bind address for local server. |
| `PORT` | No | `5055` | Must be `1..65535`. |
| `MCP_SERVER_NAME` | No | `Discharge Gatekeeper MCP` | Display name shown to MCP clients. |
| `MCP_SERVER_VERSION` | No | `1.0.0` | Metadata version shown to MCP clients. |
| `ALLOWED_HOSTS` | Yes for tunnel/hosted use | `localhost,127.0.0.1` | Comma-separated inbound host allowlist. Include your current public host. Hostnames and full URLs are accepted and normalized to hostnames. |

Example `.env` for local + ngrok:

```dotenv
PO_ENV=local
HOST=0.0.0.0
PORT=5055
MCP_SERVER_NAME=Discharge Gatekeeper MCP
MCP_SERVER_VERSION=1.0.0
ALLOWED_HOSTS=localhost,127.0.0.1,https://9f4d-203-0-113-10.ngrok-free.app
```

After changing `.env`, restart `npm run start`.

## 5) Local health checks (must pass before tunneling)

In a second terminal:

```bash
curl -sS http://localhost:5055/healthz | jq
curl -sS http://localhost:5055/readyz | jq
```

Pass criteria:
- `status` is `ok`
- `tools` includes all workflow-suite tools:
  - `assess_discharge_readiness`
  - `extract_discharge_blockers`
  - `generate_transition_plan`
  - `build_clinician_handoff_brief`
  - `draft_patient_discharge_instructions`
- `allowed_hosts` includes your expected hosts

## 6) Public endpoint via ngrok

Start tunnel in a second terminal:

```bash
ngrok http 5055
```

Take the HTTPS forwarding URL, for example:
- `https://9f4d-203-0-113-10.ngrok-free.app`

Your Prompt Opinion MCP endpoint is:
- `https://9f4d-203-0-113-10.ngrok-free.app/mcp`

If ngrok URL changed:
1. update host in `ALLOWED_HOSTS`
2. restart `npm run start`
3. reconnect in Prompt Opinion (section 7)

Public health check:

```bash
curl -sS https://9f4d-203-0-113-10.ngrok-free.app/healthz | jq
```

## 7) Connect in Prompt Opinion

In workspace settings (`MCP Servers` or `Tools`, label varies by UI version):

1. Add server name: `Discharge Gatekeeper MCP (tunnel)`
2. Set URL to tunnel endpoint ending in `/mcp`
3. Save and run connection test
4. Confirm discovered tool list includes:
   - `assess_discharge_readiness`
   - `extract_discharge_blockers`
   - `generate_transition_plan`
   - `build_clinician_handoff_brief`
   - `draft_patient_discharge_instructions`

## 8) Launchpad smoke flow

Use a fresh Prompt Opinion session:

1. `Is this patient safe to discharge today?`
2. `What exactly is blocking discharge right now?`
3. `What must happen before this patient leaves?`

Optional deterministic tool call prompt:
- `Call assess_discharge_readiness with scenario_id=first_synthetic_discharge_slice_v1 and return the JSON payload.`

Expected response shape:
- `verdict` (`not_ready` for the primary scenario)
- `blockers`
- `evidence`
- `next_steps`
- `summary`

## 9) Local pre-demo validation commands

Run from `po-community-mcp-main/typescript`:

```bash
npm run typecheck
npm run smoke:runtime
npm run smoke:readiness
npm run smoke:readiness:regression
npm run smoke:workflow-suite-core
npm run smoke:artifacts
npm run smoke:demo-path
```

Expected:
- typecheck exits `0`
- runtime smoke prints `SMOKE PASS: runtime boot and tool registration`
- smoke prints `SMOKE PASS: assess_discharge_readiness v1`
- regression smoke prints `REGRESSION PASS: assess_discharge_readiness matrix`
- workflow-core smoke prints `SMOKE PASS: workflow suite core`
- artifact smoke prints `SMOKE PASS: workflow artifacts suite`
- demo smoke prints `SMOKE PASS: demo path (expanded workflow)`

## 10) Troubleshooting

### Tool does not appear in Prompt Opinion

Symptoms:
- connection succeeds but tool list is empty or unexpected

Checks:
1. `curl -sS http://localhost:5055/healthz | jq` and confirm `tools` contains:
   - `assess_discharge_readiness`
   - `extract_discharge_blockers`
   - `generate_transition_plan`
   - `build_clinician_handoff_brief`
   - `draft_patient_discharge_instructions`
2. ensure Prompt Opinion endpoint URL ends with `/mcp`
3. remove and re-add server connection in Prompt Opinion

Likely fixes:
- wrong endpoint path
- stale connection config cached in workspace

### Endpoint is reachable but unusable

Symptoms:
- `/healthz` works but connection test or tool calls fail

Checks:
1. verify tunnel/public host exists in `ALLOWED_HOSTS`
2. check server logs for `MCP request failed` entries and forwarded host metadata
3. ensure server was restarted after `.env` edits

Likely fixes:
- host allowlist mismatch
- outdated tunnel URL
- endpoint configured without `/mcp`

### Patient-context issues

Symptoms:
- context-dependent tooling reports missing context or malformed readiness input

Current first-slice behavior:
- `assess_discharge_readiness` is scenario-backed for demo reliability and does not require live FHIR calls in the happy path.

Prompt Opinion context headers expected by runtime utilities:
- `x-fhir-server-url`
- `x-fhir-access-token`
- `x-patient-id` (fallback if token claims do not include `patient`)

Likely fixes:
- ensure Prompt Opinion patient data access is enabled for the workspace
- verify token/header forwarding in integration environment
- keep demo flow on supported scenario IDs if running offline

### Missing env or auth assumptions

Symptoms:
- startup fails immediately
- connection fails across environments but local smoke passes

Checks:
1. validate `.env` keys and values
2. confirm `PO_ENV` is one of `local|dev|prod`
3. confirm `PORT` is valid and not in use
4. confirm auth/context assumptions for non-synthetic tooling

Likely fixes:
- correct invalid env values
- free occupied port or change `PORT`
- re-establish Prompt Opinion patient-context permissions

### Tunnel URL changed mid-session

Symptoms:
- previously working connection fails suddenly

Recovery steps:
1. check local server still healthy on `http://localhost:5055/healthz`
2. restart tunnel and copy new public URL
3. update `ALLOWED_HOSTS` with new host and restart server
4. update Prompt Opinion MCP server URL
5. rerun connection test and one Launchpad prompt

## 11) Operator pass/fail checklist

This runbook supports repeatable verification of:

1. `npm run typecheck` passes
2. `npm run smoke:runtime` passes
3. `npm run smoke:readiness` passes
4. `npm run smoke:readiness:regression` passes
5. `npm run smoke:workflow-suite-core` passes
6. `npm run smoke:artifacts` passes
7. `npm run smoke:demo-path` passes
8. `/healthz` is reachable through the public URL
9. server boots locally and is reachable via public endpoint/tunnel
10. Prompt Opinion connection test succeeds and all five workflow tools are discovered (`assess_discharge_readiness`, `extract_discharge_blockers`, `generate_transition_plan`, `build_clinician_handoff_brief`, `draft_patient_discharge_instructions`)
11. primary 3-prompt Launchpad scenario runs and returns expected structured response (`verdict`, `blockers`, `evidence`, `next_steps`, `summary`)
