import { createOrbitDB, Identities, useIdentityProvider } from '@orbitdb/core';
import { createLibp2p } from 'libp2p';
import { createHelia } from 'helia';
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2';
import { webSockets } from '@libp2p/websockets';
import { webRTC } from '@libp2p/webrtc';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { identify } from '@libp2p/identify';
import { gossipsub } from '@chainsafe/libp2p-gossipsub';
import { pubsubPeerDiscovery } from '@libp2p/pubsub-peer-discovery';
import { bootstrap } from '@libp2p/bootstrap';
import { all } from '@libp2p/websockets/filters';
import { LevelBlockstore } from 'blockstore-level';
import { LevelDatastore } from 'datastore-level';
import { OrbitDBWebAuthnIdentityProviderFunction } from '@le-space/orbitdb-identity-provider-webauthn-did';
import { multiaddr } from '@multiformats/multiaddr';

/**
 * Creates a browser-compatible libp2p instance with optimal configuration
 * for WebRTC peer-to-peer connections in browsers.
 *
 * BROWSER LIMITATIONS:
 * - Cannot use TCP connections (raw sockets not available in browsers)
 * - Cannot resolve /dnsaddr/ multiaddrs (DNS resolution unavailable)
 * - Must use WebRTC or WebSocket transports only
 *
 * CONNECTION STRATEGY:
 * 1. Connect to relay node via WebSocket (bootstrap)
 * 2. Get circuit relay reservation → generates shareable multiaddrs
 * 3. Share multiaddrs via magic links for direct WebRTC connections
 * 4. Discover additional peers via pubsub after first connection
 *
 * RELAY NODE SETUP REQUIRED:
 * You MUST run a relay node and configure the bootstrap address below.
 * See relay-node/README.md for deployment instructions.
 */
export async function createLibp2pInstance() {
  return await createLibp2p({
    addresses: {
      listen: [
        '/webrtc', // WebRTC for direct browser-to-browser connections
        '/p2p-circuit', // Accept circuit relay connections through other peers
      ],
    },
    transports: [
      webSockets({
        filter: all, // Accept all WebSocket connections (secure and insecure)
      }),
      webRTC({
        rtcConfiguration: {
          // Enhanced STUN servers for better NAT traversal
          iceServers: [
            // Google STUN servers
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            // Twilio STUN server
            { urls: 'stun:global.stun.twilio.com:3478' },
            // Mozilla STUN server
            { urls: 'stun:stun.services.mozilla.com' },
          ],
        },
      }),
      circuitRelayTransport({
        discoverRelays: 3, // Try to find up to 3 relay peers
        maxReservations: 2, // Allow 2 concurrent relay reservations
      }),
    ],
    connectionEncryption: [noise()],
    streamMuxers: [yamux()],
    services: {
      identify: identify(),
      pubsub: gossipsub({
        emitSelf: true, // Enable to see our own messages
        allowPublishToZeroTopicPeers: true, // Allow publishing even without peers
        // Gossipsub is used for OrbitDB sync and peer discovery
      }),
      pubsubPeerDiscovery: pubsubPeerDiscovery({
        interval: 1000, // Check for new peers every second
        topics: ['_peer-discovery._p2p._pubsub'], // Standard peer discovery topic
        listenOnly: false, // Actively broadcast our presence to discovered peers
        // This enables peer discovery AFTER initial connection via magic link
      }),
      // Bootstrap connects to relay node to get circuit relay reservation
      bootstrap: bootstrap({
        list: [
          '/ip4/127.0.0.1/tcp/9090/ws/p2p/12D3KooWGw4CCVzeiCWAUcSq9otR3EzuVgNFXsV3DxqfZtTtgc5A',
        ],
        timeout: 5000,
      }),
    },
    connectionManager: {
      maxConnections: 20,
      minConnections: 1,
    },
  });
}

/**
 * Creates a Helia IPFS instance with persistent Level storage
 * @param {Libp2p} libp2p - The libp2p instance to use
 */
export async function createHeliaInstance(libp2p) {
  return await createHelia({
    libp2p,
    blockstore: new LevelBlockstore('syncengine/blocks'),
    datastore: new LevelDatastore('syncengine/data'),
  });
}

