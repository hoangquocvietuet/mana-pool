"use client";

import { useQuery } from "@tanstack/react-query";
import { getUserReputation } from "@mana-pool/sdk/browser";

export function useReputation(address: string | undefined) {
  return useQuery<number>({
    queryKey: ["manapool", "reputation", address],
    queryFn: () => getUserReputation(address!),
    enabled: !!address,
    refetchInterval: 30_000,
  });
}
