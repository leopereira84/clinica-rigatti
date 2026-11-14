import type { Env } from '../../../config/env.js';
import type { LlmProvider } from './llm.types.js';
import { createOpenAiClient, createOpenAiProvider } from './openai.provider.js';

/**
 * Builds the configured provider, or `null` when no API key is set, in which
 * case the rest of the API keeps working and the chat answers 503.
 * Supporting another provider means adding an adapter and choosing it here.
 */
export function createLlmProvider(config: Pick<Env, 'OPENAI_API_KEY' | 'OPENAI_MODEL' | 'LLM_TIMEOUT_MS'>): LlmProvider | null {
  if (!config.OPENAI_API_KEY) return null;

  return createOpenAiProvider({
    client: createOpenAiClient(config.OPENAI_API_KEY, config.LLM_TIMEOUT_MS),
    model: config.OPENAI_MODEL,
  });
}
