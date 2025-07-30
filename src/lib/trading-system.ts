import {
  userService,
  transactionService,
  achievementService,
} from "./firebase-services";

// pTradoor token contract address (mock for now)
const PTRADOOR_CONTRACT_ADDRESS = "0x1234567890123456789012345678901234567890";

// Point allocation constants
const POINTS_PER_TRADE = 5;
const POINTS_PER_PTRADOOR_HOLD = 0.1; // per day
const BONUS_POINTS_FOR_LARGE_TRADES = 10; // for trades > 1000 pTradoor
const STREAK_BONUS_POINTS = 50; // weekly streak bonus

export interface TradeResult {
  success: boolean;
  transactionId?: string;
  pointsEarned: number;
  newBalance: number;
  tierUpgrade?: string;
  achievementsUnlocked: string[];
  error?: string;
}

export interface TradeStats {
  totalTrades: number;
  totalVolume: number;
  averageTradeSize: number;
  pointsEarned: number;
  currentStreak: number;
}

export class TradingSystem {
  // Execute a pTradoor trade
  static async executeTrade(
    userAddress: string,
    type: "buy" | "sell",
    amount: number,
    price: number,
    txHash?: string
  ): Promise<TradeResult> {
    try {
      // Calculate points for this trade
      const pointsEarned = this.calculateTradePoints(amount, type);

      // Record the transaction
      const transactionId = await transactionService.addTransaction({
        userAddress,
        type,
        amount,
        price,
        points: pointsEarned,
        status: "completed",
        txHash,
        metadata: {
          chainId: 8453, // Base chain
          contractAddress: PTRADOOR_CONTRACT_ADDRESS,
        },
      });

      // Update user points and balance
      await userService.updateUserPoints(userAddress, pointsEarned);

      // Update pTradoor balance
      await this.updatePTradoorBalance(userAddress, amount, type);

      // Check for achievements
      const achievementsUnlocked =
        await achievementService.checkAndAwardAchievements(userAddress);

      // Check for tier upgrade
      const profile = await userService.getUserProfile(userAddress);
      const tierUpgrade = profile?.tier;

      // Update trade stats
      await this.updateTradeStats(userAddress);

      return {
        success: true,
        transactionId,
        pointsEarned,
        newBalance: profile?.ptradoorBalance || 0,
        tierUpgrade,
        achievementsUnlocked,
      };
    } catch (error) {
      console.error("Trade execution failed:", error);
      return {
        success: false,
        pointsEarned: 0,
        newBalance: 0,
        achievementsUnlocked: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Calculate points for a trade
  private static calculateTradePoints(
    amount: number,
    type: "buy" | "sell"
  ): number {
    let points = POINTS_PER_TRADE;

    // Bonus for large trades
    if (amount > 1000) {
      points += BONUS_POINTS_FOR_LARGE_TRADES;
    }

    // Additional points for buying (encouraging accumulation)
    if (type === "buy") {
      points += Math.floor(amount / 100); // 1 point per 100 pTradoor bought
    }

    return points;
  }

  // Update pTradoor balance
  private static async updatePTradoorBalance(
    userAddress: string,
    amount: number,
    type: "buy" | "sell"
  ): Promise<void> {
    try {
      const profile = await userService.getUserProfile(userAddress);
      if (!profile) return;

      let newBalance = profile.ptradoorBalance;
      let earned = profile.ptradoorEarned;

      if (type === "buy") {
        newBalance += amount;
        earned += amount;
      } else {
        newBalance = Math.max(0, newBalance - amount);
      }

      await userService.upsertUserProfile(userAddress, {
        ptradoorBalance: newBalance,
        ptradoorEarned: earned,
      });
    } catch (error) {
      console.error("Error updating pTradoor balance:", error);
    }
  }

  // Update trade statistics
  private static async updateTradeStats(userAddress: string): Promise<void> {
    try {
      const profile = await userService.getUserProfile(userAddress);
      if (!profile) return;

      // Update weekly streak
      const now = new Date();
      const lastTrade = profile.lastActive?.toDate() || new Date(0);
      const daysSinceLastTrade = Math.floor(
        (now.getTime() - lastTrade.getTime()) / (1000 * 60 * 60 * 24)
      );

      let newStreak = profile.weeklyStreak;
      if (daysSinceLastTrade <= 7) {
        newStreak += 1;
      } else {
        newStreak = 1;
      }

      // Award streak bonus if applicable
      let streakBonus = 0;
      if (newStreak % 7 === 0) {
        // Weekly milestone
        streakBonus = STREAK_BONUS_POINTS;
      }

      await userService.upsertUserProfile(userAddress, {
        weeklyStreak: newStreak,
      });

      // Award streak bonus points
      if (streakBonus > 0) {
        await userService.updateUserPoints(userAddress, streakBonus);

        // Record streak bonus transaction
        await transactionService.addTransaction({
          userAddress,
          type: "streak_bonus",
          amount: streakBonus,
          points: streakBonus,
          status: "completed",
          metadata: {
            chainId: 8453,
            streak: newStreak,
          },
        });
      }
    } catch (error) {
      console.error("Error updating trade stats:", error);
    }
  }

  // Get user trading statistics
  static async getTradeStats(userAddress: string): Promise<TradeStats> {
    try {
      const transactions = await transactionService.getUserTransactions(
        userAddress,
        100
      );
      const profile = await userService.getUserProfile(userAddress);

      const tradeTransactions = transactions.filter(
        (tx) => tx.type === "buy" || tx.type === "sell"
      );

      const totalTrades = tradeTransactions.length;
      const totalVolume = tradeTransactions.reduce(
        (sum, tx) => sum + tx.amount,
        0
      );
      const averageTradeSize = totalTrades > 0 ? totalVolume / totalTrades : 0;
      const pointsEarned = transactions.reduce((sum, tx) => sum + tx.points, 0);

      return {
        totalTrades,
        totalVolume,
        averageTradeSize,
        pointsEarned,
        currentStreak: profile?.weeklyStreak || 0,
      };
    } catch (error) {
      console.error("Error getting trade stats:", error);
      return {
        totalTrades: 0,
        totalVolume: 0,
        averageTradeSize: 0,
        pointsEarned: 0,
        currentStreak: 0,
      };
    }
  }

  // Calculate daily holding bonus
  static async calculateHoldingBonus(userAddress: string): Promise<number> {
    try {
      const profile = await userService.getUserProfile(userAddress);
      if (!profile || profile.ptradoorBalance === 0) return 0;

      // Calculate daily holding bonus (0.1 points per pTradoor per day)
      const holdingBonus = Math.floor(
        profile.ptradoorBalance * POINTS_PER_PTRADOOR_HOLD
      );

      return holdingBonus;
    } catch (error) {
      console.error("Error calculating holding bonus:", error);
      return 0;
    }
  }

  // Award daily holding bonus
  static async awardHoldingBonus(userAddress: string): Promise<void> {
    try {
      const holdingBonus = await this.calculateHoldingBonus(userAddress);

      if (holdingBonus > 0) {
        await userService.updateUserPoints(userAddress, holdingBonus);

        // Record holding bonus transaction
        await transactionService.addTransaction({
          userAddress,
          type: "base_transaction",
          amount: holdingBonus,
          points: holdingBonus,
          status: "completed",
          metadata: {
            chainId: 8453,
            bonusType: "holding",
          },
        });
      }
    } catch (error) {
      console.error("Error awarding holding bonus:", error);
    }
  }

  // Get trading recommendations
  static async getTradingRecommendations(
    userAddress: string
  ): Promise<string[]> {
    try {
      const profile = await userService.getUserProfile(userAddress);
      const stats = await this.getTradeStats(userAddress);
      const recommendations: string[] = [];

      if (!profile) return recommendations;

      // Low balance recommendation
      if (profile.ptradoorBalance < 100) {
        recommendations.push(
          "Consider buying more pTradoor to earn holding bonuses"
        );
      }

      // Streak recommendation
      if (stats.currentStreak < 7) {
        recommendations.push(
          `Trade daily to maintain your ${stats.currentStreak}-day streak`
        );
      }

      // Tier progression recommendation
      const nextTier = this.getNextTier(profile.tier);
      if (nextTier) {
        const pointsNeeded =
          this.getPointsForTier(nextTier) - profile.totalPoints;
        if (pointsNeeded > 0) {
          recommendations.push(
            `Trade ${Math.ceil(
              pointsNeeded / 5
            )} more times to reach ${nextTier} tier`
          );
        }
      }

      // Achievement recommendations
      if (profile.achievements.length < 3) {
        recommendations.push("Complete more trades to unlock achievements");
      }

      return recommendations;
    } catch (error) {
      console.error("Error getting trading recommendations:", error);
      return [];
    }
  }

  // Helper methods for tier progression
  private static getNextTier(currentTier: string): string | null {
    const tiers = ["Bronze", "Silver", "Gold", "Platinum", "Diamond"];
    const currentIndex = tiers.indexOf(currentTier);
    return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
  }

  private static getPointsForTier(tier: string): number {
    const tierPoints: Record<string, number> = {
      Bronze: 0,
      Silver: 1000,
      Gold: 5000,
      Platinum: 15000,
      Diamond: 50000,
    };
    return tierPoints[tier] || 0;
  }
}
