// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// PoolFees.sol
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IPoolERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
}

contract PoolFees {
    using SafeERC20 for IERC20;

    address public immutable token0;
    address public immutable token1;
    address public immutable pool;

    uint256 public index0;
    uint256 public index1;

    mapping(address => uint256) public supplyIndex0;
    mapping(address => uint256) public supplyIndex1;
    mapping(address => uint256) public claimable0;
    mapping(address => uint256) public claimable1;

    event Claim(address indexed user, uint256 amount0, uint256 amount1);
    event FeesDistributed(uint256 amount0, uint256 amount1);
    event UserUpdated(address indexed user, uint256 delta0, uint256 delta1);

    modifier onlyPool() {
        require(msg.sender == pool, "Not pool");
        _;
    }

    constructor(address _token0, address _token1) {
        require(_token0 != address(0) && _token1 != address(0), "Zero address");
        token0 = _token0;
        token1 = _token1;
        pool = msg.sender;
    }

    function notifyFees(uint256 amount0, uint256 amount1) external onlyPool {
        uint256 totalSupply = IPoolERC20(pool).totalSupply();
        
        if (amount0 > 0 && totalSupply > 0) {
            index0 += (amount0 * 1e18) / totalSupply;
        }
        if (amount1 > 0 && totalSupply > 0) {
            index1 += (amount1 * 1e18) / totalSupply;
        }
        
        emit FeesDistributed(amount0, amount1);
    }

    function updateFor(address user) external {
        require(user != address(0), "Zero address");
        _updateFor(user);
    }

    function _updateFor(address user) internal {
        uint256 supplied = IPoolERC20(pool).balanceOf(user);
        uint256 delta0 = 0;
        uint256 delta1 = 0;
        
        if (supplied > 0) {
            delta0 = index0 - supplyIndex0[user];
            delta1 = index1 - supplyIndex1[user];
            
            if (delta0 > 0) {
                claimable0[user] += (supplied * delta0) / 1e18;
            }
            if (delta1 > 0) {
                claimable1[user] += (supplied * delta1) / 1e18;
            }
        }
        
        supplyIndex0[user] = index0;
        supplyIndex1[user] = index1;
        
        emit UserUpdated(user, delta0, delta1);
    }

    function claim(address to) external returns (uint256 claimed0, uint256 claimed1) {
        require(to != address(0), "Zero address");
        
        _updateFor(msg.sender);

        claimed0 = claimable0[msg.sender];
        claimed1 = claimable1[msg.sender];
        
        require(claimed0 > 0 || claimed1 > 0, "No fees to claim");

        if (claimed0 > 0) {
            require(IERC20(token0).balanceOf(address(this)) >= claimed0, "Insufficient token0");
            claimable0[msg.sender] = 0;
            IERC20(token0).safeTransfer(to, claimed0);
        }
        if (claimed1 > 0) {
            require(IERC20(token1).balanceOf(address(this)) >= claimed1, "Insufficient token1");
            claimable1[msg.sender] = 0;
            IERC20(token1).safeTransfer(to, claimed1);
        }

        emit Claim(msg.sender, claimed0, claimed1);
    }

    function getClaimable(address user) external view returns (uint256 amount0, uint256 amount1) {
        uint256 supplied = IPoolERC20(pool).balanceOf(user);
        amount0 = claimable0[user];
        amount1 = claimable1[user];
        
        if (supplied > 0) {
            uint256 delta0 = index0 - supplyIndex0[user];
            uint256 delta1 = index1 - supplyIndex1[user];
            
            if (delta0 > 0) {
                amount0 += (supplied * delta0) / 1e18;
            }
            if (delta1 > 0) {
                amount1 += (supplied * delta1) / 1e18;
            }
        }
    }
}