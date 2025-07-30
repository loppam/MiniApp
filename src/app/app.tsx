"use client";

import dynamic from "next/dynamic";
import ReactDOM from "react-dom";

const TradoorApp = dynamic(() => import("~/components/TradoorApp"), {
  ssr: false,
});

export default function App() {
  ReactDOM.preconnect("https://auth.farcaster.xyz");

  return <TradoorApp />;
}
