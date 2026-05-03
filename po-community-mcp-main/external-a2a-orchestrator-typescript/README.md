# external A2A orchestrator (TypeScript)

Thin synchronous external A2A-capable runtime for Care Transitions Command.

## Endpoints
- `GET /healthz`
- `GET /readyz`
- `GET /.well-known/agent-card.json`
- `GET /agent-card`
- `POST /rpc` (A2A JSON-RPC)
- `POST /message:send` (A2A HTTP+JSON)
- `POST /v1/message:send` (A2A HTTP+JSON alias)
- `POST /message:send/v1/message:send` (Prompt Opinion nested HTTP+JSON alias)
- `POST /tasks`
- `GET /tasks/:taskId`
- `GET /tasks`

## Run
```bash
../scripts/link-shared-env.sh
../scripts/check-runtime-provider-config.sh
npm ci
npm start
```

## Required env
- `DISCHARGE_GATEKEEPER_MCP_URL`
- `CLINICAL_INTELLIGENCE_MCP_URL`

Clinical Intelligence provider evidence is recorded in A2A task runtime diagnostics as `hidden_risk_provider`. A Google/Gemini proof run must show `provider=google` with key presence; heuristic diagnostics cannot be reported as Google/Gemini-backed proof.
