/**
 * Upstream fetch resilience for the server-side API routes.
 *
 * - `fetchJson` retries 429/5xx with exponential backoff + jitter, honours a
 *   `Retry-After` header, and aborts after a timeout.
 * - `cachedFetch` adds a small in-process TTL cache with stale-serve: on
 *   upstream failure it returns the last good value flagged `stale` instead of
 *   throwing, so the app degrades gracefully.
 *
 * The cache is per Node process (fine for `next dev` / `next start`); it is not
 * shared across serverless instances, which is acceptable here because clients
 * also cache via TanStack Query and the responses set stale-while-revalidate.
 */

export class UpstreamError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function backoffDelay(attempt: number): number {
  const base = Math.min(4000, 300 * 2 ** attempt);
  return base + Math.random() * 250; // full-ish jitter
}

export interface FetchOptions {
  timeoutMs?: number;
  retries?: number;
  headers?: Record<string, string>;
}

export async function fetchJson<T>(url: string, opts: FetchOptions = {}): Promise<T> {
  const { timeoutMs = 8000, retries = 3, headers = {} } = opts;
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { accept: "application/json", ...headers },
        cache: "no-store",
      });
      clearTimeout(timer);

      if (res.status === 429 || res.status >= 500) {
        if (attempt < retries) {
          const retryAfter = Number(res.headers.get("retry-after"));
          const waitMs =
            Number.isFinite(retryAfter) && retryAfter > 0
              ? retryAfter * 1000
              : backoffDelay(attempt);
          await sleep(waitMs);
          continue;
        }
        throw new UpstreamError(`Upstream responded ${res.status}`, res.status);
      }
      if (!res.ok) {
        throw new UpstreamError(`Upstream responded ${res.status}`, res.status);
      }
      return (await res.json()) as T;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      // Non-retryable client errors (4xx other than 429) bubble up immediately.
      if (err instanceof UpstreamError && err.status && err.status < 500 && err.status !== 429) {
        throw err;
      }
      if (attempt < retries) {
        await sleep(backoffDelay(attempt));
        continue;
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new UpstreamError("Upstream fetch failed");
}

interface CacheHit<T> {
  value: T;
  at: number;
}

const store = new Map<string, CacheHit<unknown>>();

export interface CachedResult<T> {
  value: T;
  /** True when the value was served from cache after an upstream failure. */
  stale: boolean;
  /** Epoch ms the cached value was fetched. */
  at: number;
}

/**
 * TTL cache with stale-serve. Returns fresh within `ttlMs`; otherwise reloads,
 * and on failure serves the last good value (if any) flagged `stale`.
 */
export async function cachedFetch<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<CachedResult<T>> {
  const now = Date.now();
  const hit = store.get(key) as CacheHit<T> | undefined;
  if (hit && now - hit.at < ttlMs) {
    return { value: hit.value, stale: false, at: hit.at };
  }
  try {
    const value = await loader();
    store.set(key, { value, at: now });
    return { value, stale: false, at: now };
  } catch (err) {
    if (hit) {
      return { value: hit.value, stale: true, at: hit.at };
    }
    throw err;
  }
}

/** Test-only: clear the in-process cache. */
export function __clearUpstreamCache(): void {
  store.clear();
}
