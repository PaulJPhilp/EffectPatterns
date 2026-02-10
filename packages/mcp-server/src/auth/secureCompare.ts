import { timingSafeEqual } from "crypto";

/**
 * Compare secrets in constant time to reduce timing side-channels.
 */
export function constantTimeEquals(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return timingSafeEqual(aBuffer, bBuffer);
}
