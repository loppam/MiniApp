import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Trophy, Medal, Award } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  address: string;
  points: number;
  transactions: number;
  ptradoorBalance: number;
}

const mockLeaderboardData: LeaderboardEntry[] = [
  {
    rank: 1,
    address: "0x742d35Cc6634C0532925a3b8D0bE6038C38e3c",
    points: 15420,
    transactions: 847,
    ptradoorBalance: 12500,
  },
  {
    rank: 2,
    address: "0x8ba1f109551bD432803012645Hac189451c143",
    points: 14230,
    transactions: 723,
    ptradoorBalance: 9800,
  },
  {
    rank: 3,
    address: "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4CE",
    points: 12890,
    transactions: 612,
    ptradoorBalance: 8700,
  },
  {
    rank: 4,
    address: "0x742d35Cc6634C0532925a3b8D0bE6038C38e34",
    points: 11560,
    transactions: 534,
    ptradoorBalance: 7200,
  },
  {
    rank: 5,
    address: "0x8ba1f109551bD432803012645Hac189451c145",
    points: 10890,
    transactions: 478,
    ptradoorBalance: 6500,
  },
  {
    rank: 6,
    address: "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4CF",
    points: 9650,
    transactions: 423,
    ptradoorBalance: 5800,
  },
  {
    rank: 7,
    address: "0x742d35Cc6634C0532925a3b8D0bE6038C38e35",
    points: 8920,
    transactions: 387,
    ptradoorBalance: 4900,
  },
  {
    rank: 8,
    address: "0x8ba1f109551bD432803012645Hac189451c147",
    points: 8230,
    transactions: 352,
    ptradoorBalance: 4200,
  },
  {
    rank: 9,
    address: "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4D0",
    points: 7580,
    transactions: 318,
    ptradoorBalance: 3600,
  },
  {
    rank: 10,
    address: "0x742d35Cc6634C0532925a3b8D0bE6038C38e36",
    points: 6890,
    transactions: 289,
    ptradoorBalance: 3100,
  },
];

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Trophy className="h-5 w-5 text-yellow-500" />;
    case 2:
      return <Medal className="h-5 w-5 text-gray-400" />;
    case 3:
      return <Award className="h-5 w-5 text-amber-600" />;
    default:
      return (
        <span className="h-5 w-5 flex items-center justify-center text-muted-foreground">
          #{rank}
        </span>
      );
  }
};

const formatAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export function Leaderboard() {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-bold text-primary">Leaderboard</h2>
        <p className="text-muted-foreground text-sm">
          Top traders on Base chain
        </p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Trophy className="h-4 w-4 text-yellow-500" />
            Top 10 Traders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {mockLeaderboardData.slice(0, 8).map((entry) => (
              <div
                key={entry.rank}
                className="flex items-center justify-between p-2 rounded-lg bg-accent/30 border border-border"
              >
                <div className="flex items-center gap-2">
                  {getRankIcon(entry.rank)}
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {formatAddress(entry.address)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {entry.transactions} txns
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-foreground">
                    {Math.round(entry.points / 1000)}K
                  </div>
                  <div className="text-xs text-muted-foreground">
                    #{entry.rank}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
