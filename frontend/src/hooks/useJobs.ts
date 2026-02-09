"use client";

import { useQuery } from "@tanstack/react-query";
import { getAllJobs } from "@mana-pool/sdk/browser";
import type { Job } from "@mana-pool/sdk/browser";

export function useJobs() {
  return useQuery<Job[]>({
    queryKey: ["manapool", "jobs"],
    queryFn: getAllJobs,
    refetchInterval: 10_000, // Poll every 10s for new jobs
  });
}
