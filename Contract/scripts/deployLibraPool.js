// SPDX-License-Identifier: MIT
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🚀 Deploying Libra ve(3,3) system using:", deployer.address);

  const libraAddr = "0xCcbD6238cd2bdf5B5d82159ACe0aa8342dCcC49f";
  console.log("✅ Using existing LibraToken:", libraAddr);

  // Pool + Factory
  const Pool = await ethers.getContractFactory("Pool");
  const poolImpl = await Pool.deploy();
  await poolImpl.waitForDeployment();
  const poolFactory = await (
    await ethers.getContractFactory("PoolFactory")
  ).deploy(await poolImpl.getAddress());
  await poolFactory.waitForDeployment();

  // ve(3,3)
  const ve = await (
    await ethers.getContractFactory("VotingEscrow")
  ).deploy(libraAddr);
  await ve.waitForDeployment();

  // Factories
  const gaugeFactory = await (
    await ethers.getContractFactory("GaugeFactory")
  ).deploy();
  await gaugeFactory.waitForDeployment();
  const bribeFactory = await (
    await ethers.getContractFactory("BribeFactory")
  ).deploy();
  await bribeFactory.waitForDeployment();

  // Implementations (no constructor params)
  const gaugeImpl = await (await ethers.getContractFactory("Gauge")).deploy();
  await gaugeImpl.waitForDeployment();
  await gaugeFactory.setImplementation(await gaugeImpl.getAddress());

  const bribeImpl = await (await ethers.getContractFactory("Bribe")).deploy();
  await bribeImpl.waitForDeployment();
  await bribeFactory.setImplementation(await bribeImpl.getAddress());

  // Voter + Minter + Treasury
  const voter = await (
    await ethers.getContractFactory("Voter")
  ).deploy(
    await ve.getAddress(),
    await gaugeFactory.getAddress(),
    await bribeFactory.getAddress(),
    await poolFactory.getAddress(),
    libraAddr
  );
  await voter.waitForDeployment();

  const minter = await (
    await ethers.getContractFactory("Minter")
  ).deploy(libraAddr, await voter.getAddress());
  await minter.waitForDeployment();

  const treasury = await (
    await ethers.getContractFactory("Treasury")
  ).deploy(libraAddr);
  await treasury.waitForDeployment();

  // Setup
  await poolFactory.setVoter(await voter.getAddress());
  await voter.setKeeper(deployer.address);
  await minter.setKeeper(deployer.address);
  await treasury.setKeeper(deployer.address);

  console.table({
    LibraToken: libraAddr,
    PoolImpl: await poolImpl.getAddress(),
    VotingEscrow: await ve.getAddress(),
    PoolFactory: await poolFactory.getAddress(),
    GaugeFactory: await gaugeFactory.getAddress(),
    BribeFactory: await bribeFactory.getAddress(),
    GaugeImpl: await gaugeImpl.getAddress(),
    BribeImpl: await bribeImpl.getAddress(),
    Voter: await voter.getAddress(),
    Minter: await minter.getAddress(),
    Treasury: await treasury.getAddress(),
  });

  console.log(
    "\n✅ Libra ve(3,3) System fully deployed and linked successfully!"
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
