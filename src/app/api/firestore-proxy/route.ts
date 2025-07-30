import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";
import {
  userService,
  transactionService,
  achievementService,
  leaderboardService,
} from "~/lib/firebase-services";

// Types for the API
interface FirestoreProxyRequest {
  address: string;
  message: string;
  signature: string;
  action: string;
  data?: Record<string, unknown>;
}

// Verify wallet signature
async function verifyWalletSignature(
  address: string,
  message: string,
  signature: string
): Promise<boolean> {
  try {
    const isValid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
    return isValid;
  } catch (error) {
    console.error("Signature verification failed:", error);
    return false;
  }
}

// Handle different Firestore actions
async function handleFirestoreAction(
  address: string,
  action: string,
  data: Record<string, unknown>
): Promise<{
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}> {
  try {
    switch (action) {
      case "updateProfile":
        await userService.upsertUserProfile(address, data);
        return { success: true };

      case "addTransaction":
        const transactionData = {
          userAddress: address,
          type: data.type as
            | "buy"
            | "sell"
            | "base_transaction"
            | "streak_bonus",
          amount: data.amount as number,
          price: data.price as number,
          points: data.points as number,
          status: data.status as "completed" | "pending" | "failed",
          txHash: data.txHash as string,
          metadata: data.metadata as Record<string, unknown>,
        };
        const transactionId = await transactionService.addTransaction(
          transactionData
        );
        return { success: true, data: { transactionId } };

      case "updateUserPoints":
        await userService.updateUserPoints(address, data.points as number);
        return { success: true };

      case "checkAchievements":
        const achievements = await achievementService.checkAndAwardAchievements(
          address
        );
        return { success: true, data: { achievements } };

      case "initializeUser":
        await userService.upsertUserProfile(
          address,
          data.profileData as Record<string, unknown>,
          data.context as Record<string, unknown>
        );
        return { success: true };

      case "updateLeaderboardEntry":
        await leaderboardService.updateLeaderboardEntry(
          address,
          data.points as number,
          data.tier as string
        );
        return { success: true };

      case "executeTrade":
        await transactionService.addTransaction({
          userAddress: address,
          type: data.type as "buy" | "sell" | "base_transaction" | "streak_bonus",
          amount: data.amount as number,
          price: data.price as number,
          points: 5, // Each trade earns 5 points
          status: "completed",
          metadata: {
            chainId: 8453, // Base chain
          },
        });
        return { success: true };

      default:
        return { success: false, error: "Unknown action" };
    }
  } catch (error) {
    console.error(`Error handling action ${action}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: FirestoreProxyRequest = await request.json();
    const { address, message, signature, action, data } = body;

    // Validate required fields
    if (!address || !message || !signature || !action) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { success: false, error: "Invalid address format" },
        { status: 400 }
      );
    }

    // Verify the signature
    const isValidSignature = await verifyWalletSignature(
      address,
      message,
      signature
    );
    if (!isValidSignature) {
      return NextResponse.json(
        { success: false, error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Extract timestamp from message to prevent replay attacks
    const timestampMatch = message.match(/at (\d+)$/);
    if (!timestampMatch) {
      return NextResponse.json(
        { success: false, error: "Invalid message format" },
        { status: 400 }
      );
    }

    const messageTimestamp = parseInt(timestampMatch[1]);
    const currentTime = Date.now();
    const timeWindow = 5 * 60 * 1000; // 5 minutes

    // Check if message is too old (replay attack prevention)
    if (currentTime - messageTimestamp > timeWindow) {
      return NextResponse.json(
        { success: false, error: "Message too old" },
        { status: 400 }
      );
    }

    // Handle the Firestore action
    const result = await handleFirestoreAction(address, action, data || {});

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Firestore proxy error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Optional: Add GET method for health checks
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: "ok",
    message: "Firestore proxy is running",
  });
}
