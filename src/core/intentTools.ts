// src/core/intentTools.ts
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { logger } from '../utils/logger';
import { IntentStatus, VALID_STATUSES, guardIntent, markInProgress } from './intentStatusManager';

export interface Intent {
  id: string;
  description: string;
  status: IntentStatus;
  owned_scope: string[];
  constraints: Record<string, any>;
  acceptance_criteria: string[];
  spec_ref?: string;
}

// Path to the orchestration folder
const ORCHESTRATION_DIR = path.join(process.cwd(), '.orchestration');
const ACTIVE_INTENTS_FILE = path.join(ORCHESTRATION_DIR, 'active_intents.yaml');

/**
 * Reads all intents from active_intents.yaml.
 * Normalises status to a valid IntentStatus (defaults to PENDING).
 */
export function getActiveIntents(): Intent[] {
  try {
    const fileContents = fs.readFileSync(ACTIVE_INTENTS_FILE, 'utf8');
    const data = yaml.load(fileContents) as { intents: Intent[] };
    const intents = data?.intents || [];

    return intents.map((i) => ({
      ...i,
      status: VALID_STATUSES.includes(i.status) ? i.status : 'PENDING',
    }));
  } catch (error) {
    logger.error('Failed to read active_intents.yaml:', error);
    return [];
  }
}

/**
 * Select an active intent by ID.
 * - Guards against COMPLETED and LOCKED intents with guided recovery messages.
 * - Automatically transitions PENDING → IN_PROGRESS on first selection.
 * - Throws with a recovery hint listing available PENDING/IN_PROGRESS IDs if not found.
 */
export function selectActiveIntent(intentId: string): Intent {
  const intents = getActiveIntents();
  const allIds = intents.map((i) => i.id);

  // Throws with recovery message if not found, LOCKED, or COMPLETED
  const status = guardIntent(intentId, allIds);

  const intent = intents.find((i) => i.id === intentId)!;

  // Auto-transition PENDING → IN_PROGRESS when agent begins working
  if (status === 'PENDING') {
    markInProgress(intentId);
    logger.info(`[intentTools] Intent ${intentId} automatically transitioned PENDING → IN_PROGRESS`);
  }

  logger.info(`[intentTools] Selected intent: ${intentId} (${intent.description}) — status: ${intent.status}`);
  return intent;
}

/**
 * Returns only the intents an agent is allowed to work on.
 * Excludes COMPLETED and LOCKED intents.
 */
export function getWorkableIntents(): Intent[] {
  return getActiveIntents().filter((i) => i.status === 'PENDING' || i.status === 'IN_PROGRESS');
}

/**
 * Check if a file path is within the intent's owned scope.
 * Supports glob patterns ending in /** .
 */
export function isFileInIntentScope(intent: Intent, filePath: string): boolean {
  return intent.owned_scope.some((pattern) => {
    if (pattern.endsWith('/**')) {
      const dir = pattern.replace('/**', '');
      return filePath.startsWith(dir);
    }
    return filePath === pattern;
  });
}