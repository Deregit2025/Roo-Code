// src/core/promptBuilder.ts
import { IntentContext } from '../hooks/preToolUse'; // The type returned by preToolUse/context injection

/**
 * Builds the system prompt for the AI agent.
 * Ensures the agent knows it must call select_active_intent first,
 * and includes any active intent context.
 */
export function buildSystemPrompt(activeIntentContext?: IntentContext): string {
  const baseInstructions = `
You are an Intent-Driven Architect AI.
Your first action MUST be to call select_active_intent(intent_id) to load the required context.
You CANNOT write code directly without referencing a valid Intent ID.
Follow all constraints provided in the intent context.
Use only the tools allowed in this workspace.
`;

  const contextBlock = activeIntentContext
    ? `
<IntentContext>
  ID: ${activeIntentContext.id}
  Name: ${activeIntentContext.name}
  Scope: ${activeIntentContext.owned_scope.join(', ')}
  Constraints: ${activeIntentContext.constraints.join('; ')}
  Acceptance Criteria: ${activeIntentContext.acceptance_criteria.join('; ')}
</IntentContext>
`
    : '';

  const closingInstructions = `
After calling select_active_intent and loading the context,
proceed with your actions respecting the scope and constraints.
Always log your actions to the Agent Trace system.
`;

  return `${baseInstructions}${contextBlock}${closingInstructions}`;
}