<script>
  /**
   * NetworkDiagnostics Component
   * Real-time P2P network diagnostics panel
   */
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let peerCount = 0;
  export let bootstrapConnected = 0;
  export let relayReservations = 0;
  export let multiaddrsCount = 0;
  export let discoveryMethod = 'none';
  export let lastPeerEvent = null;
  export let libp2p = null;
  export let connectionLogs = [];

  let expanded = false;
  let fullPeerIds = [];
  let logContainer = null;

  $: status = getStatusLevel(peerCount, bootstrapConnected, relayReservations);
  $: timeSinceLastEvent = lastPeerEvent ? getTimeSince(lastPeerEvent) : null;

  function getStatusLevel(peers, bootstrap, relay) {
    if (peers > 0 && relay > 0) return 'good';
    if (bootstrap > 0 || relay > 0) return 'connecting';
    return 'disconnected';
  }

  function getTimeSince(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }

  $: if (logContainer && connectionLogs.length > 0) {
    // Auto-scroll to bottom when new logs appear
    setTimeout(() => {
      if (logContainer) {
        logContainer.scrollTop = logContainer.scrollHeight;
      }
    }, 50);
  }

  function toggleExpanded() {
    expanded = !expanded;
    if (expanded && libp2p) {
      updateFullPeerIds();
    }
  }

  function getLogTypeClass(type) {
    if (type === 'peer:connect') return 'log-connect';
    if (type === 'peer:disconnect') return 'log-disconnect';
    if (type === 'peer:discovery') return 'log-discovery';
    if (type === 'bootstrap') return 'log-bootstrap';
    if (type === 'relay') return 'log-relay';
    return 'log-info';
  }

  function getLogEmoji(type) {
    if (type === 'peer:connect') return '🤝';
    if (type === 'peer:disconnect') return '👋';
    if (type === 'peer:discovery') return '🔍';
    if (type === 'bootstrap') return '🚀';
    if (type === 'relay') return '🔗';
    return 'ℹ️';
  }

  function formatLogTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 1
    });
  }

  function clearLogs() {
    dispatch('clearLogs');
  }

  function updateFullPeerIds() {
    if (!libp2p) return;
    try {
      const peers = libp2p.getPeers();
      fullPeerIds = peers.map(p => p.toString());
    } catch (error) {
      console.warn('Failed to get peer IDs:', error);
      fullPeerIds = [];
    }
  }

  async function copyDiagnostics() {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      peerCount,
      bootstrapConnected,
      relayReservations,
      multiaddrsCount,
      discoveryMethod,
      lastPeerEvent: lastPeerEvent ? new Date(lastPeerEvent).toISOString() : null,
      fullPeerIds
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
      alert('Network diagnostics copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy diagnostics:', error);
    }
  }
</script>

