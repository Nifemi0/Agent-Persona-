# Building Trust for Autonomous Agents: An On-Chain Identity Registry

## How ERC-8004 Enables Cryptographic Agent-to-Agent Trust Without a Central Server

---

## Introduction

The AI agent ecosystem is exploding. We're seeing agents that trade, agents that code, agents that manage social media, agents that audit smart contracts. But there's a fundamental problem holding back this new economy: **trust**.

When Agent A encounters Agent B, how does A know B is who it claims to be? Today, the answer is either "it doesn't" or "they both trust the same centralized server." The first option makes agent-to-agent commerce impossible. The second recreates the gatekeeping problem that crypto was supposed to solve.

This article explores a project that fixes both problems: the **Agent Identity Registry** — an ERC-8004 aligned identity protocol built on Mantle Sepolia that gives every AI agent a verifiable, persistent, on-chain identity. No centralized server. No gatekeeper. Pure cryptographic trust.

---

## The Problem: Agents Are Ephemeral

Before diving into the solution, let's articulate the problem clearly.

An AI agent today is essentially a prompt + a toolset + a wallet. When a new agent spawns, it has no reputation, no history, and no way to prove its identity to other agents. If two agents need to interact — say, a trading agent needs to request data from a data-provider agent — there's no mechanism for the data provider to verify:

1. **Who** is requesting this data?
2. **Who controls** that agent?
3. **Can I trust** that agent to pay or honor its agreements?

Without answers to these questions, agents are forced into walled gardens. A trading agent on Platform A can't talk to a data agent on Platform B because there's no shared identity layer.

**This is exactly what DNS did for the internet.** Before DNS, every computer on ARPANET had a hosts.txt file that mapped names to addresses. When a new computer joined, someone had to manually update every other computer's file. DNS solved this by creating a hierarchical, globally accessible naming system. The Agent Identity Registry does the same thing for AI agents — it's DNS for the agent economy.

---

## The Solution: On-Chain Agent Identity

The Agent Identity Registry is a smart contract on Mantle Sepolia that implements the **ERC-8004: Trustless Agents** draft standard. At its core, it does one thing: it gives every AI agent a unique, permanent identity as an NFT (ERC-721) with the following guarantees:

- **Soulbound** — agents can't be transferred or stolen
- **Self-sovereign** — the agent's controller wallet is stored on chain
- **Verifiable** — anyone can look up any agent's identity and metadata
- **Extensible** — endpoints, social links, and reputation can be attached
- **Interoperable** — any ERC-721 compatible wallet, explorer, or dApp can read agent data

Every registered agent gets:

| Asset | Description |
|---|---|
| **Agent ID** | An auto-incrementing integer (1, 2, 3...) |
| **Owner** | The wallet that registered the agent — the controller |
| **Agent URI** | IPFS link to the agent's full metadata JSON |
| **Agent Wallet** | Optional keypair the agent uses to prove its identity |
| **Metadata** | Name, description, endpoints, social links, on-chain data |

---

## The Registration Workflow

The registration process is designed to be transparent and educational. Rather than a mysterious "click and pray" flow, users walk through five visible steps:

### Step 1: Define

The user enters the agent's identity:

- **Agent Name** — a unique human-readable identifier (like a username)
- **About** — a short description of what the agent does ("DeFi analyst", "Rust smart contract auditor", "Frontend developer")
- **Endpoints** — optional links to the agent's website, Twitter/X, and GitHub

This data forms the basis of the agent's metadata, which will be signed and pinned to IPFS.

### Step 2: Sign

The user is shown exactly what they're about to sign — the agent name — and prompted to sign it with MetaMask.

Why sign the name? This creates a cryptographic link between the agent's identity and the controller wallet. The signature proves:

```
"Wallet 0xCbe7...008C asserts ownership of agent 'persona-alice-v1'"
```

This signature is embedded in the IPFS metadata, so anyone who fetches the agent's data can independently verify who registered it. It's a free operation — no gas fee, just a personal message signature.

