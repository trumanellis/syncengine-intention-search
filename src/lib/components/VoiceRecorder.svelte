<script>
  /**
   * VoiceRecorder Component - Terminal Aesthetic
   * Fixed bottom-right voice recording interface with mini recording cards
   */
  import { createEventDispatcher, onDestroy } from 'svelte';

  const dispatch = createEventDispatcher();

  export let searchQuery = '';

  let mediaRecorder = null;
  let audioChunks = [];
  let recordings = [];
  let isRecording = false;
  let recordingStartTime = null;
  let statusInterval = null;
  let replacingId = null;
  let skipNextSave = false;
  let recordingStatus = 'ready';
  let isSupported = true;

  onDestroy(() => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    if (statusInterval) {
      clearInterval(statusInterval);
    }
    // Clean up audio URLs
    recordings.forEach(r => {
      if (r.audioUrl) URL.revokeObjectURL(r.audioUrl);
    });
  });

  async function initMediaRecorder() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (e) => {
        audioChunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        if (skipNextSave) {
          skipNextSave = false;
          audioChunks = [];
          return;
        }

        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const duration = Math.round((Date.now() - recordingStartTime) / 1000);

        if (replacingId !== null) {
          replaceMiniRecording(replacingId, audioBlob, duration);
          replacingId = null;
        } else {
          addMiniRecording(audioBlob, duration);
        }
        audioChunks = [];
      };

      return true;
    } catch (err) {
      console.error('Microphone access denied:', err);
      isSupported = false;
      return false;
    }
  }

  function generateWaveform() {
    const bars = Array.from({ length: 8 }, () => Math.floor(Math.random() * 12) + 4);
    return bars;
  }

  function addMiniRecording(blob, duration) {
    const id = Date.now();
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);

    recordings = [
      ...recordings,
      {
        id,
        blob,
        duration,
        audioUrl,
        audio,
        isPlaying: false,
        waveform: generateWaveform()
      }
    ];

    updateVoiceSubmitState();
  }

  function replaceMiniRecording(id, blob, duration) {
    const index = recordings.findIndex((r) => r.id === id);
    if (index === -1) return;

    const oldRecording = recordings[index];
    if (oldRecording.audioUrl) {
      URL.revokeObjectURL(oldRecording.audioUrl);
    }

    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);

    recordings[index] = {
      id,
      blob,
      duration,
      audioUrl,
      audio,
      isPlaying: false,
      waveform: generateWaveform(),
      isReplacing: false
    };

    recordings = [...recordings];

    recordingStatus = 'replaced';
    setTimeout(() => {
      recordingStatus = 'ready';
    }, 1500);
  }

  async function startReplacing(id) {
    if (isRecording) {
      skipNextSave = true;
      mediaRecorder.stop();
      isRecording = false;
      clearInterval(statusInterval);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (!mediaRecorder) {
      const initialized = await initMediaRecorder();
      if (!initialized) {
        recordingStatus = 'no mic';
        return;
      }
    }

    // Clear all replacing states
    recordings = recordings.map((r) => ({ ...r, isReplacing: false }));

    // Set this recording as replacing
    const index = recordings.findIndex((r) => r.id === id);
    if (index !== -1) {
      recordings[index].isReplacing = true;
      recordings = [...recordings];
    }

    replacingId = id;

    // Start recording
    audioChunks = [];
    mediaRecorder.start();
    isRecording = true;
    recordingStartTime = Date.now();
    recordingStatus = '0:00';

    statusInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
      recordingStatus = formatTime(elapsed);
    }, 1000);
  }

  function deleteRecording(id) {
    const recording = recordings.find((r) => r.id === id);
    if (recording) {
      if (recording.audio) recording.audio.pause();
      if (recording.audioUrl) URL.revokeObjectURL(recording.audioUrl);
    }
    recordings = recordings.filter((r) => r.id !== id);
    updateVoiceSubmitState();
  }

  function togglePlay(id) {
    const index = recordings.findIndex((r) => r.id === id);
    if (index === -1) return;

    const recording = recordings[index];

    // Stop all other recordings
    recordings.forEach((r, i) => {
      if (i !== index && r.isPlaying) {
        r.audio.pause();
        r.audio.currentTime = 0;
        r.isPlaying = false;
      }
    });

    if (recording.isPlaying) {
      recording.audio.pause();
      recording.audio.currentTime = 0;
      recording.isPlaying = false;
    } else {
      recording.audio.play();
      recording.isPlaying = true;

      recording.audio.onended = () => {
        recordings[index].isPlaying = false;
        recordings = [...recordings];
      };
    }

    recordings = [...recordings];
  }

  function updateVoiceSubmitState() {
    // Voice submit button state is controlled by recordings.length
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  async function handleRecordClick() {
    if (!mediaRecorder) {
      const initialized = await initMediaRecorder();
      if (!initialized) {
        recordingStatus = 'no mic';
        return;
      }
    }

    if (isRecording) {
      // Stop recording
      isRecording = false;
      mediaRecorder.stop();
      clearInterval(statusInterval);
      statusInterval = null;

      if (replacingId === null) {
        recordingStatus = 'saved';
        setTimeout(() => {
          recordingStatus = 'ready';
        }, 1500);
      }
    } else {
      // If we were in replace mode but cancelled, clear it
      if (replacingId !== null) {
        recordings = recordings.map((r) => ({ ...r, isReplacing: false }));
        replacingId = null;
      }

      // Start recording
      audioChunks = [];
      isRecording = true;
      recordingStartTime = Date.now();
      recordingStatus = '0:00';
      mediaRecorder.start();

      statusInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        recordingStatus = formatTime(elapsed);
      }, 1000);
    }
  }

  async function handleVoiceSubmit() {
    const hasRecordings = recordings.length > 0;
    const hasText = searchQuery?.trim().length > 0;

    if (!hasRecordings && !hasText) return;

    if (hasRecordings) {
      const totalDuration = recordings.reduce((sum, r) => sum + r.duration, 0);

      // Dispatch event with recordings info
      dispatch('submit', {
        type: 'voice',
        count: recordings.length,
        totalDuration,
        recordings: recordings.map((r) => ({ blob: r.blob, duration: r.duration }))
      });

      // Clear recordings
      recordings.forEach((r) => {
        if (r.audio) r.audio.pause();
        if (r.audioUrl) URL.revokeObjectURL(r.audioUrl);
      });
      recordings = [];
      updateVoiceSubmitState();
    } else if (hasText) {
      // Text-only submission
      dispatch('submit', {
        type: 'text',
        query: searchQuery.trim()
      });
    }
  }
