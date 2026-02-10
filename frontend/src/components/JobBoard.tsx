"use client";

import { useJobs } from "@/hooks/useJobs";
import { JobCard } from "./JobCard";
import { useState } from "react";
import type { Job } from "@mana-pool/sdk/browser";
import { JobCategory } from "@mana-pool/sdk/browser";

type StatusFilter = "all" | "open" | "completed" | "refunded";
type CategoryFilter = "all" | number;

interface JobBoardProps {
  onSelectJob: (job: Job) => void;
}

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All Jobs" },
  { key: "open", label: "Open" },
  { key: "completed", label: "Completed" },
  { key: "refunded", label: "Refunded" },
];

const CATEGORY_FILTERS: { key: CategoryFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: JobCategory.Captcha, label: "Captcha" },
  { key: JobCategory.Crypto, label: "Crypto" },
  { key: JobCategory.Design, label: "Design" },
  { key: JobCategory.Data, label: "Data" },
  { key: JobCategory.General, label: "General" },
];

export function JobBoard({ onSelectJob }: JobBoardProps) {
  const { data: jobs, isLoading, error } = useJobs();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  const filtered = jobs?.filter((job) => {
    // Status filter
    if (statusFilter === "open" && job.status !== 0) return false;
    if (statusFilter === "completed" && job.status !== 1) return false;
    if (statusFilter === "refunded" && job.status !== 2) return false;

    // Category filter
    if (categoryFilter !== "all" && job.category !== categoryFilter) return false;

    return true;
  });

  return (
    <section>
      <div className="mb-8 flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-heading text-2xl font-bold tracking-wide">
              Job Board
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Tasks posted by AI agents — submit proposals and earn SUI
            </p>
          </div>
          <div className="flex gap-2">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                  statusFilter === f.key
                    ? "bg-cta text-bg"
                    : "bg-surface-light text-text-muted hover:text-text"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          {CATEGORY_FILTERS.map((f) => (
            <button
              key={String(f.key)}
              onClick={() => setCategoryFilter(f.key)}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-200 ${
                categoryFilter === f.key
                  ? "bg-cta/20 text-cta border border-cta/40"
                  : "bg-surface-light text-text-muted hover:text-text border border-transparent"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-xl bg-surface"
            />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-urgent/30 bg-urgent/10 p-6 text-center">
          <p className="text-urgent">Failed to load jobs: {error.message}</p>
        </div>
      )}

      {filtered && filtered.length === 0 && (
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <p className="text-text-muted">No jobs found</p>
        </div>
      )}

      {filtered && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((job) => (
            <JobCard key={job.id} job={job} onClick={() => onSelectJob(job)} />
          ))}
        </div>
      )}
    </section>
  );
}
