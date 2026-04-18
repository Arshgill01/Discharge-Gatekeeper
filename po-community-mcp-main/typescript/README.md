# Discharge Gatekeeper MCP Server (TypeScript)

This is the active runtime for the Discharge Gatekeeper demo lane.

First-slice tool:
- `assess_discharge_readiness`

## Quick start

```bash
npm install
cp .env.example .env
npm run start
```

Endpoints:
- `http://localhost:5000/mcp`
- `http://localhost:5000/healthz`

## Validation

If validation fails with `Missing dependencies ... Run: npm ci`, install from lockfile first:

```bash
npm ci
```

```bash
npm run typecheck
npm run smoke:runtime
npm run smoke:readiness
npm run smoke:readiness:regression
npm run smoke:demo-path
npm run smoke:release-gate
```

## Prompt Opinion integration runbook

Use this full guide for local run, ngrok tunneling, Prompt Opinion connection, smoke testing, and troubleshooting:

- [`docs/prompt-opinion-integration-runbook.md`](../../docs/prompt-opinion-integration-runbook.md)

## Debugging with VS Code

We use [tsx](https://tsx.is/vscode) to debug the server locally:

1. Open `index.ts`.
2. In VS Code, open `Run and Debug`.
3. Select the `tsx` configuration.
4. Start debugging.
