import {
  achievementService,
  platformStatsService,
  milestoneService,
  leaderboardService,
} from "./firebase-services";
import { AchievementSystem } from "./achievement-system";
import { PlatformStats, Milestone } from "~/types/firebase";


export class DatabaseSetup {
  // Initialize all database collections with seed data
  static async initializeDatabase(): Promise<void> {
    try {
      console.log("Starting database initialization...");

      // Initialize achievements
      await this.initializeAchievements();

      // Initialize platform stats
      await this.initializePlatformStats();

      // Initialize milestones
      await this.initializeMilestones();

      // Initialize sample leaderboard entries
      await this.initializeSampleLeaderboard();

      console.log("Database initialization completed successfully!");
    } catch (error) {
      console.error("Error initializing database:", error);
      throw error;
    }
  }

  // Initialize achievements
  private static async initializeAchievements(): Promise<void> {
    try {
      console.log("Initializing achievements...");
      await AchievementSystem.initializeAchievements();
    } catch (error) {
      console.error("Error initializing achievements:", error);
    }
  }

  // Initialize platform statistics
  private static async initializePlatformStats(): Promise<void> {
    try {
      console.log("Initializing platform stats...");

      const initialStats: Partial<PlatformStats> = {
        totalUsers: 0,
        totalTransactions: 0,
        totalPoints: 0,
        ptradoorSupply: 1000000,
        ptradoorCirculating: 245000,
      };

      await platformStatsService.updatePlatformStats(initialStats);
    } catch (error) {
      console.error("Error initializing platform stats:", error);
    }
  }

  // Initialize milestones
  private static async initializeMilestones(): Promise<void> {
    try {
      console.log("Initializing milestones...");

      const milestones: Omit<Milestone, "id" | "createdAt">[] = [
        {
          name: "pTradoor Launch",
          target: 1000,
          current: 0,
          completed: false,
          type: "users",
        },
        {
          name: "50K Transactions",
          target: 50000,
          current: 0,
          completed: false,
          type: "transactions",
        },
        {
          name: "Tradoor Token",
          target: 100000,
          current: 0,
          completed: false,
          type: "points",
        },
        {
          name: "First 100 Users",
          target: 100,
          current: 0,
          completed: false,
          type: "users",
        },
        {
          name: "1M Total Points",
          target: 1000000,
          current: 0,
          completed: false,
          type: "points",
        },
      ];

      for (const milestone of milestones) {
        await milestoneService.createMilestone(milestone);
      }
    } catch (error) {
      console.error("Error initializing milestones:", error);
    }
  }

  // Initialize sample leaderboard entries
  private static async initializeSampleLeaderboard(): Promise<void> {
    try {
      console.log("Initializing sample leaderboard...");

      const sampleEntries = [
        {
          userAddress: "0x742d35Cc6634C0532925a3b8D0bE6038C38e3c",
          points: 15420,
          rank: 1,
          tier: "Gold",
          transactions: 847,
          ptradoorBalance: 12500,
        },
        {
          userAddress: "0x8ba1f109551bD432803012645Hac189451c143",
          points: 14230,
          rank: 2,
          tier: "Gold",
          transactions: 723,
          ptradoorBalance: 9800,
        },
        {
          userAddress: "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4CE",
          points: 12890,
          rank: 3,
          tier: "Silver",
          transactions: 612,
          ptradoorBalance: 8700,
        },
        {
          userAddress: "0x742d35Cc6634C0532925a3b8D0bE6038C38e34",
          points: 11560,
          rank: 4,
          tier: "Silver",
          transactions: 534,
          ptradoorBalance: 7200,
        },
        {
          userAddress: "0x8ba1f109551bD432803012645Hac189451c145",
          points: 10890,
          rank: 5,
          tier: "Silver",
          transactions: 478,
          ptradoorBalance: 6500,
        },
      ];

      for (const entry of sampleEntries) {
        await leaderboardService.updateLeaderboardEntry(
          entry.userAddress,
          entry.points,
          entry.tier
        );
      }
    } catch (error) {
      console.error("Error initializing sample leaderboard:", error);
    }
  }



  // Reset database (for development)
  static async resetDatabase(): Promise<void> {
    try {
      console.log("Resetting database...");

      // This would delete all collections and reinitialize
      // In production, this should be disabled
      if (process.env.NODE_ENV === "development") {
        await this.initializeDatabase();
      }
    } catch (error) {
      console.error("Error resetting database:", error);
    }
  }

  // Check database health
  static async checkDatabaseHealth(): Promise<{
    achievements: boolean;
    platformStats: boolean;
    milestones: boolean;
    leaderboard: boolean;
  }> {
    try {
      const [achievements, platformStats, milestones, leaderboard] =
        await Promise.all([
          achievementService
            .getActiveAchievements()
            .then(() => true)
            .catch(() => false),
          platformStatsService
            .getPlatformStats()
            .then(() => true)
            .catch(() => false),
          milestoneService
            .getMilestones()
            .then(() => true)
            .catch(() => false),
          leaderboardService
            .getTopUsers(1)
            .then(() => true)
            .catch(() => false),
        ]);

      return {
        achievements,
        platformStats,
        milestones,
        leaderboard,
      };
    } catch (error) {
      console.error("Error checking database health:", error);
      return {
        achievements: false,
        platformStats: false,
        milestones: false,
        leaderboard: false,
      };
    }
  }
}
