---
name: synthetic-clinical-data-builder
description: Create or refine synthetic patient data, note corpora, and evidence setups for the discharge demo. Use when building demo patients, blocker evidence, note text, or FHIR resource scaffolds.
compatibility: Codex-compatible skill for synthetic healthcare demo data.
metadata:
  version: "1.0"
  owner: discharge-gatekeeper
---

# Synthetic Clinical Data Builder

## Use this skill when
- creating the demo patient
- writing note text
- deciding what FHIR resources are needed
- aligning blocker evidence with tool behavior

## First read
1. `AGENTS.md`
2. `PLAN.md`
3. `docs/data-plan.md`
4. `docs/product-brief.md`
5. `docs/demo-script.md`

## Goal
Create a single synthetic patient scenario that makes the discharge-readiness story obvious and believable.

## Design rules
- One patient is enough for the first slice.
- Use 3 to 4 meaningful blockers.
- Make at least one blocker note-only, not just structured.
- Keep the case easy to explain aloud.
- Avoid unrealistic all-in-one notes that make the task trivial.

## Recommended evidence mix
Each blocker should be discoverable from:
- a structured signal
- a note or document signal
when possible.

## Do not
- create overly dramatic pathology
- overload the case with too many blockers
- rely on obscure clinical details that require long explanation
- make the notes so perfect that no synthesis is needed

## Final checks
Before finishing:
1. Can the patient story be explained in one or two sentences?
2. Are blockers distributed across multiple sources?
3. Does the data support the 3-prompt demo cleanly?
