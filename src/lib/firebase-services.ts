import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  serverTimestamp,
  onSnapshot,
  writeBatch,
  increment,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  UserProfile,
  Transaction,
  Achievement,
  UserAchievement,
  LeaderboardEntry,
  PlatformStats,
  Milestone,
} from "~/types/firebase";
import { BaseChainService, PointCalculation } from "./base-chain";

// Types for user context
interface UserContext {
  fid?: number;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
}

interface ContextData {
  user?: UserContext;
}

// User Profile Services
export const userService = {
  // Get user profile by wallet address
  async getUserProfile(address: string): Promise<UserProfile | null> {
    try {
      const userDoc = await getDoc(doc(db, "users", address));
      return userDoc.exists() ? (userDoc.data() as UserProfile) : null;
    } catch (error) {
      console.error("Error getting user profile:", error);
      return null;
    }
  },

  // Create or update user profile
  async upsertUserProfile(
    address: string,
    profileData: Partial<UserProfile>,
    context?: ContextData
  ): Promise<void> {
    try {
      const userRef = doc(db, "users", address);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        // Update existing user
        await updateDoc(userRef, {
          ...profileData,
          lastActive: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        // Create new user with initial points allocation
        const initialPoints = await this.allocateInitialPoints(address);

        const newProfile = {
          address,
          fid: context?.user?.fid,
          username: context?.user?.username,
          displayName: context?.user?.displayName,
          avatarUrl: context?.user?.avatarUrl,
          joinDate: serverTimestamp(),
          lastActive: serverTimestamp(),
          tier: calculateTier(initialPoints.points),
          totalPoints: initialPoints.points,
          currentRank: 0,
          totalTransactions: initialPoints.totalTransactions,
          ptradoorBalance: 0,
          ptradoorEarned: 0,
          weeklyStreak: 0,
          referrals: 0,
          achievements: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          ...profileData,
        };
        await setDoc(userRef, newProfile);

        // Update leaderboard with initial points
        await leaderboardService.updateLeaderboardEntry(
          address,
          initialPoints.points,
          newProfile.tier
        );
      }
    } catch (error) {
      console.error("Error upserting user profile:", error);
      throw error;
    }
  },

  // Allocate initial points based on Base chain activity
  async allocateInitialPoints(address: string): Promise<PointCalculation> {
    try {
      // Check if user has already received initial points
      const userRef = doc(db, "users", address);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        if (userData.totalPoints > 0) {
          // User already has points, return current state
          return {
            totalTransactions: userData.totalTransactions,
            totalGasUsed: 0,
            totalValue: 0,
            points: userData.totalPoints,
            breakdown: {
              transactionPoints: userData.totalPoints,
              gasPoints: 0,
              valuePoints: 0,
            },
          };
        }
      }

      // Get initial points from Base chain activity
      const initialPoints = await BaseChainService.getInitialPoints(address);

      // Log the initial points allocation
      console.log(`Initial points allocated for ${address}:`, initialPoints);

      return initialPoints;
    } catch (error) {
      console.error("Error allocating initial points:", error);
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
  },

  // Update user points and recalculate tier
  async updateUserPoints(address: string, pointsToAdd: number): Promise<void> {
    try {
      const userRef = doc(db, "users", address);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error("User not found");
      }

      const currentData = userDoc.data() as UserProfile;
      const newTotalPoints = currentData.totalPoints + pointsToAdd;
      const newTier = calculateTier(newTotalPoints);

      await updateDoc(userRef, {
        totalPoints: newTotalPoints,
        tier: newTier,
        lastActive: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update leaderboard
      await leaderboardService.updateLeaderboardEntry(
        address,
        newTotalPoints,
        newTier
      );
    } catch (error) {
      console.error("Error updating user points:", error);
      throw error;
    }
  },

  // Get user achievements
  async getUserAchievements(address: string): Promise<UserAchievement[]> {
    try {
      const achievementsQuery = query(
        collection(db, "userAchievements"),
        where("userAddress", "==", address)
      );
      const snapshot = await getDocs(achievementsQuery);
      return snapshot.docs.map((doc) => doc.data() as UserAchievement);
    } catch (error) {
      console.error("Error getting user achievements:", error);
      return [];
    }
  },
};

// Transaction Services
export const transactionService = {
  // Add new transaction
  async addTransaction(
    transaction: Omit<Transaction, "id" | "timestamp">
  ): Promise<string> {
    try {
      const transactionData = {
        ...transaction,
        timestamp: serverTimestamp(),
      };
      const docRef = await addDoc(
        collection(db, "transactions"),
        transactionData
      );
      return docRef.id;
    } catch (error) {
      console.error("Error adding transaction:", error);
      throw error;
    }
  },

  // Get user transactions
  async getUserTransactions(
    address: string,
    maxResults: number = 10
  ): Promise<Transaction[]> {
    try {
      const transactionsQuery = query(
        collection(db, "transactions"),
        where("userAddress", "==", address),
        orderBy("timestamp", "desc"),
        limit(maxResults)
      );
      const snapshot = await getDocs(transactionsQuery);
      return snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Transaction)
      );
    } catch (error) {
      console.error("Error getting user transactions:", error);
      return [];
    }
  },

  // Get recent transactions for all users
  async getRecentTransactions(maxResults: number = 20): Promise<Transaction[]> {
    try {
      const transactionsQuery = query(
        collection(db, "transactions"),
        orderBy("timestamp", "desc"),
        limit(maxResults)
      );
      const snapshot = await getDocs(transactionsQuery);
      return snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Transaction)
      );
    } catch (error) {
      console.error("Error getting recent transactions:", error);
      return [];
    }
  },
};

