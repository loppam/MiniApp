import { useAccount, useSignMessage, useWalletClient } from "wagmi";

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

// Make a secure request to the Firestore proxy
async function makeSecureRequest(
  address: string,
  action: string,
  data?: Record<string, unknown>,
  signMessage?: (message: string) => Promise<string>
): Promise<SecureFirestoreResponse> {
  try {
    console.log("Making secure request:", { address, action, data });
    
    const message = generateMessage(address, action);
    let signature = "";

    if (signMessage) {
      console.log("Signing message:", message);
      signature = await signMessage(message);
      console.log("Message signed successfully");
    } else {
      // Fallback for when signMessage is not available
      console.warn("Message signing not available");
      return {
        success: false,
        error: "Message signing not available",
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
  private signMessage?: (message: string) => Promise<string>;

  constructor(
    address: string,
    signMessage?: (message: string) => Promise<string>
  ) {
    this.address = address;
    this.signMessage = signMessage;
  }

  // Update user profile
  async updateProfile(
    profileData: Record<string, unknown>
  ): Promise<SecureFirestoreResponse> {
    return makeSecureRequest(
      this.address,
      "updateProfile",
      profileData,
      this.signMessage
    );
  }

  // Add a transaction
  async addTransaction(
    transactionData: Record<string, unknown>
  ): Promise<SecureFirestoreResponse> {
    return makeSecureRequest(
      this.address,
      "addTransaction",
      transactionData,
      this.signMessage
    );
  }

  // Update user points
  async updateUserPoints(points: number): Promise<SecureFirestoreResponse> {
    return makeSecureRequest(
      this.address,
      "updateUserPoints",
      { points },
      this.signMessage
    );
  }

  // Check and award achievements
  async checkAchievements(): Promise<SecureFirestoreResponse> {
    return makeSecureRequest(
      this.address,
      "checkAchievements",
      undefined,
      this.signMessage
    );
  }

  // Initialize user
  async initializeUser(
    profileData: Record<string, unknown>,
    context?: Record<string, unknown>
  ): Promise<SecureFirestoreResponse> {
    return makeSecureRequest(
      this.address,
      "initializeUser",
      {
        profileData,
        context,
      },
      this.signMessage
    );
  }

  // Update leaderboard entry
  async updateLeaderboardEntry(
    points: number,
    tier: string
  ): Promise<SecureFirestoreResponse> {
    return makeSecureRequest(
      this.address,
      "updateLeaderboardEntry",
      {
        points,
        tier,
      },
      this.signMessage
    );
  }

  // Execute a trade
  async executeTrade(
    type: "buy" | "sell",
    amount: number,
    price: number
  ): Promise<SecureFirestoreResponse> {
    return makeSecureRequest(
      this.address,
      "executeTrade",
      {
        type,
        amount,
        price,
      },
      this.signMessage
    );
  }

  // Test Firebase connection
  async testConnection(): Promise<SecureFirestoreResponse> {
    return makeSecureRequest(
      this.address,
      "testConnection",
      undefined,
      this.signMessage
    );
  }
}

// Hook to use secure Firestore with wagmi
export function useSecureFirestore() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { data: walletClient } = useWalletClient();

  console.log("useSecureFirestore:", {
    address,
    hasSignMessageAsync: !!signMessageAsync,
    hasWalletClient: !!walletClient,
  });

  if (!address) {
    console.log("No address, returning null");
    return null;
  }

  if (!signMessageAsync) {
    console.log("No signMessageAsync, returning null");
    return null;
  }

  // Wrap signMessageAsync to match the expected signature
  const signMessage = (message: string) => signMessageAsync({ message });

  console.log("Creating SecureFirestoreClient");
  return new SecureFirestoreClient(address, signMessage);
}

// Factory function to create a secure Firestore client
export function createSecureFirestoreClient(
  address: string,
  signMessage?: (message: string) => Promise<string>
): SecureFirestoreClient {
  return new SecureFirestoreClient(address, signMessage);
}
