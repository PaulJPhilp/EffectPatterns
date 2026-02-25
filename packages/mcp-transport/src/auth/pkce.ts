/**
 * PKCE (Proof Key for Code Exchange) Implementation
 *
 * OAuth 2.1 requires PKCE for public clients to prevent authorization code interception attacks.
 * This implementation follows RFC 7636.
 */

import { createHash, randomBytes } from "crypto";

export interface PKCEPair {
    codeVerifier: string;
    codeChallenge: string;
    codeChallengeMethod: "S256";
}

/**
 * Generate a PKCE code verifier and challenge
 * Code verifier: 43-128 characters of [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"
 */
export function generatePKCE(): PKCEPair {
    // Generate a random 32-byte value and base64url encode it
    const codeVerifier = randomBytes(32)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "")
        .substring(0, 128); // Ensure length is within 43-128 chars

    // Create SHA256 hash and base64url encode for challenge
    const hash = createHash("sha256").update(codeVerifier).digest("base64");
    const codeChallenge = hash
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");

    return {
        codeVerifier,
        codeChallenge,
        codeChallengeMethod: "S256",
    };
}

/**
 * Verify a PKCE code challenge against a verifier
 */
export function verifyPKCE(
    codeChallenge: string,
    codeVerifier: string,
): boolean {
    const hash = createHash("sha256").update(codeVerifier).digest("base64");
    const computedChallenge = hash
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");

    return computedChallenge === codeChallenge;
}
