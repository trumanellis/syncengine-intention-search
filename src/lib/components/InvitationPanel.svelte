<script>
  /**
   * InvitationPanel Component - Terminal Aesthetic
   * Displays QR code and shareable link for database invitations
   */
  import { createEventDispatcher, onMount } from 'svelte';
  import QRCode from 'qrcode';

  const dispatch = createEventDispatcher();

  export let databaseAddress = '';
  export let peerCount = 0;
  export let isJoinedViaInvitation = false;

  let qrCodeDataURL = '';
  let magicLink = '';
  let copyStatus = '';

  $: if (databaseAddress) {
    generateMagicLink();
  }

  function generateMagicLink() {
    const baseURL = window.location.origin + window.location.pathname;
    const encodedAddress = encodeURIComponent(databaseAddress);
    magicLink = `${baseURL}?db=${encodedAddress}`;
    generateQRCode();
  }

  async function generateQRCode() {
    try {
      qrCodeDataURL = await QRCode.toDataURL(magicLink, {
        width: 256,
        margin: 2,
        color: {
          dark: '#39ff14',  // moss green
          light: '#0a0a0a'  // dark background
        }
      });
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(magicLink);
      copyStatus = 'copied!';
      setTimeout(() => {
        copyStatus = '';
      }, 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      copyStatus = 'failed';
      setTimeout(() => {
        copyStatus = '';
      }, 2000);
    }
  }

  function handleClose() {
    dispatch('close');
  }

  function handleLeaveDatabase() {
    if (confirm('Are you sure you want to leave this database and create a new one? This cannot be undone.')) {
      dispatch('leave');
    }
  }
</script>

<div class="invitation-panel">
  <div class="panel-header">
    <h3>Share Database</h3>
    <button class="close-btn" on:click={handleClose} title="Close">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
    </button>
  </div>

  <div class="panel-content">
    {#if isJoinedViaInvitation}
      <div class="status-banner joined">
        ✓ Joined via invitation
      </div>
    {/if}

    <div class="network-status">
      <div class="status-dot" class:active={peerCount > 0}></div>
      <span>{peerCount} peer{peerCount !== 1 ? 's' : ''} connected</span>
    </div>

    {#if qrCodeDataURL}
      <div class="qr-container">
        <img src={qrCodeDataURL} alt="QR Code for database invitation" class="qr-code" />
        <p class="qr-hint">Scan to join this database</p>
      </div>
    {/if}

    <div class="link-section">
      <label for="magic-link">Magic Link</label>
      <div class="link-input-group">
        <input
          id="magic-link"
          type="text"
          readonly
          value={magicLink}
          on:click={(e) => e.target.select()}
        />
        <button
          class="copy-btn"
          class:copied={copyStatus === 'copied!'}
          on:click={copyLink}
          title="Copy link"
        >
          {#if copyStatus}
            {copyStatus}
          {:else}
            Copy
          {/if}
        </button>
      </div>
    </div>

    <div class="address-section">
      <label for="db-address">Database Address</label>
      <input
        id="db-address"
        type="text"
        readonly
        value={databaseAddress}
        on:click={(e) => e.target.select()}
      />
    </div>

    <div class="actions">
      <button class="leave-btn" on:click={handleLeaveDatabase}>
        Leave Database
      </button>
    </div>

    {#if peerCount === 0}
      <div class="warning">
        ⚠️ No peers connected yet. Share the link above to invite others.
      </div>
    {/if}
  </div>
</div>

<style>
  .invitation-panel {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(10, 10, 10, 0.95);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--moss-green);
    border-radius: 12px;
    padding: 1.5rem;
    max-width: 400px;
    width: 90vw;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 0 30px rgba(57, 255, 20, 0.2);
    z-index: 1000;
    font-family: var(--font-mono);
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgba(124, 184, 124, 0.3);
  }

  .panel-header h3 {
    font-size: 1rem;
    font-weight: 400;
    color: var(--moss-glow);
    margin: 0;
    letter-spacing: 0.05em;
    text-transform: lowercase;
  }

  .close-btn {
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

  .close-btn:hover {
    opacity: 1;
    color: var(--moss-glow);
  }

  .panel-content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .status-banner {
    padding: 0.75rem 1rem;
    border-radius: 6px;
    font-size: 0.75rem;
    text-align: center;
  }

  .status-banner.joined {
    background: rgba(57, 255, 20, 0.1);
    border: 1px solid rgba(57, 255, 20, 0.3);
    color: var(--moss-glow);
  }

  .network-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 6px;
    font-size: 0.75rem;
    color: var(--white);
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--red);
    opacity: 0.5;
  }

  .status-dot.active {
    background: var(--moss-glow);
    opacity: 1;
    box-shadow: 0 0 8px var(--moss-glow);
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .qr-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 8px;
    border: 1px solid rgba(124, 184, 124, 0.2);
  }

  .qr-code {
    width: 256px;
    height: 256px;
    border-radius: 8px;
  }

  .qr-hint {
    font-size: 0.75rem;
    color: var(--lilac);
    opacity: 0.7;
    margin: 0;
  }

  .link-section,
  .address-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  label {
    font-size: 0.75rem;
    color: var(--moss-glow);
    text-transform: lowercase;
    letter-spacing: 0.05em;
  }

  input {
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(124, 184, 124, 0.3);
    border-radius: 6px;
    padding: 0.75rem;
    font-size: 0.75rem;
    color: var(--white);
    font-family: var(--font-mono);
    cursor: text;
  }

  input:focus {
    outline: none;
    border-color: var(--moss-glow);
    box-shadow: 0 0 10px rgba(57, 255, 20, 0.2);
  }

  .link-input-group {
    display: flex;
    gap: 0.5rem;
  }

  .link-input-group input {
    flex: 1;
  }

  .copy-btn {
    background: transparent;
    border: 1px solid var(--moss-green);
    border-radius: 6px;
    padding: 0.75rem 1rem;
    font-size: 0.75rem;
    color: var(--moss-glow);
    font-family: var(--font-mono);
    cursor: pointer;
    transition: all 0.3s ease;
    white-space: nowrap;
  }

  .copy-btn:hover {
    background: rgba(57, 255, 20, 0.1);
    border-color: var(--moss-glow);
  }

  .copy-btn.copied {
    background: rgba(57, 255, 20, 0.2);
    border-color: var(--moss-glow);
    color: var(--moss-glow);
  }

  .actions {
    display: flex;
    justify-content: center;
    margin-top: 0.5rem;
  }

  .leave-btn {
    background: transparent;
    border: 1px solid rgba(255, 51, 102, 0.3);
    border-radius: 6px;
    padding: 0.5rem 1rem;
    font-size: 0.75rem;
    color: var(--red);
    font-family: var(--font-mono);
    cursor: pointer;
    transition: all 0.3s ease;
    opacity: 0.6;
  }

  .leave-btn:hover {
    opacity: 1;
    background: rgba(255, 51, 102, 0.1);
    border-color: var(--red);
  }

  .warning {
    padding: 0.75rem 1rem;
    background: rgba(255, 165, 0, 0.1);
    border: 1px solid rgba(255, 165, 0, 0.3);
    border-radius: 6px;
    font-size: 0.7rem;
    color: #ffa500;
    text-align: center;
  }

  /* Scrollbar */
  .invitation-panel::-webkit-scrollbar {
    width: 6px;
  }

  .invitation-panel::-webkit-scrollbar-track {
    background: transparent;
  }

  .invitation-panel::-webkit-scrollbar-thumb {
    background: var(--moss-green);
    border-radius: 3px;
  }

  .invitation-panel::-webkit-scrollbar-thumb:hover {
    background: var(--moss-glow);
  }

  @media (max-width: 768px) {
    .invitation-panel {
      max-width: 95vw;
      padding: 1rem;
    }

    .qr-code {
      width: 200px;
      height: 200px;
    }
  }
</style>
