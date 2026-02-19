// src/hooks/intentLoader.ts
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { HookContext } from "./hookEngine";

export interface ActiveIntent {
  id: string;
  description: string;
  scope?: string[];
  constraints?: Record<string, any>;
}

export interface ActiveIntentsFile {
  active_intent: string;
  intents: ActiveIntent[];
}

/**
 * Loads the active intent YAML from the orchestration folder
 */
export function loadActiveIntent(context: HookContext): ActiveIntent | null {
  try {
    const workspaceRoot = context.workspaceRoot || process.cwd();
    const yamlPath = path.join(workspaceRoot, ".orchestration", "active_intents.yaml");

    if (!fs.existsSync(yamlPath)) {
      context.addFeedback(`Active intents YAML not found at ${yamlPath}`);
      return null;
    }

    const fileContent = fs.readFileSync(yamlPath, "utf-8");
    const data = yaml.load(fileContent) as ActiveIntentsFile;

    if (!data || !data.active_intent || !Array.isArray(data.intents)) {
      context.addFeedback(`Invalid active intents YAML structure`);
      return null;
    }

    const intent = data.intents.find((i) => i.id === data.active_intent);
    if (!intent) {
      context.addFeedback(`Active intent ${data.active_intent} not found in intents list`);
      return null;
    }

    return intent;
  } catch (error: any) {
    context.addFeedback(`Error loading active intent: ${error.message}`);
    return null;
  }
}
