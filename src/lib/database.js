import { IPFSAccessController } from '@orbitdb/core';
import { logger } from '@libp2p/logger';
import { embedIntention } from './intention-search-engine.js';

// Create database logger
const dbLog = logger('syncengine:database');

// Global store for identity verification results (not persisted)
const identityVerifications = new Map();

// Export function to access verification store from UI
export function getIdentityVerifications() {
  return identityVerifications;
}

export function getVerificationForIntention(intentionId) {
  return identityVerifications.get(intentionId) || null;
}

// IndexedDB cache for instant loading
const CACHE_DB_NAME = 'syncengine-cache';
const CACHE_STORE_NAME = 'intentions';
const CACHE_VERSION = 1;

/**
 * Opens the IndexedDB cache for intentions
 * @returns {Promise<IDBDatabase>}
 */
async function openCacheDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CACHE_DB_NAME, CACHE_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
        const store = db.createObjectStore(CACHE_STORE_NAME, { keyPath: 'intentionId' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

/**
 * Loads intentions from IndexedDB cache instantly
 * @returns {Promise<Array>} Cached intentions
 */
export async function loadIntentionsFromCache() {
  try {
    const db = await openCacheDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CACHE_STORE_NAME], 'readonly');
      const store = transaction.objectStore(CACHE_STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const intentions = request.result.sort((a, b) => b.createdAt - a.createdAt);
        console.log('📦 Loaded', intentions.length, 'intentions from cache');
        resolve(intentions);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('⚠️ Failed to load from cache:', error);
    return [];
  }
}

/**
 * Saves intentions to IndexedDB cache
 * @param {Array} intentions - Intentions to cache
 */
export async function saveIntentionsToCache(intentions) {
  try {
    const db = await openCacheDB();
    const transaction = db.transaction([CACHE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(CACHE_STORE_NAME);

    // Clear existing cache
    await new Promise((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    });

    // Add all intentions
    for (const intention of intentions) {
      store.put(intention);
    }

    await new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });

    console.log('💾 Cached', intentions.length, 'intentions to IndexedDB');
  } catch (error) {
    console.warn('⚠️ Failed to save to cache:', error);
  }
}

/**
 * Clears all cached intentions
 */
export async function clearIntentionsCache() {
  try {
    const db = await openCacheDB();
    const transaction = db.transaction([CACHE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(CACHE_STORE_NAME);
    await new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    console.log('🗑️ Cleared intentions cache');
  } catch (error) {
    console.warn('⚠️ Failed to clear cache:', error);
  }
}

/**
 * Completely resets all stored data for a fresh start
 * Clears localStorage, IndexedDB cache, and OrbitDB/Helia storage
 */
export async function resetAllData() {
  try {
    console.log('🗑️ Starting complete data reset...');

    // Clear localStorage
    localStorage.removeItem('syncengine-database-address');
    localStorage.removeItem('webauthn-credential');
    localStorage.removeItem('active-intention-id');
    localStorage.removeItem('attention-switch-log');
    console.log('✅ Cleared localStorage');

    // Clear intentions cache
    await clearIntentionsCache();

    // Clear all IndexedDB databases
    if ('databases' in indexedDB) {
      const databases = await indexedDB.databases();
      for (const db of databases) {
        if (
          db.name.includes('orbitdb') ||
          db.name.includes('helia') ||
          db.name.includes('syncengine') ||
          db.name.includes('level')
        ) {
          console.log('🗑️ Deleting database:', db.name);
          await new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(db.name);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
            request.onblocked = () => {
              console.warn('⚠️ Database deletion blocked:', db.name);
              resolve(); // Continue anyway
            };
          });
        }
      }
    }

    console.log('✅ Complete data reset finished!');
    console.log('💡 Refresh the page to start with a new database');
    return true;
  } catch (error) {
    console.error('❌ Failed to reset all data:', error);
    throw error;
  }
}

/**
 * Extracts database address from URL parameter
 * @returns {string|null} Database address from URL or null
 */
export function getDatabaseAddressFromURL() {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const dbAddress = params.get('db');

  if (dbAddress) {
    console.log('📱 Magic link detected:', dbAddress);
    return dbAddress;
  }

  return null;
}

/**
 * Extracts peer multiaddrs from URL parameter
 * @returns {string[]|null} Array of peer multiaddrs or null
 */
export function getPeerMultiaddrsFromURL() {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const peersParam = params.get('peers');

  if (peersParam) {
    // Decode and split comma-separated multiaddrs
    const multiaddrs = decodeURIComponent(peersParam)
      .split(',')
      .filter(addr => addr.trim().length > 0);

    if (multiaddrs.length > 0) {
      console.log('🔗 Peer addresses detected in magic link:', multiaddrs.length);
      return multiaddrs;
    }
  }

  return null;
}

/**
 * Attempts to dial peers directly from multiaddrs
 * @param {Object} libp2p - The libp2p instance
 * @param {string[]} multiaddrs - Array of peer multiaddrs to dial
 * @returns {Promise<boolean>} True if at least one peer connected
 */
export async function dialDirectPeers(libp2p, multiaddrs) {
  if (!libp2p || !multiaddrs || multiaddrs.length === 0) {
    return false;
  }

  console.log('📞 Attempting direct peer connection...');
  console.log('🔗 Dialing', multiaddrs.length, 'peer address(es)');

  const dialPromises = multiaddrs.map(async (multiaddr) => {
    try {
      console.log('  → Dialing:', multiaddr.substring(0, 60) + '...');
      await libp2p.dial(multiaddr);
      console.log('  ✅ Connected to peer via:', multiaddr.substring(0, 60) + '...');
      return true;
    } catch (error) {
      console.warn('  ⚠️ Failed to dial peer:', error.message);
      return false;
    }
  });

  // Try to connect to at least one peer (with 10s timeout per dial)
  try {
    const results = await Promise.race([
      Promise.allSettled(dialPromises),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Direct dial timeout after 10 seconds')), 10000)
      )
    ]);

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;

    if (successCount > 0) {
      console.log('✅ Direct peer connection established:', successCount, 'peer(s)');
      return true;
    } else {
      console.log('⚠️ No direct peer connections succeeded');
      return false;
    }
  } catch (error) {
    console.warn('⚠️ Direct peer dial timed out:', error.message);
    return false;
  }
}

