require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  paths: {
    sources: "contracts",
    tests: "test",
    cache: "cache",
    artifacts: "artifacts",
  },
  networks: {
    pione: {
      url: "https://rpc.zeroscan.org",
      chainId: 5080,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      pione: process.env.API_KEY,
    },
    customChains: [
      {
        network: "pione",
        chainId: 5080,
        urls: {
          apiURL: "https://zeroscan.org/api/",
          browserURL: "https://zeroscan.org/",
        },
      },
    ],
  },
};
