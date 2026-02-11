"use client";

import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit-react";
import { useReputation } from "@/hooks/useReputation";

function ReputationBadge() {
  const account = useCurrentAccount();
  const { data: reputation } = useReputation(account?.address);

  if (!account) return null;

  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-cta/30 bg-cta/10 px-3 py-1.5 font-heading text-sm tracking-wider text-cta glow-green">
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-4 w-4"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
      <span>{reputation ?? 0}</span>
      <span className="text-xs opacity-70">REP</span>
    </div>
  );
}

export function Header() {
  return (
    <header className="fixed top-4 left-4 right-4 z-50 rounded-2xl border border-border bg-surface/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cta/20">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5 text-cta"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
              />
            </svg>
          </div>
          <h1 className="font-heading text-lg font-bold tracking-wider glow-green">
            MANAPOOL
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <ReputationBadge />
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
