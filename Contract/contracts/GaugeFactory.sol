// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./Gauge.sol";

contract GaugeFactory {
    address public implementation;

    event GaugeCreated(address indexed pool, address gauge);

    function setImplementation(address _impl) external {
        implementation = _impl;
    }

    function createGauge(address _pool, address _reward, address _voter) external returns (address gauge) {
        gauge = Clones.clone(implementation);
        Gauge(gauge).initialize(_pool, _reward, _voter);
        emit GaugeCreated(_pool, gauge);
    }
}