/**
 * Clears the database parameter from URL
 * Should be called after successfully connecting via magic link
 */
export function clearDatabaseFromURL() {
  if (typeof window === 'undefined') return;

  const params = new URLSearchParams(window.location.search);
  if (params.has('db')) {
    // Use replaceState to clean URL without triggering navigation
    const cleanURL = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, cleanURL);
    console.log('🧹 Cleaned database parameter from URL');
  }
}

/**
 * Opens an Intentions database with the given OrbitDB instance and identity
 * @param {Object} orbitdb - The OrbitDB instance
 * @param {Object} identity - The WebAuthn identity
 * @param {Object} identities - The OrbitDB identities instance
 * @param {Object} libp2p - The libp2p instance (optional, for direct peer dialing)
 * @returns {Object} The opened database instance
 */
export async function openIntentionsDatabase(orbitdb, identity, identities, libp2p = null) {
  const ipfsInstance = orbitdb.ipfs;

  console.log('🌍 Opening global shared database...');
  console.log('🔓 Database access: collaborative (all users can write)');

  // Priority 1: Check URL parameter (magic link invitation)
  const urlAddress = getDatabaseAddressFromURL();
  const peerMultiaddrs = getPeerMultiaddrsFromURL();

  // Priority 2: Check if we have a stored database address
  const storedAddress = localStorage.getItem('syncengine-database-address');

  let database;
  let isNewDatabase = false;
  let isJoinedViaInvitation = false;

  // Try URL address first (magic link invitation)
  if (urlAddress) {
    console.log('🎟️ Joining via magic link invitation...');
    isJoinedViaInvitation = true;

    try {
      let directPeerConnected = false;

      // If we have peer multiaddrs, try direct connection first
      if (peerMultiaddrs && peerMultiaddrs.length > 0 && libp2p) {
        console.log('🚀 Magic link includes peer addresses for instant connection!');
        directPeerConnected = await dialDirectPeers(libp2p, peerMultiaddrs);

        if (directPeerConnected) {
          // Give the peer a moment to settle
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Connect to the database from magic link
      // Use shorter timeout if we connected directly (30s), longer if relying on bootstrap (90s)
      const timeout = directPeerConnected ? 30000 : 90000;
      const timeoutMessage = directPeerConnected
        ? 'Database open timeout after 30 seconds'
        : 'Database open timeout after 90 seconds (peer discovery via bootstrap)';

      console.log(directPeerConnected
        ? '⚡ Opening database with direct peer connection...'
        : '🔍 Opening database, discovering peers via bootstrap...');

      database = await Promise.race([
        orbitdb.open(urlAddress, {
          type: 'documents',
          indexBy: 'intentionId',
          sync: true
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(timeoutMessage)), timeout)
        )
      ]);

      // Store the database address for future use
      localStorage.setItem('syncengine-database-address', urlAddress);

      // Clear URL parameter after successful connection
      clearDatabaseFromURL();

      if (directPeerConnected) {
        console.log('✅ Successfully joined via direct peer connection!');
      } else {
        console.log('✅ Successfully joined via bootstrap discovery!');
      }
      console.log('💾 Database address stored for future connections');
    } catch (error) {
      console.error('❌ Failed to join via magic link:', error.message);

      // Don't fall back to stored address - this prevents joining wrong database
      // Instead, clear the bad URL parameter and throw error
      clearDatabaseFromURL();

      // Provide context-specific error message
      if (peerMultiaddrs && peerMultiaddrs.length > 0) {
        throw new Error(
          'Failed to connect to peer. Please ensure both devices are online and try again. ' +
          'If the problem persists, the peer may be behind a firewall or NAT that prevents direct connections.'
        );
      } else {
        throw new Error(
          'Failed to discover database peers after 90 seconds. ' +
          'This may be due to network issues or the database creator being offline. ' +
          'Please ask them to keep their browser window open and try again.'
        );
      }
    }
  }

  // Try stored address if magic link wasn't present
  if (!database && storedAddress && !urlAddress) {
    console.log('📍 Found stored database address:', storedAddress);
    console.log('🔗 Connecting to existing shared database...');

    try {
      // Connect to the existing database using its address
      // Use longer timeout (30 seconds) for reconnection
      database = await Promise.race([
        orbitdb.open(storedAddress, {
          type: 'documents',
          indexBy: 'intentionId',
          sync: true
        }),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Database open timeout after 30 seconds')),
            30000
          )
        )
      ]);

      console.log('✅ Connected to shared database');
    } catch (error) {
      console.warn('⚠️ Failed to connect to stored address, creating new database:', error.message);
      // If connection fails, clear the stored address and create a new one
      localStorage.removeItem('syncengine-database-address');
    }
  }

  // If no stored address or connection failed, create a new database
  if (!database) {
    console.log('🆕 Creating new shared database...');
    const globalDatabaseName = 'syncengine-global-intentions';
    isNewDatabase = true;

    database = await Promise.race([
      orbitdb.open(globalDatabaseName, {
        type: 'documents',
        indexBy: 'intentionId',
        create: true,
        sync: true,
        accessController: IPFSAccessController({
          write: ['*']  // Allow all users to write (collaborative database)
        })
      }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Database open timeout after 15 seconds')),
          15000
        )
      )
    ]);

    // Store the database address for future use
    localStorage.setItem('syncengine-database-address', database.address);
    console.log('💾 Stored database address for future connections:', database.address);
  }

  console.log('✅ Database opened successfully:', {
    name: database.name,
    address: database.address,
    type: database.type,
    identityId: database.identity?.id,
    accessControllerType: database.access?.type,
    isNew: isNewDatabase
  });

  console.log('📋 Share this address with other devices to sync:');
  console.log('   ', database.address);

  // Set up database event listeners
  setupDatabaseEventListeners(database, ipfsInstance, identities);

  // Add flags to the database object
  database._isNewDatabase = isNewDatabase;
  database._isJoinedViaInvitation = isJoinedViaInvitation;

  return database;
}

