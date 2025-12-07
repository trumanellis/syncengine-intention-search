#!/usr/bin/env node

/**
 * libp2p WebSocket Relay Node
 *
 * Provides circuit relay service for browser P2P connections.
 * Browsers connect via WebSocket and can relay data through this node.
 */

import { createLibp2p } from 'libp2p';
import { webSockets } from '@libp2p/websockets';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { identify } from '@libp2p/identify';
import { circuitRelayServer } from '@libp2p/circuit-relay-v2';
import { tcp } from '@libp2p/tcp';
import { peerIdFromPrivateKey } from '@libp2p/peer-id';
import { generateKeyPair, privateKeyFromRaw } from '@libp2p/crypto/keys';
import fs from 'fs/promises';
import { existsSync } from 'fs';

// Configuration from environment variables
const WS_PORT = process.env.WS_PORT || 9090;
const TCP_PORT = process.env.TCP_PORT || 9091;
const HOST = process.env.HOST || '0.0.0.0';
const PEER_ID_FILE = process.env.PEER_ID_FILE || './peer-id.json';

/**
 * Load or create a persistent peer ID
 * Saves to peer-id.json so the same ID is used across restarts
 */
async function loadOrCreatePeerId() {
  try {
    // Try to load existing peer ID
    if (existsSync(PEER_ID_FILE)) {
      console.log('📂 Loading existing peer ID from:', PEER_ID_FILE);
      const data = await fs.readFile(PEER_ID_FILE, 'utf8');
      const peerIdJSON = JSON.parse(data);

      console.log('🔍 DEBUG: Loaded JSON peer ID:', peerIdJSON.id);

      // For Ed25519, load the raw bytes and reconstruct the complete key
      const privKeyBytes = Buffer.from(peerIdJSON.privKey, 'base64');
      const pubKeyBytes = Buffer.from(peerIdJSON.pubKey, 'base64');

      console.log('🔍 DEBUG: Private key bytes length:', privKeyBytes.length);
      console.log('🔍 DEBUG: Public key bytes length:', pubKeyBytes.length);

      // For Ed25519: privateKey.raw returns 64 bytes (32 private + 32 public concatenated)
      // Use privateKeyFromRaw to import the complete key
      const privateKey = privateKeyFromRaw(new Uint8Array(privKeyBytes));

      console.log('🔍 DEBUG: Reconstructed private key type:', privateKey.type);
      console.log('🔍 DEBUG: Private key has publicKey:', !!privateKey.publicKey);

      // Create PeerId from private key (libp2p v2.x API)
      const peerId = peerIdFromPrivateKey(privateKey);
      console.log('✅ Loaded peer ID:', peerId.toString());
      console.log('🔍 DEBUG: Peer ID matches file?', peerId.toString() === peerIdJSON.id);
      return peerId;
    }
  } catch (error) {
    console.warn('⚠️  Failed to load peer ID, creating new one:', error.message);
    console.error('🔍 DEBUG: Full error:', error);
  }

  // Create new Ed25519 key pair
  console.log('🆕 Creating new peer ID...');
  const privateKey = await generateKeyPair('Ed25519');
  const peerId = peerIdFromPrivateKey(privateKey);

  console.log('🔍 DEBUG: Generated key properties:', Object.keys(privateKey));
  console.log('🔍 DEBUG: Private key type:', privateKey.type);
  console.log('🔍 DEBUG: Has public?:', !!privateKey.public);
  console.log('🔍 DEBUG: Has publicKey?:', !!privateKey.publicKey);

  // Save it for future use
  try {
    // For Ed25519, get the raw bytes
    const privKeyBytes = privateKey.raw;

    // Get public key bytes - check if it's .public or .publicKey
    const pubKey = privateKey.public || privateKey.publicKey;
    if (!pubKey) {
      throw new Error('Cannot access public key from private key');
    }
    const pubKeyBytes = pubKey.raw;

    const peerIdJSON = {
      id: peerId.toString(),
      privKey: Buffer.from(privKeyBytes).toString('base64'),
      pubKey: Buffer.from(pubKeyBytes).toString('base64'),
      type: 'Ed25519'
    };
    await fs.writeFile(PEER_ID_FILE, JSON.stringify(peerIdJSON, null, 2));
    console.log('💾 Saved peer ID to:', PEER_ID_FILE);
    console.log('✅ Peer ID will remain stable across restarts');
  } catch (error) {
    console.warn('⚠️  Failed to save peer ID:', error.message);
  }

  return peerId;
}

