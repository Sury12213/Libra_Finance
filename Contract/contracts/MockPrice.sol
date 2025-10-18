// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MockPrice {
    mapping(address => uint256) public tokenPrices; // token address => price in USD (with 18 decimals)
    address public owner;

    event PriceUpdated(address indexed token, uint256 price);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setPrice(address token, uint256 price) external onlyOwner {
        require(token != address(0), "Invalid token");
        require(price > 0, "Price must be positive");
        tokenPrices[token] = price;
        emit PriceUpdated(token, price);
    }

    function getPrice(address token) external view returns (uint256) {
        require(tokenPrices[token] > 0, "Price not set");
        return tokenPrices[token];
    }
}