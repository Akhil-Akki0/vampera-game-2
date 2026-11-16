import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { getCoreImageAssets } from '../data/AssetManifest';
import { AudioManager } from '../systems/AudioManager';
import { TextureGenerator } from '../utils/TextureGenerator';
import { TransitionHelper } from '../utils/TransitionHelper';
import { UiDomHelper } from '../utils/UiDomHelper';

/**
 * LoadingVideoScene plays the user's video at GameConfig.LOADING_VIDEO_PATH (/assets/video/loading.mp4)
 * using an HTML5 <video muted playsinline autoplay preload="auto"> element scaled to cover the screen.
 * While playing, it loads core assets & builds procedural fallbacks in the background, displaying a
 * sleek blood-red progress bar along the bottom edge and a "Tap to skip" prompt after 2s once ready.
 * Gracefully falls back to a clean dark logo + progress bar if video is missing or autoplay is blocked.
 */
export class LoadingVideoScene extends Phaser.Scene {
  private loadProgress = 0;
  private assetsReady = false;
  private videoFinished = false;
  private transitioned = false;
  private startMs = 0;
  private wrapperEl: HTMLDivElement | null = null;
  private barEl: HTMLDivElement | null = null;
  private skipBtn: HTMLButtonElement | null = null;

  constructor() {
    super({ key: 'LoadingVideoScene' });
  }

