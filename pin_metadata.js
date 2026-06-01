const fs = require('fs');
const { Web3Storage, File } = require('web3.storage');

if (!process.env.WEB3_STORAGE_TOKEN) {
  console.error('WEB3_STORAGE_TOKEN not set');
  process.exit(1);
}

async function main() {
  const client = new Web3Storage({ token: process.env.WEB3_STORAGE_TOKEN });
  const data = fs.readFileSync('offchain/cli/signed_persona.json');
  const file = new File([data], 'signed_persona.json', { type: 'application/json' });
  console.log('Uploading signed_persona.json to web3.storage...');
  const cid = await client.put([file], { wrapWithDirectory: false });
  console.log('Pinned. CID:', cid);
  console.log('IPFS URI for file: ipfs://' + cid);
}

main().catch(e => { console.error(e); process.exit(1); });
