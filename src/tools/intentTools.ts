// src/tools/intentTools.ts
import { HookContext, ToolEvent } from "../hooks/hookEngine";

/**
 * Tool registry for intent-related operations
 * Currently only includes `select_active_intent`
 */
export async function selectActiveIntentTool(event: ToolEvent, context: HookContext) {
  // The preToolUse hook will intercept this call and inject the actual intent context
  // This function is mostly a placeholder to register the tool
  return {
    success: true,
    message: "select_active_intent tool called; context will be loaded via hook",
  };
}

/**
 * Add additional intent tools here if needed
 */
export const intentToolsRegistry = {
  select_active_intent: selectActiveIntentTool,
};
