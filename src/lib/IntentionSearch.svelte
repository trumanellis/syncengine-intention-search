<script>
  /**
   * IntentionSearch - Main Component with Terminal Aesthetic
   * 4-screen navigation: Auth → Search → Decision → Detail
   */
  import { onMount, onDestroy } from 'svelte';
  import {
    WebAuthnDIDProvider,
    checkWebAuthnSupport
  } from '@le-space/orbitdb-identity-provider-webauthn-did';
  import { setupOrbitDB, cleanup, resetDatabaseState } from './libp2p.js';
  import {
    openIntentionsDatabase,
    loadIntentions,
    createIntention,
    deleteIntention
  } from './database.js';
  import {
    initializeSearchModel,
    searchIntentions,
    batchEmbedIntentions
  } from './intention-search-engine.js';
  import { getMockIntentions } from './mock-data.js';
  import IntentionCard from './components/IntentionCard.svelte';
  import VoiceRecorder from './components/VoiceRecorder.svelte';
  import CreateIntentionForm from './components/CreateIntentionForm.svelte';
  import IntentionDetail from './components/IntentionDetail.svelte';

  // Props
  export let userLocation = null; // [latitude, longitude]

  // State
  let currentScreen = 'auth'; // 'auth' | 'search' | 'decision' | 'detail'
  let searchQuery = '';
  let searchResults = [];
  let allIntentions = [];
  let selectedIntention = null;
  let showCreateForm = false;
  let activeIntentionId = null;

  // Roller wheel state
  let searchHistory = [
    'guidance on my next steps',
    'connection with like minds',
    'clarity in my purpose'
  ];
  let suggestions = [
    'abundance in unexpected forms',
    'healing energy for my body',
    'opportunities to serve others'
  ];

  // Auto-resize textarea
  let textareaElement;
  $: if (textareaElement && searchQuery !== undefined) {
    textareaElement.style.height = 'auto';
    textareaElement.style.height = textareaElement.scrollHeight + 'px';
  }

  // Auth & Database
  let credential = null;
  let isAuthenticated = false;
  let orbitdbInstances = null;
  let database = null;
  let loading = false;
  let status = 'initializing';
  let webAuthnSupported = false;

  // ML Model
  let modelLoaded = false;

  // Particles
  let particlesContainer;

  onMount(async () => {
    await initializeApp();
    createParticles();
    // Load active intention from localStorage
    const storedActiveIntention = localStorage.getItem('active-intention-id');
    if (storedActiveIntention) {
      activeIntentionId = storedActiveIntention;
    }
  });

  onDestroy(async () => {
    if (orbitdbInstances) {
      await cleanup({ ...orbitdbInstances, database });
    }
  });

  // Create ambient floating particles
  function createParticles() {
    if (!particlesContainer) return;

    const particleCount = 20;
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.animationDelay = Math.random() * 15 + 's';
      particle.style.animationDuration = (10 + Math.random() * 10) + 's';
      particlesContainer.appendChild(particle);
    }
  }

  async function initializeApp() {
    try {
      // Check WebAuthn support
      const support = await checkWebAuthnSupport();
      webAuthnSupported = support.supported;

      if (!support.supported) {
        status = 'unsupported';
        return;
      }

      status = 'ready';

      // Load stored credential
      credential = loadStoredCredential();
    } catch (error) {
      console.error('Initialization failed:', error);
      status = 'error';
    }
  }

  function loadStoredCredential() {
    try {
      const stored = localStorage.getItem('webauthn-credential');
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...parsed,
          rawCredentialId: new Uint8Array(parsed.rawCredentialId),
          attestationObject: new Uint8Array(parsed.attestationObject),
          publicKey: {
            ...parsed.publicKey,
            x: new Uint8Array(parsed.publicKey.x),
            y: new Uint8Array(parsed.publicKey.y)
          }
        };
      }
    } catch (error) {
      console.warn('Failed to load credential:', error);
      localStorage.removeItem('webauthn-credential');
    }
    return null;
  }

  function storeCredential(cred) {
    const serialized = {
      ...cred,
      rawCredentialId: Array.from(cred.rawCredentialId),
      attestationObject: Array.from(cred.attestationObject),
      publicKey: {
        ...cred.publicKey,
        x: Array.from(cred.publicKey.x),
        y: Array.from(cred.publicKey.y)
      }
    };
    localStorage.setItem('webauthn-credential', JSON.stringify(serialized));
  }

  async function createCredential() {
    try {
      loading = true;
      status = 'creating';

      credential = await WebAuthnDIDProvider.createCredential({
        userId: `syncengine-user-${Date.now()}`,
        displayName: 'SyncEngine User'
      });

      storeCredential(credential);
      status = 'created';
    } catch (error) {
      console.error('Credential creation failed:', error);
      status = 'error';
    } finally {
      loading = false;
    }
  }

  async function authenticate() {
    try {
      loading = true;
      status = 'authenticating';

      // Setup OrbitDB
      orbitdbInstances = await setupOrbitDB(credential);

      // Open intentions database
      database = await openIntentionsDatabase(
        orbitdbInstances.orbitdb,
        orbitdbInstances.identity,
        orbitdbInstances.identities
      );

      // Load existing intentions
      allIntentions = await loadIntentions(database);

      // Show dashboard immediately after authentication succeeds
      isAuthenticated = true;
      currentScreen = 'search';
      status = 'ready';
      loading = false;

      // Load ML model in background (non-blocking)
      status = 'loading-model-background';
      loadModelInBackground();
    } catch (error) {
      console.error('Authentication failed:', error);
      status = 'auth-failed';
      loading = false;
    }
  }

  async function loadModelInBackground() {
    try {
      await initializeSearchModel();
      modelLoaded = true;
      console.log('✅ ML model loaded, semantic search enabled');

      // Batch embed intentions that don't have embeddings
      if (allIntentions.length > 0) {
        status = 'embedding';
        allIntentions = await batchEmbedIntentions(
          allIntentions,
          (done, total) => {
            status = `embedding-${done}/${total}`;
          }
        );
      }

      status = 'ready';
    } catch (mlError) {
      console.error('⚠️ ML model loading failed:', mlError);
      console.warn('App will use keyword search instead');
      modelLoaded = false;
      status = 'demo-mode';
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) {
      status = 'empty-query';
      return;
    }

    try {
      loading = true;

      // Check if model is still loading
      if (!modelLoaded && status.includes('loading-model')) {
        status = 'waiting-for-model';
        // Wait a moment and show message
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (!modelLoaded) {
          status = 'model-not-ready';
          loading = false;
          return;
        }
      }

      status = 'searching';

      // Add to search history
      searchHistory = [...searchHistory, searchQuery.trim()];
      if (searchHistory.length > 10) searchHistory.shift();

      // Use mock data for demo if no real data or ML not loaded
      const intentionsToSearch =
        allIntentions.length > 0 ? allIntentions : getMockIntentions();

      if (modelLoaded) {
        // Perform ML-powered vector search
        searchResults = await searchIntentions(searchQuery, intentionsToSearch, {
          userLocation,
          semanticWeight: 0.7,
          geoWeight: 0.3,
          minScore: 0.1,
          maxResults: 50
        });
        status = `found-${searchResults.length}`;
      } else {
        // Fallback to simple keyword matching
        const lowerQuery = searchQuery.toLowerCase();
        searchResults = intentionsToSearch
          .filter(
            (intention) =>
              intention.title.toLowerCase().includes(lowerQuery) ||
              intention.description?.toLowerCase().includes(lowerQuery) ||
              intention.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
          )
          .map((intention) => ({
            ...intention,
            score: { combined: 0.5, semantic: 0.5, geo: 0 },
            dimensions: { width: 280, height: 173 },
            matchPercentage: 50
          }));
        status = `found-${searchResults.length}-kw`;
      }

      currentScreen = 'decision';
    } catch (error) {
      console.error('Search failed:', error);
      status = 'search-failed';
    } finally {
      loading = false;
    }
  }

  function handleVoiceSubmit(event) {
    const { type, count, totalDuration, query } = event.detail;

    if (type === 'text') {
      // Text submission - trigger search
      handleSearch();
    } else if (type === 'voice') {
      // Voice recording submission
      status = `voice-${count}-recordings`;

      // For now, show a status message
      // In a real app, you'd send the recordings to a transcription service
      console.log(`Received ${count} voice recordings (${totalDuration}s total)`);

      // You could process the recordings here and convert to search query
      // For demo purposes, we'll just update the status
      setTimeout(() => {
        status = 'ready';
      }, 2000);
    }
  }

  function selectIntention(intention) {
    selectedIntention = intention;
    currentScreen = 'detail';
  }

  function closeDetail() {
    currentScreen = 'decision';
    selectedIntention = null;
  }

  async function handleCreateIntention(event) {
    if (!database) return;

    try {
      loading = true;
      status = 'creating-intention';

      const newIntention = await createIntention(database, event.detail, credential);

      // Reload intentions
      allIntentions = await loadIntentions(database);

      // Navigate to detail page with the new intention
      selectedIntention = newIntention;
      currentScreen = 'detail';

      // Make it the active intention
      await handleMakeActive({ detail: { intentionId: newIntention.intentionId } });

      status = 'created';
    } catch (error) {
      console.error('Failed to create intention:', error);
      status = 'create-failed';
    } finally {
      loading = false;
    }
  }

  async function handleMakeActive(event) {
    const intentionId = event.detail.intentionId;

    if (!credential) {
      status = 'auth-required';
      console.error('Authentication required to set active intention');
      return;
    }

    try {
      status = 'authenticating-switch';

      // Create WebAuthn provider for signing
      const { WebAuthnDIDProvider } = await import('@le-space/orbitdb-identity-provider-webauthn-did');
      const webauthnProvider = new WebAuthnDIDProvider(credential);

      // Create attention-switch event
      const switchEvent = {
        type: 'attention-switch',
        intentionId,
        timestamp: Date.now(),
        identity: orbitdbInstances?.identity?.id
      };

      // Sign with biometric authentication
      console.log('🔐 Requesting biometric authentication...');
      const signature = await webauthnProvider.sign(JSON.stringify(switchEvent));

      // Create signed event
      const signedEvent = {
        ...switchEvent,
        signature
      };

      console.log('✅ Attention switch authenticated:', {
        intentionId: intentionId.substring(0, 16) + '...',
        authenticated: true,
        timestamp: switchEvent.timestamp
      });

      // Store active intention
      activeIntentionId = intentionId;
      localStorage.setItem('active-intention-id', intentionId);

      // Store signed event for audit trail
      const eventLog = JSON.parse(localStorage.getItem('attention-switch-log') || '[]');
      eventLog.push(signedEvent);
      // Keep only last 50 events
      if (eventLog.length > 50) eventLog.shift();
      localStorage.setItem('attention-switch-log', JSON.stringify(eventLog));

      status = 'activated';
    } catch (error) {
      console.error('Failed to authenticate attention switch:', error);

      if (error.message.includes('cancelled')) {
        status = 'auth-cancelled';
      } else {
        status = 'auth-failed';
      }
    }
  }

  async function handleLogout() {
    if (orbitdbInstances) {
      await cleanup({ ...orbitdbInstances, database });
    }

    credential = null;
    isAuthenticated = false;
    database = null;
    orbitdbInstances = null;
    allIntentions = [];
    searchResults = [];
    currentScreen = 'auth';
    localStorage.removeItem('webauthn-credential');
    status = 'logged-out';
  }

  // Handle clicks on history or suggestion items
  function handleRollerItemClick(text) {
    searchQuery = text;
  }

  // Get last 3 history items for display
  function getDisplayHistory() {
    return searchHistory.slice(-3);
  }

  // Status text helper
  function getStatusText(status) {
    const statusMap = {
      'initializing': 'initializing',
      'ready': 'ready',
      'unsupported': 'webauthn not supported',
      'creating': 'creating credential',
      'created': 'credential created',
      'authenticating': 'authenticating',
      'loading-model': 'loading ML model',
      'loading-model-background': 'loading search engine...',
      'embedding': 'generating embeddings',
      'demo-mode': 'ready (keyword search)',
      'auth-failed': 'authentication failed',
      'searching': 'searching',
      'found': 'results found',
      'empty-query': 'enter search query',
      'search-failed': 'search failed',
      'waiting-for-model': 'search engine loading...',
      'model-not-ready': 'search engine not ready, try again',
      'creating-intention': 'creating',
      'created': 'created',
      'authenticating-switch': 'authenticating...',
      'activated': 'intention activated',
      'auth-required': 'authentication required',
      'auth-cancelled': 'authentication cancelled',
      'logged-out': 'logged out',
      'error': 'error occurred',
      'voice-error': 'voice error'
    };

    if (status.startsWith('found-')) {
      const parts = status.split('-');
      return `found ${parts[1]} results${parts[2] === 'kw' ? ' (keyword)' : ''}`;
    }

    if (status.startsWith('embedding-')) {
      const parts = status.split('-');
      return `generating embeddings ${parts[1]}`;
    }

    return statusMap[status] || 'listening';
  }
