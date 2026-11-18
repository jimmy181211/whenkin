/** Sends JSON requests to the same-origin API and exposes readable errors. */
/** Carry a safe API message and status; status 0 means a network failure. */
export class ApiError extends Error {
  /** Keep an API failure's safe message and HTTP status together. */
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

/**
 * Send a JSON request to a path relative to /api.
 * Apply the default timeout unless the caller supplies a cancellation signal.
 * @param path - API path such as /events/id; do not include the /api prefix.
 * @param options - Fetch options; callers serialize request bodies with JSON.stringify.
 * @returns The parsed response body; throws ApiError on failure.
 */
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      signal: options.signal ?? AbortSignal.timeout(12000),
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(
      'We couldn’t reach Whenkin. Please check your connection and try again.',
      0,
    );
  }
  const body: unknown = await response.json().catch(
    /* Treat an unreadable JSON response as invalid API output. */
    () => null,
  );
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(
      'Event saving is not available at this address yet. Please try again once setup is complete.',
      response.status,
    );
  }
  if (!response.ok) {
    throw new ApiError(
      'error' in body && typeof body.error === 'string'
        ? body.error
        : 'Something went wrong. Please try again.',
      response.status,
    );
  }
  return body as T;
}
