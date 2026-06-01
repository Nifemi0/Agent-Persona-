import { execSync } from 'child_process'
import { writeFileSync, mkdtempSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

/**
 * Vite plugin that adds an `/api/upload` endpoint for IPFS uploads.
 * Accepts POST with JSON body, writes to temp file, runs `ipfs add`, returns CID.
 * Now builds ERC-8004 compliant registration metadata.
 */
export function ipfsUploadPlugin() {
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
        req.on('end', () => {
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

            // Write to temp file
            const tmpDir = mkdtempSync(join(tmpdir(), 'persona-'))
            const tmpFile = join(tmpDir, 'persona.json')
            writeFileSync(tmpFile, JSON.stringify(metadata, null, 2))

            // Upload to IPFS
            const result = execSync(`ipfs add "${tmpFile}" --quieter --pin`, {
              encoding: 'utf-8',
              timeout: 15000,
            }).trim()

            const cid = result.split('\n').pop()

            // Cleanup temp
            execSync(`rm -rf "${tmpDir}"`)

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
              success: true,
              cid,
              ipfsUrl: `ipfs://${cid}`,
              gatewayUrl: `https://ipfs.io/ipfs/${cid}`,
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
