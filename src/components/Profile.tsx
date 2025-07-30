import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/Button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  Trophy,
  Activity,
  Coins,
  Calendar,
  TrendingUp,
  Target,
  Award,
  Share2,
  Settings,
  ExternalLink,
} from "lucide-react";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

const mockAchievements: Achievement[] = [
  {
    id: "1",
    name: "First Trade",
    description: "Complete your first pTradoor transaction",
    icon: "🎯",
    unlockedAt: "2024-01-10T09:00:00Z",
    rarity: "common",
  },
  {
    id: "2",
    name: "Active Trader",
    description: "Complete 10 transactions in one day",
    icon: "⚡",
    unlockedAt: "2024-01-12T15:30:00Z",
    rarity: "rare",
  },
  {
    id: "3",
    name: "HODL Master",
    description: "Hold pTradoor for 30 consecutive days",
    icon: "💎",
    unlockedAt: "2024-01-14T12:00:00Z",
    rarity: "epic",
  },
];

const userStats = {
  address: "0x742d35Cc6634C0532925a3b8D0bE6038C38e3c",
  joinDate: "2024-01-10",
  totalPoints: 2750,
  currentRank: 156,
  totalTransactions: 47,
  ptradoorBalance: 5250,
  ptradoorEarned: 8900,
  weeklyStreak: 12,
  tier: "Silver",
  referrals: 3,
};

const getRarityColor = (rarity: Achievement["rarity"]) => {
  switch (rarity) {
    case "common":
      return "text-gray-400 bg-gray-400/10 border-gray-400/20";
    case "rare":
      return "text-blue-400 bg-blue-400/10 border-blue-400/20";
    case "epic":
      return "text-purple-500 bg-purple-500/10 border-purple-500/20";
    case "legendary":
      return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
  }
};

export function Profile() {
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-bold text-primary">Your Profile</h2>
        <p className="text-muted-foreground text-sm">
          Track your progress and achievements
        </p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary">
                {userStats.address.slice(2, 4).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-bold">
                  {formatAddress(userStats.address)}
                </h3>
                <Badge className="bg-gray-400/10 text-gray-400 border-gray-400/20 text-xs px-1.5 py-0">
                  {userStats.tier}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(userStats.joinDate)}
                </span>
                <span className="flex items-center gap-1">
                  <Trophy className="h-3 w-3" />#{userStats.currentRank}
                </span>
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="text-xs px-2">
                <Share2 className="h-3 w-3" />
              </Button>
              <Button variant="outline" size="sm" className="text-xs px-2">
                <Settings className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1 text-sm">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Points
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="text-sm font-bold text-green-500">
                {userStats.totalPoints.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Rank</span>
              <span className="text-sm font-bold">
                #{userStats.currentRank}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Streak</span>
              <span className="text-sm font-bold">
                {userStats.weeklyStreak}d
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1 text-sm">
              <Activity className="h-4 w-4 text-blue-500" />
              Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">
                Transactions
              </span>
              <span className="text-sm font-bold">
                {userStats.totalTransactions}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">This Week</span>
              <span className="text-sm font-bold">12</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Referrals</span>
              <span className="text-sm font-bold">{userStats.referrals}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1 text-sm">
              <Coins className="h-4 w-4 text-purple-500" />
              pTradoor Holdings
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-sm font-bold">
                {Math.round(userStats.ptradoorBalance / 1000)}K
              </div>
              <div className="text-xs text-muted-foreground">Balance</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold">
                {Math.round(userStats.ptradoorEarned / 1000)}K
              </div>
              <div className="text-xs text-muted-foreground">Earned</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-green-500">
                +{Math.floor(userStats.ptradoorBalance * 0.001)}
              </div>
              <div className="text-xs text-muted-foreground">Daily</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1 text-sm">
            <Award className="h-4 w-4 text-yellow-500" />
            Recent Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {mockAchievements.slice(0, 3).map((achievement) => (
              <div
                key={achievement.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-accent/30 border border-border"
              >
                <div className="text-lg">{achievement.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="text-sm font-medium">{achievement.name}</h4>
                    <Badge
                      className={`${getRarityColor(
                        achievement.rarity
                      )} text-xs px-1.5 py-0`}
                    >
                      {achievement.rarity}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(achievement.unlockedAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1 text-sm">
            <Target className="h-4 w-4 text-orange-500" />
            Next Goals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Reach Gold Tier</span>
              <span className="text-xs text-muted-foreground">
                {Math.round((userStats.totalPoints / 5000) * 100)}%
              </span>
            </div>
            <Progress
              value={(userStats.totalPoints / 5000) * 100}
              className="h-1.5"
            />
            <p className="text-xs text-muted-foreground">
              {5000 - userStats.totalPoints} more points needed
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">100 Transactions</span>
              <span className="text-xs text-muted-foreground">
                {Math.round((userStats.totalTransactions / 100) * 100)}%
              </span>
            </div>
            <Progress
              value={(userStats.totalTransactions / 100) * 100}
              className="h-1.5"
            />
            <p className="text-xs text-muted-foreground">
              {100 - userStats.totalTransactions} more transactions needed
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="text-center">
        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
          <ExternalLink className="h-4 w-4 mr-2" />
          View on Base Explorer
        </Button>
      </div>
    </div>
  );
}
