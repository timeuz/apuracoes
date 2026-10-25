/**
 * Synthesizes Brazilian TSE Electronic Voting Machine ("Urna Eletrônica") sounds
 * using the Web Audio API without needing external audio files.
 */

class AudioController {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Iconic TSE Urna Eletrônica confirmation tone ("Trimmm / Pililili")
   */
  public playUrnaConfirmation(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Frequency sequence simulating the TSE urn confirmation
      // The classic tone starts around 900Hz and ends on a high harmonic ~1800Hz
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';

      // Fundamental frequency sequence
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.setValueAtTime(1046.5, now + 0.12);
      osc1.frequency.setValueAtTime(1318.5, now + 0.24);
      osc1.frequency.setValueAtTime(1760, now + 0.36);

      osc2.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(523.25, now + 0.12);
      osc2.frequency.setValueAtTime(659.25, now + 0.24);
      osc2.frequency.setValueAtTime(880, now + 0.36);

      // Amplitude envelope
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.25, now + 0.04);
      gainNode.gain.setValueAtTime(0.25, now + 0.6);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.95);
      osc2.stop(now + 0.95);
    } catch {
      // Audio playback fails silently if browser blocks before user interaction
    }
  }

  /**
   * Urgent alert chime for candidate overtake or milestone
   */
  public playAlertChime(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.1); // A5

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.2, now + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.45);
    } catch {
      // Fail silently
    }
  }
}

export const soundService = new AudioController();
