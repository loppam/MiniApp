import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/Button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
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
  // ExternalLink,
  Loader2,
  Download,
} from "lucide-react";
import { useAccount } from "wagmi";
import { useUserProfile, useAchievements } from "~/hooks/useFirebase";
import { userService } from "~/lib/firebase-services";
import { useState, useRef } from "react";
import html2canvas from "html2canvas";

const getRarityColor = (rarity: string) => {
  switch (rarity) {
    case "common":
      return "text-gray-400 bg-gray-400/10 border-gray-400/20";
    case "rare":
      return "text-blue-400 bg-blue-400/10 border-blue-400/20";
    case "epic":
      return "text-purple-500 bg-purple-500/10 border-purple-500/20";
    case "legendary":
      return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
    default:
      return "text-gray-400 bg-gray-400/10 border-gray-400/20";
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
  const [showShareModal, setShowShareModal] = useState(false);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  const formatAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString();

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleUpdateAvatar = async () => {
    if (!address) return;

    setIsUpdatingAvatar(true);
    try {
      await userService.updateUserAvatar(address);
    } catch (error) {
      console.error("Failed to update avatar:", error);
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  const generateShareImage = async () => {
    if (!shareCardRef.current || !profile) return;

    try {
      const canvas = await html2canvas(shareCardRef.current, {
        backgroundColor: "#0f0f23",
        scale: 2,
        width: 400,
        height: 600,
      });

      const link = document.createElement("a");
      link.download = `tradoor-rank-${profile.currentRank}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error("Error generating image:", error);
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
            <Avatar className="h-12 w-12">
              {profile.avatarUrl && (
                <img src={profile.avatarUrl} alt="Profile" />
              )}
              <AvatarFallback className="bg-primary/10 text-primary">
                {profile.address.slice(2, 4).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-bold">
                  {profile.username ||
                    profile.displayName ||
                    formatAddress(profile.address)}
                </h3>
                <Badge className="bg-gray-400/10 text-gray-400 border-gray-400/20 text-xs px-1.5 py-0">
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
              >
                <Share2 className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs px-2"
                onClick={handleUpdateAvatar}
                disabled={isUpdatingAvatar}
                title="Update avatar from Farcaster"
              >
                {isUpdatingAvatar ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current" />
                ) : (
                  <div className="h-3 w-3">🔄</div>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="p-1"
                onClick={() => window.open("/admin", "_blank")}
                title="Admin Panel"
              >
                <Settings className="h-4 w-4" />
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
              <Coins className="h-4 w-4 text-purple-500" />
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
                {(
                  nextTierPoints[nextTier[0] as keyof typeof nextTierPoints] -
                  profile.totalPoints
                ).toLocaleString()}{" "}
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

      {/* Share Modal */}
      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Share Your Ranking
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div
              ref={shareCardRef}
              className="text-center p-6 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 rounded-xl border border-border/50 backdrop-blur-sm"
              style={{ width: "400px", height: "600px" }}
            >
              <div className="flex flex-col items-center justify-center h-full space-y-6">
                <div className="text-6xl font-bold text-yellow-500 mb-4">
                  🏆
                </div>
                <div className="text-4xl font-bold text-primary mb-2">
                  #{profile?.currentRank}
                </div>
                <div className="text-lg text-muted-foreground mb-6">
                  {profile?.username ||
                    profile?.displayName ||
                    formatAddress(profile?.address || "")}
                </div>
                <div className="grid grid-cols-3 gap-6 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">
                      {(profile?.totalPoints / 1000).toFixed(2)}K
                    </div>
                    <div className="text-muted-foreground">Points</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-500">
                      {profile?.tier}
                    </div>
                    <div className="text-muted-foreground">Tier</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-500">
                      {profile?.totalTransactions}
                    </div>
                    <div className="text-muted-foreground">Txns</div>
                  </div>
                </div>
                <div className="mt-8 text-center">
                  <div className="text-lg font-bold text-primary">Tradoor</div>
                  <div className="text-xs text-muted-foreground">
                    Base Chain Trading
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={generateShareImage}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Image
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowShareModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
