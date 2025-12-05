# OrbitDB Integration Guide for Intention Search

This guide shows how to integrate the Intention Search interface with OrbitDB for peer-to-peer synchronization.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser Application                       │
├─────────────────────────────────────────────────────────────┤
│  IntentionSearch.svelte                                     │
│  └─ intention-search-engine.js (Vector Search)              │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│  OrbitDB Layer                                              │
│  ├─ intentions-db (Documents DB)                            │
│  │  └─ Stores: Intention + embedding vector                 │
│  └─ attention-logs (EventLog per user)                      │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│  Helia (IPFS) + libp2p                                      │
│  └─ P2P networking, content addressing                      │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### Intentions Database (Documents)

```javascript
interface StoredIntention {
  // Core fields
  intentionId: string;
  title: string;
  description: string;
  location?: string;
  geo?: [number, number]; // [latitude, longitude]
  
  // Status
  status: 'active' | 'completed' | 'archived';
  createdBy: string; // User's PeerId
  createdAt: number; // Unix timestamp
  updatedAt: number;
  
  // Vector search
  embedding: number[]; // 384-dimensional vector from Transformers.js
  embeddedAt: number; // When embedding was computed
  
  // Metadata
  tags?: string[];
  category?: string;
}
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install @orbitdb/core @helia/unixfs helia libp2p
npm install @xenova/transformers # Vector search model
```

### 2. Initialize OrbitDB with Helia

```javascript
// lib/orbitdb-setup.js
import { createHelia } from 'helia';
import { createOrbitDB } from '@orbitdb/core';
import { createLibp2p } from 'libp2p';
import { webSockets } from '@libp2p/websockets';
import { webRTC } from '@libp2p/webrtc';
import { noise } from '@chainsafe/libp2p-noise';
import { gossipsub } from '@chainsafe/libp2p-gossipsub';
import { identify } from '@libp2p/identify';

export async function setupOrbitDB() {
  // Create libp2p node with WebRTC and WebSockets
  const libp2p = await createLibp2p({
    addresses: {
      listen: [
        '/webrtc',
        '/wss/relay.example.com/p2p/RELAY_PEER_ID'
      ]
    },
    transports: [webSockets(), webRTC()],
    connectionEncryption: [noise()],
    streamMuxers: [],
    services: {
      identify: identify(),
      pubsub: gossipsub({ emitSelf: true })
    }
  });

  // Create Helia (IPFS) instance
  const helia = await createHelia({ libp2p });

  // Create OrbitDB instance
  const orbitdb = await createOrbitDB({ ipfs: helia });

  console.log('✅ OrbitDB initialized');
  console.log('PeerID:', libp2p.peerId.toString());

  return { helia, orbitdb, libp2p };
}
```

### 3. Create Intentions Database

```javascript
// lib/intentions-store.js
import { embedIntention } from './intention-search-engine.js';

export async function openIntentionsDB(orbitdb) {
  // Open or create the intentions database
  const db = await orbitdb.open('intentions', {
    type: 'documents',
    AccessController: {
      // Allow all peers to write (public collaborative database)
      type: 'ipfs',
      write: ['*']
    },
    indexBy: 'intentionId' // Index by intentionId for fast lookups
  });

  console.log('📚 Intentions database opened:', db.address);
  console.log('Database ID:', db.id);

  // Wait for database to load existing entries
  await db.load();
  console.log(`Loaded ${await db.all().length} intentions`);

  return db;
}

export async function createIntention(db, intentionData, userId) {
  // Generate unique ID
  const intentionId = `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Create intention object
  const intention = {
    intentionId,
    title: intentionData.title,
    description: intentionData.description || '',
    location: intentionData.location,
    geo: intentionData.geo,
    status: 'active',
    createdBy: userId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tags: intentionData.tags || [],
    category: intentionData.category || 'general'
  };

  // Add embedding for vector search
  const intentionWithEmbedding = await embedIntention(intention);

  // Save to OrbitDB
  const hash = await db.put(intentionWithEmbedding);
  
  console.log('✅ Intention created:', intentionId);
  console.log('IPFS Hash:', hash);

  return intentionWithEmbedding;
}

