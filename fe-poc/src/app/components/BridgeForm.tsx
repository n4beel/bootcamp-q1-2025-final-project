"use client";

import React, { useState, FormEvent, useEffect, useCallback, useMemo } from 'react';
import { useWallet as useSolanaWallet, useConnection as useSolanaConnection } from '@solana/wallet-adapter-react';
import { SystemProgram, Transaction, LAMPORTS_PER_SOL, PublicKey as Web3PublicKey, ComputeBudgetProgram, Connection, TransactionInstruction, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import { useAccount as useEvmAccount, useReadContract, useSimulateContract, useWriteContract, useWaitForTransactionReceipt, BaseError } from 'wagmi';
import { parseUnits, formatUnits, Address, zeroAddress, Hex, pad, toBytes, bytesToHex } from 'viem';
import bs58 from 'bs58';
import { addressToBytes32, Options } from '@layerzerolabs/lz-v2-utilities';
import { EndpointId } from '@layerzerolabs/lz-definitions';
import { oft } from '@layerzerolabs/oft-v2-solana-sdk';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { findAssociatedTokenPda, mplToolbox } from '@metaplex-foundation/mpl-toolbox';
import { publicKey, signerIdentity } from '@metaplex-foundation/umi';
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

import { toBigIntTokenAmount } from '../utils/utils'; // Adjust path if needed
import { connection } from 'next/server';
import BridgeUI from './BridgeUI';

// Define types for fee structure
type MessagingFee = {
    nativeFee: bigint;
    lzTokenFee: bigint;
};

const BridgeForm: React.FC = () => {
    const [amount, setAmount] = useState<string>('');
    const [recipientAddress, setRecipientAddress] = useState<string>('');
    const [sourceChain, setSourceChain] = useState<'solana' | 'evm' | null>('evm');
    const [isQuotingFee, setIsQuotingFee] = useState<boolean>(false);
    const [isBridging, setIsBridging] = useState<boolean>(false);
    const [feedback, setFeedback] = useState<string>('');
    const [feedbackStatus, setFeedbackStatus] = useState<'success' | 'info' | 'error' | null>(null);
    const [quotedFee, setQuotedFee] = useState<MessagingFee | null>(null);
    const [bridgeTxHash, setBridgeTxHash] = useState<string>('');
    const [lzScanLink, setLzScanLink] = useState<string>('');
    const [solBalance, setSolBalance] = useState<number>(0)
    const [ethBalance, setEthBalance] = useState<number>(0)

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
        setFeedbackStatus(null);
        setQuotedFee(null);
        setBridgeTxHash('');
        setLzScanLink('');
        setIsQuotingFee(false);
        setIsBridging(false);
        getBalanceOnSolana();
    }, [sourceChain]);

    const tokenContractAddress = EVM_OFT_CONTRACT_ADDRESS;
    const tokenAbi = [
        {
            "constant": true,
            "inputs": [{ "name": "_owner", "type": "address" }],
            "name": "balanceOf",
            "outputs": [{ "name": "balance", "type": "uint256" }],
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [],
            "name": "decimals",
            "outputs": [{ "name": "", "type": "uint8" }],
            "type": "function"
        }
    ];

    const { data: balance, refetch: refetchBalance } = useReadContract({
        address: tokenContractAddress as Address,
        abi: tokenAbi,
        functionName: "balanceOf",
        args: [evmAddress],
        chainId: EVM_CHAIN_ID,
    });

    const { data: decimals, refetch: refetchDecimals } = useReadContract({
        address: tokenContractAddress as Address,
        abi: tokenAbi,
        functionName: "decimals",
        chainId: EVM_CHAIN_ID,
    });

    useEffect(() => {
        if (balance && decimals) {
            console.log("🚀 ~ useEffect ~ updating balance");
            console.log("🚀 ~ useEffect ~ decimals:", decimals);
            console.log("🚀 ~ useEffect ~ balance:", balance);
            const formattedBalance = parseFloat(formatUnits(balance as any, decimals as any));
            setEthBalance(formattedBalance); // Set balance in MOFT tokens
        }
    }, [balance, decimals]);

    useEffect(() => {
        refetchBalance();
        refetchDecimals();
    }, [feedback, refetchBalance, refetchDecimals]);

    useEffect(() => {
        if (amount && recipientAddress) {
            handleQuoteFee();
        }
    }, [amount, recipientAddress]);


    const getBalanceOnSolana = useCallback(async () => {
        if (!solanaPublicKey || !solanaConnection) return;
        try {
            const tokenMintAddress = new Web3PublicKey(SOLANA_MOFT_MINT_ADDRESS);
            const associatedTokenAddress = getAssociatedTokenAddressSync(
                tokenMintAddress,
                solanaPublicKey,
                false, // allowOwnerOffCurve - typically false for user wallets
                TOKEN_PROGRAM_ID
            );

            const tokenAccountInfo = await solanaConnection.getParsedAccountInfo(associatedTokenAddress);
            if (tokenAccountInfo.value) {
                const tokenAmount = (tokenAccountInfo.value.data as any).parsed.info.tokenAmount;
                setSolBalance(parseFloat(tokenAmount.uiAmountString || "0")); // Set balance in MOFT tokens
            } else {
                setSolBalance(0); // No associated token account found, balance is 0
            }
        } catch (error) {
            console.error("Error fetching MOFT token balance on Solana:", error);
        }
    }, [solanaPublicKey, solanaConnection]);

    // --- Fee Quoting Logic ---
    const handleQuoteFee = async () => {
        setFeedback('');
        setFeedbackStatus(null);
        setQuotedFee(null);
        setBridgeTxHash('');
        setLzScanLink('');
        if (!sourceChain || !amount || !recipientAddress) {
            setFeedback('Error: Please fill in all fields.');
            setFeedbackStatus('error');
            return;
        }

        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            setFeedback('Error: Invalid amount.');
            setFeedbackStatus('error');
            return;
        }

        setIsQuotingFee(true);

        try {
            // --- EVM Fee Quote ---
            if (sourceChain === 'evm') {
                if (!isCorrectEvmChain || !evmAddress) {
                    setFeedback('Error: Connect to Sepolia with an EVM wallet.');
                    setFeedbackStatus('error');
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
                    setFeedbackStatus('error');
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
                // setFeedback(`Estimated Fee: ${formatUnits(fee.nativeFee, 18)} ETH`); // Assuming native fee is in ETH (18 decimals)

            }
            // --- Solana Fee Quote ---
            else if (sourceChain === 'solana') {
                // await BridgeTokensFromSolanaToEvm();
                // return;
                const connection = new Connection('https://api.devnet.solana.com');
                console.log(await connection.getVersion()); // Quick check to see if the connection works

                if (!solanaConnected || !solanaPublicKey || !umi || !umi.identity.publicKey) {
                    setFeedback('Error: Connect Solana wallet.');
                    setFeedbackStatus('error');
                    setIsQuotingFee(false);
                    return;
                }
                const amountBaseUnits = parseUnits(amount, MOFT_TOKEN_DECIMALS_SOLANA);
                let recipientBytes32: Uint8Array;
                try {
                    // Assuming recipient is an EVM address (hex)
                    recipientBytes32 = addressToBytes32(recipientAddress); // Use LZ utility
                } catch (e) {
                    setFeedback('Error: Invalid EVM recipient address format.');
                    setFeedbackStatus('error');
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
                    setFeedbackStatus('error');
                    setIsQuotingFee(false);
                    return; // Prevent calling oft.quote if objects are missing
                }

                console.log("console in the App......", umi.rpc as any, // Cast to any for compatibility
                    {
                        payer: umi.identity.publicKey as any,
                        tokenMint: publicKey(SOLANA_MOFT_MINT_ADDRESS) as any,
                        tokenEscrow: publicKey(SOLANA_OFT_ESCROW_ADDRESS) as any,
                    },
                    {
                        payInLzToken: false,
                        to: Buffer.from(recipientBytes32), // SDK expects Buffer
                        dstEid: EVM_ENDPOINT_ID,
                        amountLd: amountBaseUnits,
                        minAmountLd: 1n, // 99% slippage
                        options: Buffer.from(''), // Default options
                        composeMsg: undefined,
                    },
                    { oft: publicKey(SOLANA_OFT_PROGRAM_ID) as any })

                const { nativeFee } = await oft.quote(
                    umi.rpc as any, // Cast to any for compatibility
                    {
                        payer: umi.identity.publicKey as any,
                        tokenMint: publicKey(SOLANA_MOFT_MINT_ADDRESS) as any,
                        tokenEscrow: publicKey(SOLANA_OFT_ESCROW_ADDRESS) as any,
                    },
                    {
                        payInLzToken: false,
                        to: Buffer.from(recipientBytes32), // SDK expects Buffer
                        dstEid: EVM_ENDPOINT_ID,
                        amountLd: amountBaseUnits,
                        // minAmountLd: (amountBaseUnits * 99n) / 100n, // 99% slippage
                        minAmountLd: 1n, // 99% slippage
                        options: Buffer.from(''), // Default options
                        composeMsg: undefined,
                    },
                    { oft: publicKey(SOLANA_OFT_PROGRAM_ID) as any }
                );

                // Note: Solana nativeFee from SDK might be in SOL lamports (need confirmation)
                const fee = { nativeFee, lzTokenFee: 0n }; // Assuming lzTokenFee is 0 if payInLzToken is false
                setQuotedFee(fee);
                // Format assuming fee is in Lamports (9 decimals for SOL)
                setFeedback(`Estimated Fee: ${formatUnits(nativeFee, 9)} SOL`);
                setFeedbackStatus('info');

            }
        } catch (error: any) {
            console.error("Fee Quoting Error:", error);
            const message = error instanceof BaseError ? error.shortMessage : error.message;
            setFeedback(`Error quoting fee: ${message || 'Unknown error'}`);
            setFeedbackStatus('error');
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
            setFeedbackStatus('error');
            return;
        }

        setFeedback('');
        setFeedbackStatus(null);
        setBridgeTxHash('');
        setLzScanLink('');
        setIsBridging(true);

        const numericAmount = parseFloat(amount); // Should be validated already

        try {
            // --- EVM Bridge Send ---
            if (sourceChain === 'evm') {
                if (!isCorrectEvmChain || !evmAddress || !writeContractAsync || !approveAsync) {
                    setFeedback('Error: Connect to Sepolia with an EVM wallet.');
                    setFeedbackStatus('error');
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
                setFeedbackStatus('info');
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
                    setFeedbackStatus('success');

                } catch (approvalError: any) {
                    console.error("Approval Error:", approvalError);
                    const message = approvalError instanceof BaseError ? approvalError.shortMessage : approvalError.message;
                    setFeedback(`Error during approval: ${message}`);
                    setFeedbackStatus('error');
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
                setFeedbackStatus('info');
                setBridgeTxHash(txHash);

                // Note: LayerZero Scan link typically uses the *source* tx hash
                setLzScanLink(getLayerZeroScanLink(txHash, true)); // true for testnet

            }
            // --- Solana Bridge Send ---
            else if (sourceChain === 'solana') {
                if (!solanaConnected || !solanaPublicKey || !umi || !umi.identity.publicKey || !signTransaction) {
                    setFeedback('Error: Connect Solana wallet.');
                    setFeedbackStatus('error');
                    setIsBridging(false);
                    return;
                }

                const amountBaseUnits = parseUnits(amount, MOFT_TOKEN_DECIMALS_SOLANA);
                const recipientBytes32 = addressToBytes32(recipientAddress as Address);

                // Find user's Associated Token Account (ATA) for the MOFT token
                const sourceTokenAccount = getAssociatedTokenAddressSync(
                    new Web3PublicKey(SOLANA_MOFT_MINT_ADDRESS),
                    solanaPublicKey,
                    false, // allowOwnerOffCurve - typically false for user wallets
                    TOKEN_PROGRAM_ID // SPL Token Program ID
                );

                const ix = await oft.send(
                    umi.rpc as any, // Cast to any for compatibility
                    {
                        // Ensure identity is the wallet signer
                        payer: umi.identity as any, // Should be walletAdapterIdentity
                        tokenMint: publicKey(SOLANA_MOFT_MINT_ADDRESS) as any,
                        tokenEscrow: publicKey(SOLANA_OFT_ESCROW_ADDRESS) as any,
                        tokenSource: publicKey(sourceTokenAccount.toBase58()) as any, // User's ATA
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
                        oft: publicKey(SOLANA_OFT_PROGRAM_ID) as any,
                        token: publicKey(TOKEN_PROGRAM_ID.toBase58()) as any, // SPL Token Program
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
                setFeedbackStatus('info');
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
            setFeedbackStatus('error');
            setBridgeTxHash('');
            setLzScanLink('');
        } finally {
            setIsBridging(false);
            // Don't clear fee here, user might retry send
        }
    };

    async function BridgeTokensFromSolanaToEvm() {
        // setIsLoading(true);
        // toast.success('Please ready to sign the transaction');
        const walletClient = solanaWallet;
        let signature = '';
        try {
            // console.log(chainConfig, 'cja');
            if (+amount <= 0) {
                setFeedback('Please enter a valid token amount');
                setFeedbackStatus('error');
                return;
            }

            // TODO: update addresses
            const { escrowStr, mintStr, programIdStr, tokenProgramId } = {
                programIdStr: SOLANA_OFT_PROGRAM_ID,
                mintStr: SOLANA_MOFT_MINT_ADDRESS,
                escrowStr: SOLANA_OFT_ESCROW_ADDRESS,
                tokenProgramId: TOKEN_PROGRAM_ID,
            }

            console.log('🚀 ~ BridgeTokensFromSolanaToEvm ~ escrowStr:', escrowStr);
            if (!escrowStr || !mintStr || !programIdStr) return;
            const bigIntAmount = toBigIntTokenAmount(amount, 9);
            const networkConfig = {
                name: 'Solana',
                chainId: 103,
                canDeposit: true,
                // icon: SolanaIcon,
                symbol: 'SOL',
                depositManagerAddress: '',
                tokenAddress: '',
                messengerAddress: '',
                abi: null,
                infuraNetworkKeyword: '',
                wethAddress: '',
                rpc: 'https://api.devnet.solana.com',
                hideTokens: ['ETH', 'WETH'],
                hideOnChains: [11155111, 17000, 44787, 2810, 30732], // Hide this network when connected to these chains
            }

            const connection = new Connection(networkConfig?.rpc as string, 'confirmed');

            if (!walletClient)
                setFeedback('Please refresh the site');
            setFeedbackStatus('info');

            const umi = createUmi(connection.rpcEndpoint)
                .use(mplToolbox())
                .use(walletAdapterIdentity(walletClient));

            const mint = publicKey(mintStr);
            console.log('🚀 ~ BridgeTokensFromSolanaToEvm ~ mint:', mint);

            const tokenProgram = publicKey(tokenProgramId);

            const escrowPubkey = publicKey(escrowStr);

            const oftProgramId = publicKey(programIdStr);
            // console.log(chainId);
            const dstEid = EVM_ENDPOINT_ID
            console.log('🚀 ~ useDeposit ~ dstEid:', dstEid);

            const tokenAccount = findAssociatedTokenPda(umi, {
                mint: publicKey(mintStr),
                owner: walletClient?.publicKey as any,
                tokenProgramId: tokenProgram,
            });

            console.log('🚀 ~ BridgeTokensFromSolanaToEvm ~recipientAddress:', recipientAddress);
            const recipientBytes32 = addressToBytes32(recipientAddress);

            console.log('🚀 ~ BridgeTokensFromSolanaToEvm ~ recipientBytes32:', recipientBytes32);
            const options = Options.newOptions().addExecutorLzReceiveOption('200000', '1');
            console.log('🚀 ~ BridgeTokensFromSolanaToEvm ~ options:', options);
            // let nativeFee;

            const quoteResponse = await oft.quote(
                umi.rpc as any,
                {
                    payer: umi.identity.publicKey as any,
                    tokenMint: mint as any,
                    tokenEscrow: escrowPubkey as any,
                },
                {
                    payInLzToken: false,
                    to: Buffer.from(recipientBytes32),
                    dstEid,
                    amountLd: bigIntAmount,
                    minAmountLd: 1n,
                    options: Buffer.from(options.toBytes()),
                    composeMsg: undefined,
                },
                {
                    oft: programIdStr as any,
                }
            );
            console.log('🚀 ~ quoteResponse:', quoteResponse);
            const nativeFee = quoteResponse.nativeFee;
            const balanceResponse = await solanaConnection.getBalance(
                walletClient?.publicKey as Web3PublicKey
            );
            console.log(balanceResponse, 'balanceResponse');
            console.log('🚀 ~ nativeFee:', nativeFee);

            const balanceBigInt = BigInt(balanceResponse);

            console.log('🚀 ~ useDeposit ~ balanceBigInt < nativeFee:', balanceBigInt < nativeFee);
            if (balanceBigInt < nativeFee) {
                setFeedback('Not enough Sol');
                setFeedbackStatus('error');
            }
            const ix = await oft.send(
                umi.rpc as any,
                {
                    payer: walletClient as any,
                    tokenMint: mint as any,
                    tokenEscrow: escrowPubkey as any,
                    tokenSource: tokenAccount[0] as any,
                },
                {
                    to: Buffer.from(recipientBytes32),
                    dstEid,
                    amountLd: bigIntAmount,
                    minAmountLd: (bigIntAmount * 9n) / 10n,
                    options: Buffer.from(options.toBytes()),
                    // options: Buffer.from(''),
                    composeMsg: undefined,
                    nativeFee: nativeFee,
                },
                {
                    oft: oftProgramId as any,
                    token: tokenProgram as any,
                }
            );
            console.log('🚀 ~ ix:', ix);

            const latestBlockhash = await connection.getLatestBlockhash();
            console.log('🚀 ~ latestBlockhash:', latestBlockhash);
            const actualInstruction = ix.instruction;
            console.log('🚀 ~ actualInstruction:', actualInstruction);
            const transactionInstruction = new TransactionInstruction({
                keys: actualInstruction.keys.map((key: any) => ({
                    pubkey: new Web3PublicKey(key.pubkey),
                    isSigner: key.isSigner,
                    isWritable: key.isWritable,
                })),
                programId: new Web3PublicKey(actualInstruction.programId), // PublicKey of the program
                data: Buffer.from(actualInstruction.data), // Serialized data to pass to the program
            });
            console.log('🚀 ~ transactionInstruction:', transactionInstruction);
            const computeUnitLimit = 5_000_000; // Maximum compute units allowed for the transaction

            const computeUnitLimitIx = ComputeBudgetProgram.setComputeUnitLimit({
                units: computeUnitLimit,
            });
            const computeUnitPriceIx = ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: 100_000,
            });

            const msgV0 = new TransactionMessage({
                payerKey: walletClient.publicKey as any,
                recentBlockhash: latestBlockhash.blockhash,
                instructions: [computeUnitLimitIx, computeUnitPriceIx, transactionInstruction],
            }).compileToV0Message();
            console.log('🚀 ~ msgV0:', msgV0);

            const versionedTx = new VersionedTransaction(msgV0);
            console.log('🚀 ~ versionedTx:', versionedTx);
            const signedTx = await walletClient?.signTransaction?.(versionedTx) as any;

            console.log('🚀 ~ signedTx:', signedTx);
            signature = await connection.sendTransaction(signedTx, {
                preflightCommitment: 'confirmed',
                // skipPreflight: true,
            });
            console.log('🚀 ~ signature:', signature);
            const confirmTx = await connection.confirmTransaction(signature, 'confirmed');
            console.log('🚀 ~ confirmTx:', confirmTx);
            // await pollForDestinationExplorerUrl(signature, chainId);
            setIsBridging(false);
            // setIsOpen(true);
            // setTxSuccess(true);

            setRecipientAddress('');
            setAmount('');

            setFeedback('Bridge transaction sent. Waiting for confirmation...');
            setFeedbackStatus('info');
            setBridgeTxHash(signature);

            // Note: LayerZero Scan link typically uses the *source* tx hash
            setLzScanLink(getLayerZeroScanLink(signature, true)); // true for testnet

            // const explorerUrl = getLayerZeroScanUrl(signature, srcChainId === 103 ? true : false);
            // console.log(`\n✅ Bridging transaction sent. Signature: ${signature}`);
            // // const explorerUrl = EXPLORER_URLS[chainId as keyof typeof EXPLORER_URLS];
            // setExplorerUrl(explorerUrl); //`${explorerUrl}/tx/${signature}`);
        } catch (error) {
            console.log('🚀 ~ useDeposit ~ error:', error);
            setIsBridging(false);
            setRecipientAddress('');
            setAmount('');
            setFeedback('An error occurred during approval');
            setFeedbackStatus('error');
            return false;
        }
    }

    // Effect to watch for EVM transaction confirmation (optional, provides better feedback)
    const { data: evmTxReceipt, isLoading: isConfirming } = useWaitForTransactionReceipt({
        hash: evmSendTxHash,
        chainId: EVM_CHAIN_ID,
    });

    useEffect(() => {
        if (evmTxReceipt && bridgeTxHash === evmTxReceipt.transactionHash) {
            setFeedback(`EVM bridge transaction confirmed!`);
            setFeedbackStatus('success');
            // LZ Scan link was already set
        } else if (evmSendError) {
            // Error handled in main try/catch, but could add specific feedback here
            console.error("EVM Send Error:", evmSendError);
            // Feedback state is likely already set by the catch block
        }
    }, [evmTxReceipt, evmSendError, bridgeTxHash]);

    const uiProps = {
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
    }


    return (
        <BridgeUI {...uiProps} />
    );
};

export default BridgeForm;