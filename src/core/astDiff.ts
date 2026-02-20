// src/core/astDiff.ts
// Semantic mutation classification via structural line-level diff.
// Instead of a full AST parse, we detect structural patterns (function/class/import
// signatures) to classify what kind of mutation occurred.
// This approach works on any TypeScript/JavaScript file without a parser dependency.

// ─── Mutation class enum ──────────────────────────────────────────────────────

export type MutationClass =
    | 'ADD_FUNCTION'
    | 'MODIFY_FUNCTION'
    | 'DELETE_FUNCTION'
    | 'ADD_CLASS'
    | 'MODIFY_CLASS'
    | 'DELETE_CLASS'
    | 'ADD_IMPORT'
    | 'MODIFY_IMPORT'
    | 'DELETE_IMPORT'
    | 'ADD_EXPORT'
    | 'DELETE_EXPORT'
    | 'REFACTOR_BLOCK'
    | 'ADD_TYPE'
    | 'MODIFY_TYPE';

// ─── Structural pattern matchers ──────────────────────────────────────────────

// Patterns that identify structural boundaries
const PATTERNS: Record<string, RegExp> = {
    function: /^\s*(export\s+)?(async\s+)?function\s+\w+/,
    arrow: /^\s*(export\s+)?(const|let)\s+\w+\s*=\s*(async\s+)?\(.*\)\s*=>/,
    method: /^\s*(async\s+)?\w+\s*\(.*\)\s*:\s*\w+/,
    class: /^\s*(export\s+)?class\s+\w+/,
    importStmt: /^\s*import\s+.+from\s+['"].+['"]/,
    exportStmt: /^\s*export\s+(default\s+|type\s+|const\s+|function\s+|class\s+)/,
    typeAlias: /^\s*(export\s+)?type\s+\w+\s*=/,
    interface: /^\s*(export\s+)?interface\s+\w+/,
};

// ─── Line-level diff ─────────────────────────────────────────────────────────

interface DiffChunk {
    added: string[];
    removed: string[];
}

function diffLines(before: string, after: string): DiffChunk {
    const beforeLines = new Set(before.split('\n').map(l => l.trim()).filter(Boolean));
    const afterLines = new Set(after.split('\n').map(l => l.trim()).filter(Boolean));

    const added = [...afterLines].filter(l => !beforeLines.has(l));
    const removed = [...beforeLines].filter(l => !afterLines.has(l));

    return { added, removed };
}

// ─── Classification logic ─────────────────────────────────────────────────────

function matchesAny(line: string, ...keys: string[]): boolean {
    return keys.some(k => PATTERNS[k]?.test(line));
}

function classifyLines(lines: string[], isAdded: boolean): MutationClass[] {
    const mutations = new Set<MutationClass>();

    for (const line of lines) {
        if (matchesAny(line, 'function', 'arrow', 'method')) {
            mutations.add(isAdded ? 'ADD_FUNCTION' : 'DELETE_FUNCTION');
        }
        if (matchesAny(line, 'class')) {
            mutations.add(isAdded ? 'ADD_CLASS' : 'DELETE_CLASS');
        }
        if (matchesAny(line, 'importStmt')) {
            mutations.add(isAdded ? 'ADD_IMPORT' : 'DELETE_IMPORT');
        }
        if (matchesAny(line, 'exportStmt')) {
            mutations.add(isAdded ? 'ADD_EXPORT' : 'DELETE_EXPORT');
        }
        if (matchesAny(line, 'typeAlias', 'interface')) {
            mutations.add(isAdded ? 'ADD_TYPE' : 'MODIFY_TYPE');
        }
    }

    return [...mutations];
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Classify the semantic mutations between two versions of a file's content.
 * Returns a deduplicated array of MutationClass values.
 *
 * @param before - Original file content (empty string for new files)
 * @param after  - Updated file content (empty string for deleted files)
 */
export function classifyMutation(before: string, after: string): MutationClass[] {
    const { added, removed } = diffLines(before, after);

    const addedClasses = classifyLines(added, true);
    const removedClasses = classifyLines(removed, false);

    // Upgrade ADD + DELETE of same category to MODIFY
    const mutations = new Set<MutationClass>([...addedClasses, ...removedClasses]);

    if (mutations.has('ADD_FUNCTION') && mutations.has('DELETE_FUNCTION')) {
        mutations.delete('ADD_FUNCTION');
        mutations.delete('DELETE_FUNCTION');
        mutations.add('MODIFY_FUNCTION');
    }
    if (mutations.has('ADD_CLASS') && mutations.has('DELETE_CLASS')) {
        mutations.delete('ADD_CLASS');
        mutations.delete('DELETE_CLASS');
        mutations.add('MODIFY_CLASS');
    }
    if (mutations.has('ADD_IMPORT') && mutations.has('DELETE_IMPORT')) {
        mutations.delete('ADD_IMPORT');
        mutations.delete('DELETE_IMPORT');
        mutations.add('MODIFY_IMPORT');
    }

    // If only non-structural lines changed (no pattern matched), classify as refactor
    if (mutations.size === 0 && (added.length > 0 || removed.length > 0)) {
        mutations.add('REFACTOR_BLOCK');
    }

    return [...mutations];
}

/**
 * Classify from file content string for a new file (no before content).
 */
export function classifyNewFile(content: string): MutationClass[] {
    return classifyMutation('', content);
}

/**
 * Classify a deleted file.
 */
export function classifyDeletedFile(content: string): MutationClass[] {
    return classifyMutation(content, '');
}
