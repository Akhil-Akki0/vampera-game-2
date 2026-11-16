import { GameConfig, GraphicsQuality } from '../config/GameConfig';
import { AudioManager } from './AudioManager';
import { SaveManager } from './SaveManager';

export interface SafeInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * DeviceScaler handles mobile-first cross-device adaptation:
 * - Capped DPR calculation for crisp high-DPI rendering without GPU overload
 * - Automatic low-end hardware detection & rolling FPS auto-downgrade
 * - Safe-area inset reading & portrait orientation hints on web
 * - Android Capacitor back-button + minimize/resume interruption handling
 */
export class DeviceScaler {
  private static instance: DeviceScaler;
  private backHandler: (() => void) | null = null;
  private fpsSamples: number[] = [];
  private autoScaledOnce = false;
  private resizeListeners = new Set<() => void>();

  static getInstance(): DeviceScaler {
    if (!DeviceScaler.instance) {
      DeviceScaler.instance = new DeviceScaler();
    }
    return DeviceScaler.instance;
  }

  getRecommendedDpr(): number {
    if (typeof window === 'undefined') return 1;
    const dpr = window.devicePixelRatio || 1;
    return Math.min(GameConfig.MAX_DPR, Math.max(1, dpr));
  }

  isLowEndDevice(): boolean {
    if (typeof navigator === 'undefined') return false;
    const nav = navigator as Navigator & { deviceMemory?: number };
    const lowMem = typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 2;
    const lowCores = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4;
    return lowMem || lowCores;
  }

  detectInitialQuality(): GraphicsQuality {
    const save = SaveManager.getInstance();
    const cur = save.getSettings().graphicsQuality;
    if (this.isLowEndDevice() && (cur === 'high' || cur === 'ultra')) {
      save.updateSettings({ graphicsQuality: 'medium' });
      return 'medium';
    }
    return cur;
  }

  /**
   * Monitors active gameplay FPS; if sustained drops occur on mobile devices,
   * automatically steps quality down once to maintain playable responsiveness.
   */
  recordFrameFps(fps: number): void {
    if (this.autoScaledOnce || !Number.isFinite(fps) || fps <= 0) return;
    this.fpsSamples.push(fps);
    if (this.fpsSamples.length < 90) return;

    const avg = this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length;
    this.fpsSamples = [];
    if (avg < GameConfig.LOW_END_FPS_THRESHOLD) {
      this.autoScaledOnce = true;
      const save = SaveManager.getInstance();
      const cur = save.getSettings().graphicsQuality;
      const next: GraphicsQuality =
        cur === 'ultra' ? 'high' : cur === 'high' ? 'medium' : cur === 'medium' ? 'low' : 'low';
      if (next !== cur) {
        save.updateSettings({ graphicsQuality: next });
      }
    }
  }

  isPortrait(): boolean {
    if (typeof window === 'undefined') return false;
    return window.innerHeight > window.innerWidth;
  }

  getScreenClass(): 'compact-phone' | 'phone' | 'tablet' | 'desktop' {
    if (typeof window === 'undefined') return 'desktop';
    const minSide = Math.min(window.innerWidth, window.innerHeight);
    const maxSide = Math.max(window.innerWidth, window.innerHeight);
    if (maxSide < 720) return 'compact-phone';
    if (minSide < 600) return 'phone';
    if (minSide < 960) return 'tablet';
    return 'desktop';
  }

  setBackHandler(fn: (() => void) | null): void {
    this.backHandler = fn;
  }

  triggerBack(): void {
    if (this.backHandler) {
      this.backHandler();
    }
  }

  onViewportChange(cb: () => void): () => void {
    this.resizeListeners.add(cb);
    return () => this.resizeListeners.delete(cb);
  }

  bindGlobalMobileGuards(onBackground: () => void, onForeground: () => void): void {
    if (typeof window === 'undefined') return;

    // Prevent accidental long-press context menus & Safari pinch gestures
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });

    // Notify listeners on resize/orientationchange
    const notifyResize = () => {
      this.resizeListeners.forEach((cb) => cb());
    };
    window.addEventListener('resize', notifyResize);
    window.addEventListener('orientationchange', notifyResize);

    // Pause audio & game on screen lock, minimize, tab switch, or call interruption
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        AudioManager.getInstance().setPaused(true);
        onBackground();
      } else {
        AudioManager.getInstance().setPaused(false);
        onForeground();
      }
    });
    window.addEventListener('blur', () => {
      AudioManager.getInstance().setPaused(true);
      onBackground();
    });

    // Capacitor Android Hardware Back Button + App State Listener (safe optional binding)
    try {
      const cap = (window as unknown as {
        Capacitor?: {
          Plugins?: {
            App?: {
              addListener?: (
                evt: string,
                cb: (state?: { isActive?: boolean }) => void
              ) => void;
            };
          };
        };
      }).Capacitor;

      const appPlugin = cap?.Plugins?.App;
      if (appPlugin && typeof appPlugin.addListener === 'function') {
        appPlugin.addListener('backButton', () => this.triggerBack());
        appPlugin.addListener('appStateChange', (state) => {
          if (state?.isActive === false) {
            AudioManager.getInstance().setPaused(true);
            onBackground();
          } else if (state?.isActive === true) {
            AudioManager.getInstance().setPaused(false);
            onForeground();
          }
        });
      }
    } catch {
      // Running in standard browser without Capacitor native bridge
    }
  }
}
