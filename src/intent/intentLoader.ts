// src/intent/intentLoader.ts
// Loads and parses active intents from the .orchestration YAML file.

import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import { logger } from '../utils/logger';

export interface Intent {
    id: string;
    description: string;
    owned_scope: string[];
    constraints: Record<string, any>;
    acceptance_criteria?: string[];
}

export interface ActiveIntentsFile {
    active_intent: string;
    intents: Intent[];
}

/**
 * IntentLoader reads and parses the active_intents.yaml file,
 * providing structured access to all declared intents.
 */
export class IntentLoader {
    /**
     * Loads all intents from the given YAML file path.
     * @param filePath Relative or absolute path to active_intents.yaml
     * @returns Array of Intent objects
     * @throws Error if the file cannot be read or parsed
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

        logger.info(`[IntentLoader] Loaded ${parsed.intents.length} intents from ${filePath}`);
        return parsed.intents;
    }

    /**
     * Loads a single intent by ID.
     * @param filePath Path to active_intents.yaml
     * @param intentId Intent ID to find
     */
    async loadIntent(filePath: string, intentId: string): Promise<Intent> {
        const intents = await this.loadIntents(filePath);
        const found = intents.find((i) => i.id === intentId);
        if (!found) {
            throw new Error(`Intent "${intentId}" not found in ${filePath}`);
        }
        return found;
    }

    /**
     * Returns the currently active intent ID from the YAML file.
     */
    async getActiveIntentId(filePath: string): Promise<string> {
        const absolutePath = path.resolve(filePath);
        const raw = fs.readFileSync(absolutePath, 'utf-8');
        const parsed = yaml.load(raw) as ActiveIntentsFile;
        return parsed?.active_intent ?? '';
    }
}
