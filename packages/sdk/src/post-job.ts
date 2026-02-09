import { Transaction } from "@mysten/sui/transactions";
import { getSuiClient, getKeypair } from "./client.js";
import { uploadToWalrus } from "./walrus.js";
import { PACKAGE_ID, MODULE_NAME } from "./constants.js";
import type { PostJobParams, PostJobResult } from "./types.js";
import { readFileSync } from "node:fs";

/**
 * Post a new job to ManaPool.
 * Uploads task data to Walrus, then calls the Move contract to create a Job with escrowed bounty.
 */
export async function postJob(params: PostJobParams): Promise<PostJobResult> {
  const { description, filePath, text, bountyMist, isUrgent } = params;

  // Prepare data for Walrus upload
  let dataToUpload: Uint8Array;
  if (filePath) {
    dataToUpload = readFileSync(filePath);
  } else if (text) {
    dataToUpload = new TextEncoder().encode(text);
  } else {
    dataToUpload = new TextEncoder().encode(description);
  }

  // Upload to Walrus
  const blobId = await uploadToWalrus(dataToUpload);
  console.log(`Uploaded to Walrus. Blob ID: ${blobId}`);

  const keypair = getKeypair();
  const client = getSuiClient();

  const tx = new Transaction();

  // Split bounty from gas coin
  const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(bountyMist)]);

  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::post_job`,
    arguments: [
      tx.pure.vector("u8", new TextEncoder().encode(description)),
      tx.pure.vector("u8", new TextEncoder().encode(blobId)),
      tx.pure.bool(isUrgent),
      coin,
    ],
  });

  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    include: {
      effects: true,
      events: true,
    },
  });

  if (result.$kind === "FailedTransaction") {
    throw new Error("Transaction failed");
  }

  const digest = result.Transaction.digest;

  // Extract job ID from effects - look for created objects
  const effects = result.Transaction.effects;
  const created = effects?.changedObjects.filter((o) => o.idOperation === "Created");
  if (!created || created.length === 0) {
    throw new Error("No objects created in transaction");
  }

  const sharedObj = created.find(
    (o) => o.outputOwner !== null && typeof o.outputOwner === "object" && "Shared" in o.outputOwner,
  );
  const jobId = sharedObj?.objectId ?? created[0]?.objectId ?? "unknown";

  return {
    jobId,
    blobId,
    digest,
  };
}
