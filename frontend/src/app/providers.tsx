"use client";

import { DAppKitProvider } from "@mysten/dapp-kit-react";
import { createDAppKit } from "@mysten/dapp-kit-core";
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useMemo } from "react";

function useDAppKitInstance() {
  return useMemo(
    () =>
      createDAppKit({
        networks: ["testnet"],
        defaultNetwork: "testnet",
        createClient: (network) =>
          new SuiJsonRpcClient({
            network,
            url: getJsonRpcFullnodeUrl(network),
          }),
        autoConnect: true,
      }),
    [],
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const dAppKit = useDAppKitInstance();

  return (
    <QueryClientProvider client={queryClient}>
      <DAppKitProvider dAppKit={dAppKit}>
        {children}
      </DAppKitProvider>
    </QueryClientProvider>
  );
}
