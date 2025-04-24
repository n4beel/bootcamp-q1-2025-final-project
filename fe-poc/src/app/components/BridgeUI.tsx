import React from 'react'



const BridgeUI = ({
    handleBridge,
    sourceChain,
    isLoading,
    evmConnected,
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
    handleQuoteFee,
    setRecipientAddress,
    recipientAddress,
    isQuotingFee,
    feedbackStatus,
    solBalance,
    ethBalance
}: any) => {
    return (
        <div style={{ backgroundColor: "#151516", padding: 20, borderRadius: 24, width: '100%', maxWidth: 500, color: 'white', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)' }}>
            <form onSubmit={handleBridge}>
                {/* Source Chain Selection */}

                <div className='selector'>
                    <div className='selection left'>
                        <span className="loc">
                            From
                        </span>
                        <br />
                        {sourceChain === 'evm' ? 'Sepolia Testnet' : 'Solana Devnet'}
                    </div>
                    <div className='selection right'>
                        <span className="loc">
                            To
                        </span>
                        <br />
                        {sourceChain === 'evm' ? 'Solana Devnet' : 'Sepolia Testnet'}
                    </div>
                    <div className="switch" onClick={() => {
                        setSourceChain(sourceChain === 'evm' ? 'solana' : 'evm')
                    }}>&gt;</div>
                </div>
                {/* <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">From Chain:</label>
                    <div className="flex justify-around">
                        <label className="flex items-center space-x-2">
                            <input
                                type="radio" name="sourceChain" value="evm"
                                checked={sourceChain === 'evm'}
                                onChange={(e) => setSourceChain(e.target.value as 'evm')}
                                disabled={isLoading || !evmConnected}
                                className="form-radio h-4 w-4 text-indigo-600"
                            />
                            <span>EVM (Sepolia) {!evmConnected ? '(Not Connected)' : !isCorrectEvmChain ? '(Wrong Network)' : '(Connected)'}</span>
                        </label>
                        <label className="flex items-center space-x-2">
                            <input
                                type="radio" name="sourceChain" value="solana"
                                checked={sourceChain === 'solana'}
                                onChange={(e) => setSourceChain(e.target.value as 'solana')}
                                disabled={isLoading || !solanaConnected}
                                className="form-radio h-4 w-4 text-indigo-600"
                            />
                            <span>Solana (Devnet) {solanaConnected ? '(Connected)' : '(Not Connected)'}</span>
                        </label>
                    </div>
                </div> */}

                {/* Amount Input */}
                <div className="inputs">

                    <div className="amount-input">
                        {/* <label htmlFor="amount" className="block text-sm font-medium mb-1">Amount (MOFT):</label> */}
                        <input
                            type="text" id="amount" value={amount}
                            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                            placeholder={`0`}
                            required disabled={isLoading || !sourceChain}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50"
                            inputMode="decimal"
                        />
                        <div className="fee-container">
                            <p>
                                Fee: {formatUnits(quotedFee?.nativeFee || 0, sourceChain === 'evm' ? 18 : 9)} {sourceChain === 'evm' ? 'ETH' : 'SOL'}
                            </p>
                            <p>
                                {sourceChain === 'evm' ? ethBalance : solBalance} MOFT Available
                            </p>

                        </div>

                        <div className="token">
                            MOFT
                        </div>
                    </div>

                    {/* Recipient Address Input */}
                    <div className="address-input">
                        {/* <label htmlFor="recipientAddress" className="block text-sm font-medium mb-1">
                        Recipient Address ({sourceChain === 'evm' ? 'Solana' : sourceChain === 'solana' ? 'EVM' : 'Destination'}):
                    </label> */}
                        <input
                            type="text" id="recipientAddress" value={recipientAddress}
                            onChange={(e) => setRecipientAddress(e.target.value)}
                            placeholder={sourceChain === 'evm' ? 'Enter Solana (Base58) address' : sourceChain === 'solana' ? 'Enter EVM (0x...) address' : 'Select source chain first'}
                            required disabled={isLoading || !sourceChain}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50"
                        />
                    </div>
                </div>

                {/* Fee Quoting Button & Display */}
                {/* <div className="mb-4 text-center">
                    <button
                        type="button"
                        onClick={handleQuoteFee}
                        disabled={isLoading || !sourceChain || !amount || !recipientAddress || (sourceChain === 'evm' && !isCorrectEvmChain) || (sourceChain === 'solana' && !solanaConnected)}
                    >
                        {isQuotingFee ? 'Calculating Fee...' : 'Get Estimated Fee'}
                    </button>
                </div> */}


                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isLoading || !quotedFee || (sourceChain === 'evm' && !isCorrectEvmChain) || (sourceChain === 'solana' && !solanaConnected)}
                    className='bridge-button'
                >
                    {isBridging ? 'Bridging...' : isQuotingFee ? 'Fetching fee...' : `Bridge`}
                </button>
            </form>

            {/* Feedback Area */}
            {feedback && (
                <p className={`feedback ${feedbackStatus}`}>
                    {feedback}
                </p>
            )}
            {bridgeTxHash && lzScanLink && (
                <p className="feedback info">
                    Transaction Info:
                    <br />
                    {
                        sourceChain === 'evm' ? (
                            <a href={`https://sepolia.etherscan.io/tx/${bridgeTxHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                                [Track EVM transaction]
                            </a>
                        ) : (
                            <a href={`https://solscan.io/tx/${bridgeTxHash}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                                [Track Solana transaction]
                            </a>
                        )
                    }
                    <br />
                    <a href={lzScanLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                        [Track on LayerZero Scan]
                    </a>

                </p>
            )}

        </div>
    )
}

export default BridgeUI