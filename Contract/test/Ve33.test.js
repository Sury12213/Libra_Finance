// SPDX-License-Identifier: MIT
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const WEEK = 7 * 24 * 60 * 60;
const MAX_LOCK = 4 * 365 * 24 * 60 * 60;

async function deployFixture() {
  const [owner, user1, keeper] = await ethers.getSigners();

  console.log("Deploy order start");

  // --- Deploy mock token ---
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const libra = await MockERC20.deploy(
    "Libra",
    "LIBRA",
    ethers.parseEther("10000000")
  );
  await libra.waitForDeployment();
  console.log("libra:", libra.target);

  const t0 = await MockERC20.deploy(
    "Token0",
    "TK0",
    ethers.parseEther("1000000")
  );
  await t0.waitForDeployment();
  const t1 = await MockERC20.deploy(
    "Token1",
    "TK1",
    ethers.parseEther("1000000")
  );
  await t1.waitForDeployment();

  // --- Deploy Pool implementation ---
  const Pool = await ethers.getContractFactory("Pool");
  const poolImpl = await Pool.deploy();
  await poolImpl.waitForDeployment();
  console.log("poolImpl:", poolImpl.target);

  // --- Deploy PoolFactory ---
  const PoolFactory = await ethers.getContractFactory("PoolFactory");
  const poolFactory = await PoolFactory.deploy(poolImpl.target);
  await poolFactory.waitForDeployment();
  console.log("poolFactory:", poolFactory.target);

  // --- Deploy ve(3,3) core ---
  const VotingEscrow = await ethers.getContractFactory("VotingEscrow");
  const ve = await VotingEscrow.deploy(libra.target);
  await ve.waitForDeployment();
  console.log("ve:", ve.target);

  // --- Deploy Gauge Implementation ---
  const Gauge = await ethers.getContractFactory("Gauge");
  const gaugeImpl = await Gauge.deploy();
  await gaugeImpl.waitForDeployment();
  console.log("gaugeImpl:", gaugeImpl.target);

  // --- Deploy GaugeFactory ---
  const GaugeFactory = await ethers.getContractFactory("GaugeFactory");
  const gaugeFactory = await GaugeFactory.deploy();
  await gaugeFactory.waitForDeployment();
  await gaugeFactory.setImplementation(gaugeImpl.target);
  console.log("gaugeFactory:", gaugeFactory.target);

  // --- Deploy Bribe Implementation ---
  const Bribe = await ethers.getContractFactory("Bribe");
  const bribeImpl = await Bribe.deploy();
  await bribeImpl.waitForDeployment();
  console.log("bribeImpl:", bribeImpl.target);

  // --- Deploy BribeFactory ---
  const BribeFactory = await ethers.getContractFactory("BribeFactory");
  const bribeFactory = await BribeFactory.deploy();
  await bribeFactory.waitForDeployment();
  await bribeFactory.setImplementation(bribeImpl.target);
  console.log("bribeFactory:", bribeFactory.target);

  // --- Deploy Voter (needs all above) ---
  const Voter = await ethers.getContractFactory("Voter");
  const voter = await Voter.deploy(
    ve.target,
    gaugeFactory.target,
    bribeFactory.target,
    poolFactory.target,
    libra.target
  );
  await voter.waitForDeployment();
  console.log("voter:", voter.target);

  // --- Deploy Minter & Treasury ---
  const Minter = await ethers.getContractFactory("Minter");
  const minter = await Minter.deploy(libra.target, voter.target);
  await minter.waitForDeployment();

  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy(libra.target);
  await treasury.waitForDeployment();

  // --- Setup ---
  await poolFactory.connect(owner).setVoter(voter.target);
  await voter.setKeeper(keeper.address);
  await voter.setMinter(minter.target);
  await minter.setKeeper(keeper.address);
  await treasury.setKeeper(keeper.address);

  // ✅ Fund minter with LIBRA tokens
  await libra.transfer(minter.target, ethers.parseEther("100000"));

  // --- Fund tokens ---
  await libra.transfer(user1.address, ethers.parseEther("10000"));
  await t0.transfer(user1.address, ethers.parseEther("1000"));
  await t1.transfer(user1.address, ethers.parseEther("1000"));

  await t0.connect(user1).approve(poolFactory.target, ethers.MaxUint256);
  await t1.connect(user1).approve(poolFactory.target, ethers.MaxUint256);
  await libra.connect(user1).approve(ve.target, ethers.MaxUint256);

  // --- Create Pool ---
  await poolFactory.createPool(t0.target, t1.target, false);
  const poolAddr = await poolFactory.getPool(t0.target, t1.target, false);
  const pool = await ethers.getContractAt("Pool", poolAddr);

  const gaugeAddr = await voter.gauges(poolAddr);
  const bribeAddr = await voter.bribes(poolAddr);
  console.log("Gauge:", gaugeAddr, "Bribe:", bribeAddr);

  return {
    owner,
    user1,
    keeper,
    libra,
    t0,
    t1,
    poolFactory,
    pool,
    ve,
    voter,
    minter,
    treasury,
    gaugeAddr,
    bribeAddr,
  };
}

