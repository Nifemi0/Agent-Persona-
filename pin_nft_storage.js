const fs = require('fs');
const { NFTStorage, File } = require('nft.storage');

if (!process.env.NFT_STORAGE_KEY) {
  console.error('NFT_STORAGE_KEY not set');
  process.exit(1);
}

async function main(){
  const client = new NFTStorage({ token: process.env.NFT_STORAGE_KEY });
  const buf = fs.readFileSync('offchain/cli/signed_persona.json');
  const file = new File([buf], 'signed_persona.json', { type: 'application/json' });
  console.log('Uploading signed_persona.json to nft.storage...');
  const cid = await client.storeBlob(file);
  console.log('Pinned. CID:', cid);
  console.log('IPFS URI:', 'ipfs://'+cid);
}

main().catch(e=>{ console.error(e); process.exit(1); });
