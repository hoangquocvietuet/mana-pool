import { Transaction } from "@mysten/sui/transactions";
import { getSuiClient, getKeypair } from "./client.js";
import { PACKAGE_ID, MODULE_NAME, REPUTATION_BOARD_ID } from "./constants.js";
import type { SelectWinnerParams } from "./types.js";

/**
 * Select a winner from the proposals. Poster only.
 * Pays the bounty to the winner and increments their reputation.
 */
export async function selectWinner(params: SelectWinnerParams): Promise<string> {
  const { jobId, winnerAddress } = params;

  const keypair = getKeypair();
  const client = getSuiClient();

  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::select_winner`,
    arguments: [
      tx.object(jobId),
      tx.pure.address(winnerAddress),
      tx.object(REPUTATION_BOARD_ID),
    ],
  });

  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    include: { effects: true },
  });

  if (result.$kind === "FailedTransaction") {
    throw new Error("Transaction failed");
  }

  return result.Transaction.digest;
}
