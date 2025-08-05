import { createPublicClient, http, encodeFunctionData, parseAbi } from "viem";
import { base } from "wagmi/chains";
import { PriceService } from "./price-service";

// Contract addresses on Base
const PTRADOOR_TOKEN_ADDRESS = "0x41Ed0311640A5e489A90940b1c33433501a21B07";
const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";
const UNISWAP_V2_ROUTER = "0x327Df1E6de05895d2ab08513aaDD9313Fe505d86";

// Create public client for Base chain
const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

// Uniswap V2 Router ABI (essential functions only)
const UNISWAP_V2_ROUTER_ABI = parseAbi([
  "function swapExactETHForTokens(uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external payable returns (uint256[] memory amounts)",
  "function swapExactTokensForETH(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external returns (uint256[] memory amounts)",
  "function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts)",
  "function getAmountsIn(uint256 amountOut, address[] calldata path) external view returns (uint256[] memory amounts)",
]);

// ERC-20 ABI for token operations
const ERC20_ABI = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
]);

export interface DynamicTradeRequest {
  userAddress: string;
  type: "buy" | "sell";
  usdAmount: number;
  slippageTolerance?: number; // Default 0.5% (0.005)
}

export interface TradeTransaction {
  to: string;
  data: `0x${string}`;
  value?: bigint;
  chainId: string;
}

export interface DynamicTradeResult {
  success: boolean;
  transactions: TradeTransaction[];
  estimatedTokenAmount: number;
  estimatedUSDValue: number;
  priceImpact: number;
  slippageTolerance: number;
  error?: string;
}

export interface SwapQuote {
  inputAmount: bigint;
  outputAmount: bigint;
  priceImpact: number;
  path: readonly `0x${string}`[];
}

export class DynamicTradingService {
  private static readonly DEFAULT_SLIPPAGE = 0.005; // 0.5%
  private static readonly MAX_PRICE_IMPACT = 0.05; // 5%

  /**
   * Get current pTradoor price in USD
   */
  static async getPTradoorPrice(): Promise<number> {
    return await PriceService.getPTradoorPrice();
  }

