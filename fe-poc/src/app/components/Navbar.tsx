import React from "react";
import Image from "next/image";
import dynamic from "next/dynamic";

import Loading from "./Loading";

const SolanaConnectButton = dynamic(
  () => import("./SolanaConnectWalletButton"),
  {
    loading: () => <Loading />,
    ssr: false,
  }
);

const EvmConnectButton = dynamic(() => import("./EvmConnectWalletButton"), {
  loading: () => <Loading />,
  ssr: false,
});

const Navbar = () => {
  return (
    <nav>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px",
        }}
      >
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <Image
            src={require("../assets/bridge.png")}
            alt="bridge logo"
            width={40}
            height={40}
          />
          <p style={{ fontSize: 22, fontWeight: "600" }}>Aasan Bridge</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <SolanaConnectButton />
          <EvmConnectButton />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
