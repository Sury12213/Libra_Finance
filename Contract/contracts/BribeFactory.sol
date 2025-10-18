// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./Bribe.sol";

contract BribeFactory {
    address public implementation;

    event BribeCreated(address indexed reward, address indexed voter, address bribe);

    function setImplementation(address _impl) external {
        implementation = _impl;
    }

    function createBribe(address _reward, address _voter) external returns (address bribe) {
        bribe = Clones.clone(implementation);
        Bribe(bribe).initialize(_reward, _voter);
        emit BribeCreated(_reward, _voter, bribe);
    }
}
