import { MaterialTypeId } from '../data/MaterialConfig';
import { WORLDS, WorldTheme } from '../data/WorldConfig';
import { GameSettings } from './SaveManager';

export type MusicMode = 'menu' | 'world' | 'boss' | 'victory';

/**
 * AudioManager synthesizes gameplay SFX, UI/transition sounds, ambient weather loops,
 * and adaptive music (menu, per-world, boss, victory) using Web Audio API,
 * while also supporting optional external audio files from /assets/audio/.
 */
export class AudioManager {
  private static instance: AudioManager;
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private settings: GameSettings;
  private currentWorld: WorldTheme = WORLDS[0];
  private musicMode: MusicMode = 'menu';
  private musicTimer: number | null = null;
  private ambientTimer: number | null = null;
  private musicPaused = false;
  private musicStep = 0;
  private lastStretchMs = 0;
  private fileCache = new Map<string, AudioBuffer>();

  constructor(settings: GameSettings) {
    this.settings = { ...settings };
  }

  static getInstance(settings?: GameSettings): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager(
        settings ?? {
          musicVolume: 0.45,
          sfxVolume: 0.75,
          ambientVolume: 0.55,
          muted: false,
          showTrajectory: true,
          graphicsQuality: 'high',
          disableInterstitials: true,
          tutorialSeen: false,
        }
      );
    }
    return AudioManager.instance;
  }

  unlock(): void {
    try {
      if (typeof window === 'undefined') return;
      if (!this.ctx) {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.sfxGain = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();
        this.ambientGain = this.ctx.createGain();
        this.sfxGain.connect(this.ctx.destination);
        this.musicGain.connect(this.ctx.destination);
        this.ambientGain.connect(this.ctx.destination);
        this.applyVolumes();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      if (this.musicTimer === null) {
        this.startMusicLoop();
      }
      if (this.ambientTimer === null) {
        this.startAmbientLoop();
      }
    } catch {
      // Safe fallback when audio is blocked or unsupported
    }
  }

  updateSettings(settings: GameSettings): void {
    this.settings = { ...settings };
    this.applyVolumes();
  }

  setWorldTheme(world: WorldTheme, isBoss = false): void {
    this.currentWorld = world;
    this.setMusicMode(isBoss ? 'boss' : 'world');
  }

  setMusicMode(mode: MusicMode): void {
    if (this.musicMode === mode) return;
    this.musicMode = mode;
    try {
      if (this.ctx && this.musicGain) {
        const now = this.ctx.currentTime;
        const target = this.settings.muted ? 0 : this.settings.musicVolume * 0.24;
        this.musicGain.gain.cancelScheduledValues(now);
        this.musicGain.gain.setValueAtTime(0.01, now);
        this.musicGain.gain.linearRampToValueAtTime(target, now + 0.55);
      }
    } catch {
      // Safe ignore
    }
  }

  setPaused(paused: boolean): void {
    this.musicPaused = paused;
    try {
      if (!this.ctx) return;
      if (paused && this.ctx.state === 'running') {
        this.ctx.suspend().catch(() => {});
      } else if (!paused && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch {
      // Safe ignore
    }
  }

  async tryPlayOptionalAsset(path: string, vol = 0.5): Promise<boolean> {
    if (!this.canPlaySfx() || !this.ctx || !this.sfxGain) return false;
    try {
      let buf = this.fileCache.get(path);
      if (!buf) {
        const resp = await fetch(path);
        if (!resp.ok) return false;
        const arr = await resp.arrayBuffer();
        buf = await this.ctx.decodeAudioData(arr);
        this.fileCache.set(path, buf);
      }
      const src = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      gain.gain.value = vol;
      src.buffer = buf;
      src.connect(gain).connect(this.sfxGain);
      src.start();
      return true;
    } catch {
      return false;
    }
  }

  private applyVolumes(): void {
    try {
      if (!this.ctx || !this.sfxGain || !this.musicGain || !this.ambientGain) return;
      const now = this.ctx.currentTime;
      const sfx = this.settings.muted ? 0 : this.settings.sfxVolume;
      const mus = this.settings.muted ? 0 : this.settings.musicVolume;
      const amb = this.settings.muted ? 0 : (this.settings.ambientVolume ?? 0.55);
      this.sfxGain.gain.setTargetAtTime(sfx, now, 0.04);
      this.musicGain.gain.setTargetAtTime(mus * 0.24, now, 0.06);
      this.ambientGain.gain.setTargetAtTime(amb * 0.16, now, 0.08);
    } catch {
      // Ignore
    }
  }

  private canPlaySfx(): boolean {
    return Boolean(
      this.ctx &&
        this.sfxGain &&
        this.ctx.state === 'running' &&
        !this.settings.muted &&
        this.settings.sfxVolume > 0.01
    );
  }

  private playTone(
    type: OscillatorType,
    f1: number,
    f2: number,
    dur: number,
    vol: number,
    dest?: GainNode | null
  ): void {
    const targetDest = dest ?? this.sfxGain;
    if (!this.ctx || !targetDest || this.ctx.state !== 'running' || this.settings.muted) return;
    if (!dest && this.settings.sfxVolume <= 0.01) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(f1, now);
      if (f2 !== f1) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f2), now + dur);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(gain).connect(targetDest);
      osc.start(now);
      osc.stop(now + dur + 0.02);
    } catch {
      // Safe ignore
    }
  }

  private playNoise(dur: number, filterHz: number, vol: number, dest?: GainNode | null): void {
    const targetDest = dest ?? this.sfxGain;
    if (!this.ctx || !targetDest || this.ctx.state !== 'running' || this.settings.muted) return;
    if (!dest && this.settings.sfxVolume <= 0.01) return;
    try {
      const rate = this.ctx.sampleRate;
      const len = Math.max(1, Math.floor(rate * dur));
      const buf = this.ctx.createBuffer(1, len, rate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = filterHz;
      const gain = this.ctx.createGain();
      gain.gain.value = vol;
      src.connect(filter).connect(gain).connect(targetDest);
      src.start();
    } catch {
      // Safe ignore
    }
  }

  playUiClick(): void {
    this.unlock();
    this.playTone('triangle', 520, 240, 0.06, 0.16);
  }

  playUiHover(): void {
    if (!this.canPlaySfx()) return;
    this.playTone('sine', 680, 740, 0.03, 0.04);
  }

  playTransitionWhoosh(): void {
    this.unlock();
    this.playNoise(0.28, 900, 0.14);
    this.playTone('sine', 160, 420, 0.24, 0.09);
  }

  playPopupOpen(open = true): void {
    this.playTone('triangle', open ? 320 : 520, open ? 620 : 280, 0.12, 0.12);
  }

  playStretch(powerRatio: number): void {
    const now = performance.now();
    if (now - this.lastStretchMs < 95) return;
    this.lastStretchMs = now;
    this.playTone('sawtooth', 105 + powerRatio * 140, 130 + powerRatio * 145, 0.05, 0.04);
  }

  playLaunch(): void {
    this.unlock();
    this.playTone('sine', 180, 560, 0.16, 0.24);
    this.playNoise(0.14, 1400, 0.12);
  }

  playVampireLaugh(): void {
    [420, 360, 310].forEach((f, idx) => {
      setTimeout(() => this.playTone('triangle', f, f * 0.85, 0.1, 0.12), idx * 95);
    });
  }

  playAbility(ability: string): void {
    if (ability === 'bat') this.playTone('triangle', 720, 1320, 0.14, 0.2);
    else if (ability === 'speed') this.playTone('sawtooth', 290, 960, 0.16, 0.2);
    else if (ability === 'storm') {
      this.playNoise(0.75, 650, 0.22);
      this.playTone('sine', 210, 520, 0.6, 0.15);
    } else if (ability === 'mage') {
      this.playTone('sine', 190, 95, 0.35, 0.22);
      this.playTone('triangle', 580, 310, 0.32, 0.14);
    } else if (ability === 'ice') this.playTone('sine', 1200, 2100, 0.2, 0.18);
    else if (ability === 'thunder') {
      this.playNoise(0.16, 1800, 0.24);
      this.playTone('sawtooth', 880, 190, 0.2, 0.18);
    } else if (ability === 'shadow') this.playTone('sine', 460, 85, 0.24, 0.24);
    else this.playTone('square', 320, 140, 0.16, 0.16);
  }

  playBreak(material: MaterialTypeId, intensity = 1): void {
    const vol = Math.min(0.32, 0.15 * intensity);
    if (material === 'glass' || material === 'ice') {
      this.playTone('sine', 1650, 2480, 0.13, vol * 0.65);
      this.playTone('triangle', 2200, 1450, 0.14, vol * 0.45);
    } else if (material === 'stone' || material === 'coffin') {
      this.playNoise(0.18, 300, vol);
      this.playTone('triangle', 115, 42, 0.16, vol * 0.8);
    } else {
      this.playNoise(0.11, 760, vol * 0.9);
      this.playTone('square', 240, 85, 0.09, vol * 0.5);
    }
  }

  playZombieGroan(hungry = false): void {
    this.playTone('sawtooth', hungry ? 148 : 125, hungry ? 88 : 92, 0.24, hungry ? 0.14 : 0.1);
  }

  playZombieShriek(): void {
    this.playTone('sawtooth', 840, 1480, 0.26, 0.16);
  }

  playZombieDeath(): void {
    this.playTone('sawtooth', 225, 58, 0.3, 0.2);
    this.playNoise(0.14, 520, 0.14);
  }

  playExplosion(): void {
    this.playNoise(0.45, 240, 0.36);
    this.playTone('sine', 140, 28, 0.42, 0.35);
  }

  playCoinPickup(): void {
    this.playTone('sine', 987.77, 1318.5, 0.12, 0.14);
  }

  playStarAward(index: number): void {
    const notes = [523.25, 659.25, 783.99];
    const f = notes[index % notes.length];
    this.playTone('triangle', f, f * 1.02, 0.2, 0.18);
  }

  playUnlockFanfare(): void {
    [392.0, 493.88, 587.33, 783.99].forEach((f, idx) => {
      setTimeout(() => this.playTone('triangle', f, f * 1.02, 0.26, 0.18), idx * 85);
    });
  }

  playWin(): void {
    this.setMusicMode('victory');
    [293.66, 349.23, 440.0, 587.33].forEach((f, idx) => {
      setTimeout(() => this.playTone('triangle', f, f, 0.35, 0.2), idx * 110);
    });
  }

  playLose(): void {
    [261.63, 246.94, 220.0, 174.61].forEach((f, idx) => {
      setTimeout(() => this.playTone('sawtooth', f, f, 0.3, 0.13), idx * 150);
    });
  }

  private startMusicLoop(): void {
    const tick = () => {
      try {
        if (
          this.ctx &&
          this.musicGain &&
          !this.musicPaused &&
          !this.settings.muted &&
          this.settings.musicVolume > 0.01 &&
          this.ctx.state === 'running'
        ) {
          const w = this.currentWorld;
          const root = this.musicMode === 'menu' ? 130.81 : this.musicMode === 'boss' ? w.musicRootHz * 0.9 : w.musicRootHz;
          const scale = this.musicMode === 'menu' ? [0, 3, 7, 10, 7, 3] : w.musicScale;
          const semitone = scale[this.musicStep % scale.length];
          const freq = root * Math.pow(2, semitone / 12);
          const now = this.ctx.currentTime;

          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = this.musicMode === 'boss' ? 'sawtooth' : 'triangle';
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(this.musicMode === 'menu' ? 0.09 : 0.13, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
          osc.connect(gain).connect(this.musicGain);
          osc.start(now);
          osc.stop(now + 0.36);

          if (this.musicStep % 2 === 0) {
            const bass = this.ctx.createOscillator();
            const bGain = this.ctx.createGain();
            bass.type = 'sine';
            bass.frequency.setValueAtTime(root * 0.5, now);
            bGain.gain.setValueAtTime(0.2, now);
            bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.68);
            bass.connect(bGain).connect(this.musicGain);
            bass.start(now);
            bass.stop(now + 0.7);
          }
          this.musicStep++;
        }
      } catch {
        // Safe ignore
      }
      const tempo =
        this.musicMode === 'menu'
          ? 520
          : this.musicMode === 'boss'
            ? Math.max(240, this.currentWorld.musicTempoMs - 85)
            : this.currentWorld.musicTempoMs;
      this.musicTimer = window.setTimeout(tick, tempo);
    };
    tick();
  }

  private startAmbientLoop(): void {
    const tick = () => {
      try {
        if (
          this.ctx &&
          this.ambientGain &&
          !this.musicPaused &&
          !this.settings.muted &&
          (this.settings.ambientVolume ?? 0.55) > 0.01 &&
          this.ctx.state === 'running'
        ) {
          const kind = this.currentWorld.ambientAudioKind;
          if (kind === 'rain' || kind === 'wind') {
            this.playNoise(0.95, kind === 'rain' ? 1400 : 480, 0.18, this.ambientGain);
          } else if (kind === 'crickets') {
            if (Math.random() < 0.6) {
              this.playTone('sine', 2800, 2920, 0.06, 0.06, this.ambientGain);
            }
          } else if (kind === 'bubbles') {
            if (Math.random() < 0.7) {
              this.playTone('sine', 260 + Math.random() * 180, 620, 0.14, 0.09, this.ambientGain);
            }
          } else if (kind === 'lava') {
            this.playNoise(0.9, 220, 0.2, this.ambientGain);
          } else {
            this.playTone('sine', 180, 140, 0.45, 0.06, this.ambientGain);
          }
        }
      } catch {
        // Safe ignore
      }
      this.ambientTimer = window.setTimeout(tick, 980);
    };
    tick();
  }
}
