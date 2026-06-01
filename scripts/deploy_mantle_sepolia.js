#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

const repoRoot = path.resolve(__dirname, '..');
const outDir = path.join(repoRoot, 'out');

function findArtifact(name) {
  if (!fs.existsSync(outDir)) throw new Error('out/ directory not found; run forge build from project root');
  const walk = (dir) => {
    let res = [];
    for (const e of fs.readdirSync(dir)) {
      const full = path.join(dir, e);
      if (fs.statSync(full).isDirectory()) res = res.concat(walk(full));
      else if (e.endsWith('.json')) res.push(full);
    }
    return res;
  };
  const files = walk(outDir);
  for (const f of files) {
    try {
      const data = JSON.parse(fs.readFileSync(f, 'utf8'));
      if (data.contractName === name || path.basename(f).toLowerCase().includes(name.toLowerCase())) return data;
    } catch (e) { /* ignore */ }
  }
  throw new Error('artifact ' + name + ' not found in ' + outDir + ' (searched ' + files.length + ' files)');
}

async function main() {
  const rpc = process.env.RPC_URL || 'http://127.0.0.1:8545';
  const pk = process.env.PRIVATE_KEY;
  if (!pk) throw new Error('Set PRIVATE_KEY env var');

  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(pk, provider);

  console.log('Reading artifacts from', outDir);
  const art = findArtifact('IdentityRegistry');

  console.log('Deploying IdentityRegistry...');
  const Factory = new ethers.ContractFactory(art.abi, art.bytecode, wallet);
  const reg = await Factory.deploy('Agent Identity Registry', 'AID', wallet.address);
  await reg.waitForDeployment();
  const regAddr = reg.target;
  console.log('Deployed IdentityRegistry:', regAddr);

  // Verify on-chain state
  const chainId = (await provider.getNetwork()).chainId;
  console.log('Chain ID:', chainId);
  console.log('agentRegistry:', await reg.agentRegistry(Number(chainId)));

  const out = {
    registryAddress: regAddr,
    chainId: Number(chainId),
    deployTx: reg.deploymentTransaction().hash,
    agentRegistry: `eip155:${Number(chainId)}:${regAddr}`,
  };

  const outPath = path.join(repoRoot, 'out', 'last_run.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log('Wrote deploy info to', outPath);
  console.log('Done');
}

main().catch(e => { console.error('ERR', e); process.exit(1) });
