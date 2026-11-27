// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal ABI used to operate OpenZeppelin's automatically deployed ProxyAdmin.
interface IProxyAdmin {
    error OwnableUnauthorizedAccount(address account);

    function upgradeAndCall(address proxy, address implementation, bytes calldata data) external payable;
}
