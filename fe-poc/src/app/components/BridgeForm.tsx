import React, { useState, FormEvent, useEffect, useCallback, useMemo } from 'react';
import { useWallet as useSolanaWallet, useConnection as useSolanaConnection } from '@solana/wallet-adapter-react';
import { SystemProgram, Transaction, LAMPORTS_PER_SOL, PublicKey, ComputeBudgetProgram } from '@solana/web3.js';
import { useAccount as useEvmAccount, useReadContract, useSimulateContract, useWriteContract, useWaitForTransactionReceipt, BaseError } from 'wagmi';
import { parseUnits, formatUnits, Address, zeroAddress, Hex, pad, toBytes, bytesToHex } from 'viem';
import bs58 from 'bs58';
import { addressToBytes32 } from '@layerzerolabs/lz-v2-utilities';
import { EndpointId } from '@layerzerolabs/lz-definitions';
import { oft } from '@layerzerolabs/oft-v2-solana-sdk';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { mplToolbox } from '@metaplex-foundation/mpl-toolbox';
import { publicKey as umiPublicKey, transactionBuilder } from '@metaplex-foundation/umi';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token'; // Use sync version for simplicity here

import {
    EVM_CHAIN_ID,
    EVM_ENDPOINT_ID,
    EVM_OFT_CONTRACT_ADDRESS,
    MOFT_TOKEN_DECIMALS_EVM,
    SOLANA_ENDPOINT_ID,
    SOLANA_OFT_PROGRAM_ID,
    SOLANA_MOFT_MINT_ADDRESS,
    SOLANA_OFT_ESCROW_ADDRESS,
    MOFT_TOKEN_DECIMALS_SOLANA,
    EVM_OFT_ABI,
    getLayerZeroScanLink
} from '../config/layerzero'; // Adjust path if needed

// Define types for fee structure
type MessagingFee = {
    nativeFee: bigint;
    lzTokenFee: bigint;
};

