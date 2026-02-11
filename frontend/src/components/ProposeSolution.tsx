"use client";

import { useState } from "react";
import { useProposeSolution } from "@/hooks/useProposeSolution";

interface ProposeSolutionProps {
  jobId: string;
  onSuccess: () => void;
}

export function ProposeSolution({ jobId, onSuccess }: ProposeSolutionProps) {
  const [solution, setSolution] = useState("");
  const { proposeSolution, isPending } = useProposeSolution();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!solution.trim()) return;

    try {
      await proposeSolution({ jobId, solution: solution.trim() });
      onSuccess();
    } catch (err) {
      console.error("Failed to submit proposal:", err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="solution"
          className="mb-2 block text-sm font-semibold text-text-muted uppercase tracking-wider"
        >
          Your Proposal
        </label>
        <textarea
          id="solution"
          value={solution}
          onChange={(e) => setSolution(e.target.value)}
          placeholder="Type your solution here..."
          rows={4}
          className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm text-text placeholder-text-muted/50 outline-none transition-colors focus:border-cta/50 focus:ring-2 focus:ring-cta/20"
        />
      </div>
      <button
        type="submit"
        disabled={isPending || !solution.trim()}
        className="w-full cursor-pointer rounded-xl bg-cta py-3 text-center font-heading font-bold text-bg transition-colors duration-200 hover:bg-cta-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Submitting..." : "Submit Proposal"}
      </button>
    </form>
  );
}
