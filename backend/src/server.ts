import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { createLlmProvider } from './modules/chat/llm/createLlmProvider.js';
import { logger } from './shared/logger.js';

async function main(): Promise<void> {
  await connectDatabase(env.MONGODB_URI);
  logger.info('Connected to MongoDB');

  const llmProvider = createLlmProvider(env);
  logger.info(
    llmProvider ? `AI assistant enabled (${llmProvider.name})` : 'AI assistant disabled: OPENAI_API_KEY is not set',
  );

  const server = createApp({ llmProvider }).listen(env.PORT, (error) => {
    if (error) {
      logger.error(`Failed to listen on port ${env.PORT}`, error);
      process.exit(1);
    }
    logger.info(`API listening on http://localhost:${env.PORT}`);
  });

  const shutdown = (signal: NodeJS.Signals): void => {
    logger.info(`${signal} received, shutting down`);
    server.close(() => {
      disconnectDatabase()
        .then(() => process.exit(0))
        .catch((error: unknown) => {
          logger.error('Error while disconnecting from MongoDB', error);
          process.exit(1);
        });
    });
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

main().catch((error: unknown) => {
  logger.error('Failed to start the server', error);
  process.exit(1);
});
