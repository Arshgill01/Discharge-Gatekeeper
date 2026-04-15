# MCP Reference Analysis

## Reference repo
`prompt-opinion/po-community-mcp`

## Why this repo matters
This repo is the closest public pattern source for a Prompt Opinion-compatible MCP server.
It is not the final architecture we should copy, but it is the best starting point for:
- integration shape
- FHIR-context handling
- simple tool registration
- language/runtime options

## High-confidence takeaways
### 1) The repo is meant to extend Prompt Opinion's default MCP surface
The README positions it as an open-source place where developers can add additional FHIR-related tools to the default MCP server used by Prompt Opinion.

Implication:
Our project should feel like a real domain-specific extension, not a disconnected generic MCP demo.

### 2) The Python starter uses a lightweight FastMCP server
The starter creates a FastMCP instance with `stateless_http=True` and a public host binding.
It then registers individual tools with small, direct descriptions.

Implication:
Start boring.
Do not invent a custom MCP transport story before the discharge tools are working.

### 3) Prompt Opinion-specific FHIR context is exposed via MCP capabilities
The starter patches MCP capabilities to expose the `ai.promptopinion/fhir-context` extension.

Implication:
Our server needs to preserve Prompt Opinion compatibility rather than acting like a generic MCP toy.

### 4) Patient context is recovered from request metadata, not from app-global state
The FHIR utility pattern reads:
- FHIR server URL from headers
- FHIR access token from headers
- patient identifier from token claims or fallback header

Implication:
Our implementation should keep context extraction as a narrow utility layer so each tool can be stateless and testable.

### 5) The example tools are intentionally narrow
The public Python examples focus on small units like:
- patient age
- allergies
- patient ID lookup

Implication:
Our discharge tools should also be narrow and composable.
Avoid one giant “hospital brain” tool.

## What we should borrow
- simple FastMCP starter shape
- explicit per-tool registration
- a small utility layer for FHIR context extraction
- stateless request handling
- minimal assumptions in tool code

## What we should not borrow blindly
- template naming
- toy-level tool semantics
- generic examples that do not map to discharge workflow value
- starter descriptions that understate the clinical workflow context

## Recommended project adaptation
### Keep
- boring MCP bootstrap
- clear header/context utilities
- domain-specific tool modules

### Change
- rename the server and tools around the discharge wedge
- define structured output contracts from day one
- add evidence-aware responses
- keep a clearer separation between data retrieval, blocker extraction, and artifact generation

## Proposed adaptation layers
1. `context/`
   - Prompt Opinion header parsing
   - patient and encounter extraction
2. `retrieval/`
   - FHIR resource fetch helpers
   - note/document access wrappers
3. `tools/`
   - discharge-specific MCP tool entry points
4. `schemas/`
   - verdict, blocker, evidence, and transition-plan contracts
5. `orchestration/`
   - thin business logic only if needed

## Recommended first language choice
Python is the best first-slice candidate because:
- the public starter is obvious
- the context utilities are already easy to reason about
- the team can move quickly on a thin vertical slice

TypeScript remains viable if the broader repo stack requires it, but the reference path makes Python the lower-risk start.

## First things to inspect when implementation starts
- how to preserve the Prompt Opinion FHIR-context extension cleanly
- how to package structured tool outputs without breaking compatibility
- how to simulate note/document inputs for local smoke tests
- how to keep tool contracts stable while the product evolves

## Final recommendation
Treat `po-community-mcp` as the launch rail, not the destination.
Use it to move fast on integration while keeping all domain intelligence focused on the discharge-readiness wedge.
