import { NextRequest, NextResponse } from "next/server";
import { TokenMonitor } from "~/lib/token-monitor";

export async function POST(request: NextRequest) {
  try {
    const { action, address, fromBlock, toBlock } = await request.json();

    console.log("Token monitor request:", {
      action,
      address,
      fromBlock,
      toBlock,
    });

    switch (action) {
      case "monitor_address":
        if (!address) {
          return NextResponse.json(
            { error: "Address is required for monitor_address action" },
            { status: 400 }
          );
        }

        const addressResult = await TokenMonitor.monitorAddressTransactions(
          address,
          fromBlock ? BigInt(fromBlock) : undefined,
          toBlock ? BigInt(toBlock) : undefined
        );

        return NextResponse.json({
          success: true,
          result: addressResult,
        });

      case "monitor_recent":
        const recentResult = await TokenMonitor.monitorRecentTransactions(
          fromBlock ? BigInt(fromBlock) : undefined,
          toBlock ? BigInt(toBlock) : undefined
        );

        return NextResponse.json({
          success: true,
          result: recentResult,
        });

      case "get_price":
        const price = await TokenMonitor.getTokenPrice();
        return NextResponse.json({
          success: true,
          price,
        });

      default:
        return NextResponse.json(
          {
            error:
              "Invalid action. Use 'monitor_address', 'monitor_recent', or 'get_price'",
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Token monitor API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const address = searchParams.get("address");

    console.log("Token monitor GET request:", { action, address });

    if (action === "get_price") {
      const price = await TokenMonitor.getTokenPrice();
      return NextResponse.json({
        success: true,
        price,
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'get_price'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Token monitor GET API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
