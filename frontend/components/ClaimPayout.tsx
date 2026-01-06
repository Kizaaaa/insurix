"use client";

import { useState, useEffect } from "react";
import { useWeb3 } from "@/lib/web3-context";
import { formatEther } from "ethers";
import { FLIGHT_STATUS } from "@/lib/contract";

export default function ClaimPayout() {
  const { contract, account } = useWeb3();
  const [policyId, setPolicyId] = useState("");
  const [claimStatus, setClaimStatus] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = async () => {
    if (!contract || !policyId) return;

    setIsChecking(true);
    setError(null);
    setClaimStatus(null);

    try {
      const status = await contract.checkClaimStatus(policyId);
      setClaimStatus({
        isClaimable: status[0],
        estimatedPayout: status[1],
        delayHours: status[2],
        flightStatus: status[3],
      });
    } catch (err: any) {
      console.error("Check failed:", err);
      setError(err.reason || err.message || "Failed to check claim status");
    } finally {
      setIsChecking(false);
    }
  };

  const processClaim = async () => {
    if (!contract || !policyId) return;

    setIsClaiming(true);
    setError(null);
    setTxHash(null);

    try {
      const tx = await contract.processClaim(policyId);
      setTxHash(tx.hash);
      await tx.wait();

      alert("Claim processed successfully!");
      
      // Refresh status
      setTimeout(() => checkStatus(), 2000);
    } catch (err: any) {
      console.error("Claim failed:", err);
      setError(err.reason || err.message || "Failed to process claim");
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        Check & Claim Payout
      </h2>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Policy ID
          </label>
          <div className="flex gap-3">
            <input
              type="number"
              value={policyId}
              onChange={(e) => {
                setPolicyId(e.target.value);
                setClaimStatus(null);
              }}
              placeholder="Enter policy ID"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={checkStatus}
              disabled={isChecking || !policyId || !account}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {isChecking ? "Checking..." : "Check Status"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {txHash && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-sm text-green-800 dark:text-green-300">
              Transaction:{" "}
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono underline"
              >
                {txHash.slice(0, 10)}...{txHash.slice(-8)}
              </a>
            </p>
          </div>
        )}

        {claimStatus && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 space-y-4">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
              Claim Status
            </h3>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600 dark:text-gray-400">Flight Status</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {FLIGHT_STATUS[claimStatus.flightStatus as keyof typeof FLIGHT_STATUS] || "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Delay Hours</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {claimStatus.delayHours.toString()} hours
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Claimable</p>
                <p className={`font-semibold ${claimStatus.isClaimable ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {claimStatus.isClaimable ? "Yes" : "No"}
                </p>
              </div>
              {claimStatus.isClaimable && (
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Estimated Payout</p>
                  <p className="font-semibold text-green-600 dark:text-green-400">
                    {parseFloat(formatEther(claimStatus.estimatedPayout)).toFixed(4)} ETH
                  </p>
                </div>
              )}
            </div>

            {claimStatus.isClaimable ? (
              <button
                onClick={processClaim}
                disabled={isClaiming}
                className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
              >
                {isClaiming ? "Processing Claim..." : "Claim Payout"}
              </button>
            ) : (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  {claimStatus.flightStatus === 0
                    ? "Flight data not yet reported by oracle."
                    : claimStatus.flightStatus === 1
                    ? "Flight was on time. No payout available."
                    : "This policy is not eligible for a claim."}
                </p>
              </div>
            )}
          </div>
        )}

        {!account && (
          <div className="text-center py-4 text-gray-600 dark:text-gray-400">
            Please connect your wallet to check claim status
          </div>
        )}
      </div>
    </div>
  );
}
