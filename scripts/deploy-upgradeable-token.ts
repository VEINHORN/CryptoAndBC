import { network } from "hardhat";
import { encodeFunctionData } from "viem";

import {
  INITIAL_SUPPLY,
  TOKEN_INITIALIZER_ABI,
  proxyAdminFromLogs,
  sepoliaUrl,
} from "./upgradeable-token-utils.js";

const { viem } = await network.create();
const publicClient = await viem.getPublicClient();
const [deployer] = await viem.getWalletClients();

const { contract: implementationV1, deploymentTransaction: implementationTx } =
  await viem.sendDeploymentTransaction("MyTokenV1");
await publicClient.waitForTransactionReceipt({ hash: implementationTx.hash });

const initializationData = encodeFunctionData({
  abi: TOKEN_INITIALIZER_ABI,
  functionName: "initialize",
  args: [deployer.account.address, INITIAL_SUPPLY],
});

const { contract: proxy, deploymentTransaction: proxyTx } =
  await viem.sendDeploymentTransaction("MyTokenProxy", [
    implementationV1.address,
    deployer.account.address,
    initializationData,
  ]);
const proxyReceipt = await publicClient.waitForTransactionReceipt({
  hash: proxyTx.hash,
});
const proxyAdmin = proxyAdminFromLogs(proxyReceipt.logs);

console.log(
  JSON.stringify(
    {
      network: "sepolia",
      deployer: deployer.account.address,
      initialSupply: INITIAL_SUPPLY.toString(),
      implementationV1: implementationV1.address,
      implementationV1Deployment: sepoliaUrl("tx", implementationTx.hash),
      proxy: proxy.address,
      proxyAddress: sepoliaUrl("address", proxy.address),
      proxyDeployment: sepoliaUrl("tx", proxyTx.hash),
      proxyAdmin,
      proxyAdminAddress: sepoliaUrl("address", proxyAdmin),
    },
    null,
    2,
  ),
);
