// src/utils/gitUtils.ts
// Git integration utilities — provides real commit SHAs for trace entries.
// All functions fall back gracefully if the process is not running in a git repo.

import { execSync } from 'child_process';
import { logger } from './logger';

/**
 * Returns the full 40-character SHA of the current HEAD commit.
 * Falls back to 'unknown' if git is unavailable or not in a repo.
 */
export function getCurrentGitSHA(): string {
    try {
        return execSync('git rev-parse HEAD', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    } catch {
        logger.warn('[gitUtils] Could not resolve HEAD SHA. Not a git repo or git not installed.');
        return 'unknown';
    }
}

/**
 * Returns the git blob SHA of a specific file at the current HEAD.
 * This is the SHA git uses internally to identify file content.
 *
 * @param filePath - Relative or absolute path to the file
 */
export function getFileSHAAtHEAD(filePath: string): string {
    try {
        // git hash-object computes the SHA for the file's current disk content
        return execSync(`git hash-object "${filePath}"`, {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
        }).trim();
    } catch {
        logger.warn(`[gitUtils] Could not compute blob SHA for: ${filePath}`);
        return 'unknown';
    }
}

/**
 * Returns the abbreviated (short) 8-char commit SHA — useful for display.
 */
export function getShortGitSHA(): string {
    const full = getCurrentGitSHA();
    return full === 'unknown' ? 'unknown' : full.slice(0, 8);
}

/**
 * Returns the current git branch name.
 */
export function getCurrentBranch(): string {
    try {
        return execSync('git rev-parse --abbrev-ref HEAD', {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
        }).trim();
    } catch {
        return 'unknown';
    }
}
