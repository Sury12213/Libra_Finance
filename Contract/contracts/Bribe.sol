// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Bribe {
    using SafeERC20 for IERC20;

    IERC20 public rewardToken;
    address public voter;
    uint256 public constant WEEK = 7 days;
    bool public initialized;

    mapping(uint256 => uint256) public totalWeightAt;
    mapping(uint256 => mapping(address => uint256)) public userWeightAt;
    mapping(uint256 => uint256) public rewardAtEpoch;
    mapping(uint256 => mapping(address => bool)) public claimed;
    
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event BribeNotified(uint256 indexed epoch, uint256 amount);
    event VoteRecorded(address indexed user, uint256 indexed epoch, uint256 weight);
    event BribeClaimed(address indexed user, uint256 indexed epoch, uint256 amount);

    modifier onlyVoter() { 
        require(msg.sender == voter, "not voter"); 
        _; 
    }

    function initialize(address _rewardToken, address _voter) external {
        require(!initialized, "Already initialized");
        rewardToken = IERC20(_rewardToken);
        voter = _voter;
        initialized = true;
    }

    function _epochNow() internal view returns (uint256) { 
        return block.timestamp / WEEK; 
    }

    function notifyRewardAmount(uint256 epoch, uint256 amount) external onlyVoter {
        require(epoch >= _epochNow(), "epoch ended");
        
        uint256 balBefore = rewardToken.balanceOf(address(this));
        rewardToken.safeTransferFrom(msg.sender, address(this), amount);
        uint256 balAfter = rewardToken.balanceOf(address(this));
        uint256 actualReceived = balAfter - balBefore;
        
        rewardAtEpoch[epoch] += actualReceived;
        emit BribeNotified(epoch, actualReceived);
    }

    function recordVote(address user, uint256 weight) external onlyVoter {
        uint256 e = _epochNow();
        
        require(!hasVoted[e][user], "already voted this epoch");
        
        userWeightAt[e][user] = weight;  
        totalWeightAt[e] += weight;
        hasVoted[e][user] = true;
        
        emit VoteRecorded(user, e, weight);
    }
    
    function resetVote(address user) external onlyVoter {
        uint256 e = _epochNow();
        
        if (hasVoted[e][user]) {
            uint256 oldWeight = userWeightAt[e][user];
            if (oldWeight > 0) {
                totalWeightAt[e] -= oldWeight;
                userWeightAt[e][user] = 0;
            }
            hasVoted[e][user] = false;
        }
    }

    function pendingReward(address user, uint256 epoch) public view returns (uint256) {
        if (epoch >= _epochNow()) return 0;
        
        uint256 tw = totalWeightAt[epoch];
        uint256 uw = userWeightAt[epoch][user];
        
        if (tw == 0 || uw == 0) return 0;
        
        return (rewardAtEpoch[epoch] * uw) / tw;
    }

    function claim(uint256 epoch) external {
        require(epoch < _epochNow(), "epoch not ended");
        require(!claimed[epoch][msg.sender], "claimed");
        
        uint256 amount = pendingReward(msg.sender, epoch);
        require(amount > 0, "no reward");
        
        claimed[epoch][msg.sender] = true;
        
        uint256 balance = rewardToken.balanceOf(address(this));
        require(balance >= amount, "insufficient contract balance");
        
        rewardToken.safeTransfer(msg.sender, amount);
        emit BribeClaimed(msg.sender, epoch, amount);
    }
    
    function claimMultiple(uint256[] calldata epochs) external {
        uint256 totalAmount = 0;
        uint256 currentEpoch = _epochNow();
        
        for (uint256 i = 0; i < epochs.length; i++) {
            uint256 epoch = epochs[i];
            
            if (epoch >= currentEpoch) continue;
            if (claimed[epoch][msg.sender]) continue;
            
            uint256 amount = pendingReward(msg.sender, epoch);
            if (amount == 0) continue;
            
            claimed[epoch][msg.sender] = true;
            totalAmount += amount;
            
            emit BribeClaimed(msg.sender, epoch, amount);
        }
        
        require(totalAmount > 0, "no rewards");
        require(rewardToken.balanceOf(address(this)) >= totalAmount, "insufficient contract balance");
        
        rewardToken.safeTransfer(msg.sender, totalAmount);
    }
}