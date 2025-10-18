// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor(
        string memory Name,
        string memory Symbol,
        uint256 InitialSupply
    ) ERC20(Name, Symbol) {
        _mint(msg.sender, InitialSupply);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}