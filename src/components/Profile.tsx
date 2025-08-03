import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/Button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import {
  Trophy,
  TrendingUp,
  Share2,
  User,
  Calendar,
  Target,
  Award,
  Loader2,
} from "lucide-react";
import { useAccount } from "wagmi";
import { useUserProfile, useAchievements } from "~/hooks/useFirebase";
import sdk from "@farcaster/miniapp-sdk";

const getTierColor = (tier: string) => {
  switch (tier) {
    case "Bronze":
      return "text-amber-600 bg-amber-600/10 border-amber-600/20";
    case "Silver":
      return "text-gray-400 bg-gray-400/10 border-gray-400/20";
    case "Gold":
      return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
    case "Platinum":
      return "text-blue-400 bg-blue-400/10 border-blue-400/20";
    case "Diamond":
      return "text-purple-500 bg-purple-500/10 border-purple-500/20";
    default:
      return "text-gray-500 bg-gray-500/10 border-gray-500/20";
  }
};

const getRarityColor = (rarity: string) => {
  switch (rarity) {
    case "common":
      return "text-gray-500";
    case "rare":
      return "text-blue-500";
    case "epic":
      return "text-purple-500";
    case "legendary":
      return "text-yellow-500";
    default:
      return "text-gray-500";
  }
};

