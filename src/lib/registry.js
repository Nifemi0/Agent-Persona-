import { ethers } from 'ethers'
import { CONTRACT_ADDRESSES, NETWORK } from './contract-addresses'

const REGISTRY_ABI = [
  'function register(string memory agentURI) external returns (uint256 agentId)',
  'function register(string memory agentURI, tuple(string metadataKey, bytes metadataValue)[] memory metadata) external returns (uint256 agentId)',
  'function register() external returns (uint256 agentId)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function tokenURI(uint256 tokenId) external view returns (string)',
  'function balanceOf(address owner) external view returns (uint256)',
  'function getMetadata(uint256 agentId, string memory metadataKey) external view returns (bytes memory)',
  'function setMetadata(uint256 agentId, string memory metadataKey, bytes memory metadataValue) external',
  'function getAgentWallet(uint256 agentId) external view returns (address)',
  'function setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes memory signature) external',
  'function unsetAgentWallet(uint256 agentId) external',
  'function setAgentURI(uint256 agentId, string memory newURI) external',
  'function totalSupply() external view returns (uint256)',
  'function agentRegistry(uint256 chainId) external view returns (string memory)',
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

export function getAgentRegistry() {
  return `${NETWORK.NAMESPACE}:${NETWORK.CHAIN_ID}:${CONTRACT_ADDRESSES.REGISTRY}`
}

/**
 * Assign an agent wallet to an existing agent.
 * The agent wallet owner must sign the EIP-712 typed data granting consent.
 * The tx is submitted by the agent's owner via MetaMask.
 *
 * @param {number} agentId - the agent's ID
 * @param {string} newWallet - the address of the agent's keypair
 * @param {string} agentPrivateKey - the PRIVATE KEY of the agent wallet (to sign consent)
 * @returns {{ txHash, blockNumber }}
 */
export async function assignAgentWallet(agentId, newWallet, agentPrivateKey) {
  const provider = await getProvider()
  const signer = await provider.getSigner()
  const deadline = Math.floor(Date.now() / 1000) + 86400 // 24 hours

  // EIP-712 domain
  const domain = {
    name: 'IdentityRegistry',
    version: '1',
    chainId: NETWORK.CHAIN_ID,
    verifyingContract: CONTRACT_ADDRESSES.REGISTRY,
  }

  // The contract's type: SetAgentWallet(uint256 agentId,address newWallet,uint256 deadline)
  // IMPORTANT: the newWallet must sign this, not the owner.
  const types = {
    SetAgentWallet: [
      { name: 'agentId', type: 'uint256' },
      { name: 'newWallet', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
  }

  const value = { agentId, newWallet, deadline }

  // Sign with the AGENT wallet (the new keypair being assigned)
  const agentSigner = new ethers.Wallet(agentPrivateKey)
  const signature = await agentSigner.signTypedData(domain, types, value)

  // Submit on chain via the owner's MetaMask signer
  const contract = getRegistryContract(signer)
  const tx = await contract.setAgentWallet(agentId, newWallet, deadline, signature)
  const receipt = await tx.wait()

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
  }
}

export async function signPersonaName(provider, name) {
  const signer = await provider.getSigner()
  return await signer.signMessage(name)
}

export async function uploadMetadata(name, address, signature, website, twitter, github, bio) {
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      address,
      signature,
      description: bio || `On-chain AI agent persona: ${name}`,
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

export async function registerOnChain(signer, cid) {
  const agentURI = `ipfs://${cid}`
  const contract = getRegistryContract(signer)
  const tx = await contract["register(string)"](agentURI)
  const receipt = await tx.wait()

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

export async function createPersona(name, website, twitter, github) {
  const provider = await getProvider()
  const accounts = await provider.send('eth_requestAccounts', [])
  const address = accounts[0]
  const signer = await provider.getSigner()
  const signature = await signer.signMessage(name)

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

  const agentURI = `ipfs://${upload.cid}`
  const contract = getRegistryContract(signer)
  const tx = await contract["register(string)"](agentURI)
  const receipt = await tx.wait()

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

export async function verifyByAgentId(agentId) {
  const provider = await getProvider()
  const contract = getRegistryContract(provider)
  const [owner, agentURI] = await Promise.all([
    contract.ownerOf(agentId).catch(() => null),
    contract.tokenURI(agentId).catch(() => null),
  ])
  if (!owner || owner === ethers.ZeroAddress) return { exists: false }

  const wallet = await contract.getAgentWallet(agentId).catch(() => null)
  let metadata = null
  if (agentURI && agentURI.startsWith('ipfs://')) {
    const cid = agentURI.replace('ipfs://', '')
    try {
      const metaRes = await fetch(`https://ipfs.io/ipfs/${cid}`)
      if (metaRes.ok) metadata = await metaRes.json()
    } catch {}
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
        const wallet = await contract.getAgentWallet(i).catch(() => null)
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
