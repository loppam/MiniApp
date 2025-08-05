import { useState, useEffect } from "react";
import {
  UserProfile,
  Transaction,
  Achievement,
  Milestone,
  PlatformStats,
  LeaderboardEntry,
} from "~/types/firebase";
import {
  userService,
  transactionService,
  achievementService,
  milestoneService,
} from "~/lib/firebase-services";
import { createRealtimeListeners } from "~/lib/firebase-services";

export function useUserProfile(address: string | undefined) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      console.log("No address provided, clearing profile");
      setProfile(null);
      setLoading(false);
      return;
    }

    console.log("Loading profile for address:", address);
    setLoading(true);
    setError(null);

    // Set up real-time listener for profile updates
    const unsubscribe = createRealtimeListeners.onUserProfileChange(
      address,
      (userProfile: UserProfile | null) => {
        console.log("Profile updated:", userProfile);
        setProfile(userProfile);
        setLoading(false);
      }
    );

    return () => {
      console.log("Cleaning up profile listener for address:", address);
      unsubscribe();
    };
  }, [address]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!address) return;

    try {
      await userService.upsertUserProfile(address, updates);
      console.log("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  };

  return {
    profile,
    loading,
    error,
    updateProfile,
  };
}

export function useTransactions(address: string | undefined) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    console.log("Loading transactions for address:", address);
    setLoading(true);
    setError(null);

    // Set up real-time listener for transactions
    const unsubscribe = createRealtimeListeners.onUserTransactionsChange(
      address,
      (userTransactions: Transaction[]) => {
        console.log("Transactions updated:", userTransactions);
        setTransactions(userTransactions);
        setLoading(false);
      }
    );

    return () => {
      console.log("Cleaning up transactions listener for address:", address);
      unsubscribe();
    };
  }, [address]);

  const addTransaction = async (
    transaction: Omit<Transaction, "id" | "createdAt">
  ) => {
    if (!address) return;

    try {
      await transactionService.addTransaction(transaction);
      console.log("Transaction added successfully");
    } catch (error) {
      console.error("Error adding transaction:", error);
      throw error;
    }
  };

  return {
    transactions,
    loading,
    error,
    addTransaction,
  };
}

export function useLeaderboard(limit: number = 50) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("Loading leaderboard");
    setLoading(true);
    setError(null);

    // Set up real-time listener for leaderboard updates
    const unsubscribe = createRealtimeListeners.onLeaderboardChange(
      limit,
      (leaderboardData: LeaderboardEntry[]) => {
        console.log("Leaderboard updated:", leaderboardData);
        setLeaderboard(leaderboardData);
        setLoading(false);
      }
    );

    return () => {
      console.log("Cleaning up leaderboard listener");
      unsubscribe();
    };
  }, [limit]);

  return {
    leaderboard,
    loading,
    error,
  };
}

export function usePlatformStats() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("Loading platform stats");
    setLoading(true);
    setError(null);

    // Initialize platform stats if they don't exist
    const initializeStats = async () => {
      try {
        const { platformStatsService } = await import(
          "~/lib/firebase-services"
        );
        await platformStatsService.initializePlatformStats();
      } catch (error) {
        console.error("Error initializing platform stats:", error);
      }
    };

    initializeStats();

    // Set up real-time listener for platform stats updates
    const unsubscribe = createRealtimeListeners.onPlatformStatsChange(
      (platformStats: PlatformStats | null) => {
        console.log("Platform stats updated:", platformStats);
        setStats(platformStats);
        setLoading(false);
      }
    );

    return () => {
      console.log("Cleaning up platform stats listener");
      unsubscribe();
    };
  }, []);

  return {
    stats,
    loading,
    error,
  };
}

export function useAchievements(address: string | undefined) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setAchievements([]);
      setLoading(false);
      return;
    }

    console.log("Loading user achievements for address:", address);
    setLoading(true);
    setError(null);

    // Get user's unlocked achievements
    const loadUserAchievements = async () => {
      try {
        const userAchievements = await userService.getUserAchievements(address);
        console.log("User achievements loaded:", userAchievements);

        // Get the full achievement details for unlocked achievements
        const activeAchievements =
          await achievementService.getActiveAchievements();
        const unlockedAchievementIds = userAchievements.map(
          (ua) => ua.achievementId
        );

        const unlockedAchievements = activeAchievements.filter((achievement) =>
          unlockedAchievementIds.includes(achievement.id)
        );

        setAchievements(unlockedAchievements);
        setLoading(false);
      } catch (error) {
        console.error("Error loading user achievements:", error);
        setError("Failed to load achievements");
        setLoading(false);
      }
    };

    loadUserAchievements();
  }, [address]);

  return {
    achievements,
    loading,
    error,
  };
}

export function useMilestones(address: string | undefined) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setMilestones([]);
      setLoading(false);
      return;
    }

    console.log("Loading milestones for address:", address);
    setLoading(true);
    setError(null);

    // Get all milestones (these are platform-wide, not user-specific)
    const loadMilestones = async () => {
      try {
        const allMilestones = await milestoneService.getMilestones();
        console.log("Milestones loaded:", allMilestones);
        setMilestones(allMilestones);
        setLoading(false);
      } catch (error) {
        console.error("Error loading milestones:", error);
        setError("Failed to load milestones");
        setLoading(false);
      }
    };

    loadMilestones();
  }, [address]);

  return {
    milestones,
    loading,
    error,
  };
}
