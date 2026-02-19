# Hook lifecycle

This document describes the lifecycle of hooks used in the Roo-Code ecosystem: how hooks are registered, initialized, executed, and cleaned up. It provides clear phase definitions, common implementation patterns, error-handling guidance, and minimal TypeScript examples.

## Purpose

- **Goal:** Provide authors and integrators a consistent mental model for hook behavior and lifecycle guarantees.
- **Scope:** Extension-host hooks, background workers, and short-lived orchestration hooks used by the extension.

## Lifecycle phases

1. **Registration** — The hook implementation is discovered and registered with the runtime. Registration is a synchronous (or near-synchronous) step that makes the hook available for activation.
2. **Initialization** — The runtime calls an initialization entry to perform one-time setup (e.g., reading settings, creating resources). Initialization should be idempotent and fast.
3. **Activation** — The hook becomes eligible to run. Activation may allocate runtime resources (timers, event listeners) and subscribe to external signals.
4. **Execution** — The hook performs its work in response to triggers. Execution should be short-lived or explicitly offloaded to worker threads/processes when long-running.
5. **Suspension / Pausing (optional)** — Some hooks support temporary suspension (e.g., when the host is suspended or settings change) and later resume.
6. **Disposal / Teardown** — The runtime asks the hook to clean up (remove listeners, free resources). Hooks must reliably free resources to avoid leaks.

These phases may map to concrete lifecycle methods or functions such as `register()`, `init()`, `activate()`, `run()`, and `dispose()` depending on the host API.

## Sequencing guarantees

- Registration happens before initialization.
- Initialization completes before activation.
- Activation completes before the first execution.
- Disposal happens after all in-flight executions are resolved, or the runtime will cancel/abort them and then call disposal.

Note: The runtime may call activation or disposal multiple times across a session (e.g., reloads). Implementations should treat init/activate as idempotent where practical.

## Concurrency and long-running work

- Prefer non-blocking async patterns (Promises/async-await). Do not block the main thread.
- For CPU-bound or long-running tasks, offload to a worker or separate process.
- Use cancellation tokens or abort controllers to make executions cancelable so disposal can terminate in-flight work.

## Error handling

- Surface deterministic errors early during initialization so they can be reported and optionally disable the hook.
- During execution, catch and handle exceptions; where a failure is transient, implement retry/backoff.
- On irrecoverable errors, log and request graceful teardown: stop accepting triggers, finish or cancel running tasks, then dispose.

## Best practices and patterns

- Keep `init()` fast: prefer lazy initialization in `activate()` if initializing is expensive.
- Use a `cachedState` buffer for UI/state edits instead of writing directly to the live host state during user edits (see SettingsView pattern in AGENTS.md).
- Always return a disposable or provide a `dispose()` function to unregister listeners and free resources.
- Document the hook's idempotency and expected threading model.

## Minimal TypeScript example

This shows a simple hook shape and lifecycle methods. Adapt to the host APIs in `src/`.

```ts
// ExampleHook.ts
export interface HookContext {
	onDispose(fn: () => void): void
	logger: { info(...args: any[]): void; error(...args: any[]): void }
}

export class ExampleHook {
	private disposed = false

	constructor(private ctx: HookContext) {}

	// Called once when the hook is registered/initialized.
	async init() {
		this.ctx.logger.info("ExampleHook.init")
		// quick setup
	}

	// Called when the hook is activated and should start listening or scheduling work.
	async activate() {
		this.ctx.logger.info("ExampleHook.activate")
		this.ctx.onDispose(() => this.dispose())
	}

	// The actual work triggered by the host.
	async run(payload: unknown, signal?: AbortSignal) {
		if (this.disposed) throw new Error("Hook disposed")
		// respect cancellation
		if (signal?.aborted) return
		// short-running unit of work
		this.ctx.logger.info("ExampleHook.run", payload)
	}

	// Clean up all resources and listeners.
	dispose() {
		if (this.disposed) return
		this.disposed = true
		this.ctx.logger.info("ExampleHook.dispose")
		// free resources
	}
}
```

## Example registration (host side)

```ts
// host registration pseudo-code
import { ExampleHook } from "./ExampleHook"

const hook = new ExampleHook(ctx)
await hook.init()
await hook.activate()
host.registerHook("example", hook)
```

## Troubleshooting checklist

- If hooks leak memory: ensure `dispose()` removes all listeners and clears timers.
- If hooks don't run: verify registration and activation order; check that init completed successfully.
- If hooks hang on shutdown: ensure long-running tasks check an `AbortSignal` and terminate promptly.

## Further reading

- See runtime APIs in `src/` for concrete host hook interfaces and conventions.

---

Updated: concise lifecycle, examples, and best practices for hook authors.
