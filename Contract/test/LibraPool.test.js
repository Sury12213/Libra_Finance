const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

async function deployFixture() {
  const [deployer, user1, user2, user3, extra1, extra2] =
    await ethers.getSigners();

  // Deploy tokens
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const token0 = await MockERC20.deploy(
    "Token0",
    "TK0",
    ethers.parseEther("1000000")
  );
  const token1 = await MockERC20.deploy(
    "Token1",
    "TK1",
    ethers.parseEther("1000000")
  );

  // Pool implementation + factory
  const Pool = await ethers.getContractFactory("Pool");
  const poolImplementation = await Pool.deploy();

  const PoolFactory = await ethers.getContractFactory("PoolFactory");
  const factory = await PoolFactory.deploy(
    await poolImplementation.getAddress()
  );

  // lấy pauser và feeManager thật từ contract
  const pauserAddr = await factory.pauser();
  const feeManagerAddr = await factory.feeManager();
  const pauser = await ethers.getSigner(pauserAddr);
  const feeManager = await ethers.getSigner(feeManagerAddr);

  // seed users
  await token0.transfer(user1.address, ethers.parseEther("10000"));
  await token0.transfer(user2.address, ethers.parseEther("10000"));
  await token0.transfer(user3.address, ethers.parseEther("10000"));
  await token1.transfer(user1.address, ethers.parseEther("10000"));
  await token1.transfer(user2.address, ethers.parseEther("10000"));
  await token1.transfer(user3.address, ethers.parseEther("10000"));

  return {
    factory,
    poolImplementation,
    token0,
    token1,
    owner: deployer,
    user1,
    user2,
    user3,
    pauser,
    feeManager,
  };
}

async function deployPoolFixture() {
  const fx = await deployFixture();
  const { factory, token0, token1 } = fx;

  await factory.createPool(
    await token0.getAddress(),
    await token1.getAddress(),
    false
  );
  const poolAddr = await factory.getPool(
    await token0.getAddress(),
    await token1.getAddress(),
    false
  );
  const pool = await ethers.getContractAt("Pool", poolAddr);

  return { ...fx, pool };
}

async function deployPoolWithFeesFixture() {
  const fx = await deployFixture();
  const { factory, token0, token1, user1 } = fx;

  await factory.createPool(
    await token0.getAddress(),
    await token1.getAddress(),
    false
  );
  const poolAddr = await factory.getPool(
    await token0.getAddress(),
    await token1.getAddress(),
    false
  );
  const pool = await ethers.getContractAt("Pool", poolAddr);

  const feesAddr = await pool.poolFees();
  const poolFees = await ethers.getContractAt("PoolFees", feesAddr);

  // add initial liquidity (user1)
  const amt = ethers.parseEther("1000");
  await token0.connect(user1).transfer(await pool.getAddress(), amt);
  await token1.connect(user1).transfer(await pool.getAddress(), amt);
  await pool.connect(user1).mint(user1.address);

  return { ...fx, pool, poolFees };
}

