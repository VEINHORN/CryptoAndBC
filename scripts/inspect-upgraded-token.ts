import { network } from "hardhat";

import {
  implementationAt,
  requiredAddress,
  sepoliaUrl,
} from "./upgradeable-token-utils.js";

const proxyAddress = requiredAddress("TOKEN_PROXY_ADDRESS");
const ownerAddress = requiredAddress("TOKEN_OWNER_ADDRESS");
const aliceAddress = requiredAddress("TOKEN_ALICE_ADDRESS");
const bobAddress = requiredAddress("TOKEN_BOB_ADDRESS");

const { viem } = await network.create();
const publicClient = await viem.getPublicClient();
const token = await viem.getContractAt("MyTokenV2", proxyAddress);

const [implementation, ownerBalance, aliceBalance, bobBalance, totalSupply, version] =
  await Promise.all([
    implementationAt(publicClient, proxyAddress),
    token.read.balanceOf([ownerAddress]),
    token.read.balanceOf([aliceAddress]),
    token.read.balanceOf([bobAddress]),
    token.read.totalSupply(),
    token.read.version(),
  ]);

console.log(
  JSON.stringify(
    {
      proxy: proxyAddress,
      proxyAddress: sepoliaUrl("address", proxyAddress),
      implementation,
      ownerBalance: ownerBalance.toString(),
      aliceBalance: aliceBalance.toString(),
      bobBalance: bobBalance.toString(),
      totalSupply: totalSupply.toString(),
      version,
    },
    null,
    2,
  ),
);
