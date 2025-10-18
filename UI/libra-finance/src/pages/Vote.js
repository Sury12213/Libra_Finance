"use client";

import { useState, useEffect } from "react";
import { Search, Info } from "lucide-react";
import { useWallet } from "../hooks/useWallet";
import { getAllPools, getUserLocks, getVotingEpochStats } from "../utils/web3";
import { useNavigate } from "react-router-dom";
import VoteModal from "../components/VoteModal";
import MergeNFTModal from "../components/MergeModal";
import "../styles/Vote.css";

function Vote() {
  const { account } = useWallet();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [poolsData, setPoolsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState("vAPR");
  const [poolFilter, setPoolFilter] = useState("Most rewarded");
  const [voteModalOpen, setVoteModalOpen] = useState(false);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [selectedPool, setSelectedPool] = useState(null);
  const [epochStats, setEpochStats] = useState({
    daysRemaining: 0,
    hoursRemaining: 0,
    totalVotingPower: 0,
    totalFees: 0,
    totalIncentives: 0,
    totalRewards: 0,
    newEmissions: 0,
  });

  const handleAddIncentives = (pool) => {
    navigate("/incentivize", { state: { pool } });
  };

  const handleVoteClick = async (pool) => {
    if (!account) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      const locks = await getUserLocks(account);
      console.log("User locks:", locks);
      setSelectedPool(pool);
      setVoteModalOpen(false);
      setMergeModalOpen(false);

      if (locks.length === 1) {
        console.log("Opening VoteModal with tokenId:", locks[0].tokenId);
        setVoteModalOpen(true);
      } else if (locks.length >= 2) {
        console.log("Opening MergeModal with", locks.length, "locks");
        setMergeModalOpen(true);
      } else {
        alert("You need at least one veNFT to vote or merge.");
      }
    } catch (error) {
      console.error("Error fetching user locks:", error);
      alert("Failed to fetch your veNFTs");
    }
  };

  // Fetch pools function
  const fetchPools = async () => {
    setLoading(true);
    try {
      const pools = await getAllPools();
      console.log("Fetched pools:", pools);
      setPoolsData(pools);
    } catch (error) {
      console.error("Error fetching pools:", error);
      setPoolsData([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch epoch stats function
  const fetchEpochStats = async () => {
    try {
      const stats = await getVotingEpochStats();
      console.log("Fetched epoch stats:", stats);
      setEpochStats(stats);
    } catch (error) {
      console.error("Error fetching epoch stats:", error);
    }
  };

  // Fetch pools on mount
  useEffect(() => {
    fetchPools();
    fetchEpochStats();

    // Refresh epoch stats every minute
    const interval = setInterval(fetchEpochStats, 60000);
    return () => clearInterval(interval);
  }, []);

  // Refresh pools after voting or merging
  const handleVoteSuccess = () => {
    console.log("Vote successful, closing VoteModal");
    setVoteModalOpen(false);
    fetchPools();
    fetchEpochStats();
  };

  const handleMergeSuccess = () => {
    console.log("Merge successful, closing MergeModal");
    setMergeModalOpen(false);
    fetchPools();
  };

  // Filter pools based on search
  const filteredPools = poolsData.filter((pool) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      pool.name.toLowerCase().includes(searchLower) ||
      pool.token0.symbol.toLowerCase().includes(searchLower) ||
      pool.token1.symbol.toLowerCase().includes(searchLower) ||
      pool.address.toLowerCase().includes(searchLower)
    );
  });

  // Sort pools
  const sortedPools = [...filteredPools].sort((a, b) => {
    switch (sortBy) {
      case "Fees":
        return b.fees - a.fees;
      case "Rewards":
        return b.tvl - a.tvl;
      case "vAPR":
      default:
        return parseFloat(b.apr) - parseFloat(a.apr);
    }
  });

  return (
    <div className="vote-container">
      {/* Header Info Card */}
      <div className="card vote-info-card">
        <div className="vote-info-header">
          <div>
            <h3>
              Current voting round{" "}
              <span className="vote-info-subtitle">
                ends in {epochStats.daysRemaining} days{" "}
                {epochStats.hoursRemaining}h
              </span>
            </h3>
          </div>
          <Info size={20} color="#3b82f6" />
        </div>

        <p className="vote-info-description">
          Voters earn a share of transaction fees and incentives for helping
          govern how emissions are distributed.
        </p>

        <div className="vote-stats-grid">
          <div className="vote-stat">
            <div className="vote-stat-label">
              Total voting power this epoch:
            </div>
            <div className="vote-stat-value">
              {epochStats.totalVotingPower > 1000000
                ? `${(epochStats.totalVotingPower / 1000000).toFixed(2)}M`
                : epochStats.totalVotingPower.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
            </div>
          </div>
          <div className="vote-stat">
            <div className="vote-stat-label">Total Fees:</div>
            <div className="vote-stat-value">
              ~$
              {epochStats.totalFees.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
          <div className="vote-stat">
            <div className="vote-stat-label">Total Incentives:</div>
            <div className="vote-stat-value">
              ~$
              {epochStats.totalIncentives.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
          <div className="vote-stat">
            <div className="vote-stat-label">Total Rewards:</div>
            <div className="vote-stat-value">
              ~$
              {epochStats.totalRewards.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
          <div className="vote-stat">
            <div className="vote-stat-label">New Emissions:</div>
            <div className="vote-stat-value">
              {epochStats.newEmissions.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Pools Selection Card */}
      <div className="card vote-pools-card">
        {/* Header with search */}
        <div className="vote-pools-header">
          <div className="vote-pools-title">
            <h2>Select liquidity pools for voting</h2>
            <Info size={20} color="#94a3b8" />
          </div>

          <div className="vote-search-box">
            <Search size={20} color="#94a3b8" />
            <input
              type="text"
              className="input"
              placeholder="Symbol or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="vote-filters">
          <div className="vote-filter-group">
            <label className="vote-filter-label">POOLS</label>
            <select
              className="select"
              value={poolFilter}
              onChange={(e) => setPoolFilter(e.target.value)}
            >
              <option>Most rewarded</option>
              <option>Highest APR</option>
              <option>Most votes</option>
            </select>
          </div>

          <div className="vote-filter-group">
            <label className="vote-filter-label">SORT</label>
            <select
              className="select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="vAPR">vAPR ↓</option>
              <option value="Fees">Fees ↓</option>
              <option value="Rewards">Rewards ↓</option>
            </select>
          </div>
        </div>

        {/* Pools Table */}
        <div className="vote-table-container">
          {loading ? (
            <div className="vote-loading">Loading pools...</div>
          ) : sortedPools.length === 0 ? (
            <div className="vote-empty">No pools found</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Pools</th>
                  <th>Fees</th>
                  <th>Incentives</th>
                  <th>Total Rewards</th>
                  <th>vAPR ↓</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sortedPools.map((pool) => (
                  <tr key={pool.address}>
                    <td>
                      <div className="vote-pool-info">
                        <div className="vote-pool-icons">
                          <div className="vote-pool-icon"></div>
                          <div className="vote-pool-icon"></div>
                        </div>
                        <div>
                          <div className="vote-pool-name">{pool.name}</div>
                          <div className="vote-pool-type">{pool.type}</div>
                          <div className="vote-pool-tvl">
                            TVL: ~$
                            {pool.tvl.toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        $
                        {pool.fees.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      <div className="vote-cell-subtitle">Fees</div>
                    </td>
                    <td>
                      {pool.incentive > 0 ? (
                        <div>
                          <div className="vote-has-incentives">
                            {pool.incentive.toFixed(2)} LIBRA
                          </div>
                          <div className="vote-cell-subtitle">
                            ~$
                            {pool.incentiveUsd?.toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            }) || "0.00"}
                          </div>
                        </div>
                      ) : (
                        <div className="vote-no-incentives">
                          No available incentives
                        </div>
                      )}
                      <button
                        className="vote-add-incentives"
                        onClick={() => handleAddIncentives(pool)}
                      >
                        {pool.incentive > 0 ? "Add more" : "Add incentives"}
                      </button>
                    </td>
                    <td>
                      <div className="vote-total-rewards">
                        ~$
                        {Number(
                          (pool.fees || 0) + (pool.incentiveUsd || 0)
                        ).toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      <div className="vote-cell-subtitle">
                        Fees + Incentives
                      </div>
                    </td>
                    <td>
                      <div className="vote-apr">
                        <Info size={14} />
                        {pool.apr}
                      </div>
                      <div className="vote-cell-subtitle">
                        {((pool.tvl / 893.44e6) * 100).toFixed(4)}% Votes
                      </div>
                    </td>
                    <td>
                      <button
                        className="btn btn-primary vote-btn"
                        onClick={() => handleVoteClick(pool)}
                        disabled={!account}
                      >
                        {!account ? "Connect" : "Vote"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Vote Modal */}
      <VoteModal
        key="vote-modal"
        isOpen={voteModalOpen}
        onClose={() => setVoteModalOpen(false)}
        pool={selectedPool}
        account={account}
        onSuccess={handleVoteSuccess}
      />

      {/* Merge Modal */}
      <MergeNFTModal
        key="merge-modal"
        isOpen={mergeModalOpen}
        onClose={() => setMergeModalOpen(false)}
        account={account}
        onSuccess={handleMergeSuccess}
      />
    </div>
  );
}

export default Vote;
