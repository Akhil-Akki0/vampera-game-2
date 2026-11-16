import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { ACHIEVEMENTS } from '../data/Achievements';
import { getWorldForLevel, WORLDS } from '../data/WorldConfig';
import { AudioManager } from '../systems/AudioManager';
import { DeviceScaler } from '../systems/DeviceScaler';
import { SaveManager } from '../systems/SaveManager';
import { TutorialSystem } from '../systems/TutorialSystem';
import { TransitionHelper } from '../utils/TransitionHelper';
import { UiDomHelper } from '../utils/UiDomHelper';
import { WorldBackdrop } from '../utils/WorldBackdrop';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

/**
 * MenuScene renders the gothic moonlit title screen with themed buttons,
 * Vampire Codex, How to Play gesture guide, PWA Install option, adaptive music,
 * first-launch consent dialog, and portrait orientation hint.
 */
export class MenuScene extends Phaser.Scene {
  private backdrop: WorldBackdrop | null = null;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
  private installListener: ((e: Event) => void) | null = null;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const save = SaveManager.getInstance();
    const state = save.getState();
    const world = WORLDS[0];
    AudioManager.getInstance().setWorldTheme(world);
    AudioManager.getInstance().setMusicMode('menu');

    this.backdrop = new WorldBackdrop(this, world, state.settings.graphicsQuality);
    UiDomHelper.setBodyState('title');

    this.installListener = (e: Event) => {
      e.preventDefault();
      this.deferredInstallPrompt = e as BeforeInstallPromptEvent;
      this.renderUi();
    };
    window.addEventListener('beforeinstallprompt', this.installListener);

    this.renderUi();

    if (!state.consentAccepted) {
      UiDomHelper.showConsentModal(() => {
        this.renderUi();
      });
    }

    this.keyHandler = (e: KeyboardEvent) => {
      if (
        document.getElementById('consent-modal') ||
        document.getElementById('settings-modal') ||
        document.getElementById('info-modal') ||
        document.getElementById('tutorial-modal')
      ) {
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.launchPlay();
      }
    };
    window.addEventListener('keydown', this.keyHandler);

