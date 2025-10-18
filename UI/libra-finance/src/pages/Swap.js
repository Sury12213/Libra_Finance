"use client";

import "../styles/Swap.css";
import { useState, useEffect } from "react";
import { ChevronDown, ArrowDown } from "lucide-react";
import TokenSelectModal from "../components/TokenSelectModal";
import { useWallet } from "../hooks/useWallet";
import { useTokenBalance } from "../hooks/useTokenBalance";
import { getPoolAddress, getAmountOut, executeSwap } from "../utils/web3";
import { CONTRACTS } from "../config/contracts";

function Swap() {
  const { account } = useWallet();

  const [sellAmount, setSellAmount] = useState("");
  const [buyAmount, setBuyAmount] = useState("");
  const [sellToken, setSellToken] = useState({
    symbol: "PZO",
    name: "Pione Zero",
    icon: "P",
    address: null,
    isNative: true,
  });
  const [buyToken, setBuyToken] = useState({
    symbol: "LIBRA",
    name: "Libra Token",
    icon: "⚖",
    address: CONTRACTS.TOKENS.LIBRA,
  });
  const [isSelectingSell, setIsSelectingSell] = useState(false);
  const [isSelectingBuy, setIsSelectingBuy] = useState(false);

  const { balance: sellBalance, refetch: refetchSell } = useTokenBalance(
    sellToken?.address,
    account
  );
  const { balance: buyBalance, refetch: refetchBuy } = useTokenBalance(
    buyToken?.address,
    account
  );

  useEffect(() => {
    const fetchOut = async () => {
      if (!sellToken?.address || !buyToken?.address || !sellAmount) return;

      let poolAddr = await getPoolAddress(
        sellToken.address,
        buyToken.address,
        true
      );
      if (!poolAddr) {
        poolAddr = await getPoolAddress(
          sellToken.address,
          buyToken.address,
          false
        );
      }

      console.log({ sellToken, buyToken, poolAddr });

      if (!poolAddr) {
        setBuyAmount("0");
        return;
      }
      const out = await getAmountOut(poolAddr, sellAmount, sellToken.address);
      setBuyAmount(out);
    };
    fetchOut();
  }, [sellAmount, sellToken?.address, buyToken?.address]);

  const handleSwap = async () => {
    if (!sellToken?.address || !buyToken?.address)
      return alert("Chọn token trước");

    // auto detect pool type
    let poolAddr = await getPoolAddress(
      sellToken.address,
      buyToken.address,
      true
    );
    if (!poolAddr) {
      poolAddr = await getPoolAddress(
        sellToken.address,
        buyToken.address,
        false
      );
    }
    if (!poolAddr) return alert("Không tìm thấy pool");

    try {
      const out = await getAmountOut(poolAddr, sellAmount, sellToken.address);
      setBuyAmount(out);

      await executeSwap(
        poolAddr,
        sellToken.address,
        buyToken.address,
        sellAmount,
        out,
        account
      );

      await refetchSell();
      await refetchBuy();

      setSellAmount("");
      setBuyAmount("");
      alert("Swap thành công!");
    } catch (err) {
      console.error(err);
      alert("Swap thất bại");
    }
  };

  return (
    <div className="swap-container">
      <div className="swap-card">
        <h2 className="swap-title">Swap</h2>

        {/* Sell Section */}
        <div className="swap-section">
          <div className="swap-header">
            <span className="swap-label">Sell</span>
            <span className="swap-label">
              Balance {sellBalance} {sellToken?.symbol}
            </span>
          </div>
          <div className="token-input-field">
            <div
              className="token-info"
              onClick={() => setIsSelectingSell(true)}
            >
              <div className="token-icon">{sellToken.icon}</div>
              <div className="token-details">
                <div className="token-symbol">{sellToken.symbol}</div>
              </div>
              <ChevronDown size={16} />
            </div>
            <input
              className="token-input"
              type="number"
              placeholder="0"
              value={sellAmount}
              onChange={(e) => setSellAmount(e.target.value)}
            />
          </div>
        </div>

        {/* Arrow */}
        <div className="swap-arrow-container">
          <button
            className="swap-arrow-button"
            onClick={() => {
              const temp = sellToken;
              setSellToken(buyToken);
              setBuyToken(temp);

              const tempAmt = sellAmount;
              setSellAmount(buyAmount);
              setBuyAmount(tempAmt);
            }}
          >
            <ArrowDown size={20} color="#3b82f6" />
          </button>
        </div>

        {/* Buy Section */}
        <div className="swap-section">
          <div className="swap-header">
            <span className="swap-label">Buy</span>
            <span className="swap-label">
              Balance {buyBalance} {buyToken?.symbol}
            </span>
          </div>
          <div className="token-input-field">
            <div className="token-info" onClick={() => setIsSelectingBuy(true)}>
              <div className="token-icon">{buyToken.icon}</div>
              <div className="token-details">
                <div className="token-symbol">{buyToken.symbol}</div>
              </div>
              <ChevronDown size={16} />
            </div>
            <input
              className="token-input"
              type="number"
              placeholder="0"
              value={buyAmount}
              onChange={(e) => setBuyAmount(e.target.value)}
            />
          </div>
        </div>

        {/* Swap Button */}
        <button
          className="swap-button"
          onClick={handleSwap}
          disabled={!sellAmount || !sellToken || !buyToken}
        >
          Swap
        </button>
      </div>

      <TokenSelectModal
        isOpen={isSelectingSell}
        onClose={() => setIsSelectingSell(false)}
        onSelectToken={(token) => {
          setSellToken(token);
          if (token.address === buyToken?.address) {
            setBuyToken(sellToken);
          }
        }}
        currentToken={sellToken}
        userAddress={account}
      />

      <TokenSelectModal
        isOpen={isSelectingBuy}
        onClose={() => setIsSelectingBuy(false)}
        onSelectToken={(token) => {
          setBuyToken(token);
          if (token.address === sellToken?.address) {
            setSellToken(buyToken);
          }
        }}
        currentToken={buyToken}
        userAddress={account}
      />
    </div>
  );
}

export default Swap;
