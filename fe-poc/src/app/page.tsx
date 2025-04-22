"use client";

import dynamic from "next/dynamic";
import Loading from "./components/Loading";

const SolanaConnectButton = dynamic(() => import("./components/SolanaConnectWalletButton"), {
  loading: () => <Loading />,
  ssr: false,
});

const EvmConnectButton = dynamic(() => import("./components/EvmConnectWalletButton"), {
  loading: () => <Loading />,
  ssr: false,
});

const BridgeForm = dynamic(() => import("./components/BridgeForm"), {
  loading: () => <Loading />,
  ssr: false,
});

export default function Home() {
  return (
    <div>
      <main className="flex items-center justify-center min-h-screen">
        <div className="border hover:border-slate-900 rounded">
          {/* Solana Section */}
          <h2 className="text-2xl font-semibold mb-4">Solana (Devnet)</h2>
          <SolanaConnectButton />

          {/* EVM Section */}
          <h2 className="text-2xl font-semibold mb-4">EVM (Sepolia)</h2>
          <EvmConnectButton />

          {/* Bridge Form */}
          <BridgeForm />
        </div>
      </main >
    </div >
  );
}
