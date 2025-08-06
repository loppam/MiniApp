import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/Button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import {
  Coins,
  TrendingUp,
  Zap,
  ArrowUpRight,
  Clock,
  CheckCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { useUserProfile, useTransactions } from "~/hooks/useFirebase";
import { Timestamp } from "firebase/firestore";
import { useState, useCallback } from "react";
import { TradingSystem } from "~/lib/trading-system";
import { PriceService } from "~/lib/price-service";

// Import Farcaster mini app SDK
import { sdk } from "@farcaster/miniapp-sdk";

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
  const { address, isConnected } = useAccount();
  const {
    profile,
    loading: profileLoading,
    error: profileError,
  } = useUserProfile(address);
  const {
    transactions,
    loading: txLoading,
    error: txError,
  } = useTransactions(address);

  // Transaction state
  const [tradeState, setTradeState] = useState<{
    status: "idle" | "pending" | "success" | "error";
    type?: "buy" | "sell";
    error?: string;
    hash?: string;
    pointsEarned?: number;
  }>({ status: "idle" });

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: tradeState.hash as `0x${string}`,
  });

  const formatTime = (
    timestamp: Timestamp | Date | string | null | undefined
  ) => {
    if (!timestamp) return "Unknown";
    const date =
      timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  const handleDynamicTrade = useCallback(
    async (type: "buy" | "sell") => {
      if (!address || !isConnected) {
        setTradeState({
          status: "error",
          error: "Wallet not connected",
        });
        return;
      }

      setTradeState({
        status: "pending",
        type,
      });

      try {
        console.log(`Executing dynamic $1 ${type} trade`);

        // Get current price data for accurate calculations
        let priceData;
        try {
          priceData = await PriceService.getPriceData();
          console.log("Current price data:", priceData);
        } catch (priceError) {
          console.warn("Failed to get price data, using fallback:", priceError);
          // Use fallback prices
          priceData = {
            ethPrice: 3000,
            pTradoorPrice: 0.045,
            lastUpdated: Date.now(),
            source: "fallback",
          };
        }

        // Use Farcaster's native swap functionality
        let swapResult;

        if (type === "buy") {
          // Buy: ETH → pTradoor
          // Calculate ETH amount for $1 USD
          const ethAmountForOneDollar = 1 / priceData.ethPrice;
          const ethAmountInWei = Math.floor(
            ethAmountForOneDollar * 1e18
          ).toString();

          swapResult = await sdk.actions.swapToken({
            sellToken:
              "eip155:8453/erc20:0x4200000000000000000000000000000000000006", // WETH
            buyToken:
              "eip155:8453/erc20:0x41Ed0311640A5e489A90940b1c33433501a21B07", // pTradoor
            sellAmount: ethAmountInWei, // ETH amount worth $1
          });
        } else {
          // Sell: pTradoor → ETH
          // Calculate the amount of pTradoor tokens that equals $1 USD
          const tokenAmountForOneDollar = 1 / priceData.pTradoorPrice;
          const tokenAmountInWei = Math.floor(
            tokenAmountForOneDollar * 1e18
          ).toString();

          console.log(
            `Selling ${tokenAmountForOneDollar} pTradoor tokens (worth $1)`
          );

          swapResult = await sdk.actions.swapToken({
            sellToken:
              "eip155:8453/erc20:0x41Ed0311640A5e489A90940b1c33433501a21B07", // pTradoor
            buyToken:
              "eip155:8453/erc20:0x4200000000000000000000000000000000000006", // WETH
            sellAmount: tokenAmountInWei, // Amount of pTradoor tokens worth $1
          });
        }

        console.log("Farcaster swap result:", swapResult);

        // Check if the swap was actually completed or cancelled
        if (!swapResult || !swapResult.success) {
          console.log("Swap was cancelled or failed");
          setTradeState({
            status: "error",
            type,
            error: "Swap was cancelled or failed",
          });
          return;
        }

        // Only proceed with trading system if swap was successful
        const tradingResult = await TradingSystem.executeFixedTrade({
          userAddress: address,
          type,
          txHash: "farcaster_swap", // Use placeholder since SDK doesn't provide txHash
        });

        if (tradingResult.success) {
          setTradeState({
            status: "success",
            type,
            hash: "farcaster_swap", // Use placeholder since SDK doesn't provide txHash
            pointsEarned: tradingResult.pointsEarned,
          });

          console.log(
            `Trade completed! Earned ${tradingResult.pointsEarned} points`
          );
        } else {
          setTradeState({
            status: "error",
            type,
            error: tradingResult.error || "Trade processing failed",
          });
        }
      } catch (error) {
        console.error(`${type} trade failed:`, error);
        setTradeState({
          status: "error",
          type,
          error: error instanceof Error ? error.message : "Transaction failed",
        });
      }
    },
    [address, isConnected]
  );

  const handleBuy = useCallback(() => {
    handleDynamicTrade("buy");
  }, [handleDynamicTrade]);

  const handleSell = useCallback(() => {
    handleDynamicTrade("sell");
  }, [handleDynamicTrade]);

  if (profileLoading || txLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">
          Loading trading data...
        </span>
      </div>
    );
  }

  if (profileError || txError) {
    return (
      <div className="text-center py-4">
        <div className="text-sm text-red-500 mb-2">
          Failed to load trading data
        </div>
        <div className="text-xs text-muted-foreground">
          {profileError || txError}
        </div>
      </div>
    );
  }

  if (!profile) {
    console.log("No profile found for address:", address);
    console.log("Profile loading state:", {
      profileLoading,
      profileError,
      address,
      isConnected,
    });
    return (
      <div className="text-center py-4">
        <div className="text-sm text-muted-foreground">No profile found</div>
        <div className="text-xs text-muted-foreground mt-1">
          {isConnected
            ? "Profile is being created..."
            : "Connect your wallet to start trading"}
        </div>
        {profileError && (
          <div className="text-xs text-red-500 mt-2">Error: {profileError}</div>
        )}
      </div>
    );
  }

  const currentTier = rankTiers.find(
    (tier) =>
      profile.totalPoints >= tier.minPoints &&
      profile.totalPoints < tier.maxPoints
  );
  const nextTier = rankTiers.find(
    (tier) => tier.minPoints > profile.totalPoints
  );

  const progressToNext = nextTier
    ? ((profile.totalPoints - currentTier!.minPoints) /
        (nextTier.minPoints - currentTier!.minPoints)) *
      100
    : 100;

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
                  {(profile.totalPoints / 1000).toFixed(2)}K
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">pTradoor</span>
                <span className="text-sm font-bold">
                  {Math.round(profile.ptradoorBalance / 1000)}K
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
                    {(() => {
                      const pointsNeeded =
                        nextTier.minPoints - profile.totalPoints;
                      return pointsNeeded > 0
                        ? pointsNeeded.toLocaleString()
                        : "0";
                    })()}{" "}
                    more
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
              <p className="text-xs text-muted-foreground mb-2">
                $1.00 → pTRADOOR
              </p>
              <Button
                size="sm"
                className="w-full bg-green-600 hover:bg-green-700 text-white text-xs"
                onClick={handleBuy}
                disabled={isConfirming || tradeState.status === "pending"}
              >
                {isConfirming ||
                (tradeState.status === "pending" &&
                  tradeState.type === "buy") ? (
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                ) : (
                  "Buy"
                )}
                {tradeState.status === "pending" &&
                  tradeState.type === "buy" &&
                  "..."}
              </Button>
              {tradeState.status === "error" && tradeState.type === "buy" && (
                <div className="text-xs text-red-500 mt-2 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {tradeState.error}
                </div>
              )}
              {tradeState.status === "success" && tradeState.type === "buy" && (
                <div className="text-xs text-green-500 mt-2">
                  Success! +{tradeState.pointsEarned} pts
                </div>
              )}
            </div>
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-medium text-red-500">Sell</h4>
                <ArrowUpRight className="h-3 w-3 text-red-500" />
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                pTRADOOR → $1.00
              </p>
              <Button
                size="sm"
                className="w-full bg-red-600 hover:bg-red-700 text-white text-xs"
                onClick={handleSell}
                disabled={isConfirming || tradeState.status === "pending"}
              >
                {isConfirming ||
                (tradeState.status === "pending" &&
                  tradeState.type === "sell") ? (
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                ) : (
                  "Sell"
                )}
                {tradeState.status === "pending" &&
                  tradeState.type === "sell" &&
                  "..."}
              </Button>
              {tradeState.status === "error" && tradeState.type === "sell" && (
                <div className="text-xs text-red-500 mt-2 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {tradeState.error}
                </div>
              )}
              {tradeState.status === "success" &&
                tradeState.type === "sell" && (
                  <div className="text-xs text-green-500 mt-2">
                    Success! +{tradeState.pointsEarned} pts
                  </div>
                )}
            </div>
          </div>

          <div className="text-center text-xs text-muted-foreground">
            Each $1 trade earns {profile?.hasMinted ? "15" : "5"} points
            {profile?.hasMinted && (
              <span className="text-green-500 ml-1">
                (3x multiplier active)
              </span>
            )}
          </div>

          {tradeState.status === "pending" && (
            <div className="text-center text-xs text-blue-500 mt-2 flex items-center justify-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Swap window open - complete the transaction to earn points
            </div>
          )}
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
            {transactions.length === 0 ? (
              <div className="text-center py-4">
                <div className="text-sm text-muted-foreground">
                  No transactions yet
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Start trading to see your history
                </div>
              </div>
            ) : (
              transactions.map((transaction) => (
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
                        {transaction.amount
                          ? transaction.amount.toLocaleString()
                          : "0"}{" "}
                        pTRADOOR
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ${transaction.price || 0} •{" "}
                        {formatTime(transaction.timestamp)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-500">
                      +{transaction.points} pts
                    </div>
                    <Badge
                      variant={
                        transaction.status === "completed"
                          ? "default"
                          : "outline"
                      }
                    >
                      {transaction.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
