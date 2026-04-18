# Care Transitions Command Prompt Opinion Integration Runbook

This runbook is the operator scaffold for the locked Phase 0 architecture:
`Discharge Gatekeeper MCP` + `Clinical Intelligence MCP` + `external A2A orchestrator`.

Use this document to separate what must be registered, what may be published, and what the demo should do when a layer fails.

## 1. Registration surfaces

### Surface A: `Discharge Gatekeeper MCP`
Role:
- deterministic discharge-readiness spine

Must expose:
- MCP endpoint
- health endpoint
- stable tool metadata
- structured output contract for discharge readiness and next steps

### Surface B: `Clinical Intelligence MCP`
Role:
- hidden-risk, contradiction, and narrative-only signal detection

Must expose:
- MCP endpoint
- health endpoint
- stable tool metadata
- hidden-risk JSON contract with citations

### Surface C: `external A2A orchestrator`
Role:
- synchronous orchestration layer that calls both MCPs and applies the decision matrix

Must expose:
- agent registration/discovery surface appropriate to the chosen A2A runtime
- health endpoint
- synchronous request/response invocation path
- explicit no-streaming behavior

## 2. Common prerequisites
- Prompt Opinion workspace access with permission to register external tools/agents
- one reachable public URL per component being registered
- one trap-patient bundle available for demo fallback
- one operator note that maps each public URL to the correct identity

Before registration, verify for every component:
- identity string matches the frozen name
- health check passes
- logs show requests clearly enough to debug discovery failures

## 3. Register `Discharge Gatekeeper MCP`

### Registration checklist
1. add a new MCP server connection in Prompt Opinion
2. set the display name to `Discharge Gatekeeper MCP`
3. point the URL to the public MCP endpoint for the deterministic server
4. save and run connection/discovery
5. confirm the expected structured discharge tools are discoverable

### Discovery pass criteria
- Prompt Opinion shows the MCP as reachable
- tool metadata clearly maps to structured discharge work
- no hidden-risk-only tool descriptions appear on this surface
- a smoke invocation returns parseable structured JSON

### Failure handling
- if discovery fails, do not continue to A2A registration
- fix the deterministic MCP first because the rest of the system depends on it

## 4. Register `Clinical Intelligence MCP`

### Registration checklist
1. add a second MCP server connection in Prompt Opinion
2. set the display name to `Clinical Intelligence MCP`
3. point the URL to the public MCP endpoint for the hidden-risk server
4. save and run connection/discovery
5. confirm the hidden-risk tool surface is separate from the deterministic MCP surface

### Discovery pass criteria
- Prompt Opinion shows the MCP as reachable
- tool metadata clearly maps to hidden-risk and contradiction review
- discovery does not duplicate the deterministic discharge tools
- a smoke invocation returns the hidden-risk JSON schema with citations

### Failure handling
- if this MCP fails, the direct deterministic path must still remain available
- log the failure as `clinical_intelligence_unavailable` for demo-day decision making

## 5. Register `external A2A orchestrator`

Register the A2A layer only after both MCPs are independently reachable.

### Required orchestrator behavior before registration
- synchronous request/response only
- no streaming dependencies
- knows the base URLs or registry IDs for both MCPs
- applies the matrix in [phase0-orchestrator-decision-matrix.md](/Users/arshdeepsingh/Developer/ctc-phase0-ops/docs/phase0-orchestrator-decision-matrix.md)
- returns a single final response suitable for the 3-prompt demo

### Registration checklist
1. add the external agent integration in Prompt Opinion
2. set the display name to `external A2A orchestrator`
3. provide the agent discovery or invocation URL required by the chosen A2A runtime
4. validate that the orchestrator can reach both MCPs from its runtime environment
5. run one end-to-end prompt from Prompt Opinion through the A2A layer

### Pass criteria
- Prompt Opinion reaches the A2A layer directly
- the A2A layer reaches both MCPs
- the final response includes:
  - final verdict
  - deterministic blocker linkage
  - hidden-risk status
  - citations
  - next steps
- response returns as one synchronous payload

### Failure handling
- if A2A registration or invocation fails, stop using it for the judge path
- switch the workspace to the fallback direct-MCP path
- do not attempt live debugging on camera

## 6. Preferred demo path
Preferred final demo:
1. Prompt Opinion invokes `external A2A orchestrator`
2. orchestrator calls `Discharge Gatekeeper MCP`
3. orchestrator calls `Clinical Intelligence MCP`
4. orchestrator returns one reconciled response

Use this path only if all three components passed a clean-session rehearsal the same day.

## 7. Fallback direct-MCP demo path

This is the required backup path.

### Setup
- keep both MCPs registered even when using the A2A path
- prepare one Prompt Opinion workspace view where both MCP tool surfaces are available
- prepare the trap-patient bundle or deterministic synthetic context

### Execution
1. use `Discharge Gatekeeper MCP` for the baseline verdict
2. use `Clinical Intelligence MCP` for the hidden-risk/contradiction follow-up
3. use the deterministic next-step output for the discharge-action prompt

### Acceptable fallback story
- Prompt 1: deterministic readiness answer
- Prompt 2: hidden-risk review with citations
- Prompt 3: final next-step checklist driven by the deterministic spine, verbally noting any hidden-risk escalation if the UI does not merge them

### Rules
- do not improvise a fourth step
- do not claim the fallback path is the final architecture
- do state that the system architecture remains `2 MCPs + 1 external A2A`

## 8. Marketplace and publish implications

### Publish baseline
- publish the two MCPs as first-class assets if marketplace timing is tight
- keep names exactly:
  - `Discharge Gatekeeper MCP`
  - `Clinical Intelligence MCP`

### Orchestrator publishing
- treat `external A2A orchestrator` as a distinct surface with explicit dependencies
- if the event workflow does not support publishing the A2A layer cleanly, document it in submission materials instead of forcing an unstable publish path

### Listing guidance
- deterministic MCP listing should emphasize structured discharge readiness
- intelligence MCP listing should emphasize hidden-risk detection with citations
- top-level narration and deck copy should use `Care Transitions Command`

## 9. Operator go/no-go decision

Use the preferred A2A path only when all are true:
- `Discharge Gatekeeper MCP` discovery passes
- `Clinical Intelligence MCP` discovery passes
- `external A2A orchestrator` end-to-end invocation passes
- the 3-prompt rehearsal finishes cleanly in one session

Otherwise:
- disable the A2A layer for the live demo
- use the fallback direct-MCP path
- keep the architecture explanation accurate
