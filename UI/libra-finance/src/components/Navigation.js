"use client";

import { Link, useLocation } from "react-router-dom";
import { Menu, Scale } from "lucide-react";
import { useWallet } from "../hooks/useWallet";

function Navigation() {
  const location = useLocation();
  const {
    account,
    isConnecting,
    connectWallet,
    disconnectWallet,
    formatAddress,
  } = useWallet();

  const isActive = (path) => {
    return location.pathname === path ? "active" : "";
  };

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-left">
          <Link to="/" className="logo">
            <div className="logo-icon">
              <img
                src="/libra-logo.jpg"
                alt="Libra Finance"
                style={{
                  width: "50px",
                  height: "50px",
                  objectFit: "contain",
                }}
              />
            </div>
            <span>LIBRA FINANCE</span>
          </Link>

          <ul className="nav-links">
            <li>
              <Link to="/" className={`nav-link ${isActive("/")}`}>
                Dashboard
              </Link>
            </li>
            <li>
              <Link to="/swap" className={`nav-link ${isActive("/swap")}`}>
                Swap
              </Link>
            </li>
            <li>
              <Link
                to="/liquidity"
                className={`nav-link ${isActive("/liquidity")}`}
              >
                Liquidity
              </Link>
            </li>
            <li>
              <Link to="/vote" className={`nav-link ${isActive("/vote")}`}>
                Vote
              </Link>
            </li>
            <li>
              <Link to="/lock" className={`nav-link ${isActive("/lock")}`}>
                Lock
              </Link>
            </li>
            <li>
              <Link
                to="/incentivize"
                className={`nav-link ${isActive("/incentivize")}`}
              >
                Incentivize
              </Link>
            </li>
          </ul>
        </div>

        <div className="nav-right">
          {account ? (
            <div className="wallet-connected">
              <div
                className="wallet-address"
                onClick={disconnectWallet}
                title="Disconnect wallet"
                style={{ cursor: "pointer" }}
              >
                <span className="status-dot"></span>
                <span>{formatAddress(account)}</span>
                <div className="disconnect-text">Disconnect</div>
              </div>
            </div>
          ) : (
            <button
              className="connect-wallet-button"
              onClick={connectWallet}
              disabled={isConnecting}
            >
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </button>
          )}

          <button className="menu-button">
            <Menu size={24} />
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;
