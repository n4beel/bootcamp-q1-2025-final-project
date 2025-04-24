"use client";

import React from "react";
import Image from "next/image";

import styles from "../styles/page.module.scss";

import { ConnectButton } from "@rainbow-me/rainbowkit";

const EvmConnectWalletButton = () => {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }: any) => {
        // Note: If your app doesn't use authentication, you
        // can remove all 'authenticationStatus' checks
        const ready = mounted && authenticationStatus !== "loading";
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === "authenticated");

        if (!ready) {
          return (
            <div
              aria-hidden="true"
              style={{
                opacity: 0,
                pointerEvents: "none",
                userSelect: "none",
              }}
            />
          );
        }
        if (!connected) {
          return (
            <button
              className={styles.walletConnectButton}
              onClick={openConnectModal}
              type="button"
            >
              Connect EVM Wallet
            </button>
          );
        }
        if (chain.unsupported) {
          return (
            <button onClick={openChainModal} type="button">
              Wrong network
            </button>
          );
        }

        return (
          <div className={styles.walletConnected}>
            <button
              className={styles.walletOpenAccountButton}
              onClick={openAccountModal}
              type="button"
            >
              <Image
                src={require("../assets/ethereum.png")}
                alt="bridge logo"
                width={28}
                height={28}
              />
              {account.displayName}
            </button>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
};

export default EvmConnectWalletButton;
