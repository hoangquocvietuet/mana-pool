import { getJob } from "./get-job.js";
import { downloadFromWalrus } from "./walrus.js";
import { JobStatus, type PollSolutionParams } from "./types.js";

/**
 * Poll a job until it's completed, then download the solution from Walrus.
 * Returns the solution as a string.
 */
export async function pollSolution(
  params: PollSolutionParams,
): Promise<string> {
  const { jobId, intervalMs = 5000, timeoutMs = 300_000 } = params;

  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const job = await getJob(jobId);

    if (job.status === JobStatus.Completed && job.solutionBlobId) {
      const data = await downloadFromWalrus(job.solutionBlobId);
      return new TextDecoder().decode(data);
    }

    if (job.status === JobStatus.Claimed) {
      console.log("Job claimed by worker, waiting for solution...");
    } else if (job.status === JobStatus.Open) {
      console.log("Job still open, waiting for worker...");
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Timeout: no solution received within ${timeoutMs / 1000}s`);
}
