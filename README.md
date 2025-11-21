-- CẤU TRÚC THƯ MỤC
Contract/
├── .env
├── .gitignore
├── hardhat.config.js
├── package.json
├── package-lock.json
│
├── contracts/
│ ├── Bribe.sol
│ └── BribeFactory.sol
│ ├── Gauge.sol
│ └── GaugeFactory.sol
│ ├── LibraToken.sol
│ └── Minter.sol
│ ├── MockERC20.sol
│ └── MockPrice.sol
│ ├── Pool.sol
│ └── PoolFactory.sol
│ ├── PoolFees.sol
│ └── Treasury.sol
│ ├── Voter.sol
│ └── VotingEscrow.sol
│
├── scripts/
│ └── deployLibraPool.js
│
└── test/
├── LibraPool.test.js
└── Ve33.test.js

UI/
└── libra-finance/
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
│ │ └── CreateLockModal.js
│ │ ├── CreatePoolModal.js
│ │ ├── MergeModal.js
│ │ ├── Navigation.js
│ │ ├── TokenSelectModal.js
│ │ └── VoteModal.js
│ │
| │── config/
│ │ ├── contracts.js
│ │  
 │ ├── pages/
│ │ ├── Dashboard.js
│ │ ├── Swapjs
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
│ │ ├── web3.js
│ │
│ ├── styles/
│ │ ├── AddLiquidityModal.css
│ │ ├── ChatBot.css
│ │ ├── CreateLockModal.css
│ │ ├── CreatePoolModal.css
│ │ ├── Dashboard.css
│ │ ├── Incentivize.css
│ │ └── LibraLend.css
│ │ ├── Liquidity.css
│ │ ├── Liquidity.css
│ │ ├── Lock.css
│ │ ├── MergeModal.css
│ │ ├── Perpetual.css
│ │ ├── Swap.css
│ │ └── TokenSelectModal.css
│ │ ├── Vote.css
│ │ └── VoteModal.css
│ │
│ ├── App.jsx
│ ├── main.jsx
│ └── routes.jsx
│
├── tailwind.config.js
├── postcss.config.js
├── package.json
├── package-lock.json
└── README.md
└── LICENSE

-- HƯỚNG DẪN CÀI ĐẶT
cd .\UI\libra-finance\
npm install

-- HƯỚNG DẪN CHẠY
cd .\UI\libra-finance\
npm start

-- THƯ VIỆN & FRAMEWORK
-UI (Frontend)
React 18
React Router DOM
TailwindCSS
shadcn-ui
lucide-react
ethers.js 6
-Smart Contract
Hardhat
OpenZeppelin Contracts
dotenv
chai & hardhat-chai-matchers
Hardhat Toolbox
