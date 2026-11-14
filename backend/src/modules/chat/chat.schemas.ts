import { z } from 'zod';

export const MAX_CHAT_MESSAGES = 20;
export const MAX_MESSAGE_LENGTH = 2_000;

const messageContentSchema = z.string().trim().min(1).max(MAX_MESSAGE_LENGTH);

const historyMessageSchema = z.strictObject({
  role: z.enum(['user', 'assistant']),
  content: messageContentSchema,
});

export type ChatHistoryMessage = z.infer<typeof historyMessageSchema>;

/**
 * Conversation history sent by the client (the format used by the web app).
 * Text only: the client cannot send tool calls or tool results, so it cannot
 * forge catalog data. Strict objects reject `companyId` or any other extra field.
 */
const historyRequestSchema = z.strictObject({
  messages: z
    .array(historyMessageSchema)
    .min(1)
    .max(MAX_CHAT_MESSAGES)
    .refine((messages) => messages.at(-1)?.role === 'user', {
      message: 'The last message must come from the user',
    }),
});

/** Single question without history: `{ "message": "..." }`, normalized to a one-message history. */
const singleMessageRequestSchema = z
  .strictObject({ message: messageContentSchema })
  .transform(({ message }) => ({ messages: [{ role: 'user' as const, content: message }] }));

/**
 * Picks the schema by the body shape, so validation errors point at the field
 * the client actually used. A body with both `message` and `messages` goes to
 * the single-message schema, whose strict object rejects the extra key.
 */
export function selectChatRequestSchema(body: unknown) {
  const isSingleMessage = typeof body === 'object' && body !== null && 'message' in body;
  return isSingleMessage ? singleMessageRequestSchema : historyRequestSchema;
}
