import { timingSafeEqual } from "crypto";

export type ApiKeyAuthResult =
  | { readonly ok: true; readonly authenticatedByApiKey: true }
  | { readonly ok: true; readonly authenticatedByApiKey: false }
  | { readonly ok: false; readonly error: string };

function constantTimeEquals(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return timingSafeEqual(aBuffer, bBuffer);
}

/**
 * Validate optional API key used by MCP streamable transport.
 *
 * Behavior:
 * - No key provided: caller must authenticate via OAuth bearer token.
 * - Key provided + server key configured: exact match required.
 * - Key provided + server key not configured: reject.
 */
export function validateTransportApiKey(
  providedApiKey: string | undefined,
  configuredApiKey: string | undefined,
): ApiKeyAuthResult {
  if (!providedApiKey) {
    return { ok: true, authenticatedByApiKey: false };
  }

  if (!configuredApiKey || configuredApiKey.trim() === "") {
    return {
      ok: false,
      error: "API key authentication is not configured on this server",
    };
  }

  if (!constantTimeEquals(providedApiKey, configuredApiKey)) {
    return { ok: false, error: "Invalid API key" };
  }

  return { ok: true, authenticatedByApiKey: true };
}
