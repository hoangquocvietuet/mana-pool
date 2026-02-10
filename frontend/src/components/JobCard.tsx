"use client";

import type { Job } from "@mana-pool/sdk/browser";
import { JobTag, JobCategory } from "@mana-pool/sdk/browser";

const STATUS_LABELS: Record<number, string> = {
  0: "Open",
  1: "Completed",
  2: "Refunded",
};

const STATUS_COLORS: Record<number, string> = {
  0: "bg-cta/20 text-cta",
  1: "bg-text-muted/20 text-text-muted",
  2: "bg-urgent/20 text-urgent",
};

const TAG_LABELS: Record<number, string> = {
  [JobTag.Urgent]: "URGENT",
  [JobTag.Chill]: "CHILL",
};

const CATEGORY_LABELS: Record<number, string> = {
  [JobCategory.Captcha]: "Captcha",
  [JobCategory.Crypto]: "Crypto",
  [JobCategory.Design]: "Design",
  [JobCategory.Data]: "Data",
  [JobCategory.General]: "General",
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
        <div className="flex items-center gap-2">
          <span
            className={`rounded-md px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[job.status]}`}
          >
            {STATUS_LABELS[job.status]}
          </span>
          <span className="rounded-md bg-surface-light px-2 py-1 text-xs text-text-muted">
            {CATEGORY_LABELS[job.category]}
          </span>
        </div>
        {job.tag === JobTag.Urgent && (
          <span className="flex items-center gap-1 rounded-md bg-urgent/20 px-2.5 py-1 text-xs font-semibold text-urgent">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
              <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
            </svg>
            {TAG_LABELS[job.tag]}
          </span>
        )}
      </div>

      <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-text-muted">
        {job.description}
      </p>

      <div className="mb-3 flex items-center gap-3 text-xs text-text-muted">
        <span>{job.proposals.length} proposal{job.proposals.length !== 1 ? "s" : ""}</span>
        <span>{formatDeadline(job.deadline)}</span>
      </div>

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
