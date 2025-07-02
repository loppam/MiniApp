import { Metadata } from "next";

const appUrl = process.env.NEXT_PUBLIC_URL || 'https://frames-v2-demo.vercel.app';

const frame = {
  version: "next",
  imageUrl: `${appUrl}/opengraph-image`,
  button: {
    title: "Swap & Send",
    action: {
      type: "launch_frame",
      name: "Swap & Send Demo",
      url: `${appUrl}/swaps`,
      splashImageUrl: `${appUrl}/splash.png`,
      splashBackgroundColor: "#f7f7f7",
    },
  },
};

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Swap & Send Demo",
    description: "Test swapping USDC to DEGEN and sending DEGEN on Base",
    openGraph: {
      title: "Swap & Send Demo",
      description: "Test swapping USDC to DEGEN and sending DEGEN on Base",
    },
    other: {
      "fc:frame": JSON.stringify(frame),
      "fc:miniapp": JSON.stringify(frame),
    },
  };
}

export default function SwapsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}