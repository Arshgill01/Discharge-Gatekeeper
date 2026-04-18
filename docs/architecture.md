# Architecture

## System shape
The project should begin as an MCP-first system designed to plug into Prompt Opinion with patient-context-aware tools.

Recommended shape:
1. Prompt Opinion Launchpad receives the clinician prompt.
2. An internal agent or direct tool path invokes our MCP server.
3. The MCP server reads Prompt Opinion patient/FHIR context.
4. Tools collect structured context, synthesize blockers, and return bounded outputs.
5. Prompt Opinion displays the result and, optionally, follow-up artifacts.

## Why MCP first
MCP is the best fit for the initial wedge because the differentiator is not a free-form external agent runtime. The differentiator is:
- discharge-specific tool design
- structured/unstructured context synthesis
- clear output contracts
- inspectable tool calls

## Proposed code layout
Suggested starter layout once implementation begins:
- `src/` or `app/`
- `tools/`
- `schemas/`
- `prompts/`
- `tests/` or `smoke/`

Do not overdesign this before the first tool works.

## Context assumptions
The MCP server should assume Prompt Opinion may provide:
- FHIR server URL
- FHIR access token
- patient identifier via token claims or headers

The community MCP starter demonstrates this pattern:
- read the FHIR URL and token from request headers
- recover patient context from the token or fallback header
- register tools through a simple FastMCP surface

## Core tool responsibilities
### 1) `assess_discharge_readiness`
Purpose:
- return an inspectable v1 readiness contract for one synthetic scenario

Likely inputs:
- optional `scenario_id` (default: first synthetic scenario)

Likely outputs:
- verdict
- blockers (category, priority, evidence, actionability)
- evidence trace entries linked to blockers
- prioritized next steps
- summary
- nested trust metadata on blockers, evidence, and next steps so contradiction, ambiguity, and corroboration gaps remain inspectable without changing top-level keys

### 2) `extract_discharge_blockers`
Purpose:
- return the structured blocker list and evidence linkage from the shared workflow spine

Likely outputs:
- verdict context
- blocker objects
- category
- severity
- rationale
- evidence source references

### 3) `generate_transition_plan`
Purpose:
- convert blockers from the shared workflow spine into an ordered “what must happen next” plan

Likely outputs:
- verdict context
- blocker context
- evidence linkage
- prioritized tasks
- suggested owners
- timing hints
- required follow-ups
- task-level traceability back to blocker IDs, evidence IDs, and blocker trust state

### 4) `build_clinician_handoff_brief`
Purpose:
- build a concise clinician-facing handoff from unresolved blockers and next-step ownership

Likely outputs:
- readiness verdict (mirrors readiness tool)
- unresolved risks linked to blocker IDs and evidence IDs
- blocker-linked required actions and owners
- blocker trust state and source-summary carry-through for unresolved risks
- explicit clinician-review/sign-off boundary language
- concise unresolved-risk summary

### 5) `draft_patient_discharge_instructions`
Purpose:
- produce plain-language patient instructions aligned to blockers and the transition plan

Likely outputs:
- verdict-aligned plain-language summary
- one instruction item per active blocker with linked blocker ID
- instruction-level linkage to blocker evidence and care-team verification note
- patient-facing reminders and escalation guidance
- care-team follow-up mapping to transition actions
- explicit clinician-finalization boundary language

## Output-contract preference
Start with a structured response plus concise narrative.
Avoid pure free text in the first slice.
Judges should be able to see:
- a verdict
- a blocker list
- evidence anchors
without digging through prose.

## Evidence design
Every major blocker should reference one or more evidence sources such as:
- note type plus excerpt summary
- medication discrepancy source
- observation or lab marker
- missing referral or order

The first slice can use lightweight source labels instead of perfect provenance objects.
Active suite expectation:
- each blocker carries bounded provenance: trust state, source labels/types, and any contradiction/ambiguity/missing-corroboration marker IDs
- each evidence trace carries source summary plus backlink to blockers and downstream next steps
- each transition task carries blocker-linked evidence IDs and a short trace summary

## Shared workflow spine
The core suite should run as one workflow family, not isolated tool implementations:
- one normalized evidence layer (`structured` + `note/document` signals)
- one blocker model reused across readiness, blocker extraction, and transition planning
- one transition-task model (`priority`, `owner`, `linked_blockers`) reused wherever next steps are produced
- explicit traceability path: `blocker -> evidence` and `next_step -> blocker`
- explicit trust path: `blocker provenance -> evidence conflict/ambiguity markers -> next step trace summary -> artifact carry-through`

## Notes and documents
The product should not rely on structured FHIR alone.
Use uploaded note content for:
- hidden social/logistical blockers
- home support constraints
- education gaps
- unresolved narrative concerns

## Safety boundaries
The system should:
- support readiness assessment
- synthesize evidence
- assist transition planning

The system should not:
- claim discharge authority
- make unsupported medical judgments
- present risk predictions as certainty

## Error handling
Useful failures are better than vague failures.
Tools should fail with messages that make next actions obvious, such as:
- no patient context found
- FHIR context unavailable
- required note source missing
- evidence insufficient for a confident verdict

## First build target
The first thin slice should only prove this:
Given one patient and a small set of structured plus note inputs, the system can correctly return `not_ready` or `ready_with_caveats` with a small blocker list and one transition artifact.