  create(): void {
    this.startMs = performance.now();
    this.loadProgress = 0;
    this.assetsReady = false;
    this.videoFinished = false;
    this.transitioned = false;

    UiDomHelper.setBodyState('title');
    UiDomHelper.clearOverlay('LoadingVideoScene');

    // Pre-generate procedural sprites cleanly so fallback textures exist immediately
    TextureGenerator.generateAll(this);

    this.mountVideoDomOverlay();
    void this.probeVideoAndLoadAssets();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cleanupDom();
    });
  }

  private mountVideoDomOverlay(): void {
    this.cleanupDom();

    const wrapper = document.createElement('div');
    wrapper.id = 'loading-video-shell';
    wrapper.className = 'fixed inset-0 z-30 bg-[#07090e] flex flex-col items-center justify-center overflow-hidden pointer-events-auto';
    wrapper.innerHTML = `
      <div id="loading-fallback" class="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#07090e] via-[#170c1a] to-[#07090e]">
        <img src="/icon.svg" alt="BLOODLINE" class="w-24 h-24 sm:w-28 sm:h-28 drop-shadow-2xl mb-4" />
        <h1 class="font-display text-4xl sm:text-6xl font-black tracking-wider text-white text-stroke-dark">BLOODLINE</h1>
        <div class="font-display text-sm sm:text-lg text-amber-200 tracking-[0.25em] mt-1">VAMPIRE VS ZOMBIES</div>
      </div>

      <video
        id="loading-video-el"
        class="hidden absolute inset-0 w-full h-full object-cover"
        muted
        playsinline
        autoplay
        preload="auto"
      ></video>

      <button
        id="loading-skip-btn"
        type="button"
        class="hidden fixed bottom-6 right-5 z-40 min-h-[48px] px-4 py-2 rounded-xl bg-black/75 hover:bg-black/90 border border-amber-400/70 text-amber-200 text-xs sm:text-sm font-semibold cursor-pointer safe-area-hud"
      >
        Tap to skip →
      </button>

      <!-- Ultra-thin blood-red progress indicator along bottom edge -->
      <div class="fixed bottom-0 left-0 right-0 h-1.5 bg-black/80 z-40">
        <div id="loading-blood-bar" class="h-full bg-gradient-to-r from-red-900 via-red-600 to-red-400 transition-[width] duration-150" style="width: 8%;"></div>
      </div>
    `;

    document.body.appendChild(wrapper);
    this.wrapperEl = wrapper;
    this.barEl = wrapper.querySelector('#loading-blood-bar') as HTMLDivElement;
    this.skipBtn = wrapper.querySelector('#loading-skip-btn') as HTMLButtonElement;

    // Unlock Web Audio on first user interaction anywhere on the loading screen
    const unlockAudio = () => {
      AudioManager.getInstance().unlock();
    };
    wrapper.addEventListener('pointerdown', unlockAudio, { passive: true });

    this.skipBtn.onclick = () => {
      AudioManager.getInstance().unlock();
      if (this.assetsReady) {
        this.finishToMenu();
      }
    };
  }

  private async probeVideoAndLoadAssets(): Promise<void> {
    // 1. Check whether user-supplied loading.mp4 exists with a video MIME type
    let videoPlayable = false;
    try {
      const res = await fetch(GameConfig.LOADING_VIDEO_PATH, { method: 'HEAD' });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.startsWith('video/')) {
        videoPlayable = true;
      }
    } catch {
      videoPlayable = false;
    }

    if (!this.scene.isActive()) return;

    const videoEl = this.wrapperEl?.querySelector('#loading-video-el') as HTMLVideoElement | null;
    const fallbackEl = this.wrapperEl?.querySelector('#loading-fallback') as HTMLDivElement | null;

    if (videoPlayable && videoEl) {
      videoEl.src = GameConfig.LOADING_VIDEO_PATH;
      videoEl.classList.remove('hidden');
      fallbackEl?.classList.add('hidden');
      videoEl.onended = () => {
        this.videoFinished = true;
      };
      videoEl.onerror = () => {
        videoEl.classList.add('hidden');
        fallbackEl?.classList.remove('hidden');
        this.videoFinished = true;
      };
      try {
        await videoEl.play();
      } catch {
        // Autoplay blocked -> keep crisp dark logo screen and mark video done after min delay
        videoEl.classList.add('hidden');
        fallbackEl?.classList.remove('hidden');
        window.setTimeout(() => {
          this.videoFinished = true;
        }, GameConfig.MIN_LOADING_DISPLAY_MS);
      }
    } else {
      // Video not yet provided by user -> dark logo fallback for brief polish beat
      window.setTimeout(() => {
        this.videoFinished = true;
      }, GameConfig.MIN_LOADING_DISPLAY_MS);
    }

    // 2. Load core optional sprites from /assets/images in background (lazy per-world assets wait until world load)
    await this.loadCoreAssets();
  }

  private async loadCoreAssets(): Promise<void> {
    const entries = getCoreImageAssets();
    const total = Math.max(1, entries.length);
    const verified: Array<{ key: string; path: string }> = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      try {
        const res = await fetch(entry.path, { method: 'HEAD' });
        const ct = res.headers.get('content-type') || '';
        if (res.ok && ct.startsWith('image/')) {
          verified.push({ key: entry.key, path: entry.path });
        }
      } catch {
        // Optional external asset missing -> procedural fallback covers it
      }
      this.loadProgress = ((i + 1) / total) * 0.7;
      this.updateBar();
    }

    if (!this.scene.isActive()) return;

    if (verified.length === 0) {
      this.loadProgress = 1;
      this.assetsReady = true;
      this.updateBar();
      return;
    }

    for (const item of verified) {
      if (this.textures.exists(item.key)) {
        this.textures.remove(item.key);
      }
      this.load.image(item.key, item.path);
    }

    this.load.on('progress', (val: number) => {
      this.loadProgress = 0.7 + val * 0.3;
      this.updateBar();
    });
    this.load.once('complete', () => {
      this.loadProgress = 1;
      this.assetsReady = true;
      TextureGenerator.generateAll(this);
      this.updateBar();
    });
    this.load.start();
  }

  private updateBar(): void {
    if (this.barEl) {
      const pct = Math.max(8, Math.round(this.loadProgress * 100));
      this.barEl.style.width = `${pct}%`;
    }
  }

  update(): void {
    if (this.transitioned) return;
    const elapsed = performance.now() - this.startMs;

    if (this.skipBtn && this.assetsReady && elapsed >= GameConfig.LOADING_SKIP_DELAY_MS) {
      this.skipBtn.classList.remove('hidden');
    }

    const hitMaxTimeout = elapsed >= GameConfig.LOADING_VIDEO_MAX_MS;
    if (this.assetsReady && (this.videoFinished || hitMaxTimeout)) {
      this.finishToMenu();
    }
  }

  private finishToMenu(): void {
    if (this.transitioned) return;
    this.transitioned = true;
    this.cleanupDom();
    TransitionHelper.transitionTo(this, 'MenuScene', undefined, 'fade', 280);
  }

  private cleanupDom(): void {
    if (this.wrapperEl) {
      const v = this.wrapperEl.querySelector('#loading-video-el') as HTMLVideoElement | null;
      if (v) {
        v.pause();
        v.removeAttribute('src');
      }
      this.wrapperEl.remove();
      this.wrapperEl = null;
    }
    this.barEl = null;
    this.skipBtn = null;
  }
}
