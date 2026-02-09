"use client";

import { Header } from "@/components/Header";
import { JobBoard } from "@/components/JobBoard";
import { JobDetailModal } from "@/components/JobDetailModal";
import { useState } from "react";
import type { Job } from "@mana-pool/sdk/browser";

export default function Home() {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  return (
    <main className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-7xl px-4 pt-24 pb-12">
        <JobBoard onSelectJob={setSelectedJob} />
      </div>
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
        />
      )}
    </main>
  );
}