async function main() {
  console.log('🚀 Starting libp2p WebSocket Relay Node...\n');

  // Load or create persistent peer ID
  const peerId = await loadOrCreatePeerId();

  console.log('🔍 DEBUG: About to pass peer ID to createLibp2p:', peerId.toString());
  console.log('🔍 DEBUG: Peer ID type:', peerId.type);

  // Create libp2p node with relay server capabilities
  const node = await createLibp2p({
    peerId, // Use persistent peer ID
    addresses: {
      listen: [
        // WebSocket for browser connections
        `/ip4/${HOST}/tcp/${WS_PORT}/ws`,
        // TCP for Node.js peers (optional)
        `/ip4/${HOST}/tcp/${TCP_PORT}`,
      ],
    },
    transports: [
      webSockets(), // Required for browser connections
      tcp(), // Optional: allows Node.js peers to connect
    ],
    connectionEncryption: [noise()],
    streamMuxers: [yamux()],
    services: {
      identify: identify(),
      // Enable circuit relay server - allows browsers to relay through us
      relay: circuitRelayServer({
        reservations: {
          maxReservations: 100, // Allow up to 100 simultaneous reservations
          reservationClearInterval: 300, // Clean up old reservations every 5 minutes
          applyDefaultLimit: true, // Apply bandwidth/duration limits
        },
      }),
    },
    connectionManager: {
      minConnections: 0,
      maxConnections: 200, // Allow many browser connections
    },
  });

  // Start the node
  await node.start();

  console.log('✅ Relay node started successfully!\n');
  console.log('🔍 DEBUG: Node peer ID after start:', node.peerId.toString());
  console.log('🔍 DEBUG: Peer IDs match?', node.peerId.toString() === peerId.toString());
  console.log('📋 Connection Information:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Peer ID: ${node.peerId.toString()}`);
  console.log('\n🌐 Listen Addresses:');

  const multiaddrs = node.getMultiaddrs();
  multiaddrs.forEach((ma) => {
    const addr = ma.toString();
    console.log(`  ${addr}`);

    // Show browser-compatible address format
    if (addr.includes('/ws')) {
      console.log(`  👆 Use this address in browser app (WebSocket)`);
    }
  });

  console.log('\n📝 Add to your browser app (src/lib/libp2p.js):');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Generate bootstrap config for browser app
  const wsAddr = multiaddrs.find(ma => ma.toString().includes('/ws'));
  if (wsAddr) {
    console.log(`\nbootstrap: bootstrap({`);
    console.log(`  list: [`);
    console.log(`    '${wsAddr.toString()}'`);
    console.log(`  ]`);
    console.log(`})`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💡 Tip: If using a domain name, replace IP with your domain');
  console.log('    Example: /dns4/relay.yourdomain.com/tcp/9090/ws/p2p/...');
  console.log('\n🔄 Relay server is now accepting connections...\n');
  console.log('📊 Verbose logging enabled - will show all connection attempts\n');

  // Connection lifecycle events
  node.addEventListener('peer:connect', (event) => {
    const peerId = event.detail.toString();
    console.log(`\n🤝 PEER CONNECTED: ${peerId}`);
    console.log(`   Total peers: ${node.getPeers().length}`);
  });

  node.addEventListener('peer:disconnect', (event) => {
    const peerId = event.detail.toString();
    console.log(`\n👋 PEER DISCONNECTED: ${peerId}`);
    console.log(`   Total peers: ${node.getPeers().length}`);
  });

  node.addEventListener('peer:discovery', (event) => {
    const peerId = event.detail.id.toString();
    console.log(`\n🔍 PEER DISCOVERED: ${peerId.substring(0, 20)}...`);
  });

  // Connection events
  node.addEventListener('connection:open', (event) => {
    console.log(`\n🔌 CONNECTION OPENED:`);
    console.log(`   Remote peer: ${event.detail.remotePeer.toString().substring(0, 20)}...`);
    console.log(`   Direction: ${event.detail.direction}`);
  });

  node.addEventListener('connection:close', (event) => {
    console.log(`\n🔌 CONNECTION CLOSED:`);
    console.log(`   Remote peer: ${event.detail.remotePeer.toString().substring(0, 20)}...`);
  });

  // Transport events (to see WebSocket connections)
  node.addEventListener('transport:listening', (event) => {
    console.log(`\n🎧 TRANSPORT LISTENING: ${event.detail.toString()}`);
  });

  // Relay-specific events (may not exist, will fail silently if not)
  node.addEventListener('relay:reservation:complete', (event) => {
    console.log(`\n🔗 RELAY RESERVATION COMPLETE`);
  });

  node.addEventListener('relay:advert:success', (event) => {
    console.log(`\n📢 RELAY ADVERTISEMENT SUCCESS`);
  });

  // Error handling
  node.addEventListener('error', (event) => {
    console.error(`\n❌ NODE ERROR:`, event.detail);
  });

  // Periodic status updates every 10 seconds
  setInterval(() => {
    const peers = node.getPeers();
    const connections = node.getConnections();
    if (peers.length > 0 || connections.length > 0) {
      console.log(`\n📊 STATUS UPDATE:`);
      console.log(`   Connected peers: ${peers.length}`);
      console.log(`   Active connections: ${connections.length}`);
      if (peers.length > 0) {
        console.log(`   Peer IDs: ${peers.map(p => p.toString().substring(0, 12)).join(', ')}`);
      }
    }
  }, 10000);

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Shutting down relay node...');
    await node.stop();
    console.log('✅ Relay node stopped');
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n\n🛑 Shutting down relay node...');
    await node.stop();
    console.log('✅ Relay node stopped');
    process.exit(0);
  });
}

// Run the relay node
main().catch((error) => {
  console.error('❌ Failed to start relay node:', error);
  process.exit(1);
});
