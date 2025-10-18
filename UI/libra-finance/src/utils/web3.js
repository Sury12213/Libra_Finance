import { ethers } from "ethers";
import {
  CONTRACTS,
  POOL_FACTORY_ABI,
  POOL_ABI,
  ERC20_ABI,
  VE_ABI,
  VOTER_ABI,
  BRIBE_ABI,
  MINTER,
} from "../config/contracts";

// Get provider and signer
export const getProvider = () => {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed");
  }
  return new ethers.BrowserProvider(window.ethereum);
};

export const getSigner = async () => {
  const provider = getProvider();
  return await provider.getSigner();
};

export const getVoterContract = (signerOrProvider) => {
  return new ethers.Contract(CONTRACTS.VOTER, VOTER_ABI, signerOrProvider);
};

export const getBribeContract = (bribeAddress, signerOrProvider) => {
  return new ethers.Contract(bribeAddress, BRIBE_ABI, signerOrProvider);
};

// Token utilities
export const getTokenContract = (tokenAddress, signerOrProvider) => {
  return new ethers.Contract(tokenAddress, ERC20_ABI, signerOrProvider);
};

export const getTokenBalance = async (tokenAddress, userAddress) => {
  try {
    const provider = getProvider();

    // Check if it's native token (null or zero address)
    if (!tokenAddress || tokenAddress === ethers.ZeroAddress) {
      const balance = await provider.getBalance(userAddress);
      return ethers.formatUnits(balance, 18);
    }

    const tokenContract = getTokenContract(tokenAddress, provider);
    const balance = await tokenContract.balanceOf(userAddress);
    const decimals = await tokenContract.decimals();
    return ethers.formatUnits(balance, decimals);
  } catch (error) {
    console.error("Error getting token balance:", error);
    return "0";
  }
};

export const approveToken = async (tokenAddress, spenderAddress, amount) => {
  try {
    const signer = await getSigner();
    const tokenContract = getTokenContract(tokenAddress, signer);
    const decimals = await tokenContract.decimals();
    const amountInWei = ethers.parseUnits(amount, decimals);

    const tx = await tokenContract.approve(spenderAddress, amountInWei);
    await tx.wait();
    return true;
  } catch (error) {
    console.error("Error approving token:", error);
    throw error;
  }
};

export const checkAllowance = async (
  tokenAddress,
  ownerAddress,
  spenderAddress
) => {
  try {
    const provider = getProvider();
    const tokenContract = getTokenContract(tokenAddress, provider);
    const allowance = await tokenContract.allowance(
      ownerAddress,
      spenderAddress
    );
    const decimals = await tokenContract.decimals();
    return ethers.formatUnits(allowance, decimals);
  } catch (error) {
    console.error("Error checking allowance:", error);
    return "0";
  }
};

export const getTokenDetails = async (tokenAddress) => {
  try {
    const provider = getProvider();
    const tokenContract = getTokenContract(tokenAddress, provider);

    const [name, symbol, decimals] = await Promise.all([
      tokenContract.name(),
      tokenContract.symbol(),
      tokenContract.decimals(),
    ]);

    return {
      address: tokenAddress,
      name,
      symbol,
      decimals: Number(decimals),
      icon: symbol.charAt(0), // Use first letter as icon
    };
  } catch (error) {
    console.error("Error getting token details:", error);
    throw new Error("Invalid token address or not an ERC20 token");
  }
};

// Pool utilities
export const getPoolFactoryContract = (signerOrProvider) => {
  return new ethers.Contract(
    CONTRACTS.POOL_FACTORY,
    POOL_FACTORY_ABI,
    signerOrProvider
  );
};

export const getPoolContract = (poolAddress, signerOrProvider) => {
  return new ethers.Contract(poolAddress, POOL_ABI, signerOrProvider);
};

export const getPoolAddress = async (tokenA, tokenB, isStable = false) => {
  try {
    const provider = getProvider();
    const factory = getPoolFactoryContract(provider);
    const poolAddress = await factory.getPool(tokenA, tokenB, isStable);

    if (poolAddress === ethers.ZeroAddress) {
      return null;
    }
    return poolAddress;
  } catch (error) {
    console.error("Error getting pool address:", error);
    return null;
  }
};