</script>

<div class="voice-interface">
  <!-- Mini recordings stack - always rendered -->
  <div class="voice-recordings">
    {#each recordings as recording (recording.id)}
      <div
        class="mini-recording"
        class:replacing={recording.isReplacing}
      >
        <button
          class="play-btn"
          class:playing={recording.isPlaying}
          on:click={() => togglePlay(recording.id)}
          title="Play recording"
        >
          {#if recording.isPlaying}
            <svg class="pause-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          {:else}
            <svg class="play-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          {/if}
        </button>

        <div class="waveform">
          {#each recording.waveform as height}
            <span style="height: {height}px"></span>
          {/each}
        </div>

        <span class="duration">{recording.duration}s</span>

        <button
          class="replace-btn"
          on:click={() => startReplacing(recording.id)}
          title="Re-record"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>

        <button
          class="delete-btn"
          on:click={() => deleteRecording(recording.id)}
          title="Delete recording"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>
    {/each}
  </div>

  <!-- Voice controls panel -->
  <div class="voice-controls">
    <button
      class="record-btn"
      class:recording={isRecording}
      on:click={handleRecordClick}
      title="Record voice"
    >
      {#if isRecording}
        <svg class="pause-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1" />
          <rect x="14" y="4" width="4" height="16" rx="1" />
        </svg>
      {:else}
        <svg class="record-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" x2="12" y1="19" y2="22" />
        </svg>
      {/if}
    </button>

    <span
      class="recording-status"
      class:active={isRecording}
    >
      {recordingStatus}
    </span>

    <button
      class="voice-submit-btn"
      class:active={recordings.length > 0 || (searchQuery?.trim().length > 0)}
      on:click={handleVoiceSubmit}
      disabled={recordings.length === 0 && !searchQuery?.trim()}
      title="Submit search"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </svg>
    </button>
  </div>
</div>

<style>
  /* Voice Recording Interface */
  .voice-interface {
    display: flex;
    flex-direction: column;
    height: 100%;
    gap: 12px;
  }

  .voice-recordings {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
    overflow-y: auto;
    padding-right: 8px;
  }

  .mini-recording {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(20, 20, 20, 0.8);
    border: 1px solid var(--moss-green);
    border-radius: 6px;
    padding: 6px 10px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--white);
    opacity: 0.9;
    animation: slide-in 0.3s ease;
    width: fit-content;
    margin-left: auto;
  }

  @keyframes slide-in {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 0.9;
      transform: translateX(0);
    }
  }

  .mini-recording.replacing {
    border-color: var(--lilac);
    box-shadow: 0 0 15px rgba(196, 167, 215, 0.3);
  }

  .mini-recording .duration {
    color: var(--lilac);
  }

  .mini-recording .waveform {
    display: flex;
    align-items: center;
    gap: 2px;
    height: 16px;
  }

  .mini-recording .waveform span {
    width: 3px;
    background: var(--cyan);
    border-radius: 2px;
    opacity: 0.7;
  }

  .mini-recording .play-btn {
    background: transparent;
    border: none;
    color: var(--cyan);
    cursor: pointer;
    padding: 2px !important;
    opacity: 0.6;
    transition: opacity 0.2s ease;
    display: flex;
    align-items: center;
    font-size: inherit;
    font-family: inherit;
  }

  .mini-recording .play-btn svg {
    display: block;
  }

  .mini-recording .play-btn:hover {
    opacity: 1;
  }

  .mini-recording .play-btn.playing {
    color: #39ff14;
    opacity: 1;
  }

  .mini-recording .delete-btn {
    background: transparent;
    border: none;
    color: #ff3366;
    cursor: pointer;
    padding: 2px !important;
    opacity: 0.5;
    transition: opacity 0.2s ease;
    display: flex;
    align-items: center;
    font-size: inherit;
    font-family: inherit;
  }

  .mini-recording .delete-btn svg {
    display: block;
  }

  .mini-recording .delete-btn:hover {
    opacity: 1;
  }

  .mini-recording .replace-btn {
    background: transparent;
    border: none;
    color: var(--lilac);
    cursor: pointer;
    padding: 2px !important;
    opacity: 0.5;
    transition: opacity 0.2s ease;
    display: flex;
    align-items: center;
    font-size: inherit;
    font-family: inherit;
  }

  .mini-recording .replace-btn svg {
    display: block;
  }

  .mini-recording .replace-btn:hover {
    opacity: 1;
  }

  .voice-controls {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-radius: 8px;
    padding: 12px 16px;
    width: fit-content;
    margin-left: auto;
  }

  .record-btn {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: 2px solid var(--moss-glow);
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    color: var(--moss-glow);
    padding: 0 !important;
    font-size: inherit;
    font-family: inherit;
    box-shadow: none;
    animation: none;
  }

  .record-btn svg {
    flex-shrink: 0;
    display: block;
  }

  /* Default non-recording state */
  .record-btn:not(.recording) {
    border-color: var(--moss-glow);
    color: var(--moss-glow);
  }

  .record-btn:hover:not(.recording) {
    border-color: #ff3366;
    color: #ff3366;
    box-shadow: 0 0 20px rgba(255, 51, 102, 0.3);
  }

  .record-btn.recording {
    border-color: #ff3366 !important;
    color: #ff3366 !important;
    animation: pulse-recording 1.5s ease-in-out infinite;
  }

  .record-btn.recording:hover {
    border-color: #ff3366;
    color: #ff3366;
  }

  @keyframes pulse-recording {
    0%,
    100% {
      box-shadow: 0 0 10px rgba(255, 51, 102, 0.3);
    }
    50% {
      box-shadow: 0 0 25px rgba(255, 51, 102, 0.6);
    }
  }

  .voice-submit-btn {
    width: 40px;
    height: 40px;
    border-radius: 6px;
    border: 1px solid var(--moss-green);
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--moss-glow);
    opacity: 0.4;
    transition: all 0.3s ease;
    pointer-events: none;
    padding: 0 !important;
    font-size: inherit;
    font-family: inherit;
  }

  .voice-submit-btn svg {
    flex-shrink: 0;
    display: block;
  }

  .voice-submit-btn.active {
    opacity: 1;
    pointer-events: auto;
  }

  .voice-submit-btn.active:hover {
    border-color: #39ff14;
    color: #39ff14;
    box-shadow: 0 0 15px rgba(57, 255, 20, 0.3);
  }

  .recording-status {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--white);
    opacity: 0.5;
    min-width: 60px;
    text-align: center;
  }

  .recording-status.active {
    color: #ff3366;
    opacity: 1;
  }

  /* Scrollbar for recordings */
  .voice-recordings::-webkit-scrollbar {
    width: 6px;
  }

  .voice-recordings::-webkit-scrollbar-track {
    background: transparent;
  }

  .voice-recordings::-webkit-scrollbar-thumb {
    background: var(--moss-green);
    border-radius: 3px;
  }

  .voice-recordings::-webkit-scrollbar-thumb:hover {
    background: var(--moss-glow);
  }

  @media (max-width: 768px) {
    .voice-interface {
      gap: 8px;
    }

    .voice-controls {
      padding: 10px 12px;
      gap: 8px;
    }

    .record-btn {
      width: 40px;
      height: 40px;
    }

    .voice-submit-btn {
      width: 36px;
      height: 36px;
    }

    .mini-recording {
      font-size: 10px;
      padding: 6px 10px;
    }
  }
</style>
