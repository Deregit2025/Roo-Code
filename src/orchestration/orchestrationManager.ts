// src/orchestration/orchestrationManager.ts
// Facade used by the VS Code extension to manage orchestration lifecycle.

import * as vscode from 'vscode';
import { OrchestrationService } from './orchestrationService';
import { AgentCoordinator } from './agentCoordinator';
import { KnowledgeManager } from './knowledgeManager';
import { logger } from '../utils/logger';
import * as path from 'path';

/**
 * OrchestrationManager is the top-level entry point used by the VS Code extension.
 * It wires together OrchestrationService, AgentCoordinator, and KnowledgeManager.
 */
export class OrchestrationManager {
    private service: OrchestrationService;
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        const coordinator = new AgentCoordinator();
        const knowledgeManager = new KnowledgeManager();
        this.service = new OrchestrationService(coordinator, knowledgeManager);
    }

    /**
     * Initializes an orchestration session using the .orchestration config folder.
     */
    async initSession(): Promise<void> {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
        const specPath = path.join(workspaceRoot, '.orchestration', 'active_intents.yaml');

        logger.info(`[OrchestrationManager] Initializing session with spec: ${specPath}`);

        await this.service.initializeSession(specPath);

        logger.info('[OrchestrationManager] Session initialized successfully.');
    }

    /**
     * Dispatches a task through the orchestration pipeline.
     */
    async dispatchTask(task: any): Promise<any> {
        return this.service.dispatchTask(task);
    }

    /**
     * Returns the current status of all agents in the pool.
     */
    getStatus() {
        return this.service.getStatus();
    }
}
