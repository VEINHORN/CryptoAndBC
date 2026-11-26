// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MyTokenV1} from "./MyTokenV1.sol";

/// @notice V2 deliberately adds no storage, preserving all V1 token state.
contract MyTokenV2 is MyTokenV1 {
    function version() external pure returns (string memory) {
        return "V2";
    }
}
