"use client";

import styles from "./page.module.css";
import dynamic from "next/dynamic";
import { useAccount as useEvmAccount } from 'wagmi';
import Loading from "./components/Loading";

const SolanaConnectButton = dynamic(() => import("./components/SolanaConnectWalletButton"), {
  loading: () => <Loading />,
  ssr: false,
});

const EvmConnectButton = dynamic(() => import("./components/EvmConnectWalletButton"), {
  loading: () => <Loading />,
  ssr: false,
});

export default function Home() {
  const { address: evmAddress, isConnected: evmConnected } = useEvmAccount();
  return (
    <div className={styles.page}>
      <main className="flex items-center justify-center min-h-screen">
        <div className="border hover:border-slate-900 rounded">
          <h2 className="text-2xl font-semibold mb-4">Solana (Devnet)</h2>

          <SolanaConnectButton />
          {/* <Address /> */}
          {/* EVM Section */}
          <div className="p-6 border rounded-xl shadow-md bg-white dark:bg-gray-800">
            <h2 className="text-2xl font-semibold mb-4">EVM (Sepolia)</h2>
            <div className="flex justify-center mb-4">
              {/* EVM Connect Button (RainbowKit) */}
              <EvmConnectButton />

            </div>
            {/* {evmConnected && evmAddress && (
              <div className="mt-4 text-sm break-all">
                <p>Connected!</p>
                <p>Address: {evmAddress}</p>
              </div>
            )} */}
          </div>
        </div>
      </main>
    </div>
  );
}
