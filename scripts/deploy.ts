// SPDX-License-Identifier: MIT

import { network } from "hardhat";
import { parseEther } from "viem";

async function main() {
  const { viem } = await network.create();

  const [deployer] = await viem.getWalletClients();
  console.log("Deploying contract with account: " + deployer.account.address);

  const myToken = await viem.deployContract("MyToken", [parseEther("1000000")]);

  console.log("MyToken deployed to: ", myToken.address);
}

main().catch((error) => {
  console.log(error);
  process.exitCode = 1;
});
