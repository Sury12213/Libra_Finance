import { useEffect, useState } from "react";
import {
  getUserLocks,
  getLiquidityRewards,
  getVotingRewards,
  withdrawLock,
  getPoolFees,
} from "../utils/web3";
import { useWallet } from "../hooks/useWallet";
import "../styles/Dashboard.css";

function Dashboard() {
  const { account } = useWallet();
  const [locks, setLocks] = useState([]);
  const [liquidityRewards, setLiquidityRewards] = useState([]);
  const [votingRewards, setVotingRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [poolFees, setPoolFees] = useState([]);

  useEffect(() => {
    if (!account) return;
    (async () => {
      setLoading(true);
      try {
        const [userLocks, liqRewards, voteRewards, feesRewards] =
          await Promise.all([
            getUserLocks(account),
            getLiquidityRewards(account),
            getVotingRewards(account),
            getPoolFees(account),
          ]);

        setLocks(userLocks);
        setLiquidityRewards(liqRewards);
        setVotingRewards(voteRewards);
        setPoolFees(feesRewards);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [account]);

  if (!account)
    return (
      <div className="dashboard-container">
        <h2>Please connect wallet to view your dashboard</h2>
      </div>
    );

  if (loading)
    return (
      <div className="dashboard-container">
        <h2>Loading dashboard data...</h2>
      </div>
    );

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Your Dashboard</h1>

      {/* === Swap Fees (PoolFees) === */}
      <div className="dashboard-section">
        <h2>Swap Fees</h2>
        {poolFees.length === 0 ? (
          <p className="empty">No pending swap fees.</p>
        ) : (
          <div className="card-list">
            {poolFees.map((r, i) => (
              <div key={i} className="card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.5rem",
                  }}
                >
                  <h3 className="card-title">{r.poolName}</h3>
                  <button
                    onClick={() => r.claim()}
                    className="dash-btn-primary"
                    style={{ minWidth: "90px" }}
                  >
                    Claim
                  </button>
                </div>

                <div className="card-info">
                  <p>
                    Fees: {r.amount0} {r.symbol0} + {r.amount1} {r.symbol1}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* === Liquidity Rewards === */}
      <div className="dashboard-section">
        <h2>Liquidity Rewards</h2>
        {liquidityRewards.length === 0 ? (
          <p className="empty">No active liquidity positions.</p>
        ) : (
          <div className="card-list">
            {liquidityRewards.map((r, i) => (
              <div key={i} className="card">
                <div className="card-title">{r.poolName}</div>
                <div className="card-info">
                  <p>Earned: {r.rewardAmount} LIBRA</p>
                  <button
                    onClick={() => r.claim()}
                    className="dash-btn-primary"
                  >
                    Claim
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* === Locks (veNFT) === */}
      <div className="dashboard-section">
        <h2>Your Locks (veNFT)</h2>

        {locks.length === 0 ? (
          <p className="empty">You don’t have any active locks.</p>
        ) : (
          <div className="locks-list">
            {locks.map((lock, index) => {
              const canWithdraw = lock.unlockTime * 1000 < Date.now();
              const formatDate = (ts) =>
                new Date(ts * 1000).toLocaleDateString("en-GB");
              const formatAddress = (addr) =>
                `${addr.slice(0, 6)}...${addr.slice(-4)}`;

              return (
                <div key={lock.tokenId} className="lock-item">
                  <div className="lock-item-header">
                    <div className="lock-item-left">
                      <div className="lock-icon">
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="2"
                        >
                          <rect
                            x="3"
                            y="11"
                            width="18"
                            height="11"
                            rx="2"
                            ry="2"
                          />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </div>
                      <div>
                        <div className="lock-title">
                          <h3>veLIBRA #{lock.tokenId}</h3>
                          <span>ID {lock.tokenId}</span>
                        </div>
                        <p className="lock-meta">
                          Unlock: {formatDate(lock.unlockTime)} •{" "}
                          {formatAddress(account)}
                        </p>
                      </div>
                    </div>

                    <button
                      className="btn-item-outline"
                      onClick={() => withdrawLock(lock.tokenId)}
                      disabled={!canWithdraw}
                    >
                      {canWithdraw ? "Withdraw" : "Locked"}
                    </button>
                  </div>

                  <div className="lock-stats">
                    <div>
                      <p>Locked Amount</p>
                      <h4>
                        {Number(lock.amount).toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}{" "}
                        LIBRA
                      </h4>
                    </div>
                    <div>
                      <p>Voting Power</p>
                      <h4>
                        {Number(lock.votingPower).toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}{" "}
                        veLIBRA
                      </h4>
                    </div>
                    <div>
                      <p>Status</p>
                      <h4 className={canWithdraw ? "positive" : ""}>
                        {canWithdraw ? "Unlocked" : "Locked"}
                      </h4>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* === Voting Rewards === */}
      <div className="dashboard-section">
        <h2>Voting Rewards</h2>
        {votingRewards.length === 0 ? (
          <p className="empty">No pending voting rewards.</p>
        ) : (
          <div className="card-list">
            {votingRewards.map((r, i) => (
              <div key={i} className="card">
                <div className="card-title">{r.poolName}</div>
                <div className="card-info">
                  <p>
                    Reward: {r.amount} {r.symbol}
                  </p>
                  <button
                    onClick={() => r.claim()}
                    className="dash-btn-primary"
                  >
                    Claim
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
