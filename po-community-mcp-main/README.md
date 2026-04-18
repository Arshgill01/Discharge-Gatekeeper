# Discharge Gatekeeper MCP Substrate

This directory contains the imported Prompt Opinion community MCP scaffold that Discharge Gatekeeper builds on.

Use it as implementation substrate, not product identity.

## What is active in this repo
- `typescript/`: active Discharge Gatekeeper MCP server used in the demo and integration runbook
- `clinical-intelligence-typescript/`: active Clinical Intelligence MCP server used for hidden-risk contradiction review
- `external-a2a-orchestrator-typescript/`: active external A2A orchestrator runtime for synchronous two-MCP fusion
- `python/`: upstream reference runtime kept for comparison and portability

## Local orchestration smoke
- `./scripts/smoke-two-mcp-integration.sh`: phase-2 direct two-MCP quality gate
- `./scripts/smoke-a2a-orchestration.sh`: phase-3 external A2A orchestration gate (boots both MCPs + A2A)

## Canonical project docs
- Product framing: [`../docs/product-brief.md`](../docs/product-brief.md)
- Demo flow: [`../docs/demo-script.md`](../docs/demo-script.md)
- Prompt Opinion integration: [`../docs/prompt-opinion-integration-runbook.md`](../docs/prompt-opinion-integration-runbook.md)

## External spec
- SHARP-on-MCP: [latest version](https://www.sharponmcp.com/)
