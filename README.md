# Agent Identity Registry

**ERC-8004 aligned agent identity on Mantle — discover, verify, and trust autonomous agents without a central server.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Mantle Sepolia](https://img.shields.io/badge/Network-Mantle_Sepolia-FFD700)
![ERC-8004](https://img.shields.io/badge/Standard-ERC--8004-8B5CF6)
![Status](https://img.shields.io/badge/Status-Hackathon_Demo-00FF88)

---

## Why Agent Identity?

Before AI agents can build **reputation, trust, and economies**, they need **identity** — a verifiable, persistent on-chain record that answers:

- **Who is this agent?** (name, endpoints, owner)
- **Who controls it?** (cryptographic proof of ownership)
- **Where do I interact with it?** (MCP, A2A, web endpoints)
- **Can I trust it?** (signature recovery, chain of custody)

Without identity, agents are ephemeral — indistinguishable, non-reputable, untrustable. Without on-chain identity, trust requires a centralized gatekeeper.

**This project fixes both problems.**

## What It Does

Register your AI agent's identity on Mantle in one click:

1. **Sign** — prove wallet ownership with a single signature
2. **Upload** — agent metadata (name, endpoints, social links) goes to IPFS
3. **Register** — on-chain mint of an ERC-8004 soulbound identity token
4. **Verify** — any agent can independently verify another agent's identity via on-chain lookup + signature recovery

No centralized server. No gatekeeper. No fake badges.

## Core Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   User Wallet (MetaMask)                                     │
│       │                                                     │
│       │ sign | register                                      │
│       ▼                                                     │
│   ┌─────────────────┐     ┌───────────────────┐             │
│   │   Vite Frontend  │────▶│   Vite Middleware  │            │
│   │   (React +       │     │   /api/upload      │            │
│   │    ethers.js)    │     └────────┬──────────┘             │
│   └─────────────────┘              │                        │
│            │                       │ IPFS add                │
│            │ register(agentURI)    ▼                          │
│            │               ┌──────────────┐                   │
│            └──────────────▶│ Local IPFS    │                  │
│                            │ Daemon        │                  │
│                            └──────────────┘                   │
│                                    │                          │
│                                    ▼                          │
│   ┌─────────────────────────────────────────────────────┐     │
│   │           Mantle Sepolia (Chain ID: 5003)            │     │
│   │  ┌───────────────────────────────────────────────┐  │     │
│   │  │ IdentityRegistry (ERC-721 URIStorage)          │  │     │
│   │  │                                               │  │     │
│   │  │  Agent #1: {owner, tokenURI → IPFS,           │  │     │
│   │  │            agentWallet, metadata}              │  │     │
│   │  │  Agent #2: {owner, tokenURI → IPFS, ...}      │  │     │
│   │  │  ...                                          │  │     │
│   │  └───────────────────────────────────────────────┘  │     │
│   └─────────────────────────────────────────────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Contracts

| Contract | Address | MantleScan |
|---|---|---|
| **IdentityRegistry** | `0xCd2A74Cff974B2B962A5AA46D3aBe3F7b137509D` | [View](https://sepolia.mantlescan.xyz/address/0xCd2A74Cff974B2B962A5AA46D3aBe3F7b137509D) |

### Deployer
`0xCbe7F5506A373d8aD8142f76Bb9d7fA6d609008C`

### Test Token
- **Agent #1** — `ipfs://test-cid` (deployer-owned)

---

## ERC-8004 Alignment

This project implements the **Identity Registry** component of the [ERC-8004: Trustless Agents](https://eips.ethereum.org/EIPS/eip-8004) draft standard. We are **aligned** with:

### ✅ Identity Registry — Fully Implemented

| Requirement | Status |
|---|---|
| ERC-721 with URIStorage | ✅ `ERC721URIStorage` — agents are NFTs |
| Incremental tokenId as agentId | ✅ Agent #1, #2, #3... |
| `register(string agentURI)` | ✅ Returns `uint256 agentId` |
| `register(string agentURI, MetadataEntry[])` | ✅ With on-chain metadata |
| `register()` | ✅ Minimal registration |
| `setAgentURI(uint256, string)` | ✅ With `URIUpdated` event |
| `getMetadata(uint256, string)` | ✅ Returns `bytes` |
| `setMetadata(uint256, string, bytes)` | ✅ With `MetadataSet` event |
| `agentWallet` (reserved key) | ✅ Auto-set, EIP-712 to change |
| EIP-712 typed signature for wallet change | ✅ `setAgentWallet(uint256, address, uint256, bytes)` |
| Registration JSON file schema | ✅ `type`, `services`, `registrations`, `supportedTrust` |
| Soulbound (non-transferable) | ✅ `_update` override prevents transfers |

### 🔲 Reputation Registry — Not Implemented
The ERC-8004 standard also defines a Reputation Registry and Validation Registry. These are separate contracts that can be added later. Our current scope focuses on **identity discovery and verification**.

---

## Trust Model

**There is no centralized verification authority.** Here's how trust works between two autonomous agents:

1. **Agent A finds Agent B** in the registry (by name or agent ID)
2. **A calls `ownerOf(B.agentId)`** → gets B's wallet address
3. **A calls `tokenURI(B.agentId)`** → gets B's IPFS URI
4. **A fetches B's registration file** from IPFS → finds B's signed message
5. **A recovers the signing wallet** from the signature → `ecrecover(hash, signature)`
6. **If recovered wallet == owner** → B controls that identity

**Result:** Cryptographic trust, no server, no gatekeeper. Agent A independently verifies Agent B.

---

## How to Use

### Online Demo
👉 **[https://found-toxic-caribbean-trim.trycloudflare.com](https://found-toxic-caribbean-trim.trycloudflare.com)**

1. Connect MetaMask (Mantle Sepolia network)
2. Enter agent name + optional endpoints (website, Twitter, GitHub)
3. Click **"Register Agent"**
4. Sign the message + confirm the transaction
5. Done — your agent has a verifiable on-chain identity

### Verify an Agent
1. Switch to **"Verify Agent"** tab
2. Search by name (searches all agents) or by agent ID (direct lookup)
3. View owner, payment wallet, metadata, and ERC-8004 compliance info

### From the CLI
```bash
# Register an agent
cast send $REGISTRY "register(string)" "ipfs://your-metadata" \
  --rpc-url https://rpc.sepolia.mantle.xyz \
  --private-key $KEY

# Look up an agent
cast call $REGISTRY "ownerOf(uint256)(address)" 1 \
  --rpc-url https://rpc.sepolia.mantle.xyz

# Get agent URI
cast call $REGISTRY "tokenURI(uint256)(string)" 1 \
  --rpc-url https://rpc.sepolia.mantle.xyz

# Check agent wallet
cast call $REGISTRY "getAgentWallet(uint256)(address)" 1 \
  --rpc-url https://rpc.sepolia.mantle.xyz

# Total registered agents
cast call $REGISTRY "totalSupply()(uint256)" \
  --rpc-url https://rpc.sepolia.mantle.xyz
```

---

## Adding Mantle Sepolia to MetaMask

| Setting | Value |
|---|---|
| Network Name | Mantle Sepolia |
| RPC URL | `https://rpc.sepolia.mantle.xyz` |
| Chain ID | `5003` |
| Currency Symbol | `MNT` |
| Block Explorer | `https://sepolia.mantlescan.xyz` |

Get free testnet MNT from the [Mantle Sepolia Faucet](https://faucet.sepolia.mantle.xyz/).

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Smart Contract** | Solidity 0.8.19, OpenZeppelin v5.6.1, Foundry |
| **Blockchain** | Mantle Sepolia (Chain ID: 5003) |
| **Frontend** | React, Vite, Tailwind v4, shadcn/ui |
| **Web3** | ethers.js v6, MetaMask |
| **Storage** | Local IPFS daemon (pinned) |
| **Standard** | ERC-8004 (draft), ERC-721, EIP-712 |
| **Tunnel** | Cloudflare Tunnel (demo access) |

---

## Project Structure

```
mantle-persona-registry/
├── contracts/              # Contract sources (symlinked to src/)
├── src/
│   └── IdentityRegistry.sol    # ERC-8004 compliant registry
├── scripts/
│   └── deploy_mantle_sepolia.js   # Deploy script
├── web/
│   ├── src/
│   │   ├── App.jsx              # Main app with wallet + registration
│   │   ├── lib/
│   │   │   ├── registry.js      # ethers.js contract interface
│   │   │   └── contract-addresses.js  # Deployed addresses
│   │   ├── components/          # React components
│   │   └── plugins/             # Vite middleware (IPFS upload)
│   └── vite.config.js
├── offchain/cli/           # CLI tools (optional)
├── out/                    # Build artifacts
├── lib/                    # Dependencies (forge-std, OZ)
└── foundry.toml
```

---

## Development

```bash
# Prerequisites
curl -L https://foundry.paradigm.xyz | bash

# Clone and build
git clone <repo-url>
cd mantle-persona-registry
forge build

# Deploy (set PRIVATE_KEY env or .env)
forge create src/IdentityRegistry.sol:IdentityRegistry \
  --constructor-args "Agent Identity Registry" "AID" $DEPLOYER \
  --rpc-url https://rpc.sepolia.mantle.xyz \
  --private-key $PRIVATE_KEY \
  --broadcast

# Run frontend
cd web
npm install
npm run dev
```

---

## Roadmap

- **Reputation Registry** — on-chain feedback signals for agent trust scoring
- **Validation Registry** — stake-secured re-execution and zkML verification
- **Multi-chain** — register agents across any EVM chain
- **ENS integration** — human-readable agent names
- **Agent-to-agent discovery** — automated A2A handshake via registry lookup

---

## Hackathon

Built for the **Mantle Turing Test Hackathon 2026** — Agentic Wallets & Economy track.

[![Mantle Turing Test Hackathon](https://img.shields.io/badge/Mantle-Turing_Test_2026-FFD700)](https://turingtest.mantle.xyz/)

---

## License

MIT
