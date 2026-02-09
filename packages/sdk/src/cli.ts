#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import { postJob } from "./post-job.js";
import { pollSolution } from "./poll-solution.js";
import { getJob } from "./get-job.js";
import { JobStatus } from "./types.js";

const program = new Command();

program
  .name("manapool")
  .description("ManaPool CLI - Post tasks for humans to solve")
  .version("0.1.0");

program
  .command("post-job")
  .description("Post a new job to ManaPool")
  .requiredOption("-d, --description <desc>", "Job description")
  .option("-f, --file <path>", "File to upload (image, text, etc.)")
  .option("-t, --text <text>", "Inline text content")
  .requiredOption(
    "-b, --bounty <mist>",
    "Bounty amount in MIST (1 SUI = 1000000000 MIST)",
  )
  .option("-u, --urgent", "Mark as urgent", false)
  .action(async (opts) => {
    try {
      const result = await postJob({
        description: opts.description,
        filePath: opts.file,
        text: opts.text,
        bountyMist: parseInt(opts.bounty, 10),
        isUrgent: opts.urgent,
      });

      console.log(`Job posted! ID: ${result.jobId}`);
      console.log(`Blob ID: ${result.blobId}`);
      console.log(`Tx Digest: ${result.digest}`);
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

program
  .command("poll")
  .description("Poll for a job solution (blocking)")
  .requiredOption("-j, --job-id <id>", "Job object ID")
  .option("-t, --timeout <seconds>", "Timeout in seconds", "300")
  .action(async (opts) => {
    try {
      const solution = await pollSolution({
        jobId: opts.jobId,
        timeoutMs: parseInt(opts.timeout, 10) * 1000,
      });
      console.log(`Solution received: ${solution}`);
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

program
  .command("status")
  .description("Check job status (non-blocking)")
  .requiredOption("-j, --job-id <id>", "Job object ID")
  .action(async (opts) => {
    try {
      const job = await getJob(opts.jobId);
      const statusMap = ["Open", "Claimed", "Completed"];
      console.log(`Status: ${statusMap[job.status]}`);
      console.log(`Description: ${job.description}`);
      console.log(`Bounty: ${job.bountyAmount / 1_000_000_000} SUI`);
      console.log(`Urgent: ${job.isUrgent}`);
      if (job.worker) console.log(`Worker: ${job.worker}`);
      if (job.solutionBlobId) console.log(`Solution Blob: ${job.solutionBlobId}`);

      // If completed, fetch and display the solution
      if (job.status === JobStatus.Completed && job.solutionBlobId) {
        const { downloadFromWalrus } = await import("./walrus.js");
        const data = await downloadFromWalrus(job.solutionBlobId);
        console.log(`Solution: ${new TextDecoder().decode(data)}`);
      }
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

program.parse();
