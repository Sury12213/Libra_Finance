import { useState, useEffect } from "react";
import { X, Lock } from "lucide-react";
import { useWallet } from "../hooks/useWallet";
import { useTokenBalance } from "../hooks/useTokenBalance";
import { CONTRACTS } from "../config/contracts";
import { createLock } from "../utils/web3";
import "../styles/CreateLockModal.css";

const MAX_LOCK = 4 * 365 * 24 * 60 * 60; // 4 years in seconds

// Snap points: 7d, then monthly until 1y, then yearly
const LOCK_DURATIONS = [
  { label: "7 days", value: 7 * 24 * 60 * 60 },
  { label: "1 month", value: 30 * 24 * 60 * 60 },
  { label: "2 months", value: 60 * 24 * 60 * 60 },
  { label: "3 months", value: 90 * 24 * 60 * 60 },
  { label: "4 months", value: 120 * 24 * 60 * 60 },
  { label: "5 months", value: 150 * 24 * 60 * 60 },
  { label: "6 months", value: 180 * 24 * 60 * 60 },
  { label: "7 months", value: 210 * 24 * 60 * 60 },
  { label: "8 months", value: 240 * 24 * 60 * 60 },
  { label: "9 months", value: 270 * 24 * 60 * 60 },
  { label: "10 months", value: 300 * 24 * 60 * 60 },
  { label: "11 months", value: 330 * 24 * 60 * 60 },
  { label: "1 year", value: 365 * 24 * 60 * 60 },
  { label: "2 years", value: 2 * 365 * 24 * 60 * 60 },
  { label: "3 years", value: 3 * 365 * 24 * 60 * 60 },
  { label: "4 years", value: 4 * 365 * 24 * 60 * 60 },
];

const CreateLockModal = ({ onClose, onConfirm }) => {
  const { account } = useWallet();
  const { balance: libraBalance, refetch } = useTokenBalance(
    CONTRACTS.TOKENS.LIBRA,
    account
  );

  const [amount, setAmount] = useState("");
  const [durationIndex, setDurationIndex] = useState(15); // default 4 years
  const [isCreating, setIsCreating] = useState(false);

  const duration = LOCK_DURATIONS[durationIndex].value;

  const handleCreate = async () => {
    try {
      if (!amount || Number(amount) <= 0) {
        alert("Please enter valid amount");
        return;
      }

      if (!account) {
        alert("Please connect wallet first");
        return;
      }

      setIsCreating(true);

      // Calculate unlock time
      const unlockTime = Math.floor(Date.now() / 1000) + duration;

      // Create lock using web3.js helper
      await createLock(amount, unlockTime);

      alert("Lock created successfully! 🎉");

      // Refetch balance
      await refetch();

      if (onConfirm) {
        onConfirm(amount, duration);
      }

      onClose();
    } catch (err) {
      console.error("Create lock error:", err);
      alert(`Transaction failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDurationChange = (e) => {
    const index = parseInt(e.target.value);
    setDurationIndex(index);

    // Update slider progress
    const progress = (index / (LOCK_DURATIONS.length - 1)) * 100;
    e.target.style.setProperty("--slider-progress", `${progress}%`);
  };

  const formatDuration = (seconds) => {
    const days = seconds / (24 * 60 * 60);
    if (days < 30) return `${days} days`;
    if (days < 365) return `${Math.floor(days / 30)} months`;
    return `${(days / 365).toFixed(2)} years`;
  };

  const estimatedPower =
    amount && duration ? (Number(amount) * duration) / MAX_LOCK : 0;

  const handleMaxClick = () => {
    setAmount(libraBalance);
  };

  // Set initial slider progress
  useEffect(() => {
    const slider = document.querySelector(
      '.slider-section input[type="range"]'
    );
    if (slider) {
      const progress = (durationIndex / (LOCK_DURATIONS.length - 1)) * 100;
      slider.style.setProperty("--slider-progress", `${progress}%`);
    }
  }, [durationIndex]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create new lock</h2>
          <X
            className="close-icon"
            onClick={onClose}
            style={{ cursor: "pointer" }}
          />
        </div>

        <div className="modal-info">
          <Lock size={20} className="icon" />
          <p>
            When you lock LIBRA, you'll receive a veNFT (voting escrow NFT). You
            can increase your lock amount or extend the lock duration at any
            time.
          </p>
        </div>

        <div className="input-section">
          <div className="input-header">
            <span>Amount</span>
            <span
              className="balance"
              style={{ cursor: "pointer" }}
              onClick={handleMaxClick}
            >
              Balance:{" "}
              {Number(libraBalance).toLocaleString(undefined, {
                maximumFractionDigits: 4,
              })}{" "}
              LIBRA
            </span>
          </div>

          <div className="input-box">
            <div className="token-tag">LIBRA</div>
            <input
              type="number"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isCreating}
            />
          </div>
        </div>

        {/* Slider section */}
        <div className="slider-section">
          <input
            type="range"
            min="0"
            max={LOCK_DURATIONS.length - 1}
            step="1"
            value={durationIndex}
            onChange={handleDurationChange}
            disabled={isCreating}
          />

          {/* Labels */}
          <div className="slider-labels">
            <span>7d</span>
            <span>1y</span>
            <span>2y</span>
            <span>3y</span>
            <span>4y</span>
          </div>

          <div className="slider-current-value">
            {LOCK_DURATIONS[durationIndex].label}
          </div>
        </div>

        <div className="summary-section">
          <div className="summary-box">
            <p>New lock time</p>
            <h4>{formatDuration(duration)}</h4>
          </div>
          <div className="summary-box">
            <p>New estimated voting power</p>
            <h4>{estimatedPower.toFixed(2)} veLIBRA</h4>
          </div>
        </div>

        <div className="modal-actions">
          <button
            className="btn-outline"
            onClick={onClose}
            disabled={isCreating}
          >
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleCreate}
            disabled={isCreating || !amount || Number(amount) <= 0}
          >
            {isCreating ? "Creating..." : "Create Lock"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateLockModal;
