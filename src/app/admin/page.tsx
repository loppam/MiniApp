"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Alert, AlertDescription } from "~/components/ui/alert";
import {
  Shield,
  Trophy,
  Target,
  Users,
  TrendingUp,
  Plus,
  Edit,
  Trash2,
  Lock,
  Unlock,
  Clock,
  RefreshCw,
} from "lucide-react";
import {
  achievementService,
  milestoneService,
  platformStatsService,
} from "~/lib/firebase-services";
import {
  Achievement,
  Milestone,
  PlatformStats,
  LeaderboardEntry,
} from "~/types/firebase";

interface AdminAuth {
  username: string;
  password: string;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [credentials, setCredentials] = useState<AdminAuth>({
    username: "",
    password: "",
  });

  // Data states
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(
    null
  );
  const [performanceMetrics, setPerformanceMetrics] = useState<{
    responseTime: number;
    lastUpdateDelay: number;
    dataFreshness: number;
    dataSize: number;
  } | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Message states
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Form states
  const [newAchievement, setNewAchievement] = useState({
    name: "",
    description: "",
    icon: "",
    rarity: "common" as "common" | "rare" | "epic" | "legendary",
    requirementsType: "transactions" as
      | "transactions"
      | "points"
      | "streak"
      | "balance"
      | "referrals",
    requirementsValue: 1,
    pointsReward: 10,
    isActive: true,
  });

  const [newMilestone, setNewMilestone] = useState({
    name: "",
    target: 100,
    type: "users" as "users" | "transactions" | "points",
  });

  const [editingAchievement, setEditingAchievement] =
    useState<Achievement | null>(null);

  // Load admin credentials from environment
  const ADMIN_USERNAME = process.env.NEXT_PUBLIC_ADMIN_USERNAME || "lopam";
  const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "lopam";

  const handleLogin = () => {
    if (
      credentials.username === ADMIN_USERNAME &&
      credentials.password === ADMIN_PASSWORD
    ) {
      setIsAuthenticated(true);
      setAuthError("");
      loadData();
    } else {
      setAuthError("Invalid credentials");
    }
  };

  const loadData = async () => {
    try {
      const [achievementsData, milestonesData, statsData] = await Promise.all([
        achievementService.getActiveAchievements(),
        milestoneService.getMilestones(),
        platformStatsService.getPlatformStats(),
      ]);

      setAchievements(achievementsData);
      setMilestones(milestonesData);
      setPlatformStats(statsData);

      // Also load performance metrics
      try {
        const metrics = await platformStatsService.getPerformanceMetrics();
        setPerformanceMetrics(metrics);
      } catch (metricsError) {
        console.warn("Could not load performance metrics:", metricsError);
      }

      // Load leaderboard data
      try {
        const { leaderboardService } = await import("~/lib/firebase-services");
        const leaderboardData = await leaderboardService.getTopUsers(50); // Get top 50 users
        setLeaderboard(leaderboardData);
      } catch (leaderboardError) {
        console.warn("Could not load leaderboard data:", leaderboardError);
        setLeaderboard([]);
      }
    } catch (error) {
      console.error("Error loading admin data:", error);
    }
  };

