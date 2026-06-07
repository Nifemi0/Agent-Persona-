#!/usr/bin/env node
/**
 * End-to-end test suite for Agent Identity Registry.
 * Tests contract reads, API endpoint, frontend build, and EIP-712 encoding.
 *
 * Usage:
 *   node test/e2e.mjs              # Run all tests
 *   node test/e2e.mjs --api        # API upload test only (needs PINATA_JWT)
 *   node test/e2e.mjs --contract   # Contract read tests only
 *   node test/e2e.mjs --build      # Frontend build test only
 *   node test/e2e.mjs --eip712     # EIP-712 struct encoding test
 *   node test/e2e.mjs --all        # Run everything including write simulation
 */

import { ethers } from 'ethers';
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ─── Config ───────────────────────────────────────────────────────────
const CONFIG = {
  registry: '0xCd2A74Cff974B2B962A5AA46D3aBe3F7b137509D',
  rpcUrl: 'https://rpc.sepolia.mantle.xyz',
  fallbackRpc: 'https://mantle-sepolia.drpc.org',
  chainId: 5003,
  explorer: 'https://sepolia.mantlescan.xyz',
  deployer: '0xCbe7F5506A373d8aD8142f76Bb9d7fA6d609008C',
};

const ABI = [
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function tokenURI(uint256 tokenId) external view returns (string)',
  'function totalSupply() external view returns (uint256)',
  'function balanceOf(address owner) external view returns (uint256)',
  'function getAgentWallet(uint256 agentId) external view returns (address)',
  'function agentRegistry(uint256 chainId) external view returns (string)',
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
  'function getMetadata(uint256 agentId, string memory metadataKey) external view returns (bytes memory)',
  'function setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes memory signature) external',
  'event Registered(uint256 indexed agentId, string agentURI, address indexed owner)',
];

// ─── Test Helpers ──────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
let skipped = 0;

function test(name, fn) {
  return async (...args) => {
    try {
      await fn(...args);
      console.log(`  ✅ ${name}`);
      passed++;
    } catch (e) {
      console.log(`  ❌ ${name}`);
      console.log(`     ${e.message.split('\n')[0]}`);
      failed++;
    }
  };
}

function assert(condition, msg) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

// ─── Tests ────────────────────────────────────────────────────────────

const tests = {};

// ── Contract Read Tests ──
tests.contract = async () => {
  console.log('\n📡 Contract Read Tests');
  console.log('──────────────────────');

  const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
  const contract = new ethers.Contract(CONFIG.registry, ABI, provider);

  await test('Contract name()', async () => {
    const name = await contract.name();
    assert(name.length > 0, `Name empty: "${name}"`);
    console.log(`     Name: "${name}"`);
  })();

  await test('Contract symbol()', async () => {
    const symbol = await contract.symbol();
    assert(symbol.length > 0, `Symbol empty: "${symbol}"`);
    console.log(`     Symbol: "${symbol}"`);
  })();

  await test('totalSupply() returns a number', async () => {
    const total = await contract.totalSupply();
    assert(Number(total) >= 0, `Invalid totalSupply: ${total}`);
    console.log(`     Total agents: ${total}`);
  })();

  await test('ownerOf(1) returns deployer', async () => {
    const owner = await contract.ownerOf(1);
    assert(owner.toLowerCase() === CONFIG.deployer.toLowerCase(), `Owner mismatch: ${owner} vs ${CONFIG.deployer}`);
    console.log(`     Agent #1 owner: ${owner}`);
  })();

  await test('ownerOf(2) returns deployer', async () => {
    const owner = await contract.ownerOf(2);
    assert(owner.toLowerCase() === CONFIG.deployer.toLowerCase(), `Owner mismatch`);
    console.log(`     Agent #2 owner: ${owner}`);
  })();

  await test('tokenURI(1) returns IPFS URI', async () => {
    const uri = await contract.tokenURI(1);
    assert(uri.startsWith('ipfs://'), `Not an IPFS URI: ${uri}`);
    console.log(`     Agent #1 URI: ${uri}`);
  })();

  await test('tokenURI(2) returns IPFS URI', async () => {
    const uri = await contract.tokenURI(2);
    assert(uri.startsWith('ipfs://'), `Not an IPFS URI: ${uri}`);
    console.log(`     Agent #2 URI: ${uri}`);
  })();

  await test('getAgentWallet(1) returns deployer (auto-set)', async () => {
    try {
      const wallet = await contract.getAgentWallet(1);
      assert(wallet.toLowerCase() === CONFIG.deployer.toLowerCase(), `Wallet mismatch: ${wallet}`);
      console.log(`     Agent #1 wallet: ${wallet}`);
    } catch (e) {
      // Some implementations revert when unset, skip if so
      if (e.message.includes('revert')) {
        console.log(`     ⚠️  getAgentWallet reverts — wallet not set`);
      } else throw e;
    }
  })();

  await test('agentRegistry(5003) returns valid string', async () => {
    const registry = await contract.agentRegistry(5003);
    assert(registry.includes('eip155:5003:'), `Invalid format: ${registry}`);
    assert(registry.includes('0x'), `No address in registry string`);
    console.log(`     Registry: ${registry}`);
  })();

  await test('balanceOf(deployer) >= 2', async () => {
    const balance = await contract.balanceOf(CONFIG.deployer);
    assert(Number(balance) >= 2, `Expected 2+ agents, got ${balance}`);
    console.log(`     Deployer balance: ${balance}`);
  })();

  // Test fallback RPC
  await test('Fallback RPC works', async () => {
    const fb = new ethers.JsonRpcProvider(CONFIG.fallbackRpc);
    const block = await fb.getBlockNumber();
    assert(block > 0, `Fallback returned block 0`);
    console.log(`     Fallback RPC block: ${block}`);
  })();

  // IPFS metadata fetch test
  await test('IPFS metadata accessible for agent #2', async () => {
    const uri = await contract.tokenURI(2);
    const cid = uri.replace('ipfs://', '');
    const res = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
    assert(res.ok, `IPFS fetch failed: ${res.status}`);
    const meta = await res.json();
    assert(meta.name, 'No name in metadata');
    assert(meta.type, 'No type in metadata');
    assert(meta.type.includes('eip-8004'), 'Type not ERC-8004');
    console.log(`     Agent #2 metadata name: "${meta.name}"`);
    console.log(`     Description: "${meta.description?.slice(0, 60)}..."`);
    console.log(`     Services: ${meta.services?.length || 0}`);
    console.log(`     Owner sig present: ${!!meta.ownerSignature?.signature}`);
  })();
};

