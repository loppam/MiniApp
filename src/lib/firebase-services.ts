import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
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
import { PointCalculation } from "./base-chain";

// Utility function to remove undefined values from objects
function removeUndefinedValues<T extends Record<string, unknown>>(obj: T): T {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned as T;
}

// Types for user context
interface UserContext {
  fid?: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  avatarUrl?: string; // Add support for avatarUrl as well
}

interface ContextData {
  user?: UserContext;
}

// User Profile Services
export const userService = {
  // Test Firebase connection
  async testConnection(): Promise<boolean> {
    try {
      console.log("Testing Firebase connection...");
      await getDoc(doc(db, "system", "test"));
      console.log("Firebase connection successful");
      return true;
    } catch (error) {
      console.error("Firebase connection failed:", error);
      return false;
    }
  },

  // Get user profile by wallet address
  async getUserProfile(address: string): Promise<UserProfile | null> {
    try {
      console.log("Getting user profile for:", address);
      const userDoc = await getDoc(doc(db, "users", address));
      const exists = userDoc.exists();
      console.log("User profile exists:", exists);
      return exists ? (userDoc.data() as UserProfile) : null;
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
      // Strip client-controlled fields that are server-owned to avoid accidental zeroing
      const sanitizedProfileData: Partial<UserProfile> = (() => {
        const disallowed: Array<keyof UserProfile> = [
          "totalPoints",
          "totalTransactions",
          "tier",
          "initial",
          "ptradoorBalance",
          "ptradoorEarned",
          "currentRank",
          "createdAt",
          "updatedAt",
          "joinDate",
          "lastActive",
        ];
        const copy: Record<string, unknown> = { ...profileData };
        for (const k of disallowed) {
          if (k in copy) delete copy[k as string];
        }
        return copy as Partial<UserProfile>;
      })();

      const userRef = doc(db, "users", address);
      const userDoc = await getDoc(userRef);
      const exists = userDoc.exists();

      console.log("Upserting user profile for:", address);
      console.log("Profile data:", profileData);
      console.log("Context:", context);

      if (!exists) {
        // New user - allocate initial points first, then create profile
        console.log("Creating new user profile...");

        // Allocate initial points before creating profile
        const initialPoints = await this.allocateInitialPoints(address);

        const newProfile: UserProfile = {
          address,
          fid: context?.user?.fid || 0,
          username: sanitizedProfileData.username || "",
          displayName: sanitizedProfileData.displayName || "",
          pfpUrl: sanitizedProfileData.pfpUrl || "",
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
          hasMinted: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          initial: false,
          ...sanitizedProfileData,
        };

        console.log("Creating or updating profile with data:", newProfile);
        await setDoc(userRef, newProfile, { merge: true });
        console.log("User profile created/updated successfully");

        // Update platform stats atomically to avoid race conditions
        try {
          // Ensure stats doc exists
          await platformStatsService.ensurePlatformStats();
          // Atomic increments
          await updateDoc(doc(db, "platformStats", "current"), {
            totalUsers: increment(1),
            totalPoints: increment(initialPoints.points),
            lastUpdated: serverTimestamp(),
          });
          console.log(
            "Platform stats updated atomically: +1 user, +points",
            initialPoints.points
          );
        } catch (statsError) {
          console.error("Error updating platform stats:", statsError);
        }

        // Update leaderboard with initial points
        console.log("Updating leaderboard...");
        await leaderboardService.updateLeaderboardEntry(
          address,
          initialPoints.points,
          newProfile.tier
        );

        // Ensure leaderboard entry exists and is properly synced
        await leaderboardService.ensureLeaderboardEntry(address);

        console.log("Leaderboard updated successfully");

        // Recalculate all user ranks
        await this.recalculateAllRanks();
        return;
      }

      // If user exists, update profile and, if needed, allocate and persist initial points
      if (exists) {
        console.log("Updating existing user...");

        const current = userDoc.data() as UserProfile;

        // Determine if we need to backfill initial points (doc exists but not initialized properly)
        const needsInitialAllocation =
          (current.totalPoints || 0) === 0 ||
          (current.totalTransactions || 0) === 0;

        let updateData: Record<string, unknown> = removeUndefinedValues({
          ...sanitizedProfileData,
          lastActive: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        if (needsInitialAllocation) {
          console.log(
            "Existing user missing initial allocation, allocating initial points..."
          );
          const initialPoints = await this.allocateInitialPoints(address);

          // Compute delta for platform stats totalPoints
          const previousPoints = current.totalPoints || 0;
          const deltaPoints = Math.max(
            0,
            initialPoints.points - previousPoints
          );

          updateData = {
            ...updateData,
            totalPoints: initialPoints.points,
            totalTransactions: initialPoints.totalTransactions,
            tier: calculateTier(initialPoints.points),
            initial: true,
          };

          // Update platform stats totalPoints by delta (do not change totalUsers here)
          try {
            const currentStats =
              await platformStatsService.ensurePlatformStats();
            await platformStatsService.updatePlatformStats({
              totalPoints: currentStats.totalPoints + deltaPoints,
            });
            console.log(
              "Platform stats updated - totalPoints incremented by (initial backfill)",
              deltaPoints
            );
          } catch (statsError) {
            console.error(
              "Error updating platform stats (initial backfill):",
              statsError
            );
          }

          // Ensure leaderboard reflects initial points
          try {
            await leaderboardService.updateLeaderboardEntry(
              address,
              initialPoints.points,
              calculateTier(initialPoints.points)
            );
          } catch (e) {
            console.error("Error updating leaderboard on initial backfill:", e);
          }
        }

        await updateDoc(userRef, updateData as Partial<UserProfile>);
        console.log("User updated successfully");
      }
    } catch (error) {
      console.error("Error upserting user profile:", error);
      throw error;
    }
  },

  // Update only ptradoor balances (bypass sanitizer for these server-owned fields)
  async updatePtradoorBalance(
    address: string,
    updates: { ptradoorBalance: number; ptradoorEarned: number }
  ): Promise<void> {
    try {
      const userRef = doc(db, "users", address);
      await updateDoc(userRef, {
        ptradoorBalance: updates.ptradoorBalance,
        ptradoorEarned: updates.ptradoorEarned,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating ptradoor balances:", error);
      throw error;
    }
  },

  // Allocate initial points based on Base chain activity
  async allocateInitialPoints(address: string): Promise<PointCalculation> {
    try {
      console.log("🎯 Starting initial points allocation for:", address);

      // Check if user already exists and has initial points
      const userRef = doc(db, "users", address);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        if (userData.initial === true && userData.totalPoints > 0) {
          console.log("👤 User exists, initial flag: true");
          console.log(
            "✅ User",
            address,
            "already has initial points, returning current state"
          );
          return {
            totalTransactions: userData.totalTransactions || 0,
            totalGasUsed: 0, // Not stored in user profile
            totalValue: 0, // Not stored in user profile
            points: userData.totalPoints,
            breakdown: {
              transactionPoints: userData.totalPoints,
              gasPoints: 0,
              valuePoints: 0,
            },
          };
        }
      }

      console.log(
        "🆕 User",
        address,
        "does not exist yet, will allocate initial points"
      );

      // Fetch Base chain data for initial points calculation
      console.log("🔍 Fetching Base chain data for", address, "...");
      const baseChainData = await this.fetchBaseChainData(address);

      if (!baseChainData) {
        console.log("⚠️ No Base chain data found, using default points");
        return {
          totalTransactions: 0,
          totalGasUsed: 0,
          totalValue: 0,
          points: 10, // Default points for new users
          breakdown: {
            transactionPoints: 10,
            gasPoints: 0,
            valuePoints: 0,
          },
        };
      }

      // Calculate initial points based on Base chain activity
      const initialPoints = this.calculateInitialPoints(baseChainData);

      console.log(
        "💰 Final initial points allocated for",
        address + ":",
        initialPoints
      );
      return initialPoints;
    } catch (error) {
      console.error("Error allocating initial points:", error);
      // Return default points on error
      return {
        totalTransactions: 0,
        totalGasUsed: 0,
        totalValue: 0,
        points: 10,
        breakdown: {
          transactionPoints: 10,
          gasPoints: 0,
          valuePoints: 0,
        },
      };
    }
  },

  // Fetch Base chain data for a user address
  async fetchBaseChainData(address: string): Promise<PointCalculation | null> {
    try {
      // Import the BaseChainService dynamically to avoid circular dependencies
      const { BaseChainService } = await import("~/lib/base-chain");
      return await BaseChainService.getInitialPoints(address);
    } catch (error) {
      console.error("Error fetching Base chain data:", error);
      return null;
    }
  },

  // Calculate initial points based on Base chain data
  calculateInitialPoints(baseChainData: PointCalculation): PointCalculation {
    // The BaseChainService already returns a complete PointCalculation.
    // Avoid re-calculating differently here to prevent mismatches.
    return baseChainData;
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

      // Update platform stats to increment totalPoints
      try {
        const currentStats = await platformStatsService.ensurePlatformStats();
        await platformStatsService.updatePlatformStats({
          totalPoints: currentStats.totalPoints + pointsToAdd,
        });
        console.log(
          "Platform stats updated - totalPoints incremented by",
          pointsToAdd
        );
      } catch (statsError) {
        console.error("Error updating platform stats:", statsError);
      }

      // Update leaderboard
      await leaderboardService.updateLeaderboardEntry(
        address,
        newTotalPoints,
        newTier
      );

      // Recalculate all user ranks
      await this.recalculateAllRanks();
    } catch (error) {
      console.error("Error updating user points:", error);
      throw error;
    }
  },

  // Calculate and update user rank
  async updateUserRank(address: string): Promise<void> {
    try {
      // Get all users ordered by points (descending)
      const usersQuery = query(
        collection(db, "users"),
        orderBy("totalPoints", "desc")
      );
      const snapshot = await getDocs(usersQuery);

      // Find the user's position
      let userRank = 0;
      snapshot.docs.forEach((doc, index) => {
        if (doc.id === address) {
          userRank = index + 1;
        }
      });

      // Update the user's rank
      if (userRank > 0) {
        const userRef = doc(db, "users", address);
        await updateDoc(userRef, {
          currentRank: userRank,
          updatedAt: serverTimestamp(),
        });
        console.log(`Updated rank for ${address}: ${userRank}`);
      }
    } catch (error) {
      console.error("Error updating user rank:", error);
    }
  },

  // Recalculate all user ranks
  async recalculateAllRanks(): Promise<void> {
    try {
      console.log("Recalculating all user ranks...");

      // Get all users ordered by points (descending)
      const usersQuery = query(
        collection(db, "users"),
        orderBy("totalPoints", "desc")
      );
      const snapshot = await getDocs(usersQuery);

      // Update each user's rank
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc, index) => {
        const rank = index + 1;
        batch.update(doc.ref, {
          currentRank: rank,
          updatedAt: serverTimestamp(),
        });
      });

      await batch.commit();
      console.log(`Updated ranks for ${snapshot.docs.length} users`);
    } catch (error) {
      console.error("Error recalculating all ranks:", error);
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

  // Get all users with pTradoor balances
  async getAllUsersWithBalances(): Promise<UserProfile[]> {
    try {
      const usersQuery = query(
        collection(db, "users"),
        where("ptradoorBalance", ">", 0)
      );
      const snapshot = await getDocs(usersQuery);
      return snapshot.docs.map((doc) => doc.data() as UserProfile);
    } catch (error) {
      console.error("Error getting users with balances:", error);
      return [];
    }
  },

  // Fix users with incorrect initial data (admin function)
  async fixUsersWithIncorrectInitialData(): Promise<{
    fixedUsers: number;
    errors: string[];
  }> {
    try {
      console.log("🔧 Fixing users with incorrect initial data...");

      const usersQuery = query(collection(db, "users"));
      const usersSnapshot = await getDocs(usersQuery);

      let fixedUsers = 0;
      const errors: string[] = [];

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data() as UserProfile;

        // Check if user has initial flag but incorrect data
        if (
          userData.initial === true &&
          (userData.totalPoints === 0 || userData.totalTransactions === 0)
        ) {
          try {
            console.log(
              `🔧 Fixing user ${userData.address} with incorrect initial data`
            );

            // Re-allocate initial points
            const initialPoints = await this.allocateInitialPoints(
              userData.address
            );

            // Update user profile with correct data
            await updateDoc(userDoc.ref, {
              totalPoints: initialPoints.points,
              totalTransactions: initialPoints.totalTransactions,
              tier: calculateTier(initialPoints.points),
              updatedAt: serverTimestamp(),
            });

            // Update leaderboard entry
            await leaderboardService.updateLeaderboardEntry(
              userData.address,
              initialPoints.points,
              calculateTier(initialPoints.points)
            );

            fixedUsers++;
            console.log(
              `✅ Fixed user ${userData.address}: ${initialPoints.points} points, ${initialPoints.totalTransactions} transactions`
            );
          } catch (userError) {
            const errorMsg = `Failed to fix user ${userData.address}: ${
              userError instanceof Error ? userError.message : "Unknown error"
            }`;
            console.error(errorMsg);
            errors.push(errorMsg);
          }
        }
      }

      if (fixedUsers > 0) {
        // Recalculate all rankings after fixing users
        await leaderboardService.recalculateRankings();
        console.log("🔄 Recalculated rankings after fixing users");
      }

      console.log(`✅ Fixed ${fixedUsers} users with incorrect initial data`);
      return { fixedUsers, errors };
    } catch (error) {
      console.error("Error fixing users with incorrect initial data:", error);
      throw error;
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

      // Update platform stats to increment totalTransactions
      try {
        const currentStats = await platformStatsService.ensurePlatformStats();
        await platformStatsService.updatePlatformStats({
          totalTransactions: currentStats.totalTransactions + 1,
        });
        console.log("Platform stats updated - totalTransactions incremented");
      } catch (statsError) {
        console.error("Error updating platform stats:", statsError);
      }

      // Increment user's totalTransactions and activity timestamps
      try {
        await updateDoc(doc(db, "users", transaction.userAddress), {
          totalTransactions: increment(1),
          lastActive: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        console.log(
          `Incremented totalTransactions for ${transaction.userAddress}`
        );
      } catch (userTxErr) {
        console.error(
          "Error incrementing user's totalTransactions:",
          userTxErr
        );
      }

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

  // Get transaction by hash
  async getTransactionByHash(txHash: string): Promise<Transaction | null> {
    try {
      const transactionsQuery = query(
        collection(db, "transactions"),
        where("txHash", "==", txHash)
      );
      const snapshot = await getDocs(transactionsQuery);

      if (snapshot.empty) {
        return null;
      }

      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data(),
      } as Transaction;
    } catch (error) {
      console.error("Error getting transaction by hash:", error);
      return null;
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

  // Update achievement (admin function)
  async updateAchievement(
    achievementId: string,
    updates: Partial<Achievement>
  ): Promise<void> {
    try {
      const achievementRef = doc(db, "achievements", achievementId);
      await updateDoc(achievementRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating achievement:", error);
      throw error;
    }
  },

  // Delete achievement (admin function)
  async deleteAchievement(achievementId: string): Promise<void> {
    try {
      const achievementRef = doc(db, "achievements", achievementId);
      await deleteDoc(achievementRef);
    } catch (error) {
      console.error("Error deleting achievement:", error);
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
      if (!userProfile) {
        console.warn(`User profile not found for address: ${address}`);
        return;
      }

      const leaderboardRef = doc(db, "leaderboard", address);
      await setDoc(leaderboardRef, {
        userAddress: address,
        points,
        rank: 0, // Will be calculated in recalculateRankings
        tier,
        transactions: userProfile.totalTransactions || 0,
        ptradoorBalance: userProfile.ptradoorBalance || 0,
        lastUpdated: serverTimestamp(),
      });

      console.log(
        `Leaderboard entry updated for ${address}: ${points} points, ${tier} tier`
      );

      // Recalculate all rankings after updating the entry
      await this.recalculateRankings();
    } catch (error) {
      console.error("Error updating leaderboard entry:", error);
    }
  },

  // Ensure leaderboard entry exists for a user
  async ensureLeaderboardEntry(address: string): Promise<void> {
    try {
      const userProfile = await userService.getUserProfile(address);
      if (!userProfile) {
        console.warn(`User profile not found for address: ${address}`);
        return;
      }

      const leaderboardRef = doc(db, "leaderboard", address);
      const leaderboardDoc = await getDoc(leaderboardRef);

      if (!leaderboardDoc.exists()) {
        // Create new leaderboard entry
        console.log(`Creating new leaderboard entry for ${address}`);
        await this.updateLeaderboardEntry(
          address,
          userProfile.totalPoints || 0,
          userProfile.tier || "Bronze"
        );
      } else {
        // Update existing entry with current user data
        const currentEntry = leaderboardDoc.data() as LeaderboardEntry;
        if (
          currentEntry.points !== userProfile.totalPoints ||
          currentEntry.tier !== userProfile.tier
        ) {
          console.log(
            `Updating leaderboard entry for ${address} - points: ${currentEntry.points} → ${userProfile.totalPoints}, tier: ${currentEntry.tier} → ${userProfile.tier}`
          );
          await this.updateLeaderboardEntry(
            address,
            userProfile.totalPoints || 0,
            userProfile.tier || "Bronze"
          );
        }
      }
    } catch (error) {
      console.error("Error ensuring leaderboard entry:", error);
    }
  },

  // Sync all users to leaderboard (admin function)
  async syncAllUsersToLeaderboard(): Promise<void> {
    try {
      console.log("🔄 Syncing all users to leaderboard...");

      // Get all users
      const usersQuery = query(collection(db, "users"));
      const usersSnapshot = await getDocs(usersQuery);

      console.log(`Found ${usersSnapshot.size} users to sync`);

      // Ensure leaderboard entries for all users
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data() as UserProfile;
        await this.ensureLeaderboardEntry(userData.address);
      }

      // Recalculate all rankings
      await this.recalculateRankings();

      console.log("✅ All users synced to leaderboard successfully");
    } catch (error) {
      console.error("Error syncing users to leaderboard:", error);
      throw error;
    }
  },

  // Diagnostic function to identify data mismatches
  async diagnoseLeaderboardIssues(): Promise<{
    totalUsers: number;
    totalLeaderboardEntries: number;
    mismatchedUsers: Array<{
      address: string;
      userPoints: number;
      leaderboardPoints: number;
      userTier: string;
      leaderboardTier: string;
    }>;
    missingEntries: string[];
  }> {
    try {
      console.log("🔍 Diagnosing leaderboard issues...");

      // Get all users
      const usersQuery = query(collection(db, "users"));
      const usersSnapshot = await getDocs(usersQuery);

      // Get all leaderboard entries
      const leaderboardQuery = query(collection(db, "leaderboard"));
      const leaderboardSnapshot = await getDocs(leaderboardQuery);

      const mismatchedUsers: Array<{
        address: string;
        userPoints: number;
        leaderboardPoints: number;
        userTier: string;
        leaderboardTier: string;
      }> = [];

      const missingEntries: string[] = [];

      // Check each user
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data() as UserProfile;
        const leaderboardDoc = leaderboardSnapshot.docs.find(
          (doc) => doc.id === userData.address
        );

        if (!leaderboardDoc) {
          missingEntries.push(userData.address);
          continue;
        }

        const leaderboardData = leaderboardDoc.data() as LeaderboardEntry;

        if (
          userData.totalPoints !== leaderboardData.points ||
          userData.tier !== leaderboardData.tier
        ) {
          mismatchedUsers.push({
            address: userData.address,
            userPoints: userData.totalPoints || 0,
            leaderboardPoints: leaderboardData.points || 0,
            userTier: userData.tier || "Bronze",
            leaderboardTier: leaderboardData.tier || "Bronze",
          });
        }
      }

      const result = {
        totalUsers: usersSnapshot.size,
        totalLeaderboardEntries: leaderboardSnapshot.size,
        mismatchedUsers,
        missingEntries,
      };

      console.log("🔍 Leaderboard diagnosis complete:", result);
      return result;
    } catch (error) {
      console.error("Error diagnosing leaderboard issues:", error);
      throw error;
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
      console.log("🔍 Getting platform stats...");
      const statsDoc = await getDoc(doc(db, "platformStats", "current"));
      const exists = statsDoc.exists();
      console.log("Platform stats document exists:", exists);

      if (exists) {
        const data = statsDoc.data() as PlatformStats;
        console.log("Platform stats data:", data);
        return data;
      } else {
        console.log("Platform stats document does not exist");
        return null;
      }
    } catch (error) {
      console.error("Error getting platform stats:", error);
      return null;
    }
  },

  // Initialize platform stats if they don't exist
  async initializePlatformStats(): Promise<void> {
    try {
      console.log("🔧 Initializing platform stats...");
      const statsDoc = await getDoc(doc(db, "platformStats", "current"));
      const exists = statsDoc.exists();
      console.log(
        "Platform stats document exists before initialization:",
        exists
      );

      if (!exists) {
        console.log("Creating platform stats document...");
        await setDoc(doc(db, "platformStats", "current"), {
          totalUsers: 0,
          totalTransactions: 0,
          totalPoints: 0,
          ptradoorSupply: 1000000,
          ptradoorCirculating: 245000,
          lastUpdated: serverTimestamp(),
        });
        console.log("Platform stats initialized successfully");
      } else {
        console.log("Platform stats already exist, skipping initialization");
      }
    } catch (error) {
      console.error("Error initializing platform stats:", error);
    }
  },

  // Ensure platform stats exist and return them
  async ensurePlatformStats(): Promise<PlatformStats> {
    try {
      console.log("🔧 Ensuring platform stats exist...");
      let stats = await this.getPlatformStats();

      if (!stats) {
        console.log("Platform stats don't exist, creating them...");
        await this.initializePlatformStats();
        stats = await this.getPlatformStats();

        if (!stats) {
          throw new Error("Failed to create platform stats");
        }
      }

      return stats;
    } catch (error) {
      console.error("Error ensuring platform stats:", error);
      throw error;
    }
  },

  // Update platform stats
  async updatePlatformStats(stats: Partial<PlatformStats>): Promise<void> {
    try {
      console.log("📊 Updating platform stats:", stats);

      // Validate data before updating
      if (stats.totalUsers !== undefined && stats.totalUsers < 0) {
        throw new Error("Total users cannot be negative");
      }
      if (
        stats.totalTransactions !== undefined &&
        stats.totalTransactions < 0
      ) {
        throw new Error("Total transactions cannot be negative");
      }
      if (stats.totalPoints !== undefined && stats.totalPoints < 0) {
        throw new Error("Total points cannot be negative");
      }
      if (stats.ptradoorSupply !== undefined && stats.ptradoorSupply < 0) {
        throw new Error("pTradoor supply cannot be negative");
      }
      if (
        stats.ptradoorCirculating !== undefined &&
        stats.ptradoorCirculating < 0
      ) {
        throw new Error("pTradoor circulating cannot be negative");
      }
      if (
        stats.ptradoorCirculating !== undefined &&
        stats.ptradoorSupply !== undefined &&
        stats.ptradoorCirculating > stats.ptradoorSupply
      ) {
        throw new Error("Circulating supply cannot exceed total supply");
      }

      const current = await this.ensurePlatformStats();
      const safeStats: Partial<PlatformStats> = { ...current };

      if (typeof stats.totalUsers === "number")
        safeStats.totalUsers = stats.totalUsers;
      if (typeof stats.totalTransactions === "number")
        safeStats.totalTransactions = stats.totalTransactions;
      if (typeof stats.totalPoints === "number" && isFinite(stats.totalPoints))
        safeStats.totalPoints = stats.totalPoints;
      if (typeof stats.ptradoorSupply === "number")
        safeStats.ptradoorSupply = stats.ptradoorSupply;
      if (typeof stats.ptradoorCirculating === "number")
        safeStats.ptradoorCirculating = stats.ptradoorCirculating;

      await setDoc(
        doc(db, "platformStats", "current"),
        {
          ...safeStats,
          lastUpdated: serverTimestamp(),
        },
        { merge: true }
      );
      console.log("Platform stats updated successfully");
    } catch (error) {
      console.error("Error updating platform stats:", error);
      throw error; // Re-throw to let caller handle it
    }
  },

  // Recalculate platform stats from existing user data
  async recalculatePlatformStats(): Promise<void> {
    try {
      console.log("🔄 Recalculating platform stats from user data...");

      // Get all users
      const usersQuery = query(collection(db, "users"));
      const usersSnapshot = await getDocs(usersQuery);

      // Get all transactions
      const transactionsQuery = query(collection(db, "transactions"));
      const transactionsSnapshot = await getDocs(transactionsQuery);

      // Calculate totals
      const totalUsers = usersSnapshot.size;
      const totalTransactions = transactionsSnapshot.size;
      const totalPoints = usersSnapshot.docs.reduce((sum, doc) => {
        const userData = doc.data() as UserProfile;
        return sum + (userData.totalPoints || 0);
      }, 0);

      console.log("Calculated stats:", {
        totalUsers,
        totalTransactions,
        totalPoints,
      });

      // Update platform stats
      await this.updatePlatformStats({
        totalUsers,
        totalTransactions,
        totalPoints,
        ptradoorSupply: 1000000,
        ptradoorCirculating: 245000,
      });

      console.log("Platform stats recalculated successfully");
    } catch (error) {
      console.error("Error recalculating platform stats:", error);
    }
  },

  // Get performance metrics for monitoring
  async getPerformanceMetrics(): Promise<{
    responseTime: number;
    lastUpdateDelay: number;
    dataFreshness: number;
    dataSize: number;
  }> {
    try {
      const start = Date.now();
      const stats = await this.getPlatformStats();
      const responseTime = Date.now() - start;

      const lastUpdateDelay =
        stats?.lastUpdated && "toMillis" in stats.lastUpdated
          ? Date.now() - stats.lastUpdated.toMillis()
          : Infinity;

      const dataFreshness = Math.max(0, 300000 - lastUpdateDelay); // 5 min threshold

      // Calculate data size (rough estimate)
      const dataSize = stats ? JSON.stringify(stats).length : 0;

      return {
        responseTime,
        lastUpdateDelay,
        dataFreshness,
        dataSize,
      };
    } catch (error) {
      console.error("Error getting performance metrics:", error);
      return {
        responseTime: -1,
        lastUpdateDelay: -1,
        dataFreshness: -1,
        dataSize: -1,
      };
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

  // Update milestone (admin function)
  async updateMilestone(
    milestoneId: string,
    updates: Partial<Milestone>
  ): Promise<void> {
    try {
      const milestoneRef = doc(db, "milestones", milestoneId);
      await updateDoc(milestoneRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating milestone:", error);
      throw error;
    }
  },

  // Delete milestone (admin function)
  async deleteMilestone(milestoneId: string): Promise<void> {
    try {
      const milestoneRef = doc(db, "milestones", milestoneId);
      await deleteDoc(milestoneRef);
    } catch (error) {
      console.error("Error deleting milestone:", error);
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

  // Listen to user transactions changes
  onUserTransactionsChange: (
    address: string,
    callback: (transactions: Transaction[]) => void
  ) => {
    const transactionsQuery = query(
      collection(db, "transactions"),
      where("userAddress", "==", address), // Fixed: use userAddress instead of address
      orderBy("timestamp", "desc"),
      limit(10)
    );
    return onSnapshot(transactionsQuery, (snapshot) => {
      const transactions = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Transaction)
      );
      callback(transactions);
    });
  },

  // Listen to leaderboard changes
  onLeaderboardChange: (
    limitCount: number = 50,
    callback: (entries: LeaderboardEntry[]) => void
  ) => {
    const leaderboardQuery = query(
      collection(db, "leaderboard"),
      orderBy("points", "desc"),
      limit(limitCount)
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
    console.log("🔔 Setting up platform stats real-time listener...");
    return onSnapshot(doc(db, "platformStats", "current"), (doc) => {
      const exists = doc.exists();
      console.log("Platform stats real-time update - document exists:", exists);

      if (exists) {
        const data = doc.data() as PlatformStats;
        console.log("Platform stats real-time data:", data);
        callback(data);
      } else {
        console.log(
          "Platform stats real-time update - document does not exist"
        );
        callback(null);
      }
    });
  },

  // Listen to achievements changes
  onAchievementsChange: (callback: (achievements: Achievement[]) => void) => {
    const achievementsQuery = query(
      collection(db, "achievements"),
      where("active", "==", true),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(achievementsQuery, (snapshot) => {
      const achievements = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Achievement)
      );
      callback(achievements);
    });
  },

  // Listen to milestones changes
  onMilestonesChange: (callback: (milestones: Milestone[]) => void) => {
    const milestonesQuery = query(
      collection(db, "milestones"),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(milestonesQuery, (snapshot) => {
      const milestones = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Milestone)
      );
      callback(milestones);
    });
  },
};
