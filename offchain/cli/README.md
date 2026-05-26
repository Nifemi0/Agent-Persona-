# Offchain CLI

This folder will contain a Node.js CLI that:

- Builds a persona JSON following docs/persona.schema.json
- Signs the JSON using EIP-712 with the owner's wallet
- Pins the JSON to IPFS via web3.storage or nft.storage
- Outputs personaId (keccak of JSON) and CID

Next steps: scaffold with npm init and add scripts.