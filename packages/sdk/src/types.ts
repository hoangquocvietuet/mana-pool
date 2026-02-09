export enum JobStatus {
  Open = 0,
  Claimed = 1,
  Completed = 2,
}

export interface Job {
  id: string;
  poster: string;
  description: string;
  blobId: string;
  bountyAmount: number;
  status: JobStatus;
  worker: string | null;
  solutionBlobId: string | null;
  isUrgent: boolean;
}

export interface JobPostedEvent {
  job_id: string;
  poster: string;
  description: number[];
  blob_id: number[];
  bounty_amount: string;
  is_urgent: boolean;
}

export interface JobClaimedEvent {
  job_id: string;
  worker: string;
}

export interface SolutionSubmittedEvent {
  job_id: string;
  worker: string;
  solution_blob_id: number[];
}

export interface PostJobParams {
  description: string;
  filePath?: string;
  text?: string;
  bountyMist: number;
  isUrgent: boolean;
}

export interface PostJobResult {
  jobId: string;
  blobId: string;
  digest: string;
}

export interface PollSolutionParams {
  jobId: string;
  intervalMs?: number;
  timeoutMs?: number;
}
