import hre from "hardhat";
const { ethers } = hre;

async function main() {
  const [deployer, oracle] = await ethers.getSigners();

  console.log("Deploying FlightInsurance with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy the contract
  const FlightInsurance = await ethers.getContractFactory("FlightInsurance");
  const flightInsurance = await FlightInsurance.deploy();
  await flightInsurance.waitForDeployment();

  const contractAddress = await flightInsurance.getAddress();
  console.log("FlightInsurance deployed to:", contractAddress);

  // Fund the reserve (for payouts)
  const fundAmount = ethers.parseEther("0.1");
  console.log("\nFunding reserve with", ethers.formatEther(fundAmount), "ETH...");
  const fundTx = await flightInsurance.fundReserve({ value: fundAmount });
  await fundTx.wait();
  console.log("Reserve funded!");

  // Authorize oracle (using second signer or deployer for testing)
  const oracleAddress = oracle ? oracle.address : deployer.address;
  console.log("\nAuthorizing oracle:", oracleAddress);
  const authTx = await flightInsurance.authorizeOracle(oracleAddress);
  await authTx.wait();
  console.log("Oracle authorized!");

  // Display contract info
  console.log("\n=== Contract Info ===");
  console.log("Min Premium:", ethers.formatEther(await flightInsurance.minPremium()), "ETH");
  console.log("Max Premium:", ethers.formatEther(await flightInsurance.maxPremium()), "ETH");
  console.log("Payout Multiplier:", (await flightInsurance.payoutMultiplier()).toString(), "x");
  console.log("Reserve Balance:", ethers.formatEther(await flightInsurance.reserveBalance()), "ETH");

  console.log("\n=== Deployment Complete ===");
  console.log("Contract Address:", contractAddress);
  console.log("\nSave this address for your frontend!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