/**
 * Registers the WebAuthn identity provider with OrbitDB
 */
export function registerWebAuthnProvider() {
  useIdentityProvider(OrbitDBWebAuthnIdentityProviderFunction);
}

/**
 * Creates an OrbitDB identities instance
 */
export async function createIdentitiesInstance() {
  return await Identities();
}

/**
 * Creates a WebAuthn identity using the provided credential
 * @param {Object} identities - The OrbitDB identities instance
 * @param {Object} credential - The WebAuthn credential
 */
export async function createWebAuthnIdentity(identities, credential) {
  return await identities.createIdentity({
    provider: OrbitDBWebAuthnIdentityProviderFunction({
      webauthnCredential: credential,
    }),
  });
}

/**
 * Creates an OrbitDB instance with WebAuthn identity
 * @param {Object} ipfs - The Helia IPFS instance
 * @param {Object} identities - The OrbitDB identities instance
 * @param {Object} identity - The WebAuthn identity
 */
export async function createOrbitDBInstance(ipfs, identities, identity) {
  return await createOrbitDB({
    ipfs,
    identities,
    identity,
  });
}

/**
 * Complete OrbitDB setup with WebAuthn authentication
 * @param {Object} credential - The WebAuthn credential
 * @returns {Object} Contains orbitdb, ipfs, identity, and identities instances
 */