<div class="network-diagnostics" class:expanded>
  <!-- Compact View -->
  <button class="diagnostics-toggle" on:click={toggleExpanded} title="Network Diagnostics">
    <div class="status-dot" class:good={status === 'good'} class:connecting={status === 'connecting'} class:disconnected={status === 'disconnected'}></div>
    <span class="peer-count">{peerCount} peer{peerCount !== 1 ? 's' : ''}</span>
    <svg class="expand-icon" class:rotated={expanded} width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 5l3 3 3-3" />
    </svg>
  </button>

  <!-- Expanded View -->
  {#if expanded}
    <div class="diagnostics-panel">
      <div class="panel-header">
        <h4>Network Diagnostics</h4>
        <button class="copy-btn" on:click={copyDiagnostics} title="Copy diagnostics">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>
      </div>

      <!-- Connection Status Indicators -->
      <div class="status-indicators">
        <div class="status-row">
          <div class="status-indicator-item" class:active={peerCount > 0}>
            <div class="indicator-dot"></div>
            <span class="indicator-label">P2P Peers</span>
            <span class="indicator-value">{peerCount}</span>
          </div>
          <div class="status-indicator-item" class:active={bootstrapConnected > 0}>
            <div class="indicator-dot"></div>
            <span class="indicator-label">Bootstrap</span>
            <span class="indicator-value">{bootstrapConnected}/6</span>
          </div>
        </div>
        <div class="status-row">
          <div class="status-indicator-item" class:active={relayReservations > 0}>
            <div class="indicator-dot"></div>
            <span class="indicator-label">Relay</span>
            <span class="indicator-value">{relayReservations > 0 ? 'Active' : 'None'}</span>
          </div>
          <div class="status-indicator-item" class:active={multiaddrsCount > 0}>
            <div class="indicator-dot"></div>
            <span class="indicator-label">Addresses</span>
            <span class="indicator-value">{multiaddrsCount}</span>
          </div>
        </div>
      </div>

      <!-- Detailed Metrics -->
      <div class="diagnostics-grid">
        <div class="diagnostic-item">
          <span class="label">Discovery Method</span>
          <span class="value discovery-method">
            {discoveryMethod}
          </span>
        </div>

        {#if timeSinceLastEvent}
          <div class="diagnostic-item">
            <span class="label">Last Activity</span>
            <span class="value">{timeSinceLastEvent}</span>
          </div>
        {/if}
      </div>

      {#if fullPeerIds.length > 0}
        <div class="peer-list">
          <div class="peer-list-header">Connected Peer IDs:</div>
          {#each fullPeerIds as peerId}
            <div class="peer-id">{peerId.substring(0, 48)}...</div>
          {/each}
        </div>
      {/if}

      <!-- Connection Activity Log -->
      <div class="connection-log">
        <div class="log-header">
          <span>Connection Activity</span>
          <button class="clear-log-btn" on:click={clearLogs} title="Clear logs">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <div class="log-container" bind:this={logContainer}>
          {#if connectionLogs.length === 0}
            <div class="log-empty">No connection activity yet...</div>
          {:else}
            {#each connectionLogs as log}
              <div class="log-entry {getLogTypeClass(log.type)}">
                <span class="log-time">{formatLogTime(log.timestamp)}</span>
                <span class="log-emoji">{getLogEmoji(log.type)}</span>
                <span class="log-message">{log.message}</span>
              </div>
            {/each}
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .network-diagnostics {
    position: relative;
    font-family: var(--font-mono);
  }

  .diagnostics-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(124, 184, 124, 0.3);
    border-radius: 6px;
    padding: 0.5rem 0.75rem;
    font-size: 0.75rem;
    color: var(--white);
    font-family: var(--font-mono);
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .diagnostics-toggle:hover {
    background: rgba(0, 0, 0, 0.5);
    border-color: var(--moss-glow);
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--red);
    opacity: 0.5;
  }

  .status-dot.good {
    background: var(--moss-glow);
    opacity: 1;
    box-shadow: 0 0 8px var(--moss-glow);
    animation: pulse 2s ease-in-out infinite;
  }

  .status-dot.connecting {
    background: #ffa500;
    opacity: 0.8;
    animation: pulse 1s ease-in-out infinite;
  }

  .status-dot.disconnected {
    background: var(--red);
    opacity: 0.5;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .peer-count {
    color: var(--white);
    font-size: 0.75rem;
  }

  .expand-icon {
    transition: transform 0.3s ease;
    opacity: 0.6;
  }

  .expand-icon.rotated {
    transform: rotate(180deg);
  }

  .diagnostics-panel {
    position: absolute;
    top: calc(100% + 0.5rem);
    right: 0;
    background: rgba(10, 10, 10, 0.95);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--moss-green);
    border-radius: 8px;
    padding: 1rem;
    min-width: 280px;
    max-width: 400px;
    box-shadow: 0 0 30px rgba(57, 255, 20, 0.2);
    z-index: 1000;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid rgba(124, 184, 124, 0.3);
  }

  .panel-header h4 {
    font-size: 0.875rem;
    font-weight: 400;
    color: var(--moss-glow);
    margin: 0;
    letter-spacing: 0.05em;
  }

  .copy-btn {
    background: transparent;
    border: none;
    color: var(--white);
    cursor: pointer;
    padding: 0.25rem;
    opacity: 0.6;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
  }

  .copy-btn:hover {
    opacity: 1;
    color: var(--moss-glow);
  }

  .status-indicators {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .status-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .status-indicator-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(124, 184, 124, 0.2);
    border-radius: 6px;
    transition: all 0.3s ease;
  }

  .status-indicator-item.active {
    background: rgba(57, 255, 20, 0.05);
    border-color: var(--moss-glow);
  }

  .indicator-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--red);
    opacity: 0.5;
    flex-shrink: 0;
    transition: all 0.3s ease;
  }

  .status-indicator-item.active .indicator-dot {
    background: var(--moss-glow);
    opacity: 1;
    box-shadow: 0 0 8px var(--moss-glow);
    animation: pulse 2s ease-in-out infinite;
  }

  .indicator-label {
    font-size: 0.65rem;
    color: var(--lilac);
    opacity: 0.7;
    flex: 1;
    text-transform: lowercase;
  }

  .status-indicator-item.active .indicator-label {
    color: var(--moss-glow);
    opacity: 1;
  }

  .indicator-value {
    font-size: 0.75rem;
    color: var(--white);
    font-weight: 500;
    opacity: 0.6;
  }

  .status-indicator-item.active .indicator-value {
    color: var(--moss-glow);
    opacity: 1;
  }

  .diagnostics-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid rgba(124, 184, 124, 0.2);
  }

  .diagnostic-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .label {
    font-size: 0.65rem;
    color: var(--lilac);
    opacity: 0.7;
    text-transform: lowercase;
  }

  .value {
    font-size: 0.875rem;
    color: var(--white);
    font-weight: 500;
  }

  .value.good {
    color: var(--moss-glow);
  }

  .value.connecting {
    color: #ffa500;
  }

  .value.disconnected {
    color: var(--red);
    opacity: 0.7;
  }

  .value.discovery-method {
    text-transform: lowercase;
    color: var(--cyan);
  }

  .peer-list {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(124, 184, 124, 0.3);
  }

  .peer-list-header {
    font-size: 0.65rem;
    color: var(--lilac);
    opacity: 0.7;
    margin-bottom: 0.5rem;
    text-transform: lowercase;
  }

  .peer-id {
    font-size: 0.7rem;
    color: var(--white);
    opacity: 0.8;
    font-family: var(--font-mono);
    padding: 0.25rem 0.5rem;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 4px;
    margin-bottom: 0.25rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .connection-log {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(124, 184, 124, 0.3);
  }

  .log-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    font-size: 0.65rem;
    color: var(--lilac);
    opacity: 0.7;
    text-transform: lowercase;
  }

  .clear-log-btn {
    background: transparent;
    border: none;
    color: var(--white);
    cursor: pointer;
    padding: 0.25rem;
    opacity: 0.4;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
  }

  .clear-log-btn:hover {
    opacity: 1;
    color: var(--red);
  }

  .log-container {
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(124, 184, 124, 0.2);
    border-radius: 4px;
    padding: 0.5rem;
    max-height: 200px;
    overflow-y: auto;
    font-family: var(--font-mono);
    font-size: 0.7rem;
  }

  .log-container::-webkit-scrollbar {
    width: 4px;
  }

  .log-container::-webkit-scrollbar-track {
    background: transparent;
  }

  .log-container::-webkit-scrollbar-thumb {
    background: var(--moss-green);
    border-radius: 2px;
  }

  .log-empty {
    color: var(--white);
    opacity: 0.4;
    text-align: center;
    padding: 1rem 0;
    font-style: italic;
  }

  .log-entry {
    display: grid;
    grid-template-columns: auto auto 1fr;
    gap: 0.5rem;
    padding: 0.35rem 0.5rem;
    border-radius: 3px;
    margin-bottom: 0.25rem;
    transition: background 0.2s ease;
  }

  .log-entry:hover {
    background: rgba(57, 255, 20, 0.05);
  }

  .log-time {
    color: var(--lilac);
    opacity: 0.6;
    font-size: 0.65rem;
  }

  .log-emoji {
    font-size: 0.8rem;
  }

  .log-message {
    color: var(--white);
    opacity: 0.9;
    word-break: break-word;
  }

  .log-connect {
    border-left: 2px solid var(--moss-glow);
  }

  .log-disconnect {
    border-left: 2px solid var(--red);
  }

  .log-discovery {
    border-left: 2px solid var(--cyan);
  }

  .log-bootstrap {
    border-left: 2px solid #ffa500;
  }

  .log-relay {
    border-left: 2px solid var(--lilac);
  }

  .log-info {
    border-left: 2px solid rgba(255, 255, 255, 0.3);
  }

  @media (max-width: 768px) {
    .diagnostics-panel {
      right: auto;
      left: 0;
      max-width: 90vw;
    }

    .status-row {
      grid-template-columns: 1fr;
    }

    .diagnostics-grid {
      grid-template-columns: 1fr;
    }

    .log-container {
      max-height: 150px;
    }
  }
</style>