export async function updateIntention(db, intentionId, updates) {
  const existing = await db.get(intentionId);
  if (!existing || existing.length === 0) {
    throw new Error('Intention not found');
  }

  const updated = {
    ...existing[0],
    ...updates,
    updatedAt: Date.now()
  };

  // Regenerate embedding if title or description changed
  if (updates.title || updates.description) {
    const reembedded = await embedIntention(updated);
    await db.put(reembedded);
    return reembedded;
  } else {
    await db.put(updated);
    return updated;
  }
}

export async function getAllIntentions(db) {
  const all = await db.all();
  return all;
}

export async function getIntentionById(db, intentionId) {
  const results = await db.get(intentionId);
  return results[0] || null;
}

export async function deleteIntention(db, intentionId) {
  await db.del(intentionId);
  console.log('🗑️ Intention deleted:', intentionId);
}
```

### 4. Subscribe to Real-time Updates

```javascript
// lib/intentions-subscriptions.js
import { writable } from 'svelte/store';

export const intentionsStore = writable([]);

export function subscribeToIntentions(db) {
  // Load initial data
  db.all().then(intentions => {
    intentionsStore.set(intentions);
  });

  // Listen for database updates
  db.events.on('update', async (entry) => {
    console.log('📡 Database updated:', entry);
    
    // Reload all intentions
    const all = await db.all();
    intentionsStore.set(all);
  });

  db.events.on('peer', (peerId) => {
    console.log('👥 Peer connected:', peerId);
  });

  db.events.on('join', (peerId) => {
    console.log('🔗 Peer joined database:', peerId);
  });

  db.events.on('leave', (peerId) => {
    console.log('👋 Peer left database:', peerId);
  });

  console.log('✅ Subscribed to intention updates');
}
```

### 5. Integrate with IntentionSearch Component

```javascript
// IntentionSearch.svelte - Modified for OrbitDB
<script>
  import { onMount, onDestroy } from 'svelte';
  import { intentionsStore } from './lib/intentions-subscriptions.js';
  import { setupOrbitDB } from './lib/orbitdb-setup.js';
  import { openIntentionsDB, createIntention } from './lib/intentions-store.js';
  import { subscribeToIntentions } from './lib/intentions-subscriptions.js';
  import { searchIntentions, initializeSearchModel } from './intention-search-engine.js';

  let orbitdb, intentionsDB, libp2p;
  let allIntentions = [];
  let isInitializing = true;

  // Subscribe to store updates
  const unsubscribe = intentionsStore.subscribe(intentions => {
    allIntentions = intentions;
  });

  onMount(async () => {
    try {
      // Initialize OrbitDB
      const setup = await setupOrbitDB();
      orbitdb = setup.orbitdb;
      libp2p = setup.libp2p;

      // Open intentions database
      intentionsDB = await openIntentionsDB(orbitdb);

      // Subscribe to real-time updates
      subscribeToIntentions(intentionsDB);

      // Initialize search model
      await initializeSearchModel();

      isInitializing = false;
      console.log('✅ System ready');
    } catch (error) {
      console.error('Failed to initialize:', error);
      isInitializing = false;
    }
  });

  onDestroy(() => {
    unsubscribe();
    if (intentionsDB) intentionsDB.close();
    if (orbitdb) orbitdb.stop();
    if (libp2p) libp2p.stop();
  });

  async function handleCreateIntention(formData) {
    if (!intentionsDB) {
      console.error('Database not ready');
      return;
    }

    const userId = libp2p.peerId.toString();
    
    try {
      const newIntention = await createIntention(
        intentionsDB,
        formData,
        userId
      );
      
      console.log('Created intention:', newIntention);
      // The store will automatically update via subscription
    } catch (error) {
      console.error('Failed to create intention:', error);
    }
  }
</script>

