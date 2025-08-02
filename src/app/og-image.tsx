import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontFamily: "system-ui",
        }}
      >
        <div
          style={{
            fontSize: 120,
            marginBottom: 20,
          }}
        >
          🏆
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: "bold",
            marginBottom: 20,
          }}
        >
          Tradoor
        </div>
        <div
          style={{
            fontSize: 32,
            marginBottom: 40,
            opacity: 0.9,
          }}
        >
          Base Chain&apos;s Premier Trading Platform
        </div>
        <div
          style={{
            display: "flex",
            gap: 40,
            fontSize: 24,
            opacity: 0.8,
          }}
        >
          <div>📈 Earn Points</div>
          <div>🏅 Climb Rankings</div>
          <div>🎯 Unlock Achievements</div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
