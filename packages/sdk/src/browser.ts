// Browser-safe exports (no node:fs dependency)
export { JobStatus } from "./types.js";
export type {
  Job,
  PostJobParams,
  PostJobResult,
  PollSolutionParams,
  JobPostedEvent,
  JobClaimedEvent,
  SolutionSubmittedEvent,
} from "./types.js";

export { PACKAGE_ID, MODULE_NAME, NETWORK, WALRUS_PUBLISHER_URL, WALRUS_AGGREGATOR_URL } from "./constants.js";
export { uploadToWalrus, downloadFromWalrus } from "./walrus.js";
export { getSuiClient } from "./client.js";
export { getJob, parseJobJson } from "./get-job.js";
export {
  getAllJobs,
  getOpenJobs,
  getUrgentJobs,
  getJobsByPoster,
  getJobsByWorker,
  getCompletedJobs,
} from "./queries.js";
