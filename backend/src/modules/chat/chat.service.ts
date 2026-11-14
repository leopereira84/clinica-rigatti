import type { AuthContext } from '../../shared/auth/authContext.js';
import { AppError } from '../../shared/errors/AppError.js';
import { logger } from '../../shared/logger.js';
import { CHAT_SYSTEM_PROMPT } from './chat.prompt.js';
import type { ChatHistoryMessage } from './chat.schemas.js';
import { type LlmCompletion, LlmError, type LlmMessage, type LlmProvider } from './llm/llm.types.js';
import { catalogTools } from './tools/catalogTools.js';
import { type ChatTool, executeToolCall, type ToolExecution } from './tools/toolRunner.js';

export interface ChatLimits {
  /** Maximum model calls per user message. */
  maxIterations: number;
  /** Maximum tool executions per user message. */
  maxToolCalls: number;
  /** Overall time budget per user message, including retries and tools. */
  deadlineMs: number;
}

export const DEFAULT_CHAT_LIMITS: ChatLimits = { maxIterations: 6, maxToolCalls: 8, deadlineMs: 60_000 };

export type ChatStatus =
  /** The model produced a final answer. */
  | 'completed'
  /** The iteration or tool call limit was reached before a final answer. */
  | 'limit_reached'
  /** The model or the provider declined the request. */
  | 'refused'
  /** The answer was cut by the output token limit. */
  | 'truncated';

export interface ToolCallSummary {
  name: string;
  ok: boolean;
  /** Validated arguments; null when the call was rejected. */
  input: unknown;
  resultCount: number | null;
}

export interface ChatReply {
  reply: string;
  status: ChatStatus;
  /** Catalog queries actually executed, so the UI can show what was consulted. */
  toolCalls: ToolCallSummary[];
}

const LIMIT_REPLY =
  'Não consegui concluir a consulta ao catálogo dentro do limite de etapas. Tente fazer uma pergunta mais específica.';
const REFUSAL_REPLY =
  'Não posso ajudar com essa solicitação. Posso responder perguntas sobre os produtos do catálogo da sua empresa.';
const TRUNCATED_NOTICE = '\n\n(Resposta interrompida por limite de tamanho. Peça mais detalhes, se precisar.)';

function notConfigured(): AppError {
  return new AppError(503, 'ASSISTANT_NOT_CONFIGURED', 'The AI assistant is not configured on this server');
}

function toAppError(error: LlmError, deadlineExceeded: boolean): AppError {
  if (deadlineExceeded || error.kind === 'timeout') {
    return new AppError(504, 'ASSISTANT_TIMEOUT', 'The AI assistant took too long to answer');
  }
  if (error.kind === 'bad_response') {
    return new AppError(502, 'ASSISTANT_BAD_RESPONSE', 'The AI assistant returned an invalid response');
  }
  // rate_limit, unavailable, auth, bad_request, aborted: details stay in the logs.
  return new AppError(503, 'ASSISTANT_UNAVAILABLE', 'The AI assistant is temporarily unavailable');
}

function toSummary(execution: ToolExecution): ToolCallSummary {
  return { name: execution.name, ok: execution.ok, input: execution.input, resultCount: execution.resultCount };
}

/**
 * Agent loop: sends the conversation to the model, executes the tools it asks
 * for with the authenticated user's context, and repeats until a final answer
 * or a limit. Provider-agnostic: depends only on `LlmProvider`.
 */
export function createChatService(
  provider: LlmProvider | null,
  options: { limits?: ChatLimits; tools?: ReadonlyMap<string, ChatTool> } = {},
) {
  const limits = options.limits ?? DEFAULT_CHAT_LIMITS;
  const tools = options.tools ?? catalogTools;
  const toolDefinitions = [...tools.values()].map((tool) => tool.definition);

  async function reply(auth: AuthContext, history: ChatHistoryMessage[], clientSignal?: AbortSignal): Promise<ChatReply> {
    if (!provider) throw notConfigured();

    const deadline = AbortSignal.timeout(limits.deadlineMs);
    const signal = clientSignal ? AbortSignal.any([clientSignal, deadline]) : deadline;

    const messages: LlmMessage[] = history.map((message) => ({ role: message.role, content: message.content }));
    const executions: ToolExecution[] = [];
    const usage = { inputTokens: 0, outputTokens: 0 };
    let iterations = 0;

    const finish = (result: Omit<ChatReply, 'toolCalls'>): ChatReply => {
      logger.info(
        `chat user=${auth.userId} provider=${provider.name} status=${result.status} iterations=${iterations} ` +
          `tools=[${executions.map((e) => `${e.name}:${e.ok ? 'ok' : e.error}`).join(',')}] ` +
          `tokens=${usage.inputTokens}/${usage.outputTokens}`,
      );
      return { ...result, toolCalls: executions.map(toSummary) };
    };

    while (iterations < limits.maxIterations) {
      if (signal.aborted) throw toAppError(new LlmError('aborted', 'Aborted'), deadline.aborted);
      iterations += 1;

      let completion: LlmCompletion;
      try {
        completion = await provider.complete({ system: CHAT_SYSTEM_PROMPT, messages, tools: toolDefinitions, signal });
      } catch (error) {
        if (!(error instanceof LlmError)) throw error;
        // Only the kind and safe details are logged: never message contents or credentials.
        logger.error(`chat LLM error kind=${error.kind} details=${JSON.stringify(error.details)}`);
        throw toAppError(error, deadline.aborted);
      }

      if (completion.usage) {
        usage.inputTokens += completion.usage.inputTokens;
        usage.outputTokens += completion.usage.outputTokens;
      }

      const text = completion.text?.trim() ?? '';

      switch (completion.finishReason) {
        case 'tool_calls': {
          if (executions.length + completion.toolCalls.length > limits.maxToolCalls) {
            return finish({ reply: LIMIT_REPLY, status: 'limit_reached' });
          }
          messages.push({ role: 'assistant', content: completion.text, toolCalls: completion.toolCalls });
          // Sequential on purpose: keeps database load predictable.
          for (const call of completion.toolCalls) {
            const execution = await executeToolCall(tools, auth, call);
            executions.push(execution);
            messages.push({ role: 'tool', toolCallId: call.id, content: execution.content });
          }
          break;
        }
        case 'stop':
          if (!text) throw toAppError(new LlmError('bad_response', 'Empty answer'), false);
          return finish({ reply: text, status: 'completed' });
        case 'length':
          if (!text) throw toAppError(new LlmError('bad_response', 'Empty truncated answer'), false);
          return finish({ reply: text + TRUNCATED_NOTICE, status: 'truncated' });
        case 'refusal':
        case 'content_filter':
          return finish({ reply: REFUSAL_REPLY, status: 'refused' });
      }
    }

    return finish({ reply: LIMIT_REPLY, status: 'limit_reached' });
  }

  return { reply };
}

export type ChatService = ReturnType<typeof createChatService>;
