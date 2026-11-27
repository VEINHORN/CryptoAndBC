// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

/// @notice A named deployment wrapper for OpenZeppelin's Transparent Proxy.
/// @dev Do not add externally callable functions here: transparent proxies must avoid selector clashes.
contract MyTokenProxy is TransparentUpgradeableProxy {
    constructor(address logic, address initialOwner, bytes memory data)
        TransparentUpgradeableProxy(logic, initialOwner, data)
    {}
}