export const getAmountOut = async (poolAddress, amountIn, tokenInAddress) => {
  try {
    const provider = getProvider();
    const pool = getPoolContract(poolAddress, provider);
    const tokenIn = getTokenContract(tokenInAddress, provider);
    const decimals = await tokenIn.decimals();

    const amountInWei = ethers.parseUnits(amountIn, decimals);
    const amountOutWei = await pool.getAmountOut(amountInWei, tokenInAddress);

    const token0 = await pool.token0();
    const tokenOutAddress =
      token0.toLowerCase() === tokenInAddress.toLowerCase()
        ? await pool.token1()
        : token0;
    const tokenOut = getTokenContract(tokenOutAddress, provider);
    const decimalsOut = await tokenOut.decimals();

    return ethers.formatUnits(amountOutWei, decimalsOut);
  } catch (error) {
    console.error("Error getting amount out:", error);
    return "0";
  }
};

export const executeSwap = async (
  poolAddress,
  tokenInAddress,
  tokenOutAddress,
  amountIn,
  minAmountOut,
  userAddress
) => {
  try {
    const signer = await getSigner();
    const pool = getPoolContract(poolAddress, signer);
    const tokenIn = getTokenContract(tokenInAddress, signer);
    const decimalsIn = await tokenIn.decimals();
    const tokenOut = getTokenContract(tokenOutAddress, signer);
    const decimalsOut = await tokenOut.decimals();

    // Check and approve if needed
    const allowance = await checkAllowance(
      tokenInAddress,
      userAddress,
      poolAddress
    );
    if (Number.parseFloat(allowance) < Number.parseFloat(amountIn)) {
      await approveToken(tokenInAddress, poolAddress, amountIn);
    }

    // Transfer tokens to pool
    const amountInWei = ethers.parseUnits(amountIn, decimalsIn);
    const transferTx = await tokenIn.transfer(poolAddress, amountInWei);
    await transferTx.wait();

    // Calculate amounts out
    const token0 = await pool.token0();
    const isToken0In = token0.toLowerCase() === tokenInAddress.toLowerCase();

    const minAmountOutWei = ethers.parseUnits(minAmountOut, decimalsOut);
    const amount0Out = isToken0In ? 0 : minAmountOutWei;
    const amount1Out = isToken0In ? minAmountOutWei : 0;

    // Execute swap
    const swapTx = await pool.swap(amount0Out, amount1Out, userAddress);
    await swapTx.wait();

    return true;
  } catch (error) {
    console.error("Error executing swap:", error);
    throw error;
  }
};

export const getMockPriceContract = (signerOrProvider) => {
  return new ethers.Contract(
    CONTRACTS.MOCK_PRICE,
    ["function getPrice(address token) external view returns (uint256)"],
    signerOrProvider
  );
};

export const getMinterContract = (provider) => {
  return new ethers.Contract(
    CONTRACTS.MINTER,
    [
      "function lastEpochTime() view returns (uint256)",
      "function weeklyEmission() view returns (uint256)",
    ],
    provider
  );
};

