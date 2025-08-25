import { userService, achievementService } from "./firebase-services";
import { Achievement, UserProfile } from "~/types/firebase";

export interface AchievementProgress {
  achievementId: string;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  progress: number;
  target: number;
  percentage: number;
  unlocked: boolean;
  unlockedAt?: Date;
  pointsReward: number;
}

export interface AchievementNotification {
  id: string;
  type: "achievement_unlocked";
  title: string;
  description: string;
  icon: string;
  pointsReward: number;
  timestamp: Date;
}

export class AchievementSystem {
  // Predefined achievements
  private static readonly ACHIEVEMENTS: Omit<
    Achievement,
    "id" | "createdAt"
  >[] = [
    {
      name: "First Trade",
      description: "Complete your first pTradoor transaction",
      icon: "🎯",
      rarity: "common",
      requirements: {
        type: "transactions",
        value: 1,
        timeframe: "all_time",
      },
      pointsReward: 10,
      isActive: true,
    },
    {
      name: "Active Trader",
      description: "Complete 10 transactions in one day",
      icon: "⚡",
      rarity: "rare",
      requirements: {
        type: "transactions",
        value: 10,
        timeframe: "daily",
      },
      pointsReward: 50,
      isActive: true,
    },
    {
      name: "HODL Master",
      description: "Hold pTradoor for 30 consecutive days",
      icon: "💎",
      rarity: "epic",
      requirements: {
        type: "streak",
        value: 30,
        timeframe: "all_time",
      },
      pointsReward: 200,
      isActive: true,
    },
    {
      name: "High Roller",
      description: "Make a single trade worth more than 1000 pTradoor",
      icon: "💰",
      rarity: "rare",
      requirements: {
        type: "balance",
        value: 1000,
        timeframe: "all_time",
      },
      pointsReward: 100,
      isActive: true,
    },
    {
      name: "Point Collector",
      description: "Earn 1000 total points",
      icon: "🏆",
      rarity: "epic",
      requirements: {
        type: "points",
        value: 1000,
        timeframe: "all_time",
      },
      pointsReward: 150,
      isActive: true,
    },
    {
      name: "Tier Climber",
      description: "Reach Silver tier",
      icon: "🥈",
      rarity: "common",
      requirements: {
        type: "points",
        value: 1000,
        timeframe: "all_time",
      },
      pointsReward: 25,
      isActive: true,
    },
    {
      name: "Golden Trader",
      description: "Reach Gold tier",
      icon: "🥇",
      rarity: "rare",
      requirements: {
        type: "points",
        value: 5000,
        timeframe: "all_time",
      },
      pointsReward: 100,
      isActive: true,
    },
    {
      name: "Diamond Hands",
      description: "Reach Diamond tier",
      icon: "💎",
      rarity: "legendary",
      requirements: {
        type: "points",
        value: 50000,
        timeframe: "all_time",
      },
      pointsReward: 500,
      isActive: true,
    },
    {
      name: "Streak Master",
      description: "Maintain a 7-day trading streak",
      icon: "🔥",
      rarity: "rare",
      requirements: {
        type: "streak",
        value: 7,
        timeframe: "all_time",
      },
      pointsReward: 75,
      isActive: true,
    },
    {
      name: "Volume Trader",
      description: "Trade 1000 pTradoor in total volume",
      icon: "📈",
      rarity: "epic",
      requirements: {
        type: "balance",
        value: 1000,
        timeframe: "all_time",
      },
      pointsReward: 200,
      isActive: true,
    },
  ];

  // Initialize achievements in database
  static async initializeAchievements(): Promise<void> {
    try {
      for (const achievement of this.ACHIEVEMENTS) {
        await achievementService.createAchievement(achievement);
      }
      console.log("Achievements initialized successfully");
    } catch (error) {
      console.error("Error initializing achievements:", error);
    }
  }

  // Get achievement progress for a user
  static async getAchievementProgress(
    userAddress: string
  ): Promise<AchievementProgress[]> {
    try {
      const [userProfile, allAchievements, userAchievements] =
        await Promise.all([
          userService.getUserProfile(userAddress),
          achievementService.getActiveAchievements(),
          userService.getUserAchievements(userAddress),
        ]);

      if (!userProfile) return [];

      return allAchievements.map((achievement) => {
        const unlocked = userAchievements.some(
          (ua) => ua.achievementId === achievement.id
        );
        const progress = this.calculateProgress(achievement, userProfile);
        const target = achievement.requirements.value;
        const percentage = Math.min((progress / target) * 100, 100);

        return {
          achievementId: achievement.id,
          name: achievement.name,
          description: achievement.description,
          icon: achievement.icon,
          rarity: achievement.rarity,
          progress,
          target,
          percentage,
          unlocked,
          unlockedAt: unlocked
            ? (() => {
                const userAchievement = userAchievements.find(
                  (ua) => ua.achievementId === achievement.id
                );
                return userAchievement?.unlockedAt && 'toDate' in userAchievement.unlockedAt
                  ? userAchievement.unlockedAt.toDate()
                  : undefined;
              })()
            : undefined,
          pointsReward: achievement.pointsReward,
        };
      });
    } catch (error) {
      console.error("Error getting achievement progress:", error);
      return [];
    }
  }