    DeviceScaler.getInstance().setBackHandler(() => {
      const openModal =
        document.getElementById('settings-modal') ||
        document.getElementById('info-modal');
      if (openModal) openModal.remove();
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      DeviceScaler.getInstance().setBackHandler(null);
      if (this.keyHandler) {
        window.removeEventListener('keydown', this.keyHandler);
        this.keyHandler = null;
      }
      if (this.installListener) {
        window.removeEventListener('beforeinstallprompt', this.installListener);
        this.installListener = null;
      }
      this.backdrop?.destroy();
      this.backdrop = null;
      UiDomHelper.clearOverlay('MenuScene');
    });
  }

  update(_time: number, delta: number): void {
    this.backdrop?.update(Math.min(0.05, delta / 1000));
  }

  private launchPlay(): void {
    const save = SaveManager.getInstance();
    AudioManager.getInstance().unlock();
    AudioManager.getInstance().playUiClick();
    const targetLevel = Math.max(1, Math.min(save.getState().currentLevel || 1, save.getState().unlockedLevel));
    TransitionHelper.launchStageWithIntroCheck(this, targetLevel);
  }

  private renderUi(): void {
    const save = SaveManager.getInstance();
    const state = save.getState();
    const continueLv = Math.max(1, Math.min(state.currentLevel || 1, state.unlockedLevel));
    const { world } = getWorldForLevel(continueLv);
    const canDaily = save.canClaimDailyReward();
    const totalStars = Object.values(state.levels).reduce((acc, r) => acc + (r?.stars || 0), 0);

    const isStandalone =
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true);
    const isIOS =
      typeof window !== 'undefined' && /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    const showInstall = !isStandalone && (Boolean(this.deferredInstallPrompt) || isIOS);

    const overlay = UiDomHelper.getOverlay('MenuScene');
    overlay.innerHTML = `
      <div class="w-full h-full flex flex-col justify-between p-4 sm:p-6 safe-area-hud pointer-events-none">
        <div class="flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
          <div class="flex items-center gap-3 px-3.5 py-2 rounded-xl gothic-panel text-xs sm:text-sm">
            <span class="text-amber-400 font-semibold">Coins:</span>
            <span id="menu-coins" class="font-mono-num font-bold text-white">${state.coins}</span>
            <span class="text-slate-600">|</span>
            <span class="text-yellow-300 font-semibold">Stars:</span>
            <span class="font-mono-num font-bold text-white">${totalStars}</span>
          </div>
          <div class="flex items-center gap-2">
            ${
              showInstall
                ? `<button id="menu-install-btn" type="button" class="min-h-[48px] px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 border border-emerald-400/70 gothic-btn text-white text-xs sm:text-sm font-semibold whitespace-nowrap cursor-pointer">Install App</button>`
                : ''
            }
            <button id="menu-daily-btn" type="button" class="min-h-[48px] px-3.5 py-2 rounded-xl border gothic-btn text-xs sm:text-sm font-semibold whitespace-nowrap cursor-pointer ${
              canDaily
                ? 'bg-amber-600 hover:bg-amber-500 border-amber-300 text-slate-950'
                : 'bg-[#0e131f]/95 border-slate-700 text-slate-400'
            }">
              ${canDaily ? `Daily +${GameConfig.DAILY_REWARD_COINS}` : 'Daily Claimed'}
            </button>
            <button id="menu-settings-btn" type="button" class="min-h-[48px] px-3.5 py-2 rounded-xl bg-[#0e131f]/95 hover:bg-slate-800 border border-slate-600 gothic-btn text-slate-100 text-xs sm:text-sm font-semibold whitespace-nowrap cursor-pointer">
              Settings
            </button>
          </div>
        </div>

        <!-- Portrait hint for mobile web browsers -->
        <div class="hidden portrait:block sm:portrait:hidden mx-auto px-3.5 py-1.5 rounded-lg bg-[#0d111a]/95 border border-amber-500/60 text-[11px] text-amber-200 pointer-events-none">
          Rotate device to landscape for the best aiming view
        </div>

        <div class="my-auto flex flex-col items-center text-center pointer-events-auto max-w-2xl mx-auto">
          <div class="text-xs sm:text-sm uppercase tracking-[0.28em] text-red-400 font-semibold mb-1">
            ${GameConfig.TOTAL_LEVELS}+ Stages · 10 Gothic Worlds
          </div>
          <h1 class="font-display text-5xl sm:text-7xl font-black tracking-wider text-white text-stroke-dark">
            BLOODLINE
          </h1>
          <div class="font-display text-lg sm:text-2xl text-amber-200 tracking-wide mt-1">
            Vampire vs Zombies
          </div>

          <div class="mt-5 flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
            <button id="menu-play-btn" data-start="true" type="button" class="w-full sm:flex-1 min-h-[54px] px-6 py-3 rounded-xl bg-red-700 hover:bg-red-600 border-2 border-amber-400/80 gothic-btn text-white font-display font-bold text-lg tracking-wide cursor-pointer whitespace-nowrap">
              ${continueLv > 1 ? `Continue · Lv ${continueLv}` : 'Play Stage 1'}
            </button>
            <button id="menu-worlds-btn" type="button" class="w-full sm:w-auto min-h-[54px] px-5 py-3 rounded-xl bg-[#111622]/95 hover:bg-slate-800 border-2 border-amber-700/70 gothic-btn text-slate-100 font-semibold text-sm sm:text-base cursor-pointer whitespace-nowrap">
              World Map
            </button>
          </div>

          <div class="mt-2.5 text-xs text-slate-300">
            Current Realm: <span class="text-amber-300 font-semibold">${world.name}</span>
          </div>

          <div class="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button id="menu-codex-btn" type="button" class="min-h-[48px] px-4 py-2 rounded-xl bg-[#0e131f]/95 hover:bg-slate-800 border border-amber-700/60 gothic-btn text-amber-200 text-xs sm:text-sm font-semibold whitespace-nowrap cursor-pointer">
              Vampire Codex
            </button>
            <button id="menu-shop-btn" type="button" class="min-h-[48px] px-4 py-2 rounded-xl bg-[#0e131f]/95 hover:bg-slate-800 border border-slate-600 gothic-btn text-slate-200 text-xs sm:text-sm font-semibold whitespace-nowrap cursor-pointer">
              Crypt Shop
            </button>
            <button id="menu-achieve-btn" type="button" class="min-h-[48px] px-4 py-2 rounded-xl bg-[#0e131f]/95 hover:bg-slate-800 border border-slate-600 gothic-btn text-slate-200 text-xs sm:text-sm font-semibold whitespace-nowrap cursor-pointer">
              Achievements
            </button>
            <button id="menu-how-btn" type="button" class="min-h-[48px] px-4 py-2 rounded-xl bg-[#0e131f]/95 hover:bg-slate-800 border border-slate-600 gothic-btn text-slate-200 text-xs sm:text-sm font-semibold whitespace-nowrap cursor-pointer">
              How to Play
            </button>
            <button id="menu-credits-btn" type="button" class="min-h-[48px] px-4 py-2 rounded-xl bg-[#0e131f]/95 hover:bg-slate-800 border border-slate-600 gothic-btn text-slate-200 text-xs sm:text-sm font-semibold whitespace-nowrap cursor-pointer">
              Credits
            </button>
          </div>
        </div>

        <div class="flex items-center justify-between text-xs text-slate-400 pointer-events-auto">
          <span>Drag crossbow back to launch · Tap mid-air for power</span>
          <a href="${GameConfig.ADS.PRIVACY_POLICY_URL}" target="_blank" rel="noopener noreferrer" class="underline hover:text-slate-200 whitespace-nowrap">Privacy Policy</a>
        </div>
      </div>
    `;

    UiDomHelper.attachHoverAudio(overlay);

    const installBtn = overlay.querySelector('#menu-install-btn') as HTMLButtonElement | null;
    if (installBtn) {
      installBtn.onclick = async () => {
        AudioManager.getInstance().playUiClick();
        if (this.deferredInstallPrompt) {
          await this.deferredInstallPrompt.prompt();
          const choice = await this.deferredInstallPrompt.userChoice;
          if (choice.outcome === 'accepted') {
            this.deferredInstallPrompt = null;
            this.renderUi();
          }
        } else {
          UiDomHelper.showInfoModal(
            'Install on iPhone / iPad',
            '<p>1. Tap the <strong>Share</strong> button in Safari toolbar.</p><p>2. Scroll down and tap <strong>Add to Home Screen</strong> for full-screen offline play.</p>'
          );
        }
      };
    }

    (overlay.querySelector('#menu-play-btn') as HTMLButtonElement).onclick = () => this.launchPlay();
    (overlay.querySelector('#menu-worlds-btn') as HTMLButtonElement).onclick = () => {
      AudioManager.getInstance().unlock();
      AudioManager.getInstance().playUiClick();
      TransitionHelper.transitionTo(this, 'WorldMapScene', undefined, 'curtain', 280);
    };
    (overlay.querySelector('#menu-codex-btn') as HTMLButtonElement).onclick = () => {
      AudioManager.getInstance().unlock();
      AudioManager.getInstance().playUiClick();
      TransitionHelper.transitionTo(this, 'CodexScene', undefined, 'curtain', 260);
    };
    (overlay.querySelector('#menu-shop-btn') as HTMLButtonElement).onclick = () => {
      AudioManager.getInstance().unlock();
      AudioManager.getInstance().playUiClick();
      TransitionHelper.transitionTo(this, 'ShopScene', undefined, 'fade', 250);
    };
    (overlay.querySelector('#menu-daily-btn') as HTMLButtonElement).onclick = () => {
      AudioManager.getInstance().unlock();
      const gained = save.claimDailyReward();
      if (gained > 0) {
        AudioManager.getInstance().playCoinPickup();
        UiDomHelper.showToast(`Daily Reward claimed: +${gained} Coins!`, 'success');
        this.renderUi();
      } else {
        AudioManager.getInstance().playUiClick();
        UiDomHelper.showToast('Daily Reward already claimed today. Return tomorrow!', 'info');
      }
    };
    (overlay.querySelector('#menu-settings-btn') as HTMLButtonElement).onclick = () => {
      AudioManager.getInstance().playUiClick();
      UiDomHelper.showSettingsModal({
        onResetProgress: () => this.renderUi(),
      });
    };
    (overlay.querySelector('#menu-achieve-btn') as HTMLButtonElement).onclick = () => {
      AudioManager.getInstance().playUiClick();
      const unlocked = save.getState().unlockedAchievements;
      const html = ACHIEVEMENTS.map((a) => {
        const done = unlocked.includes(a.id);
        return `
          <div class="p-3 rounded-lg border ${done ? 'bg-emerald-950/60 border-emerald-600' : 'bg-[#141a29] border-slate-800'} flex items-center justify-between gap-3">
            <div>
              <div class="font-semibold ${done ? 'text-emerald-300' : 'text-slate-200'}">${done ? '✓ ' : ''}${a.name}</div>
              <div class="text-xs text-slate-400">${a.description}</div>
            </div>
            <div class="font-mono-num text-xs font-bold text-amber-400 whitespace-nowrap">+${a.rewardCoins}c</div>
          </div>
        `;
      }).join('');
      UiDomHelper.showInfoModal('Achievements', html);
    };
    (overlay.querySelector('#menu-how-btn') as HTMLButtonElement).onclick = () => {
      AudioManager.getInstance().playUiClick();
      TutorialSystem.showHowToPlayModal({
        onReplayTutorial: () => {
          TransitionHelper.launchStageWithIntroCheck(this, 1);
        },
      });
    };
    (overlay.querySelector('#menu-credits-btn') as HTMLButtonElement).onclick = () => {
      AudioManager.getInstance().playUiClick();
      UiDomHelper.showInfoModal(
        'Credits',
        `
          <p><strong>BLOODLINE: Vampire vs Zombies</strong></p>
          <p class="text-slate-400">Built with Phaser, Matter.js physics, multi-layer parallax gothic art, Web Audio synthesis, and Capacitor Android/PWA offline support.</p>
          <p class="text-xs text-slate-500">1000+ Deterministic Stages · 10 Worlds · 9 Vampires · 7 Undead Types.</p>
        `
      );
    };
  }
}
