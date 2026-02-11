import { WALRUS_PUBLISHER_URL, WALRUS_AGGREGATOR_URL } from "./constants.js";

export interface WalrusStoreResponse {
  newlyCreated?: {
    blobObject: {
      blobId: string;
    };
  };
  alreadyCertified?: {
    blobId: string;
  };
}

/**
 * Upload data to Walrus and return the blob ID.
 */
export async function uploadToWalrus(data: Uint8Array): Promise<string> {
  const res = await fetch(`${WALRUS_PUBLISHER_URL}/v1/blobs`, {
    method: "PUT",
    body: data as unknown as BodyInit,
  });

  if (!res.ok) {
    throw new Error(`Walrus upload failed: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as WalrusStoreResponse;

  const blobId =
    json.newlyCreated?.blobObject.blobId ?? json.alreadyCertified?.blobId;

  if (!blobId) {
    throw new Error("Walrus upload: no blob ID in response");
  }

  return blobId;
}

/**
 * Download data from Walrus by blob ID.
 */
export async function downloadFromWalrus(blobId: string): Promise<Uint8Array> {
  const res = await fetch(`${WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `Walrus download failed: ${res.status} ${res.statusText}`,
    );
  }

  return new Uint8Array(await res.arrayBuffer());
}
