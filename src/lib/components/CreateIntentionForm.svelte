<script>
  /**
   * CreateIntentionForm Component - Terminal Aesthetic
   * Form for creating new intentions
   */
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  let title = '';
  let description = '';
  let location = '';
  let category = 'general';
  let tags = '';
  let isSubmitting = false;
  let errorMessage = '';

  const categories = [
    { value: 'request', label: 'request' },
    { value: 'offer', label: 'offer' },
    { value: 'collective', label: 'collective' },
    { value: 'general', label: 'general' }
  ];

  async function handleSubmit() {
    errorMessage = '';

    if (!title.trim()) {
      errorMessage = 'title required';
      return;
    }

    if (title.length > 200) {
      errorMessage = 'title too long (max 200 chars)';
      return;
    }

    if (description.length > 2000) {
      errorMessage = 'description too long (max 2000 chars)';
      return;
    }

    isSubmitting = true;

    try {
      const intentionData = {
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        category,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t.length > 0)
      };

      dispatch('create', intentionData);

      // Reset form
      title = '';
      description = '';
      location = '';
      category = 'general';
      tags = '';
    } catch (error) {
      errorMessage = error.message;
    } finally {
      isSubmitting = false;
    }
  }

  function handleCancel() {
    dispatch('cancel');
  }
</script>

<div class="form-container">
  <form on:submit|preventDefault={handleSubmit} class="intention-form">
    <div class="form-group">
      <input
        id="title"
        type="text"
        bind:value={title}
        placeholder="i need help moving furniture..."
        maxlength="200"
        required
        disabled={isSubmitting}
        aria-label="title"
      />
      <div class="char-count">{title.length}/200</div>
    </div>

    <div class="form-group">
      <select id="category" bind:value={category} disabled={isSubmitting} aria-label="category">
        {#each categories as cat}
          <option value={cat.value}>{cat.label}</option>
        {/each}
      </select>
    </div>

    <div class="form-group">
      <textarea
        id="description"
        bind:value={description}
        placeholder="provide details about your intention..."
        rows="4"
        maxlength="2000"
        disabled={isSubmitting}
        aria-label="description"
      />
      <div class="char-count">{description.length}/2000</div>
    </div>

    <div class="form-group">
      <input
        id="location"
        type="text"
        bind:value={location}
        placeholder="oakland, ca"
        disabled={isSubmitting}
        aria-label="location"
      />
    </div>

    <div class="form-group">
      <input
        id="tags"
        type="text"
        bind:value={tags}
        placeholder="help-needed, moving, community-support"
        disabled={isSubmitting}
        aria-label="tags"
      />
    </div>

    {#if errorMessage}
      <div class="error-message" role="alert">
        {errorMessage}
      </div>
    {/if}

    <div class="form-actions">
      <button
        type="button"
        class="secondary"
        on:click={handleCancel}
        disabled={isSubmitting}
      >
        cancel
      </button>
      <button type="submit" class="primary" disabled={isSubmitting || !title.trim()}>
        {isSubmitting ? 'creating...' : 'create intention'}
      </button>
    </div>
  </form>
</div>

<style>
  .form-container {
    width: 100%;
  }

  .intention-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  input,
  textarea,
  select {
    background: transparent;
    border: 1px solid var(--moss-green);
    border-radius: 0.5rem;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
    color: var(--white);
    font-family: var(--font-mono);
    font-weight: 300;
    transition: all 0.3s ease;
  }

  input:focus,
  textarea:focus,
  select:focus {
    outline: none;
    border-color: var(--moss-glow);
    box-shadow: 0 0 15px rgba(124, 184, 124, 0.3);
  }

  input:disabled,
  textarea:disabled,
  select:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  textarea {
    resize: vertical;
    min-height: 100px;
  }

  .char-count {
    font-size: 0.65rem;
    color: var(--lilac);
    text-align: right;
    opacity: 0.6;
    font-family: var(--font-mono);
  }

  .error-message {
    background: rgba(255, 51, 102, 0.1);
    border: 1px solid rgba(255, 51, 102, 0.3);
    border-radius: 0.5rem;
    padding: 0.75rem 1rem;
    color: var(--red);
    font-size: 0.75rem;
    font-family: var(--font-mono);
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 1rem;
  }

  button {
    padding: 0.75rem 1.5rem;
    font-size: 0.875rem;
  }

  @media (max-width: 768px) {
    .form-actions {
      flex-direction: column-reverse;
    }

    button {
      width: 100%;
    }
  }
</style>
