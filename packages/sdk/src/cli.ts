#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import { postJob } from "./post-job.js";
import { proposeSolution } from "./propose-solution.js";
import { selectWinner } from "./select-winner.js";
import { refundJob } from "./refund-job.js";
import { pollWinner } from "./poll-winner.js";
import { getJob } from "./get-job.js";
import { JobStatus, JobTag, JobCategory, SelectionMode } from "./types.js";

const TAG_MAP: Record<string, JobTag> = {
  urgent: JobTag.Urgent,
  chill: JobTag.Chill,
};

const CATEGORY_MAP: Record<string, JobCategory> = {
  captcha: JobCategory.Captcha,
  crypto: JobCategory.Crypto,
  design: JobCategory.Design,
  data: JobCategory.Data,
  general: JobCategory.General,
};

const MODE_MAP: Record<string, SelectionMode> = {
  "first-answer": SelectionMode.FirstAnswer,
  "first-n": SelectionMode.FirstN,
  "best-answer": SelectionMode.BestAnswer,
};

const program = new Command();

program
  .name("manapool")
  .description("ManaPool CLI - Post tasks for humans to solve")
  .version("0.2.0");

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
  .option("--tag <tag>", "Job tag: urgent or chill", "chill")
  .option("--category <cat>", "Job category: captcha, crypto, design, data, general", "general")
  .option("--deadline <minutes>", "Deadline in minutes from now", "60")
  .option("--mode <mode>", "Selection mode: first-answer, first-n, best-answer", "best-answer")
  .option("--max-proposals <n>", "Maximum number of proposals", "10")
  .action(async (opts) => {
    try {
      const tag = TAG_MAP[opts.tag];
      if (tag === undefined) {
        console.error(`Invalid tag: ${opts.tag}. Use: urgent, chill`);
        process.exit(1);
      }
      const category = CATEGORY_MAP[opts.category];
      if (category === undefined) {
        console.error(`Invalid category: ${opts.category}. Use: captcha, crypto, design, data, general`);
        process.exit(1);
      }
      const mode = MODE_MAP[opts.mode];
      if (mode === undefined) {
        console.error(`Invalid mode: ${opts.mode}. Use: first-answer, first-n, best-answer`);
        process.exit(1);
      }

      const result = await postJob({
        description: opts.description,
        filePath: opts.file,
        text: opts.text,
        bountyMist: parseInt(opts.bounty, 10),
        tag,
        category,
        deadlineMinutes: parseInt(opts.deadline, 10),
        selectionMode: mode,
        maxProposals: parseInt(opts.maxProposals, 10),
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
  .command("propose")
  .description("Propose a solution to an open job")
  .requiredOption("-j, --job-id <id>", "Job object ID")
  .requiredOption("-s, --solution <text>", "Solution text")
  .action(async (opts) => {
    try {
      const digest = await proposeSolution({
        jobId: opts.jobId,
        solution: opts.solution,
      });
      console.log(`Proposal submitted! Tx Digest: ${digest}`);
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

program
  .command("select-winner")
  .description("Select a winning proposal (poster only)")
  .requiredOption("-j, --job-id <id>", "Job object ID")
  .requiredOption("-w, --winner <address>", "Winner address")
  .action(async (opts) => {
    try {
      const digest = await selectWinner({
        jobId: opts.jobId,
        winnerAddress: opts.winner,
      });
      console.log(`Winner selected! Tx Digest: ${digest}`);
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

program
  .command("refund")
  .description("Refund the bounty (poster only, open jobs only)")
  .requiredOption("-j, --job-id <id>", "Job object ID")
  .action(async (opts) => {
    try {
      const digest = await refundJob({ jobId: opts.jobId });
      console.log(`Job refunded! Tx Digest: ${digest}`);
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

program
  .command("poll")
  .description("Poll for a winner selection (blocking)")
  .requiredOption("-j, --job-id <id>", "Job object ID")
  .option("-t, --timeout <seconds>", "Timeout in seconds", "300")
  .action(async (opts) => {
    try {
      const solution = await pollWinner({
        jobId: opts.jobId,
        timeoutMs: parseInt(opts.timeout, 10) * 1000,
      });
      console.log(`Winning solution: ${solution}`);
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
      const statusMap = ["Open", "Completed", "Refunded"];
      const tagMap = ["Urgent", "Chill"];
      const categoryMap = ["Captcha", "Crypto", "Design", "Data", "General"];
      const modeMap = ["FirstAnswer", "FirstN", "BestAnswer"];

      console.log(`Status: ${statusMap[job.status]}`);
      console.log(`Description: ${job.description}`);
      console.log(`Bounty: ${job.bountyAmount / 1_000_000_000} SUI`);
      console.log(`Tag: ${tagMap[job.tag]}`);
      console.log(`Category: ${categoryMap[job.category]}`);
      console.log(`Selection Mode: ${modeMap[job.selectionMode]}`);
      console.log(`Deadline: ${new Date(job.deadline).toISOString()}`);
      console.log(`Max Proposals: ${job.maxProposals}`);
      console.log(`Proposals: ${job.proposals.length}`);

      if (job.proposals.length > 0) {
        console.log("--- Proposals ---");
        for (let i = 0; i < job.proposals.length; i++) {
          const p = job.proposals[i];
          console.log(`  [${i}] proposer: ${p.proposer}`);
          console.log(`      blob: ${p.solutionBlobId}`);
        }
      }

      if (job.winner) console.log(`Winner: ${job.winner}`);

      if (job.status === JobStatus.Completed && job.winningSolution) {
        const { downloadFromWalrus } = await import("./walrus.js");
        const data = await downloadFromWalrus(job.winningSolution);
        console.log(`Winning Solution: ${new TextDecoder().decode(data)}`);
      }

      if (job.status === JobStatus.Refunded) {
        console.log("(Job was refunded)");
      }
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

program.parse();
