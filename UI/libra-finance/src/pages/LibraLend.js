"use client";

import { useState } from "react";
import "../styles/LibraLend.css";

function LibraLend() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="libra-lend">
      <div className="lend-header">
        <h1>Libra Lend</h1>
        <p>Earn yield by lending your assets</p>
      </div>

      <div className="lend-tabs">
        <button
          className={`tab-button ${activeTab === "dashboard" ? "active" : ""}`}
          onClick={() => setActiveTab("dashboard")}
        >
          My Dashboard
        </button>
        <button
          className={`tab-button ${activeTab === "markets" ? "active" : ""}`}
          onClick={() => setActiveTab("markets")}
        >
          Markets
        </button>
      </div>

      {activeTab === "dashboard" && (
        <div className="dashboard-content">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total Supplied</div>
              <div className="stat-value">$0.00</div>
              <div className="stat-detail">0 Assets</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Borrowed</div>
              <div className="stat-value">$0.00</div>
              <div className="stat-detail">0 Assets</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Net APY</div>
              <div className="stat-value">0.00%</div>
              <div className="stat-detail">Earnings</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Health Factor</div>
              <div className="stat-value">∞</div>
              <div className="stat-detail">Safe</div>
            </div>
          </div>

          <div className="lend-section">
            <h2>Your Supplies</h2>
            <div className="empty-state">
              <p>No supplies yet</p>
              <p className="empty-detail">Start earning by supplying assets</p>
            </div>
          </div>

          <div className="lend-section">
            <h2>Your Borrows</h2>
            <div className="empty-state">
              <p>No borrows yet</p>
              <p className="empty-detail">
                Borrow assets to use in your strategy
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "markets" && (
        <div className="markets-content">
          <div className="empty-state">
            <p>Markets coming soon</p>
            <p className="empty-detail">Browse available lending markets</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default LibraLend;
