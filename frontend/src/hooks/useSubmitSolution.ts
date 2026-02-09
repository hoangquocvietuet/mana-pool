"use client";

import { useDAppKit } from "@mysten/dapp-kit-react";
import { Transaction } from "@mysten/sui/transactions";
import { PACKAGE_ID, MODULE_NAME, uploadToWalrus } from "@mana-pool/sdk/browser";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export function useSubmitSolution() {
  const dAppKit = useDAppKit();
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  const submitSolution = async ({
    jobId,
    solution,
  }: {
    jobId: string;
    solution: string;
  }) => {
    setIsPending(true);
    try {
      // Upload solution text to Walrus
      const solutionData = new TextEncoder().encode(solution);
      const solutionBlobId = await uploadToWalrus(solutionData);

      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_NAME}::submit_solution`,
        arguments: [
          tx.object(jobId),
          tx.pure.vector("u8", new TextEncoder().encode(solutionBlobId)),
        ],
      });

      await dAppKit.signAndExecuteTransaction({ transaction: tx });
      queryClient.invalidateQueries({ queryKey: ["manapool", "jobs"] });
    } finally {
      setIsPending(false);
    }
  };

  return { submitSolution, isPending };
}