export const getAllPools = async () => {
  try {
    const provider = getProvider();
    const factory = getPoolFactoryContract(provider);
    const mockPrice = getMockPriceContract(provider);
    const voter = getVoterContract(provider);

    const poolAddresses = await factory.allPools();
    const pools = [];

    for (let i = 0; i < poolAddresses.length; i++) {
      const poolAddr = poolAddresses[i];
      try {
        const pool = getPoolContract(poolAddr, provider);

        // Token info & TVL
        const [token0, token1, stable] = await Promise.all([
          pool.token0(),
          pool.token1(),
          pool.stable(),
        ]);

        const [t0, t1] = await Promise.all([
          getTokenDetails(token0),
          getTokenDetails(token1),
        ]);

        const [tvl0, tvl1] = await factory.getPoolTVL(poolAddr);

        let p0 = 10n ** 18n;
        let p1 = 10n ** 18n;
        try {
          const [raw0, raw1] = await Promise.all([
            mockPrice.getPrice(token0),
            mockPrice.getPrice(token1),
          ]);
          if (raw0 !== 0n) p0 = raw0;
          if (raw1 !== 0n) p1 = raw1;
        } catch (e) {
          console.warn(`Pool ${i}: MockPrice error → fallback 1 USD`);
        }

        const scale0 = ethers.getBigInt(10) ** ethers.getBigInt(t0.decimals);
        const scale1 = ethers.getBigInt(10) ** ethers.getBigInt(t1.decimals);

        // TVL tính theo USD (giả lập)
        const tvl18 = (tvl0 * p0) / scale0 + (tvl1 * p1) / scale1;
        const tvl = Number(ethers.formatUnits(tvl18, 18));

        // Fetch incentive từ Bribe
        let incentiveAmount = 0;
        let incentiveUsd = 0;
        try {
          const bribeAddr = await voter.bribes(poolAddr);
          if (bribeAddr && bribeAddr !== ethers.ZeroAddress) {
            const bribe = getBribeContract(bribeAddr, provider);

            // Kiểm tra xem contract đã init chưa
            try {
              const isInit = await bribe.initialized();
              if (!isInit) {
                console.warn(`⛔ Bribe ${bribeAddr} chưa được initialize`);
              } else {
                // Lấy epoch hiện tại (tính từ Unix timestamp start)
                const block = await provider.getBlock("latest");
                const WEEK = 7 * 24 * 60 * 60;

                // Thử lấy reward từ epoch hiện tại và epoch tiếp theo
                const currentEpoch = Math.floor(Number(block.timestamp) / WEEK);
                const nextEpoch = currentEpoch + 1;

                // Thử cả 2 epoch
                for (const epoch of [currentEpoch, nextEpoch]) {
                  try {
                    const rewardAmount = await bribe.rewardAtEpoch(epoch);
                    if (rewardAmount > 0n) {
                      incentiveAmount += Number(
                        ethers.formatUnits(rewardAmount, 18)
                      );
                    }
                  } catch (inner) {
                    // Epoch này không có data, skip
                    continue;
                  }
                }

                // Tính giá USD của incentive token
                if (incentiveAmount > 0) {
                  try {
                    const rewardTokenAddr = await bribe.rewardToken();
                    const incentivePrice = await mockPrice.getPrice(
                      rewardTokenAddr
                    );
                    if (incentivePrice > 0n) {
                      // incentiveAmount đã format 18 decimals, price cũng 18 decimals
                      incentiveUsd =
                        incentiveAmount *
                        Number(ethers.formatUnits(incentivePrice, 18));
                    } else {
                      // Fallback: Giả sử 1 USD nếu không có giá
                      incentiveUsd = incentiveAmount;
                    }
                  } catch (priceErr) {
                    console.warn(
                      `⚠️ Cannot get incentive token price:`,
                      priceErr.message
                    );
                    incentiveUsd = incentiveAmount; // Fallback 1:1
                  }
                }

                // Fallback: Dùng totalWeightAt để check có incentive không
                if (incentiveAmount === 0) {
                  try {
                    const totalWeight = await bribe.totalWeightAt(currentEpoch);
                    if (totalWeight > 0n) {
                      // Có weight nghĩa là có incentive, nhưng chưa distribute
                      console.log(
                        `ℹ️ Pool ${poolAddr} has votes but no reward distributed yet`
                      );
                    }
                  } catch (e) {
                    // Ignore
                  }
                }
              }
            } catch (initErr) {
              console.warn(
                `⚠️ Cannot check init status for ${bribeAddr}:`,
                initErr.message
              );
            }
          }
        } catch (err) {
          console.warn(`⚠️ Cannot fetch incentive for pool ${i}:`, err.message);
        }
        // Chỉ push pool có TVL > 0
        if (tvl > 0) {
          // Mock volume & fee & apr
          const volumeMultiplier = Math.random() * 0.5;
          const mockVolume = tvl * volumeMultiplier;
          const feeRate = stable ? 0.05 : 0.3;
          const feesUsd = mockVolume * feeRate;
          const apr = (feesUsd * 365) / tvl;

          pools.push({
            address: poolAddr,
            poolAddress: poolAddr,
            name: `${t0.symbol}/${t1.symbol}`,
            type: stable ? "Stable" : "Volatile",
            token0: {
              symbol: t0.symbol,
              address: token0,
              reserve: ethers.formatUnits(tvl0, t0.decimals),
            },
            token1: {
              symbol: t1.symbol,
              address: token1,
              reserve: ethers.formatUnits(tvl1, t1.decimals),
            },
            tvl,
            volume: mockVolume,
            fees: feesUsd,
            apr: `${apr.toFixed(2)}%`,
            incentive: incentiveAmount,
            incentiveUsd,
          });
        }
      } catch (err) {
        console.error(`Error fetching pool ${i}:`, err);
      }
    }

    return pools;
  } catch (err) {
    console.error("Error getAllPools:", err);
    return [];
  }
};