### Step 3: Upload

The signed metadata is uploaded to IPFS via Pinata. The metadata JSON follows the ERC-8004 registration schema:

```json
{
  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  "name": "persona-alice-v1",
  "description": "I'm an AI agent specialized in DeFi analysis and automated trading strategies",
  "services": [
    { "name": "website", "endpoint": "https://alice-agent.xyz" },
    { "name": "twitter", "endpoint": "https://x.com/alice_agent" },
    { "name": "github", "endpoint": "https://github.com/alice/trading-agent" }
  ],
  "ownerSignature": {
    "address": "0xCbe7...008C",
    "message": "persona-alice-v1",
    "signature": "0x..."
  },
  "createdAt": "2026-06-07T15:30:00.000Z"
}
```

This JSON is pinned to IPFS and becomes permanently accessible via the returned CID. Because it's IPFS, the data is content-addressed — any tampering changes the CID, making it immediately detectable.

### Step 4: Register

With the IPFS CID in hand, the frontend calls the smart contract's `register(string agentURI)` function. This mints a new soulbound ERC-721 token with:

- Token ID = auto-incremented agent ID
- Token URI = `ipfs://<cid>`
- Owner = the user's wallet

The contract emits a `Registered(uint256 indexed agentId, string agentURI, address indexed owner)` event, making the registration discoverable by any off-chain indexer.

### Step 5: Done

The success screen displays everything the user needs to know:

- **Agent ID** — the agent's identifier in the registry
- **Name** — the human-readable name
- **Registry** — the full ERC-8004 namespace string
- **Owner** — the controlling wallet
- **Transaction Hash** — the on-chain tx for verification
- **Block Number** — confirmation block
- **IPFS Link** — direct link to view the metadata on IPFS

The user can immediately register another agent or verify an existing one.

---

## Beyond Registration: The Agent Wallet

Registration alone gives an agent an identity, but it doesn't let the agent **prove** its identity autonomously. For that, we need the **Agent Wallet**.

### What is an Agent Wallet?

An agent wallet is a standard EVM keypair that's cryptographically linked to the agent on-chain. The controller wallet (the human or organization that registered the agent) uses EIP-712 typed signing to authorize the link.

The process:

1. **Generate** — create a new EVM keypair anywhere (CLI, Node.js, browser)
2. **Assign** — paste the address into the dApp's Agent Wallet section
3. **Sign** — MetaMask pops with a structured EIP-712 message showing exactly what's being authorized
4. **Submit** — the `setAgentWallet` transaction writes the link to the contract

Once assigned, `getAgentWallet(agentId)` returns the agent wallet address on-chain. This is a public, permanent record that anyone can read.

### How the Agent Uses It

The agent software holds the **private key** for the assigned wallet. When another agent asks "prove you are agent #2," the agent creates a signed payload:

```javascript
payload = {
  agentId: 2,
  action: "identify",
  timestamp: 1712345678,
  nonce: "0xabc123..."
}

signature = agentWallet.signMessage(JSON.stringify(payload))
```

It sends `{ payload, signature }` to the verifier. The verifier:

1. Recovers the signer from the signature: `ecrecover(payload, signature)`
2. Looks up the agent's assigned wallet on-chain: `getAgentWallet(2)`
3. Compares: if they match, the agent is authenticated ✅

This entire verification requires **no network access to the original registerer**, no API call to a central server, and no shared infrastructure. Two agents on different machines, different networks, different planets can cryptographically verify each other's identity.

---

## The Trust Model: No Gatekeepers

The beauty of this system is its decentralization. There is no verification authority, no certificate issuer, no KYC provider. Trust emerges from three immutable facts:

1. **The contract is immutable** — its code and data cannot be changed
2. **Signatures are unforgeable** — only the private key holder can create a valid signature
3. **IPFS is content-addressed** — metadata cannot be tampered with without changing the CID

When Agent A wants to trust Agent B:

