import { createPublicClient, http } from "viem";
import { base } from "wagmi/chains";

// Base chain RPC client
const baseClient = createPublicClient({
  chain: base,
  transport: http(),
});

export interface BaseTransaction {
  hash: string;
  blockNumber: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  timestamp: string;
}

export interface PointCalculation {
  totalTransactions: number;
  totalGasUsed: number;
  totalValue: number;
  points: number;
  breakdown: {
    transactionPoints: number;
    gasPoints: number;
    valuePoints: number;
  };
}

// Point calculation constants
const POINTS_PER_TRANSACTION = 1;
const POINTS_PER_GAS_UNIT = 0.0001;
const POINTS_PER_ETH_VALUE = 10;
const MAX_INITIAL_POINTS = 1000; // Cap for initial points

export class BaseChainService {
  // Get all transactions for a wallet address on Base
  static async getWalletTransactions(
    address: string
  ): Promise<BaseTransaction[]> {
    try {
      // Get transaction count (unused but kept for future use)
      await baseClient.getTransactionCount({
        address: address as `0x${string}`,
      });

      const transactions: BaseTransaction[] = [];

      // Get recent transactions (last 100 blocks for performance)
      const latestBlock = await baseClient.getBlockNumber();
      const fromBlock = latestBlock - 100n;

      // Get logs for the address
      const logs = await baseClient.getLogs({
        address: address as `0x${string}`,
        fromBlock,
        toBlock: latestBlock,
      });

      // Process logs to get transaction details
      for (const log of logs) {
        try {
          const tx = await baseClient.getTransaction({
            hash: log.transactionHash,
          });

          if (tx) {
            transactions.push({
              hash: tx.hash,
              blockNumber: tx.blockNumber?.toString() || "0",
              from: tx.from,
              to: tx.to || "",
              value: tx.value.toString(),
              gas: tx.gas.toString(),
              gasPrice: tx.gasPrice?.toString() || "0",
              timestamp: Date.now().toString(), // Approximate
            });
          }
        } catch (error) {
          console.warn("Failed to get transaction details:", error);
        }
      }

      return transactions;
    } catch (error) {
      console.error("Error fetching Base transactions:", error);
      return [];
    }
  }

  // Calculate initial points based on Base chain activity
  static calculateInitialPoints(
    transactions: BaseTransaction[]
  ): PointCalculation {
    const totalTransactions = transactions.length;
    let totalGasUsed = 0;
    let totalValue = 0;

    // Calculate totals
    for (const tx of transactions) {
      totalGasUsed += parseInt(tx.gas) * parseInt(tx.gasPrice);
      totalValue += parseInt(tx.value);
    }

    // Calculate points
    const transactionPoints = totalTransactions * POINTS_PER_TRANSACTION;
    const gasPoints = totalGasUsed * POINTS_PER_GAS_UNIT;
    const valuePoints = (totalValue / 1e18) * POINTS_PER_ETH_VALUE; // Convert from wei to ETH

    const totalPoints = Math.min(
      transactionPoints + gasPoints + valuePoints,
      MAX_INITIAL_POINTS
    );

    return {
      totalTransactions,
      totalGasUsed,
      totalValue,
      points: Math.floor(totalPoints),
      breakdown: {
        transactionPoints: Math.floor(transactionPoints),
        gasPoints: Math.floor(gasPoints),
        valuePoints: Math.floor(valuePoints),
      },
    };
  }

  // Get initial points for a user (called only once)
  static async getInitialPoints(address: string): Promise<PointCalculation> {
    try {
      const transactions = await this.getWalletTransactions(address);
      return this.calculateInitialPoints(transactions);
    } catch (error) {
      console.error("Error calculating initial points:", error);
      return {
        totalTransactions: 0,
        totalGasUsed: 0,
        totalValue: 0,
        points: 0,
        breakdown: {
          transactionPoints: 0,
          gasPoints: 0,
          valuePoints: 0,
        },
      };
    }
  }

  // Check if user has already received initial points
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static async hasReceivedInitialPoints(_address: string): Promise<boolean> {
    try {
      // This would check a flag in the user's profile
      // For now, we'll implement this in the user service
      return false;
    } catch (error) {
      console.error("Error checking initial points status:", error);
      return false;
    }
  }
}