// Voting Escrow utilities
export const getVEContract = (signerOrProvider) => {
  return new ethers.Contract(CONTRACTS.VE, VE_ABI, signerOrProvider);
};

export const createLock = async (amount, unlockTime) => {
  try {
    const signer = await getSigner();
    const veContract = getVEContract(signer);
    const libraContract = getTokenContract(CONTRACTS.TOKENS.LIBRA, signer);

    const decimals = await libraContract.decimals();
    const amountWei = ethers.parseUnits(amount.toString(), decimals);

    // Approve first
    await approveToken(CONTRACTS.TOKENS.LIBRA, CONTRACTS.VE, amount.toString());

    // Create lock
    const tx = await veContract.createLock(amountWei, unlockTime);
    await tx.wait();

    return true;
  } catch (error) {
    console.error("Error creating lock:", error);
    throw error;
  }
};

export const getUserLocks = async (userAddress) => {
  try {
    const provider = getProvider();
    const veContract = getVEContract(provider);

    const logs = await veContract.queryFilter(
      veContract.filters.LockCreated(null, userAddress),
      6600000, // from block
      "latest"
    );

    const locks = [];
    for (const log of logs) {
      const tokenId = log.args.tokenId;
      try {
        const owner = await veContract.ownerOf(tokenId);
        if (owner.toLowerCase() !== userAddress.toLowerCase()) continue;

        const lock = await veContract.locks(tokenId);
        const votingPower = await veContract.votingPower(tokenId);

        locks.push({
          tokenId: tokenId.toString(),
          amount: ethers.formatUnits(lock.amount, 18),
          unlockTime: Number(lock.unlockTime),
          votingPower: ethers.formatUnits(votingPower, 18),
        });
      } catch (e) {
        continue;
      }
    }

    console.log("✅ getUserLocks fetched:", locks);
    return locks.sort((a, b) => b.unlockTime - a.unlockTime);
  } catch (error) {
    console.error("❌ Error getting user locks:", error);
    return [];
  }
};

export const withdrawLock = async (tokenId) => {
  try {
    const signer = await getSigner();
    const veContract = getVEContract(signer);

    const tx = await veContract.withdraw(tokenId);
    await tx.wait();

    return true;
  } catch (error) {
    console.error("Error withdrawing lock:", error);
    throw error;
  }
};

export const addIncentive = async (
  poolAddress,
  incentiveAmount,
  incentiveToken
) => {
  try {
    const signer = await getSigner();
    const voterContract = getVoterContract(signer);
    const tokenContract = getTokenContract(incentiveToken, signer);

    // Get decimals & convert to wei
    const decimals = await tokenContract.decimals();
    const amountWei = ethers.parseUnits(incentiveAmount.toString(), decimals);

    // Tính epoch hiện tại
    const block = await signer.provider.getBlock("latest");
    const currentEpoch = Math.floor(block.timestamp / (7 * 24 * 60 * 60));
    const nextEpoch = currentEpoch + 1;

    // Check & approve token for Voter contract
    console.log("📝 Approving token for Voter contract...");
    const maxApproval = ethers.MaxUint256.toString();
    const signer2 = await getSigner();
    const tokenContractForApproval = getTokenContract(incentiveToken, signer2);
    const approveTx = await tokenContractForApproval.approve(
      CONTRACTS.VOTER,
      maxApproval
    );
    await approveTx.wait();
    console.log("✅ Approval successful");

    // Gọi notifyBribeReward qua Voter
    console.log("🎯 Adding incentive via Voter contract...");
    console.log("Pool:", poolAddress);
    console.log("Epoch:", nextEpoch);
    console.log("Amount:", incentiveAmount);

    let receipt;
    let retries = 3;
    while (retries > 0) {
      try {
        const tx = await voterContract.notifyBribeReward(
          poolAddress,
          nextEpoch,
          amountWei
        );

        console.log("⏳ Waiting for transaction...");
        receipt = await tx.wait();
        break; // Success
      } catch (error) {
        retries--;
        if (retries === 0) throw error;
        console.log(`❌ Transaction failed, retrying... (${retries} left)`);
        await new Promise((r) => setTimeout(r, 2000)); // Wait 2s before retry
      }
    }

    console.log("✅ Incentive added successfully:", receipt.transactionHash);

    return {
      success: true,
      message: "Incentive added successfully!",
      txHash: receipt.transactionHash,
    };
  } catch (error) {
    console.error("❌ Error adding incentive:", error);
    throw error;
  }
};

