import { Transaction } from "@mysten/sui/transactions";
import { getSuiClient, getKeypair } from "./client.js";
import { uploadToWalrus } from "./walrus.js";
import { PACKAGE_ID, MODULE_NAME, CLOCK_OBJECT_ID } from "./constants.js";
import type { ProposeSolutionParams } from "./types.js";

/**
 * Propose a solution to an open job.
 * Uploads solution text to Walrus, then calls the Move contract.
 */
export async function proposeSolution(params: ProposeSolutionParams): Promise<string> {
  const { jobId, solution } = params;

  // Upload solution to Walrus
  const solutionData = new TextEncoder().encode(solution);
  const solutionBlobId = await uploadToWalrus(solutionData);
  console.log(`Uploaded solution to Walrus. Blob ID: ${solutionBlobId}`);

  const keypair = getKeypair();
  const client = getSuiClient();

  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::propose_solution`,
    arguments: [
      tx.object(jobId),
      tx.pure.vector("u8", new TextEncoder().encode(solutionBlobId)),
      tx.object(CLOCK_OBJECT_ID),
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
