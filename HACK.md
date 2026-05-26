Mantle Persona Registry — Hackathon Plan

Overview
- Project: Mantle Persona Registry (on‑chain persona provenance for AI agents)
- Goal: provide a minimal, auditable on‑chain registry + offchain signed metadata (EIP‑712) + verifier tools and a small dashboard. Demo: register a persona, sign a message during chat, verify in UI.
- Primary track: AI DevTools (recommended). Secondary: Agentic Wallets & Economy.

High-level deliverables
1. PersonaRegistry.sol (Solidity): lightweight register/update/revoke + events
2. Persona CLI: build persona JSON, EIP‑712 sign, pin to IPFS, return personaHash/CID
3. Verifier library (JS): fetch on‑chain CID, fetch JSON, verify EIP‑712 signature, surface badges
4. Next.js Dashboard: create/register persona, show verified badge, attestations UI
5. Example integration: demo script where an agent signs a message and the verifier checks it

Tech stack
- Smart contracts: Solidity (Foundry / forge preferred), PersonaRegistry.sol (minimal onchain storage: personaHash + cid)
- Offchain: Node.js (ethers.js) for CLI and verifier
- IPFS: pinning via web3.storage or nft.storage (or local IPFS for demo)
- UI: Next.js + Tailwind (simple dashboard + verifier page)
- Tests: Foundry / forge for contract unit tests; JS mocha/ts for verifier tests
- Optional: Persona SBT (ERC‑721/4671 SBT pattern) for reputation badges

Repository structure (created)
- hacks/mantle-persona-registry/
  - HACK.md (this file)
  - contracts/PersonaRegistry.sol
  - offchain/cli/README.md
  - verifier/README.md
  - web/dashboard/README.md
  - docs/persona.schema.json
  - scripts/register_example.py
  - .gitignore

Milestones (design-stage)
1. Finalize JSON schema + EIP‑712 domain (this repo: docs/)
2. Implement PersonaRegistry.sol (contracts/) + unit tests (Foundry)
3. Implement CLI (offchain/cli) that signs JSON and pins to IPFS
4. Implement verifier lib (verifier/) and simple Next.js UI (web/dashboard)
5. Demo script: register persona, have agent sign a chat message, verify badge in UI

Next steps (immediately)
- Review this HACK.md and confirm structure.
- I will scaffold the contract skeleton, schema, CLI example, and verifier README (done).

Paths created
- /home/ubuntu/.hermes/hermes-agent/hacks/mantle-persona-registry/
- See files listed under "Repository structure" above.

If this looks good reply "Proceed" and I will:
- Add a Foundry project scaffold under contracts/
- Implement PersonaRegistry.sol minimal functions + events
- Add a basic Next.js dashboard skeleton in web/dashboard/

If you want any different folder names or additional subfolders, tell me now.