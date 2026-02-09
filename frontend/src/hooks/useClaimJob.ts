"use client";

import { useDAppKit } from "@mysten/dapp-kit-react";
import { Transaction } from "@mysten/sui/transactions";
import { PACKAGE_ID, MODULE_NAME } from "@mana-pool/sdk/browser";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export function useClaimJob() {
  const dAppKit = useDAppKit();
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  const claimJob = async (jobId: string) => {
    setIsPending(true);
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_NAME}::claim_job`,
        arguments: [tx.object(jobId)],
      });

      await dAppKit.signAndExecuteTransaction({ transaction: tx });
      queryClient.invalidateQueries({ queryKey: ["manapool", "jobs"] });
    } finally {
      setIsPending(false);
    }
  };

  return { claimJob, isPending };
}