export async function setupOrbitDB(credential) {
  // Create libp2p instance
  const libp2p = await createLibp2pInstance();

  // Create Helia instance
  const ipfs = await createHeliaInstance(libp2p);

  // Register WebAuthn provider
  registerWebAuthnProvider();

  // Create identities instance with IPFS for proper storage
  const identities = await Identities({ ipfs });

  // Create WebAuthn identity
  const identity = await createWebAuthnIdentity(identities, credential);
  
  console.log('🔍 Created WebAuthn identity:', {
    id: identity.id,
    type: identity.type,
    hash: identity.hash
  });
  
  // Try to verify our identity is in the identities store
  try {
    const storedIdentity = await identities.getIdentity(identity.hash);
    console.log('✅ Identity found in identities store:', !!storedIdentity);
    if (storedIdentity) {
      console.log('📊 Stored identity details:', {
        id: storedIdentity.id,
        type: storedIdentity.type
      });
    }
  } catch (error) {
    console.warn('⚠️ Could not retrieve identity from store:', error.message);
  }

  // Create OrbitDB instance
  const orbitdb = await createOrbitDBInstance(ipfs, identities, identity);

  // Log browser P2P configuration
  console.log('🌐 Browser P2P Mode: WebSocket Relay + WebRTC');
  console.log('📡 Connection strategy:');
  console.log('   1. Connect to relay node via WebSocket (bootstrap)');
  console.log('   2. Get circuit relay reservation → generate multiaddrs');
  console.log('   3. Share multiaddrs via magic links for direct WebRTC');
  console.log('   4. Discover additional peers via pubsub');
  console.log('⚠️  Relay node required - see relay-node/README.md');

  // === DEBUG: Bootstrap and Transport Monitoring ===
  console.log('🔍 DEBUG: Setting up connection monitoring...');

  // Bootstrap service logging
  const bootstrapAddrs = [
    '/ip4/127.0.0.1/tcp/9090/ws/p2p/12D3KooWGamK1sguRvGdKCyaDK71LsifahZDsfmMoK3evHvkNBiE',
  ];
  console.log('📋 Bootstrap configured with addresses:', bootstrapAddrs);

  // Set up libp2p event listeners for peer monitoring
  libp2p.addEventListener('peer:connect', (event) => {
    const peerId = event.detail.toString();
    console.log('🤝 Peer connected:', peerId);
    // Check if it's the relay
    if (peerId === '12D3KooWGamK1sguRvGdKCyaDK71LsifahZDsfmMoK3evHvkNBiE') {
      console.log('   ✅ This is the RELAY NODE!');
    }
  });

  libp2p.addEventListener('peer:disconnect', (event) => {
    console.log('👋 Peer disconnected:', event.detail.toString());
  });

  libp2p.addEventListener('peer:discovery', (event) => {
    const peerId = event.detail.id.toString();
    console.log('🔍 Peer discovered via pubsub:', peerId.substring(0, 20) + '...');
    // Check if it's the relay
    if (peerId === '12D3KooWGamK1sguRvGdKCyaDK71LsifahZDsfmMoK3evHvkNBiE') {
      console.log('   ⚠️ Discovered RELAY via pubsub (should connect via bootstrap!)');
    }
  });

  // Connection events
  libp2p.addEventListener('connection:open', (event) => {
    console.log('🔌 Connection opened:', {
      peer: event.detail.remotePeer.toString().substring(0, 20) + '...',
      direction: event.detail.direction,
      status: event.detail.status
    });
  });

  libp2p.addEventListener('connection:close', (event) => {
    console.log('🔌 Connection closed:', event.detail.remotePeer.toString().substring(0, 20) + '...');
  });

  // Transport events
  libp2p.addEventListener('transport:listening', (event) => {
    console.log('🎧 Transport listening:', event.detail.toString());
  });

  // Peer identification
  libp2p.addEventListener('peer:identify', (event) => {
    console.log('🆔 Peer identified:', event.detail.peerId.toString().substring(0, 20) + '...', {
      protocols: event.detail.protocols?.slice(0, 5),
      listenAddrs: event.detail.listenAddrs?.slice(0, 3).map(a => a.toString())
    });
  });

  // Error events
  libp2p.addEventListener('error', (event) => {
    console.error('❌ libp2p error:', event.detail);
  });

  // Log initial state
  const peers = libp2p.getPeers();
  const multiaddrs = libp2p.getMultiaddrs();
  console.log('👥 Initial connected peers:', peers.length);
  console.log('📍 Initial multiaddrs:', multiaddrs.length, multiaddrs.map(ma => ma.toString()));

  if (peers.length > 0) {
    console.log('   Peer IDs:', peers.map(p => p.toString().substring(0, 20) + '...'));
  }

  // Try to manually dial the relay after a short delay to test connectivity
  setTimeout(async () => {
    console.log('🔧 DEBUG: Attempting manual dial to relay...');
    try {
      const relayAddrStr = '/ip4/127.0.0.1/tcp/9090/ws/p2p/12D3KooWGamK1sguRvGdKCyaDK71LsifahZDsfmMoK3evHvkNBiE';
      console.log('   Target:', relayAddrStr);

      // Parse string to Multiaddr object
      const relayAddr = multiaddr(relayAddrStr);
      console.log('   Parsed multiaddr:', relayAddr.toString());

      const connection = await libp2p.dial(relayAddr);
      console.log('✅ Manual dial succeeded!', {
        peer: connection.remotePeer.toString(),
        status: connection.status,
        direction: connection.direction
      });
      console.log('   🎉 WebSocket transport is WORKING!');
      console.log('   ⚠️  This means bootstrap service is NOT dialing automatically');
    } catch (error) {
      console.error('❌ Manual dial failed:', error.message);
      console.error('   Error code:', error.code);
      console.error('   Full error:', error);
      console.error('   ⚠️  WebSocket connection is blocked or relay is not running');
    }
  }, 3000);

  return {
    orbitdb,
    ipfs,
    identity,
    identities,
    libp2p,
  };
}

/**
 * Cleanup function to properly shut down all instances
 * @param {Object} instances - Object containing orbitdb, ipfs instances
 */
export async function cleanup({ orbitdb, ipfs, database = null }) {
  try {
    if (database) {
      await database.close();
    }

    if (orbitdb) {
      await orbitdb.stop();
    }

    if (ipfs) {
      await ipfs.stop();
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
    // Continue with cleanup even if some operations fail
  }
}

/**
 * Reset database state by clearing IndexedDB
 */
export async function resetDatabaseState() {
  try {
    console.log('🗑️ Clearing IndexedDB...');
    if ('databases' in indexedDB) {
      const databases = await indexedDB.databases();
      for (const db of databases) {
        if (
          db.name.includes('orbitdb') ||
          db.name.includes('helia') ||
          db.name.includes('webauthn')
        ) {
          console.log('🗑️ Deleting database:', db.name);
          indexedDB.deleteDatabase(db.name);
        }
      }
    }
  } catch (error) {
    console.error('Error clearing IndexedDB:', error);
    throw error;
  }
}
