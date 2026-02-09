import { SuiGraphQLClient } from "@mysten/sui/graphql";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { NETWORK } from "./constants.js";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";

let _client: SuiGraphQLClient | null = null;

export function getSuiClient(): SuiGraphQLClient {
  if (!_client) {
    _client = new SuiGraphQLClient({
      url: 'https://graphql.testnet.sui.io/graphql',
      network: NETWORK,
    });
  }
  return _client;
}

/**
 * Load keypair from SUI_PRIVATE_KEY env var.
 * Supports both Bech32 suiprivkey format and raw base64.
 */
export function getKeypair(): Ed25519Keypair {
  const key = process.env.SUI_PRIVATE_KEY;
  if (!key) {
    throw new Error("SUI_PRIVATE_KEY environment variable is not set");
  }

  // Try suiprivkey bech32 format first (suiprivkey1...)
  if (key.startsWith("suiprivkey")) {
    const { secretKey } = decodeSuiPrivateKey(key);
    return Ed25519Keypair.fromSecretKey(secretKey);
  }

  // Fallback: raw base64-encoded 32-byte secret key
  const raw = Buffer.from(key, "base64");
  return Ed25519Keypair.fromSecretKey(raw);
}
