#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

async function main(){
  const inPath = path.join(__dirname, '../offchain/cli/signed_persona.json');
  if(!fs.existsSync(inPath)) return console.error('signed_persona.json not found');
  const signed = JSON.parse(fs.readFileSync(inPath,'utf8'));
  const { owner, signature, domain, types, message } = signed;
  try{
    const recovered = ethers.verifyTypedData(domain, types, message, signature);
    console.log('Recovered address:', recovered);
    console.log('Owner address    :', owner);
    if(recovered.toLowerCase() === owner.toLowerCase()){
      console.log('VERIFIED: signature matches owner');
      process.exit(0);
    } else {
      console.error('MISMATCH: signature does not match owner');
      process.exit(3);
    }
  } catch(e){
    console.error('Verification failed:', e.message || e);
    process.exit(1);
  }
}

main();