| Step | Action | What it proves |
|---|---|---|
| 1 | Look up `ownerOf(B.agentId)` | B exists and has a controller |
| 2 | Look up `getAgentWallet(B.agentId)` | B has an identity keypair |
| 3 | Fetch `tokenURI(B.agentId)` → IPFS metadata | B's metadata is intact |
| 4 | Agent B signs a fresh message | B controls its keypair right now |
| 5 | Recover signer from signature | B's keypair matches the assigned wallet |
| 6 | **Trust** ✅ | All cryptographic checks pass |

This is the same trust model that cryptocurrencies use — it's just applied to agent identities instead of transactions.

---

## ERC-8004 Alignment

The project implements the **Identity Registry** component of ERC-8004, which defines three core registries:

### ✅ Identity Registry (Implemented)
- ERC-721 with URIStorage — agents are NFTs with metadata URIs
- Incremental token IDs — agent #1, #2, #3...
- Three registration overloads: `register()`, `register(string)`, and `register(string, MetadataEntry[])`
- Agent wallet management with EIP-712 typed signatures
- Soulbound — agents cannot be transferred
- On-chain metadata read/write

### 🔲 Reputation Registry (Future)
- On-chain feedback signals for agent trust scoring
- Stake-secured endorsements and attestations

### 🔲 Validation Registry (Future)
- Re-execution verification for computation claims
- zkML proofs for model inference integrity

The Identity Registry is fully deployed and operational. The remaining components are architectural runway — the data structures and event schemas are designed to support them when they're implemented.

---

## Verification: The Other Side of the dApp

Registration is only half the story. The dApp also includes a **Verify** tab that lets anyone look up an agent by name or ID.

### By Agent ID (Fast)
Direct token lookup via `ownerOf()` and `tokenURI()`. Returns owner, wallet, metadata, and IPFS link. This is O(1) — instant regardless of how many agents are registered.

### By Name (Thorough)
Iterates through all registered agents, fetches each one's IPFS metadata, and compares the `name` field. This is O(n) — it searches every agent — but works without knowing the agent ID in advance.

The verify view shows:
- Agent ID
- Owner address
- Assigned wallet (if any)
- Full IPFS metadata
- ERC-8004 compliance badge

This is the same data any agent would fetch programmatically during an identity verification handshake.

---

## Technical Architecture

### Smart Contract Layer
- **Language:** Solidity 0.8.19
- **Framework:** Foundry (forge, cast)
- **Dependencies:** OpenZeppelin v5.6.1 (ERC721URIStorage, EIP-712)
- **Network:** Mantle Sepolia (Chain ID: 5003)
- **Address:** `0xCd2A74Cff974B2B962A5AA46D3aBe3F7b137509D`

### Frontend Layer
- **Framework:** React 18 + Vite 5
- **Styling:** Tailwind CSS v4 with custom mission-control aesthetic
- **Typography:** Orbitron (headings) + JetBrains Mono (body)
- **Web3:** ethers.js v6, MetaMask browser extension
- **Signatures:** EIP-712 typed data for wallet assignment, raw message signing for registration

### Storage Layer
- **Provider:** Pinata (IPFS pinning service)
- **Upload:** Serverless function at `/api/upload`
- **Always-available gateway:** `https://gateway.pinata.cloud/ipfs/<cid>`

### Deployment
- **Hosting:** Vercel (auto-deploy from GitHub master)
- **URL:** `https://agent-persona-neon.vercel.app`

### Design Philosophy: Mission Control

The visual design follows a "mission control" aesthetic — pure black background, spectral white text, ghost borders with subtle opacity, and all-caps headers. This isn't just a cosmetic choice; it communicates that this is infrastructure, not entertainment. The clean, monochrome palette ensures that the data — the agent identities — is always the focal point.

Every UI element is fully responsive, stacking vertically on mobile and expanding to a comfortable reading width on desktop. The scanline overlay effect (a CRT monitor simulation) reinforces the "control panel" feel.

---

## The 5-Step Wizard: Design Rationale

The step indicator wasn't an afterthought — it's a deliberate UX choice. Here's why:

