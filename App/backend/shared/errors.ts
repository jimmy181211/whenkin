import type { ErrorRequestHandler } from 'express';
import { Problem } from './validation.js';
import { EVENT_EXPIRED_MESSAGE } from '../../shared/event-limits.js';

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (res.headersSent) return next(error);
  if (error instanceof Problem) return res.status(error.status).json({ error: error.message });
  const code = error && typeof error === 'object' && 'code' in error ? error.code : '';
  const type = error && typeof error === 'object' && 'type' in error ? error.type : '';
  if (code === 'WK001') return res.status(410).json({ error: EVENT_EXPIRED_MESSAGE });
  if (type === 'entity.too.large') return res.status(413).json({ error: 'This request is too large. Please choose fewer dates.' });
  if (type === 'entity.parse.failed') return res.status(400).json({ error: 'The information could not be read. Please try again.' });
  return res.status(503).json({ error: 'Your change could not be saved. Please try again in a moment.' });
};
