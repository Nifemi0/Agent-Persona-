#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');
let Web3Storage;
let FileCls;
try {
  const wb = require('web3.storage');
  Web3Storage = wb.Web3Storage;
  FileCls = wb.File;
} catch (e) {
  // web3.storage not installed — pinning will be skipped unless available
}

async function main(){
  const cwd = __dirname;
  const inPath = process.argv[2] || path.join(cwd, 'sample_persona.json');
  if(!fs.existsSync(inPath)){
    console.error('Input persona JSON not found at', inPath);
    process.exit(1);
  }
  const raw = fs.readFileSync(inPath, 'utf8');
  const metadata = JSON.parse(raw);
  const jsonStr = JSON.stringify(metadata);

  const personaId = ethers.keccak256(ethers.toUtf8Bytes(jsonStr));

  // owner wallet
  let wallet;
  let ephemeral = false;
  if(process.env.PRIVATE_KEY){
    wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
  } else {
    wallet = ethers.Wallet.createRandom();
    ephemeral = true;
    console.warn('No PRIVATE_KEY provided. Generated ephemeral key for demo. Address:', wallet.address);
    console.warn('Ephemeral private key (store if you want to reuse):', wallet.privateKey);
  }

  // Pin to IPFS via web3.storage if token is present and lib loaded
  let metadataCID = null;
  if(process.env.WEB3_STORAGE_TOKEN && Web3Storage){
    try {
      const client = new Web3Storage({ token: process.env.WEB3_STORAGE_TOKEN });
      const file = new FileCls([jsonStr], 'metadata.json', { type: 'application/json' });
      console.log('Uploading metadata to web3.storage...');
      const cid = await client.put([file]);
      metadataCID = 'ipfs://' + cid;
      console.log('Pinned to IPFS:', metadataCID);
    } catch (e) {
      console.error('IPFS pin failed:', e.message || e);
    }
  } else {
    console.log('WEB3_STORAGE_TOKEN or web3.storage not available — skipping pin.');
    // Use local pseudo-CID (keccak of content) so we have a stable reference
    const pseudo = ethers.keccak256(ethers.toUtf8Bytes(jsonStr));
    metadataCID = 'local://' + pseudo.slice(2, 18);
    console.log('Using local CID placeholder:', metadataCID);
  }

  // build EIP-712 typed data
  const domain = {
    name: 'MantlePersona',
    version: '1',
    chainId: Number(process.env.CHAIN_ID || 1),
    verifyingContract: process.env.VERIFYING_CONTRACT || ethers.ZeroAddress
  };
  const types = {
    Persona: [
      { name: 'personaId', type: 'bytes32' },
      { name: 'metadataCID', type: 'string' },
      { name: 'timestamp', type: 'uint256' },
      { name: 'nonce', type: 'uint256' }
    ]
  };
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = metadata.nonce ? Number(metadata.nonce) : 1;
  const message = {
    personaId: personaId,
    metadataCID: metadataCID,
    timestamp: timestamp,
    nonce: nonce
  };

  let signature;
  try {
    if(typeof wallet.signTypedData === 'function'){
      signature = await wallet.signTypedData(domain, types, message);
    } else if(typeof wallet._signTypedData === 'function'){
      signature = await wallet._signTypedData(domain, types, message);
    } else {
      // fallback: sign digest
      const digest = ethers.TypedDataEncoder.hash(domain, types, message);
      signature = await wallet.signMessage(ethers.hexlify(digest));
    }
  } catch (e) {
    console.error('Signing failed:', e.message || e);
    process.exit(1);
  }

  const out = {
    personaId: personaId,
    owner: wallet.address,
    metadataCID: metadataCID,
    signature: signature,
    domain, types, message,
    ephemeralKey: ephemeral ? wallet.privateKey : undefined
  };

  const outPath = path.join(cwd, 'signed_persona.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log('Wrote signed persona to', outPath);
  console.log('PersonaId:', personaId);
  console.log('Owner:', wallet.address);
  if(ephemeral) console.warn('WARNING: ephemeral key used — signature cannot be reproduced without the printed private key.');

  console.log('\nTo register onchain (example using cast):');
  console.log("cast send <REGISTRY_ADDRESS> 'registerPersona(bytes32,string)' " + personaId + " '" + metadataCID + "' --private-key <KEY> --rpc-url <RPC>\n");
}

main().catch(e=>{console.error(e); process.exit(1)});
