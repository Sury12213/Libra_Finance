// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Treasury is Ownable {
    using SafeERC20 for IERC20;

    address public keeper;
    IERC20 public immutable LIBRA;

    address public constant DEAD = 0x000000000000000000000000000000000000dEaD;

    event KeeperUpdated(address keeper);
    event FeesReceived(address indexed token, uint256 amount);
    event LibraBurned(uint256 amount);
    event Swept(address indexed token, address indexed to, uint256 amount);

    modifier onlyKeeperOrOwner() { require(msg.sender == keeper || msg.sender == owner(), "not auth"); _; }

    constructor(address _libra) { LIBRA = IERC20(_libra); }

    function setKeeper(address k) external onlyOwner { keeper = k; emit KeeperUpdated(k); }

    function collectFees(address token, uint256 amount) external onlyKeeperOrOwner {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        emit FeesReceived(token, amount);
    }

    function burnLibra(uint256 amount) external onlyKeeperOrOwner {
        require(LIBRA.balanceOf(address(this)) >= amount, "insufficient");
        LIBRA.safeTransfer(DEAD, amount);
        emit LibraBurned(amount);
    }

    function sweep(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
        emit Swept(token, to, amount);
    }
}
