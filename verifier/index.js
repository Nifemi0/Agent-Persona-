const { ethers } = require('ethers');
const fetch = require('node-fetch');

async function fetchOnChainCID(rpcUrl, registryAddress, personaId){
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const abi = ["function getPersona(bytes32) view returns (address,string,uint64,bool)"];
  const c = new ethers.Contract(registryAddress, abi, provider);
  const res = await c.getPersona(personaId);
  return { owner: res[0], cid: res[1], timestamp: Number(res[2]), revoked: res[3] };
}

async function fetchMetadata(cid){
  if(cid.startsWith('local://')){
    return { local: true, cid };
  }
  const url = cid.replace('ipfs://', 'https://dweb.link/ipfs/');
  const resp = await fetch(url);
  if(!resp.ok) throw new Error('Failed to fetch metadata ' + resp.status);
  return await resp.json();
}

async function verifySignedPersona(signedPersona){
  const recovered = ethers.verifyTypedData(signedPersona.domain, signedPersona.types, signedPersona.message, signedPersona.signature);
  return recovered.toLowerCase() === signedPersona.owner.toLowerCase();
}

module.exports = { fetchOnChainCID, fetchMetadata, verifySignedPersona };
