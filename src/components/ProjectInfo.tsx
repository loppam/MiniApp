import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Coins, TrendingUp, Users, Target, ExternalLink } from "lucide-react";

export function ProjectInfo() {
  const projectStats = {
    totalUsers: 2847,
    totalTransactions: 45123,
    totalPoints: 890432,
    ptradoorSupply: 1000000,
    ptradoorCirculating: 245000,
  };

  const milestones = [
    { name: "pTradoor Launch", completed: true, target: 1000, current: 2847 },
    {
      name: "50K Transactions",
      completed: false,
      target: 50000,
      current: 45123,
    },
    { name: "Tradoor Token", completed: false, target: 100000, current: 45123 },
  ];

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <p className="text-muted-foreground text-sm px-4">
          Earn points by transacting on Base chain and trading pTradoor tokens
          to climb the leaderboard.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1 text-sm">
              <Users className="h-4 w-4 text-blue-500" />
              Community
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Users</span>
              <span className="text-sm font-bold">
                {projectStats.totalUsers.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">
                Transactions
              </span>
              <span className="text-sm font-bold">
                {projectStats.totalTransactions.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Points</span>
              <span className="text-sm font-bold">
                {Math.round(projectStats.totalPoints / 1000)}K
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1 text-sm">
              <Coins className="h-4 w-4 text-green-500" />
              pTradoor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Supply</span>
              <span className="text-sm font-bold">
                {projectStats.ptradoorSupply / 1000}K
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Circulating</span>
              <span className="text-sm font-bold">
                {Math.round(projectStats.ptradoorCirculating / 1000)}K
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Distribution</span>
                <span>
                  {Math.round(
                    (projectStats.ptradoorCirculating /
                      projectStats.ptradoorSupply) *
                      100
                  )}
                  %
                </span>
              </div>
              <Progress
                value={
                  (projectStats.ptradoorCirculating /
                    projectStats.ptradoorSupply) *
                  100
                }
                className="h-1.5"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Target className="h-4 w-4 text-purple-500" />
            Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {milestones.map((milestone, index) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{milestone.name}</span>
                  {milestone.completed && (
                    <Badge
                      variant="default"
                      className="bg-green-500/10 text-green-500 border-green-500/20 text-xs px-1.5 py-0"
                    >
                      ✓
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {Math.round((milestone.current / milestone.target) * 100)}%
                </span>
              </div>
              <Progress
                value={(milestone.current / milestone.target) * 100}
                className="h-1.5"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-orange-500" />
            Earn Points
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-lg bg-accent/30 border border-border">
              <h4 className="text-xs font-medium mb-1">Base Transactions</h4>
              <p className="text-xs text-muted-foreground">+1 point</p>
            </div>
            <div className="p-2 rounded-lg bg-accent/30 border border-border">
              <h4 className="text-xs font-medium mb-1">pTradoor Trading</h4>
              <p className="text-xs text-muted-foreground">+5 points</p>
            </div>
            <div className="p-2 rounded-lg bg-accent/30 border border-border">
              <h4 className="text-xs font-medium mb-1">Hold pTradoor</h4>
              <p className="text-xs text-muted-foreground">+0.1/day</p>
            </div>
            <div className="p-2 rounded-lg bg-accent/30 border border-border">
              <h4 className="text-xs font-medium mb-1">Weekly Streak</h4>
              <p className="text-xs text-muted-foreground">+50 bonus</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center">
        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
          <ExternalLink className="h-4 w-4 mr-2" />
          Connect Wallet to Start
        </Button>
      </div>
    </div>
  );
}
