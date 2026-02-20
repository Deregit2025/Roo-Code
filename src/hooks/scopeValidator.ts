// src/hooks/scopeValidator.ts
import { HookContext, ToolEvent } from './hookEngine';
import * as path from 'path';

/**
 * scopeValidator
 * - Validates that a file operation is within allowed directories
 * - Uses workspaceRoot and allowedPaths from HookContext (now included in HookContext type)
 */
export function scopeValidator(event: ToolEvent, context: HookContext): boolean {
  const { filePath } = event.payload || {};
  if (!filePath) return false;

  const workspaceRoot = context.workspaceRoot ?? process.cwd();

  // Get absolute path of the target file
  const absolutePath = path.resolve(workspaceRoot, filePath);

  // Allowed paths for the current agent (from intent's owned_scope)
  const allowedPaths = context.allowedPaths ?? context.activeIntent?.owned_scope ?? [];

  // Validate: file must be under one of the allowed paths
  const isAllowed = allowedPaths.some((allowed: string) => {
    // Strip glob wildcards for directory prefix checking
    const cleanAllowed = allowed.replace(/\/\*\*$/, '');
    return absolutePath.startsWith(path.resolve(workspaceRoot, cleanAllowed));
  });

  if (!isAllowed) {
    context.addFeedback(`Scope violation: Agent attempted to modify ${filePath}`);
    return false;
  }

  return true;
}
