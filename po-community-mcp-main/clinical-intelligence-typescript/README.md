# Clinical Intelligence MCP Server (TypeScript)

This is the standalone runtime surface for `Clinical Intelligence MCP`.

Current tools:
- `surface_hidden_risks`
- `synthesize_transition_narrative`

## Quick start

```bash
npm install
../scripts/link-shared-env.sh
../scripts/check-runtime-provider-config.sh
npm run start
```

Endpoints:
- `http://localhost:5056/mcp`
- `http://localhost:5056/healthz`
- `http://localhost:5056/readyz` includes hidden-risk provider/model/key-present/fallback-mode diagnostics without secret values.

Provider note:
- `CLINICAL_INTELLIGENCE_LLM_PROVIDER=heuristic` is valid for deterministic local regression.
- Google/Gemini proof requires `CLINICAL_INTELLIGENCE_LLM_PROVIDER=google` plus `GOOGLE_API_KEY` or `GEMINI_API_KEY`.

## Validation

```bash
npm run typecheck
npm run smoke:runtime
npm run smoke:hidden-risk
npm run smoke:narrative
npm run smoke:release-gate
```
