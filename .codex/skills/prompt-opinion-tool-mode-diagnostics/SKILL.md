---
name: "prompt-opinion-tool-mode-diagnostics"
description: "Diagnose Prompt Opinion BYO/Direct-MCP failures where no-tool chat works but native MCP tool-call mode fails, including tool-available/no-call controls, minimal tool-call controls, provider error capture, runtime-hit correlation, and gate-safe recovery decisions."
---

# Prompt Opinion Tool-Mode Diagnostics

Use this when Prompt Opinion can answer ordinary chat prompts but fails when a BYO agent should call an MCP tool.

## Guardrails

- Do not change clinical logic while isolating provider/tool-mode behavior.
- Do not treat FunctionResponse, prompt-stream payloads, or persisted tool-call metadata as visible Direct-MCP proof.
- Do not run Test 2 while Test 1 is red.
- Do not copy secrets from local auth tools into Prompt Opinion without explicit approval.
- Keep the model/provider conclusion narrow: separate model quality from Prompt Opinion provider path, tool-call planning, MCP routing, and transcript rendering.

## Minimal Ladder

Run the smallest controls that classify the first failing layer:

1. Same workspace, no tools attached if available:
   - Prompt: `Reply with exactly: DIAGNOSTIC_OK`
   - Pass means normal provider chat can persist.
2. Same Direct-MCP/BYO agent with tools attached, no tool use:
   - Prompt: `Do not call any tools. Reply with exactly: TOOL_MODE_NO_CALL_OK.`
   - Pass means merely attaching MCP tools does not break the conversation.
3. Same Direct-MCP/BYO agent, smallest existing MCP tool call:
   - Prefer a read-only tool with one optional string input.
   - Expected proof: prompt-scoped MCP runtime hit, tiny tool response, and visible final assistant reply.
4. Canonical Prompt 1 only, compact output.
5. Fresh full Test 1 only if the ladder passes.

Stop at the first failed diagnostic step and classify before retrying.

## Evidence To Capture

For each step, write artifacts under the run folder:

- visible screenshot text and PNG
- `direct-mcp-status.json`
- `browser-network-events.json`
- `browser-network-summary.json`
- `runtime-log-delta.json`
- workspace ID, agent ID, conversation ID
- provider/model/config ID when available
- exact prompt-stream error body
- prompt-scoped DGK, CI, and A2A request counts

## Classification Rules

- A no-tool chat failure is provider/workspace-level failure.
- Tool-attached/no-tool failure is tool-attached conversation failure.
- Tool-attached/no-tool pass plus minimal tool-call failure with zero MCP hits is provider/native tool-call planning or routing failure.
- Minimal tool-call reaches MCP but final transcript fails is post-tool synthesis or persistence failure.
- Minimal tool-call passes but canonical Prompt 1 fails is clinical response shape, tool schema size, or content-specific provider behavior.

## Recovery Choices

After classification, choose one evidence-backed next step:

- Switch to a Prompt Opinion provider known and configured to support native tool calls, with explicit approval before adding credentials.
- Add a temporary diagnostic ping/echo tool only if needed to distinguish generic tool-call failure from tool-schema/content failure, and keep it isolated from product logic.
- Keep Direct-MCP red and document platform/provider limitation if no approved provider/config path can satisfy native tool calling.

Record why the rejected alternatives were not used.
