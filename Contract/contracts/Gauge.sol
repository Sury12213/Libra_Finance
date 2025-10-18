// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Gauge is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public lpToken;
    IERC20 public rewardToken;
    address public voter;
    bool public initialized;

    mapping(address => uint256) public balanceOf;
    mapping(address => uint256) public rewardDebt;

    uint256 public totalSupply;
    uint256 public accRewardPerShare;
    uint256 public queuedRewards;
    
    uint256 private constant PRECISION = 1e18;

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 amount);
    event RewardNotified(uint256 amount);

     function initialize(address _lp, address _reward, address _voter) external {
        require(!initialized, "Already initialized");
        lpToken = IERC20(_lp);
        rewardToken = IERC20(_reward);
        voter = _voter;
        initialized = true;
    }

    function _settle(address user) internal {
        if (user != address(0) && balanceOf[user] > 0) {
            uint256 pending = (balanceOf[user] * accRewardPerShare) / PRECISION - rewardDebt[user];
            if (pending > 0) {
                uint256 rewardBalance = rewardToken.balanceOf(address(this));
                
                uint256 availableRewards = rewardBalance > queuedRewards ? rewardBalance - queuedRewards : 0;
                
                if (pending > availableRewards) {
                    pending = availableRewards;
                }
                
                if (pending > 0) {
                    rewardToken.safeTransfer(user, pending);
                    emit RewardPaid(user, pending);
                }
            }
            rewardDebt[user] = (balanceOf[user] * accRewardPerShare) / PRECISION;
        }
    }

    function deposit(uint256 amount) external nonReentrant {
        _settle(msg.sender);
        
        if (amount > 0) {
            lpToken.safeTransferFrom(msg.sender, address(this), amount);
            balanceOf[msg.sender] += amount;
            totalSupply += amount;
            
            rewardDebt[msg.sender] = (balanceOf[msg.sender] * accRewardPerShare) / PRECISION;
        }
        
        emit Deposit(msg.sender, amount);
    }

    function withdraw(uint256 amount) external nonReentrant {
        require(balanceOf[msg.sender] >= amount, "insufficient");
        
        _settle(msg.sender);
        
        if (amount > 0) {
            balanceOf[msg.sender] -= amount;
            totalSupply -= amount;
            lpToken.safeTransfer(msg.sender, amount);
            
            rewardDebt[msg.sender] = (balanceOf[msg.sender] * accRewardPerShare) / PRECISION;
        }
        
        emit Withdraw(msg.sender, amount);
    }

    function getReward() external nonReentrant {
        _settle(msg.sender);
    }

    function notifyReward(uint256 amount) external {
        require(msg.sender == voter, "not voter");
        require(amount > 0, "zero amount");

        uint256 balBefore = rewardToken.balanceOf(address(this));
        rewardToken.safeTransferFrom(msg.sender, address(this), amount);
        uint256 balAfter = rewardToken.balanceOf(address(this));
        uint256 actualReceived = balAfter - balBefore;

        if (totalSupply == 0) {
            queuedRewards += actualReceived;
        } else {
            uint256 distribute = queuedRewards + actualReceived;
            if (distribute > 0) {
                uint256 rewardPerShare = (distribute * PRECISION) / totalSupply;
                accRewardPerShare += rewardPerShare;
                queuedRewards = 0;
            }
        }
        
        emit RewardNotified(actualReceived);
    }

    function pendingReward(address user) external view returns (uint256) {
        if (balanceOf[user] == 0) return 0;
        
        uint256 pending = (balanceOf[user] * accRewardPerShare) / PRECISION - rewardDebt[user];
        
        uint256 rewardBalance = rewardToken.balanceOf(address(this));
        uint256 availableRewards = rewardBalance > queuedRewards ? rewardBalance - queuedRewards : 0;
        
        return pending > availableRewards ? availableRewards : pending;
    }
    
    function emergencyWithdraw() external nonReentrant {
        uint256 amount = balanceOf[msg.sender];
        require(amount > 0, "no balance");
        
        balanceOf[msg.sender] = 0;
        totalSupply -= amount;
        rewardDebt[msg.sender] = 0;
        
        lpToken.safeTransfer(msg.sender, amount);
        emit Withdraw(msg.sender, amount);
    }
}