import React, { useEffect } from "react";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { parseEther, type Abi } from "viem";
import { Button } from "./ui/Button";
import { userService } from "~/lib/firebase-services";

const CONTRACT_ADDRESS: `0x${string}` =
  "0x1F0BF73C9648C57AE1Cf66bb1c2c4BE4209EA2c5";

const CONTRACT_ABI = [
  {
    inputs: [],
    name: "mint",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
] as const satisfies Abi;

export function MintNFT() {
  const { address } = useAccount();
  const {
    writeContract,
    data: hash,
    isPending,
    error: writeError,
  } = useWriteContract();
  const { isLoading, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    const markMinted = async () => {
      if (!address || !isSuccess) return;
      try {
        await userService.upsertUserProfile(address, { hasMinted: true });
      } catch (e) {
        console.error("Failed to set hasMinted after mint:", e);
      }
    };
    void markMinted();
  }, [address, isSuccess]);

  const handleMint = () => {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "mint",
      args: [],
      value: parseEther("0.0001"),
    });
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleMint}
        disabled={isPending || isLoading}
        className="w-full"
      >
        {isLoading ? "Minting..." : "Mint NFT (0.0001 ETH)"}
      </Button>
      {writeError && (
        <div className="text-xs text-red-500">
          {String(writeError.message || writeError)}
        </div>
      )}
      {isSuccess && hash && (
        <div className="text-xs">
          Successfully minted NFT!{" "}
          <a
            href={`https://basescan.org/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            View on Basescan
          </a>
        </div>
      )}
    </div>
  );
}

export default MintNFT;
