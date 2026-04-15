---
name: eval-and-trace-designer
description: Design prompt-based acceptance tests, regression checks, and evidence-trace expectations for this repo. Use when defining eval prompts, quality rubrics, or verifying that outputs remain grounded and inspectable.
compatibility: Codex-compatible skill for evaluation and QA work.
metadata:
  version: "1.0"
  owner: discharge-gatekeeper
---

# Eval and Trace Designer

## Use this skill when
- adding or revising eval prompts
- defining output rubrics
- checking whether evidence remains visible
- turning ambiguous behavior into testable expectations

## First read
1. `AGENTS.md`
2. `PLAN.md`
3. `docs/evals.md`
4. `docs/demo-script.md`
5. `docs/architecture.md`

## Goal
Protect the product from becoming a vague chatbot by making the discharge flow testable.

## Workflow
1. Start from the user-visible question.
2. Define the expected verdict or behavior.
3. Define what evidence should be visible.
4. Add at least one negative or failure case.
5. Keep the eval readable by humans.

## Good eval properties
- anchored to real prompts
- aligned with canonical verdict states
- easy to rerun after tool changes
- explicit about what failure looks like

## Do not
- write evals that depend on hidden context
- create rubrics that reward verbose but weak answers
- ignore missing-context or contradictory-note cases

## Final checks
Before finishing:
1. Would this eval catch scope drift?
2. Would it catch evidence-free answers?
3. Is the pass bar obvious to a human reviewer?
