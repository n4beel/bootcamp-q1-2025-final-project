"use client";

import React from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Image from 'next/image';

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
            }) => {
                // Note: If your app doesn't use authentication, you
                // can remove all 'authenticationStatus' checks
                const ready = mounted && authenticationStatus !== 'loading';
                const connected =
                    ready &&
                    account &&
                    chain &&
                    (!authenticationStatus ||
                        authenticationStatus === 'authenticated');

                return (
                    <div
                        {...(!ready && {
                            'aria-hidden': true,
                            'style': {
                                opacity: 0,
                                pointerEvents: 'none',
                                userSelect: 'none',
                            },
                        })}
                    >
                        {(() => {
                            if (!connected) {
                                return (
                                    <button style={{
                                        backgroundColor: 'white',
                                        color: 'black',
                                        borderRadius: '40px',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '16px',
                                        fontWeight: 600,
                                        height: '48px',
                                        lineHeight: '48px',
                                        padding: '0 24px',
                                    }} onClick={openConnectModal} type="button">
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
                                <div style={{ display: 'flex', gap: 12 }}>
                                    {/* <button
                                        onClick={openChainModal}
                                        style={{ display: 'flex', alignItems: 'center' }}
                                        type="button"
                                    >
                                        {chain.hasIcon && (
                                            <div
                                                style={{
                                                    background: chain.iconBackground,
                                                    width: 12,
                                                    height: 12,
                                                    borderRadius: 999,
                                                    overflow: 'hidden',
                                                    marginRight: 4,
                                                }}
                                            >
                                                {chain.iconUrl && (
                                                    <img
                                                        alt={chain.name ?? 'Chain icon'}
                                                        src={chain.iconUrl}
                                                        style={{ width: 12, height: 12 }}
                                                    />
                                                )}
                                            </div>
                                        )}
                                        {chain.name}
                                    </button> */}

                                    <button style={{
                                        backgroundColor: 'white',
                                        color: 'black',
                                        borderRadius: '40px',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '16px',
                                        fontWeight: 600,
                                        height: '48px',
                                        lineHeight: '48px',
                                        padding: '0 24px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }} onClick={openAccountModal} type="button">
                                        <Image src={require('../assets/ethereum.png')} alt='bridge logo' width={28} height={28} style={{ marginRight: 8 }} />
                                        {account.displayName}
                                        {/* {account.displayBalance
                                            ? ` (${account.displayBalance})`
                                            : ''} */}
                                    </button>
                                </div>
                            );
                        })()}
                    </div>
                );
            }}
        </ConnectButton.Custom>
    )
}

export default EvmConnectWalletButton