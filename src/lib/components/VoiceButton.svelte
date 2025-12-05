<script>
  /**
   * VoiceButton Component - Terminal Aesthetic
   * Button for triggering voice recognition input
   */
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { VoiceRecognition, checkVoiceSupport } from '../voice.js';

  const dispatch = createEventDispatcher();

  let voiceRecognition = new VoiceRecognition();
  let isListening = false;
  let isSupported = false;
  let supportMessage = '';

  // Check voice support on mount
  const support = checkVoiceSupport();
  isSupported = support.supported;
  supportMessage = support.message;

  async function handleVoiceClick() {
    if (!isSupported) {
      dispatch('error', { message: supportMessage });
      return;
    }

    if (isListening) {
      voiceRecognition.stop();
      isListening = false;
      return;
    }

    try {
      isListening = true;
      dispatch('start');

      const transcript = await voiceRecognition.start({
        lang: 'en-US',
        continuous: false,
        interimResults: false
      });

      isListening = false;
      dispatch('transcript', { transcript });
    } catch (error) {
      isListening = false;
      console.error('Voice recognition error:', error);
      dispatch('error', { message: error.message });
    }
  }

  onDestroy(() => {
    voiceRecognition.destroy();
  });
</script>

<button
  class="voice-button"
  class:listening={isListening}
  class:disabled={!isSupported}
  on:click={handleVoiceClick}
  disabled={!isSupported}
  title={isSupported ? 'Click to speak' : supportMessage}
  aria-label={isListening ? 'Stop listening' : 'Start voice input'}
>
  <span class="icon" class:pulse={isListening}>
    {#if isListening}
      🎤
    {:else}
      🎙️
    {/if}
  </span>

  {#if !isSupported}
    <span class="sr-only">{supportMessage}</span>
  {/if}
</button>

<style>
  .voice-button {
    background: transparent;
    border: 1px solid var(--moss-green);
    border-radius: var(--radius-md);
    padding: 0.75rem 1.25rem;
    font-size: 1.5rem;
    cursor: pointer;
    transition: all var(--transition-base);
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 60px;
  }

  .voice-button:hover:not(.disabled) {
    border-color: var(--neon-green);
    box-shadow: 0 0 15px rgba(57, 255, 20, 0.3);
  }

  .voice-button.listening {
    border-color: var(--neon-green);
    background: rgba(57, 255, 20, 0.1);
    box-shadow: 0 0 20px rgba(57, 255, 20, 0.4);
  }

  .voice-button.disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .icon {
    display: inline-block;
    transition: transform var(--transition-base);
  }

  .icon.pulse {
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.2);
    }
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
</style>
