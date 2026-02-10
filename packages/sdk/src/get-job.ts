import { getSuiClient } from "./client.js";
import type { Job } from "./types.js";
import { JobStatus } from "./types.js";

/**
 * Decode a vector<u8> field from GraphQL JSON.
 * GraphQL returns vector<u8> as a base64 string; we need to decode it
 * back to the original UTF-8 string that was stored on-chain.
 */
function decodeVectorU8(field: unknown): string {
  if (typeof field === "string") {
    return new TextDecoder().decode(Uint8Array.from(atob(field), c => c.charCodeAt(0)));
  }
  return new TextDecoder().decode(new Uint8Array(field as number[]));
}

/**
 * Parse JSON fields from GraphQL getObject into a typed Job.
 */
export function parseJobJson(objectId: string, fields: Record<string, unknown>): Job {
  const workerField = fields.worker as { vec?: string[] } | string | null;
  const workerVal =
    workerField && typeof workerField === "object" && "vec" in workerField
      ? workerField.vec?.[0] ?? null
      : typeof workerField === "string"
        ? workerField
        : null;

  const solutionField = fields.solution_blob_id as { vec?: (string | number[])[] } | null;
  const solutionVal =
    solutionField &&
    typeof solutionField === "object" &&
    "vec" in solutionField &&
    solutionField.vec &&
    solutionField.vec.length > 0
      ? decodeVectorU8(solutionField.vec[0])
      : null;

  return {
    id: objectId,
    poster: fields.poster as string,
    description: decodeVectorU8(fields.description),
    blobId: decodeVectorU8(fields.blob_id),
    bountyAmount: Number(fields.bounty ?? 0),
    status: (fields.status as number) as JobStatus,
    worker: workerVal,
    solutionBlobId: solutionVal,
    isUrgent: fields.is_urgent as boolean,
  };
}

/**
 * Fetch a single Job by object ID and parse its fields.
 */
export async function getJob(jobId: string): Promise<Job> {
  const client = getSuiClient();

  const result = await client.getObject({
    objectId: jobId,
    include: { json: true },
  });

  if (!result.object.json) {
    throw new Error(`Job not found or no JSON content: ${jobId}`);
  }

  return parseJobJson(jobId, result.object.json);
}
