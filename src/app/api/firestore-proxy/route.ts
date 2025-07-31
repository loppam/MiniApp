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
    console.log("Handling action:", action, "for address:", address);

    switch (action) {
      case "updateProfile":
        console.log("Updating profile for:", address);
        await userService.upsertUserProfile(address, data);
        console.log("Profile updated successfully");
        return { success: true };

      case "addTransaction":
        console.log("Adding transaction for:", address);
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
        console.log("Transaction added successfully:", transactionId);
        return { success: true, data: { transactionId } };

      case "updateUserPoints":
        console.log(
          "Updating user points for:",
          address,
          "points:",
          data.points
        );
        await userService.updateUserPoints(address, data.points as number);
        console.log("User points updated successfully");
        return { success: true };

      case "checkAchievements":
        console.log("Checking achievements for:", address);
        const achievements = await achievementService.checkAndAwardAchievements(
          address
        );
        console.log("Achievements checked successfully:", achievements);
        return { success: true, data: { achievements } };

      case "initializeUser":
        console.log("Initializing user:", {
          address,
          profileData: data.profileData,
          context: data.context,
        });
        try {
          await userService.upsertUserProfile(
            address,
            data.profileData as Record<string, unknown>,
            data.context as Record<string, unknown>
          );
          console.log("User initialization completed successfully");
          return { success: true };
        } catch (initError) {
          console.error("User initialization failed:", initError);
          return {
            success: false,
            error:
              initError instanceof Error
                ? initError.message
                : "Initialization failed",
          };
        }

      case "updateLeaderboardEntry":
        console.log("Updating leaderboard entry for:", address);
        await leaderboardService.updateLeaderboardEntry(
          address,
          data.points as number,
          data.tier as string
        );
        console.log("Leaderboard entry updated successfully");
        return { success: true };

      case "executeTrade":
        console.log("Executing trade for:", address);
        await transactionService.addTransaction({
          userAddress: address,
          type: data.type as
            | "buy"
            | "sell"
            | "base_transaction"
            | "streak_bonus",
          amount: data.amount as number,
          price: data.price as number,
          points: 5, // Each trade earns 5 points
          status: "completed",
          metadata: {
            chainId: 8453, // Base chain
          },
        });
        console.log("Trade executed successfully");
        return { success: true };

      case "testConnection":
        console.log("Testing Firebase connection...");
        const isConnected = await userService.testConnection();
        console.log("Firebase connection test result:", isConnected);
        return { success: isConnected, data: { connected: isConnected } };

      default:
        console.error("Unknown action:", action);
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
    console.log("Firestore proxy request received");
    const body: FirestoreProxyRequest = await request.json();
    const { address, message, signature, action, data } = body;

    console.log("Request details:", { address, action, hasData: !!data });

    // Validate required fields
    if (!address || !message || !signature || !action) {
      console.error("Missing required fields:", {
        address: !!address,
        message: !!message,
        signature: !!signature,
        action: !!action,
      });
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      console.error("Invalid address format:", address);
      return NextResponse.json(
        { success: false, error: "Invalid address format" },
        { status: 400 }
      );
    }

    // Verify the signature
    console.log("Verifying signature...");
    const isValidSignature = await verifyWalletSignature(
      address,
      message,
      signature
    );
    console.log("Signature verification result:", {
      address,
      action,
      isValidSignature,
    });
    if (!isValidSignature) {
      console.error("Invalid signature");
      return NextResponse.json(
        { success: false, error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Extract timestamp from message to prevent replay attacks
    const timestampMatch = message.match(/at (\d+)$/);
    if (!timestampMatch) {
      console.error("Invalid message format:", message);
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
      console.error("Message too old:", {
        messageTimestamp,
        currentTime,
        timeWindow,
      });
      return NextResponse.json(
        { success: false, error: "Message too old" },
        { status: 400 }
      );
    }

    // Handle the Firestore action
    console.log("Handling Firestore action:", action);
    const result = await handleFirestoreAction(address, action, data || {});
    console.log("Firestore action result:", result);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      console.error("Firestore action failed:", result.error);
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
