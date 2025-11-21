## Cấu trúc thư mục dự án

```bash
.
├── Contract/ # Smart contracts (Hardhat)
│ ├── contracts/
│ │ ├── Bribe.sol
│ │ ├── BribeFactory.sol
│ │ ├── Gauge.sol
│ │ ├── GaugeFactory.sol
│ │ ├── LibraToken.sol
│ │ ├── Minter.sol
│ │ ├── MockERC20.sol
│ │ ├── MockPrice.sol
│ │ ├── Pool.sol
│ │ ├── PoolFactory.sol
│ │ ├── PoolFees.sol
│ │ ├── Treasury.sol
│ │ ├── Voter.sol
│ │ └── VotingEscrow.sol
│ ├── scripts/
│ │ └── deployLibraPool.js
│ ├── test/
│ │ ├── LibraPool.test.js
│ │ └── Ve33.test.js
│ ├── hardhat.config.js
│ ├── .env
│ └── package.json
│
└── UI/libra-finance/ # Frontend React
├── public/
│ ├── fonts/
│ ├── icons/
│ ├── images/
│ └── logo.svg
│
├── src/
│ ├── components/
│ │ ├── AddLiquidityModal.js
│ │ ├── ChatBot.js
│ │ ├── CreateLockModal.js
│ │ ├── CreatePoolModal.js
│ │ ├── MergeModal.js
│ │ ├── Navigation.js
│ │ ├── TokenSelectModal.js
│ │ └── VoteModal.js
│ │
│ ├── config/
│ │ └── contracts.js
│ │
│ ├── pages/
│ │ ├── Dashboard.js
│ │ ├── Swap.js
│ │ ├── Liquidity.js
│ │ ├── Vote.js
│ │ ├── Lock.js
│ │ ├── Incentivize.js
│ │ ├── Perpetual.js
│ │ └── LibraLend.js
│ │
│ ├── hooks/
│ │ ├── useTokenBalance.js
│ │ └── useWallet.js
│ │
│ ├── utils/
│ │ └── web3.js
│ │
│ ├── styles/ # (các file .css tương ứng)
│ ├── App.jsx
│ ├── main.jsx
│ └── routes.jsx
│
├── tailwind.config.js
├── postcss.config.js
└── package.json

```

## Hướng dẫn cài đặt & chạy

### 1. Backend (Hardhat)

```bash
cd Contract
npm install
npx hardhat compile
npx hardhat test
```

### 2. Frontend

```bash
cd UI/libra-finance
npm install
npm start
npm start
```

## Tech Stack

Frontend

```bash
React 18
React Router DOM
Tailwind CSS
shadcn/ui
lucide-react
ethers.js v6
```

Smart Contract

```bash
Hardhat
OpenZeppelin Contracts
Solidity ^0.8.0
Chai + hardhat-chai-matchers
```