// Achievement Services
export const achievementService = {
  // Get all active achievements
  async getActiveAchievements(): Promise<Achievement[]> {
    try {
      const achievementsQuery = query(
        collection(db, "achievements"),
        where("isActive", "==", true)
      );
      const snapshot = await getDocs(achievementsQuery);
      return snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Achievement)
      );
    } catch (error) {
      console.error("Error getting achievements:", error);
      return [];
    }
  },

  // Check and award achievements for a user
  async checkAndAwardAchievements(address: string): Promise<string[]> {
    try {
      const [userProfile, userAchievements, allAchievements] =
        await Promise.all([
          userService.getUserProfile(address),
          userService.getUserAchievements(address),
          this.getActiveAchievements(),
        ]);

      if (!userProfile) return [];

      const unlockedAchievements: string[] = [];
      const batch = writeBatch(db);

      for (const achievement of allAchievements) {
        const alreadyUnlocked = userAchievements.some(
          (ua) => ua.achievementId === achievement.id
        );
        if (alreadyUnlocked) continue;

        const isUnlocked = this.checkAchievementRequirements(
          userProfile,
          achievement
        );
        if (isUnlocked) {
          // Award achievement
          const userAchievementRef = doc(
            db,
            "userAchievements",
            `${address}_${achievement.id}`
          );
          batch.set(userAchievementRef, {
            userAddress: address,
            achievementId: achievement.id,
            unlockedAt: serverTimestamp(),
          });

          // Add points reward
          batch.update(doc(db, "users", address), {
            totalPoints: increment(achievement.pointsReward),
            achievements: increment(1),
          });

          unlockedAchievements.push(achievement.id);
        }
      }

      if (unlockedAchievements.length > 0) {
        await batch.commit();
      }

      return unlockedAchievements;
    } catch (error) {
      console.error("Error checking achievements:", error);
      return [];
    }
  },

  // Check if user meets achievement requirements
  checkAchievementRequirements(
    userProfile: UserProfile,
    achievement: Achievement
  ): boolean {
    const { requirements } = achievement;

    switch (requirements.type) {
      case "transactions":
        return userProfile.totalTransactions >= requirements.value;
      case "points":
        return userProfile.totalPoints >= requirements.value;
      case "streak":
        return userProfile.weeklyStreak >= requirements.value;
      case "balance":
        return userProfile.ptradoorBalance >= requirements.value;
      case "referrals":
        return userProfile.referrals >= requirements.value;
      default:
        return false;
    }
  },

  // Create new achievement (admin function)
  async createAchievement(
    achievement: Omit<Achievement, "id" | "createdAt">
  ): Promise<string> {
    try {
      const achievementData = {
        ...achievement,
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(
        collection(db, "achievements"),
        achievementData
      );
      return docRef.id;
    } catch (error) {
      console.error("Error creating achievement:", error);
      throw error;
    }
  },
};