const BridgeForm: React.FC = () => {
    const [amount, setAmount] = useState<string>('');
    const [recipientAddress, setRecipientAddress] = useState<string>('');
    const [sourceChain, setSourceChain] = useState<'solana' | 'evm' | null>(null);
    const [isQuotingFee, setIsQuotingFee] = useState<boolean>(false);
    const [isBridging, setIsBridging] = useState<boolean>(false);
    const [feedback, setFeedback] = useState<string>('');
    const [quotedFee, setQuotedFee] = useState<MessagingFee | null>(null);
    const [bridgeTxHash, setBridgeTxHash] = useState<string>('');
    const [lzScanLink, setLzScanLink] = useState<string>('');

    // === EVM Hooks ===
    const { address: evmAddress, isConnected: evmConnected, chainId: evmChainId } = useEvmAccount();
    const { writeContractAsync, data: evmSendTxHash, isPending: isEvmSendPending, error: evmSendError } = useWriteContract();
    // Hook for approving token spending
    const { writeContractAsync: approveAsync, data: approveTxHash, isPending: isApprovePending, error: approveError } = useWriteContract();


    // === Solana Hooks ===
    const solanaWallet = useSolanaWallet();
    const { connection: solanaConnection } = useSolanaConnection();
    const { connected: solanaConnected, publicKey: solanaPublicKey, signTransaction, sendTransaction } = solanaWallet;

    // === Umi Setup for Solana SDK ===
    const umi = useMemo(() => {
        if (!solanaConnection) return null;
        // Use umi-bundle-defaults and adapt RPC endpoint
        const umiInstance = createUmi(solanaConnection.rpcEndpoint)
            .use(mplToolbox()); // Add metaplex toolbox plugin
        if (solanaWallet && solanaWallet.publicKey) {
            // Use wallet adapter identity only if wallet is connected
            umiInstance.use(walletAdapterIdentity(solanaWallet));
        }
        return umiInstance;
    }, [solanaConnection, solanaWallet]);


    // Derived State
    const isCorrectEvmChain = evmConnected && evmChainId === EVM_CHAIN_ID;
    const isLoading = isQuotingFee || isBridging || isEvmSendPending || isApprovePending;

    // Reset state on chain change
    useEffect(() => {
        setAmount('');
        setRecipientAddress('');
        setFeedback('');
        setQuotedFee(null);
        setBridgeTxHash('');
        setLzScanLink('');
        setIsQuotingFee(false);
        setIsBridging(false);
    }, [sourceChain]);

    // --- Fee Quoting Logic ---
    const handleQuoteFee = async () => {
        setFeedback('');
        setQuotedFee(null);
        setBridgeTxHash('');
        setLzScanLink('');
        if (!sourceChain || !amount || !recipientAddress) {
            setFeedback('Error: Please fill in all fields.');
            return;
        }

        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            setFeedback('Error: Invalid amount.');
            return;
        }

        setIsQuotingFee(true);

        try {
            // --- EVM Fee Quote ---
            if (sourceChain === 'evm') {
                if (!isCorrectEvmChain || !evmAddress) {
                    setFeedback('Error: Connect to Sepolia with an EVM wallet.');
                    setIsQuotingFee(false);
                    return;
                }
                const amountWei = parseUnits(amount, MOFT_TOKEN_DECIMALS_EVM);
                let toBytes32: Hex;
                try {
                    // Assuming recipient is a Solana address (bs58 encoded)
                    // Inside handleQuoteFee (EVM part)
                    const decodedAddress = bs58.decode(recipientAddress);
                    const hexAddress = bytesToHex(decodedAddress); // Convert Uint8Array to Hex
                    toBytes32 = pad(hexAddress, { size: 32 }); // Now pad the Hex string
                } catch (e) {
                    setFeedback('Error: Invalid Solana recipient address format.');
                    setIsQuotingFee(false);
                    return;
                }

                const sendParam = {
                    dstEid: SOLANA_ENDPOINT_ID,
                    to: toBytes32,
                    amountLD: amountWei,
                    minAmountLD: (amountWei * 99n) / 100n, // Example: 99% slippage tolerance
                    extraOptions: '0x', // Default options
                    composeMsg: '0x',
                    oftCmd: '0x',
                };

                // Use wagmi's useReadContract
                // Note: `useReadContract` is a hook, call it at the top level or use `readContract` from wagmi/actions
                // For simplicity in a handler, we might use wagmi/actions `readContract` if available,
                // or structure this differently using useEffect with dependencies.
                // Let's simulate using readContract directly (you'd import it from wagmi/actions or core)
                // This requires wagmi config setup outside the component.
                // Alternative: Use useSimulateContract which gives fee estimate AND checks execution
                const { data: quoteResult } = await simulateEVMQuoteSend(sendParam); // See helper function below

                if (!quoteResult) {
                    throw new Error("Could not simulate quoteSend");
                }

                const fee = quoteResult as MessagingFee; // Adjust based on actual return type
                setQuotedFee(fee);
                setFeedback(`Estimated Fee: ${formatUnits(fee.nativeFee, 18)} ETH`); // Assuming native fee is in ETH (18 decimals)

            }
            // --- Solana Fee Quote ---
            else if (sourceChain === 'solana') {
                debugger
                if (!solanaConnected || !solanaPublicKey || !umi || !umi.identity.publicKey) {
                    setFeedback('Error: Connect Solana wallet.');
                    setIsQuotingFee(false);
                    return;
                }
                const amountBaseUnits = parseUnits(amount, MOFT_TOKEN_DECIMALS_SOLANA);
                let recipientBytes32: Uint8Array;
                try {
                    // Assuming recipient is an EVM address (hex)
                    recipientBytes32 = addressToBytes32(recipientAddress as Address); // Use LZ utility
                } catch (e) {
                    setFeedback('Error: Invalid EVM recipient address format.');
                    setIsQuotingFee(false);
                    return;
                }

                console.log('Quoting Solana -> EVM Fee:');
                console.log('Destination EID used:', EVM_ENDPOINT_ID);
                console.log('Expected Destination EID:', EndpointId.SEPOLIA_V2_TESTNET); // Verify the imported value
                console.log('Expected Destination EID:', EndpointId.SEPOLIA_TESTNET); // Verify the imported value
                console.log('OFT Program ID used:', SOLANA_OFT_PROGRAM_ID);

                console.log('Using Solana RPC:', solanaConnection.rpcEndpoint); // Add before the oft.quote call


                console.log('--- Debugging Connection ---');
                console.log('solanaConnection object:', solanaConnection);
                console.log('solanaConnection.rpcEndpoint:', solanaConnection?.rpcEndpoint);
                console.log('umi instance:', umi);
                console.log('umi.rpc object:', umi?.rpc);
                console.log('Payer Pubkey:', umi?.identity?.publicKey?.toString());
                console.log('--- End Debugging Connection ---');

                // Check explicitly if connection or rpc seems invalid before calling
                if (!solanaConnection || !umi?.rpc) {
                    setFeedback("Error: Solana connection or Umi RPC is not ready.");
                    setIsQuotingFee(false);
                    return; // Prevent calling oft.quote if objects are missing
                }

                const { nativeFee } = await oft.quote(
                    umi.rpc as any, // Cast to any for compatibility
                    {
                        payer: umi.identity.publicKey as any,
                        tokenMint: umiPublicKey(SOLANA_MOFT_MINT_ADDRESS) as any,
                        tokenEscrow: umiPublicKey(SOLANA_OFT_ESCROW_ADDRESS) as any,
                    },
                    {
                        payInLzToken: false,
                        to: Buffer.from(recipientBytes32), // SDK expects Buffer
                        dstEid: EVM_ENDPOINT_ID,
                        amountLd: amountBaseUnits,
                        minAmountLd: (amountBaseUnits * 99n) / 100n, // 99% slippage
                        options: Buffer.from(''), // Default options
                        composeMsg: undefined,
                    },
                    { oft: umiPublicKey(SOLANA_OFT_PROGRAM_ID) as any }
                );

                // Note: Solana nativeFee from SDK might be in SOL lamports (need confirmation)
                const fee = { nativeFee, lzTokenFee: 0n }; // Assuming lzTokenFee is 0 if payInLzToken is false
                setQuotedFee(fee);
                // Format assuming fee is in Lamports (9 decimals for SOL)
                setFeedback(`Estimated Fee: ${formatUnits(nativeFee, 9)} SOL`);

            }
        } catch (error: any) {
            console.error("Fee Quoting Error:", error);
            const message = error instanceof BaseError ? error.shortMessage : error.message;
            setFeedback(`Error quoting fee: ${message || 'Unknown error'}`);
            setQuotedFee(null);
        } finally {
            setIsQuotingFee(false);
        }
    };

    // Helper hook/function to simulate EVM quoteSend (needed because hooks can't be in handlers)
    // This is a placeholder structure - adapt using wagmi/actions or useEffect
    const simulateEVMQuoteSend = async (sendParam: any) => {
        // In a real app, use wagmi's readContract (from actions/core) or useSimulateContract hook properly
        // This is a simplified placeholder showing the call structure
        /*
        const { data, error } = useSimulateContract({
            address: EVM_OFT_CONTRACT_ADDRESS as Address,
            abi: EVM_OFT_ABI,
            functionName: 'quoteSend',
            args: [sendParam, false], // payInLzToken = false
            chainId: EVM_CHAIN_ID,
        });
        if (error) throw error;
        return { data: data?.result }; // Adjust based on actual structure
        */
        console.warn("EVM Quote simulation placeholder used. Implement with useSimulateContract or readContract.");
        // Placeholder return - REPLACE WITH ACTUAL IMPLEMENTATION
        return { data: { nativeFee: parseUnits("0.001", 18), lzTokenFee: 0n } };
    };


    // --- Bridging Logic ---
    const handleBridge = async (event: FormEvent) => {
        event.preventDefault();
        if (!quotedFee || !sourceChain || !amount || !recipientAddress) {
            setFeedback('Error: Please quote the fee first and ensure all fields are filled.');
            return;
        }

        setFeedback('');
        setBridgeTxHash('');
        setLzScanLink('');
        setIsBridging(true);

        const numericAmount = parseFloat(amount); // Should be validated already

        try {
            // --- EVM Bridge Send ---
            if (sourceChain === 'evm') {
                if (!isCorrectEvmChain || !evmAddress || !writeContractAsync || !approveAsync) {
                    setFeedback('Error: Connect to Sepolia with an EVM wallet.');
                    setIsBridging(false);
                    return;
                }
                const amountWei = parseUnits(amount, MOFT_TOKEN_DECIMALS_EVM);

                // Inside handleBridge (EVM part)
                const decodedAddressBridge = bs58.decode(recipientAddress);
                const hexAddressBridge = bytesToHex(decodedAddressBridge); // Convert Uint8Array to Hex
                const toBytes32Bridge = pad(hexAddressBridge, { size: 32 }); // Now pad the Hex string

                // 1. Approve OFT Contract to spend tokens (if necessary)
                // You might want to check allowance first
                setFeedback('Approving token spend...');
                try {
                    const approveHash = await approveAsync({
                        address: EVM_OFT_CONTRACT_ADDRESS as Address, // Assuming OFT is also the ERC20
                        abi: EVM_OFT_ABI,
                        functionName: 'approve',
                        args: [EVM_OFT_CONTRACT_ADDRESS as Address, amountWei], // Approve OFT contract itself
                        chainId: EVM_CHAIN_ID,
                    });
                    // Optional: Wait for approval confirmation
                    // const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveHash });
                    setFeedback('Approval successful. Sending bridge transaction...');

                } catch (approvalError: any) {
                    console.error("Approval Error:", approvalError);
                    const message = approvalError instanceof BaseError ? approvalError.shortMessage : approvalError.message;
                    setFeedback(`Error during approval: ${message}`);
                    setIsBridging(false);
                    return; // Stop if approval fails
                }


                // 2. Send the bridge transaction
                const sendParam = {
                    dstEid: SOLANA_ENDPOINT_ID,
                    to: toBytes32Bridge,
                    amountLD: amountWei,
                    minAmountLD: (amountWei * 99n) / 100n, // 99%
                    extraOptions: '0x',
                    composeMsg: '0x',
                    oftCmd: '0x',
                };

                const txHash = await writeContractAsync({
                    address: EVM_OFT_CONTRACT_ADDRESS as Address,
                    abi: EVM_OFT_ABI,
                    functionName: 'send',
                    args: [sendParam, quotedFee, evmAddress as Address], // Pass SendParam, Fee, Refund Address
                    value: quotedFee.nativeFee, // Pay the native fee
                    chainId: EVM_CHAIN_ID,
                    // gasLimit might be needed, estimate or set fixed
                });

                setFeedback('Bridge transaction sent. Waiting for confirmation...');
                setBridgeTxHash(txHash);

                // Note: LayerZero Scan link typically uses the *source* tx hash
                setLzScanLink(getLayerZeroScanLink(txHash, true)); // true for testnet

            }
            // --- Solana Bridge Send ---
            else if (sourceChain === 'solana') {
                if (!solanaConnected || !solanaPublicKey || !umi || !umi.identity.publicKey || !signTransaction) {
                    setFeedback('Error: Connect Solana wallet.');
                    setIsBridging(false);
                    return;
                }

                const amountBaseUnits = parseUnits(amount, MOFT_TOKEN_DECIMALS_SOLANA);
                const recipientBytes32 = addressToBytes32(recipientAddress as Address);

                // Find user's Associated Token Account (ATA) for the MOFT token
                const sourceTokenAccount = getAssociatedTokenAddressSync(
                    new PublicKey(SOLANA_MOFT_MINT_ADDRESS),
                    solanaPublicKey,
                    false, // allowOwnerOffCurve - typically false for user wallets
                    TOKEN_PROGRAM_ID // SPL Token Program ID
                );

                const ix = await oft.send(
                    umi.rpc as any, // Cast to any for compatibility
                    {
                        // Ensure identity is the wallet signer
                        payer: umi.identity as any, // Should be walletAdapterIdentity
                        tokenMint: umiPublicKey(SOLANA_MOFT_MINT_ADDRESS) as any,
                        tokenEscrow: umiPublicKey(SOLANA_OFT_ESCROW_ADDRESS) as any,
                        tokenSource: umiPublicKey(sourceTokenAccount.toBase58()) as any, // User's ATA
                    },
                    {
                        to: Buffer.from(recipientBytes32),
                        dstEid: EVM_ENDPOINT_ID,
                        amountLd: amountBaseUnits,
                        minAmountLd: (amountBaseUnits * 99n) / 100n, // 99%
                        options: Buffer.from(''),
                        composeMsg: undefined,
                        nativeFee: quotedFee.nativeFee, // Use the quoted fee
                    },
                    {
                        oft: umiPublicKey(SOLANA_OFT_PROGRAM_ID) as any,
                        token: umiPublicKey(TOKEN_PROGRAM_ID.toBase58()) as any, // SPL Token Program
                    }
                );

                // Build Transaction (using web3.js as SDK might require full Umi tx builder setup)
                // Convert Umi instruction to web3.js format if possible, or reconstruct manually
                // The oft.send above likely returns Umi instruction format.
                // For simplicity, let's assume ix is compatible or can be adapted.
                // This part is complex and might require deeper SDK knowledge or manual instruction creation.

                // Placeholder: Assuming ix is a structure we can adapt
                // A real implementation needs careful conversion from Umi Ix to Web3js Ix
                const transaction = new Transaction();

                // Add Compute Budget Instructions (IMPORTANT for Solana)
                // You'll need logic similar to the `addComputeUnitInstructions` from the hardhat task
                // Fetch priority fees and set compute unit price/limit
                const computePriceIx = ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10000 }); // Example price, fetch dynamically
                const computeLimitIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }); // Example limit, estimate based on tx
                transaction.add(computePriceIx);
                transaction.add(computeLimitIx);

                // Add the main OFT send instruction (assuming ix is adaptable)
                // This is the most complex part without full Umi tx building
                // You might need to manually create the Instruction object based on oft.send's output/logic
                // transaction.add(ix as TransactionInstruction); // This cast is likely incorrect - needs proper conversion

                console.warn("Solana transaction building requires proper Umi instruction to Web3.js conversion or manual construction.");
                setFeedback("Solana send logic needs implementation for tx building."); // Indicate missing step
                setIsBridging(false); // Stop here for now

                /* --- If transaction building was successful: ---
                const {
                    context: { slot: minContextSlot },
                    value: { blockhash, lastValidBlockHeight }
                } = await solanaConnection.getLatestBlockhashAndContext();
                transaction.recentBlockhash = blockhash;
                transaction.feePayer = solanaPublicKey;

                const signedTransaction = await signTransaction(transaction);
                const signature = await solanaConnection.sendRawTransaction(signedTransaction.serialize());

                setFeedback('Bridge transaction sent. Confirming...');
                await solanaConnection.confirmTransaction({ blockhash, lastValidBlockHeight, signature }, 'confirmed');

                setBridgeTxHash(signature);
                setLzScanLink(getLayerZeroScanLink(signature, true)); // true for testnet
                setFeedback('Solana bridge transaction confirmed!');
                */
            }
        } catch (error: any) {
            console.error("Bridging Error:", error);
            const message = error instanceof BaseError ? error.shortMessage : error.message;
            setFeedback(`Error during bridging: ${message || 'Unknown error'}`);
            setBridgeTxHash('');
            setLzScanLink('');
        } finally {
            setIsBridging(false);
            // Don't clear fee here, user might retry send
        }
    };

    // Effect to watch for EVM transaction confirmation (optional, provides better feedback)
    const { data: evmTxReceipt, isLoading: isConfirming } = useWaitForTransactionReceipt({
        hash: evmSendTxHash,
        chainId: EVM_CHAIN_ID,
    });

    useEffect(() => {
        if (evmTxReceipt && bridgeTxHash === evmTxReceipt.transactionHash) {
            setFeedback(`EVM bridge transaction confirmed! Tx: ${bridgeTxHash}`);
            // LZ Scan link was already set
        } else if (evmSendError) {
            // Error handled in main try/catch, but could add specific feedback here
            console.error("EVM Send Error:", evmSendError);
            // Feedback state is likely already set by the catch block
        }
    }, [evmTxReceipt, evmSendError, bridgeTxHash]);


    return (
        <div className="p-6 border rounded-xl shadow-md bg-white dark:bg-gray-800 w-full max-w-lg mx-auto mt-10">
            <h2 className="text-2xl font-semibold mb-5 text-center">LayerZero Bridge (MOFT)</h2>
            <form onSubmit={handleBridge}>
                {/* Source Chain Selection */}
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">From Chain:</label>
                    <div className="flex justify-around">
                        {/* EVM Radio */}
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
                        {/* Solana Radio */}
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
                </div>

                {/* Amount Input */}
                <div className="mb-4">
                    <label htmlFor="amount" className="block text-sm font-medium mb-1">Amount (MOFT):</label>
                    <input
                        type="text" id="amount" value={amount}
                        onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                        placeholder={`e.g., 10.5`}
                        required disabled={isLoading || !sourceChain}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50"
                        inputMode="decimal"
                    />
                </div>

                {/* Recipient Address Input */}
                <div className="mb-4">
                    <label htmlFor="recipientAddress" className="block text-sm font-medium mb-1">
                        Recipient Address ({sourceChain === 'evm' ? 'Solana' : sourceChain === 'solana' ? 'EVM' : 'Destination'}):
                    </label>
                    <input
                        type="text" id="recipientAddress" value={recipientAddress}
                        onChange={(e) => setRecipientAddress(e.target.value)}
                        placeholder={sourceChain === 'evm' ? 'Enter Solana (Base58) address' : sourceChain === 'solana' ? 'Enter EVM (0x...) address' : 'Select source chain first'}
                        required disabled={isLoading || !sourceChain}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50"
                    />
                </div>

                {/* Fee Quoting Button & Display */}
                <div className="mb-4 text-center">
                    <button
                        type="button"
                        onClick={handleQuoteFee}
                        disabled={isLoading || !sourceChain || !amount || !recipientAddress || (sourceChain === 'evm' && !isCorrectEvmChain) || (sourceChain === 'solana' && !solanaConnected)}
                        className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                    >
                        {isQuotingFee ? 'Calculating Fee...' : 'Get Estimated Fee'}
                    </button>
                    {quotedFee && !isQuotingFee && (
                        <p className="mt-2 text-sm text-gray-400">
                            Estimated LZ Fee: {formatUnits(quotedFee.nativeFee, sourceChain === 'evm' ? 18 : 9)} {sourceChain === 'evm' ? 'ETH' : 'SOL'}
                        </p>
                    )}
                </div>


                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isLoading || !quotedFee || (sourceChain === 'evm' && !isCorrectEvmChain) || (sourceChain === 'solana' && !solanaConnected)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isBridging ? 'Bridging...' : `Bridge MOFT from ${sourceChain?.toUpperCase() || '...'}`}
                </button>
            </form>

            {/* Feedback Area */}
            {feedback && (
                <p className={`mt-4 text-sm ${feedback.startsWith('Error:') ? 'text-red-500' : 'text-green-500'}`}>
                    {feedback}
                </p>
            )}
            {bridgeTxHash && (
                <p className="mt-2 text-xs break-all">
                    Source Tx: {bridgeTxHash}
                </p>
            )}
            {lzScanLink && (
                <p className="mt-1 text-xs">
                    <a href={lzScanLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                        [Track on LayerZero Scan]
                    </a>
                </p>
            )}
        </div>
    );
};

export default BridgeForm;