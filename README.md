# Discharge Gatekeeper

Discharge Gatekeeper is an MCP-first healthcare workflow agent for Prompt Opinion. It determines discharge readiness, surfaces blockers with evidence, and returns a prioritized transition plan.

## Current first slice
- Tools: `assess_discharge_readiness`, `build_clinician_handoff_brief`, `draft_patient_discharge_instructions`
- Scenario: `first_synthetic_discharge_slice_v1`
- Readiness output contract: `verdict`, `blockers`, `evidence`, `next_steps`, `summary`

## Front-door docs
- [Product brief](docs/product-brief.md)
- [Demo script](docs/demo-script.md)
- [Submission checklist](docs/submission-checklist.md)
- [Prompt Opinion integration runbook](docs/prompt-opinion-integration-runbook.md)
- [Architecture](docs/architecture.md)
- [Live plan](PLAN.md)

## Runtime layout
- `po-community-mcp-main/typescript`: active Discharge Gatekeeper MCP runtime
- `po-community-mcp-main/python`: upstream reference runtime (not in default demo lane)

## Quick start (TypeScript runtime)
```bash
cd po-community-mcp-main/typescript
npm install
cp .env.example .env
npm run start
```

Validation:
```bash
npm run typecheck
npm run smoke:readiness
npm run smoke:artifacts
```

Primary demo prompts:
1. `Is this patient safe to discharge today?`
2. `What exactly is blocking discharge right now?`
3. `What must happen before this patient leaves?`
4. `Build the clinician handoff brief.`
5. `Draft patient discharge instructions.`