</script>

<div class="container">
  <!-- Glowing moss green edges -->
  <div class="edge-glow edge-top"></div>
  <div class="edge-glow edge-bottom"></div>
  <div class="edge-glow edge-left"></div>
  <div class="edge-glow edge-right"></div>

  <!-- Ambient particles -->
  <div class="particles" bind:this={particlesContainer}></div>

  <!-- Header -->
  <header class="header">
    <h1 class="logo logo-glow">Synchronicity Engine</h1>
    <div class="status-indicator">
      <div class="status-dot status-pulse"></div>
      <span>{getStatusText(status)}</span>
    </div>
  </header>

  <!-- Main content -->
  <main class="main">
    <!-- AUTH SCREEN -->
    {#if currentScreen === 'auth'}
      <div class="auth-content">
        <h2 class="auth-title">Enter the Field</h2>
        <p class="auth-subtitle">Biometric authentication required</p>

        {#if !credential}
          <button
            on:click={createCredential}
            disabled={loading || !webAuthnSupported}
            class="primary"
          >
            {loading ? 'Creating...' : 'Create Credential'}
          </button>
        {:else}
          <button
            on:click={authenticate}
            disabled={loading}
            class="primary"
          >
            {loading ? 'Authenticating...' : 'Authenticate'}
          </button>
        {/if}

        {#if !webAuthnSupported}
          <p class="error-text">WebAuthn not supported in this browser</p>
        {/if}
      </div>
    {/if}

    <!-- SEARCH SCREEN -->
    {#if currentScreen === 'search'}
      <div class="search-layout">
        <div class="roller-container">
          <div class="roller-wheel">
            <!-- History items - rainbow from violet -->
            {#each getDisplayHistory() as historyText, i}
              {#if i === 0}
                <div
                  class="roller-item history history-3"
                  on:click={() => handleRollerItemClick(historyText)}
                  on:keydown={(e) => e.key === 'Enter' && handleRollerItemClick(historyText)}
                  role="button"
                  tabindex="0"
                >
                  {historyText}
                </div>
              {:else if i === 1}
                <div
                  class="roller-item history history-2"
                  on:click={() => handleRollerItemClick(historyText)}
                  on:keydown={(e) => e.key === 'Enter' && handleRollerItemClick(historyText)}
                  role="button"
                  tabindex="0"
                >
                  {historyText}
                </div>
              {:else if i === 2}
                <div
                  class="roller-item history history-1"
                  on:click={() => handleRollerItemClick(historyText)}
                  on:keydown={(e) => e.key === 'Enter' && handleRollerItemClick(historyText)}
                  role="button"
                  tabindex="0"
                >
                  {historyText}
                </div>
              {/if}
            {/each}

            <!-- Current input - focal point -->
            <div class="roller-item current">
              <textarea
                bind:this={textareaElement}
                class="terminal-input"
                bind:value={searchQuery}
                on:keydown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                on:input={() => {
                  if (textareaElement) {
                    textareaElement.style.height = 'auto';
                    textareaElement.style.height = textareaElement.scrollHeight + 'px';
                  }
                }}
                placeholder="I am open to receiving..."
                autocomplete="off"
                spellcheck="false"
                disabled={loading}
                rows="1"
              />
            </div>

            <!-- Suggestions - rainbow to red -->
            {#each suggestions as suggestionText, i}
              {#if i === 0}
                <div
                  class="roller-item suggestion suggestion-1"
                  on:click={() => handleRollerItemClick(suggestionText)}
                  on:keydown={(e) => e.key === 'Enter' && handleRollerItemClick(suggestionText)}
                  role="button"
                  tabindex="0"
                >
                  {suggestionText}
                </div>
              {:else if i === 1}
                <div
                  class="roller-item suggestion suggestion-2"
                  on:click={() => handleRollerItemClick(suggestionText)}
                  on:keydown={(e) => e.key === 'Enter' && handleRollerItemClick(suggestionText)}
                  role="button"
                  tabindex="0"
                >
                  {suggestionText}
                </div>
              {:else if i === 2}
                <div
                  class="roller-item suggestion suggestion-3"
                  on:click={() => handleRollerItemClick(suggestionText)}
                  on:keydown={(e) => e.key === 'Enter' && handleRollerItemClick(suggestionText)}
                  role="button"
                  tabindex="0"
                >
                  {suggestionText}
                </div>
              {/if}
            {/each}
          </div>
        </div>

        <!-- Voice Interface - Fixed bottom right -->
        <div class="voice-interface-container">
          <VoiceRecorder bind:searchQuery on:submit={handleVoiceSubmit} />
        </div>
      </div>
    {/if}

    <!-- DECISION SCREEN (Results + Create) -->
    {#if currentScreen === 'decision'}
      <div class="decision-layout">
        <!-- Top Half: Results Gallery -->
        <div class="results-section">
          <div class="section-header">
            <button on:click={() => (currentScreen = 'search')} class="back-button">
              ← back
            </button>
            <div class="results-count">
              found {searchResults.length} results
            </div>
          </div>

          <div class="results-scroll">
            {#if searchResults.length > 0}
              <div class="results-grid">
                {#each searchResults as result}
                  <IntentionCard
                    intention={result}
                    score={result.score.combined}
                    onClick={() => selectIntention(result)}
                  />
                {/each}
              </div>
            {:else}
              <div class="empty-state">
                <p>no intentions found. try a different search or create a new intention.</p>
              </div>
            {/if}
          </div>
        </div>

        <!-- Bottom Half: Create Form -->
        <div class="create-section">
          <div class="section-header">
            <h3>create intention</h3>
          </div>
          <div class="form-scroll">
            <CreateIntentionForm
              initialTitle={searchQuery}
              on:create={handleCreateIntention}
              on:cancel={() => (currentScreen = 'search')}
            />
          </div>
        </div>
      </div>
    {/if}

    <!-- DETAIL SCREEN -->
    {#if currentScreen === 'detail' && selectedIntention}
      <IntentionDetail
        intention={selectedIntention}
        userIdentity={orbitdbInstances?.identity?.id}
        activeIntentionId={activeIntentionId}
        on:close={closeDetail}
        on:makeActive={handleMakeActive}
      />
    {/if}
  </main>

  <!-- Footer -->
  <footer class="footer">
    <div>v0.1.0 · intention field</div>
    <nav class="footer-nav">
      <a href="#intentions">intentions</a>
      <a href="#gratitude">gratitude</a>
      <a href="#field">field</a>
    </nav>
  </footer>
</div>

<style>
  /* ===== Container ===== */
  .container {
    position: relative;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  /* ===== Header ===== */
  .header {
    padding: 2rem 2.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    z-index: 2;
  }

  .logo {
    font-family: var(--font-serif);
    font-weight: 300;
    font-size: 1.75rem;
    letter-spacing: 0.15em;
    color: var(--white);
    margin: 0;
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: var(--lilac);
    opacity: 0.7;
    font-family: var(--font-mono);
  }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--lilac);
  }

  /* ===== Main Content ===== */
  .main {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 2.5rem;
    position: relative;
    z-index: 2;
  }

  /* ===== Auth Screen ===== */
  .auth-content {
    max-width: 500px;
    width: 100%;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .auth-title {
    font-family: var(--font-serif);
    font-size: 2.5rem;
    color: var(--white);
    margin: 0;
  }

  .auth-subtitle {
    color: var(--white-dim);
    font-size: 1rem;
    margin: -0.5rem 0 0 0;
  }

  .error-text {
    color: var(--red);
    font-size: 0.875rem;
    margin: 0;
  }

  /* ===== Search Screen - Single Layout ===== */
  .search-layout {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    max-width: 1600px;
    height: 100%;
    position: relative;
  }

  .voice-interface-container {
    position: fixed;
    bottom: 88px;
    right: 2rem;
    width: auto;
    max-width: 280px;
    max-height: 500px;
    z-index: 100;
  }

  /* ===== Search Screen - Roller Wheel ===== */
  .roller-container {
    width: 100%;
    max-width: 700px;
    position: relative;
  }

  .roller-wheel {
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }

  /* Individual roller items */
  .roller-item {
    padding: 0.5rem 0;
    font-family: var(--font-mono);
    font-size: 0.9375rem;
    font-weight: 300;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: left;
  }

  /* History items - above current */
  .roller-item.history {
    cursor: pointer;
    transition: all 0.3s ease;
    color: var(--white);
  }

  .roller-item.history:hover {
    opacity: 1 !important;
  }

  .roller-item.history-3 {
    opacity: 0.50;
    font-size: 0.8125rem;
  }

  .roller-item.history-2 {
    opacity: 0.65;
    font-size: 0.875rem;
  }

  .roller-item.history-1 {
    opacity: 0.80;
    font-size: 0.9375rem;
    padding-bottom: 0.125rem;
  }

  /* Current input - the focal point */
  .roller-item.current {
    position: relative;
    background: transparent;
    padding: 0;
    margin: 0;
    opacity: 1;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .terminal-prompt {
    color: var(--moss-glow);
    font-family: var(--font-mono);
    font-size: 0.875rem;
    font-weight: 400;
    white-space: nowrap;
    opacity: 0.8;
  }

  .terminal-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    font-family: var(--font-mono);
    font-size: 1.62rem;
    font-weight: 300;
    color: #39ff14;
    caret-color: #39ff14;
    line-height: 1.2;
    resize: none;
    overflow: hidden;
    min-height: 1.2em;
  }

  .terminal-input::placeholder {
    color: rgba(57, 255, 20, 0.5);
    font-style: italic;
  }

  /* Suggestion items - below current */
  .roller-item.suggestion {
    cursor: pointer;
    transition: all 0.3s ease;
    color: var(--cyan-dim);
  }

  .roller-item.suggestion:hover {
    color: var(--cyan);
    opacity: 0.90 !important;
  }

  .roller-item.suggestion-1 {
    opacity: 0.75;
    font-size: 0.9375rem;
    padding-top: 0.125rem;
  }

  .roller-item.suggestion-2 {
    opacity: 0.70;
    font-size: 0.875rem;
  }

  .roller-item.suggestion-3 {
    opacity: 0.65;
    font-size: 0.8125rem;
  }

  /* ===== Decision Screen - Vertical Split Layout ===== */
  .decision-layout {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 1600px;
    height: 100%;
    gap: 0;
  }

  /* Top Half: Results Section */
  .results-section {
    flex: 0 0 50%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding-bottom: 1.5rem;
  }

  /* Bottom Half: Create Section */
  .create-section {
    flex: 0 0 50%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding-top: 1.5rem;
    border-top: 1px solid rgba(124, 184, 124, 0.15);
  }

  /* Section Headers */
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 1.5rem 1.5rem;
    flex-shrink: 0;
  }

  .section-header h3 {
    font-family: var(--font-mono);
    font-size: 0.875rem;
    font-weight: 400;
    letter-spacing: 0.05em;
    color: var(--cyan);
    margin: 0;
    text-transform: lowercase;
  }

  .back-button {
    background: transparent;
    border: none;
    color: var(--cyan);
    font-size: 0.875rem;
    font-family: var(--font-mono);
    padding: 0.5rem 1rem;
    cursor: pointer;
    transition: all 0.3s ease;
    opacity: 0.8;
  }

  .back-button:hover {
    color: var(--moss-glow);
    opacity: 1;
  }

  .results-count {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--moss-glow);
    opacity: 0.7;
    letter-spacing: 0.05em;
  }

  /* Scrollable Areas */
  .results-scroll {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0 1.5rem;
  }

  .form-scroll {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0 1.5rem;
  }

  /* Results Grid */
  .results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
    align-items: start;
    padding-bottom: 1.5rem;
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    text-align: center;
    padding: 3rem 1.5rem;
  }

  .empty-state p {
    color: var(--white-dim);
    font-family: var(--font-mono);
    font-size: 0.875rem;
    line-height: 1.6;
    max-width: 400px;
    margin: 0;
  }

  /* ===== Footer ===== */
  .footer {
    padding: 1.5rem 2.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.6875rem;
    color: var(--white);
    opacity: 0.3;
    position: relative;
    z-index: 2;
  }

  .footer-nav {
    display: flex;
    gap: 1.5rem;
  }

  .footer-nav a {
    color: inherit;
    text-decoration: none;
    transition: opacity 0.2s ease;
  }

  .footer-nav a:hover {
    opacity: 1;
    color: var(--moss-glow);
  }

  /* ===== Responsive ===== */
  @media (max-width: 768px) {
    .header {
      flex-direction: column;
      gap: 0.75rem;
      align-items: center;
      padding: 1.5rem;
    }

    .voice-interface-container {
      bottom: 88px;
      right: 1rem;
      width: auto;
      max-width: 240px;
      max-height: 400px;
    }

    .roller-container {
      max-width: 100%;
      padding: 0 1rem;
    }

    .roller-item.history,
    .roller-item.suggestion {
      padding-left: 0;
    }

    .roller-item.current {
      padding: 1rem 0;
    }

    .terminal-prompt {
      font-size: 0.75rem;
    }

    .terminal-input {
      font-size: 0.875rem;
    }

    .decision-layout {
      gap: 0.5rem;
    }

    .section-header {
      padding: 0 1rem 1rem;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .results-scroll,
    .form-scroll {
      padding: 0 1rem;
    }

    .results-grid {
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .footer {
      flex-direction: column;
      gap: 0.75rem;
      text-align: center;
    }
  }
</style>
