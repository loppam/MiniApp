"use client";

import { useState, useEffect, useCallback } from "react";
import { ProjectInfo } from "./ProjectInfo";
import { Leaderboard } from "./Leaderboard";
import { RankUpTransactions } from "./RankUpTransactions";
import { Profile } from "./Profile";
import { Badge } from "./ui/badge";
// import { Button } from "./ui/Button";
import { Home, TrendingUp, User, Zap, Trophy } from "lucide-react";
import sdk, { type Context, AddMiniApp } from "@farcaster/miniapp-sdk";
import { useAccount } from "wagmi";
// import { config } from "~/components/providers/WagmiProvider";
import { truncateAddress } from "~/lib/truncateAddress";
import { useUserProfile } from "~/hooks/useFirebase";

export default function TradoorApp(
  { title }: { title?: string } = { title: "Tradoor" }
) {
  const [activeTab, setActiveTab] = useState("home");
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [, setContext] = useState<Context.MiniAppContext>();
  const [isFrameAdded, setIsFrameAdded] = useState(false);

  const { address, isConnected } = useAccount();

  // Firebase hooks
  const { profile: userProfile } = useUserProfile(address);

  const handleAddFrame = useCallback(async () => {
    try {
      const result = await sdk.actions.addFrame();

      if (result.notificationDetails) {
        console.log(
          "Frame added successfully with notification details:",
          result.notificationDetails
        );
        setIsFrameAdded(true);
      } else {
        console.log(
          "Frame added successfully, but no notification details received"
        );
        setIsFrameAdded(true);
      }
    } catch (error) {
      if (error instanceof AddMiniApp.RejectedByUser) {
        console.log("User rejected adding frame:", error.message);
      } else if (error instanceof AddMiniApp.InvalidDomainManifest) {
        console.log("Invalid domain manifest:", error.message);
      } else {
        console.error("Error adding frame:", error);
      }
    }
  }, []);

  // Auto-add frame when SDK is loaded and user is connected
  useEffect(() => {
    if (isSDKLoaded && isConnected && !isFrameAdded) {
      handleAddFrame();
    }
  }, [isSDKLoaded, isConnected, isFrameAdded, handleAddFrame]);

  // Initialize Mini App SDK and Firebase user
  useEffect(() => {
    const load = async () => {
      try {
        console.log("Loading SDK and initializing user...");
        const sdkContext = await sdk.context;
        console.log("SDK context loaded:", sdkContext);
        setContext(sdkContext);

        // Initialize Firebase user if connected
        if (address && isConnected) {
          console.log("Initializing user with address:", address);
          console.log("SDK context for initialization:", sdkContext);

          // Wait a bit for the secure client to be available
          setTimeout(async () => {
            try {
              // Use SDK user data directly instead of making API calls
              const userData = {
                address,
                username: sdkContext.user?.username,
                displayName: sdkContext.user?.displayName,
                pfpUrl: sdkContext.user?.pfpUrl, // Handle both avatarUrl and pfpUrl
              };

              console.log("Initializing user with SDK data:", userData);

              // Use the API route for user initialization
              const response = await fetch("/api/firestore-proxy", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  address,
                  action: "initializeUser",
                  data: {
                    profileData: userData,
                    context: {
                      user: {
                        fid: sdkContext.user?.fid,
                        username: sdkContext.user?.username,
                        displayName: sdkContext.user?.displayName,
                        pfpUrl: sdkContext.user?.pfpUrl,
                      },
                    },
                  },
                }),
              });

              const result = await response.json();
              if (result.success) {
                console.log(
                  "User initialization completed successfully:",
                  result.data
                );
              } else {
                console.error("User initialization failed:", result.error);
              }
            } catch (initError) {
              console.error("User initialization failed:", initError);
              // Continue with app loading even if initialization fails
            }
          }, 2000); // Increased delay to 2 seconds for better reliability
        } else {
          console.log("Not initializing user:", { address, isConnected });
        }

        sdk.actions.ready();
        setIsSDKLoaded(true);
      } catch (error) {
        console.error("Failed to load SDK:", error);
        setIsSDKLoaded(true); // Still set as loaded to show UI
      }
    };

    if (sdk && !isSDKLoaded) {
      load();
    }
  }, [isSDKLoaded, address, isConnected]);

  // Debug logging for profile
  useEffect(() => {
    console.log("Profile state:", { userProfile, address, isConnected });
  }, [userProfile, address, isConnected]);

  // Use Firebase profile data or fallback to mock data
  const userStats = {
    address: address || "0xnotconnected",
    points: userProfile?.totalPoints || 0,
    rank: userProfile?.currentRank || "0",
    tier: userProfile?.tier || "N/A",
  };

  const formatAddress = (address: string) => {
    return truncateAddress(address);
  };

  const tabs = [
    { id: "home", label: "Home", icon: Home },
    { id: "rankup", label: "Rank Up", icon: TrendingUp },
    { id: "profile", label: "Profile", icon: User },
  ];

  // No manual connect wallet inside Warpcast; rely on Farcaster context

  // Remove handleTestConnection and related debug button

  if (!isSDKLoaded) {
    return (
      <div className="py-4 px-2">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading {title}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground dark pb-20">
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-blue-500" />
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Tradoor
              </h1>
              <Badge
                variant="outline"
                className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs"
              >
                Base
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-gray-400/10 text-gray-400 border-gray-400/20 text-xs">
                {userStats.tier}
              </Badge>
              <div className="text-right">
                <div className="text-xs font-medium">
                  {userProfile?.username ||
                    userProfile?.displayName ||
                    formatAddress(userStats.address)}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Trophy className="h-3 w-3" />#{userStats.rank}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-4 pb-24">
        {activeTab === "home" && (
          <div className="space-y-6">
            <ProjectInfo
              onNavigateToRankUp={() => setActiveTab("rankup")}
              onNavigateToProfile={() => setActiveTab("profile")}
            />
            <Leaderboard />
          </div>
        )}

        {activeTab === "rankup" && <RankUpTransactions />}

        {activeTab === "profile" && <Profile />}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur border-t border-border">
        <div className="flex items-center justify-around py-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* No wallet modal in Warpcast; show UI based on Farcaster context */}
    </div>
  );
}
