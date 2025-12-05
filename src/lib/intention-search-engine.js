/**
 * Intention Search Engine with Transformers.js Vector Search
 * Browser-native semantic similarity search using all-MiniLM-L6-v2
 */

import { pipeline } from '@xenova/transformers';

// Global model singleton
let embeddingModel = null;
let modelLoading = null;

/**
 * Initialize the embedding model (call once on app startup)
 * @returns {Promise<void>}
 */
export async function initializeSearchModel() {
  if (embeddingModel) return embeddingModel;
  if (modelLoading) return modelLoading;

  try {
    console.log('🤖 Loading embedding model (all-MiniLM-L6-v2)...');

    // Configure Transformers.js environment
    const { env } = await import('@xenova/transformers');

    // Use CDN models (not local)
    env.allowLocalModels = false;

    // Enable browser caching for faster subsequent loads
    env.useBrowserCache = true;

    // Set CDN to use for models (default is Hugging Face)
    env.backends.onnx.wasm.numThreads = 1;

    console.log('⚙️ Transformers.js environment configured');
    console.log('   - allowLocalModels:', env.allowLocalModels);
    console.log('   - useBrowserCache:', env.useBrowserCache);

    // Load the model
    modelLoading = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    embeddingModel = await modelLoading;

    console.log('✅ Embedding model loaded successfully');
    return embeddingModel;
  } catch (error) {
    console.error('❌ Failed to load embedding model:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack?.substring(0, 200)
    });
    throw new Error(`ML model loading failed: ${error.message}`);
  }
}

/**
 * Generate embedding vector for text
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} 384-dimensional embedding vector
 */
export async function generateEmbedding(text) {
  if (!embeddingModel) {
    await initializeSearchModel();
  }

  const output = await embeddingModel(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

/**
 * Add embedding to an intention object
 * @param {Object} intention - Intention without embedding
 * @returns {Promise<Object>} Intention with embedding field added
 */
export async function embedIntention(intention) {
  const textToEmbed = `${intention.title} ${intention.description || ''}`;
  const embedding = await generateEmbedding(textToEmbed);

  return {
    ...intention,
    embedding,
    embeddedAt: Date.now()
  };
}

/**
 * Calculate cosine similarity between two vectors
 * @param {number[]} vecA - First vector
 * @param {number[]} vecB - Second vector
 * @returns {number} Similarity score (0-1, higher is more similar)
 */
function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Calculate geographic distance between two points (haversine formula)
 * @param {[number, number]} geo1 - [latitude, longitude]
 * @param {[number, number]} geo2 - [latitude, longitude]
 * @returns {number} Distance in kilometers
 */
function geoDistance(geo1, geo2) {
  if (!geo1 || !geo2) return Infinity;

  const [lat1, lon1] = geo1;
  const [lat2, lon2] = geo2;

  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Normalize score to 0-1 range
 * @param {number} distance - Distance in km
 * @param {number} maxDistance - Maximum distance to consider (default 100km)
 * @returns {number} Normalized score (0-1)
 */
function normalizeGeoScore(distance, maxDistance = 100) {
  if (distance === Infinity) return 0;
  return Math.max(0, 1 - distance / maxDistance);
}

/**
 * Calculate card dimensions based on relevance score using golden ratio
 * @param {number} score - Relevance score (0-1)
 * @param {number} baseWidth - Base width in pixels (default 320)
 * @returns {Object} { width, height } in pixels
 */
export function calculateCardDimensions(score, baseWidth = 320) {
  const PHI = 1.618; // Golden ratio
  const scaleFactor = 0.5 + score * 0.5; // Range: 0.5 to 1.0
  const width = Math.round(baseWidth * scaleFactor);
  const height = Math.round(width / PHI);

  return { width, height };
}

/**
 * Search intentions with semantic similarity and optional geo-proximity
 * @param {string} query - Search query text
 * @param {Array<Object>} intentions - Array of intention objects with embeddings
 * @param {Object} options - Search options
 * @param {[number, number]} options.userLocation - User's [lat, lon] for geo-scoring
 * @param {number} options.semanticWeight - Weight for semantic score (default 0.7)
 * @param {number} options.geoWeight - Weight for geo score (default 0.3)
 * @param {number} options.minScore - Minimum combined score to include (default 0.1)
 * @param {number} options.maxResults - Maximum results to return (default 50)
 * @returns {Promise<Array<Object>>} Sorted results with scores and dimensions
 */
export async function searchIntentions(query, intentions, options = {}) {
  const {
    userLocation = null,
    semanticWeight = 0.7,
    geoWeight = 0.3,
    minScore = 0.1,
    maxResults = 50
  } = options;

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  // Score each intention
  const results = intentions
    .map((intention) => {
      // Skip intentions without embeddings
      if (!intention.embedding) {
        console.warn(`Intention ${intention.intentionId} has no embedding`);
        return null;
      }

      // Calculate semantic similarity
      const semanticScore = cosineSimilarity(queryEmbedding, intention.embedding);

      // Calculate geo-proximity score
      let geoScore = 0;
      if (userLocation && intention.geo) {
        const distance = geoDistance(userLocation, intention.geo);
        geoScore = normalizeGeoScore(distance);
      }

      // Combined score
      const combinedScore =
        userLocation && intention.geo
          ? semanticScore * semanticWeight + geoScore * geoWeight
          : semanticScore;

      // Calculate card dimensions
      const dimensions = calculateCardDimensions(combinedScore);

      return {
        ...intention,
        score: {
          combined: combinedScore,
          semantic: semanticScore,
          geo: geoScore
        },
        dimensions,
        matchPercentage: Math.round(combinedScore * 100)
      };
    })
    .filter((result) => result !== null && result.score.combined >= minScore)
    .sort((a, b) => b.score.combined - a.score.combined)
    .slice(0, maxResults);

  console.log(`🔍 Search for "${query}" returned ${results.length} results`);
  return results;
}

/**
 * Batch embed multiple intentions efficiently
 * @param {Array<Object>} intentions - Intentions to embed
 * @param {Function} progressCallback - Optional callback(done, total)
 * @returns {Promise<Array<Object>>} Intentions with embeddings
 */
export async function batchEmbedIntentions(intentions, progressCallback = null) {
  const embedded = [];

  for (let i = 0; i < intentions.length; i++) {
    const intention = intentions[i];

    // Skip if already has embedding
    if (intention.embedding) {
      embedded.push(intention);
      continue;
    }

    // Generate embedding
    const withEmbedding = await embedIntention(intention);
    embedded.push(withEmbedding);

    // Progress callback
    if (progressCallback) {
      progressCallback(i + 1, intentions.length);
    }
  }

  return embedded;
}

/**
 * Check if the browser supports required features
 * @returns {Object} { supported, message }
 */
export function checkBrowserSupport() {
  const hasWasm = typeof WebAssembly !== 'undefined';
  const hasWorkers = typeof Worker !== 'undefined';

  if (!hasWasm) {
    return { supported: false, message: 'WebAssembly not supported' };
  }

  if (!hasWorkers) {
    return { supported: false, message: 'Web Workers not supported' };
  }

  return { supported: true, message: 'All features supported' };
}
