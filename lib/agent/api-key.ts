/**
 * Guard for the real-model API keys (OPENROUTER_API_KEY / OPENAI_API_KEY).
 *
 * The chat route falls back to the offline mock agent ONLY when no API key is
 * configured. If a key is configured it must actually work: a revoked or
 * malformed key would otherwise send every request down the real-model path
 * and fail mid-stream with a cryptic 401 from the provider. This helper
 * validates the key up front so the route can fail loudly with a clear error
 * instead of appearing to "work" or erroring ambiguously.
 */

export type ApiKeyProvider = "openrouter" | "openai";

export interface ApiKeyCheck {
  ok: boolean;
  /** HTTP status the provider returned when rejecting the key (0 = network error). */
  status: number;
  /** Message shown to the operator / user. */
  message: string;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

let cached: { at: number; check: ApiKeyCheck } | undefined;

const ENDPOINTS: Record<ApiKeyProvider, string> = {
  openrouter: "https://openrouter.ai/api/v1/models",
  openai: "https://api.openai.com/v1/models",
};

const LABELS: Record<ApiKeyProvider, string> = {
  openrouter: "OPENROUTER_API_KEY",
  openai: "OPENAI_API_KEY",
};

export async function checkApiKey(
  provider: ApiKeyProvider,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
  now: () => number = Date.now,
): Promise<ApiKeyCheck> {
  const t = now();
  if (cached && t - cached.at < CACHE_TTL_MS) return cached.check;

  const label = LABELS[provider];
  let check: ApiKeyCheck;
  try {
    const res = await fetchImpl(ENDPOINTS[provider], {
      headers: { authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
    check = res.ok
      ? { ok: true, status: res.status, message: `${label} is valid.` }
      : {
          ok: false,
          status: res.status,
          message:
            `${label} is set but ${provider} rejected it (HTTP ${res.status}). ` +
            `The key is invalid or revoked, or the account lacks access. Fix or remove ` +
            `the env var and redeploy. While a key is set the mock agent is intentionally ` +
            `NOT used, so the chat route refuses requests.`,
        };
  } catch {
    check = {
      ok: false,
      status: 0,
      message:
        `${label} is set but could not be validated against ${provider} ` +
        `(network error). While a key is set the mock agent is intentionally NOT used.`,
    };
  }

  cached = { at: t, check };
  return check;
}

/** Pick the real-model provider to use, or "mock" when no key is configured. */
export function resolveApiKeyProvider(): {
  provider: ApiKeyProvider | "mock";
  apiKey?: string;
} {
  if (process.env.OPENROUTER_API_KEY) {
    return { provider: "openrouter", apiKey: process.env.OPENROUTER_API_KEY };
  }
  if (process.env.OPENAI_API_KEY) {
    return { provider: "openai", apiKey: process.env.OPENAI_API_KEY };
  }
  return { provider: "mock" };
}
