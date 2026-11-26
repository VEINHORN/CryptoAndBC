import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { encodeFunctionData, parseEther } from "viem";

import {
  TOKEN_INITIALIZER_ABI,
  proxyAdminFromLogs,
} from "../scripts/upgradeable-token-utils.js";

describe("MyToken transparent proxy upgrade", async function () {
  const { networkHelpers, viem } = await network.create();
  const INITIAL_SUPPLY = parseEther("1000000");

  async function deployProxyFixture() {
    const [owner, alice, bob, attacker] = await viem.getWalletClients();
    const implementationV1 = await viem.deployContract("MyTokenV1");
    const initializationData = encodeFunctionData({
      abi: TOKEN_INITIALIZER_ABI,
      functionName: "initialize",
      args: [owner.account.address, INITIAL_SUPPLY],
    });
    const { contract: proxy, deploymentTransaction } =
      await viem.sendDeploymentTransaction("MyTokenProxy", [
        implementationV1.address,
        owner.account.address,
        initializationData,
      ]);
    const publicClient = await viem.getPublicClient();
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: deploymentTransaction.hash,
    });
    const proxyAdminAddress = proxyAdminFromLogs(receipt.logs);
    const tokenV1 = await viem.getContractAt("MyTokenV1", proxy.address);
    const proxyAdmin = await viem.getContractAt("IProxyAdmin", proxyAdminAddress);

    return {
      attacker,
      alice,
      bob,
      implementationV1,
      owner,
      proxy,
      proxyAdmin,
      tokenV1,
    };
  }

  it("initializes the proxy while leaving the implementation locked", async function () {
    const { implementationV1, owner, tokenV1 } =
      await networkHelpers.loadFixture(deployProxyFixture);

    assert.equal(await tokenV1.read.name(), "MyToken");
    assert.equal(await tokenV1.read.symbol(), "MTK");
    assert.equal(
      (await tokenV1.read.owner()).toLowerCase(),
      owner.account.address.toLowerCase(),
    );
    assert.equal(
      await tokenV1.read.balanceOf([owner.account.address]),
      INITIAL_SUPPLY,
    );

    await viem.assertions.revertWithCustomError(
      implementationV1.write.initialize([owner.account.address, INITIAL_SUPPLY]),
      implementationV1,
      "InvalidInitialization",
    );
  });

  it("retains ERC-20 state and exposes V2 after an owner-authorized upgrade", async function () {
    const { attacker, alice, bob, owner, proxy, proxyAdmin, tokenV1 } =
      await networkHelpers.loadFixture(deployProxyFixture);
    const mintAmount = parseEther("5000");
    const transferAmount = parseEther("1000");
    const allowance = parseEther("500");
    const delegatedTransfer = parseEther("100");

    await tokenV1.write.mint([alice.account.address, mintAmount]);
    await tokenV1.write.transfer([bob.account.address, transferAmount], {
      account: alice.account,
    });
    await tokenV1.write.approve([alice.account.address, allowance]);
    await tokenV1.write.transferFrom(
      [owner.account.address, bob.account.address, delegatedTransfer],
      { account: alice.account },
    );

    const balancesBefore = await Promise.all([
      tokenV1.read.balanceOf([owner.account.address]),
      tokenV1.read.balanceOf([alice.account.address]),
      tokenV1.read.balanceOf([bob.account.address]),
      tokenV1.read.totalSupply(),
      tokenV1.read.allowance([owner.account.address, alice.account.address]),
    ]);

    const implementationV2 = await viem.deployContract("MyTokenV2");

    await viem.assertions.revertWithCustomError(
      proxyAdmin.write.upgradeAndCall(
        [proxy.address, implementationV2.address, "0x"],
        { account: attacker.account },
      ),
      proxyAdmin,
      "OwnableUnauthorizedAccount",
    );

    await proxyAdmin.write.upgradeAndCall([
      proxy.address,
      implementationV2.address,
      "0x",
    ]);

    const tokenV2 = await viem.getContractAt("MyTokenV2", proxy.address);
    const balancesAfter = await Promise.all([
      tokenV2.read.balanceOf([owner.account.address]),
      tokenV2.read.balanceOf([alice.account.address]),
      tokenV2.read.balanceOf([bob.account.address]),
      tokenV2.read.totalSupply(),
      tokenV2.read.allowance([owner.account.address, alice.account.address]),
    ]);

    assert.deepEqual(balancesAfter, balancesBefore);
    assert.equal(await tokenV2.read.name(), "MyToken");
    assert.equal(await tokenV2.read.symbol(), "MTK");
    assert.equal(
      (await tokenV2.read.owner()).toLowerCase(),
      owner.account.address.toLowerCase(),
    );
    assert.equal(await tokenV2.read.version(), "V2");
  });
});
