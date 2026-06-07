// Identity Registry contract address (Mantle Sepolia)
// Deployed: https://sepolia.mantlescan.xyz/address/0xCd2A74Cff974B2B962A5AA46D3aBe3F7b137509D

export const CONTRACT_ADDRESSES = {
  REGISTRY: '0xCd2A74Cff974B2B962A5AA46D3aBe3F7b137509D',
}

export const NETWORK = {
  NAME: 'Mantle Sepolia',
  CHAIN_ID: 5003,
  NAMESPACE: 'eip155',
  RPC_URL: 'https://mantle-sepolia.g.alchemy.com/v2/ZETFuZOXiKo3Rg4GKKAyZ',
  RPC_URLS: [
    'https://mantle-sepolia.g.alchemy.com/v2/ZETFuZOXiKo3Rg4GKKAyZ',
    'https://rpc.sepolia.mantle.xyz',
    'https://mantle-sepolia.drpc.org',
    'https://5003.rpc.thirdweb.com',
  ],
  EXPLORER: 'https://sepolia.mantlescan.xyz',
}

// Read-only provider using the primary RPC (doesn't require MetaMask)
let _readOnlyProviderInit = null
export async function getReadOnlyProvider() {
  if (!_readOnlyProviderInit) {
    const { ethers } = await import('ethers')
    _readOnlyProviderInit = new ethers.JsonRpcProvider(NETWORK.RPC_URL, NETWORK.CHAIN_ID, {
      staticNetwork: true,
    })
  }
  return _readOnlyProviderInit
}

// Prompt MetaMask to switch to Mantle Sepolia with Alchemy RPC
export async function switchToMantle() {
  if (!window.ethereum) return false
  try {
    // Try switching first
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x138B' }], // 5003 in hex
    })
    return true
  } catch (e) {
    // 4902 = chain not added yet
    if (e.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x138B',
            chainName: NETWORK.NAME,
            rpcUrls: NETWORK.RPC_URLS,
            nativeCurrency: { name: 'MNT', symbol: 'MNT', decimals: 18 },
            blockExplorerUrls: [NETWORK.EXPLORER],
          }],
        })
        return true
      } catch (addError) {
        console.error('Failed to add Mantle Sepolia:', addError)
        return false
      }
    }
    return false
  }
}
