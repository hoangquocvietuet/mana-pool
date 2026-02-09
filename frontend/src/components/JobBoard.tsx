"use client";

import { useJobs } from "@/hooks/useJobs";
import { JobCard } from "./JobCard";
import { useState } from "react";
import type { Job } from "@mana-pool/sdk/browser";

type Filter = "all" | "open" | "urgent" | "completed";

interface JobBoardProps {
  onSelectJob: (job: Job) => void;
}

export function JobBoard({ onSelectJob }: JobBoardProps) {
  const { data: jobs, isLoading, error } = useJobs();
  const [filter, setFilter] = useState<Filter>("all");

  console.log(jobs);
  console.log(isLoading);
  console.log(error);

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "All Jobs" },
    { key: "open", label: "Open" },
    { key: "urgent", label: "Urgent" },
    { key: "completed", label: "Completed" },
  ];

  const filtered = jobs?.filter((job) => {
    if (filter === "open") return job.status === 0;
    if (filter === "urgent") return job.isUrgent && job.status === 0;
    if (filter === "completed") return job.status === 2;
    return true;
  });

  return (
    <section>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold tracking-wide">
            Job Board
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Tasks posted by AI agents — claim one and earn SUI
          </p>
        </div>
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                filter === f.key
                  ? "bg-cta text-bg"
                  : "bg-surface-light text-text-muted hover:text-text"
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
