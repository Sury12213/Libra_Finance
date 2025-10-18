// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./PoolFees.sol";

interface IPoolFactoryLite {
    function getFee(bool stable) external view returns (uint256);
    function isPaused() external view returns (bool);
}

contract Pool is ERC20, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public token0;
    address public token1;
    bool public stable;        
    address public factory;
    address public poolFees;
    bool public initialized;

    uint256 public reserve0;
    uint256 public reserve1;

    uint256 public constant MINIMUM_LIQUIDITY = 1000;

    string private _poolName;    
    string private _poolSymbol; 

    event Mint(address indexed sender, uint256 amount0, uint256 amount1);
    event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to);
    event Swap(
        address indexed sender,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address indexed to
    );
    event Sync(uint256 reserve0, uint256 reserve1);

    constructor() ERC20("", "") {}

    function name() public view override returns (string memory) { return _poolName; }
    function symbol() public view override returns (string memory) { return _poolSymbol; }

    function initialize(
        address _token0,
        address _token1,
        bool _stable,
        string memory name_,
        string memory symbol_
    ) external {
        require(factory == address(0), "Already initialized"); 
        require(_token0 != _token1, "IDENTICAL_ADDRESSES");
        initialized = true;
        factory = msg.sender;
        token0 = _token0;
        token1 = _token1;
        stable = _stable;

        _poolName = name_;
        _poolSymbol = symbol_;

        poolFees = address(new PoolFees(_token0, _token1));
    }

    function mint(address to) external nonReentrant returns (uint256 liquidity) {
        require(!IPoolFactoryLite(factory).isPaused(), "Paused");
        require(to != address(0), "Zero address");

        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));

        uint256 amount0 = balance0 - reserve0;
        uint256 amount1 = balance1 - reserve1;
        require(amount0 > 0 && amount1 > 0, "Insufficient liquidity");

        uint256 _totalSupply = totalSupply();
        if (_totalSupply == 0) {
            liquidity = sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
            _mint(address(1), MINIMUM_LIQUIDITY);
        } else {
            liquidity = min(
                (amount0 * _totalSupply) / reserve0,
                (amount1 * _totalSupply) / reserve1
            );
        }

        require(liquidity > 0, "Insufficient liquidity");
        _mint(to, liquidity);

        _update(balance0, balance1);
        emit Mint(msg.sender, amount0, amount1);
    }

    function burn(address to) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        require(!IPoolFactoryLite(factory).isPaused(), "Paused");
        require(to != address(0), "Zero address");

        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        uint256 liquidity = balanceOf(address(this));

        uint256 _totalSupply = totalSupply();
        require(_totalSupply > 0 && liquidity > 0, "Insufficient burn");

        amount0 = (liquidity * balance0) / _totalSupply;
        amount1 = (liquidity * balance1) / _totalSupply;
        require(amount0 > 0 && amount1 > 0, "Insufficient burn");

        _burn(address(this), liquidity);
        IERC20(token0).safeTransfer(to, amount0);
        IERC20(token1).safeTransfer(to, amount1);

        _update(
            IERC20(token0).balanceOf(address(this)),
            IERC20(token1).balanceOf(address(this))
        );
        emit Burn(msg.sender, amount0, amount1, to);
    }

    function swap(uint256 amount0Out, uint256 amount1Out, address to) external nonReentrant {
        require(!IPoolFactoryLite(factory).isPaused(), "Paused");
        require(amount0Out > 0 || amount1Out > 0, "Invalid out");
        require(to != address(0) && to != token0 && to != token1, "Invalid to");

        (uint256 _reserve0, uint256 _reserve1) = (reserve0, reserve1);
        require(amount0Out < _reserve0 && amount1Out < _reserve1, "Insufficient liquidity");

        // optimistic transfer out
        if (amount0Out > 0) IERC20(token0).safeTransfer(to, amount0Out);
        if (amount1Out > 0) IERC20(token1).safeTransfer(to, amount1Out);

        // balances after sending out
        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));

        // amounts in
        uint256 amount0In = balance0 > (_reserve0 - amount0Out) ? balance0 - (_reserve0 - amount0Out) : 0;
        uint256 amount1In = balance1 > (_reserve1 - amount1Out) ? balance1 - (_reserve1 - amount1Out) : 0;
        require(amount0In > 0 || amount1In > 0, "No input");

        // fees
        uint256 feeBps = IPoolFactoryLite(factory).getFee(stable);
        uint256 fee0 = (amount0In * feeBps) / 10000;
        uint256 fee1 = (amount1In * feeBps) / 10000;
        if (fee0 > 0) IERC20(token0).safeTransfer(poolFees, fee0);
        if (fee1 > 0) IERC20(token1).safeTransfer(poolFees, fee1);
        if (fee0 > 0 || fee1 > 0) {
            PoolFees(poolFees).notifyFees(fee0, fee1);
        }
        
        // balances after fees
        uint256 balance0AfterFee = IERC20(token0).balanceOf(address(this));
        uint256 balance1AfterFee = IERC20(token1).balanceOf(address(this));
        require(balance0AfterFee * balance1AfterFee >= uint256(_reserve0) * _reserve1, "K invariant");

        _update(balance0AfterFee, balance1AfterFee);
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }

    
    function sync() external {
        _update(
            IERC20(token0).balanceOf(address(this)),
            IERC20(token1).balanceOf(address(this))
        );
    }

    function getAmountOut(uint256 amountIn, address tokenIn) external view returns (uint256 amountOut) {
        require(amountIn > 0, "Zero input");
        require(tokenIn == token0 || tokenIn == token1, "Invalid token");

        uint256 feeBps = IPoolFactoryLite(factory).getFee(stable);
        uint256 reserveIn = tokenIn == token0 ? reserve0 : reserve1;
        uint256 reserveOut = tokenIn == token0 ? reserve1 : reserve0;

        uint256 amountInWithFee = (amountIn * (10000 - feeBps)) / 10000;
        amountOut = (reserveOut * amountInWithFee) / (reserveIn + amountInWithFee);
    }

    function tokens() external view returns (address, address) { return (token0, token1); }
    function getReserves() external view returns (uint256, uint256) { return (reserve0, reserve1); }

    function _update(uint256 balance0_, uint256 balance1_) internal {
        reserve0 = balance0_;
        reserve1 = balance1_;
        emit Sync(reserve0, reserve1);
    }

    function _afterTokenTransfer(address from, address to, uint256 /*amount*/) internal override {
        if (from != address(0)) { PoolFees(poolFees).updateFor(from); }
        if (to != address(0))   { PoolFees(poolFees).updateFor(to);   }
        super._afterTokenTransfer(from, to, 0);
    }

    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) { z = y; uint256 x = y / 2 + 1; while (x < z) { z = x; x = (y / x + x) / 2; } }
        else if (y != 0) { z = 1; }
    }
    function min(uint256 x, uint256 y) internal pure returns (uint256) { return x < y ? x : y; }
}
