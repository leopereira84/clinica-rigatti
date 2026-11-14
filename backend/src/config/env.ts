import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3333),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must have at least 32 characters'),
  // Number followed by a unit, e.g. "15m", "2h", "1d".
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/, 'JWT_EXPIRES_IN must look like "15m", "2h" or "1d"')
    .default('2h'),
  // bcrypt work factor. Lower values are only meant for tests.
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  CORS_ORIGIN: z.url().default('http://localhost:5173'),
  // Optional: without a key the API still starts and /api/chat answers 503.
  // An empty value (`OPENAI_API_KEY=`) is treated as "not configured".
  OPENAI_API_KEY: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined)),
  OPENAI_MODEL: z.string().trim().min(1).default('gpt-4.1-mini'),
  // Timeout of each request to the LLM provider, in milliseconds.
  LLM_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(120_000).default(20_000),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates environment variables and fails fast with a readable message.
 * Only variable names and rule violations are reported, never the values.
 */
export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.map(String).join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${problems}`);
  }

  return result.data;
}

export const env = parseEnv(process.env);
