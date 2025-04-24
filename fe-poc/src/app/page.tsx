"use client";

import dynamic from "next/dynamic";

import Loading from "./components/Loading";
import Navbar from "./components/Navbar";

const BridgeForm = dynamic(() => import("./components/BridgeForm"), {
  loading: () => <Loading />,
  ssr: false,
});

export default function Home() {
  return (
    <div className="bg">
      <Navbar />
      <main>
        <div>
          {/* Bridge Form */}
          <BridgeForm />
        </div>
      </main>
    </div>
  );
}
