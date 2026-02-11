"use client";

import type { Job } from "@mana-pool/sdk/browser";
import { JobStatus, JobTag, JobCategory, SelectionMode } from "@mana-pool/sdk/browser";
import { useEffect, useState, useCallback } from "react";
import { downloadFromWalrus } from "@mana-pool/sdk/browser";
import { ProposeSolution } from "./ProposeSolution";
import { useSelectWinner } from "@/hooks/useSelectWinner";
import { useRefundJob } from "@/hooks/useRefundJob";
import { useCurrentAccount } from "@mysten/dapp-kit-react";

interface JobDetailModalProps {
  job: Job;
  onClose: () => void;
}

const STATUS_LABELS: Record<number, string> = {
  0: "Open",
  1: "Completed",
  2: "Refunded",
};

const TAG_LABELS: Record<number, string> = {
  [JobTag.Urgent]: "Urgent",
  [JobTag.Chill]: "Chill",
};

const CATEGORY_LABELS: Record<number, string> = {
  [JobCategory.Captcha]: "Captcha",
  [JobCategory.Crypto]: "Crypto",
  [JobCategory.Design]: "Design",
  [JobCategory.Data]: "Data",
  [JobCategory.General]: "General",
};

const MODE_LABELS: Record<number, string> = {
  [SelectionMode.FirstAnswer]: "First Answer",
  [SelectionMode.FirstN]: "First N",
  [SelectionMode.BestAnswer]: "Best Answer",
};

function formatDeadline(deadline: number): string {
  const diff = deadline - Date.now();
  if (diff <= 0) return "Expired";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m left`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m left`;
  return `${Math.floor(hrs / 24)}d left`;
}

