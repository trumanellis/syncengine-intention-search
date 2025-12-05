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

/**
 * Opens an Intentions database with the given OrbitDB instance and identity
 * @param {Object} orbitdb - The OrbitDB instance
 * @param {Object} identity - The WebAuthn identity
 * @param {Object} identities - The OrbitDB identities instance
 * @returns {Object} The opened database instance
 */
export async function openIntentionsDatabase(orbitdb, identity, identities) {
  const ipfsInstance = orbitdb.ipfs;

  console.log('🌍 Opening global shared database...');
  console.log('🔓 Database access: collaborative (all users can write)');

  // Use a fixed global database name that all users connect to
  const globalDatabaseName = 'syncengine-global-intentions';

  const database = await Promise.race([
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

  console.log('✅ Database opened successfully:', {
    name: database.name,
    address: database.address,
    type: database.type,
    identityId: database.identity?.id,
    accessControllerType: database.access?.type
  });

  // Set up database event listeners
  setupDatabaseEventListeners(database, ipfsInstance, identities);

  return database;
}

/**
 * Sets up event listeners for database debugging and verification
 * @param {Object} database - The database instance
 * @param {Object} ipfs - The IPFS/Helia instance
 * @param {Object} identities - The OrbitDB identities instance
 */
function setupDatabaseEventListeners(database, ipfs, identities) {
  database.events.on('join', (address, entry) => {
    console.log('🔗 Database JOIN event:', { address, entry: entry?.key });
  });

  database.events.on('update', async (address) => {
    console.log('🔄 Database UPDATE event:', { address });

    const updateIdentityHash = address?.identity;
    if (!updateIdentityHash) {
      console.warn('⚠️ Update event missing identity information');
      return;
    }

    const webAuthnDID = database.identity.id;
    if (!webAuthnDID) {
      console.warn('⚠️ Database missing identity information');
      return;
    }

    try {
      const { verifyDatabaseUpdate } = await import('./verification.js');
      const verification = await verifyDatabaseUpdate(
        database,
        updateIdentityHash,
        webAuthnDID
      );

      // Find which intention was just updated
      let updatedIntentionId = null;
      try {
        const allEntries = await database.all();
        const latestEntry = allEntries.sort(
          (a, b) => b.value.createdAt - a.value.createdAt
        )[0];
        updatedIntentionId = latestEntry?.value.intentionId;
      } catch (error) {
        console.warn('Could not determine which intention was updated:', error);
      }

      // Store verification result
      if (updatedIntentionId) {
        identityVerifications.set(updatedIntentionId, {
          success: verification.success,
          timestamp: Date.now(),
          identityHash: updateIdentityHash,
          error: verification.error || null,
          method: verification.method
        });
        console.log(
          `💾 Stored verification for intention ${updatedIntentionId}: ${verification.success ? 'PASSED' : 'FAILED'}`
        );
      }
    } catch (identityError) {
      console.error('❌ Error verifying identity:', identityError);
    }
  });

  database.events.on('error', (error) => {
    console.error('❌ Database ERROR event:', error);
  });
}

/**
 * Loads all intentions from the database
 * @param {Object} database - The database instance
 * @returns {Promise<Array>} Array of intention objects
 */
export async function loadIntentions(database) {
  if (!database) return [];

  try {
    console.log('📊 Loading intentions from database:', {
      databaseName: database.name,
      databaseAddress: database.address,
      databaseType: database.type
    });

    const allIntentions = await Promise.race([
      database.all(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Database.all() timeout after 10 seconds')),
          10000
        )
      )
    ]);

    console.log('✅ Database.all() completed, entries found:', allIntentions.length);

    const intentions = allIntentions
      .map((entry) => entry.value)
      .sort((a, b) => b.createdAt - a.createdAt);

    console.log('📋 Intentions loaded successfully:', intentions.length);
    return intentions;
  } catch (error) {
    console.error('❌ Failed to load intentions:', error);
    throw error;
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

    // Save to OrbitDB
    dbLog('Calling database.put() with embedding');
    await database.put(intentionWithEmbedding);

    const endTime = Date.now();
    dbLog('database.put() completed in %d ms', endTime - startTime);

    console.log('✅ Intention created:', intentionId);
    return intentionWithEmbedding;
  } catch (error) {
    console.error('Failed to create intention:', error);
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
