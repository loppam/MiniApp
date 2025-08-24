"use client";

import React, { useEffect, useState } from "react";
import { PriceService } from "~/lib/price-service";
import { sdk } from "@farcaster/miniapp-sdk";

interface TokenPriceDisplayProps {
  showDetails?: boolean;
  refreshInterval?: number; // in milliseconds
}

export function TokenPriceDisplay({
  showDetails = true,
  refreshInterval = 30000,
}: TokenPriceDisplayProps) {
  const [priceData, setPriceData] = useState<{
    ethPrice: number;
    pTradoorPrice: number;
    source: string;
    lastUpdated: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [farcasterConnected, setFarcasterConnected] = useState(false);

  const fetchPrices = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check Farcaster connection
      try {
        const context = await sdk.context;
        setFarcasterConnected(!!context);
      } catch {
        setFarcasterConnected(false);
      }

      // Get price data
      const data = await PriceService.getPriceData();
      setPriceData({
        ethPrice: data.ethPrice,
        pTradoorPrice: data.pTradoorPrice,
        source: data.source,
        lastUpdated: data.lastUpdated,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch prices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();

    // Set up auto-refresh
    const interval = setInterval(fetchPrices, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 4,
      maximumFractionDigits: 6,
    }).format(price);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  if (loading && !priceData) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-sm text-gray-600">Loading prices...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-red-600 text-sm">
            <strong>Error:</strong> {error}
          </div>
          <button
            onClick={fetchPrices}
            className="ml-2 text-red-600 hover:text-red-800 text-sm underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!priceData) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">Token Prices</h3>
        <div className="flex items-center space-x-2">
          <div
            className={`w-2 h-2 rounded-full ${
              farcasterConnected ? "bg-green-500" : "bg-gray-400"
            }`}
          />
          <span className="text-xs text-gray-500">
            {farcasterConnected
              ? "Farcaster Connected"
              : "Farcaster Disconnected"}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {/* ETH Price */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">Ξ</span>
            </div>
            <span className="font-medium text-gray-900">ETH</span>
          </div>
          <div className="text-right">
            <div className="font-semibold text-gray-900">
              {formatPrice(priceData.ethPrice)}
            </div>
            {showDetails && (
              <div className="text-xs text-gray-500">Source: CoinGecko</div>
            )}
          </div>
        </div>

        {/* pTradoor Price */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">P</span>
            </div>
            <span className="font-medium text-gray-900">pTradoor</span>
          </div>
          <div className="text-right">
            <div className="font-semibold text-gray-900">
              {formatPrice(priceData.pTradoorPrice)}
            </div>
            {showDetails && (
              <div className="text-xs text-gray-500">Source: CoinGecko</div>
            )}
          </div>
        </div>

        {showDetails && (
          <div className="pt-3 border-t border-gray-100">
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>Last updated:</span>
              <span>{formatTime(priceData.lastUpdated)}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>Data source:</span>
              <span className="capitalize">
                {priceData.source.replace("_", " ")}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
        <button
          onClick={fetchPrices}
          disabled={loading}
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors"
        >
          {loading ? "Refreshing..." : "Refresh Prices"}
        </button>

        {farcasterConnected && (
          <div className="space-y-2">
            <button
              onClick={async () => {
                try {
                  await PriceService.openSwapForm(
                    "eip155:8453/slip44:60", // ETH
                    "eip155:8453/erc20:0x41Ed0311640A5e489A90940b1c33433501a21B07", // pTradoor
                    "1000000000000000000" // 1 ETH
                  );
                } catch (error) {
                  console.error("Error opening buy swap form:", error);
                }
              }}
              className="w-full bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors"
            >
              Buy pTradoor (ETH → pTradoor)
            </button>

            <button
              onClick={async () => {
                try {
                  await PriceService.openSwapForm(
                    "eip155:8453/erc20:0x41Ed0311640A5e489A90940b1c33433501a21B07", // pTradoor
                    "eip155:8453/slip44:60", // ETH
                    "1000000000000000000" // 1 pTradoor
                  );
                } catch (error) {
                  console.error("Error opening sell swap form:", error);
                }
              }}
              className="w-full bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors"
            >
              Sell pTradoor (pTradoor → ETH)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default TokenPriceDisplay;
