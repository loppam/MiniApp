import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Trophy, Medal, Award, Loader2 } from "lucide-react";
import { useLeaderboard } from "~/hooks/useFirebase";

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

const formatAddress = (address: string) =>
  `${address.slice(0, 6)}...${address.slice(-4)}`;

export function Leaderboard() {
  const { leaderboard, loading, error } = useLeaderboard(10);

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
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">
                Loading leaderboard...
              </span>
            </div>
          )}

          {error && (
            <div className="text-center py-4">
              <div className="text-sm text-red-500 mb-2">
                Failed to load leaderboard
              </div>
              <div className="text-xs text-muted-foreground">{error}</div>
            </div>
          )}

          {!loading && !error && leaderboard.length === 0 && (
            <div className="text-center py-4">
              <div className="text-sm text-muted-foreground">
                No leaderboard data available
              </div>
            </div>
          )}

          {!loading && !error && leaderboard.length > 0 && (
            <div className="space-y-2">
              {leaderboard.slice(0, 8).map((entry, idx) => (
                <div
                  key={entry.userAddress}
                  className="flex items-center justify-between p-2 rounded-lg bg-accent/30 border border-border"
                >
                  <div className="flex items-center gap-2">
                    {getRankIcon(idx + 1)}
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {formatAddress(entry.userAddress)}
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
                      #{idx + 1}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
