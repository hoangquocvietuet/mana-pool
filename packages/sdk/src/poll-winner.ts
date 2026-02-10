import { getJob } from "./get-job.js";
import { downloadFromWalrus } from "./walrus.js";
import { JobStatus, type PollWinnerParams } from "./types.js";

/**
 * Poll a job until a winner is selected, then download the winning solution from Walrus.
 * Returns the solution as a string.
 */
export async function pollWinner(
  params: PollWinnerParams,
): Promise<string> {
  const { jobId, intervalMs = 5000, timeoutMs = 300_000 } = params;

  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const job = await getJob(jobId);

    if (job.status === JobStatus.Completed && job.winningSolution) {
      const data = await downloadFromWalrus(job.winningSolution);
      return new TextDecoder().decode(data);
    }

    if (job.status === JobStatus.Refunded) {
      throw new Error("Job was refunded — no winner selected");
    }

    const proposalCount = job.proposals.length;
    console.log(`Job still open (${proposalCount} proposal${proposalCount !== 1 ? "s" : ""}), waiting for winner selection...`);

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Timeout: no winner selected within ${timeoutMs / 1000}s`);
}
