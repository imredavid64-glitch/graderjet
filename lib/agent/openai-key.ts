/**
 * Guard for the OPENAI_API_KEY environment variable.
 *
 * The chat route falls back to the offline mock agent ONLY when
 * OPENAI_API_KEY is absent. If a key is configured it must actually work: a
 * revoked or malformed key would otherwise send every request down the
 * real-model path and fail mid-stream with a cryptic OpenAI 401. This helper
 * validates the key up front so the route can fail loudly with a clear error
 * instead of appearing to "work" or erroring ambiguously.
 */

export interface OpenAIKeyCheck {
  ok: boolean;
  /** HTTP status OpenAI returned when rejecting the key (0 = network error). */
  status: number;
  /** Message shown to the operator / user. */
  message: string;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

let cached: { at: number; check: OpenAIKeyCheck } | undefined;

export async function checkOpenAIKey(
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
  now: () => number = Date.now,
): Promise<OpenAIKeyCheck> {
  const t = now();
  if (cached && t - cached.at < CACHE_TTL_MS) return cached.check;

  let check: OpenAIKeyCheck;
  try {
    const res = await fetchImpl("https://api.openai.com/v1/models", {
      headers: { authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
    check = res.ok
      ? { ok: true, status: 200, message: "OPENAI_API_KEY is valid." }
      : {
          ok: false,
          status: res.status,
          message:
            `OPENAI_API_KEY is set but OpenAI rejected it (HTTP ${res.status}). ` +
            `The key is invalid or revoked, or the account lacks access. Fix or remove ` +
            `the env var and redeploy. While a key is set the mock agent is intentionally ` +
            `NOT used, so the chat route refuses requests.`,
        };
  } catch {
    check = {
      ok: false,
      status: 0,
      message:
        `OPENAI_API_KEY is set but could not be validated against OpenAI ` +
        `(network error). While a key is set the mock agent is intentionally NOT used.`,
    };
  }

  cached = { at: t, check };
  return check;
}
