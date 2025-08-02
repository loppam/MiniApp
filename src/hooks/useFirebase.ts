import { useState, useEffect } from "react";
import { userService, transactionService } from "~/lib/firebase-services";
import { createRealtimeListeners } from "~/lib/firebase-services";
import type {
  UserProfile,
  Transaction,
  LeaderboardEntry,
  PlatformStats,
  Achievement,
  Milestone,
} from "~/types/firebase";

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

  const initializeUser = async (userData: {
    address: string;
    username?: string;
    displayName?: string;
    avatarUrl?: string;
  }) => {
    try {
      await userService.upsertUserProfile(userData.address, userData);
      console.log("User initialized successfully");
    } catch (error) {
      console.error("Error initializing user:", error);
      throw error;
    }
  };

  return {
    profile,
    loading,
    error,
    updateProfile,
    initializeUser,
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

    console.log("Loading achievements for address:", address);
    setLoading(true);
    setError(null);

    // Set up real-time listener for achievements
    const unsubscribe = createRealtimeListeners.onAchievementsChange(
      (userAchievements: Achievement[]) => {
        console.log("Achievements updated:", userAchievements);
        setAchievements(userAchievements);
        setLoading(false);
      }
    );

    return () => {
      console.log("Cleaning up achievements listener for address:", address);
      unsubscribe();
    };
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

    // Set up real-time listener for milestones
    const unsubscribe = createRealtimeListeners.onMilestonesChange(
      (userMilestones: Milestone[]) => {
        console.log("Milestones updated:", userMilestones);
        setMilestones(userMilestones);
        setLoading(false);
      }
    );

    return () => {
      console.log("Cleaning up milestones listener for address:", address);
      unsubscribe();
    };
  }, [address]);

  return {
    milestones,
    loading,
    error,
  };
}
