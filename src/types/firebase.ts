import { Timestamp, FieldValue } from "firebase/firestore";

export interface UserProfile {
  address: string;
  fid?: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  joinDate: Timestamp | FieldValue;
  lastActive: Timestamp | FieldValue;
  tier: "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";
  totalPoints: number;
  currentRank: number;
  totalTransactions: number;
  ptradoorBalance: number;
  ptradoorEarned: number;
  weeklyStreak: number;
  lastHoldingBonusDate?: Timestamp | FieldValue;
  referrals: number;
  achievements: string[];
  hasMinted?: boolean;
  lastProcessedBlock?: number;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  initial?: boolean;
}

export interface Transaction {
  id: string;
  userAddress: string;
  type: "buy" | "sell" | "base_transaction" | "streak_bonus";
  amount: number;
  price?: number;
  points: number;
  status: "completed" | "pending" | "failed";
  txHash?: string;
  timestamp: Timestamp | FieldValue;
  metadata?: {
    chainId?: number;
    gasUsed?: number;
    blockNumber?: number;
    contractAddress?: string;
    streak?: number;
    bonusType?: string;
    tradeType?: string;
    usdAmount?: number;
    hasMinted?: boolean;
  };
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  requirements: {
    type: "transactions" | "points" | "streak" | "balance" | "referrals";
    value: number;
    timeframe?: "daily" | "weekly" | "monthly" | "all_time";
  };
  pointsReward: number;
  isActive: boolean;
  createdAt: Timestamp | FieldValue;
}

export interface UserAchievement {
  userAddress: string;
  achievementId: string;
  unlockedAt: Timestamp | FieldValue;
  progress?: number;
}

export interface LeaderboardEntry {
  userAddress: string;
  points: number;
  rank: number;
  tier: string;
  transactions: number;
  ptradoorBalance: number;
  lastUpdated: Timestamp | FieldValue;
}

export interface PlatformStats {
  totalUsers: number;
  totalTransactions: number;
  totalPoints: number;
  ptradoorSupply: number;
  ptradoorCirculating: number;
  lastUpdated: Timestamp | FieldValue;
}

export interface Milestone {
  id: string;
  name: string;
  target: number;
  current: number;
  completed: boolean;
  type: "users" | "transactions" | "points";
  createdAt: Timestamp | FieldValue;
}

export interface TierInfo {
  name: string;
  minPoints: number;
  maxPoints: number;
  color: string;
  bgColor: string;
}
