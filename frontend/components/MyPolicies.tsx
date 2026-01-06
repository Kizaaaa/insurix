"use client";

import { useState, useEffect } from "react";
import { useWeb3 } from "@/lib/web3-context";
import { formatEther } from "ethers";
import { format } from "date-fns";
import { POLICY_STATUS } from "@/lib/contract";

interface Policy {
  id: bigint;
  policyholder: string;
  flightNumber: string;
  departureTime: bigint;
  premiumPaid: bigint;
  maxPayout: bigint;
  purchaseTime: bigint;
  status: number;
  delayHours: bigint;
  payoutAmount: bigint;
}

export default function MyPolicies() {
  const { contract, account } = useWeb3();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (contract && account) {
      loadPolicies();
    }
  }, [contract, account, refreshTrigger]);

  const loadPolicies = async () => {
    if (!contract || !account) return;

    setIsLoading(true);
    try {
      const policyIds = await contract.getUserPolicies(account);
      
      const policyPromises = policyIds.map(async (id: bigint) => {
        const policy = await contract.getPolicy(id);
        return {
          id,
          policyholder: policy[0],
          flightNumber: policy[1],
          departureTime: policy[2],
          premiumPaid: policy[3],
          maxPayout: policy[4],
          purchaseTime: policy[5],
          status: policy[6],
          delayHours: policy[7],
          payoutAmount: policy[8],
        };
      });

      const loadedPolicies = await Promise.all(policyPromises);
      setPolicies(loadedPolicies);
    } catch (err) {
      console.error("Failed to load policies:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case 1: return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case 2: return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case 3: return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
      case 4: return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    }
  };

  if (!account) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <p className="text-center text-gray-600 dark:text-gray-400">
          Please connect your wallet to view policies
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          My Policies
        </h2>
        <button
          onClick={() => setRefreshTrigger(prev => prev + 1)}
          disabled={isLoading}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
        >
          {isLoading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {isLoading && policies.length === 0 ? (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
          Loading policies...
        </div>
      ) : policies.length === 0 ? (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
          No policies found. Purchase your first insurance!
        </div>
      ) : (
        <div className="space-y-4">
          {policies.map((policy) => (
            <div
              key={policy.id.toString()}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      Flight {policy.flightNumber}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(policy.status)}`}>
                      {POLICY_STATUS[policy.status as keyof typeof POLICY_STATUS]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Policy #{policy.id.toString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Departure</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {format(new Date(Number(policy.departureTime) * 1000), "PPp")}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Premium Paid</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {parseFloat(formatEther(policy.premiumPaid)).toFixed(4)} ETH
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Max Payout</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {parseFloat(formatEther(policy.maxPayout)).toFixed(4)} ETH
                  </p>
                </div>
                {policy.status === 2 && (
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Payout Received</p>
                    <p className="font-semibold text-green-600 dark:text-green-400">
                      {parseFloat(formatEther(policy.payoutAmount)).toFixed(4)} ETH
                    </p>
                  </div>
                )}
                {policy.delayHours > 0n && (
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Delay Hours</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {policy.delayHours.toString()} hours
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
