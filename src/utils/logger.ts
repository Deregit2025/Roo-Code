// src/utils/logger.ts
// Shared logger utility for the orchestration pipeline

export interface ILogger {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

class ConsoleLogger implements ILogger {
  private prefix: string;

  constructor(prefix = '[Roo-Orchestration]') {
    this.prefix = prefix;
  }

  info(message: string, ...args: any[]): void {
    console.log(`${this.prefix} [INFO]`, message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`${this.prefix} [WARN]`, message, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(`${this.prefix} [ERROR]`, message, ...args);
  }

  debug(message: string, ...args: any[]): void {
    if (process.env.DEBUG) {
      console.debug(`${this.prefix} [DEBUG]`, message, ...args);
    }
  }
}

/**
 * Singleton logger instance shared across the orchestration pipeline
 */
export const logger: ILogger = new ConsoleLogger();
