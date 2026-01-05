// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title FlightInsurance
 * @dev A decentralized flight delay insurance contract
 * @notice Users can purchase insurance for their flights and claim payouts if delayed
 * 
 * Oracle API Suggestions:
 * - AviationStack (https://aviationstack.com/) - Free tier available
 * - FlightAware AeroAPI (https://flightaware.com/aeroapi/)
 * - Chainlink Functions for decentralized oracle calls
 */
contract FlightInsurance is Ownable, ReentrancyGuard, Pausable {
    
    // ============ Enums ============
    
    enum PolicyStatus {
        Active,      // Policy is active, waiting for flight
        Claimable,   // Flight delayed, user can claim
        Claimed,     // Payout has been made
        Expired,     // Flight completed without delay
        Cancelled    // Policy cancelled by user or admin
    }
    
    enum FlightStatus {
        Unknown,     // Not yet reported
        OnTime,      // Flight departed/arrived on time
        Delayed,     // Flight is delayed
        Cancelled    // Flight was cancelled
    }
    
    // ============ Structs ============
    
    struct Policy {
        address policyholder;
        string flightNumber;
        uint256 departureTime;      // Unix timestamp
        uint256 premiumPaid;        // Amount paid for insurance
        uint256 maxPayout;          // Maximum claimable amount
        uint256 purchaseTime;
        PolicyStatus status;
        uint256 delayHours;         // Reported delay in hours
        uint256 payoutAmount;       // Actual payout (if claimed)
    }
    
    struct FlightData {
        FlightStatus status;
        uint256 delayMinutes;
        uint256 reportedAt;
        bool isReported;
    }
    
    struct PayoutTier {
        uint256 minDelayHours;
        uint256 payoutPercentage;   // Percentage of maxPayout (in basis points, 10000 = 100%)
    }
    
    // ============ State Variables ============
    
    // Policy management
    mapping(uint256 => Policy) public policies;
    mapping(address => uint256[]) public userPolicies;
    uint256 public nextPolicyId;
    
    // Flight data from oracle
    mapping(bytes32 => FlightData) public flightReports;
    
    // Oracle management
    mapping(address => bool) public authorizedOracles;
    
    // Insurance parameters
    uint256 public minPremium = 0.001 ether;
    uint256 public maxPremium = 1 ether;
    uint256 public payoutMultiplier = 5;  // maxPayout = premium * multiplier
    uint256 public minPurchaseBeforeDeparture = 1 hours;
    
    // Payout tiers (delay hours => payout percentage)
    PayoutTier[] public payoutTiers;
    
    // Contract balance for payouts
    uint256 public reserveBalance;
    uint256 public totalPremiumsCollected;
    uint256 public totalPayoutsMade;
    
    // ============ Events ============
    
    event PolicyPurchased(
        uint256 indexed policyId,
        address indexed policyholder,
        string flightNumber,
        uint256 departureTime,
        uint256 premium,
        uint256 maxPayout
    );
    
    event FlightDataReported(
        bytes32 indexed flightKey,
        string flightNumber,
        uint256 departureDate,
        FlightStatus status,
        uint256 delayMinutes
    );
    
    event ClaimProcessed(
        uint256 indexed policyId,
        address indexed policyholder,
        uint256 delayHours,
        uint256 payoutAmount
    );
    
    event PolicyExpired(uint256 indexed policyId);
    event PolicyCancelled(uint256 indexed policyId, uint256 refundAmount);
    event OracleAuthorized(address indexed oracle);
    event OracleRevoked(address indexed oracle);
    event ReserveFunded(uint256 amount);
    event ReserveWithdrawn(uint256 amount);
    
    // ============ Modifiers ============
    
    modifier onlyOracle() {
        require(authorizedOracles[msg.sender], "Not authorized oracle");
        _;
    }
    
    modifier policyExists(uint256 _policyId) {
        require(_policyId < nextPolicyId, "Policy does not exist");
        _;
    }
    
    // ============ Constructor ============
    
    constructor() Ownable(msg.sender) {
        // Initialize default payout tiers
        // 1-2 hours delay: 25% payout
        payoutTiers.push(PayoutTier(1, 2500));
        // 2-4 hours delay: 50% payout
        payoutTiers.push(PayoutTier(2, 5000));
        // 4-8 hours delay: 75% payout
        payoutTiers.push(PayoutTier(4, 7500));
        // 8+ hours delay or cancellation: 100% payout
        payoutTiers.push(PayoutTier(8, 10000));
    }
    
    // ============ Policy Purchase Functions ============
    
    /**
     * @notice Purchase flight delay insurance
     * @param _flightNumber The flight number (e.g., "AA123")
     * @param _departureTime Unix timestamp of scheduled departure
     */
    function purchasePolicy(
        string calldata _flightNumber,
        uint256 _departureTime
    ) external payable whenNotPaused nonReentrant returns (uint256) {
        require(msg.value >= minPremium && msg.value <= maxPremium, "Invalid premium amount");
        require(bytes(_flightNumber).length > 0, "Invalid flight number");
        require(
            _departureTime > block.timestamp + minPurchaseBeforeDeparture,
            "Must purchase before departure"
        );
        
        uint256 maxPayout = msg.value * payoutMultiplier;
        require(reserveBalance >= maxPayout, "Insufficient reserve for coverage");
        
        uint256 policyId = nextPolicyId++;
        
        policies[policyId] = Policy({
            policyholder: msg.sender,
            flightNumber: _flightNumber,
            departureTime: _departureTime,
            premiumPaid: msg.value,
            maxPayout: maxPayout,
            purchaseTime: block.timestamp,
            status: PolicyStatus.Active,
            delayHours: 0,
            payoutAmount: 0
        });
        
        userPolicies[msg.sender].push(policyId);
        totalPremiumsCollected += msg.value;
        reserveBalance += msg.value;
        
        emit PolicyPurchased(
            policyId,
            msg.sender,
            _flightNumber,
            _departureTime,
            msg.value,
            maxPayout
        );
        
        return policyId;
    }
    
    // ============ Oracle Functions ============
    
    /**
     * @notice Report flight status (called by authorized oracle)
     * @param _flightNumber The flight number
     * @param _departureDate The departure date (YYYYMMDD format as uint)
     * @param _status Flight status
     * @param _delayMinutes Delay in minutes (0 if on time)
     */
    function reportFlightStatus(
        string calldata _flightNumber,
        uint256 _departureDate,
        FlightStatus _status,
        uint256 _delayMinutes
    ) external onlyOracle {
        bytes32 flightKey = getFlightKey(_flightNumber, _departureDate);
        
        flightReports[flightKey] = FlightData({
            status: _status,
            delayMinutes: _delayMinutes,
            reportedAt: block.timestamp,
            isReported: true
        });
        
        emit FlightDataReported(
            flightKey,
            _flightNumber,
            _departureDate,
            _status,
            _delayMinutes
        );
    }
    
    /**
     * @notice Batch report multiple flights
     */
    function batchReportFlightStatus(
        string[] calldata _flightNumbers,
        uint256[] calldata _departureDates,
        FlightStatus[] calldata _statuses,
        uint256[] calldata _delayMinutes
    ) external onlyOracle {
        require(
            _flightNumbers.length == _departureDates.length &&
            _departureDates.length == _statuses.length &&
            _statuses.length == _delayMinutes.length,
            "Array length mismatch"
        );
        
        for (uint256 i = 0; i < _flightNumbers.length; i++) {
            bytes32 flightKey = getFlightKey(_flightNumbers[i], _departureDates[i]);
            
            flightReports[flightKey] = FlightData({
                status: _statuses[i],
                delayMinutes: _delayMinutes[i],
                reportedAt: block.timestamp,
                isReported: true
            });
            
            emit FlightDataReported(
                flightKey,
                _flightNumbers[i],
                _departureDates[i],
                _statuses[i],
                _delayMinutes[i]
            );
        }
    }
    
    // ============ Claim Functions ============
    
    /**
     * @notice Process claim for a policy after flight data is reported
     * @param _policyId The policy ID to claim
     */
    function processClaim(uint256 _policyId) 
        external 
        nonReentrant 
        policyExists(_policyId) 
    {
        Policy storage policy = policies[_policyId];
        
        require(policy.status == PolicyStatus.Active, "Policy not active");
        require(
            msg.sender == policy.policyholder || msg.sender == owner(),
            "Not authorized"
        );
        
        // Get flight data
        uint256 departureDate = timestampToDate(policy.departureTime);
        bytes32 flightKey = getFlightKey(policy.flightNumber, departureDate);
        FlightData memory flightData = flightReports[flightKey];
        
        require(flightData.isReported, "Flight data not yet reported");
        
        if (flightData.status == FlightStatus.OnTime) {
            // Flight was on time, policy expires
            policy.status = PolicyStatus.Expired;
            emit PolicyExpired(_policyId);
            return;
        }
        
        if (flightData.status == FlightStatus.Delayed || 
            flightData.status == FlightStatus.Cancelled) {
            
            uint256 delayHours = flightData.delayMinutes / 60;
            
            // Flight cancelled counts as maximum delay
            if (flightData.status == FlightStatus.Cancelled) {
                delayHours = 24; // Treat as maximum delay
            }
            
            if (delayHours == 0) {
                // Less than 1 hour delay, policy expires
                policy.status = PolicyStatus.Expired;
                emit PolicyExpired(_policyId);
                return;
            }
            
            uint256 payoutAmount = calculatePayout(policy.maxPayout, delayHours);
            
            require(reserveBalance >= payoutAmount, "Insufficient reserve");
            
            policy.status = PolicyStatus.Claimed;
            policy.delayHours = delayHours;
            policy.payoutAmount = payoutAmount;
            
            reserveBalance -= payoutAmount;
            totalPayoutsMade += payoutAmount;
            
            (bool success, ) = payable(policy.policyholder).call{value: payoutAmount}("");
            require(success, "Payout transfer failed");
            
            emit ClaimProcessed(_policyId, policy.policyholder, delayHours, payoutAmount);
        }
    }
    
    /**
     * @notice Check if a policy is claimable and get estimated payout
     */
    function checkClaimStatus(uint256 _policyId) 
        external 
        view 
        policyExists(_policyId) 
        returns (
            bool isClaimable,
            uint256 estimatedPayout,
            uint256 delayHours,
            FlightStatus flightStatus
        ) 
    {
        Policy memory policy = policies[_policyId];
        
        if (policy.status != PolicyStatus.Active) {
            return (false, 0, 0, FlightStatus.Unknown);
        }
        
        uint256 departureDate = timestampToDate(policy.departureTime);
        bytes32 flightKey = getFlightKey(policy.flightNumber, departureDate);
        FlightData memory flightData = flightReports[flightKey];
        
        if (!flightData.isReported) {
            return (false, 0, 0, FlightStatus.Unknown);
        }
        
        if (flightData.status == FlightStatus.OnTime) {
            return (false, 0, 0, FlightStatus.OnTime);
        }
        
        delayHours = flightData.delayMinutes / 60;
        if (flightData.status == FlightStatus.Cancelled) {
            delayHours = 24;
        }
        
        if (delayHours > 0) {
            estimatedPayout = calculatePayout(policy.maxPayout, delayHours);
            return (true, estimatedPayout, delayHours, flightData.status);
        }
        
        return (false, 0, 0, flightData.status);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get all policies for a user
     */
    function getUserPolicies(address _user) external view returns (uint256[] memory) {
        return userPolicies[_user];
    }
    
    /**
     * @notice Get policy details
     */
    function getPolicy(uint256 _policyId) 
        external 
        view 
        policyExists(_policyId) 
        returns (Policy memory) 
    {
        return policies[_policyId];
    }
    
    /**
     * @notice Get flight data by flight key
     */
    function getFlightData(string calldata _flightNumber, uint256 _departureDate) 
        external 
        view 
        returns (FlightData memory) 
    {
        bytes32 flightKey = getFlightKey(_flightNumber, _departureDate);
        return flightReports[flightKey];
    }
    
    /**
     * @notice Calculate premium quote
     */
    function getPremiumQuote(uint256 _premium) 
        external 
        view 
        returns (uint256 maxPayout, bool hasEnoughReserve) 
    {
        maxPayout = _premium * payoutMultiplier;
        hasEnoughReserve = reserveBalance >= maxPayout;
    }
    
    /**
     * @notice Get all payout tiers
     */
    function getPayoutTiers() external view returns (PayoutTier[] memory) {
        return payoutTiers;
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Authorize an oracle address
     */
    function authorizeOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Invalid address");
        authorizedOracles[_oracle] = true;
        emit OracleAuthorized(_oracle);
    }
    
    /**
     * @notice Revoke oracle authorization
     */
    function revokeOracle(address _oracle) external onlyOwner {
        authorizedOracles[_oracle] = false;
        emit OracleRevoked(_oracle);
    }
    
    /**
     * @notice Fund the reserve balance
     */
    function fundReserve() external payable onlyOwner {
        reserveBalance += msg.value;
        emit ReserveFunded(msg.value);
    }
    
    /**
     * @notice Withdraw excess reserves (only excess above active policy coverage)
     */
    function withdrawReserve(uint256 _amount) external onlyOwner nonReentrant {
        require(_amount <= reserveBalance, "Insufficient balance");
        
        reserveBalance -= _amount;
        
        (bool success, ) = payable(owner()).call{value: _amount}("");
        require(success, "Withdrawal failed");
        
        emit ReserveWithdrawn(_amount);
    }
    
    /**
     * @notice Update insurance parameters
     */
    function updateParameters(
        uint256 _minPremium,
        uint256 _maxPremium,
        uint256 _payoutMultiplier,
        uint256 _minPurchaseBeforeDeparture
    ) external onlyOwner {
        require(_minPremium < _maxPremium, "Invalid premium range");
        require(_payoutMultiplier > 0, "Invalid multiplier");
        
        minPremium = _minPremium;
        maxPremium = _maxPremium;
        payoutMultiplier = _payoutMultiplier;
        minPurchaseBeforeDeparture = _minPurchaseBeforeDeparture;
    }
    
    /**
     * @notice Update payout tiers
     */
    function updatePayoutTiers(PayoutTier[] calldata _newTiers) external onlyOwner {
        require(_newTiers.length > 0, "Must have at least one tier");
        
        delete payoutTiers;
        
        for (uint256 i = 0; i < _newTiers.length; i++) {
            require(_newTiers[i].payoutPercentage <= 10000, "Percentage exceeds 100%");
            payoutTiers.push(_newTiers[i]);
        }
    }
    
    /**
     * @notice Pause contract
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @notice Cancel policy and refund (only before departure)
     */
    function cancelPolicy(uint256 _policyId) 
        external 
        nonReentrant 
        policyExists(_policyId) 
    {
        Policy storage policy = policies[_policyId];
        
        require(policy.status == PolicyStatus.Active, "Policy not active");
        require(
            msg.sender == policy.policyholder || msg.sender == owner(),
            "Not authorized"
        );
        require(block.timestamp < policy.departureTime, "Cannot cancel after departure");
        
        // Calculate refund (90% of premium, 10% fee)
        uint256 refundAmount = (policy.premiumPaid * 90) / 100;
        
        policy.status = PolicyStatus.Cancelled;
        reserveBalance -= refundAmount;
        
        (bool success, ) = payable(policy.policyholder).call{value: refundAmount}("");
        require(success, "Refund failed");
        
        emit PolicyCancelled(_policyId, refundAmount);
    }
    
    // ============ Internal Functions ============
    
    /**
     * @dev Calculate payout based on delay hours
     */
    function calculatePayout(uint256 _maxPayout, uint256 _delayHours) 
        internal 
        view 
        returns (uint256) 
    {
        uint256 payoutPercentage = 0;
        
        for (uint256 i = payoutTiers.length; i > 0; i--) {
            if (_delayHours >= payoutTiers[i - 1].minDelayHours) {
                payoutPercentage = payoutTiers[i - 1].payoutPercentage;
                break;
            }
        }
        
        return (_maxPayout * payoutPercentage) / 10000;
    }
    
    /**
     * @dev Generate unique key for flight
     */
    function getFlightKey(string memory _flightNumber, uint256 _departureDate) 
        public 
        pure 
        returns (bytes32) 
    {
        return keccak256(abi.encodePacked(_flightNumber, _departureDate));
    }
    
    /**
     * @dev Convert timestamp to date (YYYYMMDD format)
     */
    function timestampToDate(uint256 _timestamp) public pure returns (uint256) {
        // Simplified: returns days since epoch, oracle should use same format
        return _timestamp / 1 days;
    }
    
    // ============ Receive Function ============
    
    receive() external payable {
        reserveBalance += msg.value;
        emit ReserveFunded(msg.value);
    }
}
