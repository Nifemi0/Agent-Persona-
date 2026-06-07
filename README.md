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

Register your AI agent's identity on Mantle Sepolia with a visible 5-step flow:

```
[1: Define] → [2: Sign] → [3: Upload] → [4: Register] → [5: Done]
```

| Step | What happens |
|---|---|
| **① Define** | Enter agent name + optional social links (website, Twitter, GitHub) |
| **② Sign** | MetaMask pops to sign the name (free, no gas) |
| **③ Upload** | Persona metadata auto-uploaded to IPFS via Pinata |
| **④ Register** | ERC-8004 `register(string)` tx submitted to Mantle Sepolia |
| **⑤ Done** | Agent ID, tx details, reputation placeholders shown |

After registration, you can **assign an agent wallet** — an EIP-712 signed permit that links a keypair to the agent, enabling cryptographic identity proofs.

No centralized server. No gatekeeper. No fake badges.

## Live Demo

👉 **[agent-persona-neon.vercel.app](https://agent-persona-neon.vercel.app)**

## Core Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   User Wallet (MetaMask)                                     │
│       │                                                     │
│       │ sign | EIP-712 | register                            │
│       ▼                                                     │
│   ┌─────────────────┐     ┌───────────────────┐             │
│   │  Vite Frontend   │────▶│  /api/upload       │            │
│   │  (React +        │     │  (Vercel serverless)│           │
│   │   ethers.js)     │     └────────┬───────────┘             │
│   └─────────────────┘              │                         │
│            │                       │ Pinata API               │
│            │ register(agentURI)    ▼                          │
│            │               ┌────────────────┐                 │
│            └──────────────▶│  IPFS (Pinata)  │                │
│                            └────────────────┘                 │
│                                    │                          │
│                                    ▼                          │
│   ┌──────────────────────────────────────────────────────┐    │
│   │           Mantle Sepolia (Chain ID: 5003)             │    │
│   │  ┌────────────────────────────────────────────────┐  │    │
│   │  │ IdentityRegistry (ERC-721 URIStorage)           │  │    │
│   │  │                                                │  │    │
│   │  │  Agent #1: {owner, tokenURI → IPFS,            │  │    │
│   │  │            agentWallet, metadata}               │  │    │
│   │  │  Agent #2: {owner, tokenURI → IPFS, ...}       │  │    │
│   │  │  ...                                           │  │    │
│   │  └────────────────────────────────────────────────┘  │    │
│   └──────────────────────────────────────────────────────┘    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Contracts

