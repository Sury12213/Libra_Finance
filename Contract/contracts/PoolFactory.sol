// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

interface IPool {
    function initialize(address token0, address token1, bool stable, string memory name, string memory symbol) external;
    function tokens() external view returns (address, address);
    function getReserves() external view returns (uint256, uint256);
}

interface IVoter {
    function createGauge(address pool) external returns (address);
}

contract PoolFactory {
    address public immutable implementation;
    address public poolAdmin;
    address public pauser;
    address public feeManager;
    address public voter; 
    bool public isPaused;

    uint256 public stableFee;
    uint256 public volatileFee;
    uint256 public constant MAX_FEE = 300;

    mapping(address => mapping(address => mapping(bool => address))) private _getPool;
    mapping(address => bool) private _isPool;
    address[] internal _allPools;

    event PoolCreated(address token0, address token1, bool stable, address pool, uint256 length);
    event SetPoolAdmin(address admin);
    event SetPauser(address pauser);
    event SetFeeManager(address feeManager);
    event SetVoter(address voter);
    event SetPause(bool state);
    event FeeUpdated(bool stable, uint256 fee);

    modifier onlyPoolAdmin() {
        require(msg.sender == poolAdmin, "Not admin");
        _;
    }

    constructor(address _implementation) {
        implementation = _implementation;
        poolAdmin = msg.sender;
        pauser = msg.sender;
        feeManager = msg.sender;
        stableFee = 5; // 0.05%
        volatileFee = 30; // 0.3%
    }

    function allPools() external view returns (address[] memory) {
        return _allPools;
    }

    function getPool(address tokenA, address tokenB, bool stable) external view returns (address) {
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        return _getPool[token0][token1][stable];
    }

    function isPool(address pool) external view returns (bool) {
        return _isPool[pool];
    }

    function getFee(bool stable) external view returns (uint256) {
        return stable ? stableFee : volatileFee;
    }

    function getPoolTVL(address pool) external view returns (uint256 tvl0, uint256 tvl1) {
        require(_isPool[pool], "Not pool");
        return IPool(pool).getReserves();
    }

    function setPoolAdmin(address _admin) external onlyPoolAdmin {
        require(_admin != address(0), "Zero address");
        poolAdmin = _admin;
        emit SetPoolAdmin(_admin);
    }

    function setPauser(address _pauser) external {
        require(msg.sender == pauser, "Not pauser");
        require(_pauser != address(0), "Zero address");
        pauser = _pauser;
        emit SetPauser(_pauser);
    }

    function setVoter(address _voter) external onlyPoolAdmin {
        require(_voter != address(0), "Zero address");
        voter = _voter;
        emit SetVoter(_voter);
    }

    function setPause(bool _state) external {
        require(msg.sender == pauser, "Not pauser");
        isPaused = _state;
        emit SetPause(_state);
    }

    function setFeeManager(address _fm) external {
        require(msg.sender == feeManager, "Not feeManager");
        require(_fm != address(0), "Zero address");
        feeManager = _fm;
        emit SetFeeManager(_fm);
    }

    function setFee(bool stable, uint256 fee) external {
        require(msg.sender == feeManager, "Not feeManager");
        require(fee > 0 && fee <= MAX_FEE, "Invalid fee");
        if (stable) {
            stableFee = fee;
        } else {
            volatileFee = fee;
        }
        emit FeeUpdated(stable, fee);
    }

    // Helper functions
    function getNameForPool(address tokenA, address tokenB, bool stable) public view returns (string memory) {
        string memory prefix = stable ? "StableLibraAMM - " : "VolatileLibraAMM - ";
        string memory tokenASymbol = IERC20Metadata(tokenA).symbol();
        string memory tokenBSymbol = IERC20Metadata(tokenB).symbol();
        
        return string(abi.encodePacked(prefix, tokenASymbol, "/", tokenBSymbol));
    }

    function getSymbolForPool(address tokenA, address tokenB, bool stable) public view returns (string memory) {
        string memory prefix = stable ? "sLP-" : "vLP-";
        string memory tokenASymbol = IERC20Metadata(tokenA).symbol();
        string memory tokenBSymbol = IERC20Metadata(tokenB).symbol();
        
        return string(abi.encodePacked(prefix, tokenASymbol, "/", tokenBSymbol));
    }

    function createPool(address tokenA, address tokenB, bool stable) external returns (address pool) {
        require(!isPaused, "Factory paused");
        require(tokenA != tokenB, "Same token");
        require(tokenA != address(0) && tokenB != address(0), "Zero address");
        require(tokenA != tokenB, "IDENTICAL_ADDRESSES");
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(_getPool[token0][token1][stable] == address(0), "Pool exists");

        IERC20Metadata t0 = IERC20Metadata(token0);
        IERC20Metadata t1 = IERC20Metadata(token1);
        
        string memory token0Symbol = t0.symbol();
        string memory token1Symbol = t1.symbol();
        
        string memory name_ = stable
            ? string(abi.encodePacked("StableLibraAMM-", token0Symbol, "-", token1Symbol))
            : string(abi.encodePacked("VolatileLibraAMM-", token0Symbol, "-", token1Symbol));

        string memory symbol_ = stable
            ? string(abi.encodePacked("sLP-", token0Symbol, "-", token1Symbol))
            : string(abi.encodePacked("vLP-", token0Symbol, "-", token1Symbol));


        bytes32 salt = keccak256(abi.encodePacked(token0, token1, stable));
        pool = Clones.cloneDeterministic(implementation, salt);

        IPool(pool).initialize(token0, token1, stable, name_, symbol_);

        _getPool[token0][token1][stable] = pool;
        _getPool[token1][token0][stable] = pool;
        _isPool[pool] = true;
        _allPools.push(pool);

        if (voter != address(0)) {
            IVoter(voter).createGauge(pool);
        }

        emit PoolCreated(token0, token1, stable, pool, _allPools.length);
    }
}