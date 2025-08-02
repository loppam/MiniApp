interface FarcasterUser {
  object: "user";
  fid: number;
  username: string;
  displayName: string;
  pfp_url: string;
  profile: {
    bio: {
      text: string;
    };
  };
  followerCount: number;
  followingCount: number;
  verifications: string[];
  activeStatus: "active" | "inactive";
}

interface FarcasterApiResponse {
  users: FarcasterUser[];
}

export class FarcasterApiService {
  private static readonly API_BASE = "https://api.farcaster.xyz/v2";

  // Get user data by FID
  static async getUserByFid(fid: number): Promise<FarcasterUser | null> {
    try {
      const response = await fetch(`${this.API_BASE}/users/${fid}`);

      if (!response.ok) {
        console.error(`Farcaster API error: ${response.status}`);
        return null;
      }

      const data = await response.json();
      return data.user || null;
    } catch (error) {
      console.error("Error fetching user from Farcaster API:", error);
      return null;
    }
  }

  // Get user data by username
  static async getUserByUsername(
    username: string
  ): Promise<FarcasterUser | null> {
    try {
      const response = await fetch(
        `${this.API_BASE}/users?username=${username}`
      );

      if (!response.ok) {
        console.error(`Farcaster API error: ${response.status}`);
        return null;
      }

      const data: FarcasterApiResponse = await response.json();
      return data.users?.[0] || null;
    } catch (error) {
      console.error("Error fetching user from Farcaster API:", error);
      return null;
    }
  }

  // Get user avatar URL by FID
  static async getAvatarUrlByFid(fid: number): Promise<string | null> {
    try {
      const user = await this.getUserByFid(fid);
      return user?.pfp_url || null;
    } catch (error) {
      console.error("Error fetching avatar URL:", error);
      return null;
    }
  }

  // Get user avatar URL by username
  static async getAvatarUrlByUsername(
    username: string
  ): Promise<string | null> {
    try {
      const user = await this.getUserByUsername(username);
      return user?.pfp_url || null;
    } catch (error) {
      console.error("Error fetching avatar URL:", error);
      return null;
    }
  }

  // Get complete user profile data
  static async getUserProfile(
    username?: string,
    fid?: number
  ): Promise<{
    username?: string;
    displayName?: string;
    avatarUrl?: string;
    bio?: string;
    followerCount?: number;
    followingCount?: number;
  } | null> {
    try {
      let user: FarcasterUser | null = null;

      if (fid) {
        user = await this.getUserByFid(fid);
      } else if (username) {
        user = await this.getUserByUsername(username);
      }

      if (!user) return null;

      return {
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.pfp_url,
        bio: user.profile?.bio?.text,
        followerCount: user.followerCount,
        followingCount: user.followingCount,
      };
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
  }
}
