import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");
    const fid = searchParams.get("fid");

    if (!username && !fid) {
      return NextResponse.json(
        { error: "Username or FID is required" },
        { status: 400 }
      );
    }

    let url: string;
    if (username) {
      url = `https://api.farcaster.xyz/v2/users?username=${encodeURIComponent(
        username
      )}`;
    } else {
      url = `https://api.farcaster.xyz/v2/users/${fid}`;
    }

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`Farcaster API error: ${response.status}`);
      return NextResponse.json(
        { error: "Failed to fetch user data" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in Farcaster API proxy:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
