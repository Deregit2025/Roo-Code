// src/hooks/preToolUse.ts
import { PromptBuilder, PromptContext } from '../core/promptBuilder';
import { IntentLoader } from '../intent/intentLoader';

export type IntentContext = {
  id: string;
  name: string;
  owned_scope: string[];
  constraints: string[];
  acceptance_criteria: string[];
};

export type HookContext = {
  activeIntent?: IntentContext;
  promptBuilder: PromptBuilder;
  workspaceRoot: string;
  allowedPaths: string[];
  addFeedback: (msg: string) => void;
};

/**
 * PreToolUse hook
 * - Intercepts the tool execution BEFORE the agent runs
 * - Ensures the agent calls select_active_intent
 * - Injects context from active_intents.yaml using js-yaml via IntentLoader
 */
export async function preToolUse(intentId: string, context: HookContext): Promise<string> {
  const activeIntentsPath = `${context.workspaceRoot}/.orchestration/active_intents.yaml`;

  const loader = new IntentLoader();
  let activeIntentContext: IntentContext;

  try {
    const intent = await loader.loadIntent(activeIntentsPath, intentId);

    activeIntentContext = {
      id: intent.id,
      name: intent.description,
      owned_scope: intent.owned_scope,
      constraints: Object.keys(intent.constraints),
      acceptance_criteria: intent.acceptance_criteria || [],
    };

    context.activeIntent = activeIntentContext;
  } catch (error: any) {
    context.addFeedback(`PreToolUse error: ${error.message}`);
    throw error;
  }

  // Build system prompt using PromptBuilder
  const agentPrompt = context.promptBuilder.buildPrompt(intentId, activeIntentContext);
  return agentPrompt.promptText;
}