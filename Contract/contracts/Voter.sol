// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./VotingEscrow.sol";
import "./GaugeFactory.sol";
import "./BribeFactory.sol";
import "./Bribe.sol";

interface IPoolFactoryReadable {
    function isPool(address pool) external view returns (bool);
    function allPools() external view returns (address[] memory);
}
interface IGauge { function notifyReward(uint256 amount) external; }

contract Voter is Ownable {
    using SafeERC20 for IERC20;
    
    uint256 public constant WEEK = 7 days;

    address public immutable escrow;
    address public immutable gaugeFactory;
    address public immutable bribeFactory;
    address public immutable poolFactory;
    IERC20  public immutable rewardToken;

    address public keeper;
    address public minter;

    mapping(address => address) public gauges;
    mapping(address => address) public bribes;

    mapping(address => uint256) public poolWeight;
    uint256 public totalWeight;

    mapping(uint256 => mapping(address => uint256)) public votes;
    mapping(uint256 => address[]) public votedPools;
    mapping(uint256 => uint256) public lastVotedEpoch;
    mapping(uint256 => uint256) public lastVoted;

    mapping(address => bool) public killedGauge;
    mapping(uint256 => bool) public distributed;

    uint256 public maxPoolsPerVote = 10;

    event GaugeCreated(address indexed pool, address gauge, address bribe);
    event Voted(address indexed voter, uint256 indexed tokenId, address[] pools, uint256[] weights);
    event Reset(address indexed voter, uint256 indexed tokenId);
    event Distributed(address indexed pool, address indexed gauge, uint256 amount, uint256 epoch);
    event KeeperUpdated(address keeper);
    event GaugeKilled(address indexed pool);

    modifier onlyKeeperOrOwner() { 
        require(msg.sender == keeper || msg.sender == owner() || msg.sender == minter, "not auth"); 
        _; 
    }

    constructor(
        address _escrow, 
        address _gaugeFactory, 
        address _bribeFactory, 
        address _poolFactory, 
        address _reward
    ) {
        escrow = _escrow;
        gaugeFactory = _gaugeFactory;
        bribeFactory = _bribeFactory;
        poolFactory = _poolFactory;
        rewardToken = IERC20(_reward);
    }

    function setKeeper(address k) external onlyOwner { 
        keeper = k; 
        emit KeeperUpdated(k); 
    }

    function setMinter(address m) external onlyOwner {
        minter = m;
    }

    function createGauge(address pool) external returns (address gauge) {
        require(msg.sender == poolFactory, "not factory");
        require(IPoolFactoryReadable(poolFactory).isPool(pool), "not pool");
        require(gauges[pool] == address(0), "exists");

        address bribe = BribeFactory(bribeFactory).createBribe(address(rewardToken), address(this));
        gauge = GaugeFactory(gaugeFactory).createGauge(pool, address(rewardToken), address(this));
        bribes[pool] = bribe;
        gauges[pool] = gauge;
        emit GaugeCreated(pool, gauge, bribe);
    }

    function killGauge(address pool) external onlyOwner {
        require(gauges[pool] != address(0), "no gauge");
        require(!killedGauge[pool], "already killed");
        
        killedGauge[pool] = true;
        
        uint256 weight = poolWeight[pool];
        if (weight > 0) {
            totalWeight -= weight;
            poolWeight[pool] = 0;
        }
        
        emit GaugeKilled(pool);
    }

    function _clearVotes(uint256 tokenId) internal {
        address[] storage arr = votedPools[tokenId];
        for (uint256 i = 0; i < arr.length; i++) {
            address p = arr[i];
            uint256 w = votes[tokenId][p];
            if (w > 0) {
                if (!killedGauge[p]) {
                    poolWeight[p] -= w;
                    totalWeight -= w;
                }
                votes[tokenId][p] = 0;
            }
        }
        delete votedPools[tokenId];
    }

    function reset(uint256 tokenId) public {
        require(VotingEscrow(escrow).ownerOf(tokenId) == msg.sender, "not owner");
        _clearVotes(tokenId);
        lastVoted[tokenId] = block.timestamp;
        emit Reset(msg.sender, tokenId);
    }

    function vote(uint256 tokenId, address[] calldata pools, uint256[] calldata weights) external {
        require(VotingEscrow(escrow).ownerOf(tokenId) == msg.sender, "not owner");
        require(pools.length == weights.length, "len mismatch");
        require(pools.length <= maxPoolsPerVote, "too many");

        uint256 currentEpoch = block.timestamp / WEEK;
        require(lastVotedEpoch[tokenId] != currentEpoch, "already voted this epoch");

        if (lastVoted[tokenId] != 0) _clearVotes(tokenId);

        uint256 power = VotingEscrow(escrow).votingPower(tokenId);
        require(power > 0, "no voting power");
        
        uint256 sum;
        for (uint256 i = 0; i < pools.length; i++) {
            require(IPoolFactoryReadable(poolFactory).isPool(pools[i]), "not pool");
            require(!killedGauge[pools[i]], "gauge killed");
            sum += weights[i];
        }
        require(sum <= power, "exceeds power");

        address[] storage arr = votedPools[tokenId];
        for (uint256 i = 0; i < pools.length; i++) {
            address p = pools[i];
            uint256 w = weights[i];
            if (w > 0) {
                votes[tokenId][p] = w;
                arr.push(p);
                poolWeight[p] += w;
                totalWeight += w;
                
                Bribe(bribes[p]).recordVote(msg.sender, w);
            }
        }
        
        lastVoted[tokenId] = block.timestamp;
        lastVotedEpoch[tokenId] = currentEpoch;
        emit Voted(msg.sender, tokenId, pools, weights);
    }

    function distributeAll(uint256 amount) external onlyKeeperOrOwner {
        uint256 epoch = block.timestamp / WEEK;
        require(!distributed[epoch], "already distributed");
        distributed[epoch] = true;

        address[] memory pools = IPoolFactoryReadable(poolFactory).allPools();
        require(amount > 0 && pools.length > 0, "invalid");

        uint256 _total = totalWeight;
        if (_total == 0) return;

        uint256 distributed_amount = 0;
        
        for (uint256 i = 0; i < pools.length; i++) {
            address p = pools[i];
            if (killedGauge[p]) continue;
            
            address g = gauges[p];
            if (g == address(0)) continue;

            uint256 w = poolWeight[p];
            if (w == 0) continue;

            uint256 share = (amount * w) / _total;
            if (share == 0) continue;
            
            distributed_amount += share;
            
            require(rewardToken.balanceOf(address(this)) >= share, "insufficient balance");

            rewardToken.safeApprove(g, 0);
            rewardToken.safeApprove(g, share);

            try IGauge(g).notifyReward(share) {} catch {
                emit Distributed(p, g, 0, epoch);
                continue;
            }
            emit Distributed(p, g, share, epoch);
        }
    }

    function getUserVotes(uint256 tokenId) external view returns (address[] memory, uint256[] memory) {
        address[] memory pools = votedPools[tokenId];
        uint256[] memory weights = new uint256[](pools.length);
        
        for (uint256 i = 0; i < pools.length; i++) {
            weights[i] = votes[tokenId][pools[i]];
        }
        
        return (pools, weights);
    }

    function notifyBribeReward(address pool, uint256 epoch, uint256 amount) external onlyKeeperOrOwner {
        address bribe = bribes[pool];
        require(bribe != address(0), "no bribe");
        
        rewardToken.safeTransferFrom(msg.sender, address(this), amount);
        rewardToken.safeApprove(bribe, amount);
        
        Bribe(bribe).notifyRewardAmount(epoch, amount);
    }
}