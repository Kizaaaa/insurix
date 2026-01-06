"use client";

import { useState } from "react";
import { useWeb3 } from "@/lib/web3-context";
import { parseEther, formatEther } from "ethers";
import { format, addHours } from "date-fns";

export default function PurchaseInsurance() {
  const { contract, account } = useWeb3();
  const [flightNumber, setFlightNumber] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [premium, setPremium] = useState("0.001");
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract || !account) return;

    setIsLoading(true);
    setError(null);
    setTxHash(null);

    try {
      // Combine date and time into timestamp
      const departureDateTime = new Date(`${departureDate}T${departureTime}`);
      const departureTimestamp = Math.floor(departureDateTime.getTime() / 1000);

      // Check if departure is in the future
      const now = Math.floor(Date.now() / 1000);
      if (departureTimestamp <= now + 3600) {
        throw new Error("Departure must be at least 1 hour in the future");
      }

      // Purchase policy
      const premiumWei = parseEther(premium);
      const tx = await contract.purchasePolicy(
        flightNumber.toUpperCase(),
        departureTimestamp,
        { value: premiumWei }
      );

      setTxHash(tx.hash);
      await tx.wait();

      // Reset form
      setFlightNumber("");
      setDepartureDate("");
      setDepartureTime("");
      setPremium("0.001");
      
      alert("Insurance purchased successfully! Check 'My Policies' tab.");
    } catch (err: any) {
      console.error("Purchase failed:", err);
      setError(err.reason || err.message || "Failed to purchase insurance");
    } finally {
      setIsLoading(false);
    }
  };

  const maxPayout = parseFloat(premium) * 5;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        Purchase Flight Insurance
      </h2>

      <form onSubmit={handlePurchase} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Flight IATA code
          </label>
          <input
            type="text"
            value={flightNumber}
            onChange={(e) => setFlightNumber(e.target.value)}
            placeholder="e.g., MU2557"
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Departure Date
            </label>
            <input
              type="date"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
              required
              min={format(new Date(), "yyyy-MM-dd")}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Departure Time
            </label>
            <input
              type="time"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Premium Amount (ETH)
          </label>
          <input
            type="number"
            value={premium}
            onChange={(e) => setPremium(e.target.value)}
            step="0.001"
            min="0.001"
            max="1"
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Range: 0.001 - 1.0 ETH • Max Payout: <span className="font-semibold">{maxPayout.toFixed(3)} ETH</span>
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Payout Structure</h3>
          <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
            <li>• 1-2 hours delay: 25% payout</li>
            <li>• 2-4 hours delay: 50% payout</li>
            <li>• 4-8 hours delay: 75% payout</li>
            <li>• 8+ hours or cancelled: 100% payout</li>
          </ul>
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

        <button
          type="submit"
          disabled={isLoading || !account}
          className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
        >
          {isLoading ? "Processing..." : "Purchase Insurance"}
        </button>
      </form>
    </div>
  );
}
