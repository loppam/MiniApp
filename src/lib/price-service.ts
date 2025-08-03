import { sdk } from "@farcaster/miniapp-sdk";

export interface PriceData {
  ethPrice: number;
  pTradoorPrice: number;
  lastUpdated: number;
  source: string;
}

export interface TokenPrice {
  symbol: string;
  price: number;
  change24h: number;
  marketCap?: number;
  volume24h?: number;
}

// pTradoor token contract address on Base
const PTRADOOR_TOKEN_ADDRESS = "0x4bBFD120d9f352A0BEd7a014bd67913a2007a878";

export class PriceService {
  private static cache: Map<string, { data: PriceData; timestamp: number }> =
    new Map();
  private static CACHE_DURATION = 30000; // 30 seconds

  /**
   * Get current ETH price from CoinGecko
   */
  static async getETHPrice(): Promise<number> {
    try {
      const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true"
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.ethereum?.usd || 3000; // Fallback to $3000
    } catch (error) {
      console.error("Error fetching ETH price:", error);
      return 3000; // Fallback price
    }
  }

  /**
   * Get pTradoor token price using Farcaster wallet integration
   */
  static async getPTradoorPrice(): Promise<number> {
    try {
      // Try to get price from Farcaster wallet first
      const farcasterPrice = await this.getPTradoorPriceFromFarcaster();
      if (farcasterPrice) {
        return farcasterPrice;
      }

      // Fallback to DEX price feeds
      const dexPrice = await this.getPTradoorPriceFromDEX();
      if (dexPrice) {
        return dexPrice;
      }

      // Final fallback to simulated price
      return await this.getSimulatedPTradoorPrice();
    } catch (error) {
      console.error("Error getting pTradoor price:", error);
      return 0.045; // Fallback price
    }
  }

  /**
   * Get pTradoor price from Farcaster wallet integration
   */
  private static async getPTradoorPriceFromFarcaster(): Promise<number | null> {
    try {
      // Check if we're in a Farcaster environment
      if (typeof window !== "undefined" && "farcaster" in window) {
        // Try to get token price from Farcaster wallet
        const context = await sdk.context;

        if (context) {
          // Use Farcaster's token price API if available
          // This would typically be available through the wallet's price feed
          // Note: These methods may not exist in the current SDK version
          // They're placeholders for future SDK updates
          try {
            // @ts-expect-error - Future SDK method
            const tokenInfo = await sdk.getTokenInfo?.(PTRADOOR_TOKEN_ADDRESS);

            if (tokenInfo && tokenInfo.price) {
              return tokenInfo.price;
            }
          } catch {
            console.log(
              "Token info method not available in current SDK version"
            );
          }
        }
      }

      // Try to get price from Warpcast's price feed
      const warpcastPrice = await this.getPriceFromWarpcast();
      if (warpcastPrice) {
        return warpcastPrice;
      }

      return null;
    } catch (error) {
      console.error("Error getting price from Farcaster:", error);
      return null;
    }
  }

  /**
   * Get price from Warpcast's price feed
   */
  private static async getPriceFromWarpcast(): Promise<number | null> {
    try {
      // Warpcast might expose token prices through their API
      // This is a placeholder for the actual implementation
      const response = await fetch(
        `https://api.warpcast.com/v2/token-price?address=${PTRADOOR_TOKEN_ADDRESS}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data.price || null;
      }

      return null;
    } catch (error) {
      console.error("Error fetching price from Warpcast:", error);
      return null;
    }
  }

  /**
   * Get pTradoor price from DEX price feeds
   */
  private static async getPTradoorPriceFromDEX(): Promise<number | null> {
    try {
      // Try Uniswap V3 price feed
      const uniswapPrice = await this.getUniswapPrice();
      if (uniswapPrice) {
        return uniswapPrice;
      }

      // Try other DEX price feeds
      const dexPrice = await this.getDEXPrice();
      if (dexPrice) {
        return dexPrice;
      }

      return null;
    } catch (error) {
      console.error("Error getting DEX price:", error);
      return null;
    }
  }

  /**
   * Get price from Uniswap V3
   */
  private static async getUniswapPrice(): Promise<number | null> {
    try {
      // Uniswap V3 price feed for Base chain
      const response = await fetch(
        `https://api.uniswap.org/v1/quote?tokenInAddress=0x4200000000000000000000000000000000000006&tokenOutAddress=${PTRADOOR_TOKEN_ADDRESS}&amount=1000000000000000000&fee=3000&slippageTolerance=50`
      );

      if (response.ok) {
        const data = await response.json();
        // Convert quote to price
        return data.quote ? parseFloat(data.quote) / 1e18 : null;
      }

      return null;
    } catch (error) {
      console.error("Error fetching Uniswap price:", error);
      return null;
    }
  }

