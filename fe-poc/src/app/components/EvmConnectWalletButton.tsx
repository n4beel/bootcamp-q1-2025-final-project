"use client";

import React from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit';

const EvmConnectWalletButton = () => {
    return (
        <ConnectButton
            accountStatus={{ smallScreen: 'avatar', largeScreen: 'full' }}
            showBalance={{ smallScreen: false, largeScreen: false }}
        />
    )
}

export default EvmConnectWalletButton