#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

const repoRoot = path.resolve(__dirname, '..');
const outDir = path.join(repoRoot, 'out');

function findArtifact(name){
  if(!fs.existsSync(outDir)) throw new Error('out/ directory not found; run forge build from project root');
  const walk = (dir)=>{
    let res = [];
    for(const e of fs.readdirSync(dir)){
      const full = path.join(dir,e);
      if(fs.statSync(full).isDirectory()) res = res.concat(walk(full));
      else if(e.endsWith('.json')) res.push(full);
    }
    return res;
  };
  const files = walk(outDir);
  for(const f of files){
    try{
      const data = JSON.parse(fs.readFileSync(f,'utf8'));
      if(data.contractName === name || path.basename(f).toLowerCase().includes(name.toLowerCase())) return data;
    }catch(e){/* ignore */}
  }
  throw new Error('artifact '+name+' not found in out/ (searched '+files.length+' files)');
}

async function main(){
  const rpc = process.env.RPC_URL || 'http://127.0.0.1:8545';
  const pk = process.env.PRIVATE_KEY;
  if(!pk) throw new Error('Set PRIVATE_KEY env var');

  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(pk, provider);

  console.log('Reading artifacts from', outDir);
  const regArt = findArtifact('PersonaRegistry');
  const sbtArt = findArtifact('PersonaSBT');

  console.log('Deploying PersonaRegistry...');
  const RegFactory = new ethers.ContractFactory(regArt.abi, regArt.bytecode, wallet);
  const reg = await RegFactory.deploy();
  await reg.waitForDeployment();
  console.log('Deployed PersonaRegistry:', reg.target);

  console.log('Deploying PersonaSBT with controller=', reg.target);
  const SbtFactory = new ethers.ContractFactory(sbtArt.abi, sbtArt.bytecode, wallet);
  const sbt = await SbtFactory.deploy(reg.target);
  await sbt.waitForDeployment();
  console.log('Deployed PersonaSBT:', sbt.target);

  // read signed persona
  const signedPath = path.join(repoRoot,'offchain','cli','signed_persona.json');
  if(!fs.existsSync(signedPath)) throw new Error('signed_persona.json not found; run CLI first');
  const signed = JSON.parse(fs.readFileSync(signedPath,'utf8'));
  const personaId = signed.personaId;
  const cid = signed.metadataCID;

  console.log('Registering personaId', personaId, cid);
  const tx = await reg.registerPersona(personaId, cid);
  const receipt = await tx.wait();
  console.log('Register tx:', receipt.transactionHash);

  console.log('Verifying onchain state...');
  const onchain = await reg.getPersona(personaId);
  console.log('Onchain persona:', onchain);

  // run verifier module
  const verifierPath = path.join(repoRoot,'verifier','index.js');
  if(fs.existsSync(verifierPath)){
    console.log('Running local verifier...');
    const verifier = require(verifierPath);
    const fetched = await verifier.fetchOnChainCID(rpc, reg.target, personaId);
    console.log('Verifier fetched:', fetched);
    const sigok = verifier.verifySignedPersona(signed);
    console.log('Verifier signature ok:', sigok);
  }

  console.log('Done');
}

main().catch(e=>{console.error('ERR',e); process.exit(1)});
