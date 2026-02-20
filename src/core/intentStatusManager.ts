// src/core/intentStatusManager.ts
// Manages the intent lifecycle state machine.
// Legal transitions: PENDING → IN_PROGRESS → COMPLETED | LOCKED
// LOCKED and COMPLETED intents block all tool execution.

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { logger } from '../utils/logger';

// ─── Status enum ─────────────────────────────────────────────────────────────

export type IntentStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'LOCKED';

export const VALID_STATUSES: IntentStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'LOCKED'];

/** Legal forward transitions */
const ALLOWED_TRANSITIONS: Record<IntentStatus, IntentStatus[]> = {
    PENDING: ['IN_PROGRESS'],
    IN_PROGRESS: ['COMPLETED', 'LOCKED'],
    COMPLETED: [],   // terminal state
    LOCKED: [],   // terminal state — requires manual override
};

// ─── Paths ───────────────────────────────────────────────────────────────────

const ORCHESTRATION_DIR = path.resolve('.orchestration');
const ACTIVE_INTENTS_FILE = path.join(ORCHESTRATION_DIR, 'active_intents.yaml');

// ─── Internal helpers ─────────────────────────────────────────────────────────

function loadRaw(): any {
    const content = fs.readFileSync(ACTIVE_INTENTS_FILE, 'utf-8');
    return yaml.load(content) as any;
}

function saveRaw(data: any): void {
    fs.writeFileSync(ACTIVE_INTENTS_FILE, yaml.dump(data, { lineWidth: 120 }), 'utf-8');
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the current status of an intent.
 * Defaults to 'PENDING' if the field is missing.
 */
export function getIntentStatus(intentId: string): IntentStatus {
    const data = loadRaw();
    const intent = (data.intents as any[]).find((i: any) => i.id === intentId);
    if (!intent) throw new Error(`Intent "${intentId}" not found.`);
    return (intent.status as IntentStatus) ?? 'PENDING';
}

/**
 * Transitions an intent from one status to another.
 * Throws if the transition is not allowed by the state machine.
 */
export function transitionStatus(intentId: string, to: IntentStatus): void {
    const data = loadRaw();
    const intent = (data.intents as any[]).find((i: any) => i.id === intentId);
    if (!intent) throw new Error(`Intent "${intentId}" not found.`);

    const from: IntentStatus = intent.status ?? 'PENDING';

    if (!ALLOWED_TRANSITIONS[from].includes(to)) {
        throw new Error(
            `[IntentStatusManager] Illegal transition for ${intentId}: ${from} → ${to}. ` +
            `Allowed transitions from ${from}: [${ALLOWED_TRANSITIONS[from].join(', ') || 'none'}]`
        );
    }

    intent.status = to;
    saveRaw(data);
    logger.info(`[IntentStatusManager] ${intentId}: ${from} → ${to}`);
}

/**
 * Guards execution: throws a structured, recovery-guiding error
 * if the intent is COMPLETED or LOCKED.
 * Returns the status so callers can branch on IN_PROGRESS vs PENDING.
 */
export function guardIntent(intentId: string, availableIds: string[]): IntentStatus {
    let status: IntentStatus;

    try {
        status = getIntentStatus(intentId);
    } catch {
        const pending = availableIds.filter((id) => {
            try { return ['PENDING', 'IN_PROGRESS'].includes(getIntentStatus(id)); }
            catch { return false; }
        });
        throw new Error(
            `[IntentStatusManager] Intent "${intentId}" not found.\n` +
            `  Available PENDING / IN_PROGRESS intents: ${pending.join(', ') || '(none)'}\n` +
            `  Tip: call select_active_intent() with one of the IDs above.`
        );
    }

    if (status === 'COMPLETED') {
        throw new Error(
            `[IntentStatusManager] Intent "${intentId}" is COMPLETED and cannot be re-executed.\n` +
            `  To reopen, manually change its status to PENDING in active_intents.yaml.`
        );
    }

    if (status === 'LOCKED') {
        throw new Error(
            `[IntentStatusManager] Intent "${intentId}" is LOCKED due to a conflict or admin hold.\n` +
            `  Contact the project owner to unlock this intent.`
        );
    }

    return status;
}

/**
 * Automatically transition intent to IN_PROGRESS when work begins.
 * No-op if already IN_PROGRESS.
 */
export function markInProgress(intentId: string): void {
    const status = getIntentStatus(intentId);
    if (status === 'PENDING') {
        transitionStatus(intentId, 'IN_PROGRESS');
    }
}

/**
 * Mark intent as COMPLETED once all acceptance criteria are satisfied.
 */
export function markCompleted(intentId: string): void {
    transitionStatus(intentId, 'COMPLETED');
}

/**
 * Lock an intent to prevent any further changes (e.g. after a merge conflict).
 */
export function lockIntent(intentId: string): void {
    transitionStatus(intentId, 'LOCKED');
}