  const handleCreateAchievement = async () => {
    try {
      setMessage({ type: "info", text: "Creating achievement..." });

      const achievementData = {
        name: newAchievement.name,
        description: newAchievement.description,
        icon: newAchievement.icon,
        rarity: newAchievement.rarity,
        requirements: {
          type: newAchievement.requirementsType,
          value: newAchievement.requirementsValue,
        },
        pointsReward: newAchievement.pointsReward,
        isActive: newAchievement.isActive,
      };

      await achievementService.createAchievement(achievementData);
      await loadData();

      // Reset form
      setNewAchievement({
        name: "",
        description: "",
        icon: "",
        rarity: "common",
        requirementsType: "transactions",
        requirementsValue: 1,
        pointsReward: 10,
        isActive: true,
      });

      setMessage({
        type: "success",
        text: "Achievement created successfully!",
      });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Error creating achievement:", error);
      setMessage({
        type: "error",
        text: `Error creating achievement: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleCreateMilestone = async () => {
    try {
      setMessage({ type: "info", text: "Creating milestone..." });

      const milestoneData = {
        name: newMilestone.name,
        target: newMilestone.target,
        current: 0,
        completed: false,
        type: newMilestone.type,
      };

      await milestoneService.createMilestone(milestoneData);
      await loadData();

      // Reset form
      setNewMilestone({
        name: "",
        target: 100,
        type: "users",
      });

      setMessage({ type: "success", text: "Milestone created successfully!" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Error creating milestone:", error);
      setMessage({
        type: "error",
        text: `Error creating milestone: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleUpdateAchievement = async (achievement: Achievement) => {
    try {
      await achievementService.updateAchievement(achievement.id, {
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        rarity: achievement.rarity,
        requirements: achievement.requirements,
        pointsReward: achievement.pointsReward,
        isActive: achievement.isActive,
      });
      await loadData();
      setEditingAchievement(null);
    } catch (error) {
      console.error("Error updating achievement:", error);
    }
  };

  const handleDeleteAchievement = async (achievementId: string) => {
    try {
      await achievementService.deleteAchievement(achievementId);
      await loadData();
    } catch (error) {
      console.error("Error deleting achievement:", error);
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    try {
      await milestoneService.deleteMilestone(milestoneId);
      await loadData();
    } catch (error) {
      console.error("Error deleting milestone:", error);
    }
  };

  const handleRecalculatePlatformStats = async () => {
    try {
      console.log("Recalculating platform stats...");
      setMessage({ type: "info", text: "Recalculating platform stats..." });

      await platformStatsService.recalculatePlatformStats();
      await loadData(); // Reload data to show updated stats

      setMessage({
        type: "success",
        text: "Platform stats recalculated successfully!",
      });
      console.log("Platform stats recalculated successfully");

      // Clear success message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Error recalculating platform stats:", error);
      setMessage({
        type: "error",
        text: `Error recalculating stats: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });

      // Clear error message after 5 seconds
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleRecalculateLeaderboard = async () => {
    try {
      console.log("Recalculating leaderboard...");
      setMessage({ type: "info", text: "Recalculating leaderboard..." });

      const { leaderboardService } = await import("~/lib/firebase-services");
      await leaderboardService.recalculateRankings();
      await loadData(); // Reload data to show updated leaderboard

      setMessage({
        type: "success",
        text: "Leaderboard recalculated successfully!",
      });
      console.log("Leaderboard recalculated successfully");

      // Clear success message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Error recalculating leaderboard:", error);
      setMessage({
        type: "error",
        text: `Error recalculating leaderboard: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });

      // Clear error message after 5 seconds
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleSyncUsersToLeaderboard = async () => {
    try {
      console.log("Syncing all users to leaderboard...");
      setMessage({ type: "info", text: "Syncing all users to leaderboard..." });

      const { leaderboardService } = await import("~/lib/firebase-services");
      await leaderboardService.syncAllUsersToLeaderboard();
      await loadData(); // Reload data to show updated leaderboard

      setMessage({
        type: "success",
        text: "All users synced to leaderboard successfully!",
      });
      console.log("All users synced to leaderboard successfully");

      // Clear success message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Error syncing users to leaderboard:", error);
      setMessage({
        type: "error",
        text: `Error syncing users to leaderboard: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });

      // Clear error message after 5 seconds
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleDiagnoseLeaderboard = async () => {
    try {
      console.log("Diagnosing leaderboard issues...");
      setMessage({ type: "info", text: "Diagnosing leaderboard issues..." });

      const { leaderboardService } = await import("~/lib/firebase-services");
      const diagnosis = await leaderboardService.diagnoseLeaderboardIssues();

      console.log("Leaderboard diagnosis:", diagnosis);

      if (
        diagnosis.mismatchedUsers.length === 0 &&
        diagnosis.missingEntries.length === 0
      ) {
        setMessage({
          type: "success",
          text: "No leaderboard issues found! All data is synchronized.",
        });
      } else {
        setMessage({
          type: "error",
          text: `Found ${diagnosis.mismatchedUsers.length} mismatched users and ${diagnosis.missingEntries.length} missing entries. Check console for details.`,
        });
      }

      // Clear message after 5 seconds
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      console.error("Error diagnosing leaderboard:", error);
      setMessage({
        type: "error",
        text: `Error diagnosing leaderboard: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleFixIncorrectInitialData = async () => {
    try {
      console.log("Fixing users with incorrect initial data...");
      setMessage({
        type: "info",
        text: "Fixing users with incorrect initial data...",
      });

      const { userService } = await import("~/lib/firebase-services");
      const result = await userService.fixUsersWithIncorrectInitialData();

      console.log("Fix result:", result);

      if (result.fixedUsers > 0) {
        setMessage({
          type: "success",
          text: `Fixed ${result.fixedUsers} users with incorrect initial data!`,
        });

        // Reload data to show updated information
        await loadData();
      } else {
        setMessage({
          type: "success",
          text: "No users needed fixing. All data is correct!",
        });
      }

      if (result.errors.length > 0) {
        console.warn("Some errors occurred during fixing:", result.errors);
      }

      // Clear message after 5 seconds
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      console.error("Error fixing incorrect initial data:", error);
      setMessage({
        type: "error",
        text: `Error fixing incorrect initial data: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleRefreshPerformanceMetrics = async () => {
    try {
      console.log("Getting performance metrics...");
      const metrics = await platformStatsService.getPerformanceMetrics();
      console.log("Performance metrics:", metrics);
      setPerformanceMetrics(metrics);
    } catch (error) {
      console.error("Error getting performance metrics:", error);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "common":
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
      case "rare":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "epic":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "legendary":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Admin Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {authError && (
              <Alert>
                <AlertDescription className="text-red-500">
                  {authError}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={credentials.username}
                onChange={(e) =>
                  setCredentials({ ...credentials, username: e.target.value })
                }
                placeholder="Enter username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={credentials.password}
                onChange={(e) =>
                  setCredentials({ ...credentials, password: e.target.value })
                }
                placeholder="Enter password"
              />
            </div>

            <Button onClick={handleLogin} className="w-full">
              <Lock className="h-4 w-4 mr-2" />
              Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Tradoor Admin</h1>
              <p className="text-muted-foreground">
                Manage achievements, milestones, and platform data
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => setIsAuthenticated(false)}>
            <Unlock className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="achievements" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
            <TabsTrigger value="platform">Platform</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          </TabsList>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="space-y-6">
            {/* Message Display */}
            {message && (
              <Alert
                className={
                  message.type === "error"
                    ? "border-red-500 bg-red-50"
                    : message.type === "success"
                    ? "border-green-500 bg-green-50"
                    : "border-blue-500 bg-blue-50"
                }
              >
                <AlertDescription
                  className={
                    message.type === "error"
                      ? "text-red-700"
                      : message.type === "success"
                      ? "text-green-700"
                      : "text-blue-700"
                  }
                >
                  {message.text}
                </AlertDescription>
              </Alert>
            )}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Achievements Management</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Achievement
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Achievement</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={newAchievement.name}
                        onChange={(e) =>
                          setNewAchievement({
                            ...newAchievement,
                            name: e.target.value,
                          })
                        }
                        placeholder="Achievement name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newAchievement.description}
                        onChange={(e) =>
                          setNewAchievement({
                            ...newAchievement,
                            description: e.target.value,
                          })
                        }
                        placeholder="Achievement description"
                      />
                    </div>

                    <div>
                      <Label htmlFor="icon">Icon</Label>
                      <Input
                        id="icon"
                        value={newAchievement.icon}
                        onChange={(e) =>
                          setNewAchievement({
                            ...newAchievement,
                            icon: e.target.value,
                          })
                        }
                        placeholder="🎯"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="rarity">Rarity</Label>
                        <Select
                          value={newAchievement.rarity}
                          onValueChange={(
                            value: "common" | "rare" | "epic" | "legendary"
                          ) =>
                            setNewAchievement({
                              ...newAchievement,
                              rarity: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="common">Common</SelectItem>
                            <SelectItem value="rare">Rare</SelectItem>
                            <SelectItem value="epic">Epic</SelectItem>
                            <SelectItem value="legendary">Legendary</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="pointsReward">Points Reward</Label>
                        <Input
                          id="pointsReward"
                          type="number"
                          value={newAchievement.pointsReward}
                          onChange={(e) =>
                            setNewAchievement({
                              ...newAchievement,
                              pointsReward: parseInt(e.target.value),
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="requirementsType">
                          Requirement Type
                        </Label>
                        <Select
                          value={newAchievement.requirementsType}
                          onValueChange={(
                            value:
                              | "transactions"
                              | "points"
                              | "streak"
                              | "balance"
                              | "referrals"
                          ) =>
                            setNewAchievement({
                              ...newAchievement,
                              requirementsType: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="transactions">
                              Transactions
                            </SelectItem>
                            <SelectItem value="points">Points</SelectItem>
                            <SelectItem value="streak">Streak</SelectItem>
                            <SelectItem value="balance">Balance</SelectItem>
                            <SelectItem value="referrals">Referrals</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="requirementsValue">
                          Requirement Value
                        </Label>
                        <Input
                          id="requirementsValue"
                          type="number"
                          value={newAchievement.requirementsValue}
                          onChange={(e) =>
                            setNewAchievement({
                              ...newAchievement,
                              requirementsValue: parseInt(e.target.value),
                            })
                          }
                        />
                      </div>
                    </div>

                    <Button
                      onClick={handleCreateAchievement}
                      className="w-full"
                    >
                      Create Achievement
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {achievements.map((achievement) => (
                <Card key={achievement.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{achievement.icon}</div>
                        <div>
                          <h3 className="font-semibold">{achievement.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {achievement.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              className={getRarityColor(achievement.rarity)}
                            >
                              {achievement.rarity}
                            </Badge>
                            <Badge variant="outline">
                              +{achievement.pointsReward} pts
                            </Badge>
                            <Badge
                              variant={
                                achievement.isActive ? "default" : "secondary"
                              }
                            >
                              {achievement.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Edit Achievement</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>Name</Label>
                                <Input
                                  value={achievement.name}
                                  onChange={(e) =>
                                    setEditingAchievement({
                                      ...achievement,
                                      name: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <Label>Description</Label>
                                <Textarea
                                  value={achievement.description}
                                  onChange={(e) =>
                                    setEditingAchievement({
                                      ...achievement,
                                      description: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <Label>Points Reward</Label>
                                <Input
                                  type="number"
                                  value={achievement.pointsReward}
                                  onChange={(e) =>
                                    setEditingAchievement({
                                      ...achievement,
                                      pointsReward: parseInt(e.target.value),
                                    })
                                  }
                                />
                              </div>
                              <Button
                                onClick={() =>
                                  handleUpdateAchievement(editingAchievement!)
                                }
                                className="w-full"
                              >
                                Update Achievement
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleDeleteAchievement(achievement.id)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Milestones Tab */}
          <TabsContent value="milestones" className="space-y-6">
            {/* Message Display */}
            {message && (
              <Alert
                className={
                  message.type === "error"
                    ? "border-red-500 bg-red-50"
                    : message.type === "success"
                    ? "text-green-500 bg-green-50"
                    : "border-blue-500 bg-blue-50"
                }
              >
                <AlertDescription
                  className={
                    message.type === "error"
                      ? "text-red-700"
                      : message.type === "success"
                      ? "text-green-700"
                      : "text-blue-700"
                  }
                >
                  {message.text}
                </AlertDescription>
              </Alert>
            )}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Milestones Management</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Milestone
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Milestone</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="milestoneName">Name</Label>
                      <Input
                        id="milestoneName"
                        value={newMilestone.name}
                        onChange={(e) =>
                          setNewMilestone({
                            ...newMilestone,
                            name: e.target.value,
                          })
                        }
                        placeholder="Milestone name"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="target">Target</Label>
                        <Input
                          id="target"
                          type="number"
                          value={newMilestone.target}
                          onChange={(e) =>
                            setNewMilestone({
                              ...newMilestone,
                              target: parseInt(e.target.value),
                            })
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor="type">Type</Label>
                        <Select
                          value={newMilestone.type}
                          onValueChange={(
                            value: "users" | "transactions" | "points"
                          ) =>
                            setNewMilestone({ ...newMilestone, type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="users">Users</SelectItem>
                            <SelectItem value="transactions">
                              Transactions
                            </SelectItem>
                            <SelectItem value="points">Points</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button onClick={handleCreateMilestone} className="w-full">
                      Create Milestone
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {milestones.map((milestone) => (
                <Card key={milestone.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{milestone.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {milestone.current} / {milestone.target}{" "}
                          {milestone.type}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant={
                              milestone.completed ? "default" : "outline"
                            }
                          >
                            {milestone.completed ? "Completed" : "In Progress"}
                          </Badge>
                          <Badge variant="outline">{milestone.type}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          title="Edit functionality coming soon"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteMilestone(milestone.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Platform Stats Tab */}
          <TabsContent value="platform" className="space-y-6">
            <h2 className="text-xl font-semibold">Platform Statistics</h2>

            {/* Message Display */}
            {message && (
              <Alert
                className={
                  message.type === "error"
                    ? "border-red-500 bg-red-50"
                    : message.type === "success"
                    ? "border-green-500 bg-green-50"
                    : "border-blue-500 bg-blue-50"
                }
              >
                <AlertDescription
                  className={
                    message.type === "error"
                      ? "text-red-700"
                      : message.type === "success"
                      ? "text-green-700"
                      : "text-blue-700"
                  }
                >
                  {message.text}
                </AlertDescription>
              </Alert>
            )}

            {platformStats && (
              <div className="space-y-6">
                {/* Current Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Total Users
                          </p>
                          <p className="text-2xl font-bold">
                            {platformStats?.totalUsers
                              ? platformStats.totalUsers.toLocaleString()
                              : "0"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Total Transactions
                          </p>
                          <p className="text-2xl font-bold">
                            {platformStats?.totalTransactions
                              ? platformStats.totalTransactions.toLocaleString()
                              : "0"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Total Points
                          </p>
                          <p className="text-2xl font-bold">
                            {platformStats?.totalPoints
                              ? (platformStats.totalPoints / 1000).toFixed(1)
                              : "0.0"}
                            K
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-purple-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            pTradoor Supply
                          </p>
                          <p className="text-2xl font-bold">
                            {platformStats?.ptradoorSupply
                              ? (platformStats.ptradoorSupply / 1000).toFixed(1)
                              : "0.0"}
                            K
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Additional Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Avg Points/User
                          </p>
                          <p className="text-2xl font-bold">
                            {platformStats.totalUsers > 0
                              ? (
                                  platformStats.totalPoints /
                                  platformStats.totalUsers
                                ).toFixed(1)
                              : "0.0"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Circulation %
                          </p>
                          <p className="text-2xl font-bold">
                            {platformStats.ptradoorSupply > 0
                              ? (
                                  (platformStats.ptradoorCirculating /
                                    platformStats.ptradoorSupply) *
                                  100
                                ).toFixed(1)
                              : "0.0"}
                            %
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Last Updated
                          </p>
                          <p className="text-sm font-medium">
                            {platformStats.lastUpdated
                              ?.toDate()
                              .toLocaleString() || "Never"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleRecalculatePlatformStats}
                className="flex-1"
              >
                Recalculate Platform Stats
              </Button>
              <Button onClick={handleRecalculateLeaderboard} className="flex-1">
                Recalculate Leaderboard
              </Button>
              <Button
                onClick={handleRefreshPerformanceMetrics}
                variant="outline"
                className="flex-1"
              >
                Refresh Performance Metrics
              </Button>
            </div>

            {/* Performance Metrics Display */}
            {performanceMetrics && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">
                  Performance Metrics
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Response Time (ms)
                    </p>
                    <p className="text-2xl font-bold">
                      {performanceMetrics.responseTime.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Last Update Delay (ms)
                    </p>
                    <p className="text-2xl font-bold">
                      {performanceMetrics.lastUpdateDelay.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Data Freshness (ms)
                    </p>
                    <p className="text-2xl font-bold">
                      {performanceMetrics.dataFreshness.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Data Size (KB)
                    </p>
                    <p className="text-2xl font-bold">
                      {performanceMetrics.dataSize.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="space-y-6">
            <h2 className="text-xl font-semibold">Leaderboard Management</h2>

            {/* Message Display */}
            {message && (
              <Alert
                className={
                  message.type === "error"
                    ? "border-red-500 bg-red-50"
                    : message.type === "success"
                    ? "border-green-500 bg-green-50"
                    : "border-blue-500 bg-blue-50"
                }
              >
                <AlertDescription
                  className={
                    message.type === "error"
                      ? "text-red-700"
                      : message.type === "success"
                      ? "text-green-700"
                      : "text-blue-700"
                  }
                >
                  {message.text}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Current Leaderboard</h3>
                <p className="text-sm text-muted-foreground">
                  View and manage user rankings and points
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSyncUsersToLeaderboard}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Sync All Users
                </Button>
                <Button
                  onClick={handleRecalculateLeaderboard}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Recalculate Rankings
                </Button>
                <Button
                  onClick={handleDiagnoseLeaderboard}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Target className="h-4 w-4" />
                  Diagnose Leaderboard
                </Button>
                <Button
                  onClick={handleFixIncorrectInitialData}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  Fix Initial Data
                </Button>
              </div>
            </div>

            {/* Leaderboard Display */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Top Users by Points
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {leaderboard.length > 0 ? (
                      <div className="space-y-2">
                        {leaderboard.map((entry, index) => (
                          <div
                            key={entry.userAddress}
                            className="flex items-center justify-between p-3 rounded-lg bg-accent/30 border border-border"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                                <span className="text-sm font-bold text-yellow-600">
                                  #{index + 1}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium text-sm">
                                  {entry.userAddress.slice(0, 6)}...
                                  {entry.userAddress.slice(-4)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Tier: {entry.tier}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-sm">
                                {entry.points.toLocaleString()} pts
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {entry.lastUpdated
                                  ?.toDate()
                                  .toLocaleDateString() || "Unknown"}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : platformStats && platformStats.totalUsers > 0 ? (
                      <div className="text-center py-8">
                        <div className="text-sm text-muted-foreground mb-2">
                          Leaderboard data will be displayed here
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Total users:{" "}
                          {platformStats.totalUsers.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Total points:{" "}
                          {(platformStats.totalPoints / 1000).toFixed(1)}K
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-sm text-muted-foreground">
                          No users found. Start by creating some achievements
                          and milestones.
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <h2 className="text-xl font-semibold">System Overview</h2>

            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Achievements Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {achievements.length}
                      </div>
                      <div className="text-sm text-muted-foreground">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-500">
                        {achievements.filter((a) => a.isActive).length}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Active
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-500">
                        {
                          achievements.filter((a) => a.rarity === "legendary")
                            .length
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Legendary
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-500">
                        {achievements.reduce(
                          (sum, a) => sum + a.pointsReward,
                          0
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Total Points
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-purple-500" />
                    Milestones Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {milestones.length}
                      </div>
                      <div className="text-sm text-muted-foreground">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-500">
                        {milestones.filter((m) => m.completed).length}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Completed
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-500">
                        {milestones.filter((m) => m.type === "users").length}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        User Goals
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-500">
                        {
                          milestones.filter((m) => m.type === "transactions")
                            .length
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Transaction Goals
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