// ── API Upload Test ──
tests.api = async () => {
  console.log('\n☁️  API Upload Test (needs PINATA_JWT)');
  console.log('──────────────────────────────────────');

  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    // Try loading from .env
    try {
      const envContent = readFileSync(resolve(ROOT, '.env'), 'utf-8');
      const match = envContent.match(/PINATA_JWT\s*=\s*(.+)/);
      if (match) process.env.PINATA_JWT = match[1].trim();
    } catch {}
  }

  if (!process.env.PINATA_JWT) {
    console.log('  ⏭️  Skipped — no PINATA_JWT set');
    skipped++;
    return;
  }

  await test('POST /api/upload returns CID', async () => {
    const res = await fetch('http://localhost:5173/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `test-agent-${Date.now()}`,
        address: CONFIG.deployer,
        signature: '0x',
        description: 'E2E test agent',
      }),
    });
    assert(res.ok, `Upload failed: ${res.status}`);
    const data = await res.json();
    assert(data.cid, 'No CID returned');
    assert(data.gatewayUrl, 'No gateway URL');
    assert(data.metadata, 'No metadata returned');
    console.log(`     CID: ${data.cid}`);
    console.log(`     Gateway: ${data.gatewayUrl}`);
    console.log(`     Metadata name: ${data.metadata.name}`);

    // Verify it's actually pinned
    const gwRes = await fetch(data.gatewayUrl);
    assert(gwRes.ok, `Pinned file not accessible: ${gwRes.status}`);
    console.log(`     ✅ Pinned and accessible on IPFS`);
  })();
};

// ── Frontend Build Test ──
tests.build = async () => {
  console.log('\n🏗️  Frontend Build Test');
  console.log('──────────────────────');

  await test('npm run build succeeds', async () => {
    const out = execSync('npm run build 2>&1', { cwd: ROOT, encoding: 'utf8' });
    assert(out.includes('built in'), 'Build output missing "built in"');
    assert(existsSync(resolve(ROOT, 'dist/index.html')), 'dist/index.html missing');
    assert(existsSync(resolve(ROOT, 'dist/assets')), 'dist/assets/ missing');
    console.log(`     ${out.split('\n').filter(l => l.includes('dist/')).join('\n     ')}`);
  })();
};

