import { NextRequest, NextResponse } from "next/server";
import { DynamicTradingService } from "~/lib/dynamic-trading";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trustedData, untrustedData } = body;

    // Extract user information if available
    const userFid = trustedData?.messageBytes?.fid || untrustedData?.fid;
    const username =
      trustedData?.messageBytes?.username || untrustedData?.username;
    const userAddress =
      trustedData?.messageBytes?.userAddress || untrustedData?.userAddress;

    // Check if this is a trading action
    const action = trustedData?.messageBytes?.action || untrustedData?.action;

    if (action === "trade") {
      const tradeType =
        trustedData?.messageBytes?.tradeType || untrustedData?.tradeType;
      const usdAmount = parseFloat(
        trustedData?.messageBytes?.usdAmount || untrustedData?.usdAmount || "1"
      );

      if (!userAddress) {
        return NextResponse.json(
          {
            error: "User address not provided",
          },
          { status: 400 }
        );
      }

      if (!tradeType || !["buy", "sell"].includes(tradeType)) {
        return NextResponse.json(
          {
            error: "Invalid trade type",
          },
          { status: 400 }
        );
      }

      // Prepare the trading transaction
      const tradeResult = await DynamicTradingService.executeDynamicTrade({
        userAddress,
        type: tradeType as "buy" | "sell",
        usdAmount,
        slippageTolerance: 0.005, // 0.5% slippage
      });

      if (!tradeResult.success) {
        return NextResponse.json(
          {
            error: tradeResult.error || "Trade preparation failed",
          },
          { status: 400 }
        );
      }

      // Validate transactions for Farcaster frame
      const validTransactions = tradeResult.transactions.filter((tx) =>
        DynamicTradingService.validateTransactionForFrame(tx)
      );

      if (validTransactions.length === 0) {
        return NextResponse.json(
          {
            error: "No valid transactions generated",
          },
          { status: 400 }
        );
      }

      // Return the first transaction for the frame
      // In a production environment, you might want to handle multiple transactions
      const transaction = validTransactions[0];

      return NextResponse.json({
        chainId: transaction.chainId,
        method: "eth_sendTransaction",
        params: {
          to: transaction.to,
          data: transaction.data,
          value:
            transaction.value !== undefined
              ? `0x${transaction.value.toString(16)}`
              : "0x0",
        },
        abi: [], // ABI not needed for frame transactions
      });
    }

    // Default redirect for non-trading actions
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
