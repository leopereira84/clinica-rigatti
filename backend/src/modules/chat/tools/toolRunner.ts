import type { z } from 'zod';
import type { AuthContext } from '../../../shared/auth/authContext.js';
import { logger } from '../../../shared/logger.js';
import type { LlmToolCall, LlmToolDefinition } from '../llm/llm.types.js';

export interface ToolResult {
  /** Serialized to JSON and sent back to the model. */
  data: unknown;
  /** Number of products/items returned, reported to the client. */
  resultCount: number;
}

/**
 * A read-only tool available to the agent. The tenant comes exclusively from
 * `auth` (built server-side by `authenticate`); no tool schema has a
 * `companyId` field, and unknown fields are rejected.
 */
export interface ChatTool {
  definition: LlmToolDefinition;
  run(auth: AuthContext, rawInput: unknown): Promise<{ input: unknown; result: ToolResult }>;
}

export type ToolErrorCode = 'unknown_tool' | 'invalid_arguments' | 'execution_failed';

/** Outcome of one tool call, as recorded by the agent. */
export interface ToolExecution {
  name: string;
  ok: boolean;
  /** Validated input (only when it passed validation). */
  input: unknown;
  resultCount: number | null;
  error?: ToolErrorCode;
  /** JSON content returned to the model. */
  content: string;
}

class ToolInputError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super('Invalid tool arguments');
    this.issues = issues;
  }
}

/** Ties a tool definition to the Zod schema that validates the model's arguments. */
export function defineTool<TSchema extends z.ZodType>(spec: {
  definition: LlmToolDefinition;
  schema: TSchema;
  execute: (auth: AuthContext, input: z.output<TSchema>) => Promise<ToolResult>;
}): ChatTool {
  return {
    definition: spec.definition,
    async run(auth, rawInput) {
      const parsed = spec.schema.safeParse(rawInput);
      if (!parsed.success) {
        throw new ToolInputError(
          parsed.error.issues.map((issue) => `${issue.path.map(String).join('.') || '(root)'}: ${issue.message}`),
        );
      }
      return { input: parsed.data, result: await spec.execute(auth, parsed.data) };
    },
  };
}

function failure(name: string, error: ToolErrorCode, message: string, issues?: string[]): ToolExecution {
  return {
    name,
    ok: false,
    input: null,
    resultCount: null,
    error,
    content: JSON.stringify({ error, message, ...(issues && { issues }) }),
  };
}

/**
 * Executes one tool call requested by the model. Never throws: every failure
 * becomes an error result the model can read and explain, without stack
 * traces or internal details.
 */
export async function executeToolCall(
  tools: ReadonlyMap<string, ChatTool>,
  auth: AuthContext,
  call: LlmToolCall,
): Promise<ToolExecution> {
  const tool = tools.get(call.name);
  if (!tool) {
    return failure(call.name, 'unknown_tool', `Tool "${call.name}" does not exist.`);
  }

  let rawInput: unknown;
  try {
    rawInput = call.arguments.trim() === '' ? {} : JSON.parse(call.arguments);
  } catch {
    return failure(call.name, 'invalid_arguments', 'Arguments are not valid JSON.');
  }

  try {
    const { input, result } = await tool.run(auth, rawInput);
    return {
      name: call.name,
      ok: true,
      input,
      resultCount: result.resultCount,
      content: JSON.stringify(result.data),
    };
  } catch (error) {
    if (error instanceof ToolInputError) {
      return failure(call.name, 'invalid_arguments', 'Arguments do not match the tool schema.', error.issues);
    }
    logger.error(`chat tool "${call.name}" failed`, error);
    return failure(call.name, 'execution_failed', 'The catalog could not be queried right now.');
  }
}
