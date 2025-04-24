"use client";

import React from "react";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { shortenAddress } from "../utils/utils";

const SolanaConnectWalletButton = () => {
  const solanaWallet = useWallet();

  return (
    <WalletMultiButton
      style={{
        backgroundColor: "white",
        color: "black",
        borderRadius: "40px",
        fontFamily: `"Sora", sans-serif`,
      }}
    >
      {solanaWallet.connected ? (
        <span
          style={{
            fontSize: "16px",
            fontWeight: 600,
          }}
        >
          {solanaWallet.publicKey
            ? shortenAddress(solanaWallet.publicKey.toBase58())
            : ""}
        </span>
      ) : (
        <span
          style={{
            fontSize: "16px",
            fontWeight: 600,
          }}
        >
          Connect Solana Wallet
        </span>
      )}
    </WalletMultiButton>
  );
};

export default SolanaConnectWalletButton;
