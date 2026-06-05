import { ethers } from 'ethers'
import { CONTRACT_ADDRESSES, NETWORK } from './contract-addresses'

const REGISTRY_ABI = [
  // ERC-8004 registration
  'function register(string memory agentURI) external returns (uint256 agentId)',
  'function register(string memory agentURI, tuple(string metadataKey, bytes metadataValue)[] memory metadata) external returns (uint256 agentId)',
  'function register() external returns (uint256 agentId)',
  // ERC-721 standard
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function tokenURI(uint256 tokenId) external view returns (string)',
  'function balanceOf(address owner) external view returns (uint256)',
  // ERC-8004 metadata
  'function getMetadata(uint256 agentId, string memory metadataKey) external view returns (bytes memory)',
  'function setMetadata(uint256 agentId, string memory metadataKey, bytes memory metadataValue) external',
  // Agent wallet
  'function getAgentWallet(uint256 agentId) external view returns (address)',
  'function setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes memory signature) external',
  'function unsetAgentWallet(uint256 agentId) external',
  // Agent URI
  'function setAgentURI(uint256 agentId, string memory newURI) external',
  // Helpers
  'function totalSupply() external view returns (uint256)',
  'function agentRegistry(uint256 chainId) external view returns (string memory)',
  // Events (for parsing)
  'event Registered(uint256 indexed agentId, string agentURI, address indexed owner)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'event MetadataSet(uint256 indexed agentId, string indexed indexedMetadataKey, string metadataKey, bytes metadataValue)',
]

export async function getProvider() {
  if (!window.ethereum) throw new Error('MetaMask not installed')
  return new ethers.BrowserProvider(window.ethereum)
}

export async function connectWallet() {
  const provider = await getProvider()
  const accounts = await provider.send('eth_requestAccounts', [])
  return accounts[0]
}

function getRegistryContract(signerOrProvider) {
  return new ethers.Contract(CONTRACT_ADDRESSES.REGISTRY, REGISTRY_ABI, signerOrProvider)
}

/**
 * Get the agentRegistry string for the current network.
 * Format: "eip155:{chainId}:{contractAddress}"
 */
export function getAgentRegistry() {
  return `${NETWORK.NAMESPACE}:${NETWORK.CHAIN_ID}:${CONTRACT_ADDRESSES.REGISTRY}`
}

/**
 * Sign the persona name with the user's wallet (proves ownership).
 * Returns the signature.
 */
export async function signPersonaName(provider, name) {
  const signer = await provider.getSigner()
  return await signer.signMessage(name)
}

/**
 * Upload ERC-8004 metadata to IPFS via Pinata.
 * Returns { cid, gatewayUrl, metadata }.
 */
export async function uploadMetadata(name, address, signature, website, twitter, github) {
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      address,
      signature,
      description: `On-chain AI agent persona: ${name}`,
      website: website || '',
      twitter: twitter || '',
      github: github || '',
    }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Upload failed')
  }
  return await res.json()
}

/**
 * Register on chain using ERC-8004 register(string agentURI).
 * Returns { agentId, txHash, blockNumber, receipt, agentRegistry }.
 */
export async function registerOnChain(signer, cid) {
  const agentURI = `ipfs://${cid}`
  const contract = getRegistryContract(signer)
  const tx = await contract["register(string)"](agentURI)
  const receipt = await tx.wait()

  // Parse the Registered event to get agentId
  const registeredLog = receipt.logs.find((log) => {
    try {
      const parsed = contract.interface.parseLog({ topics: log.topics, data: log.data })
      return parsed && parsed.name === 'Registered'
    } catch { return false }
  })
  const agentId = registeredLog ? Number(registeredLog.args[0]) : null

  return {
    agentId,
    agentURI,
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    receipt,
    agentRegistry: getAgentRegistry(),
  }
}

/**
 * ONE-CLICK create: sign → upload to IPFS (ERC-8004 metadata) → register on chain.
 * Uses the new ERC-8004 register(string agentURI) interface.
 */
