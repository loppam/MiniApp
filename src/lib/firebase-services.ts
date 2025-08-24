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
import { BaseChainService, PointCalculation } from "./base-chain";

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
      console.log("Upserting user profile for:", address);
      console.log("Profile data:", profileData);
      console.log("Context:", context);

      const userRef = doc(db, "users", address);
      const userDoc = await getDoc(userRef);
      const exists = userDoc.exists();
      console.log("User already exists:", exists);

      let userData: UserProfile | undefined = undefined;
      if (exists) {
        userData = userDoc.data() as UserProfile;
      }

      // If user does not have initial points, allocate them
      if (!userData || userData.initial !== true) {
        console.log("Allocating initial points for user...");
        const initialPoints = await this.allocateInitialPoints(address);
        console.log("Initial points allocated:", initialPoints);

        // Determine the profile picture URL (prefer avatarUrl over pfpUrl)
        const profilePictureUrl = context?.user?.pfpUrl || "empty";

        const newProfile = removeUndefinedValues({
          address,
          fid: context?.user?.fid,
          username: context?.user?.username,
          displayName: context?.user?.displayName,
          pfpUrl: profilePictureUrl, // Use the determined profile picture URL
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
          initial: true,
          ...profileData,
        });

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

      // If user exists and already has initial points, just update profileData
      if (exists) {
        console.log("Updating existing user...");
        const updateData = removeUndefinedValues({
          ...profileData,
          lastActive: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await updateDoc(userRef, updateData);
        console.log("User updated successfully");
      }
    } catch (error) {
      console.error("Error upserting user profile:", error);
      throw error;
    }
  },

  // Allocate initial points based on Base chain activity
  async allocateInitialPoints(address: string): Promise<PointCalculation> {
    try {
      console.log(`🎯 Starting initial points allocation for: ${address}`);

      // Check if user has already received initial points
      const userRef = doc(db, "users", address);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        console.log(`👤 User exists, initial flag: ${userData.initial}`);

        if (userData.initial === true) {
          console.log(
            `✅ User ${address} already has initial points, returning current state`
          );
          // User already has initial points, return current state
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
      } else {
        console.log(
          `🆕 User ${address} does not exist yet, will allocate initial points`
        );
      }

      // Get initial points from Base chain activity
      console.log(`🔍 Fetching Base chain data for ${address}...`);
      const initialPoints = await BaseChainService.getInitialPoints(address);

      // Log the initial points allocation
      console.log(
        `💰 Final initial points allocated for ${address}:`,
        initialPoints
      );

      // (No need to set initial: true here; handled in upsertUserProfile)

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

      const lastUpdateDelay = stats?.lastUpdated
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
