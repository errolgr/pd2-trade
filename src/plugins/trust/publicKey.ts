/**
 * Ed25519 public key (base64 of the raw 32 bytes) that verifies marketplace bundle and blocklist signatures.
 * The server signs with PLUGIN_SIGNING_KEY (pd2-price-crawler, never committed).
 *
 * This is the DEV/TEST key pair's public half (shared with the server's local mode). Swap in the production
 * public key before the marketplace is enabled for users; a dev-signed bundle must never verify in production.
 */
export const PLUGIN_PUBLIC_KEY = 'Q4Czp7hIitHiquChN6PDPjUJkdms8wHxMkHAEWiL70s=';
