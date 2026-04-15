# Prompt Opinion Integration Runbook (TypeScript MCP)

This runbook covers the full judge-path integration loop:
1. run the MCP server locally
2. expose a public endpoint
3. connect in Prompt Opinion
4. call `assess_discharge_readiness`
5. verify end-to-end output

## 1) Local setup and run

From repo root:

```bash
cd po-community-mcp-main/typescript
npm install
cp .env.example .env
npm run start
```

Default local endpoints:
- MCP: `http://localhost:5000/mcp`
- Health: `http://localhost:5000/healthz`

Quick local sanity check (new terminal):

```bash
curl -sS http://localhost:5000/healthz | jq
```

Expected: `status: "ok"` and `tools` includes `assess_discharge_readiness`.

## 2) Environment variables

Set these in `po-community-mcp-main/typescript/.env`:

- `PO_ENV`: `local`, `dev`, or `prod`
- `HOST`: bind host (default `0.0.0.0`)
- `PORT`: bind port (default `5000`)
- `MCP_SERVER_NAME`: server display name for MCP metadata
- `MCP_SERVER_VERSION`: version string for MCP metadata
- `ALLOWED_HOSTS`: comma-separated inbound host allowlist; include your tunnel host

Example for ngrok testing:

```dotenv
PO_ENV=local
HOST=0.0.0.0
PORT=5000
MCP_SERVER_NAME=Discharge Gatekeeper MCP
MCP_SERVER_VERSION=1.0.0
ALLOWED_HOSTS=localhost,127.0.0.1,9f4d-203-0-113-10.ngrok-free.app
```

## 3) Public endpoint via ngrok (dev tunnel)

Start the MCP server first, then in another terminal:

```bash
ngrok http 5000
```

Use the HTTPS forwarding URL from ngrok, for example:
- `https://9f4d-203-0-113-10.ngrok-free.app`

Your Prompt Opinion MCP URL is:
- `https://9f4d-203-0-113-10.ngrok-free.app/mcp`

Important:
- Add the tunnel hostname to `ALLOWED_HOSTS`.
- Restart `npm run start` after changing `.env`.

## 4) Connect server in Prompt Opinion

In Prompt Opinion workspace settings, open the MCP server connection screen (label may be `MCP Servers` or `Tools` depending on UI version), then:

1. Add server name: `Discharge Gatekeeper MCP (local tunnel)`
2. Set endpoint URL to your tunnel `.../mcp`
3. Save and run connection test
4. Confirm tool discovery includes `assess_discharge_readiness`

## 5) End-to-end smoke test (Prompt Opinion UI)

Run this flow from a fresh Prompt Opinion session:

1. Ask: `Is this patient safe to discharge today?`
2. If tool call selection is manual, pick `assess_discharge_readiness`
3. Optional explicit tool test prompt:
   `Call assess_discharge_readiness with scenario_id=first_synthetic_discharge_slice_v1 and return the JSON payload.`
4. Verify output contains:
   - `verdict` (`not_ready` for v1 scenario)
   - blocker categories including `clinical`, `medications`, `follow_up`, `education`, `home_support`, `logistics`
   - `evidence`
   - `next_steps`
   - `summary`

## 6) Local smoke checks before Prompt Opinion

From `po-community-mcp-main/typescript`:

```bash
npm run typecheck
npm run smoke:readiness
```

Expected:
- typecheck exits `0`
- smoke prints `SMOKE PASS: assess_discharge_readiness v1`

## 7) Common failures and fixes

- `Host validation failed` / requests never reach tool:
  - Cause: tunnel hostname not in `ALLOWED_HOSTS`
  - Fix: add host to `ALLOWED_HOSTS`, restart server

- MCP connection test fails with 5xx:
  - Cause: server not running or wrong `/mcp` path
  - Fix: verify `curl http://localhost:5000/healthz`; re-check endpoint URL ends with `/mcp`

- Tool not visible in Prompt Opinion:
  - Cause: wrong server URL or stale connection
  - Fix: reconnect MCP server and confirm health endpoint/tool list locally

- `Unsupported scenario_id` from tool:
  - Cause: scenario other than `first_synthetic_discharge_slice_v1`
  - Fix: omit `scenario_id` or use the supported ID

- No visible starter tools in tool list:
  - Cause: intentional runtime cleanup; only `assess_discharge_readiness` is exposed in the first-slice server
  - Fix: none required for demo path; keep follow-up prompts aligned to discharge-readiness flow

## 8) Minimal deployment-ready checklist

Before demo or judge review:

1. `npm run typecheck` passes
2. `npm run smoke:readiness` passes
3. `/healthz` is reachable through the public URL
4. Prompt Opinion connection test succeeds
5. `assess_discharge_readiness` returns expected structured response in Prompt Opinion
