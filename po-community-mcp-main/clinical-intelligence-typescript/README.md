# Clinical Intelligence MCP Server (TypeScript)

This is the standalone runtime surface for `Clinical Intelligence MCP`.

Current tools:
- `surface_hidden_risks`
- `synthesize_transition_narrative`

## Quick start

```bash
npm install
cp .env.example .env
npm run start
```

Endpoints:
- `http://localhost:5056/mcp`
- `http://localhost:5056/healthz`

## Validation

```bash
npm run typecheck
npm run smoke:runtime
npm run smoke:hidden-risk
npm run smoke:narrative
npm run smoke:release-gate
```