export function Profile() {
  const { address } = useAccount();
  const { profile, loading, error } = useUserProfile(address);
  const {
    achievements,
    loading: achLoading,
    error: achError,
  } = useAchievements(address);
  const [isSharing, setIsSharing] = useState(false);

  const formatAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString();

  const handleShare = async () => {
    if (!profile) return;

    setIsSharing(true);
    try {
      const appUrl =
        process.env.NEXT_PUBLIC_URL || "https://tradoor.vercel.app";

      const castText = `🏆 Just ranked #${
        profile.currentRank
      } on Tradoor with ${(profile.totalPoints / 1000).toFixed(1)}K points! 

Join me on Base chain's premier trading platform! 🚀

#Tradoor #Base #Trading`;

      // Use the simple SDK composeCast action - no referral tracking
      const result = await sdk.actions.composeCast({
        text: castText,
        embeds: [appUrl],
      });

      if (result?.cast) {
        console.log("Successfully shared ranking on Farcaster!");
        console.log("Cast hash:", result.cast.hash);
        // You could show a success toast here
      } else {
        console.log("User cancelled the cast or it failed");
      }
    } catch (error) {
      console.error("Error sharing ranking:", error);
    } finally {
      setIsSharing(false);
    }
  };

  if (loading || achLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">
          Loading profile...
        </span>
      </div>
    );
  }

  if (error || achError) {
    return (
      <div className="text-center py-4">
        <div className="text-sm text-red-500 mb-2">Failed to load profile</div>
        <div className="text-xs text-muted-foreground">{error || achError}</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-4">
        <div className="text-sm text-muted-foreground">No profile found</div>
        <div className="text-xs text-muted-foreground mt-1">
          Connect your wallet to view your profile
        </div>
      </div>
    );
  }

  const nextTierPoints = {
    Bronze: 1000,
    Silver: 5000,
    Gold: 15000,
    Platinum: 50000,
    Diamond: Infinity,
  };

  const currentTierPoints = {
    Bronze: 0,
    Silver: 1000,
    Gold: 5000,
    Platinum: 15000,
    Diamond: 50000,
  };

  const nextTier = Object.entries(nextTierPoints).find(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ([tier, points]) => profile.totalPoints < points
  );

  const progressToNext = nextTier
    ? ((profile.totalPoints -
        currentTierPoints[profile.tier as keyof typeof currentTierPoints]) /
        (nextTierPoints[nextTier[0] as keyof typeof nextTierPoints] -
          currentTierPoints[profile.tier as keyof typeof currentTierPoints])) *
      100
    : 100;

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
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-bold">
                  {profile.username ||
                    profile.displayName ||
                    formatAddress(profile.address)}
                </h3>
                <Badge
                  className={`${getTierColor(
                    profile.tier
                  )} text-xs px-1.5 py-0`}
                >
                  {profile.tier}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {profile.joinDate
                    ? formatDate(profile.joinDate.toDate().toISOString())
                    : "Recently joined"}
                </span>
                <span className="flex items-center gap-1">
                  <Trophy className="h-3 w-3" />#{profile.currentRank}
                </span>
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                className="text-xs px-2"
                onClick={handleShare}
                disabled={isSharing}
                title="Share ranking on Farcaster"
              >
                {isSharing ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current" />
                ) : (
                  <Share2 className="h-3 w-3" />
                )}
              </Button>
              {(address === "0x065efb8cbd9669648f4d765b6d25304f66419c47" ||
                address === "0x90554A05862879c77e64d154e0A4Eb92e48eC384") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1"
                  onClick={() => window.open("/admin", "_blank")}
                  title="Admin Panel"
                >
                  <User className="h-4 w-4" />
                </Button>
              )}
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
                {(profile.totalPoints / 1000).toFixed(2)}K
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Rank</span>
              <span className="text-sm font-bold">#{profile.currentRank}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Streak</span>
              <span className="text-sm font-bold">{profile.weeklyStreak}d</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1 text-sm">
              <User className="h-4 w-4 text-blue-500" />
              Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">
                Transactions
              </span>
              <span className="text-sm font-bold">
                {profile.totalTransactions}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">This Week</span>
              <span className="text-sm font-bold">{profile.weeklyStreak}</span>
            </div>
            {/* <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Referrals</span>
              <span className="text-sm font-bold">{profile.referrals}</span>
            </div> */}
          </CardContent>
        </Card>

        <Card className="bg-card border-border col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1 text-sm">
              <User className="h-4 w-4 text-purple-500" />
              pTradoor Holdings
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-sm font-bold">
                {Math.round(profile.ptradoorBalance / 1000)}K
              </div>
              <div className="text-xs text-muted-foreground">Balance</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold">
                {Math.round(profile.ptradoorEarned / 1000)}K
              </div>
              <div className="text-xs text-muted-foreground">Earned</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-green-500">
                +{profile.ptradoorBalance > 0 ? "10" : "0"}
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
            {achievements.slice(0, 3).map((achievement) => (
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
                    {achievement.description}
                  </p>
                </div>
              </div>
            ))}
            {achievements.length === 0 && (
              <div className="text-center py-4">
                <div className="text-sm text-muted-foreground">
                  No achievements yet
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Complete trades to unlock achievements
                </div>
              </div>
            )}
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
          {nextTier && (
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  Reach {nextTier[0]} Tier
                </span>
                <span className="text-xs text-muted-foreground">
                  {Math.round(progressToNext)}%
                </span>
              </div>
              <Progress value={progressToNext} className="h-1.5" />
              <p className="text-xs text-muted-foreground">
                {(() => {
                  const pointsNeeded =
                    nextTierPoints[nextTier[0] as keyof typeof nextTierPoints] -
                    profile.totalPoints;
                  return pointsNeeded > 0 ? pointsNeeded.toLocaleString() : "0";
                })()}{" "}
                more points needed
              </p>
            </div>
          )}

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">100 Transactions</span>
              <span className="text-xs text-muted-foreground">
                {Math.round((profile.totalTransactions / 100) * 100)}%
              </span>
            </div>
            <Progress
              value={(profile.totalTransactions / 100) * 100}
              className="h-1.5"
            />
            <p className="text-xs text-muted-foreground">
              {Math.max(0, 100 - profile.totalTransactions)} more transactions
              needed
            </p>
          </div>
        </CardContent>
      </Card>

      {/* <div className="text-center">
        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
          <ExternalLink className="h-4 w-4 mr-2" />
          View on Base Explorer
        </Button>
      </div> */}
    </div>
  );
}