// Merge veNFTs
export const mergeVeNFTs = async (fromTokenId, toTokenId) => {
  try {
    const signer = await getSigner();
    const veContract = getVEContract(signer);

    console.log(`🔄 Merging NFT #${fromTokenId} into #${toTokenId}...`);

    const tx = await veContract.merge(fromTokenId, toTokenId);
    await tx.wait();

    console.log("✅ Merge successful!");
    return {
      success: true,
      message: `NFT #${fromTokenId} merged into #${toTokenId}`,
    };
  } catch (error) {
    console.error("❌ Error merging NFTs:", error);

    let errorMsg = "Failed to merge NFTs";
    if (error.message.includes("not owner")) {
      errorMsg = "You don't own one or both of these NFTs";
    } else if (error.message.includes("cannot merge to self")) {
      errorMsg = "Cannot merge an NFT into itself";
    } else if (error.message.includes("empty from")) {
      errorMsg = "Source NFT has no locked amount";
    }

    throw new Error(errorMsg);
  }
};

// Merge all NFTs into one (batch merge)
export const mergeAllVeNFTs = async (userAddress, targetTokenId = null) => {
  try {
    const locks = await getUserLocks(userAddress);

    if (locks.length <= 1) {
      throw new Error("You need at least 2 NFTs to merge");
    }

    // Sort by voting power (descending) to keep the strongest as target
    const sortedLocks = [...locks].sort(
      (a, b) => parseFloat(b.votingPower) - parseFloat(a.votingPower)
    );

    // Use target or the strongest NFT
    const target = targetTokenId || sortedLocks[0].tokenId;
    const toMerge = sortedLocks.filter((l) => l.tokenId !== target);

    console.log(`🎯 Target NFT: #${target}`);
    console.log(`📦 Merging ${toMerge.length} NFTs...`);

    const signer = await getSigner();
    const veContract = getVEContract(signer);

    // Merge one by one
    for (const lock of toMerge) {
      console.log(`  → Merging #${lock.tokenId} into #${target}...`);
      const tx = await veContract.merge(lock.tokenId, target);
      await tx.wait();
      console.log(`  ✅ Merged #${lock.tokenId}`);
    }

    console.log("🎉 All NFTs merged successfully!");

    return {
      success: true,
      targetTokenId: target,
      mergedCount: toMerge.length,
      message: `Successfully merged ${toMerge.length} NFTs into #${target}`,
    };
  } catch (error) {
    console.error("❌ Error merging all NFTs:", error);
    throw error;
  }
};

// Vote for pools
export const voteForPools = async (tokenId, poolAddresses, weights) => {
  try {
    const signer = await getSigner();
    const voterContract = getVoterContract(signer);

    // Convert weights to BigInt array (voting power is in 18 decimals)
    const weightsInWei = weights.map((w) =>
      ethers.parseUnits(w.toString(), 18)
    );

    console.log("🗳️ Voting with params:");
    console.log("Token ID:", tokenId);
    console.log("Pools:", poolAddresses);
    console.log("Weights:", weights);

    const tx = await voterContract.vote(tokenId, poolAddresses, weightsInWei);
    console.log("⏳ Waiting for transaction...");

    const receipt = await tx.wait();
    console.log("✅ Vote successful:", receipt.transactionHash);

    return {
      success: true,
      message: "Vote submitted successfully!",
      txHash: receipt.transactionHash,
    };
  } catch (error) {
    console.error("❌ Error voting:", error);

    // Parse error message
    let errorMsg = "Failed to vote";
    if (error.message.includes("already voted this epoch")) {
      errorMsg = "You have already voted this epoch. Wait until next epoch.";
    } else if (error.message.includes("exceeds power")) {
      errorMsg = "Vote weight exceeds your voting power";
    } else if (error.message.includes("not owner")) {
      errorMsg = "You don't own this veNFT";
    } else if (error.message.includes("gauge killed")) {
      errorMsg = "This pool's gauge has been killed";
    } else if (error.message.includes("no voting power")) {
      errorMsg = "This veNFT has no voting power. Lock may have expired.";
    }

    throw new Error(errorMsg);
  }
};