| Contract | Address | MantleScan |
|---|---|---|
| **IdentityRegistry** | `0xCd2A74Cff974B2B962A5AA46D3aBe3F7b137509D` | [View](https://sepolia.mantlescan.xyz/address/0xCd2A74Cff974B2B962A5AA46D3aBe3F7b137509D) |

### Deployer
`0xCbe7F5506A373d8aD8142f76Bb9d7fA6d609008C`

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
3. **A calls `getAgentWallet(B.agentId)`** → gets B's assigned agent wallet
4. **A calls `tokenURI(B.agentId)`** → gets B's IPFS metadata
5. **B signs a message** with its agent wallet → sends to A
6. **A verifies** `ecrecover(message, signature) == getAgentWallet(B.agentId)`
7. **Trust established** ✅ — cryptographic, no server, no gatekeeper

---

## Agent Setup Guide

How to make an actual AI agent use its assigned wallet to prove its identity.

### 1. Generate a Keypair for Your Agent

Any EVM wallet keypair works. Generate one:

```bash
# Using Foundry (cast)
cast wallet new

# Using Node.js
node -e "const w = require('ethers').Wallet.createRandom(); console.log('Address:', w.address); console.log('Private key:', w.privateKey);"
```

Output example:
```
Address: 0xAbC123...DeF456
Private key: 0x123abc...789def
```

### 2. Assign It via the dApp

1. Register your agent (Steps 1-5)
2. On the success screen, scroll to **Agent Wallet** → click **Assign Agent Wallet**
3. Paste the `0xAbC123...DeF456` address → click **Confirm**
4. MetaMask pops → sign the EIP-712 permit → confirm the tx

Chain now stores: `getAgentWallet(2) → 0xAbC123...DeF456`

### 3. Agent Boots With Its Private Key

Inside your agent's startup code:

```javascript
import { ethers } from 'ethers'

// The agent's assigned keypair (keep this secret!)
const AGENT_PRIVATE_KEY = '0x123abc...789def'
const agentWallet = new ethers.Wallet(AGENT_PRIVATE_KEY)
const AGENT_ID = 2 // your agent's ID from registration

// Optional: persist agent info as JSON config
const agentConfig = {
  agentId: AGENT_ID,
  registryAddress: '0xCd2A74Cff974B2B962A5AA46D3aBe3F7b137509D',
  rpcUrl: 'https://rpc.sepolia.mantle.xyz',
  walletAddress: agentWallet.address,
}
```

### 4. Agent Proves Its Identity (to Other Agents)

When another agent asks "who are you?", sign a message:

```javascript
/**
 * Generate an identity proof — signed payload proving
 * this agent controls its registered wallet.
 */
function createIdentityProof(agentWallet, agentId) {
  const payload = {
    agentId,
    action: 'identify',
    timestamp: Math.floor(Date.now() / 1000),
    nonce: ethers.hexlify(ethers.randomBytes(16)),
  }

  const message = JSON.stringify(payload)
  const signature = agentWallet.signMessageSync(message)

  return { payload, signature }
}

// Example usage
const proof = createIdentityProof(agentWallet, AGENT_ID)
// Send { payload, signature } to the verifier
```

### 5. Verifier Checks the Proof (Any Agent or dApp)

No server needed — pure on-chain lookup + signature recovery:

```javascript
import { ethers } from 'ethers'

const REGISTRY_ADDRESS = '0xCd2A74Cff974B2B962A5AA46D3aBe3F7b137509D'
const RPC_URL = 'https://rpc.sepolia.mantle.xyz'

const ABI = [
  'function ownerOf(uint256) view returns (address)',
  'function getAgentWallet(uint256) view returns (address)',
]

async function verifyAgentIdentity(proof) {
  const provider = new ethers.JsonRpcProvider(RPC_URL)
  const registry = new ethers.Contract(REGISTRY_ADDRESS, ABI, provider)

  const { payload, signature } = proof

  // 1. Recover the signer from the signature
  const message = JSON.stringify(payload)
  const signerAddr = ethers.verifyMessage(message, signature)

  // 2. Look up the assigned wallet on chain
  const registeredWallet = await registry.getAgentWallet(payload.agentId)

  // 3. Check owner of the agent
  const owner = await registry.ownerOf(payload.agentId)

  return {
    isValid: signerAddr.toLowerCase() === registeredWallet.toLowerCase(),
    agentId: payload.agentId,
    owner,
    agentWallet: registeredWallet,
    signer: signerAddr,
    message: payload,
  }
}

// Usage
const proof = getProofFromAgent() // received over the wire
const result = await verifyAgentIdentity(proof)

if (result.isValid) {
  console.log(`✅ Agent #${result.agentId} is real. Owner: ${result.owner}`)
} else {
  console.log('❌ Identity verification failed')
}
```

### 6. Trust Flow (Summary)

```
Agent B                          Verifier (Agent A or dApp)
─────────                        ──────────────────────────
                                 1. Asks B: "Identify yourself"
2. Signs payload with its
   assigned wallet private key
3. Sends { payload, signature }
                                 4. ecrecover(payload, signature) → signer
                                 5. getAgentWallet(B.agentId) → on-chain wallet
                                 6. signer == on-chain wallet? ✅ Trust
