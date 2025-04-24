"use client";
import React, { ReactNode } from "react";

import "@rainbow-me/rainbowkit/styles.css";

import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { sepolia } from "wagmi/chains";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

type Props = {
  children: ReactNode;
};

const config = getDefaultConfig({
  appName: "My Multi Wallet App",
  projectId: "0808a814f0db7aa444cc1b18e134557c",
  chains: [sepolia],
  ssr: true,
});

const queryClient = new QueryClient();

const EvmWalletProvider: React.FC<Props> = ({ children }) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider modalSize="compact">{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default EvmWalletProvider;