// Get user's current votes for a tokenId
export const getUserVotes = async (tokenId) => {
  try {
    const provider = getProvider();
    const voterContract = getVoterContract(provider);

    const [pools, weights] = await voterContract.getUserVotes(tokenId);

    return pools.map((pool, index) => ({
      pool,
      weight: ethers.formatUnits(weights[index], 18),
    }));
  } catch (error) {
    console.error("Error getting user votes:", error);
    return [];
  }
};

// Reset votes for a tokenId (withdraw all votes)
export const resetVotes = async (tokenId) => {
  try {
    const signer = await getSigner();
    const voterContract = getVoterContract(signer);

    const tx = await voterContract.reset(tokenId);
    await tx.wait();

    return {
      success: true,
      message: "Votes reset successfully!",
    };
  } catch (error) {
    console.error("Error resetting votes:", error);
    throw error;
  }
};

// Check if user can vote (hasn't voted this epoch)
export const canVoteThisEpoch = async (tokenId) => {
  try {
    const provider = getProvider();
    const voterContract = getVoterContract(provider);

    const block = await provider.getBlock("latest");
    const currentEpoch = Math.floor(
      Number(block.timestamp) / (7 * 24 * 60 * 60)
    );

    const lastVotedEpoch = await voterContract.lastVotedEpoch(tokenId);

    return Number(lastVotedEpoch) !== currentEpoch;
  } catch (error) {
    console.error("Error checking vote status:", error);
    return true;
  }
};

// Get voting epoch stats
export const getVotingEpochStats = async () => {
  try {
    const provider = getProvider();
    const voterContract = getVoterContract(provider);
    const factory = getPoolFactoryContract(provider);
    const mockPrice = getMockPriceContract(provider);
    const minterContract = getMinterContract(provider);

    const block = await provider.getBlock("latest");
    const WEEK = 7 * 24 * 60 * 60;

    // ✅ EPOCH TIMES
    const lastEpochTime = await minterContract.lastEpochTime();
    const epochStartTime = Number(lastEpochTime);
    const epochEndTime = epochStartTime + WEEK;
    const now = Number(block.timestamp);
    const timeRemaining = Math.max(epochEndTime - now, 0);
    const daysRemaining = Math.floor(timeRemaining / 86400);
    const hoursRemaining = Math.floor((timeRemaining % 86400) / 3600);

    // ✅ TOTAL VOTING POWER
    const totalWeight = await voterContract.totalWeight();
    const totalVotingPower = Number(ethers.formatUnits(totalWeight, 18));

    // ✅ FEES + INCENTIVES
    const poolAddresses = await factory.allPools();
    let totalFeesUsd = 0;
    let totalIncentivesUsd = 0;

    for (const poolAddr of poolAddresses) {
      try {
        const pool = getPoolContract(poolAddr, provider);
        const [token0, token1, stable] = await Promise.all([
          pool.token0(),
          pool.token1(),
          pool.stable(),
        ]);

        const [tvl0, tvl1] = await factory.getPoolTVL(poolAddr);

        // Default price = 1$
        let p0 = 10n ** 18n;
        let p1 = 10n ** 18n;
        try {
          const [raw0, raw1] = await Promise.all([
            mockPrice.getPrice(token0),
            mockPrice.getPrice(token1),
          ]);
          if (raw0 !== 0n) p0 = raw0;
          if (raw1 !== 0n) p1 = raw1;
        } catch {}

        const [t0Details, t1Details] = await Promise.all([
          getTokenDetails(token0),
          getTokenDetails(token1),
        ]);

        const scale0 = 10n ** ethers.getBigInt(t0Details.decimals);
        const scale1 = 10n ** ethers.getBigInt(t1Details.decimals);

        const tvl18 = (tvl0 * p0) / scale0 + (tvl1 * p1) / scale1;
        const tvl = Number(ethers.formatUnits(tvl18, 18));

        if (tvl > 0) {
          // giả lập fee
          const mockVolume = tvl * (Math.random() * 0.5);
          const feeRate = stable ? 0.05 : 0.3;
          totalFeesUsd += mockVolume * feeRate;

          // incentives (bribe)
          try {
            const bribeAddr = await voterContract.bribes(poolAddr);
            if (bribeAddr && bribeAddr !== ethers.ZeroAddress) {
              const bribe = getBribeContract(bribeAddr, provider);
              if (await bribe.initialized()) {
                const currentEpoch = Math.floor(epochStartTime / WEEK);
                for (const epoch of [currentEpoch, currentEpoch + 1]) {
                  try {
                    const rewardAmount = await bribe.rewardAtEpoch(epoch);
                    if (rewardAmount > 0n) {
                      const rewardTokenAddr = await bribe.rewardToken();
                      const incentivePrice = await mockPrice.getPrice(
                        rewardTokenAddr
                      );
                      const incentiveUsd =
                        Number(ethers.formatUnits(rewardAmount, 18)) *
                        Number(ethers.formatUnits(incentivePrice, 18));
                      totalIncentivesUsd += incentiveUsd;
                    }
                  } catch {}
                }
              }
            }
          } catch {}
        }
      } catch {}
    }

    const totalRewards = totalFeesUsd + totalIncentivesUsd;

    // ✅ NEW EMISSION
    const weeklyEmission = await minterContract.weeklyEmission();
    const newEmissions = Number(ethers.formatUnits(weeklyEmission, 18));

    return {
      daysRemaining,
      hoursRemaining,
      totalVotingPower,
      totalFees: totalFeesUsd,
      totalIncentives: totalIncentivesUsd,
      totalRewards,
      newEmissions,
      epochStartTime,
      epochEndTime,
    };
  } catch (error) {
    console.error("Error getting voting epoch stats:", error);
    return {
      daysRemaining: 0,
      hoursRemaining: 0,
      totalVotingPower: 0,
      totalFees: 0,
      totalIncentives: 0,
      totalRewards: 0,
      newEmissions: 0,
      epochStartTime: 0,
      epochEndTime: 0,
    };
  }
};

