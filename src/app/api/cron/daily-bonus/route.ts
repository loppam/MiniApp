import { NextRequest, NextResponse } from "next/server";
import { TradingSystem } from "~/lib/trading-system";

// Vercel cron job endpoint - runs daily at 00:00 UTC
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron job request
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🕐 Daily bonus cron job triggered");

    // Distribute daily holding bonuses to all users
    const result = await TradingSystem.distributeDailyBonuses();

    console.log("✅ Daily bonus distribution completed:", result);

    return NextResponse.json({
      success: true,
      message: "Daily bonuses distributed successfully",
      result
    });

  } catch (error) {
    console.error("❌ Daily bonus cron job failed:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (action === "distribute") {
      console.log("🔄 Manual daily bonus distribution triggered");
      
      const result = await TradingSystem.distributeDailyBonuses();
      
      return NextResponse.json({
        success: true,
        message: "Manual bonus distribution completed",
        result
      });
    }
    
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("❌ Manual bonus distribution failed:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