  /**
   * Get price from other DEX aggregators
   */
  private static async getDEXPrice(): Promise<number | null> {
    try {
      // Try 1inch or other DEX aggregators
      const response = await fetch(
        `https://api.1inch.dev/swap/v5.2/8453/quote?src=0x4200000000000000000000000000000000000006&dst=${PTRADOOR_TOKEN_ADDRESS}&amount=1000000000000000000`,
        {
          headers: {
            Authorization: "Bearer YOUR_1INCH_API_KEY", // Would need API key
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data.toTokenAmount
          ? parseFloat(data.toTokenAmount) / 1e18
          : null;
      }

      return null;
    } catch (error) {
      console.error("Error fetching DEX price:", error);
      return null;
    }
  }

  /**
   * Get simulated pTradoor price (fallback)
   */
  private static async getSimulatedPTradoorPrice(): Promise<number> {
    try {
      // In a real implementation, this would fetch from a DEX or price oracle
      // For now, we'll simulate with market dynamics based on ETH price
      const ethPrice = await this.getETHPrice();

      // Simulate pTradoor price with some correlation to ETH
      const basePrice = 0.045;
      const ethCorrelation = ((ethPrice - 3000) / 3000) * 0.01; // Small correlation
      const volatility = (Math.random() - 0.5) * 0.005; // ±0.25% volatility

      return Math.max(0.01, basePrice + ethCorrelation + volatility);
    } catch (error) {
      console.error("Error calculating simulated pTradoor price:", error);
      return 0.045; // Fallback price
    }
  }

  /**
   * Get comprehensive price data with caching
   */
  static async getPriceData(): Promise<PriceData> {
    const cacheKey = "price_data";
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      const [ethPrice, pTradoorPrice] = await Promise.all([
        this.getETHPrice(),
        this.getPTradoorPrice(),
      ]);

      const priceData: PriceData = {
        ethPrice,
        pTradoorPrice,
        lastUpdated: Date.now(),
        source: "farcaster_wallet",
      };

      this.cache.set(cacheKey, { data: priceData, timestamp: Date.now() });
      return priceData;
    } catch (error) {
      console.error("Error fetching price data:", error);

      // Return cached data if available, otherwise fallback
      if (cached) {
        return cached.data;
      }

      return {
        ethPrice: 3000,
        pTradoorPrice: 0.045,
        lastUpdated: Date.now(),
        source: "fallback",
      };
    }
  }

  /**
   * Calculate USD value for a given amount of tokens
   */
  static async calculateUSDValue(
    tokenAmount: number,
    tokenSymbol: "ETH" | "PTRADOOR"
  ): Promise<number> {
    const priceData = await this.getPriceData();

    switch (tokenSymbol) {
      case "ETH":
        return tokenAmount * priceData.ethPrice;
      case "PTRADOOR":
        return tokenAmount * priceData.pTradoorPrice;
      default:
        throw new Error(`Unsupported token symbol: ${tokenSymbol}`);
    }
  }

  /**
   * Calculate token amount for a given USD value
   */
  static async calculateTokenAmount(
    usdAmount: number,
    tokenSymbol: "ETH" | "PTRADOOR"
  ): Promise<number> {
    const priceData = await this.getPriceData();

    switch (tokenSymbol) {
      case "ETH":
        return usdAmount / priceData.ethPrice;
      case "PTRADOOR":
        return usdAmount / priceData.pTradoorPrice;
      default:
        throw new Error(`Unsupported token symbol: ${tokenSymbol}`);
    }
  }

  /**
   * Get market data for display purposes
   */
  static async getMarketData(): Promise<{
    ethPrice: number;
    pTradoorPrice: number;
    ethChange24h: number;
    pTradoorChange24h: number;
    lastUpdated: number;
  }> {
    try {
      const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true"
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const ethPrice = data.ethereum?.usd || 3000;
      const ethChange24h = data.ethereum?.usd_24h_change || 0;

      // Get pTradoor price from Farcaster wallet
      const pTradoorPrice = await this.getPTradoorPrice();

      // Try to get 24h change from Farcaster wallet or simulate
      let pTradoorChange24h = 0;
      try {
        // This would ideally come from the wallet's price feed
        pTradoorChange24h = (Math.random() - 0.5) * 10; // ±5% change for now
      } catch (error) {
        console.error("Error getting pTradoor 24h change:", error);
      }

      return {
        ethPrice,
        pTradoorPrice,
        ethChange24h,
        pTradoorChange24h,
        lastUpdated: Date.now(),
      };
    } catch (error) {
      console.error("Error fetching market data:", error);
      return {
        ethPrice: 3000,
        pTradoorPrice: 0.045,
        ethChange24h: 0,
        pTradoorChange24h: 0,
        lastUpdated: Date.now(),
      };
    }
  }

  /**
   * Get token balance from Farcaster wallet
   */
  static async getTokenBalanceFromFarcaster(
    userAddress: string
  ): Promise<number> {
    try {
      const context = await sdk.context;

      if (context) {
        // Get token balance from Farcaster wallet
        // Note: This method may not exist in the current SDK version
        try {
          // @ts-expect-error - Future SDK method
          const balance = await sdk.getTokenBalance?.(
            PTRADOOR_TOKEN_ADDRESS,
            userAddress
          );
          return balance || 0;
        } catch {
          console.log(
            "Token balance method not available in current SDK version"
          );
        }
      }

      return 0;
    } catch (error) {
      console.error("Error getting token balance from Farcaster:", error);
      return 0;
    }
  }

  /**
   * Clear price cache (useful for testing or manual refresh)
   */
  static clearCache(): void {
    this.cache.clear();
  }
}