```

---

## How to Use

### Online Demo
👉 **[agent-persona-neon.vercel.app](https://agent-persona-neon.vercel.app)**

#### Register an Agent
1. Connect MetaMask (Mantle Sepolia network)
2. **Step 1:** Enter agent name + optional social links → click "Next — Sign"
3. **Step 2:** Review the message to sign → click "Sign with MetaMask" (free, no gas)
4. **Step 3-4:** Watch auto-progress: Upload to IPFS → Register on chain
5. **Step 5:** Done — agent ID, tx details, and reputation placeholder

#### Assign an Agent Wallet
After registration, scroll to the **Agent Wallet** section:
1. Click "Assign Agent Wallet"
2. Paste the agent's wallet address (`0x...`)
3. Click Confirm → MetaMask EIP-712 signature popup
4. Confirm the tx → wallet is linked to the agent

#### Verify an Agent
1. Switch to **"Verify Agent"** tab
2. Search **by name** (searches all agents) or **by agent ID** (direct lookup)
3. View owner, payment wallet, metadata, and ERC-8004 compliance info

### From the CLI

```bash
# Register an agent
cast send $REGISTRY "register(string)" "ipfs://your-metadata-cid" \
  --rpc-url https://rpc.sepolia.mantle.xyz \
  --private-key $KEY

# Look up agent owner
cast call $REGISTRY "ownerOf(uint256)(address)" 1 \
  --rpc-url https://rpc.sepolia.mantle.xyz

# Get agent metadata URI
cast call $REGISTRY "tokenURI(uint256)(string)" 1 \
  --rpc-url https://rpc.sepolia.mantle.xyz

# Check assigned agent wallet
cast call $REGISTRY "getAgentWallet(uint256)(address)" 1 \
  --rpc-url https://rpc.sepolia.mantle.xyz

# Total registered agents
cast call $REGISTRY "totalSupply()(uint256)" \
  --rpc-url https://rpc.sepolia.mantle.xyz

# Assign agent wallet (requires owner's EIP-712 signature)
# Use the frontend UI for this — it handles typed signing
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
| **Frontend** | React, Vite, Tailwind v4, Orbitron + JetBrains Mono |
| **Web3** | ethers.js v6, MetaMask, EIP-712 typed signing |
| **Storage** | IPFS via Pinata API (serverless upload function) |
| **Deployment** | Vercel (auto-deploy from GitHub master) |
| **Standard** | ERC-8004 (draft), ERC-721, EIP-712 |
| **Theme** | Mission-control aesthetic: pure black, spectral white, ghost borders |

---

## Project Structure

```
agent-persona/
├── src/                        # React frontend
│   ├── App.jsx                 # Main app with 5-step wizard + verify
│   ├── main.jsx                # Entry point
│   ├── index.css               # Tailwind v4 + mission-control theme
│   ├── lib/
│   │   ├── registry.js         # ethers.js contract interface + Pinata upload
│   │   └── contract-addresses.js
│   └── components/
│       ├── Landing.jsx         # Landing page (mobile responsive)
│       ├── Header.jsx          # Top bar (PR logo + network)
│       ├── WalletInfo.jsx      # Wallet connect/disconnect/chain info
│       └── StepIndicator.jsx   # 5-step wizard progress indicator
├── api/upload.js               # Vercel serverless: Pinata IPFS upload
├── vite-plugin-ipfs-upload.js  # Dev server Pinata upload plugin
├── vercel.json                 # Vercel deployment config
├── package.json                # Vite + React dependencies
├── contracts/                  # Contract sources (symlinked to src/)
│   └── IdentityRegistry.sol    # ERC-8004 compliant registry
├── scripts/
│   └── deploy_mantle_sepolia.js
├── foundry.toml
└── README.md
```

---

## Development

```bash
# Prerequisites
curl -L https://foundry.paradigm.xyz | bash

# Clone and build contracts
git clone <repo-url>
cd agent-persona
forge build

# Deploy (set PRIVATE_KEY env or .env)
forge create src/IdentityRegistry.sol:IdentityRegistry \
  --constructor-args "Agent Identity Registry" "AID" $DEPLOYER \
  --rpc-url https://rpc.sepolia.mantle.xyz \
  --private-key $PRIVATE_KEY \
  --broadcast

# Run frontend locally
npm install
npm run dev

# Build for production
npm run build

# Deploy to Vercel (connected to GitHub)
git push origin master
```

### Environment Variables

Set these in `.env` (local) and Vercel dashboard:

```
PINATA_JWT=your_pinata_jwt_token
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
