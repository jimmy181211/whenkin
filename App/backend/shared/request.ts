import type { Request } from 'express';
import { Problem } from './validation.js';

export function body(request: Request): Record<string, unknown> {
  const parsed: unknown = request.body;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Problem(400, 'The information could not be read. Please try again.');
  }
  return parsed as Record<string, unknown>;
}