describe("Libra ve(3,3) System", function () {
  describe("🟢 Happy Cases", function () {
    it("creates lock, votes and distributes reward correctly", async function () {
      const {
        owner,
        user1,
        keeper,
        ve,
        voter,
        pool,
        libra,
        gaugeAddr,
        t0,
        t1,
      } = await deployFixture();
      const amount = ethers.parseEther("100");
      const unlock = (await time.latest()) + MAX_LOCK;

      // create lock
      await ve.connect(user1).createLock(amount, unlock);
      const tokenId = 1n;

      // Get power and use 99% of it
      const power = await ve.votingPower(tokenId);
      expect(power).to.be.gt(0);
      const voteWeight = (power * 99n) / 100n;

      // vote
      await voter.connect(user1).vote(tokenId, [pool.target], [voteWeight]);
      const poolWeight = await voter.poolWeight(pool.target);
      expect(poolWeight).to.be.gt(0);

      // ✅ Add liquidity to pool and stake in gauge
      await t0.connect(user1).transfer(pool.target, ethers.parseEther("10"));
      await t1.connect(user1).transfer(pool.target, ethers.parseEther("10"));
      await pool.connect(user1).mint(user1.address);

      const gauge = await ethers.getContractAt("Gauge", gaugeAddr);
      const lpBalance = await pool.balanceOf(user1.address);
      await pool.connect(user1).approve(gauge.target, lpBalance);
      await gauge.connect(user1).deposit(lpBalance);

      // simulate reward distribution
      await libra.transfer(voter.target, ethers.parseEther("500"));
      await voter.connect(keeper).distributeAll(ethers.parseEther("500"));

      // ✅ Mine a few blocks to ensure rewards are settled
      await ethers.provider.send("evm_mine", []);

      // ✅ Check pending rewards before claiming
      const pending = await gauge.pendingReward(user1.address);
      console.log("Pending reward:", ethers.formatEther(pending));

      // claim reward from gauge
      const balBefore = await libra.balanceOf(user1.address);
      await gauge.connect(user1).getReward();
      const balAfter = await libra.balanceOf(user1.address);

      // ✅ If no rewards, the test will show why
      if (balAfter <= balBefore) {
        console.log("No rewards claimed!");
        console.log(
          "Gauge LP balance:",
          ethers.formatEther(await gauge.balanceOf(user1.address))
        );
        console.log(
          "Total supply:",
          ethers.formatEther(await gauge.totalSupply())
        );
        console.log(
          "Gauge reward balance:",
          ethers.formatEther(await libra.balanceOf(gauge.target))
        );
      }

      expect(balAfter).to.be.gt(balBefore);
    });

    it("handles bribe correctly", async function () {
      const { owner, user1, voter, bribeAddr, libra, pool, ve } =
        await deployFixture();
      const bribe = await ethers.getContractAt("Bribe", bribeAddr);

      const amount = ethers.parseEther("50");
      const unlock = (await time.latest()) + MAX_LOCK;
      await ve.connect(user1).createLock(amount, unlock);
      const tokenId = 1n;

      const power = await ve.votingPower(tokenId);
      const voteWeight = (power * 99n) / 100n;
      await voter.connect(user1).vote(tokenId, [pool.target], [voteWeight]);

      const reward = ethers.parseEther("25");
      const epoch = Math.floor((await time.latest()) / WEEK);

      // ✅ Use helper function through voter
      await libra.connect(owner).approve(voter.target, reward);
      await voter.connect(owner).notifyBribeReward(pool.target, epoch, reward);

      await time.increase(WEEK);
      const before = await libra.balanceOf(user1.address);
      await bribe.connect(user1).claim(epoch);
      const after = await libra.balanceOf(user1.address);
      expect(after - before).to.equal(reward);
    });

    it("minter emits decaying weekly emission", async function () {
      const { minter, keeper, poolFactory, libra, ve, user1, voter } =
        await deployFixture();

      // Create a pool with votes
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const tokenA = await MockERC20.deploy(
        "TokenA",
        "TKA",
        ethers.parseEther("1000000")
      );
      await tokenA.waitForDeployment();
      const tokenB = await MockERC20.deploy(
        "TokenB",
        "TKB",
        ethers.parseEther("1000000")
      );
      await tokenB.waitForDeployment();

      await poolFactory.createPool(tokenA.target, tokenB.target, false);
      const poolAddr = await poolFactory.getPool(
        tokenA.target,
        tokenB.target,
        false
      );
      const pool = await ethers.getContractAt("Pool", poolAddr);

      const lockAmount = ethers.parseEther("100");
      const unlock = (await time.latest()) + MAX_LOCK;
      await ve.connect(user1).createLock(lockAmount, unlock);
      const tokenId = 1n;

      const power = await ve.votingPower(tokenId);
      const voteWeight = (power * 99n) / 100n;
      await voter.connect(user1).vote(tokenId, [pool.target], [voteWeight]);

      const initial = await minter.weeklyEmission();
      await time.increase(WEEK);
      await minter.connect(keeper).updatePeriod();
      const decayed = await minter.weeklyEmission();
      expect(decayed).to.equal((initial * 9900n) / 10000n);
    });
  });

  describe("🔴 Unhappy Cases", function () {
    it("reverts creating lock with invalid time", async function () {
      const { user1, ve } = await deployFixture();
      const amount = ethers.parseEther("10");
      const now = await time.latest();
      await expect(
        ve.connect(user1).createLock(amount, now - 1)
      ).to.be.revertedWith("bad time");
      await expect(
        ve.connect(user1).createLock(amount, now + MAX_LOCK + WEEK)
      ).to.be.revertedWith("exceeds max");
    });

    it("reverts when voting exceeds power", async function () {
      const { user1, ve, voter, pool } = await deployFixture();
      const amount = ethers.parseEther("10");
      const unlock = (await time.latest()) + MAX_LOCK;
      await ve.connect(user1).createLock(amount, unlock);
      const tokenId = 1n;
      const power = await ve.votingPower(tokenId);

      await expect(
        voter.connect(user1).vote(tokenId, [pool.target], [power + 1n])
      ).to.be.reverted;
    });

    it("prevents duplicate epoch distribution", async function () {
      const { voter, libra, keeper, poolFactory, ve, user1 } =
        await deployFixture();

      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const tokenA = await MockERC20.deploy(
        "TokenA",
        "TKA",
        ethers.parseEther("1000000")
      );
      await tokenA.waitForDeployment();
      const tokenB = await MockERC20.deploy(
        "TokenB",
        "TKB",
        ethers.parseEther("1000000")
      );
      await tokenB.waitForDeployment();

      await poolFactory.createPool(tokenA.target, tokenB.target, false);
      const poolAddr = await poolFactory.getPool(
        tokenA.target,
        tokenB.target,
        false
      );
      const pool = await ethers.getContractAt("Pool", poolAddr);

      const lockAmount = ethers.parseEther("100");
      const unlock = (await time.latest()) + MAX_LOCK;
      await ve.connect(user1).createLock(lockAmount, unlock);
      const tokenId = 1n;

      const power = await ve.votingPower(tokenId);
      const voteWeight = (power * 99n) / 100n;
      await voter.connect(user1).vote(tokenId, [pool.target], [voteWeight]);

      await libra.transfer(voter.target, ethers.parseEther("100"));
      await voter.connect(keeper).distributeAll(ethers.parseEther("100"));

      await expect(
        voter.connect(keeper).distributeAll(ethers.parseEther("50"))
      ).to.be.revertedWith("already distributed");
    });

    it("prevents early bribe claim", async function () {
      const { voter, pool, ve, user1, libra, bribeAddr, owner } =
        await deployFixture();
      const bribe = await ethers.getContractAt("Bribe", bribeAddr);
      const amount = ethers.parseEther("100");
      const unlock = (await time.latest()) + MAX_LOCK;
      await ve.connect(user1).createLock(amount, unlock);
      const tokenId = 1n;

      const power = await ve.votingPower(tokenId);
      const voteWeight = (power * 99n) / 100n;
      await voter.connect(user1).vote(tokenId, [pool.target], [voteWeight]);

      const reward = ethers.parseEther("50");
      const epoch = Math.floor((await time.latest()) / WEEK);

      // ✅ Use helper function
      await libra.connect(owner).approve(voter.target, reward);
      await voter.connect(owner).notifyBribeReward(pool.target, epoch, reward);

      await expect(bribe.connect(user1).claim(epoch)).to.be.revertedWith(
        "epoch not ended"
      );
    });
  });
});
