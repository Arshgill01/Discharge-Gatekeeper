# Demo Script

## Goal
Deliver a judge-ready, first-slice demo in under 3 minutes with one patient and one tool call path:
`assess_discharge_readiness`.

## Locked scenario
- `scenario_id`: `first_synthetic_discharge_slice_v1`
- Expected verdict: `not_ready`
- Expected scenario-triggered categories: `clinical_stability`, `medication_reconciliation`, `follow_up_and_referrals`, `patient_education`, `home_support_and_services`, `equipment_and_transport`
- Canonical taxonomy reference (full set): `clinical_stability`, `pending_diagnostics`, `medication_reconciliation`, `follow_up_and_referrals`, `patient_education`, `home_support_and_services`, `equipment_and_transport`, `administrative_and_documentation`
- Regression companions (off-camera): `second_synthetic_discharge_slice_ready_with_caveats_v1` -> `ready_with_caveats`; `third_synthetic_discharge_slice_ready_v1` -> `ready`
- These protect verdict breadth without replacing the primary demo path.

## Off-camera prep (30 to 45 seconds)
1. Run smoke check from `po-community-mcp-main/typescript`:
   - `npm run smoke:release-gate`
   - this now covers typecheck plus all three canonical success scenarios and the ambiguity/failure robustness lane
2. Confirm runtime/tool surface explicitly:
   - `npm run smoke:runtime`
   - `/healthz` shows the workflow-suite tools: `assess_discharge_readiness`, `extract_discharge_blockers`, `generate_transition_plan`, `build_clinician_handoff_brief`, `draft_patient_discharge_instructions`
3. Open Prompt Opinion workspace and select the synthetic patient context.
4. Keep one view ready where verdict, blockers, and evidence IDs are visible together.

## On-camera 3-prompt flow

### Prompt 1
User prompt:
`Is this patient safe to discharge today?`

Show on screen:
- explicit verdict (`not_ready`)
- one-sentence summary with blocker count and priority mix

Expected value:
- proves this is a decision-support control point, not a generic summary bot

### Prompt 2
User prompt:
`What exactly is blocking discharge right now?`

Show on screen:
- six blockers with category + priority + actionability
- evidence linkage per blocker
- one concise provenance/trust line per blocker so source labels and conflict/uncertainty markers are visible without dumping raw reasoning

Expected value:
- shows structured, inspectable blockers grounded in chart/note evidence

### Prompt 3
User prompt:
`What must happen before this patient leaves?`

Show on screen:
- ordered `next_steps` list
- owner + linked blocker for each step
- linked evidence and short trace summary for at least one step

Expected value:
- converts blockers into an execution-ready transition checklist for the care team

## Optional 2-prompt expansion (show bigger suite)

### Prompt 4
User prompt:
`Build the clinician handoff brief.`

Show on screen:
- unresolved risks tied to blocker IDs and evidence IDs
- unresolved risk trust state / trace summary carried forward from blocker provenance
- explicit clinician-review/sign-off boundary text

### Prompt 5
User prompt:
`Draft patient discharge instructions.`

Show on screen:
- plain-language instructions mapped one-to-one to blocker IDs
- explicit clinician-finalization boundary text

## Expected output snapshot (first slice)
- Verdict: `not_ready`
- Blockers: 6 total (4 `high`, 2 `medium`)
- Evidence trace entries: 6 total, each linked to blocker IDs
- Next steps: 6 total, one mapped to each blocker
- Summary anchor: discharge deferred until high-priority blockers are resolved and clinically reviewed

## Narration lines (keep these short)
- Prompt 1: "We ask one question first: is discharge safe today?"
- Prompt 2: "Now we inspect exactly what is blocking discharge, with source-linked evidence."
- Prompt 3: "Then we move from analysis to execution with owner-assigned next steps."

## Show vs skip
Show:
- verdict field
- blocker categories and priorities
- evidence IDs/source labels tied to blockers
- blocker provenance summaries or trust-state indicators
- next-step owners

Skip:
- long setup explanation of MCP internals
- raw note wall-of-text
- extra patients
- speculative roadmap features

## Fallback if output is partially degraded
If a richer view fails, keep the story intact in this order:
1. verdict
2. blocker list with at least one evidence link
3. top 3 next steps with owners

## Done check
A teammate can run this script and explain the value in 15 seconds:
"It decides readiness, shows why with evidence, and tells the team what to do next."
