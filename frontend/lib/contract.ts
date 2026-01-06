export const CONTRACT_ADDRESS = "0xf8E4F4d4e86c63684170D577e445F4245558c660";
export const SEPOLIA_CHAIN_ID = 11155111;

export const CONTRACT_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_oracle",
        "type": "address"
      }
    ],
    "name": "authorizeOracle",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_policyId",
        "type": "uint256"
      }
    ],
    "name": "cancelPolicy",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_policyId",
        "type": "uint256"
      }
    ],
    "name": "checkClaimStatus",
    "outputs": [
      {
        "internalType": "bool",
        "name": "isClaimable",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "estimatedPayout",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "delayHours",
        "type": "uint256"
      },
      {
        "internalType": "enum FlightInsurance.FlightStatus",
        "name": "flightStatus",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_flightNumber",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "_departureDate",
        "type": "uint256"
      }
    ],
    "name": "getFlightData",
    "outputs": [
      {
        "components": [
          {
            "internalType": "enum FlightInsurance.FlightStatus",
            "name": "status",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "delayMinutes",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "reportedAt",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "isReported",
            "type": "bool"
          }
        ],
        "internalType": "struct FlightInsurance.FlightData",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_policyId",
        "type": "uint256"
      }
    ],
    "name": "getPolicy",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "policyholder",
            "type": "address"
          },
          {
            "internalType": "string",
            "name": "flightNumber",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "departureTime",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "premiumPaid",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "maxPayout",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "purchaseTime",
            "type": "uint256"
          },
          {
            "internalType": "enum FlightInsurance.PolicyStatus",
            "name": "status",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "delayHours",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "payoutAmount",
            "type": "uint256"
          }
        ],
        "internalType": "struct FlightInsurance.Policy",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_premium",
        "type": "uint256"
      }
    ],
    "name": "getPremiumQuote",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "maxPayout",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "hasEnoughReserve",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_user",
        "type": "address"
      }
    ],
    "name": "getUserPolicies",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "maxPremium",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "minPremium",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "payoutMultiplier",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_policyId",
        "type": "uint256"
      }
    ],
    "name": "processClaim",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_flightNumber",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "_departureTime",
        "type": "uint256"
      }
    ],
    "name": "purchasePolicy",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "reserveBalance",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "policyId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "policyholder",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "flightNumber",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "departureTime",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "premium",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "maxPayout",
        "type": "uint256"
      }
    ],
    "name": "PolicyPurchased",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "policyId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "policyholder",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "delayHours",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "payoutAmount",
        "type": "uint256"
      }
    ],
    "name": "ClaimProcessed",
    "type": "event"
  }
] as const;

export const POLICY_STATUS = {
  0: "Active",
  1: "Claimable",
  2: "Claimed",
  3: "Expired",
  4: "Cancelled"
} as const;

export const FLIGHT_STATUS = {
  0: "Unknown",
  1: "On Time",
  2: "Delayed",
  3: "Cancelled"
} as const;
