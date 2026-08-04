export interface BackoffOptions {
  maxRetries: number;
  baseDelayMs: number;
}

export function isRateLimitError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || String(err)).toLowerCase();
  const status = err.status || err.statusCode;
  return status === 429 || msg.includes('429') || msg.includes('rate limit') || msg.includes('too many requests');
}

export function isTransientError(err: any): boolean {
  if (!err) return false;
  const status = err.status || err.statusCode;
  const msg = (err.message || String(err)).toLowerCase();
  return (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('fetch failed')
  );
}

export async function withBackoff<T>(
  fn: () => Promise<T>,
  opts: BackoffOptions = { maxRetries: 3, baseDelayMs: 500 }
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isRateLimitError(err) && !isTransientError(err)) {
        throw err;
      }
      if (attempt === opts.maxRetries) {
        break;
      }
      const delay = opts.baseDelayMs * Math.pow(2, attempt) + Math.random() * 200;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
