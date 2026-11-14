import OpenAI from 'openai';
import { describe, expect, it } from 'vitest';
import { LlmError, type LlmCompletionRequest } from '../src/modules/chat/llm/llm.types.js';
import { createOpenAiProvider } from '../src/modules/chat/llm/openai.provider.js';

// The real SDK client with a fake `fetch`: exercises the adapter end to end
// without network access and without spending OpenAI credits.

const FAKE_KEY = 'sk-test-0123456789-secret';

interface CapturedRequest {
  url: string;
  body: Record<string, unknown>;
}

type FakeResponse = { status: number; body: unknown } | 'network-error' | 'hang';

function providerWith(response: FakeResponse, clientOptions: { timeout?: number } = {}) {
  const captured: CapturedRequest[] = [];

  const fakeFetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    captured.push({ url: String(input), body: JSON.parse(String(init?.body)) as Record<string, unknown> });

    if (response === 'network-error') throw new TypeError('fetch failed');
    if (response === 'hang') {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      });
    }
    return new Response(JSON.stringify(response.body), {
      status: response.status,
      headers: { 'content-type': 'application/json', 'x-request-id': 'req_test_1' },
    });
  };

  const client = new OpenAI({ apiKey: FAKE_KEY, fetch: fakeFetch, maxRetries: 0, ...clientOptions });
  return { provider: createOpenAiProvider({ client, model: 'gpt-4.1-mini' }), captured };
}

function completion(message: Record<string, unknown>, finishReason: string) {
  return {
    id: 'chatcmpl-test',
    object: 'chat.completion',
    created: 0,
    model: 'gpt-4.1-mini',
    choices: [{ index: 0, message: { role: 'assistant', refusal: null, ...message }, finish_reason: finishReason }],
    usage: { prompt_tokens: 120, completion_tokens: 30, total_tokens: 150 },
  };
}

const baseRequest: LlmCompletionRequest = {
  system: 'system prompt',
  messages: [
    { role: 'user', content: 'Quais bancos?' },
    {
      role: 'assistant',
      content: null,
      toolCalls: [{ id: 'call_1', name: 'search_products', arguments: '{"query":"banco"}' }],
    },
    { role: 'tool', toolCallId: 'call_1', content: '{"products":[]}' },
  ],
  tools: [
    {
      name: 'search_products',
      description: 'Searches products',
      parameters: { type: 'object', additionalProperties: false, required: [], properties: {} },
    },
  ],
};

async function captureError(promise: Promise<unknown>): Promise<LlmError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof LlmError) return error;
    throw error;
  }
  throw new Error('Expected the promise to reject');
}

describe('OpenAI provider adapter', () => {
  it('translates the neutral request to Chat Completions with strict function tools', async () => {
    const { provider, captured } = providerWith({ status: 200, body: completion({ content: 'ok' }, 'stop') });

    await provider.complete(baseRequest);

    expect(captured).toHaveLength(1);
    expect(captured[0]?.url).toMatch(/\/chat\/completions$/);
    const body = captured[0]?.body;
    expect(body).toMatchObject({
      model: 'gpt-4.1-mini',
      parallel_tool_calls: false,
      messages: [
        { role: 'system', content: 'system prompt' },
        { role: 'user', content: 'Quais bancos?' },
        {
          role: 'assistant',
          content: null,
          tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'search_products', arguments: '{"query":"banco"}' } }],
        },
        { role: 'tool', tool_call_id: 'call_1', content: '{"products":[]}' },
      ],
      tools: [{ type: 'function', function: { name: 'search_products', strict: true } }],
    });
    // The API key travels only in the Authorization header, never in the body.
    expect(JSON.stringify(body)).not.toContain(FAKE_KEY);
  });

  it('parses tool calls', async () => {
    const { provider } = providerWith({
      status: 200,
      body: completion(
        {
          content: null,
          tool_calls: [{ id: 'call_9', type: 'function', function: { name: 'list_categories', arguments: '{}' } }],
        },
        'tool_calls',
      ),
    });

    await expect(provider.complete(baseRequest)).resolves.toEqual({
      finishReason: 'tool_calls',
      text: null,
      toolCalls: [{ id: 'call_9', name: 'list_categories', arguments: '{}' }],
      usage: { inputTokens: 120, outputTokens: 30 },
    });
  });

  it('parses final answers, truncation and refusals', async () => {
    const stop = providerWith({ status: 200, body: completion({ content: 'Resposta' }, 'stop') });
    const length = providerWith({ status: 200, body: completion({ content: 'Parcial' }, 'length') });
    const refusal = providerWith({ status: 200, body: completion({ content: null, refusal: 'No' }, 'stop') });

    await expect(stop.provider.complete(baseRequest)).resolves.toMatchObject({ finishReason: 'stop', text: 'Resposta' });
    await expect(length.provider.complete(baseRequest)).resolves.toMatchObject({ finishReason: 'length' });
    await expect(refusal.provider.complete(baseRequest)).resolves.toMatchObject({ finishReason: 'refusal' });
  });

  it('rejects a response without choices as bad_response', async () => {
    const { provider } = providerWith({ status: 200, body: { ...completion({ content: 'x' }, 'stop'), choices: [] } });

    expect((await captureError(provider.complete(baseRequest))).kind).toBe('bad_response');
  });

  it.each([
    [429, 'rate_limit'],
    [401, 'auth'],
    [403, 'auth'],
    [400, 'bad_request'],
    [404, 'bad_request'],
    [500, 'unavailable'],
    [503, 'unavailable'],
  ] as const)('maps HTTP %i to %s without copying the provider message', async (status, kind) => {
    const { provider } = providerWith({
      status,
      body: { error: { message: `Incorrect API key provided: ${FAKE_KEY}`, type: 'invalid_request_error', code: 'x' } },
    });

    const error = await captureError(provider.complete(baseRequest));

    expect(error.kind).toBe(kind);
    expect(error.details.status).toBe(status);
    expect(error.message).not.toContain('sk-');
    expect(JSON.stringify(error.details)).not.toContain('sk-');
  });

  it('maps network failures to unavailable', async () => {
    const { provider } = providerWith('network-error');

    expect((await captureError(provider.complete(baseRequest))).kind).toBe('unavailable');
  });

  it('maps the client timeout to timeout', async () => {
    const { provider } = providerWith('hang', { timeout: 50 });

    expect((await captureError(provider.complete(baseRequest))).kind).toBe('timeout');
  });

  it('maps a caller abort to aborted', async () => {
    const { provider } = providerWith('hang');
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 20);

    expect((await captureError(provider.complete({ ...baseRequest, signal: controller.signal }))).kind).toBe('aborted');
  });
});
