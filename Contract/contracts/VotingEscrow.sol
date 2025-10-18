// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract VotingEscrow is ERC721, ReentrancyGuard {
    using Counters for Counters.Counter;

    IERC20 public immutable token; // LIBRA
    uint256 public constant MAX_LOCK_TIME = 4 * 365 days; // 4 years
    Counters.Counter private _ids;

    struct Lock { uint256 amount; uint256 unlockTime; }
    mapping(uint256 => Lock) public locks;

    event LockCreated(uint256 indexed tokenId, address indexed user, uint256 amount, uint256 unlockTime);
    event AmountIncreased(uint256 indexed tokenId, uint256 addAmount);
    event LockTimeExtended(uint256 indexed tokenId, uint256 newUnlockTime);
    event Withdrawn(uint256 indexed tokenId, address indexed user, uint256 amount);
    event Merged(uint256 fromId, uint256 toId, uint256 mergedAmount, uint256 newUnlockTime);

    constructor(address _token) ERC721("Vote-escrowed LIBRA", "veLIBRA") {
        token = IERC20(_token);
    }

    function createLock(uint256 amount, uint256 unlockTime) external nonReentrant returns (uint256 tokenId) {
        require(amount > 0, "amount=0");
        require(unlockTime > block.timestamp, "bad time");
        require(unlockTime <= block.timestamp + MAX_LOCK_TIME, "exceeds max");

        token.transferFrom(msg.sender, address(this), amount);

        _ids.increment();
        tokenId = _ids.current();
        _mint(msg.sender, tokenId);
        locks[tokenId] = Lock(amount, unlockTime);
        emit LockCreated(tokenId, msg.sender, amount, unlockTime);
    }

    function increaseAmount(uint256 tokenId, uint256 addAmount) external nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "not owner");
        require(addAmount > 0, "zero");
        token.transferFrom(msg.sender, address(this), addAmount);
        locks[tokenId].amount += addAmount;
        emit AmountIncreased(tokenId, addAmount);
    }

    function increaseLockTime(uint256 tokenId, uint256 newUnlockTime) external nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "not owner");
        require(newUnlockTime > locks[tokenId].unlockTime, "not extend");
        require(newUnlockTime <= block.timestamp + MAX_LOCK_TIME, "exceeds max");
        locks[tokenId].unlockTime = newUnlockTime;
        emit LockTimeExtended(tokenId, newUnlockTime);
    }

    function merge(uint256 fromId, uint256 toId) external {
        require(fromId != toId, "cannot merge to self"); // <— FIX
        require(ownerOf(fromId) == msg.sender && ownerOf(toId) == msg.sender, "not owner");

        Lock memory a = locks[fromId];
        Lock storage b = locks[toId];
        require(a.amount > 0, "empty from");

        if (a.unlockTime > b.unlockTime) b.unlockTime = a.unlockTime;
        b.amount += a.amount;

        delete locks[fromId];
        _burn(fromId);
        emit Merged(fromId, toId, a.amount, b.unlockTime);
    }

    function withdraw(uint256 tokenId) external nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "not owner");
        require(block.timestamp >= locks[tokenId].unlockTime, "locked");
        uint256 amt = locks[tokenId].amount;
        delete locks[tokenId];
        _burn(tokenId);
        token.transfer(msg.sender, amt);
        emit Withdrawn(tokenId, msg.sender, amt);
    }

    function votingPower(uint256 tokenId) public view returns (uint256) {
        Lock memory l = locks[tokenId];
        if (l.amount == 0 || block.timestamp >= l.unlockTime) return 0;
        uint256 remaining = l.unlockTime - block.timestamp;
        return (l.amount * remaining) / MAX_LOCK_TIME;
    }
}
