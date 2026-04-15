# Submission Checklist

## Goal
Make the project easy for judges to find, invoke, understand, and trust.

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
- one transition artifact visible immediately
- narration stays under time

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
4. transition package
5. closing value statement

## Final pre-submit smoke test
Run this from a fresh session:
1. open Prompt Opinion workspace
2. invoke the main discharge-readiness flow
3. confirm the verdict renders
4. confirm blockers render
5. confirm one transition artifact renders
6. confirm nothing depends on hidden local state

## Last-minute cut rule
If time is short, protect these in order:
1. verdict quality
2. blocker quality
3. transition artifact quality
4. polish extras
