// src/core/toolExecutor.ts
// Executes agent tools using the HookEngine pipeline.
// Imports types from hookEngine but does NOT import HookEngine class
// (the caller wires up the pipeline) — this breaks the circular dependency.

import { buildSystemPrompt } from './promptBuilder';
import { IntentContext, ToolRequest, ToolResult, HookContext } from '../hooks/hookEngine';
import { preToolUse } from '../hooks/preToolUse';
import { postToolUse } from '../hooks/postToolUse';
import { logger } from '../utils/logger';
import { PromptBuilder } from './promptBuilder';
import * as vscode from 'vscode';

/**
 * Executes a tool requested by the AI agent.
 * Wraps execution with preToolUse and postToolUse hooks directly,
 * without going back through HookEngine (avoids circular import).
 */
export async function executeTool(toolRequest: ToolRequest): Promise<ToolResult> {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();

  // Build a minimal HookContext for standalone use
  const feedback: string[] = [];
  const context: HookContext = {
    promptBuilder: new PromptBuilder(),
    workspaceRoot,
    allowedPaths: [],
    addFeedback: (msg) => feedback.push(msg),
  };

  try {
    // 1️⃣ Pre-hook: load intent context and build system prompt
    await preToolUse(toolRequest.intentId, context);

    // 2️⃣ Build system prompt from loaded intent context
    const systemPrompt = buildSystemPrompt(context.activeIntent);
    logger.info('System Prompt sent to agent:\n', systemPrompt);

    // 3️⃣ Execute the tool (integrate with real AI agent API here)
    const result: ToolResult = await simulateAgentTool(toolRequest, context.activeIntent ?? null);

    // 4️⃣ Post-hook: format, lint, trace log
    if (toolRequest.payload?.filePath) {
      await postToolUse(toolRequest.payload.filePath, context);
    }

    return result;
  } catch (error) {
    logger.error('Tool execution failed:', error);
    return { success: false, message: (error as Error).message };
  }
}

/**
 * Simulated agent tool execution.
 * Replace this with real AI agent / MCP integration.
 */
async function simulateAgentTool(
  toolRequest: ToolRequest,
  intentContext: IntentContext | null
): Promise<ToolResult> {
  logger.info(`Executing tool: ${toolRequest.toolName} for intent: ${intentContext?.id}`);
  await new Promise((resolve) => setTimeout(resolve, 200));

  return {
    success: true,
    message: `Tool ${toolRequest.toolName} executed successfully.`,
    data: {},
  };
}