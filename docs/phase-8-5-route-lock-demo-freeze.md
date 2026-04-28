# Phase 8.5 - Route-Lock + Demo-Safe Freeze

## Branch and worktree map
- Integration branch: `int/phase8.5-route-lock-freeze`
- Integration worktree: `../ctc-phase8-5-route-lock-freeze`
- Worker A branch: `feat/phase8.5-direct-mcp-green`
- Worker A worktree: `../ctc-phase8-5-direct-mcp-green`
- Worker B branch: `feat/phase8.5-a2a-one-turn-proof`
- Worker B worktree: `../ctc-phase8-5-a2a-one-turn-proof`

## Phase goal
- Green Direct-MCP 3-prompt demo
- Green A2A one-turn assembled proof

This phase exists to freeze the live demo route around what is actually safe to show, not to reopen the architecture debate.
The strongest current live asset is the Clinical Intelligence / Direct-MCP path.
A2A registration and runtime reachability have improved, but the full A2A multi-prompt route is not yet submission-safe.

## Route-lock principle
- Primary live demo lane should stay Direct-MCP until a lane is green with run-folder evidence.
- A2A is a proof lane in this phase, not a place to blur platform routing defects into prompt wording changes.
- No worker should treat "one more prompt tweak" as a substitute for verified routing.

## Non-goals
- No custom frontend
- No new MCPs
- No broad architecture rewrite
- No streaming A2A unless existing docs prove it is already required
- No relabeling platform routing defects as "one more prompt tweak"

## Required worker lanes
- Direct-MCP evidence hardening
- A2A one-turn route-lock proof

## Direct-MCP strict green criteria
- Prompt 1, Prompt 2, and Prompt 3 visibly complete in Prompt Opinion
- Final assistant transcript persists for each prompt
- Screenshots are captured in the run folder
- Browser network evidence is captured
- Runtime/MCP hit evidence is captured
- Run-folder status board marks the Direct-MCP 3-prompt lane `GREEN`

## A2A one-turn strict green criteria
- External A2A is selected and verified in the UI
- Prompt Opinion sends `POST` to the external A2A runtime
- Runtime accepts Prompt Opinion's exact HTTP+JSON shape
- Runtime returns a response accepted by Prompt Opinion
- The orchestrator calls both MCPs
- Final assistant transcript visibly includes the A2A result
- Run-folder status board marks the A2A one-turn assembled proof `GREEN`

## Final integration commands expected
- `npm --prefix po-community-mcp-main/clinical-intelligence-typescript run smoke:release-gate`
- `npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:release-gate`
- `npm --prefix po-community-mcp-main/typescript run smoke:release-gate`
- `./po-community-mcp-main/scripts/run-full-system-validation.sh`
- `PROMPT_OPINION_BROWSER_CAPTURE=1 PROMPT_OPINION_UPDATE_REGISTRATIONS=1 ./po-community-mcp-main/scripts/run-prompt-opinion-rehearsal-capture.sh`
- `./po-community-mcp-main/scripts/check-two-mcp-readiness.sh`
- `./po-community-mcp-main/scripts/check-a2a-readiness.sh`
- `npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:prompt-opinion-rehearsal`

## Security warning
- No credentials in committed files
- Use env vars only
- Generated auth/session artifacts must remain ignored

## What workers should preserve
- Locked system identity: `Care Transitions Command`
- Locked architecture: `2 MCPs + 1 external A2A`
- Demo shape: the 3-prompt narrative stays intact even when the live route is frozen to Direct-MCP
