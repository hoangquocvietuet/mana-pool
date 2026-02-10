"use client";

import { useDAppKit } from "@mysten/dapp-kit-react";
import { Transaction } from "@mysten/sui/transactions";
import { PACKAGE_ID, MODULE_NAME, REPUTATION_BOARD_ID } from "@mana-pool/sdk/browser";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export function useSelectWinner() {
  const dAppKit = useDAppKit();
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  const selectWinner = async ({
    jobId,
    winnerAddress,
  }: {
    jobId: string;
    winnerAddress: string;
  }) => {
    setIsPending(true);
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_NAME}::select_winner`,
        arguments: [
          tx.object(jobId),
          tx.pure.address(winnerAddress),
          tx.object(REPUTATION_BOARD_ID),
        ],
      });

      await dAppKit.signAndExecuteTransaction({ transaction: tx });
      queryClient.invalidateQueries({ queryKey: ["manapool", "jobs"] });
    } finally {
      setIsPending(false);
    }
  };

  return { selectWinner, isPending };
}
