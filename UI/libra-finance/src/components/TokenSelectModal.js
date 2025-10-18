"use client";

import { useState, useEffect } from "react";
import { X, Search, Plus } from "lucide-react";
import { CONTRACTS } from "../config/contracts";
import { useTokenBalance } from "../hooks/useTokenBalance";
import { getTokenDetails } from "../utils/web3";
import "../styles/TokenSelectModal.css";

const TOKENS = [
  {
    symbol: "PZO",
    name: "Pione Zero",
    icon: "P",
    address: "0x0000000000000000000000000000000000000000",
  },
  {
    symbol: "USDT",
    name: "Tether",
    icon: "₮",
    address: CONTRACTS.TOKENS.USDT,
  },
  {
    symbol: "LIBRA",
    name: "Libra Token",
    icon: "⚖",
    address: CONTRACTS.TOKENS.LIBRA,
  },
];

function TokenItem({ token, currentToken, onSelect, userAddress }) {
  const { balance } = useTokenBalance(token.address, userAddress);
  const isSelected = currentToken?.symbol === token.symbol;

  return (
    <button
      onClick={() => onSelect(token)}
      className={`token-item ${isSelected ? "selected" : ""}`}
    >
      <div className="token-item-left">
        <div className="token-item-icon">{token.icon}</div>
        <div className="token-item-info">
          <div className="token-item-symbol">{token.symbol}</div>
          <div className="token-item-name">{token.name}</div>
        </div>
      </div>
      <div className="token-item-right">
        <div className="token-item-balance">
          {Number.parseFloat(balance).toFixed(4)}
        </div>
      </div>
    </button>
  );
}

function TokenSelectModal({
  isOpen,
  onClose,
  onSelectToken,
  currentToken,
  userAddress,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [customTokens, setCustomTokens] = useState([]);
  const [searchedToken, setSearchedToken] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("customTokens");
    if (saved) {
      try {
        setCustomTokens(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading custom tokens:", e);
      }
    }
  }, []);

  useEffect(() => {
    if (customTokens.length > 0) {
      localStorage.setItem("customTokens", JSON.stringify(customTokens));
    }
  }, [customTokens]);

  useEffect(() => {
    const checkAndFetchToken = async () => {
      const isAddress = /^0x[a-fA-F0-9]{40}$/.test(searchQuery);

      if (!isAddress) {
        setSearchedToken(null);
        return;
      }

      const allTokens = [...TOKENS, ...customTokens];
      const existingToken = allTokens.find(
        (t) =>
          t.address && t.address.toLowerCase() === searchQuery.toLowerCase()
      );

      if (existingToken) {
        setSearchedToken(null);
        return;
      }

      setIsLoadingToken(true);
      try {
        const tokenDetails = await getTokenDetails(searchQuery);
        setSearchedToken(tokenDetails);
      } catch (error) {
        setSearchedToken(null);
      } finally {
        setIsLoadingToken(false);
      }
    };

    const timeoutId = setTimeout(checkAndFetchToken, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, customTokens]);

  const handleImportToken = () => {
    if (!searchedToken) return;
    setCustomTokens((prev) => [...prev, searchedToken]);
    setSearchedToken(null);
    setSearchQuery("");
  };

  if (!isOpen) return null;

  const allTokens = [...TOKENS, ...customTokens];
  const filteredTokens = allTokens.filter(
    (token) =>
      token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (token.address &&
        token.address.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Select token</h3>
          <button onClick={onClose} className="modal-close-button">
            <X size={24} />
          </button>
        </div>

        <div className="modal-search">
          <div className="search-input-container">
            <Search size={20} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search by name, symbol or paste address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <div className="token-list">
          {searchedToken && (
            <div className="import-token-item">
              <div className="token-item-left">
                <div className="token-item-icon">{searchedToken.icon}</div>
                <div className="token-item-info">
                  <div className="token-item-symbol">
                    {searchedToken.symbol}
                  </div>
                  <div className="token-item-name">{searchedToken.name}</div>
                </div>
              </div>
              <button onClick={handleImportToken} className="import-button">
                <Plus size={18} />
                Import
              </button>
            </div>
          )}

          {isLoadingToken && (
            <div className="loading-token">
              <div className="loading-spinner"></div>
              <span>Loading token...</span>
            </div>
          )}

          {!searchedToken &&
            !isLoadingToken &&
            filteredTokens.map((token) => (
              <TokenItem
                key={token.address ?? token.symbol}
                token={token}
                currentToken={currentToken}
                onSelect={(token) => {
                  onSelectToken(token);
                  onClose();
                }}
                userAddress={userAddress}
              />
            ))}

          {!searchedToken && !isLoadingToken && filteredTokens.length === 0 && (
            <div className="no-results">No tokens found</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TokenSelectModal;
