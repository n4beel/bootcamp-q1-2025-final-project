"use client";

import React from "react";
import Image from "next/image";

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

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: {
                opacity: 0,
                pointerEvents: "none",
                userSelect: "none",
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    style={{
                      backgroundColor: "white",
                      color: "black",
                      borderRadius: "40px",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "16px",
                      fontWeight: 600,
                      height: "48px",
                      lineHeight: "48px",
                      padding: "0 24px",
                    }}
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
                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    style={{
                      backgroundColor: "white",
                      color: "black",
                      borderRadius: "40px",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "16px",
                      fontWeight: 600,
                      height: "48px",
                      lineHeight: "48px",
                      padding: "0 24px",
                      display: "flex",
                      alignItems: "center",
                    }}
                    onClick={openAccountModal}
                    type="button"
                  >
                    <Image
                      src={require("../assets/ethereum.png")}
                      alt="bridge logo"
                      width={28}
                      height={28}
                      style={{ marginRight: 8 }}
                    />
                    {account.displayName}
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
};

export default EvmConnectWalletButton;