// Get liquidity stats (Volume, Fees, TVL)
export const getLiquidityStats = async () => {
  try {
    const provider = getProvider();
    const factory = getPoolFactoryContract(provider);
    const mockPrice = getMockPriceContract(provider);

    const poolAddresses = await factory.allPools();

    let totalVolume = 0;
    let totalFees = 0;
    let totalTVL = 0;

    for (const poolAddr of poolAddresses) {
      try {
        const pool = getPoolContract(poolAddr, provider);

        // Get token info
        const [token0, token1, stable] = await Promise.all([
          pool.token0(),
          pool.token1(),
          pool.stable(),
        ]);

        // Get TVL
        const [tvl0, tvl1] = await factory.getPoolTVL(poolAddr);

        // Get prices
        let p0 = ethers.getBigInt(10) ** ethers.getBigInt(18);
        let p1 = ethers.getBigInt(10) ** ethers.getBigInt(18);
        try {
          const [raw0, raw1] = await Promise.all([
            mockPrice.getPrice(token0),
            mockPrice.getPrice(token1),
          ]);
          if (raw0 !== 0n) p0 = raw0;
          if (raw1 !== 0n) p1 = raw1;
        } catch (e) {
          // Fallback to $1
        }

        const [t0Details, t1Details] = await Promise.all([
          getTokenDetails(token0),
          getTokenDetails(token1),
        ]);

        const scale0 =
          ethers.getBigInt(10) ** ethers.getBigInt(t0Details.decimals);
        const scale1 =
          ethers.getBigInt(10) ** ethers.getBigInt(t1Details.decimals);

        // Calculate TVL in USD
        const tvl18 = (tvl0 * p0) / scale0 + (tvl1 * p1) / scale1;
        const tvl = Number(ethers.formatUnits(tvl18, 18));

        if (tvl > 0) {
          // Mock volume (based on TVL)
          const volumeMultiplier = Math.random() * 0.5;
          const volume = tvl * volumeMultiplier;

          const feeRate = stable ? 0.05 : 0.3;
          const fees = volume * feeRate;

          totalVolume += volume;
          totalFees += fees;
          totalTVL += tvl;
        }
      } catch (err) {
        console.warn(`Error fetching pool ${poolAddr}:`, err);
      }
    }

    return {
      volume: totalVolume,
      fees: totalFees,
      tvl: totalTVL,
    };
  } catch (error) {
    console.error("Error getting liquidity stats:", error);
    return {
      volume: 0,
      fees: 0,
      tvl: 0,
    };
  }
};

