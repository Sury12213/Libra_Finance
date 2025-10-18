// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LibraToken is ERC20, Ownable {
    address public minter;

    event MinterUpdated(address indexed newMinter);
    event LibraMinted(address indexed to, uint256 amount);
    event LibraBurned(address indexed from, uint256 amount);

    constructor() ERC20("Libra Finance", "LIBRA") {
        _mint(msg.sender, 1_000_000 ether); 
    }

    function setMinter(address _minter) external onlyOwner {
        require(_minter != address(0), "Zero address");
        minter = _minter;
        emit MinterUpdated(_minter);
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == minter, "Not minter");
        _mint(to, amount);
        emit LibraMinted(to, amount);
    }

    function burn(address from, uint256 amount) external {
        require(msg.sender == minter || msg.sender == owner(), "Not allowed");
        _burn(from, amount);
        emit LibraBurned(from, amount);
    }
}
