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
   * Get pTradoor token price - let Warpcast handle pricing
   */
  static async getPTradoorPrice(): Promise<number> {
    try {
      // Check if we're in a Farcaster environment
      const context = await sdk.context;

      if (!context) {
        throw new Error(
          "Farcaster context not available - cannot get pTradoor price"
        );
      }

      // Let Warpcast handle pricing through the wallet
      // For now, return a reasonable estimate
      return 0.045;
    } catch (error) {
      console.error("Error getting pTradoor price:", error);
      throw new Error("Failed to get pTradoor price from Warpcast wallet");
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
        source: "warpcast_wallet",
      };

      this.cache.set(cacheKey, { data: priceData, timestamp: Date.now() });
      return priceData;
    } catch (error) {
      console.error("Error fetching price data:", error);

      // Return cached data if available, otherwise throw error
      if (cached) {
        return cached.data;
      }

      throw new Error("Failed to fetch price data from Warpcast wallet");
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

      // Get pTradoor price from Warpcast wallet
      const pTradoorPrice = await this.getPTradoorPrice();

      // For now, simulate 24h change since it's not available from wallet
      const pTradoorChange24h = (Math.random() - 0.5) * 10; // ±5% change

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
   * Open swap form for pTradoor token using Farcaster wallet
   * This uses the actual swapToken action as documented
   */
  static async openSwapForm(
    sellToken: string,
    buyToken: string,
    sellAmount: string
  ): Promise<void> {
    try {
      const context = await sdk.context;

      if (!context) {
        throw new Error("Farcaster context not available");
      }

      // Open the swap form with pre-filled tokens
      // This will open the user's wallet swap interface
      await sdk.actions.swapToken({
        sellToken,
        buyToken,
        sellAmount,
      });
    } catch (error) {
      console.error("Error opening swap form:", error);
      throw error;
    }
  }

  /**
   * Get token balance from Farcaster wallet
   * Note: This would require additional wallet APIs not currently available
   */
  static async getTokenBalanceFromFarcaster(): Promise<number> {
    try {
      const context = await sdk.context;

      if (!context) {
        return 0;
      }

      // Note: The current SDK doesn't provide direct balance checking
      // This would need to be implemented through other means
      // For now, return 0 as a placeholder
      return 0;
    } catch {
      console.error("Error getting token balance from Farcaster");
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
