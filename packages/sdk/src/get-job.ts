import { getSuiClient } from "./client.js";
import type { Job, Proposal } from "./types.js";
import { JobStatus, JobTag, JobCategory, SelectionMode } from "./types.js";

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
 * Parse an Option field from GraphQL JSON.
 * GraphQL returns Option<T> as { vec: [value] } or { vec: [] }.
 */
function parseOption<T>(field: unknown, decoder?: (v: unknown) => T): T | null {
  if (field === null || field === undefined) return null;
  if (typeof field === "object" && field !== null && "vec" in field) {
    const vec = (field as { vec?: unknown[] }).vec;
    if (vec && vec.length > 0) {
      return decoder ? decoder(vec[0]) : (vec[0] as T);
    }
    return null;
  }
  return decoder ? decoder(field) : (field as T);
}

/**
 * Parse proposals array from GraphQL JSON.
 */
function parseProposals(field: unknown): Proposal[] {
  if (!Array.isArray(field)) return [];
  return field.map((p: Record<string, unknown>) => ({
    proposer: p.proposer as string,
    solutionBlobId: decodeVectorU8(p.solution_blob_id),
  }));
}

/**
 * Parse JSON fields from GraphQL getObject into a typed Job.
 */
export function parseJobJson(objectId: string, fields: Record<string, unknown>): Job {
  return {
    id: objectId,
    poster: fields.poster as string,
    description: decodeVectorU8(fields.description),
    blobId: decodeVectorU8(fields.blob_id),
    bountyAmount: Number(fields.bounty ?? 0),
    status: (fields.status as number) as JobStatus,
    tag: (fields.tag as number) as JobTag,
    category: (fields.category as number) as JobCategory,
    deadline: Number(fields.deadline ?? 0),
    selectionMode: (fields.selection_mode as number) as SelectionMode,
    maxProposals: Number(fields.max_proposals ?? 0),
    proposals: parseProposals(fields.proposals),
    winner: parseOption<string>(fields.winner),
    winningSolution: parseOption<string>(fields.winning_solution, decodeVectorU8),
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
