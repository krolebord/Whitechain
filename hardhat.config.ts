import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "@openzeppelin/hardhat-upgrades";
import "solidity-coverage";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  sourcify: {
    enabled: true,
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    whitechainTestnet: {
      url:
        process.env.WHITECHAIN_TESTNET_RPC_URL ||
        "https://rpc-testnet.whitechain.io",
      chainId: 2625,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: process.env.WHITECHAIN_API_KEY
      ? {
          whitechainTestnet: process.env.WHITECHAIN_API_KEY,
        }
      : {
          whitechainTestnet: "dummy", // Some explorers don't require a real API key
        },
    customChains: [
      {
        network: "whitechainTestnet",
        chainId: 2625,
        urls: {
          apiURL: "https://testnet.whitechain.io/api",
          browserURL: "https://explorer-testnet.whitechain.io",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
};

export default config;
