import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import Navigation from "./components/Navigation";
import Dashboard from "./pages/Dashboard";
import Swap from "./pages/Swap";
import Liquidity from "./pages/Liquidity";
import Vote from "./pages/Vote";
import Lock from "./pages/Lock";
import Incentivize from "./pages/Incentivize";
import LibraLend from "./pages/LibraLend";
import Perpetual from "./pages/Perpetual";

function App() {
  return (
    <Router>
      <div className="app">
        <Navigation />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/swap" element={<Swap />} />
            <Route path="/liquidity" element={<Liquidity />} />
            <Route path="/vote" element={<Vote />} />
            <Route path="/lock" element={<Lock />} />
            <Route path="/incentivize" element={<Incentivize />} />
            <Route path="/libra-lend" element={<LibraLend />} />
            <Route path="/perpetual" element={<Perpetual />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
