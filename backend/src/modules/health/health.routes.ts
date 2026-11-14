import { Router } from 'express';
import { isDatabaseConnected } from '../../config/database.js';

export const healthRouter = Router();

// Single read-only endpoint: no controller/service layer needed.
healthRouter.get('/', (_req, res) => {
  const databaseUp = isDatabaseConnected();

  res.status(databaseUp ? 200 : 503).json({
    status: databaseUp ? 'ok' : 'degraded',
    database: databaseUp ? 'up' : 'down',
  });
});
