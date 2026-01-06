import hre from "hardhat";

// Your deployed contract address
const CONTRACT_ADDRESS = "0xf8E4F4d4e86c63684170D577e445F4245558c660";

async function main() {
  // Connect to the network
  const connection = await hre.network.connect();
  
  // Get the signer
  const [deployer] = await connection.ethers.getSigners();
  
  console.log("Setting up FlightInsurance contract...");
  console.log("Account:", deployer.address);
  console.log("Balance:", connection.ethers.formatEther(await connection.ethers.provider.getBalance(deployer.address)), "ETH");

  // Get contract instance
  const flightInsurance = await connection.ethers.getContractAt("FlightInsurance", CONTRACT_ADDRESS, deployer);

  // Check current owner
  const owner = await flightInsurance.owner();
  console.log("\nContract owner:", owner);
  
  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.error("ERROR: You are not the owner of this contract!");
    process.exit(1);
  }

  // 1. Authorize oracle (using deployer as oracle for testing)
  const oracleAddress = deployer.address; // Change this to your dedicated oracle address
  const isAlreadyOracle = await flightInsurance.authorizedOracles(oracleAddress);
  
  if (!isAlreadyOracle) {
    console.log("\n1. Authorizing oracle:", oracleAddress);
    const authTx = await flightInsurance.authorizeOracle(oracleAddress);
    await authTx.wait();
    console.log("   ✅ Oracle authorized! Tx:", authTx.hash);
  } else {
    console.log("\n1. Oracle already authorized:", oracleAddress);
  }

  // 2. Fund the reserve
  const currentReserve = await flightInsurance.reserveBalance();
  console.log("\n2. Current reserve:", connection.ethers.formatEther(currentReserve), "ETH");
  
  const fundAmount = connection.ethers.parseEther("0.01"); // Fund with 0.01 ETH for testing
  
  if (currentReserve < fundAmount) {
    console.log("   Funding reserve with", connection.ethers.formatEther(fundAmount), "ETH...");
    const fundTx = await flightInsurance.fundReserve({ value: fundAmount });
    await fundTx.wait();
    console.log("   ✅ Reserve funded! Tx:", fundTx.hash);
  } else {
    console.log("   Reserve already has sufficient funds");
  }

  // 3. Display contract status
  console.log("\n=== Contract Status ===");
  console.log("Address:", CONTRACT_ADDRESS);
  console.log("Owner:", await flightInsurance.owner());
  console.log("Reserve Balance:", connection.ethers.formatEther(await flightInsurance.reserveBalance()), "ETH");
  console.log("Min Premium:", connection.ethers.formatEther(await flightInsurance.minPremium()), "ETH");
  console.log("Max Premium:", connection.ethers.formatEther(await flightInsurance.maxPremium()), "ETH");
  console.log("Payout Multiplier:", (await flightInsurance.payoutMultiplier()).toString(), "x");
  
  // Check oracle status
  console.log("\n=== Oracle Status ===");
  console.log("Oracle authorized:", await flightInsurance.authorizedOracles(oracleAddress));

  console.log("\n✅ Setup complete! The contract is ready to use.");
  console.log("\nNext steps:");
  console.log("1. Users can now purchase policies");
  console.log("2. Oracle can report flight status");
  console.log("3. Users can claim payouts for delayed flights");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
