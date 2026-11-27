import { network } from "hardhat";

import {
  requiredAddress,
  sepoliaUrl,
} from "./upgradeable-token-utils.js";

const proxyAddress = requiredAddress("TOKEN_PROXY_ADDRESS");
const proxyAdminAddress = requiredAddress("TOKEN_PROXY_ADMIN_ADDRESS");
const implementationV2Address = requiredAddress("TOKEN_V2_IMPLEMENTATION_ADDRESS");

const { viem } = await network.create();
const publicClient = await viem.getPublicClient();
const proxyAdmin = await viem.getContractAt("IProxyAdmin", proxyAdminAddress);

const transactionHash = await proxyAdmin.write.upgradeAndCall([
  proxyAddress,
  implementationV2Address,
  "0x",
]);
await publicClient.waitForTransactionReceipt({ hash: transactionHash });

console.log(
  JSON.stringify(
    {
      proxy: proxyAddress,
      implementationV2: implementationV2Address,
      upgradeTransaction: sepoliaUrl("tx", transactionHash),
    },
    null,
    2,
  ),
);
