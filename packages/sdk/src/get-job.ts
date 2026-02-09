import { getSuiClient } from "./client.js";
import type { Job } from "./types.js";
import { JobStatus } from "./types.js";

/**
 * Parse JSON fields from gRPC getObject into a typed Job.
 */
export function parseJobJson(objectId: string, fields: Record<string, unknown>): Job {
  const workerField = fields.worker as { vec?: string[] } | string | null;
  const workerVal =
    workerField && typeof workerField === "object" && "vec" in workerField
      ? workerField.vec?.[0] ?? null
      : typeof workerField === "string"
        ? workerField
        : null;

  const solutionField = fields.solution_blob_id as { vec?: number[][] } | null;
  const solutionVal =
    solutionField &&
    typeof solutionField === "object" &&
    "vec" in solutionField &&
    solutionField.vec &&
    solutionField.vec.length > 0
      ? new TextDecoder().decode(new Uint8Array(solutionField.vec[0]))
      : null;

  return {
    id: objectId,
    poster: fields.poster as string,
    description: typeof fields.description === "string"
      ? fields.description
      : new TextDecoder().decode(new Uint8Array(fields.description as number[])),
    blobId: typeof fields.blob_id === "string"
      ? fields.blob_id
      : new TextDecoder().decode(new Uint8Array(fields.blob_id as number[])),
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
