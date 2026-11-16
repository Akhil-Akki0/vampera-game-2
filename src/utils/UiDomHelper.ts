import { GameConfig, GraphicsQuality } from '../config/GameConfig';
import { AdManager } from '../systems/AdManager';
import { AudioManager } from '../systems/AudioManager';
import { SaveManager } from '../systems/SaveManager';

export type BodyUiState = 'title' | 'playing' | 'paused' | 'gameover';

export class UiDomHelper {
  private static overlayToken = 0;

  static getOverlay(owner?: string): HTMLElement {
    let el = document.getElementById('ui-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ui-overlay';
      el.className = 'fixed inset-0 pointer-events-none z-20';
      document.body.appendChild(el);
    }
    el.dataset.owner = owner ?? `anon-${++this.overlayToken}`;
    return el;
  }

  static clearOverlay(owner?: string): void {
    const el = document.getElementById('ui-overlay');
    if (!el) return;
    if (owner && el.dataset.owner && el.dataset.owner !== owner) return;
    el.innerHTML = '';
    delete el.dataset.owner;
  }

  static setBodyState(state: BodyUiState): void {
    document.body.dataset.state = state;
  }

  static attachHoverAudio(root: ParentNode): void {
    root.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('mouseenter', () => {
        if (!btn.disabled) AudioManager.getInstance().playUiHover();
      });
    });
  }

  static showToast(message: string, variant: 'info' | 'error' | 'success' = 'info'): void {
    const existing = document.getElementById('bloodline-toast');
    if (existing) existing.remove();

    const colors =
      variant === 'error'
        ? 'bg-red-950 border-red-500 text-red-100'
        : variant === 'success'
          ? 'bg-emerald-950 border-emerald-500 text-emerald-100'
          : 'bg-[#111622] border-amber-500/70 text-slate-100';

    const toast = document.createElement('div');
    toast.id = 'bloodline-toast';
    toast.setAttribute('role', 'status');
    toast.className = `fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg border shadow-xl text-sm font-semibold pointer-events-none ${colors}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    window.setTimeout(() => {
      toast.remove();
    }, 3200);
  }

  static showConsentModal(onAccept: () => void): void {
    const existing = document.getElementById('consent-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'consent-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Privacy and Consent Notice');
    modal.className =
      'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 pointer-events-auto';

    modal.innerHTML = `
      <div class="w-full max-w-md rounded-xl gothic-panel p-6 shadow-2xl">
        <div class="text-xs uppercase tracking-widest text-amber-400 font-semibold">Privacy &amp; Game Data</div>
        <h2 class="font-display text-xl font-bold text-white mt-1">Welcome to BLOODLINE</h2>
        <p class="text-sm text-slate-300 mt-3 leading-relaxed">
          Your progress, high scores, and settings are saved locally on this device. Optional rewarded video ads are strictly player-initiated and never interrupt gameplay automatically.
        </p>
        <div class="mt-4 text-xs text-slate-400">
          Review our
          <a href="${GameConfig.ADS.PRIVACY_POLICY_URL}" target="_blank" rel="noopener noreferrer" class="text-amber-400 underline hover:text-amber-300">Privacy Policy</a>
          anytime from the main menu.
        </div>
        <button id="consent-accept-btn" type="button" class="mt-5 w-full min-h-[44px] py-2.5 px-4 rounded-lg bg-red-700 hover:bg-red-600 border border-red-400/60 gothic-btn text-white font-semibold text-sm cursor-pointer">
          Accept &amp; Enter the Crypt
        </button>
      </div>
    `;

    document.body.appendChild(modal);
    const btn = modal.querySelector('#consent-accept-btn') as HTMLButtonElement;
    btn.onclick = () => {
      SaveManager.getInstance().acceptConsent();
      AudioManager.getInstance().playUiClick();
      modal.remove();
      onAccept();
    };
  }

  static showSettingsModal(options: {
    onSettingsChanged?: () => void;
    onResetProgress?: () => void;
    onClose?: () => void;
  }): void {
    const existing = document.getElementById('settings-modal');
    if (existing) existing.remove();

    const save = SaveManager.getInstance();
    const settings = save.getSettings();
    AudioManager.getInstance().playPopupOpen(true);

    const modal = document.createElement('div');
    modal.id = 'settings-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Game Settings');
    modal.className =
      'fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/80 pointer-events-auto';

    modal.innerHTML = `
      <div class="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl gothic-panel p-6 shadow-2xl">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 class="font-display text-xl font-bold text-white">Settings</h2>
          <button id="settings-close-x" type="button" aria-label="Close Settings" class="min-w-[44px] min-h-[44px] rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 gothic-btn text-slate-200 font-bold cursor-pointer">✕</button>
        </div>

        <div class="mt-4 space-y-4 text-sm">
          <div>
            <div class="flex justify-between text-slate-300 mb-1">
              <label for="set-music">Music Volume</label>
              <span id="set-music-val" class="font-mono-num text-amber-300">${Math.round(settings.musicVolume * 100)}%</span>
            </div>
            <input id="set-music" type="range" min="0" max="1" step="0.05" value="${settings.musicVolume}" class="w-full accent-red-600 cursor-pointer" />
          </div>

          <div>
            <div class="flex justify-between text-slate-300 mb-1">
              <label for="set-sfx">SFX Volume</label>
              <span id="set-sfx-val" class="font-mono-num text-amber-300">${Math.round(settings.sfxVolume * 100)}%</span>
            </div>
            <input id="set-sfx" type="range" min="0" max="1" step="0.05" value="${settings.sfxVolume}" class="w-full accent-red-600 cursor-pointer" />
          </div>

          <div>
            <div class="flex justify-between text-slate-300 mb-1">
              <label for="set-ambient">Ambient Weather Volume</label>
              <span id="set-ambient-val" class="font-mono-num text-amber-300">${Math.round((settings.ambientVolume ?? 0.55) * 100)}%</span>
            </div>
            <input id="set-ambient" type="range" min="0" max="1" step="0.05" value="${settings.ambientVolume ?? 0.55}" class="w-full accent-red-600 cursor-pointer" />
          </div>

          <label class="flex items-center justify-between py-1 cursor-pointer">
            <span class="text-slate-200">Mute All Audio</span>
            <input id="set-mute" type="checkbox" ${settings.muted ? 'checked' : ''} class="w-5 h-5 accent-red-600 cursor-pointer" />
          </label>

          <label class="flex items-center justify-between py-1 cursor-pointer">
            <span class="text-slate-200">Trajectory Preview</span>
            <input id="set-traj" type="checkbox" ${settings.showTrajectory ? 'checked' : ''} class="w-5 h-5 accent-red-600 cursor-pointer" />
          </label>

          <label class="flex items-center justify-between py-1 cursor-pointer">
            <span class="text-slate-200">Disable Interstitial Ads</span>
            <input id="set-noads" type="checkbox" ${settings.disableInterstitials ? 'checked' : ''} class="w-5 h-5 accent-red-600 cursor-pointer" />
          </label>

          <div>
            <label for="set-quality" class="block text-slate-300 mb-1">Graphics Quality</label>
            <select id="set-quality" class="w-full min-h-[48px] px-3 rounded-lg bg-[#161e2e] border border-slate-700 text-slate-100 cursor-pointer">
              <option value="low" ${settings.graphicsQuality === 'low' ? 'selected' : ''}>Low (Battery Saver)</option>
              <option value="medium" ${settings.graphicsQuality === 'medium' ? 'selected' : ''}>Medium</option>
              <option value="high" ${settings.graphicsQuality === 'high' ? 'selected' : ''}>High (Full Effects)</option>
              <option value="ultra" ${settings.graphicsQuality === 'ultra' ? 'selected' : ''}>Ultra (Cinematic)</option>
            </select>
          </div>

          <div class="pt-3 border-t border-slate-800 space-y-2">
            <button id="set-replay-tut" type="button" class="w-full min-h-[48px] py-2 px-4 rounded-lg bg-amber-900/60 hover:bg-amber-800/70 border border-amber-500/60 gothic-btn text-amber-200 font-semibold cursor-pointer">
              Replay Tutorial Next Stage
            </button>
            <button id="set-reset-btn" type="button" class="w-full min-h-[48px] py-2 px-4 rounded-lg bg-red-950 hover:bg-red-900 border border-red-700 gothic-btn text-red-200 font-semibold cursor-pointer">
              Reset Saved Progress
            </button>
            <div id="set-reset-confirm" class="hidden mt-2 p-3 rounded-lg bg-red-950/90 border border-red-600">
              <p class="text-xs text-red-100 mb-2">Erase all stars, unlocked levels, coins, and skins?</p>
              <div class="flex gap-2">
                <button id="set-reset-yes" type="button" class="flex-1 min-h-[44px] rounded bg-red-600 hover:bg-red-500 text-white font-semibold text-xs cursor-pointer">Yes, Reset</button>
                <button id="set-reset-no" type="button" class="flex-1 min-h-[44px] rounded bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs cursor-pointer">Cancel</button>
              </div>
            </div>
          </div>
        </div>

        <button id="settings-done-btn" type="button" class="mt-5 w-full min-h-[44px] py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 gothic-btn text-white font-semibold cursor-pointer">
          Done
        </button>
      </div>
    `;

    document.body.appendChild(modal);
    this.attachHoverAudio(modal);

    const musicInput = modal.querySelector('#set-music') as HTMLInputElement;
    const sfxInput = modal.querySelector('#set-sfx') as HTMLInputElement;
    const ambientInput = modal.querySelector('#set-ambient') as HTMLInputElement;
    const muteInput = modal.querySelector('#set-mute') as HTMLInputElement;
    const trajInput = modal.querySelector('#set-traj') as HTMLInputElement;
    const noAdsInput = modal.querySelector('#set-noads') as HTMLInputElement;
    const qualitySelect = modal.querySelector('#set-quality') as HTMLSelectElement;
    const musicVal = modal.querySelector('#set-music-val') as HTMLElement;
    const sfxVal = modal.querySelector('#set-sfx-val') as HTMLElement;
    const ambientVal = modal.querySelector('#set-ambient-val') as HTMLElement;

    const sync = () => {
      const updated = save.updateSettings({
        musicVolume: Number(musicInput.value),
        sfxVolume: Number(sfxInput.value),
        ambientVolume: Number(ambientInput.value),
        muted: muteInput.checked,
        showTrajectory: trajInput.checked,
        disableInterstitials: noAdsInput.checked,
        graphicsQuality: qualitySelect.value as GraphicsQuality,
      });
      musicVal.textContent = `${Math.round(updated.musicVolume * 100)}%`;
      sfxVal.textContent = `${Math.round(updated.sfxVolume * 100)}%`;
      ambientVal.textContent = `${Math.round(updated.ambientVolume * 100)}%`;
      AudioManager.getInstance().updateSettings(updated);
      AdManager.getInstance().setInterstitialDisabled(updated.disableInterstitials);
      options.onSettingsChanged?.();
    };

    musicInput.oninput = sync;
    sfxInput.oninput = sync;
    ambientInput.oninput = sync;
    muteInput.onchange = sync;
    trajInput.onchange = sync;
    noAdsInput.onchange = sync;
    qualitySelect.onchange = sync;

    const replayTutBtn = modal.querySelector('#set-replay-tut') as HTMLButtonElement | null;
    if (replayTutBtn) {
      replayTutBtn.onclick = () => {
        AudioManager.getInstance().playUiClick();
        save.updateSettings({ tutorialSeen: false });
        UiDomHelper.showToast('Tutorial will play again on your next stage!', 'success');
      };
    }

    const resetBtn = modal.querySelector('#set-reset-btn') as HTMLButtonElement;
    const resetConfirm = modal.querySelector('#set-reset-confirm') as HTMLElement;
    const resetYes = modal.querySelector('#set-reset-yes') as HTMLButtonElement;
    const resetNo = modal.querySelector('#set-reset-no') as HTMLButtonElement;

    resetBtn.onclick = () => resetConfirm.classList.remove('hidden');
    resetNo.onclick = () => resetConfirm.classList.add('hidden');
    resetYes.onclick = () => {
      save.resetProgress();
      UiDomHelper.showToast('Progress reset to Stage 1.', 'info');
      modal.remove();
      options.onResetProgress?.();
    };

    const closeModal = () => {
      AudioManager.getInstance().playPopupOpen(false);
      modal.remove();
      options.onClose?.();
    };
    (modal.querySelector('#settings-close-x') as HTMLButtonElement).onclick = closeModal;
    (modal.querySelector('#settings-done-btn') as HTMLButtonElement).onclick = closeModal;
  }

  static showInfoModal(title: string, htmlBody: string, onClose?: () => void): void {
    const existing = document.getElementById('info-modal');
    if (existing) existing.remove();

    AudioManager.getInstance().playPopupOpen(true);
    const modal = document.createElement('div');
    modal.id = 'info-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', title);
    modal.className =
      'fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/80 pointer-events-auto';

    modal.innerHTML = `
      <div class="w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-xl gothic-panel p-6 shadow-2xl">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 class="font-display text-xl font-bold text-white">${title}</h2>
          <button id="info-close-x" type="button" aria-label="Close" class="min-w-[44px] min-h-[44px] rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 gothic-btn text-slate-200 font-bold cursor-pointer">✕</button>
        </div>
        <div class="mt-4 text-sm text-slate-300 space-y-3 leading-relaxed">${htmlBody}</div>
        <button id="info-done-btn" type="button" class="mt-5 w-full min-h-[44px] py-2.5 px-4 rounded-lg bg-red-700 hover:bg-red-600 border border-red-400/50 gothic-btn text-white font-semibold cursor-pointer">
          Close
        </button>
      </div>
    `;

    document.body.appendChild(modal);
    this.attachHoverAudio(modal);
    const close = () => {
      AudioManager.getInstance().playPopupOpen(false);
      modal.remove();
      onClose?.();
    };
    (modal.querySelector('#info-close-x') as HTMLButtonElement).onclick = close;
    (modal.querySelector('#info-done-btn') as HTMLButtonElement).onclick = close;
  }
}
