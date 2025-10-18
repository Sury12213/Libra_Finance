import { useState, useEffect } from "react";
import { X, AlertCircle, Check, ArrowRight } from "lucide-react";
import { getUserLocks, mergeAllVeNFTs } from "../utils/web3";
import "../styles/MergeModal.css";

function MergeNFTModal({ isOpen, onClose, account, onSuccess }) {
  const [userLocks, setUserLocks] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState("select"); // select | confirm | merging

  useEffect(() => {
    if (isOpen && account) {
      fetchUserLocks();
    }
  }, [isOpen, account]);

  const fetchUserLocks = async () => {
    try {
      const locks = await getUserLocks(account);
      setUserLocks(locks);

      // Auto select the strongest NFT as target
      if (locks.length > 0) {
        const strongest = locks.reduce((max, lock) =>
          parseFloat(lock.votingPower) > parseFloat(max.votingPower)
            ? lock
            : max
        );
        setSelectedTarget(strongest.tokenId);
      }
    } catch (err) {
      console.error("Error fetching locks:", err);
      setError("Failed to fetch your NFTs");
    }
  };

  const otherLocks = userLocks.filter((l) => l.tokenId !== selectedTarget);

  const totalAmount = userLocks.reduce(
    (sum, lock) => sum + parseFloat(lock.amount),
    0
  );
  const totalPower = userLocks.reduce(
    (sum, lock) => sum + parseFloat(lock.votingPower),
    0
  );
  const maxUnlockTime = Math.max(...userLocks.map((l) => l.unlockTime));

  const handleMerge = async () => {
    if (!selectedTarget) {
      setError("Please select a target NFT");
      return;
    }

    if (userLocks.length < 2) {
      setError("You need at least 2 NFTs to merge");
      return;
    }

    setLoading(true);
    setError("");
    setStep("merging");

    try {
      const result = await mergeAllVeNFTs(account, selectedTarget);

      alert(`🎉 ${result.message}`);

      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (err) {
      console.error("Merge error:", err);
      setError(err.message || "Failed to merge NFTs");
      setStep("select");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content merge-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Merge veNFTs</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          {userLocks.length < 2 ? (
            <div className="merge-warning">
              <AlertCircle size={24} />
              <div>
                <div className="merge-warning-title">Not Enough NFTs</div>
                <div className="merge-warning-text">
                  You need at least 2 veNFTs to merge. Create more locks first.
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Info Banner */}
              <div className="merge-info-banner">
                <AlertCircle size={20} />
                <div>
                  Merging will combine all your veNFTs into one, adding up their
                  locked amounts and taking the longest unlock time.
                </div>
              </div>

              {/* Select Target NFT */}
              {step === "select" && (
                <>
                  <div className="form-group">
                    <label>Select Target NFT (keep this one)</label>
                    <select
                      value={selectedTarget}
                      onChange={(e) => setSelectedTarget(e.target.value)}
                      className="select"
                    >
                      {userLocks.map((lock) => (
                        <option key={lock.tokenId} value={lock.tokenId}>
                          NFT #{lock.tokenId} -{" "}
                          {parseFloat(lock.amount).toFixed(2)} LIBRA (Power:{" "}
                          {parseFloat(lock.votingPower).toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Preview */}
                  <div className="merge-preview">
                    <div className="merge-preview-title">Merge Preview</div>

                    <div className="merge-preview-section">
                      <div className="merge-preview-label">NFTs to merge:</div>
                      <div className="merge-nft-list">
                        {otherLocks.map((lock, idx) => (
                          <div key={lock.tokenId} className="merge-nft-item">
                            <span>#{lock.tokenId}</span>
                            <span>
                              {parseFloat(lock.amount).toFixed(2)} LIBRA
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="merge-arrow">
                      <ArrowRight size={24} />
                    </div>

                    <div className="merge-preview-section">
                      <div className="merge-preview-label">Result:</div>
                      <div className="merge-result-card">
                        <div className="merge-result-row">
                          <span>NFT #{selectedTarget}</span>
                          <Check size={20} className="merge-check" />
                        </div>
                        <div className="merge-result-row">
                          <span>Total Amount:</span>
                          <strong>{totalAmount.toFixed(2)} LIBRA</strong>
                        </div>
                        <div className="merge-result-row">
                          <span>Total Voting Power:</span>
                          <strong>{totalPower.toFixed(2)}</strong>
                        </div>
                        <div className="merge-result-row">
                          <span>Unlock Time:</span>
                          <span>
                            {new Date(
                              maxUnlockTime * 1000
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={() => setStep("confirm")}
                    style={{ width: "100%" }}
                  >
                    Continue to Confirmation
                  </button>
                </>
              )}

              {/* Confirmation Step */}
              {step === "confirm" && (
                <>
                  <div className="merge-confirm-box">
                    <AlertCircle size={32} color="#f59e0b" />
                    <div className="merge-confirm-title">Confirm Merge</div>
                    <div className="merge-confirm-text">
                      You are about to merge {otherLocks.length} NFT
                      {otherLocks.length > 1 ? "s" : ""} into NFT #
                      {selectedTarget}. This action cannot be undone.
                    </div>
                    <div className="merge-confirm-list">
                      <div>
                        ✅ NFT #{selectedTarget} will keep all combined LIBRA
                      </div>
                      <div>❌ Other NFTs will be burned</div>
                      <div>
                        🔒 Unlock time:{" "}
                        {new Date(maxUnlockTime * 1000).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="merge-button-group">
                    <button
                      className="btn btn-secondary"
                      onClick={() => setStep("select")}
                      style={{ flex: 1 }}
                    >
                      Back
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={handleMerge}
                      style={{ flex: 1 }}
                    >
                      Confirm Merge
                    </button>
                  </div>
                </>
              )}

              {/* Merging Step */}
              {step === "merging" && (
                <div className="merge-loading">
                  <div className="merge-spinner"></div>
                  <div className="merge-loading-title">Merging NFTs...</div>
                  <div className="merge-loading-text">
                    Please confirm the transactions in your wallet
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="vote-modal-error">
                  <AlertCircle size={20} />
                  {error}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default MergeNFTModal;
