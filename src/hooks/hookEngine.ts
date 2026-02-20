// src/hooks/hookEngine.ts
// HookEngine: central middleware pipeline for every agent tool call.
// Defines shared types (ToolEvent, HookContext) used across the hooks layer.
// Does NOT import from toolExecutor to break circular dependency — callers
// pass in an executor function instead.

import { preToolUse, HookContext as PreHookContext, IntentContext } from './preToolUse';
import { postToolUse } from './postToolUse';
import { approvalGuard } from './approvalGuard';
import { scopeValidator } from './scopeValidator';
import { concurrencyGuard } from './concurrencyGuard';

// ─── Shared types ─────────────────────────────────────────────────────────────

export type ToolEvent = {
  toolName: string;
  intentId: string;
  payload?: any;
};

/** Re-export from preToolUse for consumers that import from hookEngine */
export type { IntentContext };

/** HookContext is canonical; defined in preToolUse and re-exported here */
export type HookContext = PreHookContext;

export type ToolRequest = {
  toolName: string;
  intentId: string;
  payload?: any;
};

export type ToolResult = {
  success: boolean;
  message?: string;
  data?: any;
};

export type PreToolResult = {
  allowed: boolean;
  reason?: string;
};

// ─── Hook registration types ──────────────────────────────────────────────────

export type PreHook = (event: ToolEvent, context: HookContext) => Promise<boolean>;
export type PostHook = (event: ToolEvent, context: HookContext) => Promise<void>;

// ─── HookEngine class ─────────────────────────────────────────────────────────

export class HookEngine {
  /** Registered pre-tool hooks (tests can inspect this) */
  public preHooks: PreHook[] = [];
  /** Registered post-tool hooks (tests can inspect this) */
  public postHooks: PostHook[] = [];

  constructor() { }

  /** Register a custom pre-tool hook */
  registerPreToolUse(hook: PreHook): void {
    this.preHooks.push(hook);
  }

  /** Register a custom post-tool hook */
  registerPostToolUse(hook: PostHook): void {
    this.postHooks.push(hook);
  }

  /**
   * Executes a tool request through the full middleware pipeline:
   * 1. PreToolUse   — context injection, intent validation
   * 2. Custom pre-hooks
   * 3. Scope validation
   * 4. Concurrency guard
   * 5. Human-in-the-loop approval
   * 6. Tool execution (executor provided by caller to avoid circular import)
   * 7. PostToolUse  — formatting, linting, trace logging
   * 8. Custom post-hooks
   */
  async executeTool(
    event: ToolEvent,
    context: HookContext,
    executor: (event: ToolEvent) => Promise<ToolResult>
  ): Promise<{ success: boolean; reason?: string }> {

    // 1️⃣ PreToolUse: load intent context and build system prompt
    try {
      await preToolUse(event.intentId, context);
    } catch (err: any) {
      console.log(`[HookEngine] PreToolUse failed: ${err.message}`);
      return { success: false, reason: err.message };
    }

    // 2️⃣ Custom pre-hooks (registered externally)
    for (const hook of this.preHooks) {
      const allowed = await hook(event, context);
      if (!allowed) {
        return { success: false, reason: 'Pre-hook blocked execution' };
      }
    }

    // 3️⃣ Scope validation
    const scopeOk = scopeValidator(event, context);
    if (!scopeOk) {
      console.log(`[HookEngine] Scope validation failed`);
      return { success: false, reason: 'Scope violation' };
    }

    // 4️⃣ Concurrency guard
    const concurrencyOk = concurrencyGuard(event, context);
    if (!concurrencyOk) {
      console.log(`[HookEngine] Concurrency conflict detected`);
      return { success: false, reason: 'Concurrency conflict detected' };
    }

    // 5️⃣ Human-in-the-loop approval
    const approved = await approvalGuard(event, context);
    if (!approved) {
      console.log(`[HookEngine] Human approval denied`);
      return { success: false, reason: 'Human approval denied' };
    }

    // 6️⃣ Execute the tool via caller-provided executor (no circular import)
    console.log(`[HookEngine] Executing tool: ${event.toolName}`);
    let toolResult: ToolResult;
    try {
      toolResult = await executor(event);
    } catch (err: any) {
      console.log(`[HookEngine] Tool execution error: ${err.message}`);
      return { success: false, reason: err.message };
    }

    // 7️⃣ PostToolUse: formatting, linting, trace logging
    if (event.payload?.filePath) {
      await postToolUse(event.payload.filePath, context);
    }

    // 8️⃣ Custom post-hooks
    for (const hook of this.postHooks) {
      await hook(event, context);
    }

    return { success: toolResult.success, reason: toolResult.message };
  }
}