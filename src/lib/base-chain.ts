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
const POINTS_PER_TRANSACTION = 0.5;
const POINTS_PER_GAS_UNIT = 0.0001;
const POINTS_PER_ETH_VALUE = 1;
const MAX_INITIAL_POINTS = 10000; // Cap for initial points

export class BaseChainService {
  // Get all transactions for a wallet address on Base
  static async getWalletTransactions(
    address: string
  ): Promise<BaseTransaction[]> {
    try {
      const apiKey = process.env.BASESCAN_API_KEY;
      if (!apiKey) {
        throw new Error("BASESCAN_API_KEY is not set in environment");
      }
      const url = `https://api.basescan.org/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Basescan API error: ${res.status}`);
      }
      const data = await res.json();
      if (data.status !== "1" || !Array.isArray(data.result)) {
        // No transactions or error
        return [];
      }
      // Debug: log result count and a sample transaction
      console.log("Basescan API result count:", data.result.length);
      if (data.result.length > 0) {
        console.log("Sample transaction:", data.result[0]);
      }
      // Map Basescan txs to BaseTransaction
      const transactions: BaseTransaction[] = data.result.map(
        (tx: Record<string, string>) => ({
          hash: tx.hash,
          blockNumber: tx.blockNumber,
          from: tx.from,
          to: tx.to,
          value: tx.value,
          gas: tx.gas,
          gasPrice: tx.gasPrice,
          timestamp: tx.timeStamp, // Unix timestamp (seconds)
        })
      );
      return transactions;
    } catch (error) {
      console.error("Error fetching Base transactions from Basescan:", error);
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
      // Debug: log each transaction's gas, gasPrice, and value
      console.log("Parsing tx:", {
        gas: tx.gas,
        gasPrice: tx.gasPrice,
        value: tx.value,
      });
      totalGasUsed += parseInt(tx.gas) * parseInt(tx.gasPrice);
      totalValue += parseInt(tx.value);
    }
    // Debug: log totals after loop
    console.log("Total gas used:", totalGasUsed, "Total value:", totalValue);

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
