import { Transaction } from "@mysten/sui/transactions";
import { getSuiClient, getKeypair } from "./client.js";
import { PACKAGE_ID, MODULE_NAME } from "./constants.js";
import type { RefundJobParams } from "./types.js";

/**
 * Refund the bounty to the poster. Poster only, OPEN jobs only.
 */
export async function refundJob(params: RefundJobParams): Promise<string> {
  const { jobId } = params;

  const keypair = getKeypair();
  const client = getSuiClient();

  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::refund`,
    arguments: [tx.object(jobId)],
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
