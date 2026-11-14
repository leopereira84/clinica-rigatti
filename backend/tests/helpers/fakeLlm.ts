import type {
  LlmCompletion,
  LlmCompletionRequest,
  LlmMessage,
  LlmProvider,
  LlmToolDefinition,
} from '../../src/modules/chat/llm/llm.types.js';

export type FakeStep = LlmCompletion | Error | ((request: LlmCompletionRequest) => Promise<LlmCompletion>);

export interface RecordedRequest {
  system: string;
  messages: LlmMessage[];
  tools: LlmToolDefinition[];
}

/**
 * Scripted LLM provider: returns the given steps in order and records every
 * request, so tests can inspect exactly what would have been sent to the model.
 */
export class FakeLlmProvider implements LlmProvider {
  readonly name = 'fake';
  readonly requests: RecordedRequest[] = [];
  private readonly steps: FakeStep[];

  constructor(steps: FakeStep[]) {
    this.steps = [...steps];
  }

  async complete(request: LlmCompletionRequest): Promise<LlmCompletion> {
    this.requests.push({
      system: request.system,
      messages: structuredClone(request.messages),
      tools: request.tools,
    });

    const step = this.steps.shift();
    if (!step) throw new Error('FakeLlmProvider: no scripted response left');
    if (step instanceof Error) throw step;
    if (typeof step === 'function') return step(request);
    return step;
  }
}

let callSequence = 0;

/** A completion asking for one or more tool calls. */
export function toolCalls(...calls: Array<{ name: string; args: unknown } | { name: string; rawArgs: string }>): LlmCompletion {
  return {
    finishReason: 'tool_calls',
    text: null,
    toolCalls: calls.map((call) => {
      callSequence += 1;
      return {
        id: `call_${callSequence}`,
        name: call.name,
        arguments: 'rawArgs' in call ? call.rawArgs : JSON.stringify(call.args),
      };
    }),
  };
}

export function toolCall(name: string, args: unknown): LlmCompletion {
  return toolCalls({ name, args });
}

export function finalAnswer(text: string): LlmCompletion {
  return { finishReason: 'stop', text, toolCalls: [] };
}

/** Parsed JSON contents of the tool results present in a recorded request. */
export function toolResultsOf(request: RecordedRequest | undefined): unknown[] {
  if (!request) throw new Error('No recorded request');
  return request.messages.flatMap((message) => (message.role === 'tool' ? [JSON.parse(message.content)] : []));
}

export const NO_SEARCH_FILTERS = {
  query: null,
  category: null,
  min_price: null,
  max_price: null,
  in_stock_only: null,
  sort: null,
  limit: null,
};