export function JobDetailModal({ job, onClose }: JobDetailModalProps) {
  const [blobContent, setBlobContent] = useState<string | null>(null);
  const [blobImageUrl, setBlobImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const account = useCurrentAccount();
  const { selectWinner, isPending: isSelecting } = useSelectWinner();
  const { refundJob, isPending: isRefunding } = useRefundJob();

  const isPoster = account?.address && job.poster === account.address;
  const alreadyProposed = account?.address && job.proposals.some((p) => p.proposer === account.address);
  const bountyInSui = job.bountyAmount / 1_000_000_000;
  const deadlineExpired = job.deadline <= Date.now();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await downloadFromWalrus(job.blobId);
        const isPng =
          data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e;
        const isJpg = data[0] === 0xff && data[1] === 0xd8;
        const isGif = data[0] === 0x47 && data[1] === 0x49;
        const isWebp =
          data[8] === 0x57 &&
          data[9] === 0x45 &&
          data[10] === 0x42 &&
          data[11] === 0x50;

        if (isPng || isJpg || isGif || isWebp) {
          const mime = isPng
            ? "image/png"
            : isJpg
              ? "image/jpeg"
              : isGif
                ? "image/gif"
                : "image/webp";
          const blob = new Blob([data.buffer as ArrayBuffer], { type: mime });
          if (!cancelled) setBlobImageUrl(URL.createObjectURL(blob));
        } else {
          if (!cancelled)
            setBlobContent(new TextDecoder().decode(data));
        }
      } catch {
        if (!cancelled) setBlobContent("Failed to load task content");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [job.blobId]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Job details"
    >
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-surface p-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 cursor-pointer rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-light hover:text-text"
          aria-label="Close"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-5 w-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-6 pr-8">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                job.status === JobStatus.Open
                  ? "bg-cta/20 text-cta"
                  : job.status === JobStatus.Completed
                    ? "bg-text-muted/20 text-text-muted"
                    : "bg-urgent/20 text-urgent"
              }`}
            >
              {STATUS_LABELS[job.status]}
            </span>
            <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
              job.tag === JobTag.Urgent ? "bg-urgent/20 text-urgent" : "bg-surface-light text-text-muted"
            }`}>
              {TAG_LABELS[job.tag]}
            </span>
            <span className="rounded-md bg-surface-light px-2.5 py-1 text-xs text-text-muted">
              {CATEGORY_LABELS[job.category]}
            </span>
            <span className="rounded-md bg-surface-light px-2.5 py-1 text-xs text-text-muted">
              {MODE_LABELS[job.selectionMode]}
            </span>
            <span className="font-heading text-lg font-bold text-cta glow-green">
              {bountyInSui} SUI
            </span>
          </div>
          <h2 className="font-heading text-xl font-bold">{job.description}</h2>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-muted">
            <span>Posted by {job.poster.slice(0, 8)}...{job.poster.slice(-6)}</span>
            <span>{formatDeadline(job.deadline)}</span>
            <span>{job.proposals.length}/{job.maxProposals} proposals</span>
          </div>
        </div>

        {/* Task content from Walrus */}
        <div className="mb-6 rounded-xl border border-border bg-bg p-4">
          <h3 className="mb-3 text-sm font-semibold text-text-muted uppercase tracking-wider">
            Task Content
          </h3>
          {loading && (
            <div className="flex items-center gap-2 text-text-muted">
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Loading from Walrus...
            </div>
          )}
          {blobImageUrl && (
            <img
              src={blobImageUrl}
              alt="Task content"
              className="max-w-full rounded-lg"
            />
          )}
          {blobContent && (
            <pre className="whitespace-pre-wrap text-sm text-text leading-relaxed">
              {blobContent}
            </pre>
          )}
        </div>

        {/* Open job, NOT poster: Show proposal form or already-proposed notice */}
        {job.status === JobStatus.Open && account && !isPoster && !deadlineExpired && (
          alreadyProposed ? (
            <div className="rounded-xl border border-cta/30 bg-cta/10 p-4 text-center">
              <p className="text-sm font-semibold text-cta">You have already submitted a proposal for this job.</p>
            </div>
          ) : (
            <ProposeSolution jobId={job.id} onSuccess={onClose} />
          )
        )}

        {/* Open job, IS poster: Show proposals list + actions */}
        {job.status === JobStatus.Open && isPoster && (
          <div className="space-y-4">
            {job.proposals.length > 0 && (
              <div className="rounded-xl border border-border bg-bg p-4">
                <h3 className="mb-3 text-sm font-semibold text-text-muted uppercase tracking-wider">
                  Proposals ({job.proposals.length})
                </h3>
                <div className="space-y-3">
                  {job.proposals.map((proposal) => (
                    <div
                      key={proposal.proposer}
                      className="flex items-center justify-between rounded-lg border border-border bg-surface p-3"
                    >
                      <div className="text-sm">
                        <span className="text-text">
                          {proposal.proposer.slice(0, 8)}...{proposal.proposer.slice(-6)}
                        </span>
                        <span className="ml-2 text-text-muted text-xs">
                          blob: {proposal.solutionBlobId.slice(0, 12)}...
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          selectWinner({
                            jobId: job.id,
                            winnerAddress: proposal.proposer,
                          })
                        }
                        disabled={isSelecting}
                        className="cursor-pointer rounded-lg bg-cta px-3 py-1.5 text-xs font-bold text-bg transition-colors hover:bg-cta-hover disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSelecting ? "..." : "Select Winner"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {job.proposals.length === 0 && (
              <p className="text-center text-sm text-text-muted">
                No proposals yet. Waiting for workers...
              </p>
            )}

            <button
              onClick={() => refundJob({ jobId: job.id })}
              disabled={isRefunding}
              className="w-full cursor-pointer rounded-xl border border-urgent/50 bg-urgent/10 py-3 text-center font-heading font-bold text-urgent transition-colors duration-200 hover:bg-urgent/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRefunding ? "Refunding..." : "Refund Bounty"}
            </button>
          </div>
        )}

        {/* Completed: Show winner + solution */}
        {job.status === JobStatus.Completed && (
          <div className="rounded-xl border border-cta/30 bg-cta/10 p-4">
            <h3 className="mb-2 text-sm font-semibold text-cta uppercase tracking-wider">
              Winner Selected
            </h3>
            {job.winner && (
              <p className="text-sm text-text">
                Winner: {job.winner.slice(0, 8)}...{job.winner.slice(-6)}
              </p>
            )}
            {job.winningSolution && (
              <p className="mt-1 text-sm text-text-muted">
                Solution Blob: {job.winningSolution}
              </p>
            )}
          </div>
        )}

        {/* Refunded */}
        {job.status === JobStatus.Refunded && (
          <div className="rounded-xl border border-urgent/30 bg-urgent/10 p-4">
            <h3 className="mb-2 text-sm font-semibold text-urgent uppercase tracking-wider">
              Job Refunded
            </h3>
            <p className="text-sm text-text-muted">
              The bounty was returned to the poster.
            </p>
          </div>
        )}

        {/* Not connected */}
        {!account && job.status === JobStatus.Open && (
          <p className="text-center text-sm text-text-muted">
            Connect your wallet to submit a proposal
          </p>
        )}
      </div>
    </div>
  );
}
