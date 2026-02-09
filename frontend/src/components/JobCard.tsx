"use client";

import type { Job } from "@mana-pool/sdk/browser";

const STATUS_LABELS: Record<number, string> = {
  0: "Open",
  1: "Claimed",
  2: "Completed",
};

const STATUS_COLORS: Record<number, string> = {
  0: "bg-cta/20 text-cta",
  1: "bg-claimed/20 text-claimed",
  2: "bg-text-muted/20 text-text-muted",
};

interface JobCardProps {
  job: Job;
  onClick: () => void;
}

export function JobCard({ job, onClick }: JobCardProps) {
  const bountyInSui = job.bountyAmount / 1_000_000_000;

  return (
    <button
      onClick={onClick}
      className="cursor-pointer rounded-xl border border-border bg-surface p-5 text-left transition-all duration-200 hover:border-cta/40 hover:glow-box focus:outline-none focus:ring-2 focus:ring-cta/50"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <span
          className={`rounded-md px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[job.status]}`}
        >
          {STATUS_LABELS[job.status]}
        </span>
        {job.isUrgent && (
          <span className="flex items-center gap-1 rounded-md bg-urgent/20 px-2.5 py-1 text-xs font-semibold text-urgent">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
              <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
            </svg>
            URGENT
          </span>
        )}
      </div>

      <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-text-muted">
        {job.description}
      </p>

      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="font-heading text-lg font-bold text-cta glow-green">
          {bountyInSui} SUI
        </span>
        <span className="text-xs text-text-muted">
          {job.poster.slice(0, 6)}...{job.poster.slice(-4)}
        </span>
      </div>
    </button>
  );
}
