import { GameConfig } from '../config/GameConfig';
import { SaveManager } from './SaveManager';

export type RewardAdReason =
  | 'extra_vampire'
  | 'double_reward'
  | 'free_hint'
  | 'unlock_vampire'
  | 'skip_level';

export type AdFailReason = 'no_ad_available' | 'closed_early' | 'network_error' | 'busy';

/**
 * AdManager handles strictly user-initiated rewarded ads (and optional interstitials, off by default).
 * Uses a built-in Mock 5s Countdown Provider by default, with clean integration hooks for:
 *  - Web: Google AdSense for Games / H5 Games Ads (`window.adBreak`)
 *  - Android Wrapper: Capacitor / AdMob Rewarded Ads (`window.Capacitor?.Plugins?.AdMob`)
 */
export class AdManager {
  private static instance: AdManager;
  private initialized = false;
  private adInFlight = false;
  private simulatedFailureMode: AdFailReason | null = null;

  static getInstance(): AdManager {
    if (!AdManager.instance) {
      AdManager.instance = new AdManager();
    }
    return AdManager.instance;
  }

  init(): void {
    if (this.initialized) return;
    this.initialized = true;
    try {
      // INTEGRATION POINT (WEB - AdSense H5 Games Ads):
      // Initialize window.adConfig({ preloadAdBreaks: 'on', sound: 'on' }) if adBreak script is loaded
      const w = window as unknown as { adConfig?: (cfg: unknown) => void };
      if (typeof w.adConfig === 'function') {
        w.adConfig({ preloadAdBreaks: 'on' });
      }
      // INTEGRATION POINT (ANDROID - Capacitor AdMob):
      // await AdMob.initialize({ requestTrackingAuthorization: true });
    } catch {
      // Safe fallback to mock provider
    }
  }

  isAdReady(): boolean {
    if (!this.initialized) this.init();
    if (this.adInFlight) return false;
    if (this.simulatedFailureMode === 'no_ad_available') return false;
    return true;
  }

  setSimulatedFailure(mode: AdFailReason | null): void {
    this.simulatedFailureMode = mode;
  }

  isInterstitialEnabled(): boolean {
    return !SaveManager.getInstance().getSettings().disableInterstitials;
  }

  setInterstitialDisabled(disabled: boolean): void {
    SaveManager.getInstance().updateSettings({ disableInterstitials: disabled });
  }

  /**
   * Optional interstitial hook (disabled by default via settings.disableInterstitials).
   * Never fires automatically if disabled.
   */
  showInterstitial(onComplete?: () => void): void {
    if (!this.isInterstitialEnabled()) {
      onComplete?.();
      return;
    }
    // INTEGRATION POINT: Google H5 Games adBreak({ type: 'next', ... }) or AdMob.showInterstitial()
    onComplete?.();
  }

  /**
   * User-initiated rewarded ad flow.
   * Guarantees reward callback fires AT MOST ONCE and only upon verified completion.
   */
  showRewardedAd(
    reason: RewardAdReason,
    onReward: () => void,
    onFail: (message: string, code: AdFailReason) => void
  ): void {
    if (!this.initialized) this.init();

    if (this.adInFlight) {
      onFail('An ad is already playing.', 'busy');
      return;
    }

    if (this.simulatedFailureMode === 'no_ad_available' || !this.isAdReady()) {
      onFail('No ad available right now, try again later.', 'no_ad_available');
      return;
    }

    if (this.simulatedFailureMode === 'network_error') {
      onFail('No ad available right now, try again later.', 'network_error');
      return;
    }

    // Check if real Web H5 Games AdSense adBreak is available and configured
    const w = window as unknown as {
      adBreak?: (opts: Record<string, unknown>) => void;
    };
    const hasRealAdSense =
      typeof w.adBreak === 'function' &&
      !GameConfig.ADS.ADSENSE_PUBLISHER_ID.includes('XXXX');

    if (hasRealAdSense) {
      this.adInFlight = true;
      let settled = false;
      try {
        w.adBreak!({
          type: 'reward',
          name: reason,
          beforeReward: (showAdFn: () => void) => showAdFn(),
          adDismissed: () => {
            if (settled) return;
            settled = true;
            this.adInFlight = false;
            onFail('Ad closed early. Watch the full ad to claim your reward.', 'closed_early');
          },
          adViewed: () => {
            if (settled) return;
            settled = true;
            this.adInFlight = false;
            onReward();
          },
          adBreakDone: (info: { breakStatus?: string }) => {
            if (!settled && info?.breakStatus !== 'viewed') {
              settled = true;
              this.adInFlight = false;
              onFail('No ad available right now, try again later.', 'no_ad_available');
            }
          },
        });
        return;
      } catch {
        this.adInFlight = false;
      }
    }

    // Default MOCK 5-second countdown video ad overlay for browser & local testing
    this.runMockRewardedAd(reason, onReward, onFail);
  }

