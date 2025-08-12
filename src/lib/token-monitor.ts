import { createPublicClient, http, parseAbiItem } from "viem";
import { base } from "wagmi/chains";
import { TradingSystem } from "./trading-system";
import { userService, transactionService } from "./firebase-services";
import { PriceService } from "./price-service";

// pTradoor token contract address on Base
const PTRADOOR_TOKEN_ADDRESS = "0x41Ed0311640A5e489A90940b1c33433501a21B07";

// Create public client for Base chain
const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

// Transfer event signature
const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)"
);

export interface TokenTransaction {
  hash: string;
  from: string;
  to: string;
  value: bigint;
  blockNumber: bigint;
  timestamp: number;
}

export interface MonitoringResult {
  processedTransactions: number;
  newPointsAwarded: number;
  errors: string[];
}

export class TokenMonitor {
  /**
   * Monitor token transactions for a specific address
   */
  static async monitorAddressTransactions(
    address: string,
    fromBlock?: bigint,
    toBlock?: bigint
  ): Promise<MonitoringResult> {
    const result: MonitoringResult = {
      processedTransactions: 0,
      newPointsAwarded: 0,
      errors: [],
    };

    try {
      // Get user profile to check if they exist
      const profile = await userService.getUserProfile(address);
      if (!profile) {
        result.errors.push("User profile not found");
        return result;
      }

      // Get token transfer events involving this address (incoming or outgoing)
      const logs = await publicClient.getLogs({
        address: PTRADOOR_TOKEN_ADDRESS,
        event: TRANSFER_EVENT,
        fromBlock: fromBlock || BigInt(profile.lastProcessedBlock || 0) + 1n,
        toBlock: toBlock || "latest",
      });

      console.log(`Found ${logs.length} transfer events for ${address}`);

      // Process each transaction
      for (const log of logs) {
        try {
          const transaction = await this.processTransferEvent(log, address);
          if (transaction) {
            result.processedTransactions++;

            // Determine trade type and USD amount from the transfer value
            const isIncoming =
              transaction.to.toLowerCase() === address.toLowerCase();
            const type = isIncoming ? "buy" : "sell";
            const usdAmount = await this.calculateUSDValue(transaction.value);

            const tradeResult = await TradingSystem.executeTrade({
              userAddress: address,
              type,
              usdAmount,
              txHash: transaction.hash,
            });

            if (tradeResult.success) {
              result.newPointsAwarded += tradeResult.pointsEarned;
            }
          }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : "Unknown error";
          result.errors.push(
            `Error processing transaction ${log.transactionHash}: ${errorMsg}`
          );
        }
      }

      // Update last processed block
      if (logs.length > 0) {
        const lastBlock = logs[logs.length - 1].blockNumber;
        await userService.upsertUserProfile(address, {
          lastProcessedBlock: Number(lastBlock),
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      result.errors.push(`Monitoring failed: ${errorMsg}`);
    }

    return result;
  }

  /**
   * Process a transfer event and determine if it's a valid trade
   */
  private static async processTransferEvent(
    log: {
      args: {
        from?: `0x${string}` | undefined;
        to?: `0x${string}` | undefined;
        value?: bigint | undefined;
      };
      transactionHash: `0x${string}`;
      blockNumber: bigint;
    },
    userAddress: string
  ): Promise<TokenTransaction | null> {
    try {
      const { from, to, value } = log.args;

      // Check if all required fields are present
      if (!from || !to || !value) {
        return null;
      }

      // Only process transactions involving the user
      if (from !== userAddress && to !== userAddress) {
        return null;
      }

      // Get transaction details
      const transaction = await publicClient.getTransaction({
        hash: log.transactionHash,
      });

      if (!transaction) {
        return null;
      }

      // Check if this transaction was already processed
      const existingTransaction = await transactionService.getTransactionByHash(
        log.transactionHash
      );

      if (existingTransaction) {
        console.log(`Transaction ${log.transactionHash} already processed`);
        return null;
      }

      return {
        hash: log.transactionHash,
        from: from as string,
        to: to as string,
        value: value as bigint,
        blockNumber: log.blockNumber,
        timestamp: Number(transaction.blockNumber), // Simplified timestamp
      };
    } catch (error) {
      console.error("Error processing transfer event:", error);
      return null;
    }
  }

  /**
   * Monitor all recent token transactions (for batch processing)
   */
  static async monitorRecentTransactions(
    fromBlock?: bigint,
    toBlock?: bigint
  ): Promise<MonitoringResult> {
    const result: MonitoringResult = {
      processedTransactions: 0,
      newPointsAwarded: 0,
      errors: [],
    };

    try {
      // Get all recent transfer events
      const logs = await publicClient.getLogs({
        address: PTRADOOR_TOKEN_ADDRESS,
        event: TRANSFER_EVENT,
        fromBlock: fromBlock || "latest",
        toBlock: toBlock || "latest",
      });

      console.log(`Found ${logs.length} recent transfer events`);

      // Group transactions by user address
      const userTransactions = new Map<string, typeof logs>();

      for (const log of logs) {
        const { from, to } = log.args;

        // Track both sender and receiver
        if (from && from !== "0x0000000000000000000000000000000000000000") {
          if (!userTransactions.has(from)) {
            userTransactions.set(from, []);
          }
          userTransactions.get(from)!.push(log);
        }

        if (to && to !== "0x0000000000000000000000000000000000000000") {
          if (!userTransactions.has(to)) {
            userTransactions.set(to, []);
          }
          userTransactions.get(to)!.push(log);
        }
      }

      // Process transactions for each user
      for (const [address] of userTransactions) {
        try {
          const userResult = await this.monitorAddressTransactions(
            address,
            fromBlock,
            toBlock
          );

          result.processedTransactions += userResult.processedTransactions;
          result.newPointsAwarded += userResult.newPointsAwarded;
          result.errors.push(...userResult.errors);
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : "Unknown error";
          result.errors.push(`Error processing user ${address}: ${errorMsg}`);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      result.errors.push(`Batch monitoring failed: ${errorMsg}`);
    }

    return result;
  }

  /**
   * Get current token price (simplified - in production use price oracle)
   */
  static async getTokenPrice(): Promise<number> {
    return await PriceService.getPTradoorPrice();
  }

  /**
   * Calculate USD value of token amount
   */
  static async calculateUSDValue(tokenAmount: bigint): Promise<number> {
    const price = await this.getTokenPrice();
    const amount = Number(tokenAmount) / Math.pow(10, 18); // Convert from wei
    return amount * price;
  }
}
