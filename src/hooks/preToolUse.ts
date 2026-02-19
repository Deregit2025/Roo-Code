// src/hooks/preToolUse.ts
import { HookContext, ToolEvent } from './hookEngine';
import { loadActiveIntent } from './intentLoader';

export type PreToolUseResult = {
  allowed: boolean;
  reason?: string;
};

/**
 * PreToolUse hook
 * Validates tool commands before execution.
 * - Classifies commands as Safe or Destructive
 * - Blocks unsafe commands
 * - Intercepts select_active_intent tool to inject intent context
 */
export async function preToolUse(
  event: ToolEvent,
  context: HookContext
): Promise<PreToolUseResult> {
  const { type, payload } = event;

  // --- NEW SECTION: Handle select_active_intent ---
  if (type === 'select_active_intent') {
    const activeIntent = loadActiveIntent(context);
    if (!activeIntent) {
      return {
        allowed: false,
        reason: 'Failed to load active intent from .orchestration/active_intents.yaml',
      };
    }

    // Inject the active intent into agent context
    context.activeIntent = activeIntent;
    context.addFeedback(`Active intent ${activeIntent.id} injected successfully`);

    return { allowed: true };
  }

  // --- EXISTING LOGIC: classify destructive commands ---
  const destructiveCommands = ['rm -rf', 'git push --force', 'sudo', 'mv /', 'del /F /Q'];
  const commandStr = payload?.command?.toString() || '';
  const isDestructive = destructiveCommands.some((cmd) => commandStr.includes(cmd));

  if (isDestructive) {
    return {
      allowed: false,
      reason: `Command blocked by PreToolUse: "${commandStr}" classified as destructive`,
    };
  }

  // --- EXISTING LOGIC: optional whitelist ---
  const safeCommands = ['read_file', 'write_file', 'ls', 'echo', 'mkdir'];
  if (!safeCommands.includes(type) && !type.startsWith('customTool')) {
    return {
      allowed: false,
      reason: `Command "${type}" not recognized as safe`,
    };
  }

  // Passed all checks
  return { allowed: true };
}
