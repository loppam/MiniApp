import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import {
  Coins,
  TrendingUp,
  Zap,
  ArrowUpRight,
  Clock,
  CheckCircle,
} from "lucide-react";

interface Transaction {
  id: string;
  type: "buy" | "sell";
  amount: number;
  price: number;
  timestamp: string;
  points: number;
  status: "completed" | "pending";
}

const mockTransactions: Transaction[] = [
  {
    id: "1",
    type: "buy",
    amount: 1000,
    price: 0.045,
    timestamp: "2024-01-15T10:30:00Z",
    points: 5,
    status: "completed",
  },
  {
    id: "2",
    type: "sell",
    amount: 500,
    price: 0.047,
    timestamp: "2024-01-15T14:20:00Z",
    points: 5,
    status: "completed",
  },
  {
    id: "3",
    type: "buy",
    amount: 2000,
    price: 0.044,
    timestamp: "2024-01-15T16:45:00Z",
    points: 5,
    status: "pending",
  },
];

const rankTiers = [
  {
    name: "Bronze",
    minPoints: 0,
    maxPoints: 1000,
    color: "text-amber-600",
    bgColor: "bg-amber-600/10",
  },
  {
    name: "Silver",
    minPoints: 1000,
    maxPoints: 5000,
    color: "text-gray-400",
    bgColor: "bg-gray-400/10",
  },
  {
    name: "Gold",
    minPoints: 5000,
    maxPoints: 15000,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
  {
    name: "Platinum",
    minPoints: 15000,
    maxPoints: 50000,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
  },
  {
    name: "Diamond",
    minPoints: 50000,
    maxPoints: Infinity,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
];

export function RankUpTransactions() {
  const userPoints = 2750;
  const userPtradoorBalance = 5250;
  const currentTier = rankTiers.find(
    (tier) => userPoints >= tier.minPoints && userPoints < tier.maxPoints
  );
  const nextTier = rankTiers.find((tier) => tier.minPoints > userPoints);

  const progressToNext = nextTier
    ? ((userPoints - currentTier!.minPoints) /
        (nextTier.minPoints - currentTier!.minPoints)) *
      100
    : 100;

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-bold text-primary">
          Rank Up with pTradoor
        </h2>
        <p className="text-muted-foreground text-sm">
          Trade pTradoor tokens to earn points and climb the ranks
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-1 text-sm">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Your Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Points</span>
                <span className="text-sm font-bold">
                  {userPoints.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">pTradoor</span>
                <span className="text-sm font-bold">
                  {Math.round(userPtradoorBalance / 1000)}K
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Tier</span>
                <Badge
                  className={`${currentTier?.bgColor} ${currentTier?.color} border-current text-xs px-1.5 py-0`}
                >
                  {currentTier?.name}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-1 text-sm">
                <Zap className="h-4 w-4 text-yellow-500" />
                Next Tier
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {nextTier ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      Target
                    </span>
                    <Badge
                      className={`${nextTier.bgColor} ${nextTier.color} border-current text-xs px-1.5 py-0`}
                    >
                      {nextTier.name}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Progress</span>
                      <span>{Math.round(progressToNext)}%</span>
                    </div>
                    <Progress value={progressToNext} className="h-1.5" />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {(nextTier.minPoints - userPoints).toLocaleString()} more
                  </div>
                </>
              ) : (
                <div className="text-center py-2">
                  <div className="text-purple-500 mb-1">👑</div>
                  <div className="text-xs font-medium">Max Tier!</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Coins className="h-4 w-4 text-blue-500" />
            Trade pTradoor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-medium text-green-500">Buy</h4>
                <ArrowUpRight className="h-3 w-3 text-green-500" />
              </div>
              <p className="text-xs text-muted-foreground mb-2">$0.045</p>
              <Button
                size="sm"
                className="w-full bg-green-600 hover:bg-green-700 text-white text-xs"
              >
                Buy (+5 pts)
              </Button>
            </div>
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-medium text-red-500">Sell</h4>
                <ArrowUpRight className="h-3 w-3 text-red-500" />
              </div>
              <p className="text-xs text-muted-foreground mb-2">$0.045</p>
              <Button
                size="sm"
                className="w-full bg-red-600 hover:bg-red-700 text-white text-xs"
              >
                Sell (+5 pts)
              </Button>
            </div>
          </div>

          <div className="text-center text-xs text-muted-foreground">
            Each trade earns 5 points
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-purple-500" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-3 rounded-lg bg-accent/30 border border-border"
              >
                <div className="flex items-center gap-3">
                  {transaction.status === "completed" ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <Clock className="h-5 w-5 text-yellow-500" />
                  )}
                  <div>
                    <div className="font-medium">
                      {transaction.type.toUpperCase()}{" "}
                      {transaction.amount.toLocaleString()} pTRADOOR
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ${transaction.price} • {formatTime(transaction.timestamp)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-500">
                    +{transaction.points} pts
                  </div>
                  <Badge
                    variant={
                      transaction.status === "completed" ? "default" : "outline"
                    }
                  >
                    {transaction.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="text-center">
        <Button className="bg-purple-600 hover:bg-purple-700 text-white">
          <Coins className="h-4 w-4 mr-2" />
          View All Transactions
        </Button>
      </div>
    </div>
  );
}
