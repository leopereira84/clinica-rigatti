import { describe, expect, it } from 'vitest';
import { parseEnv } from '../src/config/env.js';

const validSource = {
  MONGODB_URI: 'mongodb://localhost:27017/catalog',
  JWT_SECRET: 'a'.repeat(32),
};

describe('parseEnv', () => {
  it('applies defaults for optional variables', () => {
    const env = parseEnv(validSource);

    expect(env).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3333,
      JWT_EXPIRES_IN: '2h',
      CORS_ORIGIN: 'http://localhost:5173',
    });
  });

  it('coerces PORT to a number', () => {
    expect(parseEnv({ ...validSource, PORT: '8080' }).PORT).toBe(8080);
  });

  it('fails when MONGODB_URI is missing', () => {
    expect(() => parseEnv({ JWT_SECRET: validSource.JWT_SECRET })).toThrow(/MONGODB_URI/);
  });

  it('fails when JWT_SECRET is too short, without echoing its value', () => {
    const weakSecret = 'short-secret-value';

    expect(() => parseEnv({ ...validSource, JWT_SECRET: weakSecret })).toThrow(/JWT_SECRET/);
    expect(() => parseEnv({ ...validSource, JWT_SECRET: weakSecret })).not.toThrow(new RegExp(weakSecret));
  });

  it('treats the OpenAI key as optional and applies the default model', () => {
    const env = parseEnv({ ...validSource, OPENAI_API_KEY: '   ' });

    expect(env.OPENAI_API_KEY).toBeUndefined();
    expect(env.OPENAI_MODEL).toBe('gpt-4.1-mini');
    expect(env.LLM_TIMEOUT_MS).toBe(20_000);
  });

  it('fails when CORS_ORIGIN is not a URL', () => {
    expect(() => parseEnv({ ...validSource, CORS_ORIGIN: 'not a url' })).toThrow(/CORS_ORIGIN/);
  });
});