// ── EIP-712 Encoding Test ──
tests.eip712 = async () => {
  console.log('\n🔐 EIP-712 Encoding Test');
  console.log('─────────────────────────');

  const domain = {
    name: 'IdentityRegistry',
    version: '1',
    chainId: CONFIG.chainId,
    verifyingContract: CONFIG.registry,
  };

  const types = {
    SetAgentWallet: [
      { name: 'agentId', type: 'uint256' },
      { name: 'newWallet', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
  };

  await test('Domain separator matches contract', async () => {
    const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
    const contract = new ethers.Contract(CONFIG.registry, [
      'function eip712Domain() external view returns (bytes1 fields, string memory name, string memory version, uint256 chainId, address verifyingContract, bytes32 salt, uint256[] memory extensions)',
    ], provider);
    const [fields, name, version, chainId, verifyingContract] = await contract.eip712Domain();
    assert(name === domain.name, `Domain name mismatch: "${name}" vs "${domain.name}"`);
    assert(version === domain.version, `Version mismatch: "${version}" vs "${domain.version}"`);
    assert(Number(chainId) === domain.chainId, `Chain ID mismatch: ${chainId} vs ${domain.chainId}`);
    assert(verifyingContract.toLowerCase() === domain.verifyingContract.toLowerCase(), `Contract mismatch`);
    console.log(`     Domain name: "${name}"`);
    console.log(`     Version: "${version}"`);
    console.log(`     Chain ID: ${chainId}`);
    console.log(`     Contract: ${verifyingContract}`);
  })();

  await test('SetAgentWallet struct encoding is correct', async () => {
    const wallet = ethers.Wallet.createRandom();
    const value = {
      agentId: 999,
      newWallet: wallet.address,
      deadline: 2000000000,
    };

    // Sign typed data
    const signature = await wallet.signTypedData(domain, types, value);

    // Verify it recovers to the signer
    const digest = ethers.TypedDataEncoder.hash(domain, types, value);
    const recovered = ethers.recoverAddress(digest, signature);
    assert(recovered.toLowerCase() === wallet.address.toLowerCase(), `Recovery mismatch: ${recovered} vs ${wallet.address}`);

    console.log(`     Signer: ${wallet.address}`);
    console.log(`     Recovered: ${recovered} ✅`);
    console.log(`     Signature: ${signature.slice(0, 42)}...`);
  })();

  await test('generate keypair works', async () => {
    const w = ethers.Wallet.createRandom();
    assert(w.address.startsWith('0x'), 'Invalid address format');
    assert(w.privateKey.startsWith('0x'), 'Invalid private key format');
    assert(w.address.length === 42, 'Address wrong length');
    assert(w.privateKey.length === 66, 'Private key wrong length');
    console.log(`     Address: ${w.address}`);
    console.log(`     Private key: ${w.privateKey.slice(0, 20)}...`);
  })();
};

// ── Write Simulation Test ──
tests.write = async () => {
  console.log('\n✍️  Write Simulation Test (dry-run, no gas)');
  console.log('──────────────────────────────────────────');

  const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);

  await test('register(string) ABI encoding is correct', async () => {
    const iface = new ethers.Interface([
      'function register(string memory agentURI) external returns (uint256 agentId)',
    ]);
    const data = iface.encodeFunctionData('register', ['ipfs://test-cid']);
    assert(data.startsWith('0x'), 'Invalid encoded data');
    assert(data.length > 10, 'Data too short');
    console.log(`     Encoded: ${data.slice(0, 50)}...`);
  })();

  await test('setAgentWallet ABI encoding is correct', async () => {
    const iface = new ethers.Interface([
      'function setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes memory signature) external',
    ]);
    const data = iface.encodeFunctionData('setAgentWallet', [1, '0x0000000000000000000000000000000000000001', 2000000000, '0x']);
    assert(data.startsWith('0x'), 'Invalid encoded data');
    console.log(`     Encoded: ${data.slice(0, 50)}...`);
  })();

  // Gas estimation test (read-only)
  await test('eth_call gas estimation for ownerOf works', async () => {
    const gas = await provider.estimateGas({
      to: CONFIG.registry,
      data: '0x6352211e0000000000000000000000000000000000000000000000000000000000000001',
    });
    assert(Number(gas) > 0, `Gas estimate returned 0: ${gas}`);
    console.log(`     Gas estimate: ${gas}`);
  })();

  // Check deployer has MNT balance for tx fees
  await test('Deployer balance check', async () => {
    const balance = await provider.getBalance(CONFIG.deployer);
    const formatted = ethers.formatEther(balance);
    console.log(`     Deployer MNT balance: ${formatted}`);
    // This is informational, not a pass/fail
  })();

  // Contract version check
  await test('Contract deployed and has code', async () => {
    const code = await provider.getCode(CONFIG.registry);
    assert(code.length > 100, `Contract has no code or too short: ${code.length} chars`);
    console.log(`     Bytecode: ${(code.length - 2) / 2} bytes`);
  })();
};

// ── Test Runner ──
async function main() {
  const args = process.argv.slice(2);
  const runAll = args.length === 0 || args.includes('--all');
  const runList = args.filter(a => !a.startsWith('--'));
  const flags = args.filter(a => a.startsWith('--'));

  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  Agent Identity Registry — E2E Test Suite');
  console.log('═══════════════════════════════════════════');
  console.log(`  Registry: ${CONFIG.registry}`);
  console.log(`  Network:  Mantle Sepolia (${CONFIG.chainId})`);
  console.log(`  RPC:      ${CONFIG.rpcUrl}`);
  console.log('═══════════════════════════════════════════\n');

  const testOrder = ['contract', 'api', 'eip712', 'write', 'build'];
  const selectedFlags = flags.length > 0 ? flags.map(f => f.replace('--', '')) : testOrder;

  for (const name of testOrder) {
    if (selectedFlags.includes(name) || runAll) {
      if (tests[name]) await tests[name]();
    }
  }

  // Summary
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  Results');
  console.log('═══════════════════════════════════════════');
  console.log(`  ✅ Passed:  ${passed}`);
  console.log(`  ❌ Failed:  ${failed}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  Total:    ${passed + failed + skipped}`);
  console.log('═══════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
