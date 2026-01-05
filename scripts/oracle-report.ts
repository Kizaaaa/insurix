import hre from "hardhat";
const { ethers } = hre;

/**
 * Oracle Script for Flight Insurance
 * 
 * This script simulates an oracle that reports flight status.
 * In production, this would be replaced with:
 * 1. Chainlink Functions to call external APIs
 * 2. A backend service that monitors flights and calls the contract
 * 
 * Recommended Flight APIs:
 * - AviationStack: https://aviationstack.com/documentation
 * - FlightAware AeroAPI: https://flightaware.com/aeroapi/
 * - OpenSky Network: https://opensky-network.org/apidoc/
 */

// Contract address - update after deployment
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "";

// Flight Status enum (must match contract)
enum FlightStatus {
  Unknown = 0,
  OnTime = 1,
  Delayed = 2,
  Cancelled = 3
}

interface FlightReport {
  flightNumber: string;
  departureDate: number; // Days since epoch (timestamp / 86400)
  status: FlightStatus;
  delayMinutes: number;
}

async function main() {
  if (!CONTRACT_ADDRESS) {
    console.error("Please set CONTRACT_ADDRESS environment variable");
    process.exit(1);
  }

  const [oracle] = await ethers.getSigners();
  console.log("Oracle address:", oracle.address);

  // Get contract instance
  const flightInsurance = await ethers.getContractAt("FlightInsurance", CONTRACT_ADDRESS);

  // Check if we're authorized
  const isAuthorized = await flightInsurance.authorizedOracles(oracle.address);
  if (!isAuthorized) {
    console.error("This address is not authorized as an oracle!");
    process.exit(1);
  }

  console.log("Oracle is authorized. Ready to report flight data.");

  // Example: Report a delayed flight
  const exampleReport: FlightReport = {
    flightNumber: "GA123",
    departureDate: Math.floor(Date.now() / 1000 / 86400), // Today
    status: FlightStatus.Delayed,
    delayMinutes: 180 // 3 hours delay
  };

  console.log("\nReporting flight status:");
  console.log("  Flight:", exampleReport.flightNumber);
  console.log("  Status:", FlightStatus[exampleReport.status]);
  console.log("  Delay:", exampleReport.delayMinutes, "minutes");

  const tx = await flightInsurance.reportFlightStatus(
    exampleReport.flightNumber,
    exampleReport.departureDate,
    exampleReport.status,
    exampleReport.delayMinutes
  );
  
  await tx.wait();
  console.log("Flight status reported! Tx:", tx.hash);
}

// Helper function to fetch flight data from API (example with AviationStack)
async function fetchFlightDataFromAPI(flightNumber: string): Promise<FlightReport | null> {
  const API_KEY = process.env.AVIATIONSTACK_API_KEY;
  
  if (!API_KEY) {
    console.log("No API key provided, using mock data");
    return null;
  }

  try {
    const response = await fetch(
      `http://api.aviationstack.com/v1/flights?access_key=${API_KEY}&flight_iata=${flightNumber}`
    );
    
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      const flight = data.data[0];
      
      let status = FlightStatus.Unknown;
      let delayMinutes = 0;
      
      if (flight.flight_status === "active" || flight.flight_status === "landed") {
        // Calculate delay from scheduled vs actual
        if (flight.departure.delay) {
          delayMinutes = flight.departure.delay;
          status = delayMinutes > 0 ? FlightStatus.Delayed : FlightStatus.OnTime;
        } else {
          status = FlightStatus.OnTime;
        }
      } else if (flight.flight_status === "cancelled") {
        status = FlightStatus.Cancelled;
        delayMinutes = 0;
      }
      
      return {
        flightNumber,
        departureDate: Math.floor(new Date(flight.departure.scheduled).getTime() / 1000 / 86400),
        status,
        delayMinutes
      };
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching flight data:", error);
    return null;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