export async function createPersona(name, website, twitter, github) {
  const provider = await getProvider()
  const accounts = await provider.send('eth_requestAccounts', [])
  const address = accounts[0]

  // 1. Sign the persona name (proves wallet ownership)
  const signer = await provider.getSigner()
  const signature = await signer.signMessage(name)

  // 2. Upload ERC-8004 compliant metadata to IPFS
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      address,
      signature,
      description: `On-chain AI agent persona: ${name}`,
      website: website || '',
      twitter: twitter || '',
      github: github || '',
    }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Upload failed')
  }
  const upload = await res.json()

  // 3. Register on chain using ERC-8004 register(string agentURI)
  const agentURI = `ipfs://${upload.cid}`
  const contract = getRegistryContract(signer)
  const tx = await contract["register(string)"](agentURI)
  const receipt = await tx.wait()

  // 4. Parse the Registered event to get agentId
  const registeredLog = receipt.logs.find((log) => {
    try {
      const parsed = contract.interface.parseLog({ topics: log.topics, data: log.data })
      return parsed && parsed.name === 'Registered'
    } catch { return false }
  })
  const agentId = registeredLog ? Number(registeredLog.args[0]) : null

  return {
    agentId,
    cid: upload.cid,
    agentURI,
    signature,
    address,
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    ipfsGatewayUrl: upload.gatewayUrl,
    metadata: upload.metadata,
    agentRegistry: getAgentRegistry(),
  }
}

/**
 * Verify an agent by name — fetches all agents from the registry and finds a match.
 * Since ERC-8004 uses incremental tokenIds, we search by checking metadata JSON.
 * More efficient: look up by agentId if known.
 */
export async function verifyByAgentId(agentId) {
  const provider = await getProvider()
  const contract = getRegistryContract(provider)

  const [owner, agentURI] = await Promise.all([
    contract.ownerOf(agentId).catch(() => null),
    contract.tokenURI(agentId).catch(() => null),
  ])

  if (!owner || owner === ethers.ZeroAddress) {
    return { exists: false }
  }

  const wallet = await contract.getAgentWallet(agentId)

  // Fetch and parse metadata from IPFS
  let metadata = null
  if (agentURI && agentURI.startsWith('ipfs://')) {
    const cid = agentURI.replace('ipfs://', '')
    try {
      const metaRes = await fetch(`https://ipfs.io/ipfs/${cid}`)
      if (metaRes.ok) {
        metadata = await metaRes.json()
      }
    } catch { /* ignore — metadata fetch is best-effort */ }
  }

  return {
    exists: true,
    agentId: Number(agentId),
    owner,
    agentURI,
    wallet,
    metadata,
    agentRegistry: getAgentRegistry(),
  }
}

/**
 * Look up an agent by name — requires searching if we don't know the agentId.
 * We iterate through totalSupply to find a name match in metadata.
 */
export async function verifyByName(name) {
  const provider = await getProvider()
  const contract = getRegistryContract(provider)

  const total = await contract.totalSupply()
  const normalizedName = name.trim().toLowerCase()

  for (let i = 1; i <= Number(total); i++) {
    try {
      const uri = await contract.tokenURI(i)
      if (!uri || !uri.startsWith('ipfs://')) continue

      const cid = uri.replace('ipfs://', '')
      const metaRes = await fetch(`https://ipfs.io/ipfs/${cid}`)
      if (!metaRes.ok) continue

      const metadata = await metaRes.json()
      if (metadata.name && metadata.name.toLowerCase() === normalizedName) {
        const owner = await contract.ownerOf(i)
        const wallet = await contract.getAgentWallet(i)

        return {
          exists: true,
          agentId: i,
          owner,
          agentURI: uri,
          wallet,
          metadata,
          name: metadata.name,
          agentRegistry: getAgentRegistry(),
        }
      }
    } catch { continue }
  }

  return { exists: false, agentId: null }
}

export function formatAddress(addr) {
  if (!addr) return ''
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function formatTimestamp(ts) {
  if (!ts || ts === 0) return 'N/A'
  return new Date(ts * 1000).toLocaleString()
}
