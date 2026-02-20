import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
// Fixed: correct import path is src/utils/traceLogger (was src/trace/traceLogger)
import { TraceLogger } from "../src/utils/traceLogger";

const TRACE_FILE = path.resolve(".orchestration/agent_trace.jsonl");

describe("TraceLogger", () => {
  beforeEach(() => {
    if (fs.existsSync(TRACE_FILE)) fs.unlinkSync(TRACE_FILE);
  });

  afterEach(() => {
    if (fs.existsSync(TRACE_FILE)) fs.unlinkSync(TRACE_FILE);
  });

  it("should append a trace record to the JSONL file via log()", () => {
    const logger = new TraceLogger();
    const record = { id: "test1", content: "dummy code block" };
    // Fixed: TraceLogger now has a generic log() method
    logger.log(record);

    const content = fs.readFileSync(TRACE_FILE, "utf-8").trim();
    expect(content).toContain("test1");
    expect(content).toContain("dummy code block");
  });

  it("should append structured trace entries via logTrace()", () => {
    const logger = new TraceLogger();
    logger.logTrace([], "INT-001", "Test prompt");

    const content = fs.readFileSync(TRACE_FILE, "utf-8").trim();
    expect(content).toContain("INT-001");
    expect(content).toContain("Test prompt");
  });

  it("should log file change events via logFileChange()", () => {
    const logger = new TraceLogger();
    logger.logFileChange({
      intentId: "INT-001",
      filePath: "src/auth/user.ts",
      timestamp: new Date().toISOString(),
      notes: "PostToolUse applied",
    });

    const content = fs.readFileSync(TRACE_FILE, "utf-8").trim();
    expect(content).toContain("INT-001");
    expect(content).toContain("src/auth/user.ts");
  });
});
