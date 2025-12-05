<script>
  /**
   * IntentionCard Component - Terminal Aesthetic
   * Golden-ratio sized card that scales based on relevance score
   */
  export let intention;
  export let score = 1.0; // Relevance score 0-1
  export let onClick = () => {};

  const PHI = 1.618; // Golden ratio
  const baseWidth = 320;
  const scaleFactor = 0.5 + score * 0.5; // Range: 0.5 to 1.0
  const width = Math.round(baseWidth * scaleFactor);
  const height = Math.round(width / PHI);

  const matchPercentage = Math.round(score * 100);

  // Format timestamp
  function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Truncate description
  function truncate(text, maxLength = 120) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }

  // Get category color
  function getCategoryColor(category) {
    const colors = {
      request: 'var(--cyan)',
      offer: 'var(--gold)',
      collective: 'var(--lilac)'
    };
    return colors[category] || 'var(--white)';
  }
</script>

<div
  class="intention-card"
  style="width: {width}px; min-height: {height}px;"
  on:click={onClick}
  on:keydown={(e) => e.key === 'Enter' && onClick()}
  role="button"
  tabindex="0"
>
  <div class="score-badge">
    {matchPercentage}%
  </div>

  {#if intention.category}
    <div class="category-tag" style="color: {getCategoryColor(intention.category)};">
      {intention.category}
    </div>
  {/if}

  <h3 class="title">{intention.title}</h3>

  {#if intention.description}
    <p class="description">{truncate(intention.description)}</p>
  {/if}

  <div class="meta">
    <div class="location">
      {#if intention.location}
        <span>{intention.location}</span>
      {:else}
        <span class="no-location">remote</span>
      {/if}
    </div>

    <div class="date">{formatDate(intention.createdAt)}</div>
  </div>

  {#if intention.tags && intention.tags.length > 0}
    <div class="tags">
      {#each intention.tags.slice(0, 3) as tag}
        <span class="tag">{tag}</span>
      {/each}
    </div>
  {/if}
</div>

<style>
  .intention-card {
    position: relative;
    background: rgba(20, 20, 20, 0.6);
    border: 1px solid var(--moss-green);
    border-radius: 0.75rem;
    padding: 1.5rem;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .intention-card:hover {
    border-color: var(--moss-glow);
    transform: translateY(-4px);
    box-shadow: 0 0 20px rgba(124, 184, 124, 0.2);
    background: rgba(20, 20, 20, 0.8);
  }

  .intention-card:focus {
    outline: 2px solid var(--cyan);
    outline-offset: 2px;
  }

  .score-badge {
    position: absolute;
    top: 1rem;
    right: 1rem;
    color: var(--gold);
    background: rgba(212, 175, 55, 0.15);
    padding: 0.25rem 0.75rem;
    border-radius: 0.5rem;
    font-size: 0.75rem;
    font-weight: 400;
    border: 1px solid rgba(212, 175, 55, 0.3);
    font-family: var(--font-mono);
  }

  .category-tag {
    position: absolute;
    top: 1rem;
    left: 1rem;
    font-size: 0.65rem;
    font-weight: 400;
    letter-spacing: 0.05em;
    opacity: 0.7;
    font-family: var(--font-mono);
    text-transform: lowercase;
  }

  .title {
    font-family: var(--font-serif);
    color: var(--white);
    font-size: 1.125rem;
    font-weight: 400;
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
    line-height: 1.3;
  }

  .description {
    color: var(--white-dim);
    font-size: 0.875rem;
    line-height: 1.6;
    margin: 0;
    font-family: var(--font-mono);
    font-weight: 300;
  }

  .meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: auto;
    padding-top: 0.75rem;
    border-top: 1px solid rgba(124, 184, 124, 0.15);
    font-family: var(--font-mono);
  }

  .location {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    color: var(--moss-glow);
  }

  .no-location {
    color: var(--white-dim);
    font-style: italic;
  }

  .date {
    font-size: 0.7rem;
    color: var(--lilac);
    opacity: 0.6;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .tag {
    font-size: 0.65rem;
    color: var(--cyan);
    background: rgba(0, 212, 170, 0.1);
    border: 1px solid rgba(0, 212, 170, 0.3);
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-family: var(--font-mono);
  }

  @media (max-width: 768px) {
    .intention-card {
      width: 100% !important;
      min-height: auto !important;
    }

    .title {
      font-size: 1rem;
    }

    .description {
      font-size: 0.8125rem;
    }
  }
</style>
