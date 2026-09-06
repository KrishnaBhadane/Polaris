import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { sanitizeAIErrorMessage } from '../utils/aiVariant.utils';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error(err.stack || err.message);
  const rawMsg = err.message || '';
  const isAiLeak = /gemini|google|models\/|api_key|generativelanguage/i.test(rawMsg);
  const safeMessage = isAiLeak
    ? sanitizeAIErrorMessage(err)
    : process.env.NODE_ENV === 'development'
    ? err.message
    : undefined;

  res.status(500).json({
    error: 'Internal Server Error',
    message: safeMessage,
  });
};
