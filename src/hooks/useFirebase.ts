import { useState, useEffect, useRef } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
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
  const hasAttemptedInitRef = useRef(false);

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
      async (userProfile: UserProfile | null) => {
        console.log("Profile updated:", userProfile);

        // If profile missing, attempt one-time optimistic creation using Farcaster context
        if (!userProfile && !hasAttemptedInitRef.current) {
          try {
            hasAttemptedInitRef.current = true;
            const ctx = await sdk.context;
            await userService.upsertUserProfile(
              address,
              {},
              {
                user: {
                  fid: ctx?.user?.fid,
                  username: ctx?.user?.username,
                  displayName: ctx?.user?.displayName,
                  pfpUrl: ctx?.user?.pfpUrl,
                },
              }
            );
            // Keep loading until the next snapshot delivers the created profile
            return;
          } catch (e) {
            console.error("Optimistic profile creation failed:", e);
          }
        }

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
  const didReceiveRealtimeUpdateRef = useRef(false);

  useEffect(() => {
    console.log("🔄 usePlatformStats: Starting to load platform stats");
    setLoading(true);
    setError(null);

    // Initialize platform stats if they don't exist
    const initializeStats = async () => {
      try {
        console.log("🔄 usePlatformStats: Initializing platform stats...");
        const { platformStatsService } = await import(
          "~/lib/firebase-services"
        );
        await platformStatsService.initializePlatformStats();
        console.log(
          "🔄 usePlatformStats: Platform stats initialization completed"
        );
      } catch (error) {
        console.error(
          "🔄 usePlatformStats: Error initializing platform stats:",
          error
        );
      }
    };

    initializeStats();

    // Set up real-time listener for platform stats updates
    console.log("🔄 usePlatformStats: Setting up real-time listener...");
    const unsubscribe = createRealtimeListeners.onPlatformStatsChange(
      (platformStats: PlatformStats | null) => {
        console.log(
          "🔄 usePlatformStats: Platform stats updated:",
          platformStats
        );
        didReceiveRealtimeUpdateRef.current = true;
        setStats(platformStats);
        setLoading(false);
      }
    );

    // Add a timeout to ensure we don't stay loading forever
    const timeout = setTimeout(async () => {
      if (didReceiveRealtimeUpdateRef.current) return;
      console.log(
        "🔄 usePlatformStats: Timeout reached, trying manual fetch..."
      );
      try {
        const { platformStatsService } = await import(
          "~/lib/firebase-services"
        );
        const manualStats = await platformStatsService.getPlatformStats();
        console.log("🔄 usePlatformStats: Manual fetch result:", manualStats);
        setStats(manualStats);
        setLoading(false);
      } catch (error) {
        console.error("🔄 usePlatformStats: Manual fetch failed:", error);
        setLoading(false);
        setError("Failed to load platform stats");
      }
    }, 10000); // 10 second timeout

    return () => {
      console.log("🔄 usePlatformStats: Cleaning up platform stats listener");
      clearTimeout(timeout);
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
