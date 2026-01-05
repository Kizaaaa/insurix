import { expect } from "chai";
import { ethers } from "hardhat";
import { FlightInsurance } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("FlightInsurance", function () {
  let flightInsurance: FlightInsurance;
  let owner: HardhatEthersSigner;
  let oracle: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;

  // Flight Status enum
  const FlightStatus = {
    Unknown: 0,
    OnTime: 1,
    Delayed: 2,
    Cancelled: 3
  };

  // Policy Status enum
  const PolicyStatus = {
    Active: 0,
    Claimable: 1,
    Claimed: 2,
    Expired: 3,
    Cancelled: 4
  };

  beforeEach(async function () {
    [owner, oracle, user1, user2] = await ethers.getSigners();

    const FlightInsuranceFactory = await ethers.getContractFactory("FlightInsurance");
    flightInsurance = await FlightInsuranceFactory.deploy();
    await flightInsurance.waitForDeployment();

    // Authorize oracle
    await flightInsurance.authorizeOracle(oracle.address);

    // Fund reserve
    await flightInsurance.fundReserve({ value: ethers.parseEther("10") });
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await flightInsurance.owner()).to.equal(owner.address);
    });

    it("Should have correct default parameters", async function () {
      expect(await flightInsurance.minPremium()).to.equal(ethers.parseEther("0.001"));
      expect(await flightInsurance.maxPremium()).to.equal(ethers.parseEther("1"));
      expect(await flightInsurance.payoutMultiplier()).to.equal(5n);
    });

    it("Should have initial payout tiers", async function () {
      const tiers = await flightInsurance.getPayoutTiers();
      expect(tiers.length).to.equal(4);
      expect(tiers[0].minDelayHours).to.equal(1n);
      expect(tiers[0].payoutPercentage).to.equal(2500n); // 25%
    });
  });

  describe("Policy Purchase", function () {
    it("Should allow purchasing a policy", async function () {
      const premium = ethers.parseEther("0.01");
      const departureTime = (await time.latest()) + 86400 * 2; // 2 days from now
      const flightNumber = "GA123";

      await expect(
        flightInsurance.connect(user1).purchasePolicy(flightNumber, departureTime, { value: premium })
      ).to.emit(flightInsurance, "PolicyPurchased");

      const policy = await flightInsurance.getPolicy(0);
      expect(policy.policyholder).to.equal(user1.address);
      expect(policy.flightNumber).to.equal(flightNumber);
      expect(policy.premiumPaid).to.equal(premium);
      expect(policy.maxPayout).to.equal(premium * 5n); // multiplier is 5
    });

    it("Should reject premium below minimum", async function () {
      const departureTime = (await time.latest()) + 86400 * 2;
      
      await expect(
        flightInsurance.connect(user1).purchasePolicy("GA123", departureTime, { 
          value: ethers.parseEther("0.0001") 
        })
      ).to.be.revertedWith("Invalid premium amount");
    });

    it("Should reject premium above maximum", async function () {
      const departureTime = (await time.latest()) + 86400 * 2;
      
      await expect(
        flightInsurance.connect(user1).purchasePolicy("GA123", departureTime, { 
          value: ethers.parseEther("2") 
        })
      ).to.be.revertedWith("Invalid premium amount");
    });

    it("Should reject purchase too close to departure", async function () {
      const departureTime = (await time.latest()) + 1800; // 30 minutes
      
      await expect(
        flightInsurance.connect(user1).purchasePolicy("GA123", departureTime, { 
          value: ethers.parseEther("0.01") 
        })
      ).to.be.revertedWith("Must purchase before departure");
    });
  });

  describe("Oracle Functions", function () {
    it("Should allow authorized oracle to report flight status", async function () {
      const flightNumber = "GA123";
      const departureDate = Math.floor(Date.now() / 1000 / 86400);
      
      await expect(
        flightInsurance.connect(oracle).reportFlightStatus(
          flightNumber,
          departureDate,
          FlightStatus.Delayed,
          180 // 3 hours delay
        )
      ).to.emit(flightInsurance, "FlightDataReported");

      const flightData = await flightInsurance.getFlightData(flightNumber, departureDate);
      expect(flightData.status).to.equal(FlightStatus.Delayed);
      expect(flightData.delayMinutes).to.equal(180n);
      expect(flightData.isReported).to.be.true;
    });

    it("Should reject non-oracle from reporting", async function () {
      await expect(
        flightInsurance.connect(user1).reportFlightStatus("GA123", 1, FlightStatus.OnTime, 0)
      ).to.be.revertedWith("Not authorized oracle");
    });

    it("Should allow batch reporting", async function () {
      const flightNumbers = ["GA123", "SQ456", "AA789"];
      const departureDates = [1, 2, 3];
      const statuses = [FlightStatus.OnTime, FlightStatus.Delayed, FlightStatus.Cancelled];
      const delays = [0, 120, 0];

      await flightInsurance.connect(oracle).batchReportFlightStatus(
        flightNumbers,
        departureDates,
        statuses,
        delays
      );

      for (let i = 0; i < flightNumbers.length; i++) {
        const data = await flightInsurance.getFlightData(flightNumbers[i], departureDates[i]);
        expect(data.status).to.equal(statuses[i]);
      }
    });
  });

  describe("Claims Processing", function () {
    let policyId: bigint;
    const flightNumber = "GA123";
    let departureTime: number;
    let departureDate: number;

    beforeEach(async function () {
      departureTime = (await time.latest()) + 86400 * 2;
      departureDate = Math.floor(departureTime / 86400);

      const tx = await flightInsurance.connect(user1).purchasePolicy(
        flightNumber,
        departureTime,
        { value: ethers.parseEther("0.1") }
      );
      
      const receipt = await tx.wait();
      policyId = 0n;
    });

    it("Should process claim for delayed flight", async function () {
      // Report delayed flight (4 hours)
      await flightInsurance.connect(oracle).reportFlightStatus(
        flightNumber,
        departureDate,
        FlightStatus.Delayed,
        240 // 4 hours = 75% payout
      );

      const user1BalanceBefore = await ethers.provider.getBalance(user1.address);

      await expect(
        flightInsurance.connect(user1).processClaim(policyId)
      ).to.emit(flightInsurance, "ClaimProcessed");

      const policy = await flightInsurance.getPolicy(policyId);
      expect(policy.status).to.equal(PolicyStatus.Claimed);
      expect(policy.delayHours).to.equal(4n);
      
      // 75% of 0.5 ETH (0.1 * 5) = 0.375 ETH
      expect(policy.payoutAmount).to.equal(ethers.parseEther("0.375"));
    });

    it("Should expire policy for on-time flight", async function () {
      await flightInsurance.connect(oracle).reportFlightStatus(
        flightNumber,
        departureDate,
        FlightStatus.OnTime,
        0
      );

      await flightInsurance.connect(user1).processClaim(policyId);

      const policy = await flightInsurance.getPolicy(policyId);
      expect(policy.status).to.equal(PolicyStatus.Expired);
    });

    it("Should give 100% payout for cancelled flight", async function () {
      await flightInsurance.connect(oracle).reportFlightStatus(
        flightNumber,
        departureDate,
        FlightStatus.Cancelled,
        0
      );

      await flightInsurance.connect(user1).processClaim(policyId);

      const policy = await flightInsurance.getPolicy(policyId);
      expect(policy.status).to.equal(PolicyStatus.Claimed);
      // 100% of 0.5 ETH = 0.5 ETH
      expect(policy.payoutAmount).to.equal(ethers.parseEther("0.5"));
    });

    it("Should calculate correct payout tiers", async function () {
      // Test 1-2 hours (25%)
      const premium = ethers.parseEther("0.1");
      const maxPayout = premium * 5n;

      // 1 hour delay
      await flightInsurance.connect(oracle).reportFlightStatus("TEST1", 1, FlightStatus.Delayed, 60);
      // 3 hours delay  
      await flightInsurance.connect(oracle).reportFlightStatus("TEST2", 2, FlightStatus.Delayed, 180);
      // 6 hours delay
      await flightInsurance.connect(oracle).reportFlightStatus("TEST3", 3, FlightStatus.Delayed, 360);
      // 10 hours delay
      await flightInsurance.connect(oracle).reportFlightStatus("TEST4", 4, FlightStatus.Delayed, 600);
    });
  });

  describe("Policy Cancellation", function () {
    it("Should allow user to cancel policy before departure", async function () {
      const premium = ethers.parseEther("0.1");
      const departureTime = (await time.latest()) + 86400 * 2;

      await flightInsurance.connect(user1).purchasePolicy("GA123", departureTime, { value: premium });

      const balanceBefore = await ethers.provider.getBalance(user1.address);

      await expect(
        flightInsurance.connect(user1).cancelPolicy(0)
      ).to.emit(flightInsurance, "PolicyCancelled");

      const policy = await flightInsurance.getPolicy(0);
      expect(policy.status).to.equal(PolicyStatus.Cancelled);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update parameters", async function () {
      await flightInsurance.updateParameters(
        ethers.parseEther("0.005"),
        ethers.parseEther("2"),
        10,
        7200
      );

      expect(await flightInsurance.minPremium()).to.equal(ethers.parseEther("0.005"));
      expect(await flightInsurance.maxPremium()).to.equal(ethers.parseEther("2"));
      expect(await flightInsurance.payoutMultiplier()).to.equal(10n);
      expect(await flightInsurance.minPurchaseBeforeDeparture()).to.equal(7200n);
    });

    it("Should allow owner to withdraw reserve", async function () {
      const withdrawAmount = ethers.parseEther("1");
      
      await expect(
        flightInsurance.withdrawReserve(withdrawAmount)
      ).to.emit(flightInsurance, "ReserveWithdrawn");
    });

    it("Should allow owner to pause/unpause", async function () {
      await flightInsurance.pause();
      
      const departureTime = (await time.latest()) + 86400 * 2;
      
      await expect(
        flightInsurance.connect(user1).purchasePolicy("GA123", departureTime, { 
          value: ethers.parseEther("0.01") 
        })
      ).to.be.reverted;

      await flightInsurance.unpause();
      
      await expect(
        flightInsurance.connect(user1).purchasePolicy("GA123", departureTime, { 
          value: ethers.parseEther("0.01") 
        })
      ).to.emit(flightInsurance, "PolicyPurchased");
    });
  });

  describe("View Functions", function () {
    it("Should return user policies", async function () {
      const departureTime = (await time.latest()) + 86400 * 2;
      
      await flightInsurance.connect(user1).purchasePolicy("GA123", departureTime, { 
        value: ethers.parseEther("0.01") 
      });
      await flightInsurance.connect(user1).purchasePolicy("GA456", departureTime + 3600, { 
        value: ethers.parseEther("0.02") 
      });

      const policies = await flightInsurance.getUserPolicies(user1.address);
      expect(policies.length).to.equal(2);
      expect(policies[0]).to.equal(0n);
      expect(policies[1]).to.equal(1n);
    });

    it("Should return premium quote", async function () {
      const [maxPayout, hasReserve] = await flightInsurance.getPremiumQuote(
        ethers.parseEther("0.1")
      );
      
      expect(maxPayout).to.equal(ethers.parseEther("0.5"));
      expect(hasReserve).to.be.true;
    });
  });
});
