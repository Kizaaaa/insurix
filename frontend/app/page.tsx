"use client";

import { useState } from "react";
import WalletConnect from "@/components/WalletConnect";
import PurchaseInsurance from "@/components/PurchaseInsurance";
import MyPolicies from "@/components/MyPolicies";
import ClaimPayout from "@/components/ClaimPayout";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"purchase" | "policies" | "claim">("purchase");

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Insurix
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Decentralized flight delay insurance on Sepolia
              </p>
            </div>
            <WalletConnect />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Banner */}
        <div className="bg-blue-600 dark:bg-blue-700 rounded-xl p-6 mb-8 text-white">
          <h2 className="text-xl font-bold mb-2">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="font-semibold mb-1">1. Purchase Insurance</div>
              <div className="opacity-90">Buy coverage for your flight with ETH</div>
            </div>
            <div>
              <div className="font-semibold mb-1">2. Oracle Reports Delay</div>
              <div className="opacity-90">Flight data is reported after departure</div>
            </div>
            <div>
              <div className="font-semibold mb-1">3. Claim Your Payout</div>
              <div className="opacity-90">Get compensated if your flight is delayed</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab("purchase")}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "purchase"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300"
                }`}
              >
                Purchase Insurance
              </button>
              <button
                onClick={() => setActiveTab("policies")}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "policies"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300"
                }`}
              >
                My Policies
              </button>
              <button
                onClick={() => setActiveTab("claim")}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "claim"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300"
                }`}
              >
                Claim Payout
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="mb-8">
          {activeTab === "purchase" && <PurchaseInsurance />}
          {activeTab === "policies" && <MyPolicies />}
          {activeTab === "claim" && <ClaimPayout />}
        </div>

        {/* Footer Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
            Contract Information
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Network:</span>
              <span className="font-mono text-gray-900 dark:text-white">Sepolia Testnet</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Contract:</span>
              <a
                href="https://sepolia.etherscan.io/address/0xf8E4F4d4e86c63684170D577e445F4245558c660"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-blue-600 dark:text-blue-400 hover:underline"
              >
                0xf8E4...c660
              </a>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Premium Range:</span>
              <span className="font-mono text-gray-900 dark:text-white">0.001 - 1.0 ETH</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Payout Multiplier:</span>
              <span className="font-mono text-gray-900 dark:text-white">5x</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
