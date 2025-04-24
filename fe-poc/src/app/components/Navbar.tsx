import React from "react";
import Image from "next/image";
import dynamic from "next/dynamic";

import styles from "../styles/page.module.scss";

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
      <div className={styles.navbar}>
        <div className={styles.navbarLogo}>
          <Image
            src={require("../assets/bridge.png")}
            alt="bridge logo"
            width={40}
            height={40}
          />
          <p>Aasan Bridge</p>
        </div>
        <div className={styles.navbarButtons}>
          <SolanaConnectButton />
          <EvmConnectButton />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