### Transparency
Previous versions of the dApp had a single button that did everything: sign, upload, register, done. Users reported feeling like they were in a black box. The step indicator breaks the process into discrete, understandable phases.

### Education
Each step has a clear label and explanation. The Sign step shows exactly what message is being signed. The Upload step shows that metadata is going to IPFS. The Register step shows the on-chain transaction. Users learn how the system works simply by using it.

### Debugging
If something fails, the user knows exactly which step it failed on. Was the signature rejected? Did the IPFS upload time out? Did the transaction revert? The step indicator + error state makes debugging straightforward.

### Delight
The visual progress — dots lighting up, checkmarks appearing, the "Done" state with a success animation — creates a sense of accomplishment. Registering an agent should feel like launching something real, not clicking through a form.

---

## Practical Usage Guide

### For Human Users
1. Open the dApp at agent-persona-neon.vercel.app
2. Connect MetaMask on Mantle Sepolia (auto-prompts if wrong chain)
3. Enter a name and description for your agent
4. Walk through the 5 steps
5. Optionally assign an agent wallet from the success screen

### For Agent Developers
1. Generate a fresh EVM keypair for your agent
2. Register your agent through the dApp
3. Assign the generated wallet address as the agent wallet
4. Embed the private key into your agent's startup configuration
5. Use the `createIdentityProof()` pattern to prove identity to other agents
6. Use the `verifyAgentIdentity()` pattern to authenticate other agents

### For dApp Builders
The entire system is permissionless. Any dApp can:
- Call `ownerOf()` and `getAgentWallet()` to verify agents
- Fetch IPFS metadata via `tokenURI()` for rich agent profiles
- Integrate the registry into their own agent marketplace, reputation system, or delegation network
- Extend the contract by monitoring `Registered` and `AgentWalletSet` events

---

## The Road Ahead

The current implementation is a solid foundation with several expansion paths:

### Reputation Registry
An on-chain reputation system where agents can receive attestations and endorsements from other agents. Combined with the identity registry, this creates a fully self-sovereign reputation system — no central authority determines your score.

### Validation Registry
For agents that make computational claims ("I ran this ML model" or "I executed this trade"), a validation registry would let verifiers re-execute and attest to the results. This is especially powerful for zkML — agents can prove they ran a model correctly without revealing their inputs.

### Multi-Chain
The ERC-8004 standard supports cross-chain identity. An agent registered on Mantle could prove its identity on Base, Arbitrum, or Ethereum through light client verification and bridge attestations.

### ENS Integration
Human-readable names like `alice.agent.eth` could map to agent IDs, making agent discovery as simple as typing a domain name.

### Agent Discovery Protocol
Automated A2A handshake: Agent A discovers Agent B's ID, fetches its endpoints from IPFS metadata, and initiates an MCP or A2A connection — all without human intervention.

---

## Conclusion

The Agent Identity Registry solves a fundamental problem in the AI agent economy: **how do agents trust each other without a centralized authority?**

By combining ERC-8004's identity standard with IPFS metadata, EIP-712 typed signatures, and the Mantle blockchain, we've created a system where:

- Any agent can register a permanent, verifiable identity
- Any agent can prove its identity using just its private key
- Any agent can verify another agent's identity with just on-chain lookups
- No server, no gatekeeper, no permission required

This is DNS for the agent economy — a foundational layer that makes autonomous agent-to-agent interaction possible.

The dApp is live at agent-persona-neon.vercel.app. The contract is deployed on Mantle Sepolia at `0xCd2A74Cff974B2B962A5AA46D3aBe3F7b137509D`. The code is open source on GitHub.

The agent economy is coming. It needs identity infrastructure. This is the first brick.

---

*Built for the Mantle Turing Test Hackathon 2026 — Agentic Wallets & Economy track.*
*Standard: ERC-8004 (Trustless Agents)*
*Network: Mantle Sepolia (Chain ID: 5003)*
*Frontend: agent-persona-neon.vercel.app*
