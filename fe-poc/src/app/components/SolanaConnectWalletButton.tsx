"use client";

import React from "react";

import styles from "../styles/page.module.scss";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { shortenAddress } from "../utils/utils";

const SolanaConnectWalletButton = () => {
  const solanaWallet = useWallet();

  return (
    <WalletMultiButton className={styles.walletConnectButtonSolana}>
      <span>
        {solanaWallet.connected
          ? solanaWallet.publicKey
            ? shortenAddress(solanaWallet.publicKey.toBase58())
            : ""
          : "Connect Solana Wallet"}
      </span>
    </WalletMultiButton>
  );
};

export default SolanaConnectWalletButton;
