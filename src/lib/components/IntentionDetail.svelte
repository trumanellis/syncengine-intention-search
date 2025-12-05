<script>
  /**
   * IntentionDetail Component - Terminal Aesthetic
   * Fullscreen detail view of an intention
   */
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let intention;
  export let userIdentity = null;
  export let activeIntentionId = null;

  function handleClose() {
    dispatch('close');
  }

  function handleMakeActive() {
    dispatch('makeActive', { intentionId: intention.intentionId });
  }

  $: isActiveIntention = activeIntentionId === intention.intentionId;

  function formatFullDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getCategoryColor(category) {
    const colors = {
      request: 'var(--cyan)',
      offer: 'var(--gold)',
      collective: 'var(--lilac)'
    };
    return colors[category] || 'var(--white)';
  }

  const isOwnIntention =
    userIdentity && intention.createdBy === userIdentity;
</script>

<div class="detail-overlay" on:click={handleClose} role="dialog" aria-modal="true">
  <div
    class="detail-container"
    on:click|stopPropagation
    role="document"
  >
    <button class="close-button" on:click={handleClose} aria-label="Close">
      ✕
    </button>

    <div class="detail-header">
      <div class="badges-row">
        {#if intention.category}
          <div
            class="category-badge"
            style="color: {getCategoryColor(intention.category)}; border-color: {getCategoryColor(intention.category)};"
          >
            {intention.category}
          </div>
        {/if}

        {#if isActiveIntention}
          <div class="active-badge">
            ★ active intention
          </div>
        {/if}
      </div>

      <h2 class="detail-title">{intention.title}</h2>

      <div class="meta-row">
        {#if intention.location}
          <div class="meta-item">
            <span>{intention.location}</span>
          </div>
        {/if}

        <div class="meta-item">
          <span>{formatFullDate(intention.createdAt)}</span>
        </div>
      </div>
    </div>

    <div class="detail-content">
      {#if intention.description}
        <div class="description-section">
          <h3>description</h3>
          <p>{intention.description}</p>
        </div>
      {/if}

      {#if intention.tags && intention.tags.length > 0}
        <div class="tags-section">
          <h3>tags</h3>
          <div class="tags">
            {#each intention.tags as tag}
              <span class="tag">{tag}</span>
            {/each}
          </div>
        </div>
      {/if}

      <div class="info-section">
        <h3>details</h3>
        <dl class="info-list">
          <div class="info-item">
            <dt>status</dt>
            <dd class="status-{intention.status}">{intention.status}</dd>
          </div>

          {#if intention.createdBy}
            <div class="info-item">
              <dt>created by</dt>
              <dd class="identity-id">
                {#if isOwnIntention}
                  <span class="badge-own">you</span>
                {:else}
                  {intention.createdBy.substring(0, 20)}...
                {/if}
              </dd>
            </div>
          {/if}

          {#if intention.updatedAt && intention.updatedAt !== intention.createdAt}
            <div class="info-item">
              <dt>last updated</dt>
              <dd>{formatFullDate(intention.updatedAt)}</dd>
            </div>
          {/if}
        </dl>
      </div>
    </div>

    <div class="detail-actions">
      {#if !isOwnIntention && !isActiveIntention}
        <button class="primary" on:click={handleMakeActive}>
          make active
        </button>
      {:else if !isOwnIntention && isActiveIntention}
        <button class="primary active-state" disabled>
          ★ this is your active intention
        </button>
      {/if}
      <button class="secondary" on:click={handleClose}>close</button>
    </div>
  </div>
</div>

<style>
  .detail-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(10, 10, 10, 0.95);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1.5rem;
    backdrop-filter: blur(4px);
  }

  .detail-container {
    position: relative;
    background: var(--black);
    border: 2px solid var(--moss-glow);
    border-radius: 0.75rem;
    max-width: 800px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    padding: 3rem;
    box-shadow: 0 0 40px rgba(124, 184, 124, 0.3);
  }

  .close-button {
    position: absolute;
    top: 1.5rem;
    right: 1.5rem;
    background: transparent;
    border: none;
    font-size: 1.5rem;
    color: var(--white-dim);
    cursor: pointer;
    padding: 0.5rem;
    line-height: 1;
    transition: color 0.3s ease;
  }

  .close-button:hover {
    color: var(--red);
  }

  .detail-header {
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid rgba(124, 184, 124, 0.2);
  }

  .badges-row {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
  }

  .category-badge {
    display: inline-block;
    font-size: 0.65rem;
    font-weight: 400;
    letter-spacing: 0.05em;
    padding: 0.25rem 0.75rem;
    border: 1px solid;
    border-radius: 0.5rem;
    font-family: var(--font-mono);
  }

  .active-badge {
    display: inline-block;
    font-size: 0.65rem;
    font-weight: 400;
    letter-spacing: 0.05em;
    padding: 0.25rem 0.75rem;
    border: 1px solid var(--gold);
    border-radius: 0.5rem;
    font-family: var(--font-mono);
    color: var(--gold);
    background: rgba(212, 175, 55, 0.1);
    animation: subtle-glow 3s ease-in-out infinite;
  }

  @keyframes subtle-glow {
    0%, 100% {
      box-shadow: 0 0 5px rgba(212, 175, 55, 0.2);
    }
    50% {
      box-shadow: 0 0 15px rgba(212, 175, 55, 0.4);
    }
  }

  .detail-title {
    font-family: var(--font-serif);
    color: var(--white);
    font-size: 2rem;
    font-weight: 300;
    line-height: 1.3;
    margin-bottom: 1rem;
  }

  .meta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    color: var(--moss-glow);
    font-size: 0.875rem;
    font-family: var(--font-mono);
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .detail-content {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .description-section h3,
  .tags-section h3,
  .info-section h3 {
    color: var(--cyan);
    font-size: 0.875rem;
    font-family: var(--font-mono);
    font-weight: 400;
    letter-spacing: 0.05em;
    margin-bottom: 1rem;
  }

  .description-section p {
    color: var(--white-dim);
    font-size: 0.9375rem;
    line-height: 1.8;
    white-space: pre-wrap;
    font-family: var(--font-mono);
    font-weight: 300;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .tag {
    background: rgba(0, 212, 170, 0.1);
    border: 1px solid rgba(0, 212, 170, 0.3);
    color: var(--cyan);
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-family: var(--font-mono);
  }

  .info-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .info-item {
    display: flex;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background: rgba(20, 20, 20, 0.6);
    border: 1px solid rgba(124, 184, 124, 0.15);
    border-radius: 0.5rem;
  }

  dt {
    color: var(--moss-glow);
    font-weight: 400;
    font-size: 0.75rem;
    font-family: var(--font-mono);
  }

  dd {
    color: var(--white);
    font-size: 0.75rem;
    margin: 0;
    font-family: var(--font-mono);
  }

  .identity-id {
    font-family: var(--font-mono);
    font-size: 0.7rem;
  }

  .badge-own {
    background: rgba(212, 175, 55, 0.15);
    border: 1px solid var(--gold);
    color: var(--gold);
    padding: 0.25rem 0.75rem;
    border-radius: 0.5rem;
    font-weight: 400;
  }

  .status-active {
    color: var(--cyan);
  }

  .status-completed {
    color: var(--gold);
  }

  .status-archived {
    color: var(--lilac);
  }

  .detail-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid rgba(124, 184, 124, 0.2);
  }

  .detail-actions button.active-state {
    background: rgba(212, 175, 55, 0.1);
    border-color: var(--gold);
    color: var(--gold);
    opacity: 0.8;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    .detail-overlay {
      padding: 0;
    }

    .detail-container {
      max-height: 100vh;
      border-radius: 0;
      padding: 1.5rem;
    }

    .detail-title {
      font-size: 1.5rem;
      padding-right: 2rem;
    }

    .meta-row {
      flex-direction: column;
      gap: 0.5rem;
    }

    .detail-actions {
      flex-direction: column-reverse;
    }

    button {
      width: 100%;
    }
  }
</style>