// Leaderboard Services
export const leaderboardService = {
  // Get top users
  async getTopUsers(maxResults: number = 10): Promise<LeaderboardEntry[]> {
    try {
      const leaderboardQuery = query(
        collection(db, "leaderboard"),
        orderBy("points", "desc"),
        limit(maxResults)
      );
      const snapshot = await getDocs(leaderboardQuery);
      return snapshot.docs.map((doc) => doc.data() as LeaderboardEntry);
    } catch (error) {
      console.error("Error getting leaderboard:", error);
      return [];
    }
  },

  // Update leaderboard entry for a user
  async updateLeaderboardEntry(
    address: string,
    points: number,
    tier: string
  ): Promise<void> {
    try {
      const userProfile = await userService.getUserProfile(address);
      if (!userProfile) return;

      const leaderboardRef = doc(db, "leaderboard", address);
      await setDoc(leaderboardRef, {
        userAddress: address,
        points,
        tier,
        transactions: userProfile.totalTransactions,
        ptradoorBalance: userProfile.ptradoorBalance,
        lastUpdated: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating leaderboard entry:", error);
    }
  },

  // Recalculate all rankings
  async recalculateRankings(): Promise<void> {
    try {
      const leaderboardQuery = query(
        collection(db, "leaderboard"),
        orderBy("points", "desc")
      );
      const snapshot = await getDocs(leaderboardQuery);
      const batch = writeBatch(db);

      snapshot.docs.forEach((doc, index) => {
        const rank = index + 1;
        batch.update(doc.ref, { rank });
      });

      await batch.commit();
    } catch (error) {
      console.error("Error recalculating rankings:", error);
    }
  },
};

// Platform Stats Services
export const platformStatsService = {
  // Get platform stats
  async getPlatformStats(): Promise<PlatformStats | null> {
    try {
      const statsDoc = await getDoc(doc(db, "platformStats", "current"));
      return statsDoc.exists() ? (statsDoc.data() as PlatformStats) : null;
    } catch (error) {
      console.error("Error getting platform stats:", error);
      return null;
    }
  },

  // Update platform stats
  async updatePlatformStats(stats: Partial<PlatformStats>): Promise<void> {
    try {
      await setDoc(doc(db, "platformStats", "current"), {
        ...stats,
        lastUpdated: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating platform stats:", error);
    }
  },
};

// Milestone Services
export const milestoneService = {
  // Get all milestones
  async getMilestones(): Promise<Milestone[]> {
    try {
      const milestonesQuery = query(collection(db, "milestones"));
      const snapshot = await getDocs(milestonesQuery);
      return snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Milestone)
      );
    } catch (error) {
      console.error("Error getting milestones:", error);
      return [];
    }
  },

  // Create new milestone
  async createMilestone(
    milestone: Omit<Milestone, "id" | "createdAt">
  ): Promise<string> {
    try {
      const milestoneData = {
        ...milestone,
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, "milestones"), milestoneData);
      return docRef.id;
    } catch (error) {
      console.error("Error creating milestone:", error);
      throw error;
    }
  },
};

// Utility Functions
export const calculateTier = (points: number): UserProfile["tier"] => {
  if (points >= 50000) return "Diamond";
  if (points >= 15000) return "Platinum";
  if (points >= 5000) return "Gold";
  if (points >= 1000) return "Silver";
  return "Bronze";
};

// Real-time listeners
export const createRealtimeListeners = {
  // Listen to user profile changes
  onUserProfileChange: (
    address: string,
    callback: (profile: UserProfile | null) => void
  ) => {
    return onSnapshot(doc(db, "users", address), (doc) => {
      callback(doc.exists() ? (doc.data() as UserProfile) : null);
    });
  },

  // Listen to leaderboard changes
  onLeaderboardChange: (callback: (entries: LeaderboardEntry[]) => void) => {
    const leaderboardQuery = query(
      collection(db, "leaderboard"),
      orderBy("points", "desc"),
      limit(10)
    );
    return onSnapshot(leaderboardQuery, (snapshot) => {
      const entries = snapshot.docs.map(
        (doc) => doc.data() as LeaderboardEntry
      );
      callback(entries);
    });
  },

  // Listen to platform stats changes
  onPlatformStatsChange: (callback: (stats: PlatformStats | null) => void) => {
    return onSnapshot(doc(db, "platformStats", "current"), (doc) => {
      callback(doc.exists() ? (doc.data() as PlatformStats) : null);
    });
  },
};
