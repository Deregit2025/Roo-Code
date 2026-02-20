// src/hooks/preToolUse.ts
import { PromptBuilder } from '../core/promptBuilder';
import { IntentLoader } from '../intent/intentLoader';
import { IntentStatus } from '../core/intentStatusManager';
import { logger } from '../utils/logger';

export type IntentContext = {
  id: string;
  name: string;
  status: IntentStatus;
  owned_scope: string[];
  constraints: string[];
  acceptance_criteria: string[];
  spec_ref?: string;
};

export type HookContext = {
  activeIntent?: IntentContext;
  promptBuilder: PromptBuilder;
  workspaceRoot: string;
  allowedPaths: string[];
  addFeedback: (msg: string) => void;
};

// Context size limits
const MAX_SCOPE_ENTRIES = 10;
const MAX_CONSTRAINTS = 20;
const MAX_CRITERIA = 15;

/**
 * PreToolUse hook
 * 1. Loads intent from active_intents.yaml via IntentLoader (js-yaml)
 * 2. Guards against LOCKED/COMPLETED intents with guided recovery
 * 3. Applies context size controls (trims oversized arrays, warns)
 * 4. Injects context into HookContext and builds the system prompt
 */
export async function preToolUse(intentId: string, context: HookContext): Promise<string> {
  const activeIntentsPath = `${context.workspaceRoot}/.orchestration/active_intents.yaml`;
  const loader = new IntentLoader();

  let activeIntentContext: IntentContext;

  try {
    // ── Load and validate intent ──────────────────────────────────────────────
    const intent = await loader.loadIntent(activeIntentsPath, intentId);

    // ── Status guard ─────────────────────────────────────────────────────────
    if (intent.status === 'COMPLETED') {
      const workable = await loader.getWorkableIntents(activeIntentsPath);
      const ids = workable.map((i) => `${i.id} (${i.status})`).join(', ');
      throw new Error(
        `Intent "${intentId}" is COMPLETED — no further changes allowed.\n` +
        `  Available intents to work on: ${ids || '(none)'}`
      );
    }
    if (intent.status === 'LOCKED') {
      throw new Error(
        `Intent "${intentId}" is LOCKED. Please contact the project owner to unlock it.`
      );
    }

    // ── Context size controls ─────────────────────────────────────────────────
    let owned_scope = intent.owned_scope ?? [];
    let constraints = Object.keys(intent.constraints ?? {});
    let criteria = intent.acceptance_criteria ?? [];

    if (owned_scope.length > MAX_SCOPE_ENTRIES) {
      logger.warn(`[preToolUse] Intent "${intentId}" owned_scope has ${owned_scope.length} entries — trimming to ${MAX_SCOPE_ENTRIES}.`);
      owned_scope = owned_scope.slice(0, MAX_SCOPE_ENTRIES);
    }
    if (constraints.length > MAX_CONSTRAINTS) {
      logger.warn(`[preToolUse] Intent "${intentId}" has ${constraints.length} constraints — trimming to ${MAX_CONSTRAINTS}.`);
      constraints = constraints.slice(0, MAX_CONSTRAINTS);
    }
    if (criteria.length > MAX_CRITERIA) {
      logger.warn(`[preToolUse] Intent "${intentId}" has ${criteria.length} acceptance criteria — trimming to ${MAX_CRITERIA}.`);
      criteria = criteria.slice(0, MAX_CRITERIA);
    }

    // ── Build intent context ──────────────────────────────────────────────────
    activeIntentContext = {
      id: intent.id,
      name: intent.description,
      status: intent.status,
      owned_scope,
      constraints,
      acceptance_criteria: criteria,
      spec_ref: intent.spec_ref,
    };

    // Update context for downstream hooks (scopeValidator, approvalGuard, etc.)
    context.activeIntent = activeIntentContext;
    context.allowedPaths = owned_scope;

  } catch (error: any) {
    context.addFeedback(`[PreToolUse] Error: ${error.message}`);
    throw error;
  }

  // ── Build system prompt ───────────────────────────────────────────────────
  const agentPrompt = context.promptBuilder.buildPrompt(intentId, activeIntentContext);
  logger.info(`[preToolUse] Loaded intent "${intentId}" (${activeIntentContext.status}). Prompt built.`);
  return agentPrompt.promptText;
}