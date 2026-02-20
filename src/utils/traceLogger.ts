// src/utils/traceLogger.ts
// Append-only agent trace ledger with:
//   - Real git SHA in vcs.revision_id (via gitUtils)
//   - Semantic mutation classes (via astDiff)
//   - Requirement/spec related IDs for full auditability

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentGitSHA } from './gitUtils';
import { MutationClass, classifyMutation } from '../core/astDiff';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TraceFileRange {
  startLine: number;
  endLine: number;
  contentHash: string;
}

export interface TraceRelated {
  type: 'specification' | 'requirement' | 'note' | 'spec_ref';
  value: string;
}

export interface TraceFileEntry {
  relativePath: string;
  mutationClasses: MutationClass[];
  ranges: TraceFileRange[];
  related: TraceRelated[];
}

export interface AgentTraceEntry {
  id: string;
  timestamp: string;
  vcs: { revision_id: string };
  intentId?: string;
  files: TraceFileEntry[];
  promptText?: string;
}

// ─── TraceLogger class ────────────────────────────────────────────────────────

export class TraceLogger {
  private traceFilePath: string;

  constructor() {
    const orchestrationDir = path.resolve('.orchestration');
    if (!fs.existsSync(orchestrationDir)) {
      fs.mkdirSync(orchestrationDir, { recursive: true });
    }
    this.traceFilePath = path.join(orchestrationDir, 'agent_trace.jsonl');
    if (!fs.existsSync(this.traceFilePath)) {
      fs.writeFileSync(this.traceFilePath, '');
    }
  }

  /** SHA-256 hash of a string */
  hashContent(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  }

  /** Append any record as a JSONL line (generic — used by tests) */
  log(record: Record<string, any>): void {
    const entry = {
      ...record,
      vcs: record.vcs ?? { revision_id: getCurrentGitSHA() },
      timestamp: record.timestamp ?? new Date().toISOString(),
    };
    fs.appendFileSync(this.traceFilePath, JSON.stringify(entry) + '\n');
  }

  /**
   * Append a structured agent trace entry.
   * vcs.revision_id is automatically set to the current git SHA.
   */
  logTrace(files: TraceFileEntry[], intentId?: string, promptText?: string): void {
    const entry: AgentTraceEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      vcs: { revision_id: getCurrentGitSHA() },
      intentId,
      files,
      promptText,
    };
    fs.appendFileSync(this.traceFilePath, JSON.stringify(entry) + '\n');
  }

  /**
   * Log the system prompt built for an intent session.
   */
  logPrompt(prompt: { id: string; intentId: string; context: any; promptText: string }): void {
    const entry: AgentTraceEntry = {
      id: prompt.id,
      timestamp: new Date().toISOString(),
      vcs: { revision_id: getCurrentGitSHA() },
      intentId: prompt.intentId,
      files: [],
      promptText: prompt.promptText,
    };
    fs.appendFileSync(this.traceFilePath, JSON.stringify(entry) + '\n');
  }

  /**
   * Log a file change with:
   *   - Automatic git SHA in vcs.revision_id
   *   - Semantic mutation classes (computed from before/after if provided)
   *   - Related requirement / spec IDs
   */
  logFileChange(event: {
    intentId: string;
    filePath: string;
    timestamp: string;
    notes: string;
    before?: string;
    after?: string;
    specRefs?: string[];
    requirementIds?: string[];
  }): void {
    const mutationClasses: MutationClass[] =
      event.before !== undefined && event.after !== undefined
        ? classifyMutation(event.before, event.after)
        : [];

    const related: TraceRelated[] = [
      { type: 'note', value: event.notes },
      ...(event.specRefs ?? []).map((v) => ({ type: 'spec_ref' as const, value: v })),
      ...(event.requirementIds ?? []).map((v) => ({ type: 'requirement' as const, value: v })),
    ];

    const fileEntry: TraceFileEntry = {
      relativePath: event.filePath,
      mutationClasses,
      ranges: [],
      related,
    };

    const entry: AgentTraceEntry = {
      id: uuidv4(),
      timestamp: event.timestamp,
      vcs: { revision_id: getCurrentGitSHA() },
      intentId: event.intentId,
      files: [fileEntry],
    };

    fs.appendFileSync(this.traceFilePath, JSON.stringify(entry) + '\n');
  }

  /**
   * Create a full TraceFileEntry from before/after file content.
   * Computes mutation classes and content hash automatically.
   */
  createFileTrace(
    relativePath: string,
    before: string,
    after: string,
    startLine = 1,
    endLine?: number,
    specRefs?: string[],
    requirementIds?: string[]
  ): TraceFileEntry {
    const lines = after.split('\n');
    const end = endLine || lines.length;
    const contentHash = this.hashContent(lines.slice(startLine - 1, end).join('\n'));

    const mutationClasses = classifyMutation(before, after);

    const related: TraceRelated[] = [
      ...(specRefs ?? []).map((v) => ({ type: 'spec_ref' as const, value: v })),
      ...(requirementIds ?? []).map((v) => ({ type: 'requirement' as const, value: v })),
    ];

    return {
      relativePath,
      mutationClasses,
      ranges: [{ startLine, endLine: end, contentHash }],
      related,
    };
  }
}