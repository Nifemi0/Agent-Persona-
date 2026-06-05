/**
 * Vercel serverless function for IPFS upload via Pinata.
 * POST /api/upload with JSON body { name, address, ... }
 */
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const data = req.body

    if (!data.name || !data.address) {
      res.status(400).json({ error: 'Missing required fields: name, address' })
      return
    }

    // Build ERC-8004 compliant registration metadata
    const services = []
    if (data.website) services.push({ name: 'website', endpoint: data.website })
    if (data.twitter) services.push({ name: 'twitter', endpoint: `https://x.com/${data.twitter.replace('@', '')}` })
    if (data.github) services.push({ name: 'github', endpoint: data.github })

    const metadata = {
      type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
      name: data.name,
      description: data.description || `On-chain agent persona: ${data.name}`,
      image: '',
      services,
      x402Support: false,
      active: true,
      registrations: [],
      supportedTrust: [],
      ownerSignature: {
        address: data.address,
        message: data.name,
        signature: data.signature || null,
      },
      createdAt: new Date().toISOString(),
    }

    const JWT = process.env.PINATA_JWT
    if (!JWT) {
      res.status(500).json({ error: 'Pinata JWT not configured' })
      return
    }

    // Upload to Pinata
    const pinResponse = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JWT}`,
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: {
          name: `persona-${data.name}-${data.address.slice(0, 8)}.json`,
        },
      }),
    })

    if (!pinResponse.ok) {
      const errText = await pinResponse.text()
      throw new Error(`Pinata upload failed (${pinResponse.status}): ${errText}`)
    }

    const result = await pinResponse.json()
    const cid = result.IpfsHash

    res.status(200).json({
      success: true,
      cid,
      ipfsUrl: `ipfs://${cid}`,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${cid}`,
      metadata,
    })
  } catch (err) {
    res.status(500).json({
      error: err.message || 'Upload failed',
    })
  }
}
