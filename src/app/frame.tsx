import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tradoor - Base Chain Trading Platform",
  description:
    "Join the premier trading platform on Base chain. Earn points, climb rankings, and trade with the best!",
  openGraph: {
    title: "Tradoor - Base Chain Trading",
    description:
      "Join the premier trading platform on Base chain. Earn points, climb rankings, and trade with the best!",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Tradoor - Base Chain Trading Platform",
      },
    ],
  },
  other: {
    "fc:frame": "vNext",
    "fc:frame:image": "/og-image.png",
    "fc:frame:button:1": "Launch Tradoor",
    "fc:frame:post_url": "/api/frame",
  },
};

export default function FramePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600">
      <div className="text-center text-white">
        <h1 className="text-4xl font-bold mb-4">🏆 Tradoor</h1>
        <p className="text-xl mb-8">Base Chain&apos;s Premier Trading Platform</p>
        <div className="space-y-2 text-lg">
          <p>• Earn points for every trade</p>
          <p>• Climb the leaderboard</p>
          <p>• Unlock achievements</p>
          <p>• Join the community</p>
        </div>
      </div>
    </div>
  );
}