/**
 * Sets up event listeners for database debugging and verification
 * @param {Object} database - The database instance
 * @param {Object} ipfs - The IPFS/Helia instance
 * @param {Object} identities - The OrbitDB identities instance
 */
function setupDatabaseEventListeners(database, ipfs, identities) {
  database.events.on('join', (peerId, heads) => {
    console.log('🔗 Peer joined database:', {
      peerId: peerId?.toString().substring(0, 20) + '...',
      heads: heads?.length || 0
    });
  });

  database.events.on('update', async (entry) => {
    console.log('🔄 Database UPDATE received:', {
      hash: entry?.hash?.toString ? entry.hash.toString().substring(0, 20) + '...' : 'unknown',
      identity: entry?.identity?.toString ? entry.identity.toString().substring(0, 20) + '...' : 'unknown'
    });

    // Get updated intentions count
    try {
      const allEntries = await database.all();
      console.log(`📊 Total intentions in database: ${allEntries.length}`);
    } catch (error) {
      console.warn('Could not get intention count:', error);
    }
  });

  database.events.on('error', (error) => {
    console.error('❌ Database ERROR event:', error);
  });
}

/**
 * Loads all intentions from the database
 * @param {Object} database - The database instance
 * @param {boolean} isNewDatabase - Whether this is a newly created database
 * @returns {Promise<Array>} Array of intention objects
 */
