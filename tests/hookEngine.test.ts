import { describe, it, expect, vi } from "vitest";
import { HookEngine } from "../src/hooks/hookEngine";

describe("HookEngine", () => {
  it("should instantiate without errors", () => {
    const hookEngine = new HookEngine();
    expect(hookEngine).toBeInstanceOf(HookEngine);
  });

  it("should register a preToolUse hook and track it in preHooks", () => {
    const hookEngine = new HookEngine();
    const mockHook = vi.fn().mockResolvedValue(true);
    hookEngine.registerPreToolUse(mockHook);
    // preHooks is a public array, now properly defined on HookEngine
    expect(hookEngine.preHooks.length).toBe(1);
  });

  it("should register a postToolUse hook and track it in postHooks", () => {
    const hookEngine = new HookEngine();
    const mockHook = vi.fn().mockResolvedValue(undefined);
    hookEngine.registerPostToolUse(mockHook);
    // postHooks is a public array, now properly defined on HookEngine
    expect(hookEngine.postHooks.length).toBe(1);
  });

  it("should accumulate multiple pre-hooks", () => {
    const hookEngine = new HookEngine();
    hookEngine.registerPreToolUse(vi.fn().mockResolvedValue(true));
    hookEngine.registerPreToolUse(vi.fn().mockResolvedValue(true));
    expect(hookEngine.preHooks.length).toBe(2);
  });
});
