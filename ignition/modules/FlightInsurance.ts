import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const FlightInsuranceModule = buildModule("FlightInsuranceModule", (m) => {
  // Deploy the FlightInsurance contract
  const flightInsurance = m.contract("FlightInsurance");

  return { flightInsurance };
});

export default FlightInsuranceModule;
