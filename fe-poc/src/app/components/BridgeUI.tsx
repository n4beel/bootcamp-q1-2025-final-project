import React from "react";

import styles from "../styles/page.module.scss";

const BridgeUI = ({
  handleBridge,
  sourceChain,
  isLoading,
  isCorrectEvmChain,
  solanaConnected,
  setAmount,
  amount,
  feedback,
  bridgeTxHash,
  lzScanLink,
  formatUnits,
  quotedFee,
  isBridging,
  setSourceChain,
  setRecipientAddress,
  recipientAddress,
  isQuotingFee,
  feedbackStatus,
  solBalance,
  ethBalance,
}: any) => {
  return (
    <div className={styles.bridgeComponent}>
      <form onSubmit={handleBridge}>
        {/* Source Chain Selection */}
        <div className="selector">
          <div className="selection left">
            <span className="loc">From</span>
            <br />
            {sourceChain === "evm" ? "Sepolia Testnet" : "Solana Devnet"}
          </div>
          <div className="selection right">
            <span className="loc">To</span>
            <br />
            {sourceChain === "evm" ? "Solana Devnet" : "Sepolia Testnet"}
          </div>
          <div
            className="switch"
            onClick={() => {
              setSourceChain(sourceChain === "evm" ? "solana" : "evm");
            }}
          >
            &gt;
          </div>
        </div>
        {/* Amount Input */}
        <div className="inputs">
          <div className="amount-input">
            <input
              type="text"
              id="amount"
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value.replace(/[^0-9.]/g, ""))
              }
              placeholder={`0`}
              required
              disabled={isLoading || !sourceChain}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50"
              inputMode="decimal"
            />
            <div className="fee-container">
              <p>
                Fee:{" "}
                {formatUnits(
                  quotedFee?.nativeFee || 0,
                  sourceChain === "evm" ? 18 : 9
                )}{" "}
                {sourceChain === "evm" ? "ETH" : "SOL"}
              </p>
              <p>
                {sourceChain === "evm" ? ethBalance : solBalance} MOFT Available
              </p>
            </div>

            <div className="token">MOFT</div>
          </div>
          {/* Recipient Address Input */}
          <div className="address-input">
            <input
              type="text"
              id="recipientAddress"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder={
                sourceChain === "evm"
                  ? "Enter Solana (Base58) address"
                  : sourceChain === "solana"
                  ? "Enter EVM (0x...) address"
                  : "Select source chain first"
              }
              required
              disabled={isLoading || !sourceChain}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={
            isLoading ||
            !quotedFee ||
            (sourceChain === "evm" && !isCorrectEvmChain) ||
            (sourceChain === "solana" && !solanaConnected)
          }
          className="bridge-button"
        >
          {isBridging
            ? "Bridging..."
            : isQuotingFee
            ? "Fetching fee..."
            : `Bridge`}
        </button>
      </form>
      {/* Feedback Area */}
      {feedback && <p className={`feedback ${feedbackStatus}`}>{feedback}</p>}
      {bridgeTxHash && lzScanLink && (
        <p className="feedback info">
          Transaction Info:
          <br />
          {sourceChain === "evm" ? (
            <a
              href={`https://sepolia.etherscan.io/tx/${bridgeTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300"
            >
              [Track EVM transaction]
            </a>
          ) : (
            <a
              href={`https://solscan.io/tx/${bridgeTxHash}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300"
            >
              [Track Solana transaction]
            </a>
          )}
          <br />
          <a
            href={lzScanLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300"
          >
            [Track on LayerZero Scan]
          </a>
        </p>
      )}
    </div>
  );
};

export default BridgeUI;
