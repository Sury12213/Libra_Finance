"use client";

import { useState } from "react";
import "../styles/Perpetual.css";

function Perpetual() {
  const [selectedPair, setSelectedPair] = useState("BTC/USDT");
  const [leverage, setLeverage] = useState(1);
  const [positionType, setPositionType] = useState("long");
  const [orderType, setOrderType] = useState("market");

  const pairs = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "ARB/USDT"];

  return (
    <div className="perpetual">
      <div className="perpetual-container">
        {/* Left Panel - Chart */}
        <div className="chart-panel">
          <div className="chart-header">
            <div className="pair-selector">
              <select
                value={selectedPair}
                onChange={(e) => setSelectedPair(e.target.value)}
                className="pair-select"
              >
                {pairs.map((pair) => (
                  <option key={pair} value={pair}>
                    {pair}
                  </option>
                ))}
              </select>
            </div>
            <div className="chart-price">
              <span className="price-label">Price</span>
              <span className="price-value">$116,500.0</span>
              <span className="price-change positive">+2.45%</span>
            </div>
          </div>
          <div className="chart-placeholder">
            <p>Chart coming soon</p>
          </div>
        </div>

        {/* Right Panel - Trading */}
        <div className="trading-panel">
          <div className="trading-header">
            <h2>Trade {selectedPair}</h2>
          </div>

          {/* Position Type */}
          <div className="trading-section">
            <label className="section-label">Position Type</label>
            <div className="position-buttons">
              <button
                className={`position-btn long ${
                  positionType === "long" ? "active" : ""
                }`}
                onClick={() => setPositionType("long")}
              >
                Long
              </button>
              <button
                className={`position-btn short ${
                  positionType === "short" ? "active" : ""
                }`}
                onClick={() => setPositionType("short")}
              >
                Short
              </button>
            </div>
          </div>

          {/* Order Type */}
          <div className="trading-section">
            <label className="section-label">Order Type</label>
            <div className="order-buttons">
              <button
                className={`order-btn ${
                  orderType === "market" ? "active" : ""
                }`}
                onClick={() => setOrderType("market")}
              >
                Market
              </button>
              <button
                className={`order-btn ${orderType === "limit" ? "active" : ""}`}
                onClick={() => setOrderType("limit")}
              >
                Limit
              </button>
            </div>
          </div>

          {/* Leverage */}
          <div className="trading-section">
            <div className="leverage-header">
              <label className="section-label">Leverage</label>
              <span className="leverage-value">{leverage}x</span>
            </div>
            <input
              type="range"
              min="1"
              max="20"
              value={leverage}
              onChange={(e) => setLeverage(Number(e.target.value))}
              className="leverage-slider"
            />
            <div className="leverage-presets">
              {[1, 2, 5, 10, 20].map((lev) => (
                <button
                  key={lev}
                  className={`preset-btn ${leverage === lev ? "active" : ""}`}
                  onClick={() => setLeverage(lev)}
                >
                  {lev}x
                </button>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <div className="trading-section">
            <label className="section-label">Amount (USDT)</label>
            <input type="number" placeholder="0.00" className="amount-input" />
          </div>

          {/* Trade Info */}
          <div className="trade-info">
            <div className="info-row">
              <span className="info-label">Entry Price</span>
              <span className="info-value">$116,500.00</span>
            </div>
            <div className="info-row">
              <span className="info-label">Liquidation Price</span>
              <span className="info-value">$100,250.00</span>
            </div>
            <div className="info-row">
              <span className="info-label">Max Profit</span>
              <span className="info-value positive">Unlimited</span>
            </div>
          </div>

          {/* Trade Button */}
          <button className={`trade-button ${positionType}`}>
            {positionType === "long" ? "Open Long" : "Open Short"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Perpetual;
