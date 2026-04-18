# Submission Checklist

## Goal
Make the project easy for judges to find, invoke, understand, and trust.

## Judge-facing value proposition
Use this one-liner in the video and listing:
"Discharge Gatekeeper determines discharge readiness, shows blocker evidence, and returns the next-step plan before a risky handoff."

## Core requirements to protect
- Prompt Opinion-compatible integration path
- patient/FHIR context behavior when needed
- visible skill or tool metadata
- public endpoint reliability
- Marketplace publish readiness
- short, sharp demo

## Technical checklist
- MCP server runs reliably
- required environment variables are documented
- patient-context assumptions are documented
- public endpoint plan exists
- integration smoke test exists
- fallback plan exists if the public URL changes
- integration runbook is current (`docs/prompt-opinion-integration-runbook.md`)

## Prompt Opinion checklist
- server is added correctly
- transport is configured correctly
- patient data access behavior is understood
- tool metadata is clear
- launchpad invocation path is tested
- outputs are readable in the Prompt Opinion UI

## Demo checklist
- one patient story only
- three prompts max
- verdict visible immediately
- blockers visible immediately
- next-step plan visible immediately
- narration stays under time

## First-slice invocation path
1. Launchpad prompt: `Is this patient safe to discharge today?`
2. Follow-up prompt: `What exactly is blocking discharge right now?`
3. Follow-up prompt: `What must happen before this patient leaves?`

Expected first-slice result shape:
- verdict: `not_ready`
- blockers: six scenario-triggered canonical categories (`clinical_stability`, `medication_reconciliation`, `follow_up_and_referrals`, `patient_education`, `home_support_and_services`, `equipment_and_transport`)
- evidence: source-linked trace entries
- next steps: ordered, owner-tagged actions

## Marketplace checklist
- title is memorable
- short description is crisp
- value proposition is obvious
- metadata does not overclaim
- publish path is tested before final submission

## Trust checklist
- claims are assistive, not autonomous
- evidence is visible
- failures are useful
- no fake certainty
- the workflow feels deployable today

## Video checklist
Suggested order:
1. hook
2. patient discharge question
3. blockers with evidence
4. next-step plan
5. closing value statement

## On-screen discipline
Show:
- verdict + summary line
- blocker category/priority/evidence linkage
- next-step owner mapping

Skip:
- long infrastructure setup
- extra scenarios
- roadmap features not in first slice

## Final pre-submit smoke test
Run this from a fresh session:
1. open Prompt Opinion workspace
2. invoke the main discharge-readiness flow
3. confirm the verdict renders
4. confirm blockers render
5. confirm prioritized next steps render
6. confirm nothing depends on hidden local state

Repo-level command check before recording:
1. from `po-community-mcp-main/typescript`, run `npm run typecheck`
2. run `npm run smoke:runtime`
3. run `npm run smoke:readiness`
4. run `npm run smoke:readiness:regression`
5. run `npm run smoke:workflow-suite-core`
6. run `npm run smoke:artifacts`
7. run `npm run smoke:demo-path`
8. optionally run one bundled command: `npm run smoke:release-gate`
9. confirm output includes `SMOKE PASS: runtime boot and tool registration`
10. confirm output includes `SMOKE PASS: assess_discharge_readiness v1`
11. confirm output includes `REGRESSION PASS: assess_discharge_readiness matrix`
12. confirm output includes `SMOKE PASS: workflow suite core`
13. confirm output includes `SMOKE PASS: workflow artifacts suite`
14. confirm output includes `SMOKE PASS: demo path (expanded workflow)`
15. confirm the bundled gate covers the three-scenario verdict matrix (`not_ready`, `ready_with_caveats`, `ready`) plus ambiguity/missing-context/insufficient-evidence checks

## Last-minute cut rule
If time is short, protect these in order:
1. verdict quality
2. blocker quality
3. next-step plan quality
4. polish extras
