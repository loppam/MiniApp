import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import {
  userService,
  transactionService,
  achievementService,
  leaderboardService,
  platformStatsService,
  milestoneService,
  createRealtimeListeners,
} from "~/lib/firebase-services";
import {
  UserProfile,
  Transaction,
  Achievement,
  LeaderboardEntry,
  PlatformStats,
  Milestone,
} from "~/types/firebase";

import { useSecureFirestore } from "~/lib/secure-firestore-client";

// Hook for user profile management
export const useUserProfile = (address?: string) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const secureClient = useSecureFirestore();

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

    // Initial load
    userService
      .getUserProfile(address)
      .then((userProfile) => {
        console.log("Profile loaded:", userProfile);
        setProfile(userProfile);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading profile:", err);
        setError(err.message);
        setLoading(false);
      });

    // Real-time listener
    const unsubscribe = createRealtimeListeners.onUserProfileChange(
      address,
      (userProfile) => {
        console.log("Profile updated via real-time listener:", userProfile);
        setProfile(userProfile);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [address]);

  const updateProfile = useCallback(
    async (profileData: Partial<UserProfile>) => {
      if (!address || !secureClient) return;

      try {
        const result = await secureClient.updateProfile(profileData);
        if (!result.success) {
          throw new Error(result.error || "Failed to update profile");
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update profile"
        );
      }
    },
    [address, secureClient]
  );

  const addPoints = useCallback(
    async (points: number) => {
      if (!address || !secureClient) return;

      try {
        const result = await secureClient.updateUserPoints(points);
        if (!result.success) {
          throw new Error(result.error || "Failed to add points");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add points");
      }
    },
    [address, secureClient]
  );

  return {
    profile,
    loading,
    error,
    updateProfile,
    addPoints,
  };
};

// Hook for transactions
export const useTransactions = (address?: string, limit: number = 10) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const secureClient = useSecureFirestore();

  useEffect(() => {
    if (!address) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    transactionService
      .getUserTransactions(address, limit)
      .then((userTransactions) => {
        setTransactions(userTransactions);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [address, limit]);

  const addTransaction = useCallback(
    async (transaction: Omit<Transaction, "id" | "timestamp">) => {
      if (!secureClient) {
        throw new Error("Wallet not connected");
      }

      try {
        const result = await secureClient.addTransaction(transaction);
        if (!result.success) {
          throw new Error(result.error || "Failed to add transaction");
        }
        return result.data?.transactionId;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to add transaction"
        );
        throw err;
      }
    },
    [secureClient]
  );

  return {
    transactions,
    loading,
    error,
    addTransaction,
  };
};

// Hook for leaderboard
export const useLeaderboard = (limit: number = 10) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Initial load
    leaderboardService
      .getTopUsers(limit)
      .then((topUsers) => {
        setLeaderboard(topUsers);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });

    // Real-time listener
    const unsubscribe = createRealtimeListeners.onLeaderboardChange(
      (entries) => {
        setLeaderboard(entries.slice(0, limit));
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [limit]);

  return {
    leaderboard,
    loading,
    error,
  };
};

// Hook for platform stats
export const usePlatformStats = () => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Initial load
    platformStatsService
      .getPlatformStats()
      .then((platformStats) => {
        setStats(platformStats);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });

    // Real-time listener
    const unsubscribe = createRealtimeListeners.onPlatformStatsChange(
      (platformStats) => {
        setStats(platformStats);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  return {
    stats,
    loading,
    error,
  };
};

// Hook for achievements
export const useAchievements = (address?: string) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const secureClient = useSecureFirestore();

  useEffect(() => {
    setLoading(true);
    setError(null);

    const loadAchievements = async () => {
      try {
        const [allAchievements, userAchievementIds] = await Promise.all([
          achievementService.getActiveAchievements(),
          address
            ? userService.getUserAchievements(address)
            : Promise.resolve([]),
        ]);

        setAchievements(allAchievements);
        setUserAchievements(userAchievementIds.map((ua) => ua.achievementId));
        setLoading(false);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load achievements"
        );
        setLoading(false);
      }
    };

    loadAchievements();
  }, [address]);

  const checkAchievements = useCallback(async () => {
    if (!address || !secureClient) return [];

    try {
      const result = await secureClient.checkAchievements();
      if (!result.success) {
        throw new Error(result.error || "Failed to check achievements");
      }
      return result.data?.achievements || [];
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to check achievements"
      );
      return [];
    }
  }, [address, secureClient]);

  return {
    achievements,
    userAchievements,
    loading,
    error,
    checkAchievements,
  };
};

// Hook for milestones
export const useMilestones = () => {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    milestoneService
      .getMilestones()
      .then((milestoneList) => {
        setMilestones(milestoneList);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return {
    milestones,
    loading,
    error,
  };
};

// Hook for trading actions
export const useTrading = () => {
  const { address } = useAccount();
  const secureClient = useSecureFirestore();

  const executeTrade = useCallback(
    async (
      type: "buy" | "sell",
      amount: number,
      price: number
    ) => {
      if (!address || !secureClient) throw new Error("Wallet not connected");

      try {
        const result = await secureClient.executeTrade(type, amount, price);
        if (!result.success) {
          throw new Error(result.error || "Trade execution failed");
        }
        return result.data?.transactionId;
      } catch (error) {
        console.error("Trade execution failed:", error);
        throw error;
      }
    },
    [address, secureClient]
  );

  return {
    executeTrade,
  };
};

// Hook for user authentication and context
export const useUserAuth = () => {
  const { address, isConnected } = useAccount();
  const { profile, loading } = useUserProfile(address);
  const secureClient = useSecureFirestore();

  const initializeUser = useCallback(
    async (context: Record<string, unknown>) => {
      if (!address || !isConnected || !secureClient) {
        console.log("Cannot initialize user:", { address, isConnected, hasSecureClient: !!secureClient });
        return;
      }

      try {
        console.log("Calling initializeUser with:", { address, context });
        const result = await secureClient.initializeUser({}, context);
        console.log("Initialize user result:", result);
        if (!result.success) {
          throw new Error(result.error || "Failed to initialize user");
        }
      } catch (error) {
        console.error("Failed to initialize user:", error);
      }
    },
    [address, isConnected, secureClient]
  );

  return {
    address,
    isConnected,
    profile,
    loading,
    initializeUser,
  };
};
