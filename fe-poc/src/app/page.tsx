"use client";


import styles from "./page.module.css";
import dynamic from "next/dynamic";
import Address from "./address/page";

const LazyComp = dynamic(() => import("./components/ConnectWalletButton"), {
  loading: () => <h1>Loading...</h1>,
  ssr: false,
});

export default function Home() {
  return (
    <div className={styles.page}>
      <main className="flex items-center justify-center min-h-screen">
        <div className="border hover:border-slate-900 rounded">
          <LazyComp />
          {/* <Address /> */}
        </div>
      </main>
    </div>
  );
}
