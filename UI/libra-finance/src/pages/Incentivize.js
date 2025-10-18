"use client";

import { useState, useEffect } from "react";
import { ChevronDown, AlertCircle, Loader } from "lucide-react";
import { useWallet } from "../hooks/useWallet";
import { useTokenBalance } from "../hooks/useTokenBalance";
import { getAllPools, addIncentive } from "../utils/web3";
import TokenSelectModal from "../components/TokenSelectModal";
import { useLocation } from "react-router-dom";
import "../styles/Incentivize.css";

function Incentivize() {
  const { account } = useWallet();
  const [token1, setToken1] = useState(null);
  const [token2, setToken2] = useState(null);
  const [showToken1Modal, setShowToken1Modal] = useState(false);
  const [showToken2Modal, setShowToken2Modal] = useState(false);
  const location = useLocation();
  const preselectedPool = location.state?.pool || null;

  const [pools, setPools] = useState([]);
  const [foundPool, setFoundPool] = useState(null);
  const [loading, setLoading] = useState(false);

  const [incentiveAmount, setIncentiveAmount] = useState("");
  const LIBRA_TOKEN = {
    symbol: "LIBRA",
    name: "Libra Token",
    address: "0xCcbD6238cd2bdf5B5d82159ACe0aa8342dCcC49f",
    icon: "⚖",
  };
  const [selectedIncentiveToken] = useState(LIBRA_TOKEN);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warningChecked, setWarningChecked] = useState(false);

  const { balance: incentiveBalance } = useTokenBalance(
    selectedIncentiveToken?.address,
    account
  );

  // Fetch pools when both tokens are selected
  useEffect(() => {
    if (!token1 || !token2) {
      setFoundPool(null);
      setPools([]);
      return;
    }

    const searchPool = async () => {
      setLoading(true);
      try {
        const allPools = await getAllPools();

        // Find pool with these two tokens
        const matchedPool = allPools.find((p) => {
          const token1Match =
            p.token0.address.toLowerCase() === token1.address.toLowerCase() ||
            p.token1.address.toLowerCase() === token1.address.toLowerCase();
          const token2Match =
            p.token0.address.toLowerCase() === token2.address.toLowerCase() ||
            p.token1.address.toLowerCase() === token2.address.toLowerCase();
          return token1Match && token2Match;
        });

        if (matchedPool) {
          setFoundPool(matchedPool);
        } else {
          setFoundPool(null);
        }

        setPools(allPools);
      } catch (error) {
        console.error("Error fetching pools:", error);
        setFoundPool(null);
      } finally {
        setLoading(false);
      }
    };

    searchPool();
  }, [token1, token2]);

  useEffect(() => {
    if (preselectedPool) {
      setToken1({
        symbol: preselectedPool.token0.symbol,
        name: preselectedPool.token0.name,
        address: preselectedPool.token0.address,
      });
      setToken2({
        symbol: preselectedPool.token1.symbol,
        name: preselectedPool.token1.name,
        address: preselectedPool.token1.address,
      });
      setFoundPool(preselectedPool);
    }
  }, [preselectedPool]);

  const handleAddIncentive = async () => {
    if (!foundPool || !incentiveAmount || !selectedIncentiveToken || !account) {
      alert("Please fill all fields");
      return;
    }

    if (!warningChecked) {
      alert("Please acknowledge the warning first");
      return;
    }

    try {
      setIsSubmitting(true);

      const result = await addIncentive(
        foundPool.address,
        incentiveAmount,
        selectedIncentiveToken.address,
        account
      );

      alert(`✅ ${result.message}\nTx: ${result.txHash}`);
      setIncentiveAmount("");
      setWarningChecked(false);
    } catch (error) {
      console.error("Error adding incentive:", error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSwapTokens = () => {
    const temp = token1;
    setToken1(token2);
    setToken2(temp);
  };

  return (
    <div className="incentivize-container">
      <div className="card incentivize-card">
        <h2 className="incentivize-title">Incentivize pool</h2>

        {/* Token Selection */}
        <div className="token-selection-section">
          {/* Token 1 */}
          <div className="token-input-group">
            <label className="token-label">Token you want to incentivize</label>
            <button
              className={`token-selector ${token1 ? "selected" : ""}`}
              onClick={() => setShowToken1Modal(true)}
            >
              {token1 ? (
                <>
                  <div className="token-selector-icon">{token1.icon}</div>
                  <div className="token-selector-info">
                    <div className="token-selector-symbol">{token1.symbol}</div>
                    <div className="token-selector-name">{token1.name}</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="token-selector-icon-empty">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                  </div>
                  <div className="token-selector-placeholder">Select token</div>
                </>
              )}
              <ChevronDown size={20} color="#94a3b8" />
            </button>
          </div>

          {/* Swap Button */}
          {token1 && token2 && (
            <button
              className="incentive-swap-button"
              onClick={handleSwapTokens}
              title="Swap tokens"
            >
              ⇄
            </button>
          )}

          {/* Token 2 */}
          <div className="token-input-group">
            <label className="token-label">Token you want to pair with</label>
            <button
              className={`token-selector ${token2 ? "selected" : ""}`}
              onClick={() => setShowToken2Modal(true)}
            >
              {token2 ? (
                <>
                  <div className="token-selector-icon">{token2.icon}</div>
                  <div className="token-selector-info">
                    <div className="token-selector-symbol">{token2.symbol}</div>
                    <div className="token-selector-name">{token2.name}</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="token-selector-icon-empty">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                  </div>
                  <div className="token-selector-placeholder">Select token</div>
                </>
              )}
              <ChevronDown size={20} color="#94a3b8" />
            </button>
          </div>
        </div>

        {/* Pool Display */}
        {token1 && token2 && (
          <div className="pool-search-section">
            {loading ? (
              <div className="loading-state">
                <Loader size={20} className="spinner" />
                <span>Searching for pool...</span>
              </div>
            ) : foundPool ? (
              <div className="pool-found">
                <div className="pool-card">
                  <div className="pool-card-header">
                    <div className="pool-card-title">
                      <div className="pool-icons">
                        <div className="incentive-icon">
                          {foundPool.token0.symbol.charAt(0)}
                        </div>
                        <div className="incentive-icon">
                          {foundPool.token1.symbol.charAt(0)}
                        </div>
                      </div>
                      <div>
                        <h3>{foundPool.name}</h3>
                        <p className="pool-type">{foundPool.type} • 0.3%</p>
                      </div>
                    </div>
                    <div className="pool-badge">{foundPool.type}</div>
                  </div>

                  <div className="pool-stats">
                    <div className="pool-stat">
                      <span className="stat-label">TVL</span>
                      <span className="stat-value">
                        $
                        {foundPool.tvl.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Warning Checkbox */}
                  <div className="warning-checkbox-box">
                    <label className="warning-checkbox-label">
                      <input
                        type="checkbox"
                        checked={warningChecked}
                        onChange={(e) => setWarningChecked(e.target.checked)}
                        className="warning-checkbox-input"
                      />
                      <span>
                        I understand that once incentives are added, these are
                        non-refundable and can NOT be withdrawn under any
                        circumstances.
                      </span>
                    </label>
                  </div>

                  {/* Incentive Input - chỉ enable khi warning checked */}
                  {warningChecked && (
                    <div className="incentive-input-section">
                      <label className="incentive-label">Add incentive</label>

                      <div className="incentive-input-group">
                        <div className="incentive-amount-input">
                          <input
                            type="number"
                            placeholder="0.0"
                            value={incentiveAmount}
                            onChange={(e) => setIncentiveAmount(e.target.value)}
                            disabled={isSubmitting}
                          />
                        </div>

                        <div
                          className={`incentive-token-selector selected`}
                          style={{ cursor: "default" }}
                        >
                          <div className="incentive-token-icon">
                            {LIBRA_TOKEN.icon}
                          </div>
                          <span>{LIBRA_TOKEN.symbol}</span>
                        </div>
                      </div>

                      {selectedIncentiveToken && (
                        <div className="incentive-balance">
                          Balance: {Number(incentiveBalance).toFixed(4)}{" "}
                          {selectedIncentiveToken.symbol}
                        </div>
                      )}
                      <button
                        className="btn btn-primary incentive-submit"
                        onClick={handleAddIncentive}
                        disabled={!incentiveAmount || isSubmitting || !account}
                      >
                        {isSubmitting ? "Adding..." : "Add Incentive"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="pool-not-found">
                <AlertCircle size={20} />
                <p>
                  No pool found for {token1.symbol}/{token2.symbol}
                </p>
                <p className="pool-hint">
                  Create a new pool first or select different tokens
                </p>
              </div>
            )}
          </div>
        )}

        {/* Warning */}
        <div className="warning-box">
          <AlertCircle size={20} color="#ef4444" className="warning-icon" />
          <div>
            <div className="warning-title">Warning:</div>
            <div className="warning-text">
              The incentivize feature is mainly used by protocols. Make sure you
              know how it works before using it as any transaction is final and
              cannot be reverted.
            </div>
          </div>
        </div>
      </div>

      {/* Token Modals */}
      <TokenSelectModal
        isOpen={showToken1Modal}
        onClose={() => setShowToken1Modal(false)}
        onSelectToken={setToken1}
        currentToken={token1}
        userAddress={account}
      />
      <TokenSelectModal
        isOpen={showToken2Modal}
        onClose={() => setShowToken2Modal(false)}
        onSelectToken={setToken2}
        currentToken={token2}
        userAddress={account}
      />
    </div>
  );
}

export default Incentivize;
