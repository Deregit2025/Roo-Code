import * as vscode from 'vscode';
import { HookContext, ToolEvent } from './hookEngine';

/**
 * approvalGuard
 * - Pauses execution for destructive commands
 * - Prompts the user to Approve or Reject
 * - commandType is read from event.payload.commandType (not a top-level ToolEvent field)
 */
export async function approvalGuard(event: ToolEvent, context: HookContext): Promise<boolean> {
  const commandType: string | undefined = event.payload?.commandType;
  const command: string | undefined = event.payload?.command;

  // Only prompt for destructive commands
  if (commandType !== 'destructive') return true;

  const message = `The agent is attempting a destructive operation: ${command || 'unknown'}.\nDo you approve?`;

  const approve = 'Approve';
  const reject = 'Reject';

  const selection = await vscode.window.showWarningMessage(message, { modal: true }, approve, reject);

  if (selection === approve) {
    context.addFeedback(`User approved command: ${command}`);
    return true;
  } else {
    context.addFeedback(`User rejected command: ${command}`);
    return false;
  }
}
