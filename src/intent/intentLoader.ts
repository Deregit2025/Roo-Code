// src/intent/intentLoader.ts
// Loads and parses active intents from the .orchestration YAML file.

import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import { logger } from '../utils/logger';
import { IntentStatus, VALID_STATUSES } from '../core/intentStatusManager';

export interface Intent {
    id: string;
    description: string;
    status: IntentStatus;
    owned_scope: string[];
    constraints: Record<string, any>;
    acceptance_criteria: string[];
    spec_ref?: string;
}

export interface ActiveIntentsFile {
    active_intent: string;
    intents: Intent[];
}

/**
 * IntentLoader reads and parses active_intents.yaml, providing structured
 * access to all declared intents with full status validation.
 */
export class IntentLoader {
    /**
     * Loads all intents from the given YAML file path.
     * Validates status fields and defaults missing ones to PENDING.
     */
    async loadIntents(filePath: string): Promise<Intent[]> {
        const absolutePath = path.resolve(filePath);

        if (!fs.existsSync(absolutePath)) {
            throw new Error(`Intent file not found: ${absolutePath}`);
        }

        const raw = fs.readFileSync(absolutePath, 'utf-8');
        const parsed = yaml.load(raw) as ActiveIntentsFile;

        if (!parsed || !Array.isArray(parsed.intents)) {
            throw new Error(`Invalid intent file format in: ${absolutePath}`);
        }

        const intents = parsed.intents.map((intent) => {
            // Validate and normalise status
            const status: IntentStatus = VALID_STATUSES.includes(intent.status as IntentStatus)
                ? (intent.status as IntentStatus)
                : 'PENDING';

            if (intent.status && !VALID_STATUSES.includes(intent.status as IntentStatus)) {
                logger.warn(
                    `[IntentLoader] Intent "${intent.id}" has unknown status "${intent.status}". Defaulting to PENDING.`
                );
            }

            return { ...intent, status };
        });

        logger.info(`[IntentLoader] Loaded ${intents.length} intents from ${filePath}`);
        return intents;
    }

    /**
     * Loads a single intent by ID.
     * @throws if not found or if the file cannot be read
     */
    async loadIntent(filePath: string, intentId: string): Promise<Intent> {
        const intents = await this.loadIntents(filePath);
        const found = intents.find((i) => i.id === intentId);

        if (!found) {
            const available = intents
                .filter((i) => i.status === 'PENDING' || i.status === 'IN_PROGRESS')
                .map((i) => `${i.id} (${i.status})`)
                .join(', ');

            throw new Error(
                `Intent "${intentId}" not found in ${filePath}.\n` +
                `  Available PENDING/IN_PROGRESS intents: ${available || '(none)'}\n` +
                `  Tip: choose one of the IDs above and call select_active_intent().`
            );
        }

        return found;
    }

    /**
     * Returns the currently active intent ID declared in the YAML file.
     */
    async getActiveIntentId(filePath: string): Promise<string> {
        const absolutePath = path.resolve(filePath);
        const raw = fs.readFileSync(absolutePath, 'utf-8');
        const parsed = yaml.load(raw) as ActiveIntentsFile;
        return parsed?.active_intent ?? '';
    }

    /**
     * Returns only intents with PENDING or IN_PROGRESS status.
     */
    async getWorkableIntents(filePath: string): Promise<Intent[]> {
        const all = await this.loadIntents(filePath);
        return all.filter((i) => i.status === 'PENDING' || i.status === 'IN_PROGRESS');
    }
}