// Get liquidity rewards (Gauge)
export const getLiquidityRewards = async (userAddress) => {
  try {
    const provider = getProvider();
    const voter = getVoterContract(provider);
    const pools = await voter.allPools();
    const rewards = [];

    for (const poolAddr of pools) {
      try {
        const gaugeAddr = await voter.gauges(poolAddr);
        if (!gaugeAddr || gaugeAddr === ethers.ZeroAddress) continue;
        const gauge = new ethers.Contract(
          gaugeAddr,
          [
            "function earned(address) view returns (uint256)",
            "function getReward()",
          ],
          provider
        );

        const earned = await gauge.earned(userAddress);
        if (earned > 0n) {
          rewards.push({
            poolName: poolAddr.slice(0, 6) + "..." + poolAddr.slice(-4),
            rewardAmount: ethers.formatUnits(earned, 18),
            claim: async () => {
              const signer = await getSigner();
              const gaugeWithSigner = gauge.connect(signer);
              const tx = await gaugeWithSigner.getReward();
              await tx.wait();
            },
          });
        }
      } catch {}
    }
    return rewards;
  } catch (err) {
    console.error("Error fetching liquidity rewards:", err);
    return [];
  }
};

// Get voting rewards (Bribe)
export const getVotingRewards = async (userAddress) => {
  try {
    const provider = getProvider();
    const voter = getVoterContract(provider);
    const pools = await voter.allPools();
    const rewards = [];

    for (const poolAddr of pools) {
      try {
        const bribeAddr = await voter.bribes(poolAddr);
        if (!bribeAddr || bribeAddr === ethers.ZeroAddress) continue;
        const bribe = new ethers.Contract(
          bribeAddr,
          [
            "function earned(address) view returns (uint256)",
            "function rewardToken() view returns (address)",
            "function getReward()",
          ],
          provider
        );
        const earned = await bribe.earned(userAddress);
        if (earned > 0n) {
          const tokenAddr = await bribe.rewardToken();
          const token = getTokenContract(tokenAddr, provider);
          const symbol = await token.symbol();

          rewards.push({
            poolName: poolAddr.slice(0, 6) + "..." + poolAddr.slice(-4),
            amount: ethers.formatUnits(earned, 18),
            symbol,
            claim: async () => {
              const signer = await getSigner();
              const bribeWithSigner = bribe.connect(signer);
              const tx = await bribeWithSigner.getReward();
              await tx.wait();
            },
          });
        }
      } catch {}
    }
    return rewards;
  } catch (err) {
    console.error("Error fetching voting rewards:", err);
    return [];
  }
};

export const getPoolFees = async (userAddress) => {
  try {
    const provider = getProvider();
    const factory = getPoolFactoryContract(provider);
    const allPools = await factory.allPools();
    const rewards = [];

    for (const poolAddr of allPools) {
      try {
        const pool = getPoolContract(poolAddr, provider);

        // Kiểm tra user có LP token trong pool này không
        const userLPBalance = await pool.balanceOf(userAddress);
        if (userLPBalance === 0n) continue; // Skip nếu user không có LP token

        const feesAddr = await pool.poolFees();
        if (!feesAddr || feesAddr === ethers.ZeroAddress) continue;

        const fees = new ethers.Contract(
          feesAddr,
          [
            "function getClaimable(address) view returns (uint256,uint256)",
            "function claim(address) returns (uint256,uint256)",
            "function token0() view returns (address)",
            "function token1() view returns (address)",
          ],
          provider
        );

        const [amount0, amount1] = await fees.getClaimable(userAddress);
        if (amount0 === 0n && amount1 === 0n) continue;

        const token0Addr = await fees.token0();
        const token1Addr = await fees.token1();
        const t0 = getTokenContract(token0Addr, provider);
        const t1 = getTokenContract(token1Addr, provider);
        const [sym0, sym1, dec0, dec1] = await Promise.all([
          t0.symbol(),
          t1.symbol(),
          t0.decimals(),
          t1.decimals(),
        ]);

        rewards.push({
          poolName: `${sym0}/${sym1}`,
          amount0: ethers.formatUnits(amount0, dec0),
          amount1: ethers.formatUnits(amount1, dec1),
          symbol0: sym0,
          symbol1: sym1,
          claim: async () => {
            const signer = await getSigner();
            const feesWithSigner = fees.connect(signer);
            const tx = await feesWithSigner.claim(userAddress);
            await tx.wait();
          },
        });
      } catch (err) {
        console.warn(`Skipping pool ${poolAddr}:`, err.message);
      }
    }

    return rewards;
  } catch (err) {
    console.error("Error fetching pool fees:", err);
    return [];
  }
};
