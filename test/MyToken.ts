import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { parseEther } from "viem";

describe("MyToken", async function () {
  const { viem } = await network.create();
  const INITIAL_SUPPLY = parseEther("1000000");

  // ─── Helpers ─────────────────────────────────────────────────────────────

  async function deployToken() {
    const [owner, alice, bob] = await viem.getWalletClients();
    const myToken = await viem.deployContract("MyToken", [INITIAL_SUPPLY]);
    return { myToken, owner, alice, bob };
  }

  // ─── Initial supply / minting ─────────────────────────────────────────────

  it("Should deploy with the correct initial supply minted to the owner", async function () {
    const { myToken, owner } = await deployToken();

    const ownerBalance = await myToken.read.balanceOf([owner.account.address]);
    assert.equal(ownerBalance, INITIAL_SUPPLY);
  });

  it("Should have the correct total supply", async function () {
    const { myToken } = await deployToken();

    const totalSupply = await myToken.read.totalSupply();
    assert.equal(totalSupply, INITIAL_SUPPLY);
  });

  it("Should set the correct token name and symbol", async function () {
    const { myToken } = await deployToken();

    assert.equal(await myToken.read.name(), "MyToken");
    assert.equal(await myToken.read.symbol(), "MTK");
  });

  // ─── Balance checks ───────────────────────────────────────────────────────

  it("Non-owner should start with zero balance", async function () {
    const { myToken, alice } = await deployToken();

    const aliceBalance = await myToken.read.balanceOf([alice.account.address]);
    assert.equal(aliceBalance, 0n);
  });

  // ─── Transfers ────────────────────────────────────────────────────────────

  it("Owner can transfer tokens to another account", async function () {
    const { myToken, owner, alice } = await deployToken();
    const amount = parseEther("100");

    await myToken.write.transfer([alice.account.address, amount]);

    assert.equal(
      await myToken.read.balanceOf([alice.account.address]),
      amount,
    );
    assert.equal(
      await myToken.read.balanceOf([owner.account.address]),
      INITIAL_SUPPLY - amount,
    );
  });

  it("Transfer emits a Transfer event", async function () {
    const { myToken, owner, alice } = await deployToken();
    const amount = parseEther("50");

    await viem.assertions.emitWithArgs(
      myToken.write.transfer([alice.account.address, amount]),
      myToken,
      "Transfer",
      [owner.account.address, alice.account.address, amount],
    );
  });

  it("Recipient can transfer received tokens onward", async function () {
    const { myToken, alice, bob } = await deployToken();
    const toAlice = parseEther("200");
    const toBob = parseEther("80");

    // owner → alice
    await myToken.write.transfer([alice.account.address, toAlice]);

    // alice → bob
    await myToken.write.transfer([bob.account.address, toBob], {
      account: alice.account,
    });

    assert.equal(
      await myToken.read.balanceOf([alice.account.address]),
      toAlice - toBob,
    );
    assert.equal(
      await myToken.read.balanceOf([bob.account.address]),
      toBob,
    );
  });

  it("Should revert when sender has insufficient balance", async function () {
    const { myToken, alice, bob } = await deployToken();

    // alice has 0 tokens — OZ ERC20 throws ERC20InsufficientBalance
    await viem.assertions.revertWithCustomError(
      myToken.write.transfer([bob.account.address, parseEther("1")], {
        account: alice.account,
      }),
      myToken,
      "ERC20InsufficientBalance",
    );
  });

  it("Total supply is unchanged after transfers", async function () {
    const { myToken, alice } = await deployToken();

    await myToken.write.transfer([alice.account.address, parseEther("300")]);

    assert.equal(await myToken.read.totalSupply(), INITIAL_SUPPLY);
  });

  // ─── transferFrom (approve + delegated spend) ─────────────────────────────

  it("transferFrom moves tokens after approval", async function () {
    const { myToken, owner, alice, bob } = await deployToken();
    const amount = parseEther("150");

    // owner approves alice to spend on their behalf
    await myToken.write.approve([alice.account.address, amount]);

    // alice pulls owner → bob
    await myToken.write.transferFrom(
      [owner.account.address, bob.account.address, amount],
      { account: alice.account },
    );

    assert.equal(await myToken.read.balanceOf([bob.account.address]), amount);
    assert.equal(
      await myToken.read.balanceOf([owner.account.address]),
      INITIAL_SUPPLY - amount,
    );
    // allowance fully consumed
    assert.equal(
      await myToken.read.allowance([owner.account.address, alice.account.address]),
      0n,
    );
  });

  it("transferFrom emits Transfer and Approval events", async function () {
    const { myToken, owner, alice, bob } = await deployToken();
    const amount = parseEther("75");

    await myToken.write.approve([alice.account.address, amount]);

    await viem.assertions.emitWithArgs(
      myToken.write.transferFrom(
        [owner.account.address, bob.account.address, amount],
        { account: alice.account },
      ),
      myToken,
      "Transfer",
      [owner.account.address, bob.account.address, amount],
    );
  });

  it("approve emits an Approval event", async function () {
    const { myToken, owner, alice } = await deployToken();
    const amount = parseEther("500");

    await viem.assertions.emitWithArgs(
      myToken.write.approve([alice.account.address, amount]),
      myToken,
      "Approval",
      [owner.account.address, alice.account.address, amount],
    );
  });

  // ─── Edge cases ───────────────────────────────────────────────────────────

  it("transfer reverts when amount exceeds balance", async function () {
    const { myToken, alice, bob } = await deployToken();
    const tooMuch = INITIAL_SUPPLY + 1n;

    // alice has 0 tokens — sending any amount reverts
    await viem.assertions.revertWithCustomError(
      myToken.write.transfer([bob.account.address, tooMuch], {
        account: alice.account,
      }),
      myToken,
      "ERC20InsufficientBalance",
    );
  });

  it("transferFrom reverts without sufficient allowance", async function () {
    const { myToken, owner, alice, bob } = await deployToken();

    // alice has no allowance — transferFrom should revert
    await viem.assertions.revertWithCustomError(
      myToken.write.transferFrom(
        [owner.account.address, bob.account.address, parseEther("1")],
        { account: alice.account },
      ),
      myToken,
      "ERC20InsufficientAllowance",
    );
  });

  it("transferFrom reverts when spending more than approved allowance", async function () {
    const { myToken, owner, alice, bob } = await deployToken();
    const approved = parseEther("10");
    const overSpend = parseEther("11");

    await myToken.write.approve([alice.account.address, approved]);

    await viem.assertions.revertWithCustomError(
      myToken.write.transferFrom(
        [owner.account.address, bob.account.address, overSpend],
        { account: alice.account },
      ),
      myToken,
      "ERC20InsufficientAllowance",
    );
  });

  // ─── Mint edge cases ──────────────────────────────────────────────────────

  it("Owner can mint additional tokens", async function () {
    const { myToken, owner, alice } = await deployToken();
    const mintAmount = parseEther("5000");

    await myToken.write.mint([alice.account.address, mintAmount]);

    assert.equal(
      await myToken.read.balanceOf([alice.account.address]),
      mintAmount,
    );
    assert.equal(
      await myToken.read.totalSupply(),
      INITIAL_SUPPLY + mintAmount,
    );
  });

  it("Non-owner cannot mint tokens", async function () {
    const { myToken, alice, bob } = await deployToken();

    // alice is not the owner — mint should revert with OwnableUnauthorizedAccount
    await viem.assertions.revertWithCustomError(
      myToken.write.mint([bob.account.address, parseEther("1")], {
        account: alice.account,
      }),
      myToken,
      "OwnableUnauthorizedAccount",
    );
  });
});
