import { network } from "hardhat";

import { sepoliaUrl } from "./upgradeable-token-utils.js";

const { viem } = await network.create();
const publicClient = await viem.getPublicClient();

const { contract: implementationV2, deploymentTransaction } =
  await viem.sendDeploymentTransaction("MyTokenV2");
await publicClient.waitForTransactionReceipt({ hash: deploymentTransaction.hash });

console.log(
  JSON.stringify(
    {
      network: "sepolia",
      implementationV2: implementationV2.address,
      deployment: sepoliaUrl("tx", deploymentTransaction.hash),
      address: sepoliaUrl("address", implementationV2.address),
    },
    null,
    2,
  ),
);
