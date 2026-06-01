#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORKDIR="$ROOT"
ANVIL_LOG="$ROOT/out/anvil.log"
ANVIL_PORT=8545
RPC_URL="http://127.0.0.1:$ANVIL_PORT"

# Note: this script uses local:// placeholder CIDs by default (no external pinning).
# To enable real IPFS pinning, export WEB3_STORAGE_TOKEN in your shell before running.
# To sign/register onchain, export PRIVATE_KEY. If PRIVATE_KEY is unset, the CLI will
# generate an ephemeral key and the onchain register step will be skipped (since no key).

echo "== Integration runner: Persona Registry end-to-end (local placeholders) =="
mkdir -p "$ROOT/out"

# Start anvil in background if not already running
if ! nc -z 127.0.0.1 $ANVIL_PORT 2>/dev/null; then
  echo "Starting anvil on port $ANVIL_PORT... (logs: $ANVIL_LOG)"
  /home/ubuntu/.foundry/bin/anvil --port $ANVIL_PORT >"$ANVIL_LOG" 2>&1 &
  ANVIL_PID=$!
  echo "anvil pid=$ANVIL_PID"
  # wait for RPC
  for i in {1..30}; do
    if curl -sS $RPC_URL >/dev/null 2>&1; then
      break
    fi
    sleep 0.5
  done
else
  echo "Anvil already running on $RPC_URL"
fi

# Compile
cd "$WORKDIR"
/home/ubuntu/.foundry/bin/forge build

# Deploy contracts using forge script (requires PRIVATE_KEY env)
if [ -z "${PRIVATE_KEY-}" ]; then
  echo "PRIVATE_KEY not set. Skipping on-chain deployment and register steps."
  echo "You can set PRIVATE_KEY=0x... and re-run this script to perform onchain steps."
else
  echo "Deploying PersonaRegistry and PersonaSBT to $RPC_URL"
  # Deploy PersonaRegistry
  REG_ADDR=$(/home/ubuntu/.foundry/bin/forge create --rpc-url $RPC_URL --private-key $PRIVATE_KEY --legacy contracts/PersonaRegistry.sol:PersonaRegistry | tr -d '\r' | tail -n1 | awk '{print $NF}') || true
  if [ -z "$REG_ADDR" ]; then
    echo "Could not parse deploy address for PersonaRegistry. Check forge output in console above.";
  else
    echo "PersonaRegistry deployed at: $REG_ADDR"
    export VERIFYING_CONTRACT=$REG_ADDR
  fi
  # Deploy PersonaSBT with controller = registry (if registry deployed)
  if [ -n "${REG_ADDR-}" ]; then
    SBT_ADDR=$(/home/ubuntu/.foundry/bin/forge create --rpc-url $RPC_URL --private-key $PRIVATE_KEY --legacy contracts/PersonaSBT.sol:PersonaSBT --constructor-args "$REG_ADDR" | tr -d '\r' | tail -n1 | awk '{print $NF}') || true
    echo "PersonaSBT deployed at: $SBT_ADDR"
  fi
fi

# Build & sign persona using CLI (will produce offchain/cli/signed_persona.json)
cd "$WORKDIR/offchain/cli"
node index.js sample_persona.json

SIGNED_PATH="$WORKDIR/offchain/cli/signed_persona.json"
if [ ! -f "$SIGNED_PATH" ]; then
  echo "Signed persona not found at $SIGNED_PATH"
  exit 1
fi

# If we have a PRIVATE_KEY and a deployed registry, register the persona onchain
if [ -n "${PRIVATE_KEY-}" ] && [ -n "${VERIFYING_CONTRACT-}" ]; then
  echo "Registering persona onchain..."
  PERSONA_ID=$(node -e "console.log(require('./signed_persona.json').personaId)")
  METADATA_CID=$(node -e "console.log(require('./signed_persona.json').metadataCID)")
  echo "personaId=$PERSONA_ID metadataCID=$METADATA_CID"
  # Use cast to call registerPersona(bytes32,string)
  /home/ubuntu/.foundry/bin/cast send $VERIFYING_CONTRACT "registerPersona(bytes32,string)" $PERSONA_ID "$METADATA_CID" --private-key $PRIVATE_KEY --rpc-url $RPC_URL
  echo "Register tx sent. Sleeping 1s to allow chain to include tx..."
  sleep 1
else
  echo "On-chain registration skipped (PRIVATE_KEY or VERIFYING_CONTRACT missing)."
fi

# Run verifier against signed_persona.json
cd "$WORKDIR/verifier"
node verify.js

# Summarize
echo "Integration run complete. Artifacts:" 
echo "- signed persona: $SIGNED_PATH"
[ -n "${REG_ADDR-}" ] && echo "- registry: $REG_ADDR"
[ -n "${SBT_ADDR-}" ] && echo "- sbt: $SBT_ADDR"

echo "Logs: $WORKDIR/out"

# If we started anvil, leave it running but print PID
if [ -n "${ANVIL_PID-}" ]; then
  echo "Anvil started by script with pid $ANVIL_PID (left running)."
fi
