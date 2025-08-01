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
} from "lucide-react";
import {
  achievementService,
  milestoneService,
  platformStatsService,
} from "~/lib/firebase-services";
import { Achievement, Milestone, PlatformStats } from "~/types/firebase";

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
    } catch (error) {
      console.error("Error loading admin data:", error);
    }
  };

  const handleCreateAchievement = async () => {
    try {
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
    } catch (error) {
      console.error("Error creating achievement:", error);
    }
  };

  const handleCreateMilestone = async () => {
    try {
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
    } catch (error) {
      console.error("Error creating milestone:", error);
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
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
            <TabsTrigger value="platform">Platform Stats</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
          </TabsList>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="space-y-6">
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

            {platformStats && (
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
                          {platformStats.totalUsers.toLocaleString()}
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
                          {platformStats.totalTransactions.toLocaleString()}
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
                          {(platformStats.totalPoints / 1000).toFixed(1)}K
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
                          {(platformStats.ptradoorSupply / 1000).toFixed(1)}K
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
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