async function pause(factory, yes = true) {
  const pauserAddr = await factory.pauser();
  const pauser = await ethers.getSigner(pauserAddr);
  await factory.connect(pauser).setPause(yes);
}
/** ========= TESTS ========= */
describe("AMM Pool System (PoolFactory, Pool, PoolFees)", function () {
  /** ---------- PoolFactory ---------- */
  describe("PoolFactory - Happy Cases", function () {
    it("deploys with correct initial values", async () => {
      const { factory, owner, poolImplementation } = await loadFixture(
        deployFixture
      );
      expect(await factory.poolAdmin()).to.equal(owner.address);
      expect(await factory.pauser()).to.equal(owner.address);
      expect(await factory.feeManager()).to.equal(owner.address);
      expect(await factory.stableFee()).to.equal(5); // 0.05%
      expect(await factory.volatileFee()).to.equal(30); // 0.3%
      expect(await factory.isPaused()).to.equal(false);
      expect(await factory.implementation()).to.equal(
        await poolImplementation.getAddress()
      );
    });

    it("creates volatile pool & indexes it", async () => {
      const { factory, token0, token1 } = await loadFixture(deployFixture);

      const tx = await factory.createPool(
        await token0.getAddress(),
        await token1.getAddress(),
        false
      );
      await expect(tx).to.emit(factory, "PoolCreated");

      const poolAddr = await factory.getPool(
        await token0.getAddress(),
        await token1.getAddress(),
        false
      );
      expect(poolAddr).to.not.equal(ethers.ZeroAddress);
      expect(await factory.isPool(poolAddr)).to.equal(true);

      const all = await factory.allPools();
      expect(all.length).to.equal(1);
      expect(all[0]).to.equal(poolAddr);
    });

    it("creates stable pool distinctly", async () => {
      const { factory, token0, token1 } = await loadFixture(deployFixture);
      await factory.createPool(
        await token0.getAddress(),
        await token1.getAddress(),
        true
      );
      const poolAddr = await factory.getPool(
        await token0.getAddress(),
        await token1.getAddress(),
        true
      );
      expect(poolAddr).to.not.equal(ethers.ZeroAddress);
    });

    it("handles token order (A,B) vs (B,A)", async () => {
      const { factory, token0, token1 } = await loadFixture(deployFixture);
      await factory.createPool(
        await token1.getAddress(),
        await token0.getAddress(),
        false
      );

      const p1 = await factory.getPool(
        await token0.getAddress(),
        await token1.getAddress(),
        false
      );
      const p2 = await factory.getPool(
        await token1.getAddress(),
        await token0.getAddress(),
        false
      );
      expect(p1).to.equal(p2);
    });

    it("updates roles and fee params", async () => {
      const { factory, owner, pauser, feeManager, token0, token1 } =
        await loadFixture(deployFixture);

      await expect(factory.connect(owner).setPoolAdmin(pauser.address))
        .to.emit(factory, "SetPoolAdmin")
        .withArgs(pauser.address);
      expect(await factory.poolAdmin()).to.equal(pauser.address);

      await expect(factory.connect(owner).setPauser(pauser.address))
        .to.emit(factory, "SetPauser")
        .withArgs(pauser.address);
      expect(await factory.pauser()).to.equal(pauser.address);

      await expect(factory.connect(owner).setFeeManager(feeManager.address))
        .to.emit(factory, "SetFeeManager")
        .withArgs(feeManager.address);
      expect(await factory.feeManager()).to.equal(feeManager.address);

      await expect(factory.connect(owner).setPause(true))
        .to.emit(factory, "SetPause")
        .withArgs(true);
      expect(await factory.isPaused()).to.equal(true);

      await expect(factory.connect(owner).setFee(true, 10))
        .to.emit(factory, "FeeUpdated")
        .withArgs(true, 10);
      expect(await factory.stableFee()).to.equal(10);

      await expect(factory.connect(owner).setFee(false, 50))
        .to.emit(factory, "FeeUpdated")
        .withArgs(false, 50);
      expect(await factory.volatileFee()).to.equal(50);

      // Unpause back (for subsequent tests style)
      await factory.connect(owner).setPause(false);

      // TVL view on new pool
      await factory.createPool(
        await token0.getAddress(),
        await token1.getAddress(),
        false
      );
      const poolAddr = await factory.getPool(
        await token0.getAddress(),
        await token1.getAddress(),
        false
      );
      const [tvl0, tvl1] = await factory.getPoolTVL(poolAddr);
      expect(tvl0).to.equal(0n);
      expect(tvl1).to.equal(0n);
    });
  });

  describe("PoolFactory - Unhappy Cases", function () {
    it("reverts on invalid creates & roles", async () => {
      const { factory, token0, token1, owner, user1, user2 } =
        await loadFixture(deployFixture);

      await expect(
        factory.createPool(
          await token0.getAddress(),
          await token0.getAddress(),
          false
        )
      ).to.be.revertedWith("Same token");
      await expect(
        factory.createPool(ethers.ZeroAddress, await token1.getAddress(), false)
      ).to.be.revertedWith("Zero address");
      await expect(
        factory.createPool(await token0.getAddress(), ethers.ZeroAddress, false)
      ).to.be.revertedWith("Zero address");

      await factory.createPool(
        await token0.getAddress(),
        await token1.getAddress(),
        false
      );
      await expect(
        factory.createPool(
          await token0.getAddress(),
          await token1.getAddress(),
          false
        )
      ).to.be.revertedWith("Pool exists");

      await factory.connect(owner).setPause(true);
      await expect(
        factory.createPool(
          await token0.getAddress(),
          await token1.getAddress(),
          false
        )
      ).to.be.revertedWith("Factory paused");
      await factory.connect(owner).setPause(false);

      await expect(
        factory.connect(user1).setPoolAdmin(user2.address)
      ).to.be.revertedWith("Not admin");
      await expect(
        factory.connect(user1).setPauser(user2.address)
      ).to.be.revertedWith("Not pauser");
      await expect(factory.connect(user1).setPause(true)).to.be.revertedWith(
        "Not pauser"
      );
      await expect(
        factory.connect(user1).setFeeManager(user2.address)
      ).to.be.revertedWith("Not feeManager");
      await expect(factory.connect(user1).setFee(true, 10)).to.be.revertedWith(
        "Not feeManager"
      );

      await expect(factory.connect(owner).setFee(true, 0)).to.be.revertedWith(
        "Invalid fee"
      );
      await expect(factory.connect(owner).setFee(true, 301)).to.be.revertedWith(
        "Invalid fee"
      );
      await expect(
        factory.connect(owner).setPoolAdmin(ethers.ZeroAddress)
      ).to.be.revertedWith("Zero address");
    });

    it("reverts getPoolTVL for non-pool", async () => {
      const { factory, user1 } = await loadFixture(deployFixture);
      await expect(factory.getPoolTVL(user1.address)).to.be.revertedWith(
        "Not pool"
      );
    });
  });

  /** ---------- Pool ---------- */
  describe("Pool - Happy Cases", function () {
    it("initializes correctly", async () => {
      const { pool, token0, token1, factory } = await loadFixture(
        deployPoolFixture
      );
      expect(await pool.token0()).to.equal(await token0.getAddress());
      expect(await pool.token1()).to.equal(await token1.getAddress());
      expect(await pool.stable()).to.equal(false);
      expect(await pool.factory()).to.equal(await factory.getAddress());
    });

    it("adds liquidity (first & subsequent), updates reserves", async () => {
      const { pool, token0, token1, user1, user2 } = await loadFixture(
        deployPoolFixture
      );

      const a = ethers.parseEther("100");
      await token0.connect(user1).transfer(await pool.getAddress(), a);
      await token1.connect(user1).transfer(await pool.getAddress(), a);
      await expect(pool.connect(user1).mint(user1.address)).to.emit(
        pool,
        "Mint"
      );

      const [r0, r1] = await pool.getReserves();
      expect(r0).to.equal(a);
      expect(r1).to.equal(a);

      await token0.connect(user2).transfer(await pool.getAddress(), a);
      await token1.connect(user2).transfer(await pool.getAddress(), a);
      const before = await pool.balanceOf(user2.address);
      await pool.connect(user2).mint(user2.address);
      const after = await pool.balanceOf(user2.address);
      expect(after).to.be.gt(before);
    });

    it("burns LP & returns tokens proportionally", async () => {
      const { pool, token0, token1, user1 } = await loadFixture(
        deployPoolFixture
      );

      const a = ethers.parseEther("100");
      await token0.connect(user1).transfer(await pool.getAddress(), a);
      await token1.connect(user1).transfer(await pool.getAddress(), a);
      await pool.connect(user1).mint(user1.address);

      const lp = await pool.balanceOf(user1.address);
      await pool.connect(user1).transfer(await pool.getAddress(), lp);

      const b0 = await token0.balanceOf(user1.address);
      const b1 = await token1.balanceOf(user1.address);

      await expect(pool.connect(user1).burn(user1.address)).to.emit(
        pool,
        "Burn"
      );

      const a0 = await token0.balanceOf(user1.address);
      const a1 = await token1.balanceOf(user1.address);
      expect(a0).to.be.gt(b0);
      expect(a1).to.be.gt(b1);
    });

    it("swaps successfully (UniV2-style)", async () => {
      const { pool, token0, token1, user1, user2 } = await loadFixture(
        deployPoolFixture
      );

      const liq = ethers.parseEther("1000");
      await token0.connect(user1).transfer(await pool.getAddress(), liq);
      await token1.connect(user1).transfer(await pool.getAddress(), liq);
      await pool.connect(user1).mint(user1.address);

      const swapIn = ethers.parseEther("10");
      await token0.connect(user2).transfer(await pool.getAddress(), swapIn);
      const out = await pool.getAmountOut(swapIn, await token0.getAddress());

      const before = await token1.balanceOf(user2.address);
      await expect(pool.connect(user2).swap(0, out, user2.address)).to.emit(
        pool,
        "Swap"
      );
      const after = await token1.balanceOf(user2.address);
      expect(after).to.be.gt(before);
    });

    it("getAmountOut gives sensible values; sync updates reserves", async () => {
      const { pool, token0, token1, user1 } = await loadFixture(
        deployPoolFixture
      );

      const liq = ethers.parseEther("1000");
      await token0.connect(user1).transfer(await pool.getAddress(), liq);
      await token1.connect(user1).transfer(await pool.getAddress(), liq);
      await pool.connect(user1).mint(user1.address);

      const out = await pool.getAmountOut(
        ethers.parseEther("10"),
        await token0.getAddress()
      );
      expect(out).to.be.gt(0n).and.to.be.lt(ethers.parseEther("10"));

      const amt = ethers.parseEther("100");
      await token0.connect(user1).transfer(await pool.getAddress(), amt);
      await token1.connect(user1).transfer(await pool.getAddress(), amt);
      await expect(pool.sync())
        .to.emit(pool, "Sync")
        .withArgs(liq + amt, liq + amt);
    });
  });

  describe("Pool - Unhappy Cases", function () {
    it("reverts mint with zero delta amounts (Insufficient liquidity)", async () => {
      const { pool, user1 } = await loadFixture(deployPoolFixture);
      await expect(pool.connect(user1).mint(user1.address)).to.be.revertedWith(
        "Insufficient liquidity"
      );
    });

    it("reverts mint when paused", async () => {
      const { factory, pool, token0, token1, user1 } = await loadFixture(
        deployPoolFixture
      );
      await pause(factory, true);

      await token0
        .connect(user1)
        .transfer(await pool.getAddress(), ethers.parseEther("1"));
      await token1
        .connect(user1)
        .transfer(await pool.getAddress(), ethers.parseEther("1"));

      await expect(pool.connect(user1).mint(user1.address)).to.be.revertedWith(
        "Paused"
      );
    });

    it("reverts burn to zero / insufficient burn", async () => {
      const { pool, token0, token1, user1 } = await loadFixture(
        deployPoolFixture
      );

      // no LP
      await expect(pool.connect(user1).burn(user1.address)).to.be.revertedWith(
        "Insufficient burn"
      );

      // after mint then burn to zero address
      const a = ethers.parseEther("100");
      await token0.connect(user1).transfer(await pool.getAddress(), a);
      await token1.connect(user1).transfer(await pool.getAddress(), a);
      await pool.connect(user1).mint(user1.address);

      const lp = await pool.balanceOf(user1.address);
      await pool.connect(user1).transfer(await pool.getAddress(), lp);
      await expect(
        pool.connect(user1).burn(ethers.ZeroAddress)
      ).to.be.revertedWith("Zero address");
    });

    it("reverts swap invalid outs / invalid to / insufficient liquidity / no input", async () => {
      const { pool, token0, token1, user1 } = await loadFixture(
        deployPoolFixture
      );

      await expect(
        pool.connect(user1).swap(0, 0, user1.address)
      ).to.be.revertedWith("Invalid out");
      await expect(
        pool.connect(user1).swap(0, ethers.parseEther("1"), ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid to");
      await expect(
        pool
          .connect(user1)
          .swap(0, ethers.parseEther("1"), await token0.getAddress())
      ).to.be.revertedWith("Invalid to");
      await expect(
        pool.connect(user1).swap(ethers.parseEther("1"), 0, user1.address)
      ).to.be.revertedWith("Insufficient liquidity");

      // set up liquidity
      const a = ethers.parseEther("1000");
      await token0.connect(user1).transfer(await pool.getAddress(), a);
      await token1.connect(user1).transfer(await pool.getAddress(), a);
      await pool.connect(user1).mint(user1.address);

      // no input (didn't transfer token before swap)
      await expect(
        pool.connect(user1).swap(0, ethers.parseEther("1"), user1.address)
      ).to.be.revertedWith("No input");
    });

    it("reverts K invariant when output too large for small input", async () => {
      const { pool, token0, token1, user1, user2 } = await loadFixture(
        deployPoolFixture
      );

      const a = ethers.parseEther("1000");
      await token0.connect(user1).transfer(await pool.getAddress(), a);
      await token1.connect(user1).transfer(await pool.getAddress(), a);
      await pool.connect(user1).mint(user1.address);

      // small input
      const smallIn = ethers.parseEther("0.001");
      await token0.connect(user2).transfer(await pool.getAddress(), smallIn);

      // ask a moderate out (less than reserve but too high for small input)
      await expect(
        pool.connect(user2).swap(0, ethers.parseEther("100"), user2.address)
      ).to.be.revertedWith("K invariant");
    });

    it("reverts getAmountOut zero input / invalid token", async () => {
      const { pool, token0, user1 } = await loadFixture(deployPoolFixture);
      await expect(
        pool.getAmountOut(0, await token0.getAddress())
      ).to.be.revertedWith("Zero input");
      await expect(
        pool.getAmountOut(ethers.parseEther("1"), user1.address)
      ).to.be.revertedWith("Invalid token");
    });

    it("reverts initialize twice", async () => {
      const { factory, token0, token1 } = await loadFixture(deployFixture);

      await factory.createPool(
        await token0.getAddress(),
        await token1.getAddress(),
        false
      );

      const poolAddr = await factory.getPool(
        await token0.getAddress(),
        await token1.getAddress(),
        false
      );

      const pool = await ethers.getContractAt("Pool", poolAddr);

      // Gọi lại initialize với dữ liệu bất kỳ, để kiểm tra revert
      await expect(
        pool.initialize(
          await token0.getAddress(),
          await token1.getAddress(),
          false,
          "Token0-Token1",
          "LP-TK0-TK1"
        )
      ).to.be.revertedWith("Already initialized");
    });
  });

  /** ---------- PoolFees ---------- */
  describe("PoolFees - Happy Cases", function () {
    it("accrues and claims fees", async () => {
      const { pool, poolFees, token0, token1, user1, user2 } =
        await loadFixture(deployPoolWithFeesFixture);

      // generate fees
      const swapIn = ethers.parseEther("10");
      await token0.connect(user2).transfer(await pool.getAddress(), swapIn);
      const out = await pool.getAmountOut(swapIn, await token0.getAddress());
      await pool.connect(user2).swap(0, out, user2.address);

      // claimable > 0
      const [c0, c1] = await poolFees.getClaimable(user1.address);
      expect(c0 + c1).to.be.gt(0n);

      const b0 = await token0.balanceOf(user1.address);
      const b1 = await token1.balanceOf(user1.address);
      await expect(poolFees.connect(user1).claim(user1.address)).to.emit(
        poolFees,
        "Claim"
      );
      const a0 = await token0.balanceOf(user1.address);
      const a1 = await token1.balanceOf(user1.address);
      expect(a0 >= b0).to.be.true;
      expect(a1 >= b1).to.be.true;
    });
  });

  describe("PoolFees - Unhappy Cases", function () {
    it("reverts claim to zero, claim with no fees, only pool can notify", async () => {
      const { poolFees, user1, user2 } = await loadFixture(
        deployPoolWithFeesFixture
      );

      await expect(
        poolFees.connect(user1).claim(ethers.ZeroAddress)
      ).to.be.revertedWith("Zero address");
      await expect(
        poolFees.connect(user2).claim(user2.address)
      ).to.be.revertedWith("No fees to claim");
      await expect(
        poolFees.connect(user1).notifyFees(100, 100)
      ).to.be.revertedWith("Not pool");
    });

    it("reverts updateFor zero address", async () => {
      const { poolFees } = await loadFixture(deployPoolWithFeesFixture);
      await expect(poolFees.updateFor(ethers.ZeroAddress)).to.be.revertedWith(
        "Zero address"
      );
    });

    it("former LP stops accruing after transferring LP", async () => {
      const { pool, poolFees, token0, user1, user2, user3 } = await loadFixture(
        deployPoolWithFeesFixture
      );

      // transfer all LP from user1 -> user2
      const lp = await pool.balanceOf(user1.address);
      await pool.connect(user1).transfer(user2.address, lp);

      // generate fees after transfer
      const swapIn = ethers.parseEther("50");
      await token0.connect(user3).transfer(await pool.getAddress(), swapIn);
      const out = await pool.getAmountOut(swapIn, await token0.getAddress());
      await pool.connect(user3).swap(0, out, user3.address);

      const [c0_u1, c1_u1] = await poolFees.getClaimable(user1.address);
      const [c0_u2, c1_u2] = await poolFees.getClaimable(user2.address);
      expect(c0_u1 + c1_u1).to.equal(0n);
      expect(c0_u2 + c1_u2).to.be.gt(0n);

      await expect(
        poolFees.connect(user1).claim(user1.address)
      ).to.be.revertedWith("No fees to claim");
      await expect(poolFees.connect(user2).claim(user2.address)).to.emit(
        poolFees,
        "Claim"
      );
    });

    it("non-holder cannot claim; double-claim reverts without new fees", async () => {
      const { pool, poolFees, token0, user1, user2 } = await loadFixture(
        deployPoolWithFeesFixture
      );

      // generate fees
      const swapIn = ethers.parseEther("25");
      await token0.connect(user2).transfer(await pool.getAddress(), swapIn);
      const out = await pool.getAmountOut(swapIn, await token0.getAddress());
      await pool.connect(user2).swap(0, out, user2.address);

      // user2 never LP -> cannot claim
      await expect(
        poolFees.connect(user2).claim(user2.address)
      ).to.be.revertedWith("No fees to claim");

      // user1 can claim once
      await expect(poolFees.connect(user1).claim(user1.address)).to.emit(
        poolFees,
        "Claim"
      );
      await expect(
        poolFees.connect(user1).claim(user1.address)
      ).to.be.revertedWith("No fees to claim");
    });
  });

  /** ---------- Integration sanity ---------- */
  describe("Integration - Journey", function () {
    it("full journey: create -> LP -> swap -> claim -> burn", async () => {
      const { factory, token0, token1, user1, user2 } = await loadFixture(
        deployFixture
      );
      await factory.createPool(
        await token0.getAddress(),
        await token1.getAddress(),
        false
      );
      const poolAddr = await factory.getPool(
        await token0.getAddress(),
        await token1.getAddress(),
        false
      );
      const pool = await ethers.getContractAt("Pool", poolAddr);

      // LP
      const liq = ethers.parseEther("1000");
      await token0.connect(user1).transfer(await pool.getAddress(), liq);
      await token1.connect(user1).transfer(await pool.getAddress(), liq);
      await pool.connect(user1).mint(user1.address);

      // swap
      const swapIn = ethers.parseEther("10");
      await token0.connect(user2).transfer(await pool.getAddress(), swapIn);
      const out = await pool.getAmountOut(swapIn, await token0.getAddress());
      await pool.connect(user2).swap(0, out, user2.address);

      // claim
      const poolFees = await ethers.getContractAt(
        "PoolFees",
        await pool.poolFees()
      );
      const [c0, c1] = await poolFees.getClaimable(user1.address);
      if (c0 > 0n || c1 > 0n) {
        await poolFees.connect(user1).claim(user1.address);
      }

      // burn
      const lp = await pool.balanceOf(user1.address);
      await pool.connect(user1).transfer(await pool.getAddress(), lp);
      await pool.connect(user1).burn(user1.address);
      expect(await pool.balanceOf(user1.address)).to.equal(0n);
    });
  });
});
