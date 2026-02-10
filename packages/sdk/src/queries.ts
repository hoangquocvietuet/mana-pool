import { getSuiClient } from "./client.js";
import { PACKAGE_ID, MODULE_NAME } from "./constants.js";
import type { Job, JobPostedEvent } from "./types.js";
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
 * Parse a GraphQL object (with json include) into a Job.
 */
function parseObject(obj: { objectId: string; json: Record<string, unknown> | null }): Job | null {
  const fields = obj.json;
  if (!fields) return null;

  const workerField = fields.worker as { vec?: string[] } | string | null;
  const workerVal =
    workerField && typeof workerField === "object" && "vec" in workerField
      ? workerField.vec?.[0] ?? null
      : typeof workerField === "string"
        ? workerField
        : null;

  const solutionRaw = fields.solution_blob_id;
  let solutionVal: string | null = null;
  if (typeof solutionRaw === "string" || Array.isArray(solutionRaw)) {
    solutionVal = decodeVectorU8(solutionRaw);
  } else if (
    solutionRaw &&
    typeof solutionRaw === "object" &&
    "vec" in solutionRaw
  ) {
    const vec = (solutionRaw as { vec?: (string | number[])[] }).vec;
    if (vec && vec.length > 0) solutionVal = decodeVectorU8(vec[0]);
  }

  return {
    id: obj.objectId,
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
 * Get all jobs by querying JobPosted events via GraphQL, then fetching current state.
 */
export async function getAllJobs(): Promise<Job[]> {
  const client = getSuiClient();

  const eventType = `${PACKAGE_ID}::${MODULE_NAME}::JobPosted`;
  const events = await client.query({
    query: `
      query($type: String!) {
        events(filter: { type: $type }) {
          nodes {
            contents { json }
          }
        }
      }`,
    variables: { type: eventType },
  });

  type EventNode = { contents: { json: Record<string, unknown> } };
  const nodes = ((events.data as Record<string, unknown>)?.events as { nodes?: EventNode[] })?.nodes ?? [];
  if (nodes.length === 0) return [];

  const jobIds = nodes.map((n) => (n.contents.json as unknown as JobPostedEvent).job_id);
  const uniqueIds = [...new Set(jobIds)];

  const result = await client.getObjects({
    objectIds: uniqueIds,
    include: { json: true },
  });

  const jobs: Job[] = [];
  for (const obj of result.objects) {
    if (obj instanceof Error) continue;
    const job = parseObject(obj);
    if (job) jobs.push(job);
  }

  return jobs;
}

/**
 * Get all open jobs (status = Open).
 */
export async function getOpenJobs(): Promise<Job[]> {
  const all = await getAllJobs();
  return all.filter((j) => j.status === JobStatus.Open);
}

/**
 * Get all urgent open jobs.
 */
export async function getUrgentJobs(): Promise<Job[]> {
  const all = await getAllJobs();
  return all.filter((j) => j.isUrgent && j.status === JobStatus.Open);
}

/**
 * Get jobs posted by a specific address.
 */
export async function getJobsByPoster(address: string): Promise<Job[]> {
  const all = await getAllJobs();
  return all.filter((j) => j.poster === address);
}

/**
 * Get jobs claimed/completed by a specific worker.
 */
export async function getJobsByWorker(address: string): Promise<Job[]> {
  const all = await getAllJobs();
  return all.filter((j) => j.worker === address);
}

/**
 * Get all completed jobs.
 */
export async function getCompletedJobs(): Promise<Job[]> {
  const all = await getAllJobs();
  return all.filter((j) => j.status === JobStatus.Completed);
}
