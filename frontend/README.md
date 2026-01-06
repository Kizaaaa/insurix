# Flight Insurance dApp Frontend

A decentralized application for purchasing flight delay insurance on Ethereum Sepolia testnet.

## Features

- 🔐 **MetaMask Integration** - Connect your wallet to interact with the smart contract
- ✈️ **Purchase Insurance** - Buy coverage for your flights with customizable premium
- 📋 **View Policies** - Track all your insurance policies in one place
- 💰 **Claim Payouts** - Check claim status and receive payouts for delayed flights
- 🌓 **Dark Mode** - Automatic dark/light theme support

## Getting Started

### Prerequisites

- Node.js 18+ installed
- MetaMask browser extension
- Sepolia testnet ETH ([get from faucet](https://sepoliafaucet.com/))

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Smart Contract

- **Network:** Sepolia Testnet
- **Contract Address:** `0xf8E4F4d4e86c63684170D577e445F4245558c660`
- **Explorer:** [View on Etherscan](https://sepolia.etherscan.io/address/0xf8E4F4d4e86c63684170D577e445F4245558c660)

## How It Works

### 1. Purchase Insurance
- Enter flight number (e.g., AA123)
- Select departure date and time
- Choose premium amount (0.001 - 1.0 ETH)
- Max payout is 5x your premium

### 2. Payout Structure
- **1-2 hours delay:** 25% payout
- **2-4 hours delay:** 50% payout
- **4-8 hours delay:** 75% payout
- **8+ hours or cancelled:** 100% payout

### 3. Claim Process
- Oracle reports flight status after departure
- Check claim status using policy ID
- Process claim to receive payout automatically

## Technology Stack

- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling
- **ethers.js 6** - Ethereum interactions
- **date-fns** - Date formatting

