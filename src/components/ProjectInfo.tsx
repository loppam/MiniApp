import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/Button";
import { Progress } from "~/components/ui/progress";
import { Users, TrendingUp, Target, ExternalLink, Check } from "lucide-react";
import { useAccount } from "wagmi";
import {
  usePlatformStats,
  useMilestones,
  useUserProfile,
} from "~/hooks/useFirebase";

interface ProjectInfoProps {
  onNavigateToRankUp?: () => void;
  onNavigateToProfile?: () => void;
}

export function ProjectInfo({
  onNavigateToRankUp,
  onNavigateToProfile,
}: ProjectInfoProps) {
  const { isConnected } = useAccount();
  const {
    stats,
    loading: statsLoading,
    error: statsError,
  } = usePlatformStats();
  const {
    milestones,
    loading: milestoneLoading,
    error: milestoneError,
  } = useMilestones();
  const { profile: userProfile } = useUserProfile();

  // Check if user has completed initial points allocation
  const hasCompletedInitialPoints = userProfile && userProfile.totalPoints > 0;

  if (statsLoading || milestoneLoading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">
            Loading project info...
          </p>
        </div>
      </div>
    );
  }

  if (statsError || milestoneError) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <p className="text-sm text-red-500">{statsError || milestoneError}</p>
        </div>
      </div>
    );
  }

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
                {stats?.totalUsers.toLocaleString() || "0"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">
                Transactions
              </span>
              <span className="text-sm font-bold">
                {stats?.totalTransactions.toLocaleString() || "0"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Points</span>
              <span className="text-sm font-bold">
                {stats ? (stats.totalPoints / 1000).toFixed(2) : "0.00"}K
              </span>
            </div>
          </CardContent>
        </Card>

        <Card
          className="bg-card border-border cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={onNavigateToProfile}
        >
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
                {userProfile?.totalPoints
                  ? (userProfile.totalPoints / 1000).toFixed(2) + "K"
                  : "0.00K"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Rank</span>
              <span className="text-sm font-bold">
                #{userProfile?.currentRank || "0"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Tier</span>
              <span className="text-sm font-bold">
                {userProfile?.tier || "Bronze"}
              </span>
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
          {milestones.length === 0 ? (
            <div className="text-center py-4">
              <div className="text-sm text-muted-foreground">
                No milestones available
              </div>
            </div>
          ) : (
            milestones.map((milestone) => (
              <div key={milestone.id} className="space-y-1">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {milestone.name}
                    </span>
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
            ))
          )}
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
            <div
              className="p-2 rounded-lg bg-accent/30 border border-border relative cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={onNavigateToRankUp}
            >
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-xs font-medium">Base Transactions</h4>
                {hasCompletedInitialPoints && (
                  <Badge
                    variant="default"
                    className="bg-green-500/10 text-green-500 border-green-500/20 text-xs px-1.5 py-0"
                  >
                    <Check className="h-3 w-3" />
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">+0.5 point</p>
            </div>
            <div
              className="p-2 rounded-lg bg-accent/30 border border-border cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={onNavigateToRankUp}
            >
              <h4 className="text-xs font-medium mb-1">pTradoor Trading</h4>
              <p className="text-xs text-muted-foreground">+3 points/trade</p>
            </div>
            <div
              className="p-2 rounded-lg bg-accent/30 border border-border cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={onNavigateToRankUp}
            >
              <h4 className="text-xs font-medium mb-1">Hold pTradoor</h4>
              <p className="text-xs text-muted-foreground">+1 point/day</p>
            </div>
            <div
              className="p-2 rounded-lg bg-accent/30 border border-border cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={onNavigateToRankUp}
            >
              <h4 className="text-xs font-medium mb-1">Weekly Streak</h4>
              <p className="text-xs text-muted-foreground">+50 bonus</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center">
        {!isConnected ? (
          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
            <ExternalLink className="h-4 w-4 mr-2" />
            Connect Wallet to Start
          </Button>
        ) : (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center justify-center gap-2 text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium">Wallet Connected</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
