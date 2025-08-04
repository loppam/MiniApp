import { parseEther, encodeFunctionData, type Address } from "viem";
import { base } from "wagmi/chains";
import { PriceService } from "./price-service";

// ERC-20 Token ABI for common operations
export const ERC20_ABI = [
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
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    type: "function",
  },
] as const;

// Token configuration for Base chain
export const TOKEN_CONFIG = {
  PTRADOOR: {
    address: "0x41Ed0311640A5e489A90940b1c33433501a21B07" as Address,
    symbol: "pTRADOOR",
    decimals: 18,
    name: "pTradoor Token",
  },
  // Add more tokens as needed
  USDC: {
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address,
    symbol: "USDC",
    decimals: 6,
    name: "USD Coin",
  },
} as const;

export type TokenSymbol = keyof typeof TOKEN_CONFIG;

// Transaction types
export type TransactionType = "transfer" | "approve" | "buy" | "sell";

export interface TokenTransaction {
  type: TransactionType;
  tokenSymbol: TokenSymbol;
  amount: string; // Amount in human readable format (e.g., "100.5")
  recipient?: Address;
  spender?: Address; // For approve transactions
}

export interface TransactionResult {
  success: boolean;
  hash?: string;
  error?: string;
  type: TransactionType;
  amount: string;
  tokenSymbol: TokenSymbol;
}

// Utility functions for token transactions
export class TokenTransactionService {
  /**
   * Create a token transfer transaction
   */
  static createTransferTransaction(
    tokenSymbol: TokenSymbol,
    amount: string,
    recipient: Address
  ) {
    const tokenConfig = TOKEN_CONFIG[tokenSymbol];
    const amountInWei = parseEther(amount);

    return {
      to: tokenConfig.address,
      data: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [recipient, amountInWei],
      }),
      value: 0n, // No ETH value for token transfers
      chainId: base.id,
    };
  }

  /**
   * Create a token approval transaction
   */
  static createApproveTransaction(
    tokenSymbol: TokenSymbol,
    amount: string,
    spender: Address
  ) {
    const tokenConfig = TOKEN_CONFIG[tokenSymbol];
    const amountInWei = parseEther(amount);

    return {
      to: tokenConfig.address,
      data: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "approve",
        args: [spender, amountInWei],
      }),
      value: 0n,
      chainId: base.id,
    };
  }

  /**
   * Create a buy transaction (ETH → pTradoor)
   */
  static async createBuyTransaction(
    userAddress: string,
    usdAmount: number
  ): Promise<{ to: string; data: `0x${string}`; value?: bigint }> {
    // In production, this would be a DEX swap
    // For now, we'll simulate with a direct transfer
    const priceData = await PriceService.getPriceData();
    const ethAmount = usdAmount / priceData.ethPrice;

    return {
      to: TOKEN_CONFIG.PTRADOOR.address,
      data: "0x", // Empty data for ETH transfer
      value: BigInt(Math.floor(ethAmount * 1e18)), // Convert to wei
    };
  }

  /**
   * Create a sell transaction (pTradoor → ETH)
   */
  static async createSellTransaction(
    userAddress: string,
    usdAmount: number
  ): Promise<{ to: string; data: `0x${string}`; value?: bigint }> {
    const priceData = await PriceService.getPriceData();
    const tokenAmount = usdAmount / priceData.pTradoorPrice;
    const tokenAmountWei = BigInt(Math.floor(tokenAmount * 1e18));

    return {
      to: TOKEN_CONFIG.PTRADOOR.address,
      data: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [TOKEN_CONFIG.PTRADOOR.address, tokenAmountWei],
      }),
    };
  }

  /**
   * Get token information
   */
  static getTokenInfo(tokenSymbol: TokenSymbol) {
    return TOKEN_CONFIG[tokenSymbol];
  }

  /**
   * Format amount for display
   */
  static formatAmount(amount: string, tokenSymbol: TokenSymbol): string {
    const tokenConfig = TOKEN_CONFIG[tokenSymbol];
    const numAmount = parseFloat(amount);

    if (numAmount >= 1000) {
      return `${(numAmount / 1000).toFixed(1)}K ${tokenConfig.symbol}`;
    }

    return `${numAmount} ${tokenConfig.symbol}`;
  }

  /**
   * Validate transaction parameters
   */
  static validateTransaction(transaction: TokenTransaction): string | null {
    if (!transaction.amount || parseFloat(transaction.amount) <= 0) {
      return "Invalid amount";
    }

    if (transaction.type === "transfer" && !transaction.recipient) {
      return "Recipient address required for transfer";
    }

    if (transaction.type === "approve" && !transaction.spender) {
      return "Spender address required for approval";
    }

    if (!TOKEN_CONFIG[transaction.tokenSymbol]) {
      return "Invalid token symbol";
    }

    return null;
  }
}

// Hook for token transactions
export function useTokenTransactions() {
  const executeTransaction = async (
    transaction: TokenTransaction,
    sendTransaction: (
      data: unknown,
      options?: {
        onSuccess?: (hash: string) => void;
        onError?: (error: Error) => void;
      }
    ) => Promise<void>
  ): Promise<TransactionResult> => {
    // Validate transaction
    const validationError =
      TokenTransactionService.validateTransaction(transaction);
    if (validationError) {
      return {
        success: false,
        error: validationError,
        type: transaction.type,
        amount: transaction.amount,
        tokenSymbol: transaction.tokenSymbol,
      };
    }

    try {
      let txData: unknown;

      switch (transaction.type) {
        case "transfer":
          if (!transaction.recipient) {
            throw new Error("Recipient address required");
          }
          txData = TokenTransactionService.createTransferTransaction(
            transaction.tokenSymbol,
            transaction.amount,
            transaction.recipient
          );
          break;

        case "approve":
          if (!transaction.spender) {
            throw new Error("Spender address required");
          }
          txData = TokenTransactionService.createApproveTransaction(
            transaction.tokenSymbol,
            transaction.amount,
            transaction.spender
          );
          break;

        case "buy":
          txData = await TokenTransactionService.createBuyTransaction(
            "0x0000000000000000000000000000000000000000", // Placeholder user address
            parseFloat(transaction.amount)
          );
          break;

        case "sell":
          txData = await TokenTransactionService.createSellTransaction(
            "0x0000000000000000000000000000000000000000", // Placeholder user address
            parseFloat(transaction.amount)
          );
          break;

        default:
          throw new Error("Invalid transaction type");
      }

      // Execute transaction using wagmi
      await sendTransaction(txData, {
        onSuccess: (hash: string) => {
          console.log(`Transaction successful: ${hash}`);
        },
        onError: (error: Error) => {
          console.error(`Transaction failed: ${error.message}`);
        },
      });

      return {
        success: true,
        type: transaction.type,
        amount: transaction.amount,
        tokenSymbol: transaction.tokenSymbol,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Transaction failed",
        type: transaction.type,
        amount: transaction.amount,
        tokenSymbol: transaction.tokenSymbol,
      };
    }
  };

  return {
    executeTransaction,
    getTokenInfo: TokenTransactionService.getTokenInfo,
    formatAmount: TokenTransactionService.formatAmount,
  };
}
