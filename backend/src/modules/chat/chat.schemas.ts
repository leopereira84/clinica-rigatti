import { z } from 'zod';

export const MAX_CHAT_MESSAGES = 20;
export const MAX_MESSAGE_LENGTH = 2_000;

/**
 * Conversation history sent by the client. Text only: the client cannot send
 * tool calls or tool results, so it cannot forge catalog data. Strict objects
 * reject `companyId` or any other extra field.
 */
export const chatRequestSchema = z.strictObject({
  messages: z
    .array(
      z.strictObject({
        role: z.enum(['user', 'assistant']),
        content: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
      }),
    )
    .min(1)
    .max(MAX_CHAT_MESSAGES)
    .refine((messages) => messages.at(-1)?.role === 'user', {
      message: 'The last message must come from the user',
    }),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatHistoryMessage = ChatRequest['messages'][number];