  private runMockRewardedAd(
    reason: RewardAdReason,
    onReward: () => void,
    onFail: (message: string, code: AdFailReason) => void
  ): void {
    if (typeof document === 'undefined') {
      onFail('No ad available right now, try again later.', 'no_ad_available');
      return;
    }

    this.adInFlight = true;
    let rewardClaimed = false;
    let remaining = GameConfig.ADS.MOCK_AD_DURATION_SEC;

    const overlay = document.createElement('div');
    overlay.id = 'mock-ad-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Sponsored Video Ad');
    overlay.className =
      'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 pointer-events-auto';

    const reasonLabel: Record<RewardAdReason, string> = {
      extra_vampire: 'Extra Vampire Revive',
      double_reward: '2x Victory Reward',
      free_hint: 'Free Aiming Trajectory Hint',
      unlock_vampire: 'Trial Vampire Unlock',
      skip_level: 'Skip Stage (1★ Clear)',
    };

    overlay.innerHTML = `
      <div class="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl gothic-panel p-4 sm:p-6 text-center shadow-2xl">
        <div class="text-xs uppercase tracking-widest text-amber-400">Mock Rewarded Ad</div>
        <h3 class="font-display text-lg sm:text-xl font-bold text-white mt-1">${reasonLabel[reason]}</h3>
        <div class="my-3 sm:my-4 p-4 sm:p-5 rounded-xl bg-[#07090e] border border-slate-800 flex flex-col items-center gap-2">
          <div class="text-sm text-slate-300">Simulated Sponsor Preview</div>
          <div id="mock-ad-timer" class="font-mono-num text-2xl sm:text-3xl font-bold text-amber-400">${remaining}s</div>
          <div class="text-xs text-slate-400">Publisher: ${GameConfig.ADS.ADSENSE_PUBLISHER_ID}</div>
        </div>
        <div class="flex flex-col gap-2">
          <button id="mock-ad-claim" type="button" disabled class="w-full min-h-[48px] py-2.5 px-4 rounded-xl bg-slate-700 text-slate-400 font-semibold text-sm cursor-not-allowed">
            Reward unlocks in ${remaining}s...
          </button>
          <button id="mock-ad-close" type="button" class="w-full min-h-[44px] py-2 px-4 rounded-xl bg-transparent hover:bg-slate-800 text-slate-400 text-xs cursor-pointer">
            Close Ad Early (No Reward)
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const timerEl = overlay.querySelector('#mock-ad-timer') as HTMLElement;
    const claimBtn = overlay.querySelector('#mock-ad-claim') as HTMLButtonElement;
    const closeBtn = overlay.querySelector('#mock-ad-close') as HTMLButtonElement;

    const cleanup = () => {
      clearInterval(intervalId);
      overlay.remove();
      this.adInFlight = false;
    };

    const intervalId = window.setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        timerEl.textContent = `${remaining}s`;
        claimBtn.textContent = `Reward unlocks in ${remaining}s...`;
      } else {
        clearInterval(intervalId);
        timerEl.textContent = 'Ready';
        claimBtn.disabled = false;
        claimBtn.className =
          'w-full min-h-[48px] py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm cursor-pointer';
        claimBtn.textContent = 'Claim Reward & Continue';
      }
    }, 1000);

    claimBtn.onclick = () => {
      if (remaining > 0 || rewardClaimed) return;
      rewardClaimed = true;
      cleanup();
      onReward();
    };

    closeBtn.onclick = () => {
      if (rewardClaimed) return;
      cleanup();
      onFail('Ad closed early. Watch the full ad to receive the reward.', 'closed_early');
    };
  }
}
