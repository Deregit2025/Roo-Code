// src/core/intentTools.ts
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { logger } from '../utils/logger';

export interface Intent {
  id: string;
  name: string;
  status: string;
  owned_scope: string[];
  constraints: string[];
  acceptance_criteria: string[];
}

// Path to the orchestration folder
const ORCHESTRATION_DIR = path.join(process.cwd(), '.orchestration');
const ACTIVE_INTENTS_FILE = path.join(ORCHESTRATION_DIR, 'active_intents.yaml');

/**
 * Reads the active intents from active_intents.yaml
 */
export function getActiveIntents(): Intent[] {
  try {
    const fileContents = fs.readFileSync(ACTIVE_INTENTS_FILE, 'utf8');
    const data = yaml.load(fileContents) as { active_intents: Intent[] };
    return data?.active_intents || [];
  } catch (error) {
    logger.error('Failed to read active_intents.yaml:', error);
    return [];
  }
}

/**
 * Select an active intent by ID
 * Throws an error if the intent is not found
 */
export function selectActiveIntent(intentId: string): Intent {
  const intents = getActiveIntents();
  const intent = intents.find((i) => i.id === intentId);
  if (!intent) {
    throw new Error(`Intent ${intentId} not found in active_intents.yaml`);
  }
  logger.info(`Selected active intent: ${intentId} - ${intent.name}`);
  return intent;
}

/**
 * Helper: Check if a file path is within the intent's owned scope
 */
export function isFileInIntentScope(intent: Intent, filePath: string): boolean {
  return intent.owned_scope.some((pattern) => {
    // Basic glob-like match for demonstration
    if (pattern.endsWith('/**')) {
      const dir = pattern.replace('/**', '');
      return filePath.startsWith(dir);
    }
    return filePath === pattern;
  });
}