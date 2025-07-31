import { useAccount } from "wagmi";
import sdk from "@farcaster/miniapp-sdk";

// Types for the API
interface SecureFirestoreResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

// Generate a unique message for each action
function generateMessage(address: string, action: string): string {
  const timestamp = Date.now();
  return `Tradoor ${action} for ${address} at ${timestamp}`;
}

// Make a secure request to the Firestore proxy using Farcaster SDK directly
async function makeSecureRequest(
  address: string,
  action: string,
  data?: Record<string, unknown>
): Promise<SecureFirestoreResponse> {
  try {
    console.log("Making secure request:", { address, action, data });

    const message = generateMessage(address, action);
    let signature = "";

    try {
      console.log("Signing message with Farcaster SDK:", message);

      // Try different signing methods that might be supported by Farcaster Wallet
      let signedMessage;

      try {
        // Try personal_sign first (most common)
        signedMessage = await sdk.wallet.ethProvider.request({
          method: "personal_sign",
          params: [message as `0x${string}`, address as `0x${string}`],
        });
        console.log("Message signed successfully with personal_sign");
      } catch (personalSignError) {
        console.log("personal_sign failed, trying eth_signTypedData_v4");

        try {
          // Try eth_signTypedData_v4 as fallback
          const typedData = {
            types: {
              EIP712Domain: [
                { name: "name", type: "string" },
                { name: "version", type: "string" },
                { name: "chainId", type: "uint256" },
              ],
              Message: [{ name: "content", type: "string" }],
            },
            primaryType: "Message",
            domain: {
              name: "Tradoor",
              version: "1",
              chainId: 8453, // Base chain
            },
            message: {
              content: message,
            },
          };

          signedMessage = await sdk.wallet.ethProvider.request({
            method: "eth_signTypedData_v4",
            params: [address as `0x${string}`, JSON.stringify(typedData)],
          });
          console.log("Message signed successfully with eth_signTypedData_v4");
        } catch (typedDataError) {
          console.log("eth_signTypedData_v4 failed, trying eth_sign");

          try {
            // Try eth_sign as last resort
            signedMessage = await sdk.wallet.ethProvider.request({
              method: "eth_sign",
              params: [address as `0x${string}`, message as `0x${string}`],
            });
            console.log("Message signed successfully with eth_sign");
          } catch (ethSignError) {
            console.error("All signing methods failed:", {
              personalSignError,
              typedDataError,
              ethSignError,
            });
            throw new Error("No supported signing method found");
          }
        }
      }

      signature = signedMessage as string;
      console.log("Message signed successfully with Farcaster SDK");
    } catch (signError) {
      console.error("Failed to sign message with Farcaster SDK:", signError);
      return {
        success: false,
        error: "Failed to sign message",
      };
    }

    console.log("Sending request to /api/firestore-proxy");
    const response = await fetch("/api/firestore-proxy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        address,
        message,
        signature,
        action,
        data,
      }),
    });

    console.log("Response status:", response.status);
    const result = await response.json();
    console.log("Response result:", result);

    return result;
  } catch (error) {
    console.error("Secure Firestore request failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Request failed",
    };
  }
}

// Secure Firestore Client
export class SecureFirestoreClient {
  private address: string;

  constructor(address: string) {
    this.address = address;
  }

  // Update user profile
  async updateProfile(
    profileData: Record<string, unknown>
  ): Promise<SecureFirestoreResponse> {
    return makeSecureRequest(this.address, "updateProfile", profileData);
  }

  // Add a transaction
  async addTransaction(
    transactionData: Record<string, unknown>
  ): Promise<SecureFirestoreResponse> {
    return makeSecureRequest(this.address, "addTransaction", transactionData);
  }

  // Update user points
  async updateUserPoints(points: number): Promise<SecureFirestoreResponse> {
    return makeSecureRequest(this.address, "updateUserPoints", { points });
  }

  // Check and award achievements
  async checkAchievements(): Promise<SecureFirestoreResponse> {
    return makeSecureRequest(this.address, "checkAchievements");
  }

  // Initialize user
  async initializeUser(
    profileData: Record<string, unknown>,
    context?: Record<string, unknown>
  ): Promise<SecureFirestoreResponse> {
    try {
      console.log("Initializing user without signature (first-time user)");

      const response = await fetch("/api/firestore-proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: this.address,
          action: "initializeUser",
          data: {
            profileData,
            context,
          },
        }),
      });

      console.log("Response status:", response.status);
      const result = await response.json();
      console.log("Response result:", result);

      return result;
    } catch (error) {
      console.error("Initialize user request failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Request failed",
      };
    }
  }

  // Update leaderboard entry
  async updateLeaderboardEntry(
    points: number,
    tier: string
  ): Promise<SecureFirestoreResponse> {
    return makeSecureRequest(this.address, "updateLeaderboardEntry", {
      points,
      tier,
    });
  }

  // Execute a trade
  async executeTrade(
    type: "buy" | "sell",
    amount: number,
    price: number
  ): Promise<SecureFirestoreResponse> {
    return makeSecureRequest(this.address, "executeTrade", {
      type,
      amount,
      price,
    });
  }

  // Test Firebase connection
  async testConnection(): Promise<SecureFirestoreResponse> {
    return makeSecureRequest(this.address, "testConnection");
  }
}

// Hook to use secure Firestore with Farcaster SDK
export function useSecureFirestore() {
  const { address } = useAccount();

  console.log("useSecureFirestore:", {
    address,
    hasSDK: !!sdk,
  });

  if (!address) {
    console.log("No address, returning null");
    return null;
  }

  if (!sdk) {
    console.log("No Farcaster SDK, returning null");
    return null;
  }

  console.log("Creating SecureFirestoreClient with Farcaster SDK");
  return new SecureFirestoreClient(address);
}

// Factory function to create a secure Firestore client
export function createSecureFirestoreClient(
  address: string
): SecureFirestoreClient {
  return new SecureFirestoreClient(address);
}
