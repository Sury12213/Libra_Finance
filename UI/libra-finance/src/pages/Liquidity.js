"use client";

import { useState, useEffect } from "react";
import { Search, Plus } from "lucide-react";
import { getAllPools, getLiquidityStats } from "../utils/web3";
import AddLiquidityModal from "../components/AddLiquidityModal";
import CreatePoolModal from "../components/CreatePoolModal";

function Liquidity() {
  const [searchTerm, setSearchTerm] = useState("");
  const [pools, setPools] = useState([]);
  const [filteredPools, setFilteredPools] = useState([]);
  const [typeFilter, setTypeFilter] = useState("Any");
  const [sortBy, setSortBy] = useState("TVL ↓");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPool, setSelectedPool] = useState(null);
  const [isCreatePoolModalOpen, setIsCreatePoolModalOpen] = useState(false);
  const [isLoadingPools, setIsLoadingPools] = useState(true);
  const [liquidityStats, setLiquidityStats] = useState({
    volume: 0,
    fees: 0,
    tvl: 0,
  });

  // Fetch pools and stats
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingPools(true);
      try {
        // Fetch pools and stats in parallel
        const [fetchedPools, stats] = await Promise.all([
          getAllPools(),
          getLiquidityStats(),
        ]);

        setPools(fetchedPools);
        setFilteredPools(fetchedPools);
        setLiquidityStats(stats);

        console.log("Liquidity stats:", stats);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        // Add minimum loading time for better UX
        setTimeout(() => {
          setIsLoadingPools(false);
        }, 1000);
      }
    };

    fetchData();
  }, []);

  // Filtering and sorting
  useEffect(() => {
    const num = (v) =>
      typeof v === "number"
        ? v
        : parseFloat(String(v ?? "0").replace(/[$,%_,\s]/g, "")) || 0;

    let updatedPools = [...pools];

    // Filter by search
    if (searchTerm) {
      updatedPools = updatedPools.filter((pool) =>
        pool.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by type
    if (typeFilter !== "Any") {
      updatedPools = updatedPools.filter(
        (pool) => pool.type.toLowerCase() === typeFilter.toLowerCase()
      );
    }

    // Sort
    if (sortBy === "TVL ↓") {
      updatedPools.sort((a, b) => num(b.tvl) - num(a.tvl));
    } else if (sortBy === "Volume ↓") {
      updatedPools.sort((a, b) => num(b.volume) - num(a.volume));
    } else if (sortBy === "APR ↓") {
      updatedPools.sort((a, b) => num(b.apr) - num(a.apr));
    }

    setFilteredPools(updatedPools);
  }, [searchTerm, typeFilter, sortBy, pools]);

  const handleAddLiquidity = (pool) => {
    setSelectedPool(pool);
    setIsModalOpen(true);
  };

  return (
    <div>
      {/* --- Summary --- */}
      <div
        className="card liquidity-summary"
        style={{ marginBottom: "2rem", padding: "2rem" }}
      >
        <div
          className="summary-header"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            marginBottom: "1rem",
          }}
        >
          <div
            className="summary-icon"
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Plus size={24} color="white" />
          </div>
          <div>
            <h3
              style={{
                fontSize: "1.125rem",
                fontWeight: "600",
                marginBottom: "0.25rem",
              }}
            >
              Liquidity providers
            </h3>
            <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>
              Enable low-slippage swaps. Deposit & stake liquidity to earn
              LIBRA.
            </p>
          </div>
        </div>

        <div
          className="summary-stats"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.875rem",
                color: "#94a3b8",
                marginBottom: "0.25rem",
              }}
            >
              Volume
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: "700" }}>
              {isLoadingPools ? (
                <span style={{ color: "#64748b" }}>Loading...</span>
              ) : (
                `~$${liquidityStats.volume.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              )}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: "0.875rem",
                color: "#94a3b8",
                marginBottom: "0.25rem",
              }}
            >
              Fees
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: "700" }}>
              {isLoadingPools ? (
                <span style={{ color: "#64748b" }}>Loading...</span>
              ) : (
                `~$${liquidityStats.fees.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              )}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: "0.875rem",
                color: "#94a3b8",
                marginBottom: "0.25rem",
              }}
            >
              TVL
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: "700" }}>
              {isLoadingPools ? (
                <span style={{ color: "#64748b" }}>Loading...</span>
              ) : (
                `~$${liquidityStats.tvl.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- Pools List --- */}
      <div className="card">
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ display: "flex", gap: "1rem" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700" }}>Pools</h2>
            <span
              style={{
                padding: "0.25rem 0.75rem",
                background: "#1e3a8a",
                color: "#3b82f6",
                borderRadius: "9999px",
                fontSize: "0.875rem",
                fontWeight: "600",
              }}
            >
              {filteredPools.length}
            </span>
          </div>

          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <button
              className="btn btn-primary"
              style={{
                padding: "0.75rem 1.5rem",
                fontSize: "0.875rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
              onClick={() => setIsCreatePoolModalOpen(true)}
            >
              Create Pool
            </button>

            <div style={{ position: "relative", width: "300px" }}>
              <Search
                size={20}
                color="#94a3b8"
                style={{
                  position: "absolute",
                  left: "1rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
              <input
                type="text"
                className="input"
                placeholder="Symbol or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: "3rem" }}
              />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div
          style={{
            display: "flex",
            gap: "1rem",
            marginBottom: "1.5rem",
            paddingBottom: "1rem",
            borderBottom: "1px solid #334155",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "#94a3b8",
                marginBottom: "0.25rem",
              }}
            >
              TYPE
            </div>
            <select
              className="select"
              style={{ padding: "0.5rem" }}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option>Any</option>
              <option>Stable</option>
              <option>Volatile</option>
            </select>
          </div>

          <div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "#94a3b8",
                marginBottom: "0.25rem",
              }}
            >
              SORT
            </div>
            <select
              className="select"
              style={{ padding: "0.5rem" }}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option>TVL ↓</option>
              <option>Volume ↓</option>
              <option>APR ↓</option>
            </select>
          </div>
        </div>

        {/* Table or Loading */}
        {isLoadingPools ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "60px 0",
            }}
          >
            <div
              style={{
                width: "60px",
                height: "60px",
                border: "4px solid rgba(148, 163, 184, 0.3)",
                borderTopColor: "#7c3aed",
                borderRadius: "50%",
                animation: "spin 0.9s linear infinite",
              }}
            ></div>

            <div
              style={{
                marginTop: "12px",
                fontSize: "0.95rem",
                color: "#cbd5e1",
                fontWeight: "500",
                letterSpacing: "0.5px",
              }}
            >
              Loading Pools...
            </div>

            <style>
              {`@keyframes spin {
          to { transform: rotate(360deg); }
        }`}
            </style>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Pools</th>
                  <th>Volume</th>
                  <th>Fees</th>
                  <th>TVL</th>
                  <th>APR</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredPools.map((pool, index) => (
                  <tr key={index}>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                        }}
                      >
                        <div className="pool-icons">
                          <div className="pool-icon"></div>
                          <div className="pool-icon"></div>
                        </div>
                        <div>
                          <div
                            style={{
                              fontWeight: "600",
                              color: "#ffffff",
                              marginBottom: "0.25rem",
                            }}
                          >
                            {pool.name}
                          </div>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "#3b82f6",
                            }}
                          >
                            {pool.type}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      $
                      {(pool.volume || 0).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td>
                      $
                      {(pool.fees || 0).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td style={{ fontWeight: "600" }}>
                      $
                      {(pool.tvl || 0).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td style={{ color: "#10b981", fontWeight: "600" }}>
                      {pool.apr || "N/A"}
                    </td>
                    <td>
                      <button
                        className="btn btn-primary"
                        style={{
                          padding: "0.5rem 1rem",
                          fontSize: "0.875rem",
                        }}
                        onClick={() => handleAddLiquidity(pool)}
                      >
                        + Add liquidity
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- Modals --- */}
      <AddLiquidityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        pool={selectedPool}
      />
      <CreatePoolModal
        isOpen={isCreatePoolModalOpen}
        onClose={() => setIsCreatePoolModalOpen(false)}
        openAddLiquidityModal={(pool) => {
          setSelectedPool(pool);
          setIsCreatePoolModalOpen(false);
          setIsModalOpen(true);
        }}
      />
    </div>
  );
}

export default Liquidity;
