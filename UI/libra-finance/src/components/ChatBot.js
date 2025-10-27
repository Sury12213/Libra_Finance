"use client";
import { useState, useEffect } from "react";
import { MessageSquare, Send, RefreshCw } from "lucide-react";
import { getAllPools } from "../utils/web3";
import "../styles/ChatBot.css";

function ChatBot() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: "Hi 👋 I'm Libra Assistant. Ask me about pools, rewards, or voting insights!",
    },
  ]);
  const [pools, setPools] = useState([]);

  // Fetch pool data
  const fetchPools = async () => {
    setLoading(true);
    try {
      const data = await getAllPools();
      setPools(data);
    } catch (e) {
      console.error("Error loading pools:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPools();
  }, []);

  const handleUserMessage = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages([...messages, { from: "user", text: userMsg }]);
    setInput("");

    setTimeout(() => {
      const reply = processPrompt(userMsg);
      setMessages((prev) => [...prev, { from: "bot", text: reply }]);
    }, 600);
  };

  // ✨ Rule-based logic
  const processPrompt = (prompt) => {
    const text = prompt.toLowerCase();

    if (pools.length === 0)
      return "I don’t have pool data yet. Try again after a few seconds.";

    if (text.includes("apr")) {
      const sorted = [...pools]
        .sort((a, b) => parseFloat(b.apr) - parseFloat(a.apr))
        .slice(0, 3);
      return `Top pools by APR:\n${sorted
        .map((p) => `• ${p.name} → ${p.apr}`)
        .join("\n")}`;
    }

    if (text.includes("incentive") || text.includes("reward")) {
      const sorted = [...pools]
        .sort((a, b) => b.incentiveUsd - a.incentiveUsd)
        .slice(0, 3);
      return `🔥 Pools with highest incentives:\n${sorted
        .map((p) => `• ${p.name} → $${p.incentiveUsd.toFixed(2)}`)
        .join("\n")}`;
    }

    if (text.includes("tvl") || text.includes("volume")) {
      const sorted = [...pools].sort((a, b) => b.tvl - a.tvl).slice(0, 3);
      return `💰 Top pools by TVL:\n${sorted
        .map((p) => `• ${p.name} → $${p.tvl.toFixed(2)}`)
        .join("\n")}`;
    }

    if (text.includes("stable")) {
      const stablePools = pools.filter((p) => p.type === "Stable");
      return `🧊 Stable pools (${stablePools.length}): ${stablePools
        .map((p) => p.name)
        .join(", ")}`;
    }

    if (text.includes("volatile")) {
      const volatilePools = pools.filter((p) => p.type === "Volatile");
      return `⚡ Volatile pools (${volatilePools.length}): ${volatilePools
        .map((p) => p.name)
        .join(", ")}`;
    }

    return "🤔 I didn’t quite get that. Try asking: 'Top 3 pools by APR' or 'Pools with best incentives'.";
  };

  return (
    <>
      {/* Toggle button */}
      <div className="chatbot-toggle" onClick={() => setOpen(!open)}>
        <MessageSquare size={22} />
      </div>

      {open && (
        <div className="chatbot-box">
          <div className="chatbot-header">
            💬 Libra Assistant
            <button onClick={fetchPools} disabled={loading}>
              <RefreshCw size={16} className={loading ? "spin" : ""} />
            </button>
          </div>

          <div className="chatbot-body">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`chat-message ${m.from === "user" ? "user" : "bot"}`}
              >
                {m.text}
              </div>
            ))}
          </div>

          <div className="chatbot-input">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me about pools..."
              onKeyDown={(e) => e.key === "Enter" && handleUserMessage()}
            />
            <button onClick={handleUserMessage}>
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default ChatBot;
