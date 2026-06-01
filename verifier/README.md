# Verifier library (JS)

This module exposes functions to:
- fetch persona CID from onchain registry (ethers)
- download metadata JSON from IPFS (dweb.link) or local placeholder
- verify EIP-712 signature against owner address

Usage:
const {verifyPersonaOnChain} = require('./index.js')
await verifyPersonaOnChain(rpcUrl, registryAddress, personaId)
