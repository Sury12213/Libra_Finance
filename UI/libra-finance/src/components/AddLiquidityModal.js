"use client";

import { useState, useEffect, useMemo } from "react";
import { X, HelpCircle } from "lucide-react";
import { ethers } from "ethers";
import { POOL_ABI, ERC20_ABI } from "../config/contracts";
import { useWallet } from "../hooks/useWallet";
import { useTokenBalance } from "../hooks/useTokenBalance";
import { getProvider } from "../utils/web3";
import "../styles/AddLiquidityModal.css";

function AddLiquidityModal({ isOpen, onClose, pool }) {
  const { account } = useWallet();
  const provider = useMemo(() => {
    try {
      return getProvider();
    } catch {
      return null;
    }
  }, []);

  const token0 = pool?.token0 || {};
  const token1 = pool?.token1 || {};

  const [dec0, setDec0] = useState(18);
  const [dec1, setDec1] = useState(18);

  const [amount0, setAmount0] = useState("");
  const [amount1, setAmount1] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Balances
  const { balance: balance0 } = useTokenBalance(token0.address, account);
  const { balance: balance1 } = useTokenBalance(token1.address, account);

  // Fetch token decimals khi mở modal / đổi pool
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!isOpen || !provider || !token0.address || !token1.address) return;
      try {
        const [c0, c1] = [
          new ethers.Contract(token0.address, ERC20_ABI, provider),
          new ethers.Contract(token1.address, ERC20_ABI, provider),
        ];
        const [d0, d1] = await Promise.all([c0.decimals(), c1.decimals()]);
        if (mounted) {
          setDec0(Number(d0));
          setDec1(Number(d1));
        }
      } catch (e) {
        console.error("Fetch decimals failed:", e);
        if (mounted) {
          setDec0(18);
          setDec1(18);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isOpen, provider, token0.address, token1.address]);

  // Reset form khi đóng
  useEffect(() => {
    if (!isOpen) {
      setAmount0("");
      setAmount1("");
      setError("");
      setSuccess("");
    }
  }, [isOpen]);

  // Tính amount theo tỉ lệ reserves (BigInt)
  const handleAmount0Change = async (value) => {
    setAmount0(value);
    if (!value || !provider || !pool?.poolAddress) {
      setAmount1("");
      return;
    }
    try {
      const poolContract = new ethers.Contract(
        pool.poolAddress,
        POOL_ABI,
        provider
      );
      const [reserve0, reserve1] = await poolContract.getReserves();

      if (reserve0 > 0n && reserve1 > 0n) {
        const amount0Wei = ethers.parseUnits(value || "0", dec0);
        const amount1Wei = (amount0Wei * reserve1) / reserve0;
        setAmount1(ethers.formatUnits(amount1Wei, dec1));
      }
    } catch (err) {
      console.error("Error calculating amount1:", err);
    }
  };

  const handleAmount1Change = async (value) => {
    setAmount1(value);
    if (!value || !provider || !pool?.poolAddress) {
      setAmount0("");
      return;
    }
    try {
      const poolContract = new ethers.Contract(
        pool.poolAddress,
        POOL_ABI,
        provider
      );
      const [reserve0, reserve1] = await poolContract.getReserves();

      if (reserve0 > 0n && reserve1 > 0n) {
        const amount1Wei = ethers.parseUnits(value || "0", dec1);
        const amount0Wei = (amount1Wei * reserve0) / reserve1;
        setAmount0(ethers.formatUnits(amount0Wei, dec0));
      }
    } catch (err) {
      console.error("Error calculating amount0:", err);
    }
  };

  const handleAddLiquidity = async () => {
    if (!account || !provider || !pool?.poolAddress) {
      setError("Please connect your wallet");
      return;
    }
    if (!amount0 || !amount1) {
      setError("Please enter amounts for both tokens");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const signer = await provider.getSigner();

      const token0Contract = new ethers.Contract(
        token0.address,
        ERC20_ABI,
        signer
      );
      const token1Contract = new ethers.Contract(
        token1.address,
        ERC20_ABI,
        signer
      );

      const amount0Wei = ethers.parseUnits(amount0, dec0);
      const amount1Wei = ethers.parseUnits(amount1, dec1);

      // Approve if needed
      const allowance0 = await token0Contract.allowance(
        account,
        pool.poolAddress
      );
      if (allowance0 < amount0Wei) {
        const tx0 = await token0Contract.approve(
          pool.poolAddress,
          ethers.MaxUint256
        );
        await tx0.wait();
      }
      const allowance1 = await token1Contract.allowance(
        account,
        pool.poolAddress
      );
      if (allowance1 < amount1Wei) {
        const tx1 = await token1Contract.approve(
          pool.poolAddress,
          ethers.MaxUint256
        );
        await tx1.wait();
      }

      // Transfer to pool
      const t0 = await token0Contract.transfer(pool.poolAddress, amount0Wei);
      await t0.wait();
      const t1 = await token1Contract.transfer(pool.poolAddress, amount1Wei);
      await t1.wait();

      // Mint LP
      const poolContract = new ethers.Contract(
        pool.poolAddress,
        POOL_ABI,
        signer
      );
      const mintTx = await poolContract.mint(account);
      await mintTx.wait();

      setSuccess("Liquidity added successfully!");
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      console.error("Error adding liquidity:", err);
      setError(err?.message || "Failed to add liquidity");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !pool) return null;

  return (
    <div className="add-liquidity-overlay" onClick={onClose}>
      <div className="add-liquidity-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            Add Liquidity <HelpCircle size={18} color="#94a3b8" />
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          <div className="pool-selector">
            <div className="pool-selector-header">
              <span className="pool-selector-label">Selected Pool</span>
            </div>
            <div className="selected-pool">
              <div className="pool-pair-icons">
                <div className="pool-pair-icon"></div>
                <div className="pool-pair-icon"></div>
              </div>
              <div className="pool-details">
                <div className="pool-name">{pool.name}</div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span className="pool-type-badge">
                    {pool.stable
                      ? "Stable"
                      : pool.type?.includes("Stable")
                      ? "Stable"
                      : "Volatile"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Amounts */}
          <div className="amount-section">
            <div className="section-header">
              <span className="section-title">Set deposit amount</span>
            </div>

            {/* Token 0 */}
            <div className="amount-input-wrapper">
              <div className="amount-label">
                <span className="label-text">Amount</span>
                <span className="balance-text">
                  Balance:{" "}
                  <span className="balance-value">
                    {balance0} {token0.symbol}
                  </span>
                </span>
              </div>
              <div className="amount-input-row">
                <div className="token-display">
                  <div className="token-icon"></div>
                  <span className="token-symbol">{token0.symbol}</span>
                </div>
                <input
                  type="number"
                  className="amount-input"
                  placeholder="0"
                  value={amount0}
                  onChange={(e) => handleAmount0Change(e.target.value)}
                />
              </div>
            </div>

            {/* Token 1 */}
            <div className="amount-input-wrapper">
              <div className="amount-label">
                <span className="label-text">Amount</span>
                <span className="balance-text">
                  Balance:{" "}
                  <span className="balance-value">
                    {balance1} {token1.symbol}
                  </span>
                </span>
              </div>
              <div className="amount-input-row">
                <div className="token-display">
                  <div className="token-icon"></div>
                  <span className="token-symbol">{token1.symbol}</span>
                </div>
                <input
                  type="number"
                  className="amount-input"
                  placeholder="0"
                  value={amount1}
                  onChange={(e) => handleAmount1Change(e.target.value)}
                />
              </div>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
        </div>

        <div className="modal-actions">
          <button className="modal-btn modal-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="modal-btn modal-btn-primary"
            onClick={handleAddLiquidity}
            disabled={loading || !amount0 || !amount1}
          >
            {loading ? "Adding..." : "Add Liquidity"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddLiquidityModal;