  // Calculate progress for a specific achievement
  private static calculateProgress(
    achievement: Achievement,
    profile: UserProfile
  ): number {
    const { requirements } = achievement;

    switch (requirements.type) {
      case "transactions":
        return profile.totalTransactions;

      case "points":
        return profile.totalPoints;

      case "streak":
        return profile.weeklyStreak;

      case "balance":
        return profile.ptradoorBalance;

      case "referrals":
        return profile.referrals;

      default:
        return 0;
    }
  }

  // Check and award achievements for a user
  static async checkAndAwardAchievements(
    userAddress: string
  ): Promise<AchievementNotification[]> {
    try {
      const unlockedAchievementIds =
        await achievementService.checkAndAwardAchievements(userAddress);
      const notifications: AchievementNotification[] = [];

      if (unlockedAchievementIds.length > 0) {
        const allAchievements =
          await achievementService.getActiveAchievements();

        for (const achievementId of unlockedAchievementIds) {
          const achievement = allAchievements.find(
            (a) => a.id === achievementId
          );
          if (achievement) {
            notifications.push({
              id: achievementId,
              type: "achievement_unlocked",
              title: `Achievement Unlocked: ${achievement.name}`,
              description: achievement.description,
              icon: achievement.icon,
              pointsReward: achievement.pointsReward,
              timestamp: new Date(),
            });
          }
        }
      }

      return notifications;
    } catch (error) {
      console.error("Error checking achievements:", error);
      return [];
    }
  }

  // Get achievement statistics
  static async getAchievementStats(userAddress: string): Promise<{
    totalAchievements: number;
    unlockedAchievements: number;
    completionPercentage: number;
    totalPointsFromAchievements: number;
    rarestAchievement?: AchievementProgress;
  }> {
    try {
      const progress = await this.getAchievementProgress(userAddress);
      const unlocked = progress.filter((p) => p.unlocked);
      const totalPoints = unlocked.reduce(
        (sum, p) => sum + (p.pointsReward || 0),
        0
      );

      const rarestAchievement = unlocked.sort((a, b) => {
        const rarityOrder = { common: 1, rare: 2, epic: 3, legendary: 4 };
        return (
          (rarityOrder[b.rarity as keyof typeof rarityOrder] || 0) -
          (rarityOrder[a.rarity as keyof typeof rarityOrder] || 0)
        );
      })[0];

      return {
        totalAchievements: progress.length,
        unlockedAchievements: unlocked.length,
        completionPercentage:
          progress.length > 0 ? (unlocked.length / progress.length) * 100 : 0,
        totalPointsFromAchievements: totalPoints,
        rarestAchievement,
      };
    } catch (error) {
      console.error("Error getting achievement stats:", error);
      return {
        totalAchievements: 0,
        unlockedAchievements: 0,
        completionPercentage: 0,
        totalPointsFromAchievements: 0,
      };
    }
  }

  // Get achievements by rarity
  static async getAchievementsByRarity(
    userAddress: string
  ): Promise<Record<string, AchievementProgress[]>> {
    try {
      const progress = await this.getAchievementProgress(userAddress);

      return progress.reduce((acc, achievement) => {
        const rarity = achievement.rarity;
        if (!acc[rarity]) {
          acc[rarity] = [];
        }
        acc[rarity].push(achievement);
        return acc;
      }, {} as Record<string, AchievementProgress[]>);
    } catch (error) {
      console.error("Error getting achievements by rarity:", error);
      return {};
    }
  }

  // Get recent achievements
  static async getRecentAchievements(
    userAddress: string,
    limit: number = 5
  ): Promise<AchievementProgress[]> {
    try {
      const progress = await this.getAchievementProgress(userAddress);
      const unlocked = progress.filter((p) => p.unlocked);

      return unlocked
        .sort((a, b) => {
          if (!a.unlockedAt || !b.unlockedAt) return 0;
          return b.unlockedAt.getTime() - a.unlockedAt.getTime();
        })
        .slice(0, limit);
    } catch (error) {
      console.error("Error getting recent achievements:", error);
      return [];
    }
  }

  // Get next achievable achievements
  static async getNextAchievements(
    userAddress: string,
    limit: number = 3
  ): Promise<AchievementProgress[]> {
    try {
      const progress = await this.getAchievementProgress(userAddress);
      const locked = progress.filter((p) => !p.unlocked);

      return locked.sort((a, b) => b.percentage - a.percentage).slice(0, limit);
    } catch (error) {
      console.error("Error getting next achievements:", error);
      return [];
    }
  }

  // Create custom achievement (admin function)
  static async createCustomAchievement(
    achievement: Omit<Achievement, "id" | "createdAt">
  ): Promise<string> {
    try {
      // This would be an admin function to create custom achievements
      const achievementId = await achievementService.createAchievement(
        achievement
      );
      return achievementId;
    } catch (error) {
      console.error("Error creating custom achievement:", error);
      throw error;
    }
  }
}
