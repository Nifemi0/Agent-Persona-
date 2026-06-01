const solc = require('solc');
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

function compileContract(srcPath, contractName){
  const source = fs.readFileSync(srcPath,'utf8');
  const input = {
    language: 'Solidity',
    sources: { [path.basename(srcPath)]: { content: source } },
    settings: { outputSelection: { '*': { '*': ['abi','evm.bytecode.object'] } } }
  };
  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  if(out.errors){
    out.errors.forEach(e=>console.error(e.formattedMessage || e.message));
  }
  const data = out.contracts[path.basename(srcPath)][contractName];
  return { abi: data.abi, bytecode: '0x'+data.evm.bytecode.object };
}

async function main(){
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  let wallet;
  if(process.env.FUND_NEW === '1'){
    // create a fresh wallet and fund it from an unlocked anvil account (index 0)
    const newWallet = ethers.Wallet.createRandom();
    console.log('Created fresh wallet', newWallet.address);
    const accounts = await provider.send('eth_accounts', []);
    const funderAddr = accounts[0];
    const txHash = await provider.send('eth_sendTransaction', [{ from: funderAddr, to: newWallet.address, value: '0xde0b6b3a7640000' }]);
    console.log('Funded new wallet, tx hash:', txHash);
    // no need to wait: anvil mines instantly; but call getTransactionReceipt to ensure it's mined
    const receipt = await provider.getTransactionReceipt(txHash);
    if(!receipt) console.log('Warning: no receipt found immediately — proceeding anyway');
    wallet = new ethers.Wallet(newWallet.privateKey, provider);
  } else {
    const pk = process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
    wallet = new ethers.Wallet(pk, provider);
  }
  console.log('Compiling contracts via solc-js...')
  const reg = compileContract('contracts/PersonaRegistry.sol','PersonaRegistry');
  const sbt = compileContract('contracts/PersonaSBT.sol','PersonaSBT');
  console.log('Deploying via ethers...');
  console.log('Wallet address:', wallet.address);
  const beforeNonce = await provider.getTransactionCount(wallet.address, 'pending');
  console.log('nonce before deploy (pending):', beforeNonce);

  const RegFactory = new ethers.ContractFactory(reg.abi, reg.bytecode, wallet);
  const regc = await RegFactory.deploy();
  console.log('deploy tx submitted for Registry');
  await regc.waitForDeployment();
  console.log('Reg at', regc.target);

  const midNonce = await provider.getTransactionCount(wallet.address, 'pending');
  console.log('nonce after registry deploy (pending):', midNonce);

  const SbtFactory = new ethers.ContractFactory(sbt.abi, sbt.bytecode, wallet);
  const sbtc = await SbtFactory.deploy(regc.target);
  console.log('deploy tx submitted for SBT');
  await sbtc.waitForDeployment();
  console.log('SBT at', sbtc.target);

  const afterNonce = await provider.getTransactionCount(wallet.address, 'pending');
  console.log('nonce after sbt deploy (pending):', afterNonce);

  // read signed persona
  const sp = JSON.parse(fs.readFileSync('offchain/cli/signed_persona.json','utf8'));
  if(process.env.USE_RPC === '1'){
    // Send the registerPersona call via the node RPC using an unlocked account to avoid local nonce issues
    const accounts = await provider.send('eth_accounts', []);
    if(!accounts || accounts.length===0) throw new Error('No unlocked accounts available');
    const caller = accounts[0];
    console.log('Using unlocked account for register:', caller);
    const iface = new ethers.Interface(reg.abi);
    const data = iface.encodeFunctionData('registerPersona',[sp.personaId, sp.metadataCID]);
    console.log('Encoded register call, sending via eth_sendTransaction...');
    const txHash = await provider.send('eth_sendTransaction', [{ from: caller, to: regc.target, data, gas: '0x1e8480' }]);
    console.log('rpc txHash:', txHash);
    const receipt = await provider.getTransactionReceipt(txHash);
    console.log('rpc receipt txHash:', receipt ? receipt.transactionHash : 'no receipt');
  } else {
    try{
      console.log('Attempting registerPersona without setting explicit nonce (let ethers manage sequence)');
      const tx = await regc.registerPersona(sp.personaId, sp.metadataCID, { gasLimit: 2_000_000 });
      const r = await tx.wait();
      console.log('Registered, tx:', r.transactionHash);
    }catch(err){
      console.error('Register error:', err);
      throw err;
    }
  }
}

main().catch(e=>{console.error(e); process.exit(1)})
