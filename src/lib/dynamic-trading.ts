import { createPublicClient, http, encodeFunctionData } from "viem";
import { base } from "wagmi/chains";
import { PriceService } from "./price-service";

// pTradoor token contract address on Base
const PTRADOOR_TOKEN_ADDRESS = "0x4bBFD120d9f352A0BEd7a014bd67913a2007a878";

// Create public client for Base chain
const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

// ERC-20 ABI for token operations
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [
      { name: "_owner", type: "address" },
      { name: "_spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    type: "function",
  },
] as const;

export interface DynamicTradeRequest {
  userAddress: string;
  type: "buy" | "sell";
  usdAmount: number; // Always $1
}

export interface TradeTransaction {
  to: string;
  data: `0x${string}`;
  value?: bigint;
}

export interface DynamicTradeResult {
  success: boolean;
  transactions: TradeTransaction[];
  estimatedTokenAmount: number;
  estimatedUSDValue: number;
  error?: string;
}

export class DynamicTradingService {
  /**
   * Get current pTradoor price in USD
   */
  static async getPTradoorPrice(): Promise<number> {
    return await PriceService.getPTradoorPrice();
  }

  /**
   * Calculate token amount for $1 trade
   */
  static async calculateTokenAmount(usdAmount: number): Promise<number> {
    const price = await this.getPTradoorPrice();
    const tokenAmount = usdAmount / price;
    return Math.round(tokenAmount * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Create buy transaction (ETH → pTradoor)
   */
  static async createBuyTransaction(
    userAddress: string,
    usdAmount: number
  ): Promise<DynamicTradeResult> {
    try {
      const tokenAmount = await this.calculateTokenAmount(usdAmount);
      const ethAmount = await PriceService.calculateTokenAmount(
        usdAmount,
        "ETH"
      );

      // In production, this would be a DEX swap
      // For now, we'll simulate with a direct transfer
      const transaction: TradeTransaction = {
        to: PTRADOOR_TOKEN_ADDRESS,
        data: "0x", // Empty data for ETH transfer
        value: BigInt(Math.floor(ethAmount * 1e18)), // Convert to wei
      };

      return {
        success: true,
        transactions: [transaction],
        estimatedTokenAmount: tokenAmount,
        estimatedUSDValue: usdAmount,
      };
    } catch (error) {
      return {
        success: false,
        transactions: [],
        estimatedTokenAmount: 0,
        estimatedUSDValue: 0,
        error:
          error instanceof Error ? error.message : "Buy transaction failed",
      };
    }
  }

  /**
   * Create sell transaction (pTradoor → ETH)
   */
  static async createSellTransaction(
    userAddress: string,
    usdAmount: number
  ): Promise<DynamicTradeResult> {
    try {
      const tokenAmount = await this.calculateTokenAmount(usdAmount);

      // First, check if user has enough tokens
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
          error: `Insufficient balance. You have ${userBalance.toFixed(
            2
          )} pTradoor, need ${tokenAmount.toFixed(2)}`,
        };
      }

      // Check allowance
      const allowance = await publicClient.readContract({
        address: PTRADOOR_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [userAddress as `0x${string}`, PTRADOOR_TOKEN_ADDRESS],
      });

      const tokenAmountWei = BigInt(Math.floor(tokenAmount * 1e18));

      const transactions: TradeTransaction[] = [];

      // If allowance is insufficient, add approve transaction
      if ((allowance as bigint) < tokenAmountWei) {
        const approveData = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "approve",
          args: [PTRADOOR_TOKEN_ADDRESS, tokenAmountWei],
        });

        transactions.push({
          to: PTRADOOR_TOKEN_ADDRESS,
          data: approveData,
        });
      }

      // Add transfer transaction
      const transferData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [PTRADOOR_TOKEN_ADDRESS, tokenAmountWei],
      });

      transactions.push({
        to: PTRADOOR_TOKEN_ADDRESS,
        data: transferData,
      });

      return {
        success: true,
        transactions,
        estimatedTokenAmount: tokenAmount,
        estimatedUSDValue: usdAmount,
      };
    } catch (error) {
      return {
        success: false,
        transactions: [],
        estimatedTokenAmount: 0,
        estimatedUSDValue: 0,
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
    const { userAddress, type, usdAmount } = request;

    if (type === "buy") {
      return await this.createBuyTransaction(userAddress, usdAmount);
    } else {
      return await this.createSellTransaction(userAddress, usdAmount);
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
}
