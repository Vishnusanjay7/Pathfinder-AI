/**
 * Voice Activity Detector (VAD) using Web Audio API (AudioContext + AnalyserNode)
 * Performs background noise calibration and real-time RMS volume analysis.
 */

export interface VADConfig {
  silenceDurationMs: number;
  preSpeechTimeoutMs: number;
  minimumSpeechDurationMs: number;
  maximumAnswerDurationMs: number;
  adaptiveMultiplier: number;
  minSpeechThreshold: number;
}

export const DEFAULT_VAD_CONFIG: VADConfig = {
  silenceDurationMs: 1800,
  preSpeechTimeoutMs: 10000,
  minimumSpeechDurationMs: 500,
  maximumAnswerDurationMs: 120000,
  adaptiveMultiplier: 2.5,
  minSpeechThreshold: 0.015,
};

export interface VADCallbacks {
  onSpeechStart?: () => void;
  onSpeechEnd?: (silenceDurationMs: number) => void;
  onPreSpeechTimeout?: () => void;
  onMaxDurationReached?: () => void;
  onVolumeChange?: (volume: number, isSpeech: boolean) => void;
}

export class VoiceActivityDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private animFrameId: number | null = null;

  private config: VADConfig;
  private callbacks: VADCallbacks;

  private isCalibrated = false;
  private backgroundNoiseRms = 0.005;
  private speechThreshold = 0.015;

  private isSpeaking = false;
  private speechStartTime = 0;

  private silenceTimer: number | null = null;
  private preSpeechTimer: number | null = null;
  private maxDurationTimer: number | null = null;

  private isActive = false;
  private sessionId = "";

  constructor(callbacks: VADCallbacks, config?: Partial<VADConfig>) {
    this.callbacks = callbacks;
    this.config = { ...DEFAULT_VAD_CONFIG, ...config };
  }

  /**
   * Start Voice Activity Detection on an existing MediaStream.
   */
  public start(stream: MediaStream, sessionId: string): boolean {
    this.stop();

    if (!stream || stream.getAudioTracks().length === 0) {
      console.warn("VAD Start failed: No audio tracks in MediaStream.");
      return false;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        console.warn("Web Audio API AudioContext not supported in this browser.");
        return false;
      }

      this.audioContext = new AudioCtx();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.4;

      this.source = this.audioContext.createMediaStreamSource(stream);
      // Connect source to analyser only (NOT to destination, avoiding feedback/echo)
      this.source.connect(this.analyser);

      this.isActive = true;
      this.sessionId = sessionId;
      this.isSpeaking = false;
      this.isCalibrated = false;

      // 1. Calibration Phase (measure ambient noise for ~600ms)
      this.calibrateBackgroundNoise();

      // 2. Start Pre-Speech Timeout (10s limit to start speaking)
      this.startPreSpeechTimeout();

      // 3. Start Audio Processing Loop
      this.processAudioLoop();

      return true;
    } catch (err) {
      console.error("VAD initialization error:", err);
      this.stop();
      return false;
    }
  }

  /**
   * Short background noise measurement to adaptively set speech threshold.
   */
  private calibrateBackgroundNoise() {
    if (!this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    let sampleCount = 0;
    let noiseSum = 0;

    const calibrationInterval = setInterval(() => {
      if (!this.analyser || !this.isActive) {
        clearInterval(calibrationInterval);
        return;
      }

      this.analyser.getFloatTimeDomainData(dataArray);
      let sumSquares = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sumSquares += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sumSquares / dataArray.length);

      noiseSum += rms;
      sampleCount++;

      if (sampleCount >= 12) {
        // ~600ms
        clearInterval(calibrationInterval);
        this.backgroundNoiseRms = noiseSum / sampleCount;
        this.speechThreshold = Math.max(
          this.config.minSpeechThreshold,
          this.backgroundNoiseRms * this.config.adaptiveMultiplier
        );
        this.isCalibrated = true;
      }
    }, 50);
  }

  private startPreSpeechTimeout() {
    this.clearPreSpeechTimeout();
    this.preSpeechTimer = window.setTimeout(() => {
      if (this.isActive && !this.isSpeaking) {
        if (this.callbacks.onPreSpeechTimeout) {
          this.callbacks.onPreSpeechTimeout();
        }
      }
    }, this.config.preSpeechTimeoutMs);
  }

  private clearPreSpeechTimeout() {
    if (this.preSpeechTimer !== null) {
      clearTimeout(this.preSpeechTimer);
      this.preSpeechTimer = null;
    }
  }

  private startMaxDurationTimeout() {
    this.clearMaxDurationTimeout();
    this.maxDurationTimer = window.setTimeout(() => {
      if (this.isActive) {
        if (this.callbacks.onMaxDurationReached) {
          this.callbacks.onMaxDurationReached();
        }
      }
    }, this.config.maximumAnswerDurationMs);
  }

  private clearMaxDurationTimeout() {
    if (this.maxDurationTimer !== null) {
      clearTimeout(this.maxDurationTimer);
      this.maxDurationTimer = null;
    }
  }

  private startSilenceTimer() {
    if (this.silenceTimer !== null) return; // Already running

    this.silenceTimer = window.setTimeout(() => {
      if (this.isActive && this.isSpeaking) {
        const speechDuration = Date.now() - this.speechStartTime;
        if (speechDuration >= this.config.minimumSpeechDurationMs) {
          this.isSpeaking = false;
          if (this.callbacks.onSpeechEnd) {
            this.callbacks.onSpeechEnd(this.config.silenceDurationMs);
          }
        }
      }
      this.silenceTimer = null;
    }, this.config.silenceDurationMs);
  }

  public resetSilenceTimer() {
    if (this.silenceTimer !== null) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  /**
   * Main audio loop analyzing RMS volume per frame.
   */
  private processAudioLoop = () => {
    if (!this.isActive || !this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    this.analyser.getFloatTimeDomainData(dataArray);

    let sumSquares = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sumSquares += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sumSquares / dataArray.length);
    const isSpeech = rms > this.speechThreshold;

    if (this.callbacks.onVolumeChange) {
      this.callbacks.onVolumeChange(rms, isSpeech);
    }

    if (isSpeech) {
      // Speech active
      this.clearPreSpeechTimeout();
      this.resetSilenceTimer();

      if (!this.isSpeaking) {
        this.isSpeaking = true;
        this.speechStartTime = Date.now();
        this.startMaxDurationTimeout();

        if (this.callbacks.onSpeechStart) {
          this.callbacks.onSpeechStart();
        }
      }
    } else {
      // Audio level below speech threshold
      if (this.isSpeaking) {
        this.startSilenceTimer();
      }
    }

    this.animFrameId = requestAnimationFrame(this.processAudioLoop);
  };

  /**
   * Stop VAD and clean up Web Audio API nodes.
   */
  public stop() {
    this.isActive = false;
    this.isSpeaking = false;
    this.sessionId = "";

    this.clearPreSpeechTimeout();
    this.clearMaxDurationTimeout();
    this.resetSilenceTimer();

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.source) {
      try {
        this.source.disconnect();
      } catch {}
      this.source = null;
    }

    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch {}
      this.analyser = null;
    }

    if (this.audioContext && this.audioContext.state !== "closed") {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public getSpeechThreshold(): number {
    return this.speechThreshold;
  }
}
