"use client";

import type { Job } from "@mana-pool/sdk/browser";
import { useEffect, useState, useCallback } from "react";
import { downloadFromWalrus } from "@mana-pool/sdk/browser";
import { SubmitSolution } from "./SubmitSolution";
import { useClaimJob } from "@/hooks/useClaimJob";
import { useCurrentAccount } from "@mysten/dapp-kit-react";

interface JobDetailModalProps {
  job: Job;
  onClose: () => void;
}

const STATUS_LABELS: Record<number, string> = {
  0: "Open",
  1: "Claimed",
  2: "Completed",
};

export function JobDetailModal({ job, onClose }: JobDetailModalProps) {
  const [blobContent, setBlobContent] = useState<string | null>(null);
  const [blobImageUrl, setBlobImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const account = useCurrentAccount();
  const { claimJob, isPending: isClaiming } = useClaimJob();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await downloadFromWalrus(job.blobId);
        // Detect image by magic bytes
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

  const isWorker =
    job.worker && account?.address && job.worker === account.address;
  const bountyInSui = job.bountyAmount / 1_000_000_000;

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
          <div className="mb-3 flex items-center gap-3">
            <span
              className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                job.status === 0
                  ? "bg-cta/20 text-cta"
                  : job.status === 1
                    ? "bg-claimed/20 text-claimed"
                    : "bg-text-muted/20 text-text-muted"
              }`}
            >
              {STATUS_LABELS[job.status]}
            </span>
            {job.isUrgent && (
              <span className="rounded-md bg-urgent/20 px-2.5 py-1 text-xs font-semibold text-urgent">
                URGENT
              </span>
            )}
            <span className="font-heading text-lg font-bold text-cta glow-green">
              {bountyInSui} SUI
            </span>
          </div>
          <h2 className="font-heading text-xl font-bold">{job.description}</h2>
          <p className="mt-2 text-sm text-text-muted">
            Posted by {job.poster.slice(0, 8)}...{job.poster.slice(-6)}
          </p>
          {job.worker && (
            <p className="mt-1 text-sm text-text-muted">
              Worker: {job.worker.slice(0, 8)}...{job.worker.slice(-6)}
            </p>
          )}
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

        {/* Actions */}
        {job.status === 0 && account && (
          <button
            onClick={() => claimJob(job.id)}
            disabled={isClaiming}
            className="w-full cursor-pointer rounded-xl bg-cta py-3 text-center font-heading font-bold text-bg transition-colors duration-200 hover:bg-cta-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isClaiming ? "Claiming..." : "Claim This Job"}
          </button>
        )}

        {job.status === 1 && isWorker && (
          <SubmitSolution jobId={job.id} onSuccess={onClose} />
        )}

        {job.status === 2 && job.solutionBlobId && (
          <div className="rounded-xl border border-cta/30 bg-cta/10 p-4">
            <h3 className="mb-2 text-sm font-semibold text-cta uppercase tracking-wider">
              Solution Submitted
            </h3>
            <p className="text-sm text-text-muted">
              Blob ID: {job.solutionBlobId}
            </p>
          </div>
        )}

        {!account && job.status === 0 && (
          <p className="text-center text-sm text-text-muted">
            Connect your wallet to claim this job
          </p>
        )}
      </div>
    </div>
  );
}
