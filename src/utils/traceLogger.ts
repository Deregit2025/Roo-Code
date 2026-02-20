// src/utils/traceLogger.ts
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export interface TraceFileRange {
  startLine: number;
  endLine: number;
  contentHash: string;
}

export interface TraceFileEntry {
  relativePath: string;
  ranges: TraceFileRange[];
  related: { type: string; value: string }[];
}

export interface AgentTraceEntry {
  id: string;
  timestamp: string;
  vcs?: { revision_id: string };
  files: TraceFileEntry[];
  promptText?: string;
  intentId?: string;
}

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

  /**
   * Generate SHA-256 hash of a string
   */
  hashContent(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  }

  /**
   * Generic log method — appends any object as a JSONL line.
   * Used by tests and general-purpose trace recording.
   */
  log(record: Record<string, any>): void {
    const entry = { ...record, timestamp: record.timestamp ?? new Date().toISOString() };
    fs.appendFileSync(this.traceFilePath, JSON.stringify(entry) + '\n');
  }

  /**
   * Append a structured agent trace entry (files changed, intent, prompt)
   */
  logTrace(files: TraceFileEntry[], intentId?: string, promptText?: string): void {
    const entry: AgentTraceEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      files,
      intentId,
      promptText,
    };
    fs.appendFileSync(this.traceFilePath, JSON.stringify(entry) + '\n');
  }

  /**
   * Log a prompt as an initial trace entry.
   * Accepts { id, intentId, context, promptText } — intentId is the canonical field name.
   */
  logPrompt(prompt: { id: string; intentId: string; context: any; promptText: string }): void {
    const entry: AgentTraceEntry = {
      id: prompt.id,
      timestamp: new Date().toISOString(),
      files: [],
      intentId: prompt.intentId,
      promptText: prompt.promptText,
    };
    fs.appendFileSync(this.traceFilePath, JSON.stringify(entry) + '\n');
  }

  /**
   * Log a file change event — used by postToolUse hook.
   */
  logFileChange(event: { intentId: string; filePath: string; timestamp: string; notes: string }): void {
    const entry: AgentTraceEntry = {
      id: uuidv4(),
      timestamp: event.timestamp,
      files: [
        {
          relativePath: event.filePath,
          ranges: [],
          related: [{ type: 'note', value: event.notes }],
        },
      ],
      intentId: event.intentId,
    };
    fs.appendFileSync(this.traceFilePath, JSON.stringify(entry) + '\n');
  }

  /**
   * Helper: create a TraceFileEntry from actual file content
   */
  createFileTrace(
    relativePath: string,
    content: string,
    startLine = 1,
    endLine?: number,
    relatedSpec?: string
  ): TraceFileEntry {
    const lines = content.split('\n');
    const end = endLine || lines.length;
    const contentHash = this.hashContent(lines.slice(startLine - 1, end).join('\n'));

    return {
      relativePath,
      ranges: [{ startLine, endLine: end, contentHash }],
      related: relatedSpec ? [{ type: 'specification', value: relatedSpec }] : [],
    };
  }
}