  /**
   * Calculate token amount for given USD amount
   */
  static async calculateTokenAmount(usdAmount: number): Promise<number> {
    const price = await this.getPTradoorPrice();
    const tokenAmount = usdAmount / price;
    return Math.round(tokenAmount * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get swap quote from Uniswap V2
   */
  static async getSwapQuote(
    inputAmount: bigint,
    isExactIn: boolean,
    path: readonly `0x${string}`[]
  ): Promise<SwapQuote> {
    try {
      let outputAmount: bigint;
      let inputAmountForCalculation: bigint;

      if (isExactIn) {
        // Calculate output amount for exact input
        const amounts = await publicClient.readContract({
          address: UNISWAP_V2_ROUTER,
          abi: UNISWAP_V2_ROUTER_ABI,
          functionName: "getAmountsOut",
          args: [inputAmount, path],
        });
        outputAmount = amounts[1];
        inputAmountForCalculation = inputAmount;
      } else {
        // Calculate input amount for exact output
        const amounts = await publicClient.readContract({
          address: UNISWAP_V2_ROUTER,
          abi: UNISWAP_V2_ROUTER_ABI,
          functionName: "getAmountsIn",
          args: [inputAmount, path],
        });
        outputAmount = inputAmount;
        inputAmountForCalculation = amounts[0];
      }

      // Calculate price impact (simplified)
      const priceImpact = 0; // In production, calculate based on reserves

      return {
        inputAmount: inputAmountForCalculation,
        outputAmount,
        priceImpact,
        path,
      };
    } catch (error) {
      throw new Error(
        `Failed to get swap quote: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Create buy transaction (ETH → pTradoor) using Uniswap V2
   */
  static async createBuyTransaction(
    userAddress: string,
    usdAmount: number,
    slippageTolerance: number = this.DEFAULT_SLIPPAGE
  ): Promise<DynamicTradeResult> {
    try {
      // Calculate ETH amount needed
      const ethPrice = await PriceService.getETHPrice();
      const ethAmount = usdAmount / ethPrice;
      const ethAmountWei = BigInt(Math.floor(ethAmount * 1e18));

      // Define swap path: WETH → pTradoor
      const path = [
        WETH_ADDRESS as `0x${string}`,
        PTRADOOR_TOKEN_ADDRESS as `0x${string}`,
      ];

      // Get swap quote
      const quote = await this.getSwapQuote(ethAmountWei, true, path);

      // Calculate minimum output with slippage protection
      const minOutputAmount =
        (quote.outputAmount *
          BigInt(Math.floor((1 - slippageTolerance) * 10000))) /
        10000n;

      // Check price impact
      if (quote.priceImpact > this.MAX_PRICE_IMPACT) {
        return {
          success: false,
          transactions: [],
          estimatedTokenAmount: 0,
          estimatedUSDValue: 0,
          priceImpact: quote.priceImpact,
          slippageTolerance,
          error: `Price impact too high: ${(quote.priceImpact * 100).toFixed(
            2
          )}%`,
        };
      }

      // Create deadline (10 minutes from now)
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);

      // Encode swap transaction
      const swapData = encodeFunctionData({
        abi: UNISWAP_V2_ROUTER_ABI,
        functionName: "swapExactETHForTokens",
        args: [minOutputAmount, path, userAddress as `0x${string}`, deadline],
      });

      const transaction: TradeTransaction = {
        to: UNISWAP_V2_ROUTER,
        data: swapData,
        value: ethAmountWei,
        chainId: "eip155:8453", // Base chain
      };

      const estimatedTokenAmount = Number(quote.outputAmount) / 1e18;

      return {
        success: true,
        transactions: [transaction],
        estimatedTokenAmount,
        estimatedUSDValue: usdAmount,
        priceImpact: quote.priceImpact,
        slippageTolerance,
      };
    } catch (error) {
      return {
        success: false,
        transactions: [],
        estimatedTokenAmount: 0,
        estimatedUSDValue: 0,
        priceImpact: 0,
        slippageTolerance,
        error:
          error instanceof Error ? error.message : "Buy transaction failed",
      };
    }
  }

  /**
   * Create sell transaction (pTradoor → ETH) using Uniswap V2
   */
  static async createSellTransaction(
    userAddress: string,
    usdAmount: number,
    slippageTolerance: number = this.DEFAULT_SLIPPAGE
  ): Promise<DynamicTradeResult> {
    try {
      // Calculate token amount to sell
      const tokenAmount = await this.calculateTokenAmount(usdAmount);
      const tokenAmountWei = BigInt(Math.floor(tokenAmount * 1e18));

      // Check user balance
      const balance = await publicClient.readContract({
        address: PTRADOOR_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [userAddress as `0x${string}`],
      });

      const userBalance = Number(balance) / 1e18;
      if (userBalance < tokenAmount) {
        return {
          success: false,
          transactions: [],
          estimatedTokenAmount: 0,
          estimatedUSDValue: 0,
          priceImpact: 0,
          slippageTolerance,
          error: `Insufficient balance. You have ${userBalance.toFixed(
            2
          )} pTradoor, need ${tokenAmount.toFixed(2)}`,
        };
      }

      // Define swap path: pTradoor → WETH
      const path = [
        PTRADOOR_TOKEN_ADDRESS as `0x${string}`,
        WETH_ADDRESS as `0x${string}`,
      ];

      // Get swap quote
      const quote = await this.getSwapQuote(tokenAmountWei, true, path);

      // Calculate minimum output with slippage protection
      const minOutputAmount =
        (quote.outputAmount *
          BigInt(Math.floor((1 - slippageTolerance) * 10000))) /
        10000n;

      // Check price impact
      if (quote.priceImpact > this.MAX_PRICE_IMPACT) {
        return {
          success: false,
          transactions: [],
          estimatedTokenAmount: 0,
          estimatedUSDValue: 0,
          priceImpact: quote.priceImpact,
          slippageTolerance,
          error: `Price impact too high: ${(quote.priceImpact * 100).toFixed(
            2
          )}%`,
        };
      }

      // Create deadline (10 minutes from now)
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);

      const transactions: TradeTransaction[] = [];

      // Check allowance
      const allowance = await publicClient.readContract({
        address: PTRADOOR_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [userAddress as `0x${string}`, UNISWAP_V2_ROUTER],
      });

      // If allowance is insufficient, add approve transaction
      if ((allowance as bigint) < tokenAmountWei) {
        const approveData = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "approve",
          args: [UNISWAP_V2_ROUTER, tokenAmountWei],
        });

        transactions.push({
          to: PTRADOOR_TOKEN_ADDRESS,
          data: approveData,
          chainId: "eip155:8453",
        });
      }

      // Encode swap transaction
      const swapData = encodeFunctionData({
        abi: UNISWAP_V2_ROUTER_ABI,
        functionName: "swapExactTokensForETH",
        args: [
          tokenAmountWei,
          minOutputAmount,
          path,
          userAddress as `0x${string}`,
          deadline,
        ],
      });

      transactions.push({
        to: UNISWAP_V2_ROUTER,
        data: swapData,
        chainId: "eip155:8453",
      });

      const estimatedUSDValue =
        (Number(quote.outputAmount) / 1e18) *
        (await PriceService.getETHPrice());

      return {
        success: true,
        transactions,
        estimatedTokenAmount: tokenAmount,
        estimatedUSDValue,
        priceImpact: quote.priceImpact,
        slippageTolerance,
      };
    } catch (error) {
      return {
        success: false,
        transactions: [],
        estimatedTokenAmount: 0,
        estimatedUSDValue: 0,
        priceImpact: 0,
        slippageTolerance,
        error:
          error instanceof Error ? error.message : "Sell transaction failed",
      };
    }
  }

  /**
   * Execute a dynamic trade
   */
  static async executeDynamicTrade(
    request: DynamicTradeRequest
  ): Promise<DynamicTradeResult> {
    const {
      userAddress,
      type,
      usdAmount,
      slippageTolerance = this.DEFAULT_SLIPPAGE,
    } = request;

    if (type === "buy") {
      return await this.createBuyTransaction(
        userAddress,
        usdAmount,
        slippageTolerance
      );
    } else {
      return await this.createSellTransaction(
        userAddress,
        usdAmount,
        slippageTolerance
      );
    }
  }

  /**
   * Get user's pTradoor balance
   */
  static async getUserBalance(userAddress: string): Promise<number> {
    try {
      const balance = await publicClient.readContract({
        address: PTRADOOR_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [userAddress as `0x${string}`],
      });

      return Number(balance) / 1e18;
    } catch (error) {
      console.error("Error getting user balance:", error);
      return 0;
    }
  }

  /**
   * Get current market data
   */
  static async getMarketData(): Promise<{
    pTradoorPrice: number;
    ethPrice: number;
    marketCap?: number;
  }> {
    try {
      const marketData = await PriceService.getMarketData();

      return {
        pTradoorPrice: marketData.pTradoorPrice,
        ethPrice: marketData.ethPrice,
        marketCap: marketData.pTradoorPrice * 1000000, // Simulated market cap
      };
    } catch (error) {
      console.error("Error getting market data:", error);
      return {
        pTradoorPrice: 0.045,
        ethPrice: 3000,
        marketCap: 45000,
      };
    }
  }

  /**
   * Validate transaction parameters for Farcaster mini app
   */
  static validateTransactionForFrame(transaction: TradeTransaction): boolean {
    return (
      transaction.to.length === 42 && // Valid address length
      transaction.data.startsWith("0x") && // Valid hex data
      transaction.chainId === "eip155:8453" && // Base chain
      (transaction.value === undefined || transaction.value >= 0n) // Valid value
    );
  }
}
