import { createConfig, http, WagmiProvider } from "wagmi";
import { base } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";

export const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  connectors: [farcasterMiniApp()],
});

const queryClient = new QueryClient();

export default function Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
