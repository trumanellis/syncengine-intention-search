/**
 * Voice Recognition Module using Web Speech API
 * Provides browser-native speech-to-text functionality
 */

export class VoiceRecognition {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.onResult = null;
    this.onError = null;
  }

  /**
   * Check if browser supports speech recognition
   * @returns {boolean} True if supported
   */
  isSupported() {
    return (
      'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
    );
  }

  /**
   * Get the speech recognition implementation
   * @returns {SpeechRecognition|null} Speech recognition instance or null
   */
  getSpeechRecognition() {
    if (typeof window === 'undefined') return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition;
  }

  /**
   * Start listening for speech input
   * @param {Object} options - Recognition options
   * @param {string} options.lang - Language code (default: 'en-US')
   * @param {boolean} options.continuous - Continue listening after results (default: false)
   * @param {boolean} options.interimResults - Return interim results (default: false)
   * @returns {Promise<string>} Transcript of recognized speech
   */
  async start(options = {}) {
    const {
      lang = 'en-US',
      continuous = false,
      interimResults = false
    } = options;

    if (!this.isSupported()) {
      throw new Error('Speech recognition not supported in this browser');
    }

    if (this.isListening) {
      throw new Error('Already listening');
    }

    const SpeechRecognition = this.getSpeechRecognition();
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = continuous;
    this.recognition.interimResults = interimResults;
    this.recognition.lang = lang;
    this.recognition.maxAlternatives = 1;

    return new Promise((resolve, reject) => {
      this.recognition.onstart = () => {
        this.isListening = true;
        console.log('🎤 Voice recognition started');
      };

      this.recognition.onresult = (event) => {
        const results = event.results;
        const lastResult = results[results.length - 1];
        const transcript = lastResult[0].transcript;

        console.log('📝 Transcript:', transcript);
        console.log('Confidence:', lastResult[0].confidence);

        if (this.onResult) {
          this.onResult(transcript, lastResult[0].confidence);
        }

        // Only resolve on final results (not interim)
        if (lastResult.isFinal) {
          this.isListening = false;
          resolve(transcript);
        }
      };

      this.recognition.onerror = (event) => {
        console.error('❌ Speech recognition error:', event.error);
        this.isListening = false;

        if (this.onError) {
          this.onError(event.error);
        }

        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      this.recognition.onend = () => {
        console.log('🛑 Voice recognition ended');
        this.isListening = false;
      };

      try {
        this.recognition.start();
      } catch (error) {
        this.isListening = false;
        reject(error);
      }
    });
  }

  /**
   * Stop listening for speech input
   */
  stop() {
    if (this.recognition && this.isListening) {
      console.log('⏹️ Stopping voice recognition...');
      this.recognition.stop();
      this.isListening = false;
    }
  }

  /**
   * Abort speech recognition immediately
   */
  abort() {
    if (this.recognition && this.isListening) {
      console.log('⏹️ Aborting voice recognition...');
      this.recognition.abort();
      this.isListening = false;
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.abort();
    this.recognition = null;
    this.onResult = null;
    this.onError = null;
  }
}

/**
 * Helper function to check browser compatibility
 * @returns {Object} { supported, message, browserName }
 */
export function checkVoiceSupport() {
  if (typeof window === 'undefined') {
    return {
      supported: false,
      message: 'Not running in browser environment',
      browserName: 'unknown'
    };
  }

  const userAgent = navigator.userAgent.toLowerCase();
  let browserName = 'unknown';

  if (userAgent.includes('chrome')) browserName = 'chrome';
  else if (userAgent.includes('safari')) browserName = 'safari';
  else if (userAgent.includes('firefox')) browserName = 'firefox';
  else if (userAgent.includes('edge')) browserName = 'edge';

  const supported =
    'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

  let message = '';
  if (supported) {
    message = `Voice recognition available in ${browserName}`;
  } else {
    message = `Voice recognition not available in ${browserName}. Try Chrome, Safari, or Edge.`;
  }

  return { supported, message, browserName };
}

/**
 * Create a simple voice recognition instance
 * @returns {VoiceRecognition} Voice recognition instance
 */
export function createVoiceRecognition() {
  return new VoiceRecognition();
}
