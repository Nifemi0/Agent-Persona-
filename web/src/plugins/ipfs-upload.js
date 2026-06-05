/**
 * Vite plugin that adds an `/api/upload` endpoint for IPFS uploads via Pinata.
 * Accepts POST with JSON body, uploads to Pinata, returns CID.
 * ERC-8004 compliant registration metadata.
 *
 * @param {string} pinataJwt - Pinata JWT for authentication
 */
export function ipfsUploadPlugin(pinataJwt = '') {
  const PINATA_JWT = pinataJwt

  return {
    name: 'ipfs-upload',
    configureServer(server) {
      server.middlewares.use('/api/upload', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        let body = ''
        req.on('data', (chunk) => { body += chunk })
        req.on('end', async () => {
          try {
            const data = JSON.parse(body)

            if (!data.name || !data.address) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Missing required fields: name, address' }))
              return
            }

            // Build ERC-8004 compliant registration file
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

            // Upload to Pinata via JSON pinning endpoint
            const pinResponse = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${PINATA_JWT}`,
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

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
              success: true,
              cid,
              ipfsUrl: `ipfs://${cid}`,
              gatewayUrl: `https://gateway.pinata.cloud/ipfs/${cid}`,
              metadata,
            }))
          } catch (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
              error: err.message || 'Upload failed',
            }))
          }
        })
      })
    },
  }
}
