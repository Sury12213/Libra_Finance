import { useState, useEffect } from "react";
import "../styles/Lock.css";
import CreateLockModal from "../components/CreateLockModal";
import { Info } from "lucide-react";
import { useWallet } from "../hooks/useWallet";
import { getUserLocks, withdrawLock } from "../utils/web3";

function Lock() {
  const { account } = useWallet();
  const [showModal, setShowModal] = useState(false);
  const [locks, setLocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [withdrawing, setWithdrawing] = useState(null);

  // Fetch user's locks
  const fetchLocks = async () => {
    if (!account) {
      setLocks([]);
      return;
    }

    setLoading(true);
    try {
      const userLocks = await getUserLocks(account);
      setLocks(userLocks);
    } catch (error) {
      console.error("Error fetching locks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocks();
  }, [account]);

  const handleWithdraw = async (tokenId) => {
    try {
      setWithdrawing(tokenId);
      await withdrawLock(tokenId);
      alert("Withdrawn successfully! 🎉");

      // Refetch locks
      const userLocks = await getUserLocks(account);
      setLocks(userLocks);
    } catch (error) {
      console.error("Withdraw error:", error);
      alert(`Withdraw failed: ${error.message || "Unknown error"}`);
    } finally {
      setWithdrawing(null);
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString();
  };

  const formatTimeAgo = (timestamp) => {
    const now = Date.now() / 1000;
    const diff = now - timestamp;

    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  const canWithdraw = (unlockTime) => {
    return Date.now() / 1000 >= unlockTime;
  };

  const formatAddress = (address) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="lock-container">
      {/* Header section */}
      <div className="lock-card intro-card">
        <div className="lock-header">
          <div>
            <h3>Gain greater voting power and higher rewards,</h3>
            <p>by locking more tokens for longer.</p>
          </div>
          <button
            className="btn-header-primary"
            onClick={() => setShowModal(true)}
          >
            Create Lock
          </button>
        </div>
      </div>

      {/* Locks section */}
      <div className="lock-card">
        <div className="section-header">
          <h2>Locks</h2>
          <Info size={18} color="#94a3b8" />
        </div>

        <p className="info-box">
          To receive incentives and fees, create a lock and vote with it.
        </p>

        {!account ? (
          <div
            style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}
          >
            Connect wallet to view your locks
          </div>
        ) : loading ? (
          <div
            style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}
          >
            Loading locks...
          </div>
        ) : locks.length === 0 ? (
          <div
            style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}
          >
            No locks found. Create your first lock to start earning rewards!
          </div>
        ) : (
          <div className="locks-list">
            {locks.map((lock, index) => (
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
                    onClick={() => handleWithdraw(lock.tokenId)}
                    disabled={
                      !canWithdraw(lock.unlockTime) ||
                      withdrawing === lock.tokenId
                    }
                  >
                    {withdrawing === lock.tokenId
                      ? "Withdrawing..."
                      : canWithdraw(lock.unlockTime)
                      ? "Withdraw"
                      : "Locked"}
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
                    <h4
                      className={canWithdraw(lock.unlockTime) ? "positive" : ""}
                    >
                      {canWithdraw(lock.unlockTime) ? "Unlocked" : "Locked"}
                    </h4>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <CreateLockModal
          onClose={() => setShowModal(false)}
          onConfirm={async () => {
            // Refetch locks after creating
            if (account) {
              const userLocks = await getUserLocks(account);
              setLocks(userLocks);
            }
          }}
        />
      )}
    </div>
  );
}

export default Lock;
