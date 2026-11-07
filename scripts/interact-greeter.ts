/**
 * interact-greeter.ts
 *
 * Reads the greet() return value from the already-deployed Greeter contract
 * on Sepolia. Run with:
 *
 *   npx hardhat run scripts/interact-greeter.ts --network sepolia
 */
import { network } from "hardhat";
import { getAddress } from "viem";

// Address printed by `npx hardhat ignition deploy` — update if redeployed.
const GREETER_ADDRESS = getAddress(
  "0x0000000000000000000000000000000000000000", // replaced after deployment
);

const { viem } = await network.create();

const greeter = await viem.getContractAt("Greeter", GREETER_ADDRESS);
const message = await greeter.read.greet();

console.log("greet() returned:", message);
