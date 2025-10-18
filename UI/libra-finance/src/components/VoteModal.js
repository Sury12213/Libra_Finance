"use client";

import { useState, useEffect } from "react";
import { X, Info, AlertCircle } from "lucide-react";
import { getUserLocks, voteForPools } from "../utils/web3";
import "../styles/VoteModal.css";

function VoteModal({ isOpen, onClose, pool, account, onSuccess }) {
  const [userLocks, setUserLocks] = useState([]);
  const [selectedLockId, setSelectedLockId] = useState("");
  const [voteWeight, setVoteWeight] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && account) {
      fetchUserLocks();
    }
  }, [isOpen, account]);

  const fetchUserLocks = async () => {
    try {
      const locks = await getUserLocks(account);
      setUserLocks(locks);
      if (locks.length > 0) {
        setSelectedLockId(locks[0].tokenId);
      }
    } catch (err) {
      console.error("Error fetching locks:", err);
      setError("Failed to fetch your locks");
    }
  };

  const selectedLock = userLocks.find((l) => l.tokenId === selectedLockId);
  const maxVotingPower = selectedLock
    ? parseFloat(selectedLock.votingPower)
    : 0;

  const handleVote = async () => {
    if (!selectedLockId) {
      setError("Please select a lock");
      return;
    }

    const weight = parseFloat(voteWeight);
    if (isNaN(weight) || weight <= 0) {
      setError("Please enter a valid vote weight");
      return;
    }

    if (weight > maxVotingPower) {
      setError(
        `Weight exceeds your voting power (${maxVotingPower.toFixed(
          2
        )} veLibra)`
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      await voteForPools(selectedLockId, [pool.address], [voteWeight]);
      alert("Vote successful! 🎉");
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error("Vote error:", err);
      setError(err.message || "Failed to vote. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleMaxClick = () => {
    setVoteWeight(maxVotingPower.toString());
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Vote for {pool?.name}</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          {/* Pool Info */}
          <div className="vote-modal-pool-info">
            <div className="vote-modal-label">Pool:</div>
            <div className="vote-modal-value">{pool?.name}</div>
            <div className="vote-modal-sublabel">
              TVL: ${pool?.tvl?.toLocaleString()} • {pool?.type}
            </div>
          </div>

          {/* Lock Info (không còn dropdown) */}
          {userLocks.length === 0 ? (
            <div className="vote-modal-warning">
              <AlertCircle size={20} />
              <span>
                You don't have any locks. Please create a lock first to vote.
              </span>
            </div>
          ) : (
            <div className="vote-modal-lock-info">
              <div>Current veNFT: Lock #{selectedLockId}</div>
              <div>
                Locked Amount: {parseFloat(selectedLock.amount).toFixed(2)}{" "}
                LIBRA
              </div>
            </div>
          )}

          {/* Voting Power Info */}
          {selectedLock && (
            <div className="vote-modal-power-card">
              <div className="vote-modal-power-label">
                <Info size={16} />
                Available Voting Power (veLibra)
              </div>
              <div className="vote-modal-power-value">
                {maxVotingPower.toFixed(2)}
              </div>
            </div>
          )}

          {/* Vote Weight Input */}
          <div className="form-group">
            <label>Vote Weight (veLibra)</label>
            <div className="vote-weight-input-wrapper">
              <input
                type="number"
                value={voteWeight}
                onChange={(e) => setVoteWeight(e.target.value)}
                placeholder="Enter vote weight"
                className="input"
                max={maxVotingPower}
                disabled={!selectedLock}
              />
              <button className="max-button" onClick={handleMaxClick}>
                Max
              </button>
            </div>
            <div className="vote-modal-hint">
              Enter amount of voting power to allocate to this pool
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="vote-modal-error">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {/* Vote Button */}
          <button
            className="btn btn-primary"
            onClick={handleVote}
            disabled={loading || !selectedLock || userLocks.length === 0}
            style={{ width: "100%" }}
          >
            {loading ? "Voting..." : "Confirm Vote"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default VoteModal;
