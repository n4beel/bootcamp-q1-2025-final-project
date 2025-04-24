"use client";

import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { sepolia } from 'wagmi/chains'; // Import Sepolia
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import React, { ReactNode } from 'react';

type Props = {
    children: ReactNode;
};

// Choose appropriate RPC URLs - using public ones for simplicity
// Consider using environment variables for production apps (e.g., process.env.NEXT_PUBLIC_ALCHEMY_ID)
const config = getDefaultConfig({
    appName: 'My Multi Wallet App',
    projectId: '0808a814f0db7aa444cc1b18e134557c', // Get one from WalletConnect Cloud (https://cloud.walletconnect.com/)
    chains: [sepolia], // Configure Sepolia testnet
    ssr: true, // If your dApp uses server side rendering (SSR)
});

const queryClient = new QueryClient();

const EvmWalletProvider: React.FC<Props> = ({ children }) => {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                {/* Configure RainbowKit - you can customize themes, avatars, etc. */}
                <RainbowKitProvider
                    modalSize="compact" // Optional: other options include 'wide'
                // theme={darkTheme()} // Optional: Add theme customization
                >
                    {children}
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
};

export default EvmWalletProvider;
