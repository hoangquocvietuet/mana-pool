import { getSuiClient } from "./client.js";
import { PACKAGE_ID, MODULE_NAME } from "./constants.js";
import type { Job, JobPostedEvent, Proposal } from "./types.js";
import { JobStatus, JobTag, JobCategory, SelectionMode } from "./types.js";

/**
 * Decode a vector<u8> field from GraphQL JSON.
 */
function decodeVectorU8(field: unknown): string {
  if (typeof field === "string") {
    return new TextDecoder().decode(Uint8Array.from(atob(field), c => c.charCodeAt(0)));
  }
  return new TextDecoder().decode(new Uint8Array(field as number[]));
}

/**
 * Parse an Option field from GraphQL JSON.
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
 * Parse a GraphQL object (with json include) into a Job.
 */
function parseObject(obj: { objectId: string; json: Record<string, unknown> | null }): Job | null {
  const fields = obj.json;
  if (!fields) return null;

  return {
    id: obj.objectId,
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
 * Get jobs filtered by tag.
 */
export async function getJobsByTag(tag: JobTag): Promise<Job[]> {
  const all = await getAllJobs();
  return all.filter((j) => j.tag === tag && j.status === JobStatus.Open);
}

/**
 * Get jobs filtered by category.
 */
export async function getJobsByCategory(category: JobCategory): Promise<Job[]> {
  const all = await getAllJobs();
  return all.filter((j) => j.category === category);
}

/**
 * Get jobs posted by a specific address.
 */
export async function getJobsByPoster(address: string): Promise<Job[]> {
  const all = await getAllJobs();
  return all.filter((j) => j.poster === address);
}

/**
 * Get all completed jobs.
 */
export async function getCompletedJobs(): Promise<Job[]> {
  const all = await getAllJobs();
  return all.filter((j) => j.status === JobStatus.Completed);
}

/**
 * Get all refunded jobs.
 */
export async function getRefundedJobs(): Promise<Job[]> {
  const all = await getAllJobs();
  return all.filter((j) => j.status === JobStatus.Refunded);
}
