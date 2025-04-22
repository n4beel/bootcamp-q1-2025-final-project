'use client'

import dynamic from 'next/dynamic'
import Loading from './components/Loading'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const SolanaConnectButton = dynamic(
  () => import('./components/SolanaConnectWalletButton'),
  {
    loading: () => <Loading />,
    ssr: false
  }
)

const EvmConnectButton = dynamic(
  () => import('./components/EvmConnectWalletButton'),
  {
    loading: () => <Loading />,
    ssr: false
  }
)

const BridgeForm = dynamic(() => import('./components/BridgeForm'), {
  loading: () => <Loading />,
  ssr: false
})

export default function Home () {
  return (
    <main className='flex flex-col gap-12 items-center justify-center min-h-screen w-full p-8 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800'>
      <div className='text-center space-y-6 py-4'>
        <h1 className='text-5xl font-bold tracking-tight text-gray-900 dark:text-white mb-1.5'>
          Cross-Chain Bridge
        </h1>
        <p className='text-xl text-center text-gray-600 dark:text-gray-300 max-w-3xl mx-auto p-2'>
          Seamlessly transfer assets between Solana and EVM chains
        </p>
      </div>
      <div className='w-full max-w-6xl mx-auto space-y-12'>
        <Card
          className={cn(
            'w-full backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 border-2',
            'shadow-xl hover:shadow-2xl transition-all duration-300',
            'overflow-hidden'
          )}
        >
          <CardHeader className='py-8 text-center bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40'>
            <CardTitle className='text-3xl bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400'>
              Connect Your Wallets
            </CardTitle>
            <CardDescription className='text-lg mt-2 text-gray-700 dark:text-gray-300'>
              Connect both Solana and EVM wallets to start bridging assets
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-10 pb-10 pt-6'>
            {/* Wallet Connection Section */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-8 mb-2.5'>
              {/* Solana Section */}
              <div className='space-y-6 group'>
                <div className='flex items-center space-x-3'>
                  <div className='h-3 w-3 rounded-full bg-purple-500 animate-pulse' />
                  <h3 className='text-2xl font-semibold text-purple-600 dark:text-purple-400 group-hover:translate-x-1 transition-transform'>
                    Solana (Devnet)
                  </h3>
                </div>
                <div className='flex justify-center p-8 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg shadow-inner border border-purple-100 dark:border-purple-800/30'>
                  <SolanaConnectButton />
                </div>
              </div>

              {/* EVM Section */}
              <div className='space-y-6 group'>
                <div className='flex items-center space-x-3'>
                  <div className='h-3 w-3 rounded-full bg-blue-500 animate-pulse' />
                  <h3 className='text-2xl font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform'>
                    EVM (Sepolia)
                  </h3>
                </div>
                <div className='flex justify-center h-12 p-8 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg shadow-inner border border-blue-100 dark:border-blue-800/30'>
                  <EvmConnectButton />
                </div>
              </div>
            </div>
            {/* this is just a dirty trick to make the bridge form section look better */}
            <div className='text-white'>space</div>
            <Separator className='my-16 bg-gradient-to-r from-transparent via-indigo-200 dark:via-indigo-800 to-transparent h-px' />

            {/* Bridge Form */}
            <div className='flex flex-col mt-1.5 gap-4 w-full items-center justify-center'>
              <div className='flex items-center space-x-3'>
                <div className='h-3 w-3 rounded-full bg-green-500 animate-pulse' />
                <h3 className='text-2xl font-semibold text-green-600 dark:text-green-400 group-hover:translate-x-1 transition-transform'>
                  Bridge Assets (LayerZero Bridge)
                </h3>
              </div>
              <div className='flex flex-col items-center justify-center w-full bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg shadow-inner border border-green-100 dark:border-green-800/30'>
                <BridgeForm />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
