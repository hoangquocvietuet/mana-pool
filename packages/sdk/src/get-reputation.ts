import { getSuiClient } from "./client.js";
import { REPUTATION_BOARD_ID } from "./constants.js";

/**
 * Convert a Sui address (0x-prefixed hex) to base64 BCS encoding.
 * BCS for an address is just the raw 32 bytes.
 */
function addressToBcs(address: string): string {
  const hex = address.startsWith("0x") ? address.slice(2) : address;
  const padded = hex.padStart(64, "0");
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(padded.slice(i * 2, i * 2 + 2), 16);
  }
  // btoa works in both Node 16+ and browsers
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Get a user's reputation score from the on-chain ReputationBoard.
 * Returns 0 if the user has no reputation yet.
 */
export async function getUserReputation(address: string): Promise<number> {
  const client = getSuiClient();

  const result = await client.query({
    query: `
      query($parentId: SuiAddress!, $name: DynamicFieldName!) {
        object(address: $parentId) {
          dynamicField(name: $name) {
            value { ... on MoveValue { json } }
          }
        }
      }`,
    variables: {
      parentId: REPUTATION_BOARD_ID,
      name: {
        type: "address",
        bcs: addressToBcs(address),
      },
    },
  });

  type DFResult = {
    object?: {
      dynamicField?: {
        value?: { json?: unknown };
      } | null;
    } | null;
  };

  const data = result.data as DFResult;
  const json = data?.object?.dynamicField?.value?.json;
  if (json === null || json === undefined) return 0;

  return Number(json);
}
