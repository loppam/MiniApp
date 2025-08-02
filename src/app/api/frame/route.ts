import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trustedData } = body;

    // Extract user information if available
    const userFid = trustedData?.messageBytes?.fid;
    const username = trustedData?.messageBytes?.username;

    // Redirect to the main app with referral info
    const appUrl = process.env.NEXT_PUBLIC_URL || "https://tradoor.vercel.app";
    const redirectUrl = `${appUrl}?ref=${username || "frame"}&fid=${
      userFid || ""
    }`;

    return NextResponse.json({
      framesRedirectUrl: redirectUrl,
    });
  } catch (error) {
    console.error("Frame API error:", error);

    // Fallback redirect
    const appUrl = process.env.NEXT_PUBLIC_URL || "https://tradoor.vercel.app";
    return NextResponse.json({
      framesRedirectUrl: appUrl,
    });
  }
}
