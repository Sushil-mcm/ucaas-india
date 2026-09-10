import { SESSION_NAME } from '@/lib/utils';

/**
 * The one place the captain-api base path is written down.
 *
 * `/captain-api` is a dev-proxy prefix (see vite.config.ts) rather than
 * VITE_API_BASE_URL, because captain-api is a separate service from default-api.
 */
export const CAPTAIN_API_BASE = '/captain-api/api/captain';

/**
 * `fetch`, with the signed-in user attached.
 *
 * Every captain request used to go out anonymously, and captain-api filled the
 * gap by assuming a fixed account — which meant one tenant's assistants,
 * documents and FAQs were reachable by anyone who could reach the API. That
 * service now resolves the company from this token and refuses a request it
 * cannot attribute, so the header is not optional decoration: without it these
 * endpoints return 401.
 *
 * Same signature as `fetch`, so call sites read the same as before.
 */
export const captainFetch = (input: string, init: RequestInit = {}) => {
  let token = '';
  try {
    token = localStorage.getItem(SESSION_NAME) || '';
  } catch {
    // Storage can throw in a locked-down browser; an unauthenticated request
    // gets a clean 401, which is a better failure than a thrown exception here.
  }

  return fetch(input, {
    ...init,
    headers: {
      ...(init.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  }).then(guardNonJson);
};

/**
 * Not every portal runs the same captain-api. Where an older one is still
 * behind /captain-api/, routes this build knows about simply do not exist
 * there and the answer is an HTML 404 page — or the SPA's own index.html, if
 * nothing proxies /captain-api/ at all.
 *
 * Every screen calls `await res.json()` before checking `res.ok`, so that HTML
 * surfaced as `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`:
 * accurate, and useless to the person reading it.
 *
 * Replacing .json() rather than throwing keeps res.ok and res.status intact for
 * callers that read them, and leaves genuine JSON responses — including JSON
 * error bodies, which carry the message worth showing — untouched.
 */
const guardNonJson = (response: Response): Response => {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('json') && response.status !== 204) {
    Object.defineProperty(response, 'json', {
      value: async () => {
        throw new Error(
          response.status === 404
            ? 'This part of Captain is not available on this portal yet.'
            : `Captain replied with ${response.status} and no JSON, so there is nothing to show.`,
        );
      },
    });
  }
  return response;
};

/**
 * The readable half of a Captain error body.
 *
 * FastAPI answers a rejected request with `detail`, and for a validation
 * failure that is an ARRAY of objects — `[{type, loc, msg, input}]`, not a
 * string. Passing it to `new Error()` produced the literal `[object Object]`
 * on screen, which told the reader nothing at all.
 *
 * So: a string detail is used as-is, an array is turned into its messages, and
 * anything else falls back to the caller's wording rather than to punctuation.
 */
export function captainErrorMessage(body: any, fallback: string): string {
  const detail = body?.detail;

  if (typeof detail === 'string' && detail.trim()) return detail;

  if (Array.isArray(detail)) {
    const parts = detail
      .map((item: any) => {
        if (typeof item === 'string') return item;
        const msg = String(item?.msg || '').trim();
        if (!msg) return '';
        /* `loc` is ["query", "assistant_id"] — naming the field turns
           "Input should be a valid integer" into something actionable. */
        const field = Array.isArray(item?.loc) ? item.loc[item.loc.length - 1] : '';
        return field ? `${field}: ${msg}` : msg;
      })
      .filter(Boolean);
    if (parts.length) return parts.join('; ');
  }

  if (typeof body?.message === 'string' && body.message.trim()) return body.message;

  return fallback;
}
