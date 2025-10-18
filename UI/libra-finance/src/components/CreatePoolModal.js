"use client";

import { useState, useEffect } from "react";
import { X, ChevronDown, AlertTriangle } from "lucide-react";
import TokenSelectModal from "./TokenSelectModal";
import { useWallet } from "../hooks/useWallet";
import { useTokenBalance } from "../hooks/useTokenBalance";
import {
  getPoolAddress,
  approveToken,
  getTokenContract,
  getSigner,
} from "../utils/web3";
import { getPoolFactoryContract } from "../utils/web3";
import { ethers } from "ethers";
import "../styles/CreatePoolModal.css";

function CreatePoolModal({ isOpen, onClose, openAddLiquidityModal }) {
  const { account } = useWallet();

  const [token0, setToken0] = useState(null);
  const [token1, setToken1] = useState(null);
  const [isStable, setIsStable] = useState(false);
  const [existingPool, setExistingPool] = useState(null);
  const [amount0, setAmount0] = useState("");
  const [amount1, setAmount1] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [selectingToken, setSelectingToken] = useState(null);
  const [success, setSuccess] = useState(false);

  const { balance: balance0, refetch: refetch0 } = useTokenBalance(
    token0?.address,
    account
  );
  const { balance: balance1, refetch: refetch1 } = useTokenBalance(
    token1?.address,
    account
  );

  const stableSymbols = ["USDT", "USDC", "DAI", "USDP"];

  // Auto-detect stable pool
  useEffect(() => {
    if (!token0 || !token1) {
      setIsStable(false);
      return;
    }

    const token0Symbol = token0.symbol?.toUpperCase() || "";
    const token1Symbol = token1.symbol?.toUpperCase() || "";

    // Check if BOTH tokens are stablecoins
    const isToken0Stable = stableSymbols.includes(token0Symbol);
    const isToken1Stable = stableSymbols.includes(token1Symbol);

    // Only set stable if BOTH are stablecoins
    setIsStable(isToken0Stable && isToken1Stable);
  }, [token0, token1]);

  // Check if pool already exists
  useEffect(() => {
    const checkExistingPool = async () => {
      if (!token0?.address || !token1?.address) return;
      try {
        const addr = await getPoolAddress(
          token0.address,
          token1.address,
          isStable
        );
        setExistingPool(addr);
      } catch {
        setExistingPool(null);
      }
    };
    checkExistingPool();
  }, [token0, token1, isStable]);

  const handleTokenSelect = (token) => {
    console.log("Selected token:", token);

    if (selectingToken === "token0") {
      setToken0(token);
    } else if (selectingToken === "token1") {
      setToken1(token);
    }
    setShowTokenModal(false);
    setSelectingToken(null);
  };

  const handleCreatePool = async () => {
    if (!token0 || !token1 || !amount0 || !amount1) return;

    setIsCreating(true);

    try {
      const signer = await getSigner();
      const factory = await getPoolFactoryContract(signer);

      // 1️⃣ Tạo pool mới
      const createTx = await factory.createPool(
        token0.address,
        token1.address,
        isStable
      );
      await createTx.wait();

      // 2️⃣ Lấy đúng địa chỉ pool từ Factory
      const poolAddress = await getPoolAddress(
        token0.address,
        token1.address,
        isStable
      );

      // 3️⃣ Approve token nếu cần
      const token0Contract = getTokenContract(token0.address, signer);
      const token1Contract = getTokenContract(token1.address, signer);

      const dec0 = await token0Contract.decimals();
      const dec1 = await token1Contract.decimals();
      const a0 = ethers.parseUnits(amount0, dec0);
      const a1 = ethers.parseUnits(amount1, dec1);

      await approveToken(token0.address, poolAddress, amount0);
      await approveToken(token1.address, poolAddress, amount1);

      // 4️⃣ Transfer token vào pool
      const tx0 = await token0Contract.transfer(poolAddress, a0);
      await tx0.wait();
      const tx1 = await token1Contract.transfer(poolAddress, a1);
      await tx1.wait();

      // 5️⃣ Mint LP token
      const poolContract = new ethers.Contract(
        poolAddress,
        ["function mint(address to) external returns (uint256)"],
        signer
      );
      const mintTx = await poolContract.mint(account);
      await mintTx.wait();

      // 6️⃣ Hiển thị thông báo thành công
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err) {
      console.error("Create pool failed:", err);
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="create-pool-modal-overlay" onClick={onClose}>
        <div className="create-pool-modal" onClick={(e) => e.stopPropagation()}>
          <div className="create-pool-modal-header">
            <h2 className="create-pool-modal-title">Create New Pool</h2>
            <button className="create-pool-modal-close" onClick={onClose}>
              <X size={24} />
            </button>
          </div>

          <div className="create-pool-modal-body">
            {/* Select Tokens */}
            <div className="create-pool-section">
              <div className="create-pool-section-title">Select Tokens</div>
              <div className="token-pair-selector">
                {[
                  { id: "token0", token: token0 },
                  { id: "token1", token: token1 },
                ].map(({ id, token }) => (
                  <div key={id} className="token-select-wrapper">
                    <button
                      className="token-select-button"
                      onClick={() => {
                        setSelectingToken(id);
                        setShowTokenModal(true);
                      }}
                    >
                      {token ? (
                        <>
                          <div className="token-select-icon">{token.icon}</div>
                          <div className="token-select-info">
                            <div className="token-select-symbol">
                              {token.symbol}
                            </div>
                            <div className="token-select-name">
                              {token.name}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="token-select-info">
                          <div className="token-select-symbol">
                            Select Token
                          </div>
                        </div>
                      )}
                      <ChevronDown size={20} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Fee Tier */}
            <div className="create-pool-section">
              <div className="create-pool-section-title">Fee Tier</div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: "12px",
                  padding: "1rem",
                  color: "#fff",
                }}
              >
                <span>
                  {isStable ? "Stable Pool (0.05%)" : "Volatile Pool (0.30%)"}
                </span>
              </div>
            </div>

            {/* Existing Pool Notice */}
            {existingPool && (
              <div
                style={{
                  background: "rgba(255, 255, 0, 0.08)",
                  border: "1px solid #facc15",
                  borderRadius: "12px",
                  padding: "1rem",
                  marginBottom: "1.5rem",
                  color: "#facc15",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <AlertTriangle size={20} />
                <div>
                  A pool with selected settings already exists.
                  <br />
                  Please add liquidity instead.
                </div>
                <button
                  onClick={() => {
                    if (openAddLiquidityModal && existingPool) {
                      openAddLiquidityModal({
                        poolAddress: existingPool,
                        token0: {
                          symbol: token0.symbol,
                          address: token0.address,
                        },
                        token1: {
                          symbol: token1.symbol,
                          address: token1.address,
                        },
                        stable: isStable,
                        name: `${token0.symbol}-${token1.symbol}`,
                      });
                    }
                  }}
                  style={{
                    marginLeft: "auto",
                    background: "#3b82f6",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "0.5rem 1rem",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Add Liquidity
                </button>
              </div>
            )}

            {/* Deposit Amount */}
            {!existingPool && (
              <div className="create-pool-section">
                <div className="create-pool-section-title">Deposit Amount</div>
                {[
                  {
                    token: token0,
                    amount: amount0,
                    setAmount: setAmount0,
                    balance: balance0,
                  },
                  {
                    token: token1,
                    amount: amount1,
                    setAmount: setAmount1,
                    balance: balance1,
                  },
                ].map(
                  ({ token, amount, setAmount, balance }, i) =>
                    token && (
                      <div key={i} className="deposit-amount-item">
                        <div className="deposit-amount-header">
                          <div className="deposit-amount-label">Amount</div>
                          <div className="deposit-amount-balance">
                            Balance: {balance} {token.symbol}
                          </div>
                        </div>
                        <div className="deposit-amount-input-wrapper">
                          <div className="deposit-amount-token">
                            <div className="deposit-amount-token-icon">
                              {token.icon}
                            </div>
                            <div className="deposit-amount-token-symbol">
                              {token.symbol}
                            </div>
                          </div>
                          <input
                            type="number"
                            className="deposit-amount-input"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                          />
                        </div>
                      </div>
                    )
                )}
              </div>
            )}

            {/* Success message */}
            {success && (
              <div
                style={{
                  backgroundColor: "rgba(16,185,129,0.15)",
                  border: "1px solid #10b981",
                  color: "#10b981",
                  padding: "0.75rem 1rem",
                  borderRadius: "8px",
                  textAlign: "center",
                  fontWeight: "500",
                  marginBottom: "1rem",
                }}
              >
                Liquidity added successfully!
              </div>
            )}

            {/* Buttons */}
            <div className="create-pool-actions">
              <button
                className="create-pool-button create-pool-button-secondary"
                onClick={onClose}
              >
                Cancel
              </button>
              {!existingPool && (
                <button
                  className="create-pool-button create-pool-button-primary"
                  onClick={handleCreatePool}
                  disabled={
                    isCreating || !token0 || !token1 || !amount0 || !amount1
                  }
                >
                  {isCreating ? "Creating..." : "Create Pool"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Token Select Modal */}
      <TokenSelectModal
        isOpen={showTokenModal}
        onClose={() => setShowTokenModal(false)}
        onSelectToken={handleTokenSelect}
        onSelect={handleTokenSelect}
        currentToken={selectingToken === "token0" ? token0 : token1}
        userAddress={account}
      />
    </>
  );
}

export default CreatePoolModal;
