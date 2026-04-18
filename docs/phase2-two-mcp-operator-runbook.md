# Phase 2 Two-MCP Operator Runbook

This runbook is the manual operator path for Phase 2 (`Discharge Gatekeeper MCP` + `Clinical Intelligence MCP`) before A2A.

Use this when you need to run both MCPs together in Prompt Opinion and prove the hidden-risk contradiction story without orchestration code.

## 1. Local prerequisites

- Node.js 20+
- dependencies installed in both runtimes

```bash
cd po-community-mcp-main/typescript && npm ci
cd ../clinical-intelligence-typescript && npm ci
```

## 2. Boot both MCPs together

From repo root:

```bash
./po-community-mcp-main/scripts/start-two-mcp-local.sh
```

Expected local endpoints:
- Discharge Gatekeeper MCP: `http://127.0.0.1:5055/mcp`
- Clinical Intelligence MCP: `http://127.0.0.1:5056/mcp`

Health/readiness:
- `http://127.0.0.1:5055/healthz`
- `http://127.0.0.1:5055/readyz`
- `http://127.0.0.1:5056/healthz`
- `http://127.0.0.1:5056/readyz`

Stop both MCPs:

```bash
./po-community-mcp-main/scripts/stop-two-mcp-local.sh
```

## 3. Expose both MCPs for Prompt Opinion

Use two tunnels, one per MCP runtime:

```bash
ngrok http 5055
ngrok http 5056
```

Then restart with tunnel hosts allowlisted:

```bash
DISCHARGE_GATEKEEPER_ALLOWED_HOSTS="localhost,127.0.0.1,<gatekeeper-host>" \
CLINICAL_INTELLIGENCE_ALLOWED_HOSTS="localhost,127.0.0.1,<clinical-host>" \
./po-community-mcp-main/scripts/start-two-mcp-local.sh
```

Replace `<gatekeeper-host>` and `<clinical-host>` with the hostname part of each public URL.

## 4. Prompt Opinion registration sequence (no A2A)

Register in this order:
1. `Discharge Gatekeeper MCP`
2. `Clinical Intelligence MCP`

Connection values:
1. Name: `Discharge Gatekeeper MCP`, URL: `https://<gatekeeper-host>/mcp`
2. Name: `Clinical Intelligence MCP`, URL: `https://<clinical-host>/mcp`

## 5. Discoverability and callability checks

Before Prompt Opinion testing, verify:
1. each `/readyz` returns `status=ok`
2. each runtime reports expected `server_name`
3. each runtime reports expected tool list

One-command readiness check:

```bash
./po-community-mcp-main/scripts/check-two-mcp-readiness.sh
```

Discharge Gatekeeper expected tools:
- `assess_discharge_readiness`
- `extract_discharge_blockers`
- `generate_transition_plan`
- `build_clinician_handoff_brief`
- `draft_patient_discharge_instructions`

Clinical Intelligence expected tools:
- `surface_hidden_risks`
- `synthesize_transition_narrative`

## 6. Manual two-MCP demo sequence

Prompt 1:
- call `assess_discharge_readiness`
- validate structured posture is shown first

Prompt 2:
- call `surface_hidden_risks` with the same deterministic snapshot plus note bundle
- validate contradiction is cited and hidden-risk disposition impact is visible

Prompt 3:
- call `generate_transition_plan`
- keep deterministic next-step spine and explicitly carry hidden-risk escalation context in the operator narration

## 7. Failure fallback in this phase

If `Clinical Intelligence MCP` is unavailable or returns `status=error`:
1. keep `Discharge Gatekeeper MCP` as the source of truth for verdict/blockers/next steps
2. mark hidden-risk review unavailable (`clinical_intelligence_unavailable`)
3. do not invent hidden-risk findings
4. continue the demo on deterministic outputs

## 8. Repeatable integration smoke

Run from repo root:

```bash
./po-community-mcp-main/scripts/smoke-two-mcp-integration.sh
```

This validates:
1. both runtimes boot and expose expected tools
2. both runtimes can coexist without identity/config collisions
3. the phase-2 trap flow escalates from structured `ready` to hidden-risk `not_ready`
4. fallback behavior keeps deterministic posture when clinical intelligence is unavailable
