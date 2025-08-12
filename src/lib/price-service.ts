import { sdk } from "@farcaster/miniapp-sdk";
import { createPublicClient, http, parseAbi } from "viem";
import { base } from "wagmi/chains";

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

  // Uniswap V2 (Sushi) router on Base and addresses
  private static readonly PTRADOOR_TOKEN_ADDRESS =
    "0x41Ed0311640A5e489A90940b1c33433501a21B07" as const;
  private static readonly WETH_ADDRESS =
    "0x4200000000000000000000000000000000000006" as const;
  private static readonly UNISWAP_V2_ROUTER =
    "0x327Df1E6de05895d2ab08513aaDD9313Fe505d86" as const;

  private static readonly publicClient = createPublicClient({
    chain: base,
    transport: http("https://mainnet.base.org"),
  });

  private static readonly UNISWAP_V2_ROUTER_ABI = parseAbi([
    "function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts)",
  ]);

  // Optional Uniswap v3 Quoter configuration (set via env)
  private static readonly UNI_V3_QUOTER_ADDRESS: `0x${string}` | undefined =
    (process.env.NEXT_PUBLIC_UNI_V3_QUOTER || process.env.UNI_V3_QUOTER) as
      | `0x${string}`
      | undefined;
  private static readonly UNI_V3_QUOTER_VERSION: "v1" | "v2" | undefined =
    (process.env.NEXT_PUBLIC_UNI_V3_QUOTER_VER ||
      process.env.UNI_V3_QUOTER_VER) as "v1" | "v2" | undefined;
  private static readonly UNI_V3_FEE_TIER: 500 | 3000 | 10000 = (():
    | 500
    | 3000
    | 10000 => {
    const raw =
      process.env.NEXT_PUBLIC_PTRADOOR_FEE_TIER ||
      process.env.PTRADOOR_FEE_TIER;
    const fee = Number(raw);
    if (fee === 500 || fee === 3000 || fee === 10000)
      return fee as 500 | 3000 | 10000;
    return 3000; // default 0.3%
  })();

  // Uniswap v3 Quoter ABIs
  private static readonly UNI_V3_QUOTER_V1_ABI = parseAbi([
    "function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)",
  ]);
  private static readonly UNI_V3_QUOTER_V2_ABI = parseAbi([
    "function quoteExactInputSingle((address,address,uint256,uint24,uint160)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)",
  ]);

  private static async getPTradoorPriceV3(): Promise<number | null> {
    const quoter = this.UNI_V3_QUOTER_ADDRESS;
    if (!quoter) return null;

    try {
      const ethPrice = await this.getETHPrice();
      const amountIn = 1_000_000_000_000_000_000n; // 1 pTradoor (18 decimals)
      const tokenIn = this.PTRADOOR_TOKEN_ADDRESS as `0x${string}`;
      const tokenOut = this.WETH_ADDRESS as `0x${string}`;
      const fee = this.UNI_V3_FEE_TIER as unknown as number; // uint24
      const sqrtPriceLimit = 0n; // no limit

      const tryV1 = async (): Promise<bigint> => {
        const amountOut = (await this.publicClient.readContract({
          address: quoter,
          abi: this.UNI_V3_QUOTER_V1_ABI,
          functionName: "quoteExactInputSingle",
          args: [tokenIn, tokenOut, fee, amountIn, sqrtPriceLimit],
        })) as unknown as bigint;
        return amountOut;
      };

      const tryV2 = async (): Promise<bigint> => {
        const tupleArg = [
          tokenIn,
          tokenOut,
          amountIn,
          fee,
          sqrtPriceLimit,
        ] as const;
        const [amountOut] = (await this.publicClient.readContract({
          address: quoter,
          abi: this.UNI_V3_QUOTER_V2_ABI,
          functionName: "quoteExactInputSingle",
          args: [tupleArg],
        })) as unknown as readonly [bigint, bigint, number, bigint];
        return amountOut;
      };

      let wethOutWei: bigint | null = null;
      if (this.UNI_V3_QUOTER_VERSION === "v1") {
        wethOutWei = await tryV1();
      } else if (this.UNI_V3_QUOTER_VERSION === "v2") {
        wethOutWei = await tryV2();
      } else {
        // Try v2 then v1
        try {
          wethOutWei = await tryV2();
        } catch {
          wethOutWei = await tryV1();
        }
      }

      const wethOut = Number(wethOutWei) / 1e18;
      const priceUsd = wethOut * ethPrice;
      if (!isFinite(priceUsd) || priceUsd <= 0) return null;
      return priceUsd;
    } catch (error) {
      console.error("Uniswap v3 price quote failed:", error);
      return null;
    }
  }

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
   * Get pTradoor token price in USD using Uniswap V2 quote on Base
   * Price is computed as: (WETH received for 1 pTradoor) * ETH_USD
   */
  static async getPTradoorPrice(): Promise<number> {
    // Prefer Uniswap v3 quoter if configured
    const v3 = await this.getPTradoorPriceV3();
    if (v3 && v3 > 0) return v3;

    // Fallback to Uniswap v2 amountsOut
    try {
      const ethPrice = await this.getETHPrice();
      const oneToken = 1_000_000_000_000_000_000n; // 1e18
      const path = [
        this.PTRADOOR_TOKEN_ADDRESS as `0x${string}`,
        this.WETH_ADDRESS as `0x${string}`,
      ];
      const amounts: readonly bigint[] = (await this.publicClient.readContract({
        address: this.UNISWAP_V2_ROUTER,
        abi: this.UNISWAP_V2_ROUTER_ABI,
        functionName: "getAmountsOut",
        args: [oneToken, path],
      })) as unknown as readonly bigint[];
      if (!amounts || amounts.length < 2)
        throw new Error("Invalid amounts returned from router");
      const wethOutWei = amounts[1];
      const wethOut = Number(wethOutWei) / 1e18;
      const priceUsd = wethOut * ethPrice;
      if (!isFinite(priceUsd) || priceUsd <= 0)
        throw new Error("Unrealistic pTradoor price computed");
      return priceUsd;
    } catch (error) {
      console.error(
        "Error getting pTradoor price from Uniswap v2 fallback:",
        error
      );
      return 0.045;
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
        source: "uniswap_v2_quote",
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

      // Get pTradoor price from Uniswap quote
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