export async function loadIntentions(database, isNewDatabase = false) {
  if (!database) return [];

  try {
    console.log('📊 Loading intentions from OrbitDB:', {
      databaseName: database.name,
      databaseAddress: database.address,
      databaseType: database.type,
      isNew: isNewDatabase
    });

    // For newly created databases, return empty array immediately
    // to avoid timeout issues during initialization
    if (isNewDatabase) {
      console.log('🆕 New database - no intentions to load yet');
      return [];
    }

    // Increase timeout to 30 seconds for initial load
    // This gives more time for P2P sync to complete
    const allIntentions = await Promise.race([
      database.all(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Database.all() timeout after 30 seconds')),
          30000
        )
      )
    ]);

    console.log('✅ OrbitDB sync completed, entries found:', allIntentions.length);

    const intentions = allIntentions
      .map((entry) => entry.value)
      .sort((a, b) => b.createdAt - a.createdAt);

    console.log('📋 Intentions loaded from OrbitDB:', intentions.length);

    // Cache the loaded intentions for next startup
    await saveIntentionsToCache(intentions);

    return intentions;
  } catch (error) {
    console.error('❌ Failed to load from OrbitDB:', error);
    console.log('💡 Loading from cache while waiting for peers...');
    // If loading fails, return empty array rather than throwing
    // This prevents authentication from failing completely
    return [];
  }
}

/**
 * Creates a new intention in the database
 * @param {Object} database - The database instance
 * @param {Object} intentionData - The intention data
 * @param {string} intentionData.title - Intention title
 * @param {string} intentionData.description - Intention description
 * @param {string} intentionData.location - Location name
 * @param {[number, number]} intentionData.geo - [latitude, longitude]
 * @param {Array<string>} intentionData.tags - Tags
 * @param {string} intentionData.category - Category
 * @param {Object} credential - The WebAuthn credential
 * @returns {Promise<Object>} The created intention object
 */
