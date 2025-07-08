'use client';

import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

export default function SwapsPage() {
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapResult, setSwapResult] = useState<unknown>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<unknown>(null);

  useEffect(() => {
    // Hide splash screen when ready
    sdk.actions.ready();
  }, []);

  const handleSwap = async () => {
    setIsSwapping(true);
    setSwapResult(null);

    try {
      // Base USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
      // Base DEGEN: 0x4ed4e862860bed51a9570b96d89af5e1b0efefed
      // 1 USDC = 1000000 (6 decimals)
      
      const result = await sdk.actions.swapToken({
        sellToken: 'eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        buyToken: 'eip155:8453/erc20:0x4ed4e862860bed51a9570b96d89af5e1b0efefed',
        sellAmount: '1000000', // 1 USDC
      });

      setSwapResult(result);
    } catch (error) {
      setSwapResult({
        error: true,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error
      });
    } finally {
      setIsSwapping(false);
    }
  };

  const handleSend = async () => {
    setIsSending(true);
    setSendResult(null);

    try {
      // Base DEGEN: 0x4ed4e862860bed51a9570b96d89af5e1b0efefed
      // 10 DEGEN = 10000000000000000000 (18 decimals)
      
      const result = await sdk.actions.sendToken({
        token: 'eip155:8453/erc20:0x4ed4e862860bed51a9570b96d89af5e1b0efefed',
        amount: '10000000000000000000', // 10 DEGEN
        recipientAddress: '0x729170d38dd5449604f35f349fdfcc9ad08257cd',
      });

      setSendResult(result);
    } catch (error) {
      setSendResult({
        error: true,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-between p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm">
        <p className="text-center mb-8 text-lg">Swap & Send on Base</p>
      </div>

      <div className="flex items-center justify-center gap-8">
        <button
          className={`group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30 ${
            isSwapping ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
          onClick={handleSwap}
          disabled={isSwapping}
        >
          <h2 className="mb-3 text-2xl font-semibold">
            {isSwapping ? 'Swapping...' : 'Initiate Swap'}{' '}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Swap 1 USDC for DEGEN
          </p>
        </button>

        <button
          className={`group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30 ${
            isSending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
          onClick={handleSend}
          disabled={isSending}
        >
          <h2 className="mb-3 text-2xl font-semibold">
            {isSending ? 'Sending...' : 'Send DEGEN'}{' '}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Send 10 DEGEN to 0x7291...57cd
          </p>
        </button>
      </div>

      <div className="mb-32 grid text-center gap-8 lg:mb-0 lg:w-full lg:max-w-5xl lg:grid-cols-2 lg:text-left">
        {swapResult !== null && (
          <div className="group rounded-lg border border-transparent px-5 py-4 w-full">
            <h2 className="mb-3 text-2xl font-semibold">Swap Result:</h2>
            <pre className="overflow-auto bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm leading-6 max-w-full">
              {JSON.stringify(swapResult, null, 2)}
            </pre>
          </div>
        )}

        {sendResult !== null && (
          <div className="group rounded-lg border border-transparent px-5 py-4 w-full">
            <h2 className="mb-3 text-2xl font-semibold">Send Result:</h2>
            <pre className="overflow-auto bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm leading-6 max-w-full">
              {JSON.stringify(sendResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}