"use client";

import dynamic from "next/dynamic";
import ReactDOM from "react-dom";
import "./globals.css";

const TradoorApp = dynamic(() => import("~/components/TradoorApp"), {
  ssr: false,
});

export default function App({ title }: { title?: string }) {
  ReactDOM.preconnect("https://auth.farcaster.xyz");

  return <TradoorApp title={title} />;
}
