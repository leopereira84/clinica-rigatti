/**
 * Provider-neutral contract for LLMs with tool calling. The agent and the tools
 * depend only on these types; each provider has an adapter that translates them
 * to its official SDK (see openai.provider.ts).
 */

export interface LlmToolDefinition {
  name: string;
  description: string;
  /**
   * JSON Schema of the arguments. Every property must be listed in `required`
   * (optional values are expressed as nullable types) and
   * `additionalProperties` must be false, so providers can enforce it strictly.
   */
  parameters: Record<string, unknown>;
}

export interface LlmToolCall {
  id: string;
  name: string;
  /** JSON-encoded arguments exactly as produced by the model. Not trusted. */
  arguments: string;
}

export type LlmMessage =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string | null; toolCalls?: LlmToolCall[] }
  | { role: 'tool'; toolCallId: string; content: string };

export type LlmFinishReason =
  /** The model finished its answer. */
  | 'stop'
  /** The model wants the tools in `toolCalls` to be executed. */
  | 'tool_calls'
  /** The output token limit was reached. */
  | 'length'
  /** The model declined to answer. */
  | 'refusal'
  /** The provider blocked the content. */
  | 'content_filter';

export interface LlmCompletion {
  finishReason: LlmFinishReason;
  text: string | null;
  toolCalls: LlmToolCall[];
  usage?: { inputTokens: number; outputTokens: number };
}

export interface LlmCompletionRequest {
  system: string;
  messages: LlmMessage[];
  tools: LlmToolDefinition[];
  signal?: AbortSignal;
}

export interface LlmProvider {
  /** Short identifier used in logs, e.g. "openai:gpt-4.1-mini". */
  readonly name: string;
  /** Resolves with the model output or rejects with an `LlmError`. */
  complete(request: LlmCompletionRequest): Promise<LlmCompletion>;
}

export type LlmErrorKind =
  /** Provider rate limit or quota exceeded. */
  | 'rate_limit'
  /** The request to the provider timed out. */
  | 'timeout'
  /** Network failure or provider-side error (5xx). */
  | 'unavailable'
  /** Invalid or unauthorized credentials. */
  | 'auth'
  /** The provider rejected the request (invalid model, parameters...). */
  | 'bad_request'
  /** The provider answered with something the agent cannot use. */
  | 'bad_response'
  /** The request was cancelled by the caller. */
  | 'aborted';

/**
 * Error raised by providers. `message` must never contain provider messages
 * verbatim: some of them echo parts of the API key.
 */
export class LlmError extends Error {
  readonly kind: LlmErrorKind;
  /** Safe diagnostic details for logs (status, error code, request id). */
  readonly details: Record<string, string | number | undefined>;

  constructor(kind: LlmErrorKind, message: string, details: Record<string, string | number | undefined> = {}) {
    super(message);
    this.name = 'LlmError';
    this.kind = kind;
    this.details = details;
  }
}