{#if isInitializing}
  <div class="loading">Initializing P2P network...</div>
{:else}
  <!-- Rest of component... -->
{/if}
```

## Performance Optimization

### 1. Lazy Loading Embeddings

```javascript
// Only generate embeddings when needed
export async function ensureEmbedding(intention) {
  if (intention.embedding && intention.embeddedAt) {
    // Check if embedding is recent (less than 30 days old)
    const age = Date.now() - intention.embeddedAt;
    if (age < 30 * 24 * 60 * 60 * 1000) {
      return intention;
    }
  }

  // Generate new embedding
  return await embedIntention(intention);
}
```

### 2. Batch Embedding on Sync

```javascript
// When syncing from peers, batch-embed intentions without embeddings
export async function syncAndEmbedIntentions(db) {
  const all = await db.all();
  const needsEmbedding = all.filter(i => !i.embedding);

  if (needsEmbedding.length > 0) {
    console.log(`🔄 Embedding ${needsEmbedding.length} intentions...`);
    
    for (const intention of needsEmbedding) {
      const embedded = await embedIntention(intention);
      await db.put(embedded);
    }
  }

  return all;
}
```

### 3. Local Caching

```javascript
// Use IndexedDB for caching embeddings
import { openDB } from 'idb';

const embedCache = await openDB('intention-embeddings', 1, {
  upgrade(db) {
    db.createObjectStore('embeddings', { keyPath: 'intentionId' });
  }
});

export async function getCachedEmbedding(intentionId) {
  return await embedCache.get('embeddings', intentionId);
}

export async function setCachedEmbedding(intentionId, embedding) {
  await embedCache.put('embeddings', { intentionId, embedding });
}
```

## Testing

### Run Local Test

```javascript
// test-intentions.js
import { setupOrbitDB } from './lib/orbitdb-setup.js';
import { openIntentionsDB, createIntention } from './lib/intentions-store.js';

async function test() {
  const { orbitdb, libp2p } = await setupOrbitDB();
  const db = await openIntentionsDB(orbitdb);

  // Create test intention
  const intention = await createIntention(
    db,
    {
      title: 'Test Healing Circle',
      description: 'A gathering for community healing and connection',
      location: 'Oakland, CA',
      geo: [37.8044, -122.2712]
    },
    libp2p.peerId.toString()
  );

  console.log('Created:', intention);

  // Query all
  const all = await db.all();
  console.log('All intentions:', all.length);

  // Cleanup
  await db.close();
  await orbitdb.stop();
  await libp2p.stop();
}

test().catch(console.error);
```

### Multi-Peer Test

Open the application in two browser tabs with different ports:

```bash
# Terminal 1
npm run dev -- --port 5173

# Terminal 2
npm run dev -- --port 5174
```

Both instances will automatically discover each other and sync the intentions database.

## Security Considerations

### 1. Access Control

```javascript
// For private communities, use write permissions
const db = await orbitdb.open('private-intentions', {
  type: 'documents',
  AccessController: {
    type: 'ipfs',
    write: [
      peerId1.toString(),
      peerId2.toString(),
      // ... allowed peers
    ]
  }
});
```

### 2. Content Moderation

```javascript
// Validate intentions before adding
function validateIntention(intention) {
  if (!intention.title || intention.title.length > 200) {
    throw new Error('Invalid title');
  }
  
  if (intention.description && intention.description.length > 5000) {
    throw new Error('Description too long');
  }
  
  // Add more validation as needed
  return true;
}
```

### 3. Rate Limiting

```javascript
// Prevent spam by limiting creation rate
const creationTimestamps = new Map();

function checkRateLimit(userId) {
  const recent = creationTimestamps.get(userId) || 0;
  const now = Date.now();
  
  if (now - recent < 60000) { // 1 minute cooldown
    throw new Error('Please wait before creating another intention');
  }
  
  creationTimestamps.set(userId, now);
  return true;
}
```

## Next Steps

1. **Deploy relay nodes** for WebRTC signaling and database replication
2. **Add Storacha backup** for long-term IPFS pinning (see simple-todo example)
3. **Implement attention tracking** with per-user EventLog databases
4. **Add token system** for gratitude and service tracking
5. **Create Temple structure** for community organization

## Resources

- [OrbitDB Documentation](https://github.com/orbitdb/orbitdb)
- [Helia IPFS](https://github.com/ipfs/helia)
- [libp2p Documentation](https://docs.libp2p.io/)
- [Transformers.js Guide](https://huggingface.co/docs/transformers.js)
- [Simple Todo Example](../README.md) - Reference implementation
