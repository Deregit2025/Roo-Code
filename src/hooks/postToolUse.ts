// src/hooks/postToolUse.ts
import { HookContext, IntentContext } from './preToolUse';
import { exec } from 'child_process';
import { promisify } from 'util';
import { TraceLogger } from '../utils/traceLogger';

const execAsync = promisify(exec);

/**
 * PostToolUse hook
 * - Runs after the agent executes a tool
 * - Formats, lints, and optionally runs security checks
 * - Logs all changes to the Agent Trace system via TraceLogger.logFileChange()
 */
export async function postToolUse(filePath: string, context: HookContext): Promise<void> {
  if (!filePath) return;

  const traceLogger = new TraceLogger();
  const intent: IntentContext | undefined = context.activeIntent;

  try {
    // 1. Run Prettier to format code
    await execAsync(`npx prettier --write "${filePath}"`);

    // 2. Run ESLint for linting and auto-fixes
    const { stdout, stderr } = await execAsync(`npx eslint "${filePath}" --fix`);
    if (stderr) {
      context.addFeedback(`ESLint issues in ${filePath}: ${stderr}`);
    } else if (stdout) {
      context.addFeedback(`ESLint applied fixes to ${filePath}: ${stdout}`);
    }

    // 3. Log to agent trace using logFileChange (now properly defined in TraceLogger)
    if (intent) {
      traceLogger.logFileChange({
        intentId: intent.id,
        filePath,
        timestamp: new Date().toISOString(),
        notes: `PostToolUse completed for ${filePath}`,
      });
    }
  } catch (error: any) {
    context.addFeedback(`PostToolUse error for ${filePath}: ${error.message}`);
  }
}