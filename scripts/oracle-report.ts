import hre from "hardhat";

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

// MANUAL MODE: Set to true to skip API and use manual data
const USE_MANUAL_MODE = true;

enum FlightStatus {
  Unknown = 0,
  OnTime = 1,
  Delayed = 2,
  Cancelled = 3
}

// Manual test data (only used when USE_MANUAL_MODE = true)
const MANUAL_TEST_DATA = {
  status: FlightStatus.Delayed,  // OnTime, Delayed, Cancelled
  delayMinutes: 300  // Delay in minutes
};

interface FlightReport {
  flightNumber: string;
  departureDate: number;
  status: FlightStatus;
  delayMinutes: number;
}

async function main() {
  if (!CONTRACT_ADDRESS) {
    console.error("Please set CONTRACT_ADDRESS environment variable");
    process.exit(1);
  }

  const connection = await hre.network.connect();
  
  const [oracle] = await connection.ethers.getSigners();

  const flightInsurance = await connection.ethers.getContractAt("FlightInsurance", CONTRACT_ADDRESS);

  const isAuthorized = await flightInsurance.authorizedOracles(oracle.address);

  if (!isAuthorized) {
    process.exit(1);
  }

  const policyId = 0;
  const policy = await flightInsurance.getPolicy(policyId);
  
  const policyDepartureDate = Number(policy[2]) / 86400;
  
  let reportData: FlightReport;
  
  if (USE_MANUAL_MODE) {
    reportData = {
      flightNumber: policy[1],
      departureDate: Math.floor(policyDepartureDate),
      status: MANUAL_TEST_DATA.status,
      delayMinutes: MANUAL_TEST_DATA.delayMinutes
    };
  } else {
    const apiData = await fetchFlightDataFromAPI(policy[1], policy[2]);
    
    if (apiData) {
      reportData = apiData;
    } else {
      reportData = {
        flightNumber: policy[1],
        departureDate: Math.floor(policyDepartureDate),
        status: FlightStatus.Unknown,
        delayMinutes: 0
      };
    }
  }

  const tx = await flightInsurance.reportFlightStatus(
    reportData.flightNumber,
    reportData.departureDate,
    reportData.status,
    reportData.delayMinutes
  );
  
  await tx.wait();
}

async function fetchFlightDataFromAPI(
  flightNumber: string,
  departureTimestamp: bigint
): Promise<FlightReport | null> {
  const API_KEY = process.env.AVIATIONSTACK_API_KEY;
  
  if (!API_KEY) {
    return null;
  }

  try {
    const response = await fetch(
      `http://api.aviationstack.com/v1/flights?access_key=${API_KEY}&flight_iata=${flightNumber}`
    );
    
    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    
    // Check for API errors
    if (data.error) {
      console.error(`API Error: ${data.error.message || 'Unknown error'}`);
      return null;
    }
    
    if (!data.data || data.data.length === 0) {
      console.log(`No flights found for ${flightNumber}`);
      return null;
    }
    
    // Find the flight matching our departure date
    const departureDate = new Date(Number(departureTimestamp) * 1000);
    const targetDateStr = departureDate.toISOString().split('T')[0]; // YYYY-MM-DD
    
    const matchingFlight = data.data.find((flight: any) => 
      flight.flight_date === targetDateStr
    );
    
    if (!matchingFlight) {
      console.log(`No flight found for date ${targetDateStr}`);
      console.log(`Available dates: ${data.data.map((f: any) => f.flight_date).join(', ')}`);
      return null;
    }
    
    const flight = matchingFlight;
    
    // Parse flight status and delay
    let status = FlightStatus.Unknown;
    let delayMinutes = 0;
    
    // Check departure delay first (most important for insurance)
    if (flight.departure.delay !== null && flight.departure.delay !== undefined) {
      delayMinutes = parseInt(flight.departure.delay);
    }
    
    // Determine flight status
    if (flight.flight_status === "cancelled") {
      status = FlightStatus.Cancelled;
    } else if (flight.flight_status === "active" || flight.flight_status === "landed" || flight.flight_status === "scheduled") {
      if (delayMinutes > 0) {
        status = FlightStatus.Delayed;
      } else {
        status = FlightStatus.OnTime;
      }
    }
    
    return {
      flightNumber,
      departureDate: Math.floor(new Date(flight.departure.scheduled).getTime() / 1000 / 86400),
      status,
      delayMinutes: Math.max(0, delayMinutes)
    };
    
  } catch (error: any) {
    console.error(`Error fetching flight data: ${error.message}`);
    if (error.cause) {
      console.error(`Cause: ${error.cause}`);
    }
    return null;
  }
}

main().then(() =>process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});
