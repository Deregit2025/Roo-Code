// src/core/promptBuilder.ts
import { v4 as uuidv4 } from 'uuid';
import { TraceLogger } from '../utils/traceLogger';
import { IntentContext } from '../hooks/preToolUse';

export type PromptContext = {
  sessionId?: string;
  user?: string;
  previousActions?: any[];
  [key: string]: any;
};

export type AgentPrompt = {
  id: string;
  intentId: string;
  context: PromptContext;
  timestamp: string;
  promptText: string;
};

export class PromptBuilder {
  private traceLogger: TraceLogger;

  constructor() {
    this.traceLogger = new TraceLogger();
  }

  /**
   * Build the system prompt string including intent context
   * and log the structured prompt for traceability.
   */
  buildPrompt(intentId: string, activeIntentContext?: IntentContext, context: PromptContext = {}): AgentPrompt {
    const sessionId = context.sessionId || uuidv4();
    const timestamp = new Date().toISOString();

    const promptText = this.buildSystemPrompt(activeIntentContext, context);

    const agentPrompt: AgentPrompt = {
      id: sessionId,
      intentId,
      context: { ...context, sessionId },
      timestamp,
      promptText,
    };

    // Log to agent_trace.jsonl — use intentId (not intent) to match TraceLogger.logPrompt signature
    this.traceLogger.logPrompt({
      id: agentPrompt.id,
      intentId: agentPrompt.intentId,
      context: agentPrompt.context,
      promptText: agentPrompt.promptText,
    });

    return agentPrompt;
  }

  private buildSystemPrompt(activeIntentContext?: IntentContext, context?: PromptContext): string {
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

    const previousActionsBlock =
      context?.previousActions && context.previousActions.length > 0
        ? 'Previous Actions:\n' +
        context.previousActions.map((a, i) => `${i + 1}. ${JSON.stringify(a)}`).join('\n')
        : '';

    const closingInstructions = `
After calling select_active_intent and loading the context,
proceed with your actions respecting the scope and constraints.
Always log your actions to the Agent Trace system.
`;

    return `${baseInstructions}${contextBlock}${previousActionsBlock}\n${closingInstructions}`;
  }
}

/**
 * Convenience standalone export: build a system prompt string directly.
 * Used by toolExecutor.ts for quick prompt generation.
 */
export function buildSystemPrompt(activeIntentContext?: IntentContext, context?: PromptContext): string {
  const builder = new PromptBuilder();
  const dummyId = activeIntentContext?.id ?? 'unknown';
  const result = builder.buildPrompt(dummyId, activeIntentContext, context ?? {});
  return result.promptText;
}