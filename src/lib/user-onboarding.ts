import { userService, achievementService } from "./firebase-services";
import { UserProfile } from "~/types/firebase";

// Import types from firebase-services
interface UserContext {
  fid?: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

interface ContextData {
  user?: UserContext;
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
}

export interface OnboardingProgress {
  steps: OnboardingStep[];
  currentStep: number;
  completed: boolean;
  totalSteps: number;
  completedSteps: number;
}

export class UserOnboardingService {
  private static readonly ONBOARDING_STEPS: Omit<
    OnboardingStep,
    "completed"
  >[] = [
    {
      id: "wallet-connect",
      title: "Connect Wallet",
      description: "Connect your wallet to start earning points",
      required: true,
    },
    {
      id: "farcaster-sync",
      title: "Sync Farcaster Profile",
      description: "Import your Farcaster profile data",
      required: false,
    },
    {
      id: "initial-points",
      title: "Calculate Initial Points",
      description: "Calculate points based on your Base chain activity",
      required: true,
    },
    {
      id: "first-trade",
      title: "Make Your First Trade",
      description: "Complete your first pTradoor transaction",
      required: false,
    },
    {
      id: "achievement-unlock",
      title: "Unlock First Achievement",
      description: "Earn your first achievement badge",
      required: false,
    },
  ];

  // Initialize user onboarding
  static async initializeUser(
    address: string,
    context?: ContextData
  ): Promise<OnboardingProgress> {
    try {
      // Create or update user profile
      await userService.upsertUserProfile(address, {}, context);

      // Get user profile to check current state
      const profile = await userService.getUserProfile(address);
      if (!profile) {
        throw new Error("Failed to create user profile");
      }

      // Calculate onboarding progress
      const progress = this.calculateOnboardingProgress(profile);

      // Check for achievements
      await achievementService.checkAndAwardAchievements(address);

      return progress;
    } catch (error) {
      console.error("Error initializing user:", error);
      throw error;
    }
  }

  // Calculate onboarding progress based on user state
  static calculateOnboardingProgress(profile: UserProfile): OnboardingProgress {
    const steps = this.ONBOARDING_STEPS.map((step) => ({
      ...step,
      completed: this.isStepCompleted(step.id, profile),
    }));

    const completedSteps = steps.filter((step) => step.completed).length;
    const currentStep = steps.findIndex((step) => !step.completed) + 1;
    const completed = steps.every((step) => !step.required || step.completed);

    return {
      steps,
      currentStep,
      completed,
      totalSteps: steps.length,
      completedSteps,
    };
  }

  // Check if a specific onboarding step is completed
  private static isStepCompleted(
    stepId: string,
    profile: UserProfile
  ): boolean {
    switch (stepId) {
      case "wallet-connect":
        return !!profile.address;

      case "farcaster-sync":
        return !!(profile.fid || profile.username || profile.displayName);

      case "initial-points":
        return profile.totalPoints > 0;

      case "first-trade":
        return profile.totalTransactions > 0;

      case "achievement-unlock":
        return profile.achievements.length > 0;

      default:
        return false;
    }
  }

  // Sync Farcaster context data
  static async syncFarcasterData(
    address: string,
    context: ContextData
  ): Promise<void> {
    try {
      const farcasterData = {
        fid: context?.user?.fid,
        username: context?.user?.username,
        displayName: context?.user?.displayName,
        pfpUrl: context?.user?.pfpUrl,
      };

      await userService.upsertUserProfile(address, farcasterData, context);
    } catch (error) {
      console.error("Error syncing Farcaster data:", error);
      throw error;
    }
  }

  // Get user onboarding status
  static async getOnboardingStatus(
    address: string
  ): Promise<OnboardingProgress | null> {
    try {
      const profile = await userService.getUserProfile(address);
      if (!profile) return null;

      return this.calculateOnboardingProgress(profile);
    } catch (error) {
      console.error("Error getting onboarding status:", error);
      return null;
    }
  }

  // Complete a specific onboarding step
  static async completeOnboardingStep(
    address: string,
    stepId: string
  ): Promise<void> {
    try {
      const profile = await userService.getUserProfile(address);
      if (!profile) throw new Error("User profile not found");

      switch (stepId) {
        case "first-trade":
          // This will be handled by the trading system
          break;

        case "achievement-unlock":
          // This will be handled by the achievement system
          break;

        default:
          console.log(`Step ${stepId} completed automatically`);
      }
    } catch (error) {
      console.error("Error completing onboarding step:", error);
      throw error;
    }
  }

  // Get onboarding welcome message
  static getWelcomeMessage(profile: UserProfile): string {
    if (profile.totalPoints > 0) {
      return `Welcome back! You have ${profile.totalPoints} points and are ${profile.tier} tier.`;
    } else {
      return "Welcome to Tradoor! Connect your wallet to start earning points.";
    }
  }

  // Get onboarding tips
  static getOnboardingTips(progress: OnboardingProgress): string[] {
    const tips: string[] = [];

    if (!progress.steps.find((s) => s.id === "wallet-connect")?.completed) {
      tips.push(
        "Connect your wallet to start earning points from your Base chain activity"
      );
    }

    if (!progress.steps.find((s) => s.id === "farcaster-sync")?.completed) {
      tips.push("Sync your Farcaster profile to personalize your experience");
    }

    if (!progress.steps.find((s) => s.id === "first-trade")?.completed) {
      tips.push("Make your first pTradoor trade to earn additional points");
    }

    if (!progress.steps.find((s) => s.id === "achievement-unlock")?.completed) {
      tips.push("Complete tasks to unlock achievements and earn bonus points");
    }

    return tips;
  }
}
