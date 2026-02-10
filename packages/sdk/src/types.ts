export enum JobStatus {
  Open = 0,
  Completed = 1,
  Refunded = 2,
}

export enum JobTag {
  Urgent = 0,
  Chill = 1,
}

export enum JobCategory {
  Captcha = 0,
  Crypto = 1,
  Design = 2,
  Data = 3,
  General = 4,
}

export enum SelectionMode {
  FirstAnswer = 0,
  FirstN = 1,
  BestAnswer = 2,
}

export interface Proposal {
  proposer: string;
  solutionBlobId: string;
}

export interface Job {
  id: string;
  poster: string;
  description: string;
  blobId: string;
  bountyAmount: number;
  status: JobStatus;
  tag: JobTag;
  category: JobCategory;
  deadline: number;
  selectionMode: SelectionMode;
  maxProposals: number;
  proposals: Proposal[];
  winner: string | null;
  winningSolution: string | null;
}

export interface JobPostedEvent {
  job_id: string;
  poster: string;
  description: number[];
  blob_id: number[];
  bounty_amount: string;
  tag: number;
  category: number;
  deadline: string;
  selection_mode: number;
  max_proposals: string;
}

export interface ProposalSubmittedEvent {
  job_id: string;
  proposer: string;
  solution_blob_id: number[];
}

export interface WinnerSelectedEvent {
  job_id: string;
  winner: string;
  bounty_amount: string;
}

export interface JobRefundedEvent {
  job_id: string;
  poster: string;
  bounty_amount: string;
}

export interface PostJobParams {
  description: string;
  filePath?: string;
  text?: string;
  bountyMist: number;
  tag: JobTag;
  category: JobCategory;
  deadlineMinutes: number;
  selectionMode: SelectionMode;
  maxProposals: number;
}

export interface PostJobResult {
  jobId: string;
  blobId: string;
  digest: string;
}

export interface ProposeSolutionParams {
  jobId: string;
  solution: string;
}

export interface SelectWinnerParams {
  jobId: string;
  winnerAddress: string;
}

export interface RefundJobParams {
  jobId: string;
}

export interface PollWinnerParams {
  jobId: string;
  intervalMs?: number;
  timeoutMs?: number;
}