export async function createIntention(database, intentionData, credential = null) {
  if (!database) {
    throw new Error('Database is required');
  }

  if (!intentionData.title || !intentionData.title.trim()) {
    throw new Error('Intention title is required');
  }

  try {
    const startTime = Date.now();

    // Generate unique ID
    const intentionId = `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create base intention object
    const intention = {
      _id: intentionId, // Required by OrbitDB documents
      intentionId,
      title: intentionData.title.trim(),
      description: intentionData.description?.trim() || '',
      location: intentionData.location || '',
      geo: intentionData.geo || null,
      status: 'active',
      createdBy: database.identity.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: intentionData.tags || [],
      category: intentionData.category || 'general'
    };

    dbLog('createIntention() called: %o', {
      intentionId,
      titleLength: intention.title.length
    });

    // Generate embedding for vector search
    console.log('🧠 Generating embedding for intention...');
    const intentionWithEmbedding = await embedIntention(intention);

    // Cache FIRST for instant UI (optimistic update)
    const currentCache = await loadIntentionsFromCache();
    await saveIntentionsToCache([...currentCache, intentionWithEmbedding]);
    console.log('💾 Cached intention locally');

    // Try to save to OrbitDB (don't fail if it times out)
    console.log('☁️ Syncing to OrbitDB...');
    dbLog('Calling database.put() with embedding');

    try {
      await Promise.race([
        database.put(intentionWithEmbedding),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Database write timeout after 15 seconds')),
            15000
          )
        )
      ]);

      const endTime = Date.now();
      dbLog('database.put() completed in %d ms', endTime - startTime);
      console.log('✅ Intention created and synced:', intentionId);
    } catch (writeError) {
      // OrbitDB write failed, but that's okay - we already cached it
      console.warn('⚠️ OrbitDB write failed, but intention is cached locally:', writeError.message);
      console.log('💡 Intention will sync to peers when network is available');
      // Don't throw - we successfully created and cached the intention
    }

    return intentionWithEmbedding;
  } catch (error) {
    console.error('❌ Failed to create intention:', error);
    throw error;
  }
}

/**
 * Updates an existing intention
 * @param {Object} database - The database instance
 * @param {string} intentionId - The intention ID to update
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} The updated intention object
 */
export async function updateIntention(database, intentionId, updates) {
  if (!database || !intentionId) {
    throw new Error('Database and intentionId are required');
  }

  try {
    const startTime = Date.now();

    // Get existing intention
    const existing = await database.get(intentionId);
    if (!existing || existing.length === 0) {
      throw new Error(`Intention ${intentionId} not found`);
    }

    const updatedIntention = {
      ...existing[0],
      ...updates,
      updatedAt: Date.now()
    };

    // If title or description changed, regenerate embedding
    if (updates.title || updates.description) {
      console.log('🧠 Regenerating embedding for updated intention...');
      const reembedded = await embedIntention(updatedIntention);
      await database.put(reembedded);

      const endTime = Date.now();
      dbLog('updateIntention() completed in %d ms', endTime - startTime);

      return reembedded;
    } else {
      await database.put(updatedIntention);

      const endTime = Date.now();
      dbLog('updateIntention() completed in %d ms', endTime - startTime);

      return updatedIntention;
    }
  } catch (error) {
    console.error('Failed to update intention:', error);
    throw error;
  }
}

/**
 * Marks an intention as completed
 * @param {Object} database - The database instance
 * @param {string} intentionId - The intention ID
 * @returns {Promise<Object>} The updated intention
 */
export async function completeIntention(database, intentionId) {
  return updateIntention(database, intentionId, {
    status: 'completed',
    completedAt: Date.now()
  });
}

/**
 * Archives an intention
 * @param {Object} database - The database instance
 * @param {string} intentionId - The intention ID
 * @returns {Promise<Object>} The updated intention
 */
export async function archiveIntention(database, intentionId) {
  return updateIntention(database, intentionId, {
    status: 'archived',
    archivedAt: Date.now()
  });
}

/**
 * Deletes an intention from the database
 * @param {Object} database - The database instance
 * @param {string} intentionId - The intention ID to delete
 * @returns {Promise<void>}
 */
export async function deleteIntention(database, intentionId) {
  if (!database || !intentionId) {
    throw new Error('Database and intentionId are required');
  }

  try {
    const startTime = Date.now();

    dbLog('deleteIntention() called for: %s', intentionId);
    await database.del(intentionId);

    const endTime = Date.now();
    dbLog('database.del() completed in %d ms', endTime - startTime);

    console.log('🗑️ Intention deleted:', intentionId);
  } catch (error) {
    dbLog.error('Failed to delete intention: %s', error.message);
    throw error;
  }
}

/**
 * Gets a single intention by ID
 * @param {Object} database - The database instance
 * @param {string} intentionId - The intention ID
 * @returns {Promise<Object|null>} The intention object or null
 */
export async function getIntentionById(database, intentionId) {
  if (!database || !intentionId) {
    return null;
  }

  try {
    const results = await database.get(intentionId);
    return results && results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Failed to get intention:', error);
    return null;
  }
}

/**
 * Gets statistics about the intentions
 * @param {Array} intentions - Array of intention objects
 * @returns {Object} Statistics object
 */
export function getIntentionStats(intentions) {
  return {
    total: intentions.length,
    active: intentions.filter((i) => i.status === 'active').length,
    completed: intentions.filter((i) => i.status === 'completed').length,
    archived: intentions.filter((i) => i.status === 'archived').length,
    withLocation: intentions.filter((i) => i.geo && i.geo.length === 2).length
  };
}

/**
 * Filters intentions by status
 * @param {Array} intentions - Array of intention objects
 * @param {string} status - Status to filter by ('active', 'completed', 'archived')
 * @returns {Array} Filtered intentions
 */
export function filterIntentionsByStatus(intentions, status) {
  return intentions.filter((i) => i.status === status);
}

/**
 * Filters intentions by category
 * @param {Array} intentions - Array of intention objects
 * @param {string} category - Category to filter by
 * @returns {Array} Filtered intentions
 */
export function filterIntentionsByCategory(intentions, category) {
  return intentions.filter((i) => i.category === category);
}

/**
 * Filters intentions by tags (includes any of the provided tags)
 * @param {Array} intentions - Array of intention objects
 * @param {Array<string>} tags - Tags to filter by
 * @returns {Array} Filtered intentions
 */
export function filterIntentionsByTags(intentions, tags) {
  return intentions.filter((i) =>
    i.tags && i.tags.some((tag) => tags.includes(tag))
  );
}
