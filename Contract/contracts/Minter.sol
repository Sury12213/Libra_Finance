// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IVoterDist { function distributeAll(uint256 amount) external; }

contract Minter is Ownable {
    IERC20 public immutable token;
    address public immutable voter;

    uint256 public weeklyEmission = 1000 ether;
    uint256 public decayBps = 9900; // 99.00% = -1%/epoch
    uint256 public constant WEEK = 7 days;
    uint256 public lastEpochTime;

    address public keeper;

    event Emission(uint256 indexed epoch, uint256 amount);
    event KeeperUpdated(address keeper);
    event DecayUpdated(uint256 oldBps, uint256 newBps);

    modifier onlyKeeperOrOwner() { require(msg.sender == keeper || msg.sender == owner(), "not auth"); _; }

    constructor(address _token, address _voter) {
        token = IERC20(_token);
        voter = _voter;
        lastEpochTime = (block.timestamp / WEEK) * WEEK;
    }

    function setKeeper(address k) external onlyOwner { keeper = k; emit KeeperUpdated(k); }

    function setDecayBps(uint256 bps) external onlyOwner {
        require(bps <= 10000 && bps >= 9000, "range 90-100%");
        emit DecayUpdated(decayBps, bps);
        decayBps = bps;
    }

    function updatePeriod() external onlyKeeperOrOwner {
        require(block.timestamp >= lastEpochTime + WEEK, "epoch not ended");
        uint256 amount = weeklyEmission;
        weeklyEmission = (weeklyEmission * decayBps) / 10000;
        lastEpochTime = (block.timestamp / WEEK) * WEEK;

        require(token.balanceOf(address(this)) >= amount, "insufficient");
        token.transfer(voter, amount);
        IVoterDist(voter).distributeAll(amount);
        emit Emission(lastEpochTime / WEEK, amount);
    }
}
