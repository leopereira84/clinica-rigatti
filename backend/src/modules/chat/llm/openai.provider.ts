import OpenAI, {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  APIUserAbortError,
  AuthenticationError,
  PermissionDeniedError,
  RateLimitError,
} from 'openai';
import {
  type LlmCompletion,
  type LlmCompletionRequest,
  LlmError,
  type LlmMessage,
  type LlmProvider,
  type LlmToolCall,
  type LlmToolDefinition,
} from './llm.types.js';

type ChatCompletion = OpenAI.Chat.ChatCompletion;
type ChatMessageParam = OpenAI.Chat.ChatCompletionMessageParam;
type ChatTool = OpenAI.Chat.ChatCompletionTool;

/** Upper bound for each model answer; catalog answers are short. */
const MAX_OUTPUT_TOKENS = 1_024;
/** Low temperature: answers must stick to tool results, not be creative. */
const TEMPERATURE = 0.2;

export interface OpenAiProviderOptions {
  client: OpenAI;
  model: string;
}

/**
 * Adapter between the neutral LLM contract and the official OpenAI SDK
 * (Chat Completions with function calling). Nothing outside this file knows
 * about OpenAI types.
 */
export function createOpenAiProvider({ client, model }: OpenAiProviderOptions): LlmProvider {
  return {
    name: `openai:${model}`,

    async complete(request: LlmCompletionRequest): Promise<LlmCompletion> {
      let completion: ChatCompletion;
      try {
        completion = await client.chat.completions.create(
          {
            model,
            messages: [{ role: 'system', content: request.system }, ...request.messages.map(toOpenAiMessage)],
            tools: request.tools.map(toOpenAiTool),
            // Strict schemas are not guaranteed with parallel calls, so the
            // model asks for one tool at a time.
            parallel_tool_calls: false,
            max_completion_tokens: MAX_OUTPUT_TOKENS,
            temperature: TEMPERATURE,
          },
          { signal: request.signal },
        );
      } catch (error) {
        throw toLlmError(error);
      }

      return fromOpenAiCompletion(completion);
    },
  };
}

export function createOpenAiClient(apiKey: string, timeoutMs: number): OpenAI {
  // One retry for transient failures (429/5xx/connection); the agent also has
  // an overall deadline, so retries cannot stretch a request indefinitely.
  return new OpenAI({ apiKey, timeout: timeoutMs, maxRetries: 1 });
}

function toOpenAiTool(tool: LlmToolDefinition): ChatTool {
  return {
    type: 'function',
    function: { name: tool.name, description: tool.description, parameters: tool.parameters, strict: true },
  };
}

function toOpenAiMessage(message: LlmMessage): ChatMessageParam {
  switch (message.role) {
    case 'user':
      return { role: 'user', content: message.content };
    case 'tool':
      return { role: 'tool', tool_call_id: message.toolCallId, content: message.content };
    case 'assistant':
      return {
        role: 'assistant',
        content: message.content,
        ...(message.toolCalls?.length && {
          tool_calls: message.toolCalls.map((call) => ({
            id: call.id,
            type: 'function' as const,
            function: { name: call.name, arguments: call.arguments },
          })),
        }),
      };
  }
}

function fromOpenAiCompletion(completion: ChatCompletion): LlmCompletion {
  const choice = completion.choices[0];
  if (!choice) {
    throw new LlmError('bad_response', 'The LLM provider returned no choices');
  }

  const usage = completion.usage && {
    inputTokens: completion.usage.prompt_tokens,
    outputTokens: completion.usage.completion_tokens,
  };
  const { message } = choice;

  if (message.refusal) {
    return { finishReason: 'refusal', text: message.refusal, toolCalls: [], usage };
  }

  const toolCalls: LlmToolCall[] = (message.tool_calls ?? []).flatMap((call) =>
    call.type === 'function' ? [{ id: call.id, name: call.function.name, arguments: call.function.arguments }] : [],
  );

  // Tool calls take precedence over the reported finish reason.
  if (toolCalls.length > 0) {
    return { finishReason: 'tool_calls', text: message.content, toolCalls, usage };
  }

  switch (choice.finish_reason) {
    case 'stop':
    case 'length':
    case 'content_filter':
      return { finishReason: choice.finish_reason, text: message.content, toolCalls: [], usage };
    default:
      // 'tool_calls' without function calls, or the deprecated 'function_call'.
      throw new LlmError('bad_response', 'The LLM provider returned an unsupported completion', {
        finishReason: choice.finish_reason,
      });
  }
}

/**
 * Maps SDK errors to `LlmError`. Provider messages are not copied: an
 * authentication error, for example, echoes part of the API key.
 */
function toLlmError(error: unknown): LlmError {
  // Order matters: specific classes extend the generic ones.
  if (error instanceof APIUserAbortError) {
    return new LlmError('aborted', 'The LLM request was aborted');
  }
  if (error instanceof APIConnectionTimeoutError) {
    return new LlmError('timeout', 'The LLM provider did not answer in time');
  }
  if (error instanceof APIConnectionError) {
    return new LlmError('unavailable', 'Could not connect to the LLM provider');
  }
  if (error instanceof APIError) {
    const details = {
      status: error.status,
      code: error.code ?? undefined,
      type: error.type,
      requestId: error.requestID ?? undefined,
    };
    if (error instanceof RateLimitError) {
      return new LlmError('rate_limit', 'The LLM provider rate limit or quota was exceeded', details);
    }
    if (error instanceof AuthenticationError || error instanceof PermissionDeniedError) {
      return new LlmError('auth', 'The LLM provider rejected the credentials', details);
    }
    if (error.status !== undefined && error.status < 500) {
      return new LlmError('bad_request', 'The LLM provider rejected the request', details);
    }
    return new LlmError('unavailable', 'The LLM provider failed to process the request', details);
  }
  return new LlmError('unavailable', 'Unexpected error while calling the LLM provider', {
    errorName: error instanceof Error ? error.name : typeof error,
  });
}
