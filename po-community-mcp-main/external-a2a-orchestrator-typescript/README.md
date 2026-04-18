# external A2A orchestrator (TypeScript)

Thin synchronous external A2A-capable runtime for Care Transitions Command.

## Endpoints
- `GET /healthz`
- `GET /readyz`
- `GET /.well-known/agent-card.json`
- `GET /agent-card`
- `POST /tasks`
- `GET /tasks/:taskId`
- `GET /tasks`

## Run
```bash
npm ci
npm start
```

## Required env
- `DISCHARGE_GATEKEEPER_MCP_URL`
- `CLINICAL_INTELLIGENCE_MCP_URL`
