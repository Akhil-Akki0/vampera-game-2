import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { VAMPIRE_TYPES, VampireTypeId } from '../data/VampireTypes';
import { ZombieMeta } from '../data/ZombieTypes';
import { AdManager } from '../systems/AdManager';
import { AudioManager } from '../systems/AudioManager';
import { LevelGenerator } from '../systems/LevelGenerator';
import { SaveManager } from '../systems/SaveManager';
import { TutorialSystem } from '../systems/TutorialSystem';
import { UiDomHelper } from '../utils/UiDomHelper';
import type { GameScene, HudSnapshot } from './GameScene';

const SVG_EYE = `<svg viewBox="0 0 24 24" class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
const SVG_SOUND = `<svg viewBox="0 0 24 24" class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
const SVG_MUTED = `<svg viewBox="0 0 24 24" class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>`;
const SVG_RESTART = `<svg viewBox="0 0 24 24" class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>`;
const SVG_PAUSE = `<svg viewBox="0 0 24 24" class="w-4 h-4 shrink-0" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`;
const SVG_SKIP = `<svg viewBox="0 0 24 24" class="w-4 h-4 shrink-0" fill="currentColor" aria-hidden="true"><polygon points="5 4 15 12 5 20 5 4"/><rect x="17" y="4" width="3" height="16"/></svg>`;

/**
 * UIScene renders safe-area responsive Angry-Birds-style gothic HUD controls (>=48dp touch targets),
 * Look Around camera toggle, Level 1 illustrated tutorial & first-time tooltips,
 * Skip Level / Hint / Trial rewarded ad actions, Vampire & Zombie callouts,
 * Pause/Win/Lose modals, How to Play & Codex links, and QA Debug Mode.
 */
export class UIScene extends Phaser.Scene {
  private gameScene!: GameScene;
  private doubleRewardClaimed = false;
  private debugVisible = false;
  private debugCornerTaps = 0;
  private debugTapTimer = 0;
  private debugInterval: number | null = null;
  private actionLockUntil = 0;

  constructor() {
    super({ key: 'UIScene' });
  }

  init(data: { gameScene: GameScene }): void {
    this.gameScene = data.gameScene;
    this.doubleRewardClaimed = false;
    this.debugVisible = false;
    this.debugCornerTaps = 0;
    this.actionLockUntil = 0;
  }

  private guardAction(fn: () => void): void {
    const now = performance.now();
    if (now < this.actionLockUntil) return;
    this.actionLockUntil = now + 260;
    fn();
  }

  create(): void {
    this.buildHud();
    this.updateHud(this.gameScene.getHudSnapshot());

    const gsEvents = this.gameScene.events;
    gsEvents.on('hud-update', this.onHudUpdate, this);
    gsEvents.on('world-banner', this.onWorldBanner, this);
    gsEvents.on('vampire-intro', this.onVampireIntro, this);
    gsEvents.on('zombie-intro', this.onZombieIntro, this);
    gsEvents.on('practice-highlight', this.onPracticeHighlight, this);
    gsEvents.on('match-won', this.onMatchWon, this);
    gsEvents.on('match-lost', this.onMatchLost, this);
    gsEvents.on('open-pause-modal', this.showPauseModal, this);
    gsEvents.on('toggle-pause-key', this.togglePause, this);
    gsEvents.on('toggle-debug', this.toggleDebugPanel, this);

    // Stage 1 first-time animated gesture tutorial
    const save = SaveManager.getInstance();
    if (this.gameScene.levelId === 1 && !save.getSettings().tutorialSeen) {
      this.gameScene.setPaused(true);
      TutorialSystem.showFirstTimeLevelTutorial(() => {
        if (!this.scene.isActive()) return;
        this.gameScene.setPaused(false);
        const lookBtn = document.getElementById('hud-look-btn');
        TutorialSystem.showTooltipOnce(
          'look_around',
          lookBtn,
          'Tip: Tap Look Around anytime to preview the whole zombie fortress!'
        );
      });
    } else if (this.gameScene.levelId === 2) {
      window.setTimeout(() => {
        if (!this.scene.isActive()) return;
        const skipBtn = document.getElementById('ad-skip-btn');
        TutorialSystem.showTooltipOnce(
          'skip_stage',
          skipBtn,
          'Stuck? Watch an ad to Skip a stage with 1★!'
        );
      }, 600);
    }

    this.debugInterval = window.setInterval(() => {
      if (this.debugVisible) this.refreshDebugStats();
    }, 450);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      gsEvents.off('hud-update', this.onHudUpdate, this);
      gsEvents.off('world-banner', this.onWorldBanner, this);
      gsEvents.off('vampire-intro', this.onVampireIntro, this);
      gsEvents.off('zombie-intro', this.onZombieIntro, this);
      gsEvents.off('practice-highlight', this.onPracticeHighlight, this);
      gsEvents.off('match-won', this.onMatchWon, this);
      gsEvents.off('match-lost', this.onMatchLost, this);
      gsEvents.off('open-pause-modal', this.showPauseModal, this);
      gsEvents.off('toggle-pause-key', this.togglePause, this);
      gsEvents.off('toggle-debug', this.toggleDebugPanel, this);
      if (this.debugInterval !== null) {
        clearInterval(this.debugInterval);
        this.debugInterval = null;
      }
      document.getElementById('tutorial-modal')?.remove();
      document.getElementById('info-modal')?.remove();
      document.getElementById('hud-first-tooltip')?.remove();
      UiDomHelper.clearOverlay('UIScene');
    });
  }

  private onHudUpdate(snap: HudSnapshot): void {
    this.updateHud(snap);
  }

  private buildHud(): void {
    const save = SaveManager.getInstance();
    const state = save.getState();
    const skipsLeft = save.getRemainingSkipsToday();

    const overlay = UiDomHelper.getOverlay('UIScene');
    overlay.innerHTML = `
      <div class="w-full h-full flex flex-col justify-between p-2 sm:p-3.5 safe-area-hud pointer-events-none">
        <!-- Top HUD Bar -->
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div id="hud-left-cluster" class="flex items-center gap-2 sm:gap-3 px-3 py-1.5 rounded-xl gothic-panel pointer-events-auto">
            <button id="debug-secret-tap" type="button" aria-label="Stage Info" class="text-left min-h-[40px] cursor-default">
              <div id="hud-level" class="font-display text-sm sm:text-base font-bold text-white whitespace-nowrap">Lv 1</div>
              <div id="hud-world" class="text-[11px] text-amber-300 whitespace-nowrap">Haunted Graveyard</div>
            </button>
            <div class="h-7 w-px bg-slate-700 hidden md:block"></div>
            <div class="hidden md:block">
              <div class="text-[10px] uppercase tracking-wider text-slate-400">Weather</div>
              <div id="hud-weather" class="text-[11px] font-semibold text-sky-300 whitespace-nowrap">Graveyard Mist</div>
            </div>
            <div class="h-7 w-px bg-slate-700"></div>
            <div>
              <div class="text-[10px] uppercase tracking-wider text-slate-400">Score</div>
              <div id="hud-score" class="font-mono-num text-sm sm:text-base font-bold text-amber-300">0</div>
            </div>
            <div class="h-7 w-px bg-slate-700"></div>
            <div>
              <div class="text-[10px] uppercase tracking-wider text-slate-400">Vamps</div>
              <div id="hud-vamps" class="font-mono-num text-sm sm:text-base font-bold text-red-300">0</div>
            </div>
            <div>
              <div class="text-[10px] uppercase tracking-wider text-slate-400">Zombies</div>
              <div id="hud-zombies" class="font-mono-num text-sm sm:text-base font-bold text-emerald-300">0</div>
            </div>
          </div>

          <div class="flex items-center gap-1.5 pointer-events-auto">
            <button id="hud-look-btn" type="button" aria-label="Look Around" class="min-w-[48px] min-h-[48px] px-2.5 py-1.5 rounded-xl bg-[#0d111a]/95 hover:bg-slate-800 border border-slate-600 gothic-btn flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-200 whitespace-nowrap cursor-pointer">
              ${SVG_EYE}<span class="hidden sm:inline">Look</span>
            </button>
            <button id="hud-mute-btn" type="button" aria-label="Toggle Sound" class="min-w-[48px] min-h-[48px] px-2.5 py-1.5 rounded-xl bg-[#0d111a]/95 hover:bg-slate-800 border border-slate-600 gothic-btn flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-200 whitespace-nowrap cursor-pointer">
              ${state.settings.muted ? SVG_MUTED : SVG_SOUND}<span id="hud-mute-lbl" class="hidden sm:inline">${state.settings.muted ? 'Muted' : 'Sound'}</span>
            </button>
            <button id="hud-restart-btn" type="button" aria-label="Restart Stage" class="min-w-[48px] min-h-[48px] px-2.5 py-1.5 rounded-xl bg-[#0d111a]/95 hover:bg-slate-800 border border-slate-600 gothic-btn flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-200 whitespace-nowrap cursor-pointer">
              ${SVG_RESTART}<span class="hidden sm:inline">Restart</span>
            </button>
            <button id="hud-pause-btn" type="button" aria-label="Pause Game" class="min-w-[48px] min-h-[48px] px-3 py-1.5 rounded-xl bg-red-800 hover:bg-red-700 border border-amber-400/70 gothic-btn flex items-center justify-center gap-1.5 text-xs font-semibold text-white whitespace-nowrap cursor-pointer">
              ${SVG_PAUSE}<span class="hidden sm:inline">Pause</span>
            </button>
          </div>
        </div>

        <!-- Portrait Orientation Suggestion -->
        <div id="portrait-banner" class="hidden portrait:block sm:portrait:hidden mx-auto mt-1 px-3 py-1.5 rounded-lg bg-[#0d111a]/95 border border-amber-500/60 text-[11px] font-semibold text-amber-200 pointer-events-none">
          Rotate your device to landscape for full crossbow aiming
        </div>

        <!-- Center Dynamic Callouts -->
        <div id="hud-callout-slot" class="my-auto flex flex-col items-center pointer-events-none"></div>

        <!-- Active Mid-Air Ability Trigger Button -->
        <button id="hud-ability-btn" type="button" class="hidden mx-auto mb-2 min-h-[52px] px-6 py-2.5 rounded-xl bg-red-800 hover:bg-red-700 border-2 border-amber-300 gothic-btn text-xs sm:text-sm font-bold text-white tracking-wide pointer-events-auto cursor-pointer">
          ⚡ ACTIVATE ABILITY (TAP / SPACE)
        </button>

        <!-- Bottom Tactical Bar -->
        <div class="flex flex-wrap items-end justify-between gap-2">
          <div class="flex flex-wrap items-center gap-1.5 pointer-events-auto">
            <button id="pwr-extra-btn" type="button" class="min-h-[48px] px-3 py-1.5 rounded-xl bg-[#0d111a]/95 hover:bg-slate-800 border border-slate-600 gothic-btn text-[11px] sm:text-xs font-semibold text-slate-200 whitespace-nowrap cursor-pointer">
              +1 Vamp (<span id="pwr-extra-cnt" class="font-mono-num text-amber-300">${state.powerUps.extraVampire}</span>)
            </button>
            <button id="pwr-blast-btn" type="button" class="min-h-[48px] px-3 py-1.5 rounded-xl bg-[#0d111a]/95 hover:bg-slate-800 border border-slate-600 gothic-btn text-[11px] sm:text-xs font-semibold text-slate-200 whitespace-nowrap cursor-pointer">
              Big Blast (<span id="pwr-blast-cnt" class="font-mono-num text-amber-300">${state.powerUps.biggerBlast}</span>)
            </button>
            <button id="pwr-shield-btn" type="button" class="min-h-[48px] px-3 py-1.5 rounded-xl bg-[#0d111a]/95 hover:bg-slate-800 border border-slate-600 gothic-btn text-[11px] sm:text-xs font-semibold text-slate-200 whitespace-nowrap cursor-pointer">
              Shield (<span id="pwr-shield-cnt" class="font-mono-num text-amber-300">${state.powerUps.launchShield}</span>)
            </button>
          </div>

          <div class="flex flex-wrap items-center gap-1.5 pointer-events-auto">
            <button id="ad-hint-btn" type="button" class="min-h-[48px] px-3 py-1.5 rounded-xl bg-amber-950/95 hover:bg-amber-900 border border-amber-500/60 gothic-btn text-[11px] sm:text-xs font-semibold text-amber-200 whitespace-nowrap cursor-pointer">
              Hint (Ad)
            </button>
            <button id="ad-skip-btn" type="button" class="min-h-[48px] px-3 py-1.5 rounded-xl bg-emerald-950/95 hover:bg-emerald-900 border border-emerald-500/60 gothic-btn flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-emerald-200 whitespace-nowrap cursor-pointer">
              ${SVG_SKIP}<span>Skip Lv (${skipsLeft})</span>
            </button>
            <button id="ad-trial-btn" type="button" class="min-h-[48px] px-3 py-1.5 rounded-xl bg-purple-950/95 hover:bg-purple-900 border border-purple-500/60 gothic-btn text-[11px] sm:text-xs font-semibold text-purple-200 whitespace-nowrap cursor-pointer">
              Trial Thunder (Ad)
            </button>
          </div>
        </div>
      </div>

      <div id="hud-modal-root"></div>
      <div id="hud-debug-root"></div>
    `;

    UiDomHelper.attachHoverAudio(overlay);

    (overlay.querySelector('#debug-secret-tap') as HTMLButtonElement).onclick = () => {
      const now = performance.now();
      if (now - this.debugTapTimer > 1600) this.debugCornerTaps = 0;
      this.debugTapTimer = now;
      this.debugCornerTaps += 1;
      if (this.debugCornerTaps >= 5) {
        this.debugCornerTaps = 0;
        this.toggleDebugPanel();
      }
    };

    const lookBtn = overlay.querySelector('#hud-look-btn') as HTMLButtonElement;
    lookBtn.onclick = () => {
      this.guardAction(() => {
        AudioManager.getInstance().playUiClick();
        this.gameScene.toggleLookAround();
      });
    };

    const muteBtn = overlay.querySelector('#hud-mute-btn') as HTMLButtonElement;
    muteBtn.onclick = () => {
      const cur = save.getSettings().muted;
      const updated = save.updateSettings({ muted: !cur });
      AudioManager.getInstance().updateSettings(updated);
      muteBtn.innerHTML = `${updated.muted ? SVG_MUTED : SVG_SOUND}<span id="hud-mute-lbl" class="hidden sm:inline">${updated.muted ? 'Muted' : 'Sound'}</span>`;
    };

    (overlay.querySelector('#hud-restart-btn') as HTMLButtonElement).onclick = () => {
      this.guardAction(() => {
        AudioManager.getInstance().playUiClick();
        this.gameScene.restartLevel();
      });
    };

    (overlay.querySelector('#hud-pause-btn') as HTMLButtonElement).onclick = () => {
      this.guardAction(() => {
        AudioManager.getInstance().playUiClick();
        this.togglePause();
      });
    };

    (overlay.querySelector('#hud-ability-btn') as HTMLButtonElement).onclick = () => {
      this.gameScene.triggerAbilityFromHud();
    };

    (overlay.querySelector('#pwr-extra-btn') as HTMLButtonElement).onclick = () => {
      this.guardAction(() => {
        if (!this.gameScene.usePowerUp('extraVampire')) {
          UiDomHelper.showToast('No Extra Vampire charges left. Visit Crypt Shop!', 'info');
        }
      });
    };
    (overlay.querySelector('#pwr-blast-btn') as HTMLButtonElement).onclick = () => {
      this.guardAction(() => {
        if (!this.gameScene.usePowerUp('biggerBlast')) {
          UiDomHelper.showToast('Bigger Blast unavailable or already active.', 'info');
        }
      });
    };
    (overlay.querySelector('#pwr-shield-btn') as HTMLButtonElement).onclick = () => {
      this.guardAction(() => {
        if (!this.gameScene.usePowerUp('launchShield')) {
          UiDomHelper.showToast('Launch Shield unavailable or already active.', 'info');
        }
      });
    };

    (overlay.querySelector('#ad-hint-btn') as HTMLButtonElement).onclick = () => {
      this.guardAction(() => {
        this.gameScene.setPaused(true);
        AdManager.getInstance().showRewardedAd(
          'free_hint',
          () => {
            this.gameScene.setPaused(false);
            this.gameScene.grantFreeHint();
            UiDomHelper.showToast('Golden Aim Trajectory unlocked for this shot!', 'success');
          },
          (msg) => {
            this.gameScene.setPaused(false);
            UiDomHelper.showToast(msg, 'error');
          }
        );
      });
    };

    (overlay.querySelector('#ad-skip-btn') as HTMLButtonElement).onclick = () => {
      this.guardAction(() => {
        if (!SaveManager.getInstance().canSkipLevelToday()) {
          UiDomHelper.showToast('Daily Skip limit reached (5/day). Come back tomorrow!', 'info');
          return;
        }
        this.gameScene.setPaused(true);
        AdManager.getInstance().showRewardedAd(
          'skip_level',
          () => {
            if (!this.gameScene.skipLevelWithReward()) {
              this.gameScene.setPaused(false);
              UiDomHelper.showToast('Could not skip level.', 'error');
            } else {
              UiDomHelper.showToast('Stage skipped (1★ awarded)!', 'success');
            }
          },
          (msg) => {
            this.gameScene.setPaused(false);
            UiDomHelper.showToast(msg, 'error');
          }
        );
      });
    };

    (overlay.querySelector('#ad-trial-btn') as HTMLButtonElement).onclick = () => {
      this.guardAction(() => {
        if (this.gameScene.getHudSnapshot().trialUsed) {
          UiDomHelper.showToast('Trial Vampire already granted on this stage.', 'info');
          return;
        }
        this.gameScene.setPaused(true);
        AdManager.getInstance().showRewardedAd(
          'unlock_vampire',
          () => {
            this.gameScene.setPaused(false);
            this.gameScene.grantTrialVampire();
            UiDomHelper.showToast('Thunder Bat loaded for this stage!', 'success');
          },
          (msg) => {
            this.gameScene.setPaused(false);
            UiDomHelper.showToast(msg, 'error');
          }
        );
      });
    };
  }

  private updateHud(snap: HudSnapshot): void {
    const overlay = document.getElementById('ui-overlay');
    if (!overlay) return;
    const state = SaveManager.getInstance().getState();

    const lvEl = overlay.querySelector('#hud-level');
    const worldEl = overlay.querySelector('#hud-world');
    const weatherEl = overlay.querySelector('#hud-weather');
    const scoreEl = overlay.querySelector('#hud-score');
    const vampsEl = overlay.querySelector('#hud-vamps');
    const zombiesEl = overlay.querySelector('#hud-zombies');
    const lookBtn = overlay.querySelector('#hud-look-btn') as HTMLButtonElement | null;

    if (lvEl) lvEl.textContent = `Lv ${snap.levelId}${snap.isBossLevel ? ' · BOSS' : ''}`;
    if (worldEl) worldEl.textContent = `W${snap.worldId}: ${snap.worldName}`;
    if (weatherEl) weatherEl.textContent = snap.weatherLabel;
    if (scoreEl) scoreEl.textContent = String(snap.score);
    if (vampsEl) vampsEl.textContent = String(snap.vampiresRemaining);
    if (zombiesEl) zombiesEl.textContent = String(snap.zombiesRemaining);

    if (lookBtn) {
      lookBtn.classList.toggle('border-amber-400', snap.isLookAround);
      lookBtn.classList.toggle('text-amber-200', snap.isLookAround);
      lookBtn.innerHTML = `${SVG_EYE}<span class="hidden sm:inline">${snap.isLookAround ? 'Aim' : 'Look'}</span>`;
    }

    const extraCnt = overlay.querySelector('#pwr-extra-cnt');
    const blastCnt = overlay.querySelector('#pwr-blast-cnt');
    const shieldCnt = overlay.querySelector('#pwr-shield-cnt');
    if (extraCnt) extraCnt.textContent = String(state.powerUps.extraVampire);
    if (blastCnt) blastCnt.textContent = String(state.powerUps.biggerBlast);
    if (shieldCnt) shieldCnt.textContent = String(state.powerUps.launchShield);

    const abilityBtn = overlay.querySelector('#hud-ability-btn') as HTMLButtonElement | null;
    if (abilityBtn) {
      if (snap.canTapAbility) {
        abilityBtn.classList.remove('hidden');
        abilityBtn.textContent = `⚡ ${snap.activeAbilityLabel ?? 'ACTIVATE'} (TAP / SPACE)`;
      } else {
        abilityBtn.classList.add('hidden');
      }
    }
  }

  private onWorldBanner(data: { worldId: number; name: string; subtitle: string; loopCycle: number }): void {
    const slot = document.getElementById('hud-callout-slot');
    if (!slot) return;
    const el = document.createElement('div');
    el.className = 'px-6 py-3 rounded-xl gothic-panel border-amber-500/70 text-center shadow-2xl mb-2';
    el.innerHTML = `
      <div class="text-xs uppercase tracking-widest text-amber-400 font-bold">
        Entering World ${data.worldId}${data.loopCycle > 0 ? ` · Cycle ${data.loopCycle + 1}` : ''}
      </div>
      <div class="font-display text-2xl font-black text-white mt-0.5">${data.name}</div>
      <div class="text-xs text-slate-300 mt-0.5">${data.subtitle}</div>
    `;
    slot.appendChild(el);
    window.setTimeout(() => el.remove(), 2900);
  }

  private onVampireIntro(typeId: VampireTypeId): void {
    const slot = document.getElementById('hud-callout-slot');
    if (!slot) return;
    const v = VAMPIRE_TYPES[typeId];
    const el = document.createElement('div');
    el.className = 'px-5 py-2.5 rounded-xl gothic-panel border-red-500/70 text-center shadow-xl mb-1.5';
    el.innerHTML = `
      <div class="text-[11px] uppercase tracking-widest text-red-400 font-bold">New Vampire Ready</div>
      <div class="font-display text-lg font-bold text-white">${v.name} — ${v.abilityName}</div>
      <div class="text-xs text-slate-300">${v.abilityHint}</div>
    `;
    slot.appendChild(el);
    window.setTimeout(() => el.remove(), 3400);
  }

  private onZombieIntro(zMeta: ZombieMeta): void {
    const slot = document.getElementById('hud-callout-slot');
    if (!slot) return;
    const el = document.createElement('div');
    el.className = 'px-5 py-2.5 rounded-xl gothic-panel border-emerald-500/70 text-center shadow-xl mb-1.5';
    el.innerHTML = `
      <div class="text-[11px] uppercase tracking-widest text-emerald-400 font-bold">New Undead Spotted</div>
      <div class="font-display text-lg font-bold text-white">${zMeta.name}</div>
      <div class="text-xs text-slate-300">${zMeta.description}</div>
    `;
    slot.appendChild(el);
    window.setTimeout(() => el.remove(), 3400);
  }

  private onPracticeHighlight(typeId: VampireTypeId | null): void {
    if (!typeId) return;
    const slot = document.getElementById('hud-callout-slot');
    if (!slot) return;
    const v = VAMPIRE_TYPES[typeId];
    const el = document.createElement('div');
    el.className = 'px-5 py-2.5 rounded-xl bg-amber-950/95 border-2 border-amber-400 text-center shadow-xl mb-1.5';
    el.innerHTML = `
      <div class="text-[11px] uppercase tracking-widest text-amber-300 font-bold">Try It Now!</div>
      <div class="text-xs text-white font-semibold">Launch ${v.name}, then tap mid-air for <span class="text-amber-300">${v.abilityName}</span>!</div>
    `;
    slot.appendChild(el);
    window.setTimeout(() => el.remove(), 4200);
  }

  private togglePause(): void {
    const modalRoot = document.getElementById('hud-modal-root');
    if (modalRoot && modalRoot.innerHTML.trim() !== '') {
      modalRoot.innerHTML = '';
      AudioManager.getInstance().playPopupOpen(false);
      this.gameScene.setPaused(false);
    } else {
      this.gameScene.setPaused(true);
      this.showPauseModal();
    }
  }

  private showPauseModal(): void {
    const root = document.getElementById('hud-modal-root');
    if (!root) return;
    AudioManager.getInstance().playPopupOpen(true);
    root.innerHTML = `
      <div role="dialog" aria-modal="true" aria-label="Game Paused" class="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/75 pointer-events-auto">
        <div class="w-full max-w-sm rounded-2xl gothic-panel p-5 sm:p-6 text-center shadow-2xl space-y-2.5 max-h-[92vh] overflow-y-auto">
          <h2 class="font-display text-2xl font-bold text-white">Game Paused</h2>
          <button id="pause-resume" type="button" class="w-full min-h-[48px] rounded-xl bg-red-700 hover:bg-red-600 border border-amber-400/70 gothic-btn text-white font-semibold cursor-pointer">Resume</button>
          <button id="pause-restart" type="button" class="w-full min-h-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 gothic-btn text-white font-semibold cursor-pointer">Restart Stage</button>
          <div class="grid grid-cols-2 gap-2">
            <button id="pause-howto" type="button" class="min-h-[48px] rounded-xl bg-amber-950/90 hover:bg-amber-900 border border-amber-500/60 gothic-btn text-amber-200 text-xs font-bold cursor-pointer">How to Play</button>
            <button id="pause-codex" type="button" class="min-h-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 gothic-btn text-slate-100 text-xs font-bold cursor-pointer">Codex</button>
          </div>
          <button id="pause-settings" type="button" class="w-full min-h-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 gothic-btn text-white font-semibold cursor-pointer">Settings</button>
          <button id="pause-levels" type="button" class="w-full min-h-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 gothic-btn text-white font-semibold cursor-pointer">World Map</button>
          <button id="pause-menu" type="button" class="w-full min-h-[48px] rounded-xl bg-transparent hover:bg-slate-800 border border-slate-700 gothic-btn text-slate-300 font-semibold cursor-pointer">Main Menu</button>
        </div>
      </div>
    `;

    UiDomHelper.attachHoverAudio(root);

    (root.querySelector('#pause-resume') as HTMLButtonElement).onclick = () => {
      AudioManager.getInstance().playUiClick();
      root.innerHTML = '';
      this.gameScene.setPaused(false);
    };
    (root.querySelector('#pause-restart') as HTMLButtonElement).onclick = () => {
      this.guardAction(() => {
        AudioManager.getInstance().playUiClick();
        root.innerHTML = '';
        this.gameScene.restartLevel();
      });
    };
    (root.querySelector('#pause-howto') as HTMLButtonElement).onclick = () => {
      AudioManager.getInstance().playUiClick();
      TutorialSystem.showHowToPlayModal({
        onReplayTutorial: () => {
          root.innerHTML = '';
          TutorialSystem.showFirstTimeLevelTutorial(() => {
            if (this.scene.isActive()) this.gameScene.setPaused(false);
          });
        },
      });
    };
    (root.querySelector('#pause-codex') as HTMLButtonElement).onclick = () => {
      this.guardAction(() => {
        AudioManager.getInstance().playUiClick();
        this.gameScene.goToSceneWithTransition('CodexScene');
      });
    };
    (root.querySelector('#pause-settings') as HTMLButtonElement).onclick = () => {
      AudioManager.getInstance().playUiClick();
      UiDomHelper.showSettingsModal({
        onResetProgress: () => {
          root.innerHTML = '';
          this.gameScene.goToSceneWithTransition('MenuScene');
        },
      });
    };
    (root.querySelector('#pause-levels') as HTMLButtonElement).onclick = () => {
      this.guardAction(() => {
        AudioManager.getInstance().playUiClick();
        this.gameScene.goToSceneWithTransition('WorldMapScene');
      });
    };
    (root.querySelector('#pause-menu') as HTMLButtonElement).onclick = () => {
      this.guardAction(() => {
        AudioManager.getInstance().playUiClick();
        this.gameScene.goToSceneWithTransition('MenuScene');
      });
    };
  }

  private onMatchWon(data: {
    levelId: number;
    score: number;
    highScore: number;
    unusedBonus: number;
    stars: number;
    coinsEarned: number;
    newlyUnlockedAchievements: string[];
  }): void {
    const root = document.getElementById('hud-modal-root');
    if (!root) return;

    for (let s = 0; s < data.stars; s++) {
      window.setTimeout(() => AudioManager.getInstance().playStarAward(s), s * 160);
    }

    const starsHtml = [1, 2, 3]
      .map(
        (idx) =>
          `<span class="inline-block text-4xl animate-star-pop ${idx <= data.stars ? 'text-yellow-300' : 'text-slate-700'}" style="animation-delay:${(idx - 1) * 140}ms">★</span>`
      )
      .join(' ');

    root.innerHTML = `
      <div role="dialog" aria-modal="true" aria-label="Stage Cleared" class="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/80 pointer-events-auto">
        <div class="w-full max-w-md rounded-2xl gothic-panel border-amber-500/60 p-6 text-center shadow-2xl">
          <div class="text-xs uppercase tracking-widest text-emerald-400 font-bold">Crypt Cleared</div>
          <h2 class="font-display text-3xl font-black text-white mt-1">Stage ${data.levelId} Victory!</h2>

          <div class="my-4 flex items-center justify-center gap-3">${starsHtml}</div>

          <div class="rounded-xl bg-[#141b2b] border border-slate-800 p-3.5 space-y-1.5 text-sm">
            <div class="flex justify-between"><span class="text-slate-400">Final Score</span><span class="font-mono-num font-bold text-white">${data.score}</span></div>
            <div class="flex justify-between"><span class="text-slate-400">High Score</span><span class="font-mono-num font-bold text-amber-300">${data.highScore}</span></div>
            <div class="flex justify-between"><span class="text-slate-400">Unused Bonus</span><span class="font-mono-num text-emerald-300">+${data.unusedBonus}</span></div>
            <div class="flex justify-between border-t border-slate-800 pt-1.5"><span class="text-slate-300 font-semibold">Coins Earned</span><span id="win-coins-earned" class="font-mono-num font-bold text-amber-400">+${data.coinsEarned}</span></div>
          </div>

          <div class="mt-4 space-y-2.5">
            <button id="win-double-ad" type="button" class="w-full min-h-[48px] px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 border border-amber-300 gothic-btn text-slate-950 font-bold text-sm cursor-pointer">
              Double Coins +${data.coinsEarned} (Watch Ad)
            </button>
            <div class="flex gap-2">
              <button id="win-replay" type="button" class="flex-1 min-h-[48px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 gothic-btn text-white font-semibold text-sm cursor-pointer">Replay</button>
              <button id="win-next" type="button" class="flex-1 min-h-[48px] px-4 py-2 rounded-xl bg-red-700 hover:bg-red-600 border border-amber-400/70 gothic-btn text-white font-semibold text-sm cursor-pointer">Next Stage →</button>
            </div>
            <button id="win-levels" type="button" class="w-full min-h-[48px] px-4 py-2 rounded-xl bg-transparent hover:bg-slate-800 border border-slate-700 gothic-btn text-slate-300 text-xs font-semibold cursor-pointer">World Map</button>
          </div>
        </div>
      </div>
    `;

    UiDomHelper.attachHoverAudio(root);

    if (data.newlyUnlockedAchievements.length > 0) {
      UiDomHelper.showToast(`Achievement Unlocked!`, 'success');
    }

    const doubleBtn = root.querySelector('#win-double-ad') as HTMLButtonElement;
    doubleBtn.onclick = () => {
      if (this.doubleRewardClaimed) return;
      AdManager.getInstance().showRewardedAd(
        'double_reward',
        () => {
          if (this.doubleRewardClaimed) return;
          this.doubleRewardClaimed = true;
          SaveManager.getInstance().addCoins(data.coinsEarned);
          AudioManager.getInstance().playCoinPickup();
          const coinsEl = root.querySelector('#win-coins-earned');
          if (coinsEl) coinsEl.textContent = `+${data.coinsEarned * 2} (2x)`;
          doubleBtn.disabled = true;
          doubleBtn.className = 'w-full min-h-[48px] px-4 py-2 rounded-xl bg-emerald-800 text-emerald-200 font-bold text-sm cursor-not-allowed';
          doubleBtn.textContent = '2x Reward Claimed!';
          UiDomHelper.showToast(`Bonus +${data.coinsEarned} Coins credited!`, 'success');
        },
        (msg) => UiDomHelper.showToast(msg, 'error')
      );
    };

    (root.querySelector('#win-replay') as HTMLButtonElement).onclick = () => {
      this.guardAction(() => {
        AudioManager.getInstance().playUiClick();
        this.gameScene.restartLevel();
      });
    };
    (root.querySelector('#win-next') as HTMLButtonElement).onclick = () => {
      this.guardAction(() => {
        AudioManager.getInstance().playUiClick();
        AdManager.getInstance().showInterstitial(() => {
          this.gameScene.goToLevel(data.levelId + 1);
        });
      });
    };
    (root.querySelector('#win-levels') as HTMLButtonElement).onclick = () => {
      this.guardAction(() => {
        AudioManager.getInstance().playUiClick();
        this.gameScene.goToSceneWithTransition('WorldMapScene');
      });
    };
  }

  private onMatchLost(data: { levelId: number; score: number; reviveAvailable: boolean; zombiesLeft: number }): void {
    const root = document.getElementById('hud-modal-root');
    if (!root) return;
    const skipsLeft = SaveManager.getInstance().getRemainingSkipsToday();

    root.innerHTML = `
      <div role="dialog" aria-modal="true" aria-label="Stage Failed" class="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/80 pointer-events-auto">
        <div class="w-full max-w-md rounded-2xl gothic-panel border-red-700/70 p-6 text-center shadow-2xl">
          <div class="text-xs uppercase tracking-widest text-red-400 font-bold">Out of Vampires</div>
          <h2 class="font-display text-3xl font-black text-white mt-1">Stage ${data.levelId} Failed</h2>
          <p class="text-sm text-slate-300 mt-2">${data.zombiesLeft} undead still lurk in the ruins.</p>

          <div class="mt-5 space-y-2.5">
            ${
              data.reviveAvailable
                ? `<button id="lose-revive-ad" type="button" class="w-full min-h-[48px] px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 border border-amber-300 gothic-btn text-slate-950 font-bold text-sm cursor-pointer">
                    Revive +1 Blast Baron (Watch Ad)
                  </button>`
                : ''
            }
            ${
              skipsLeft > 0
                ? `<button id="lose-skip-ad" type="button" class="w-full min-h-[48px] px-4 py-2 rounded-xl bg-emerald-900 hover:bg-emerald-800 border border-emerald-400/70 gothic-btn text-emerald-100 font-bold text-sm cursor-pointer">
                    Skip Stage · 1★ (Watch Ad · ${skipsLeft} left)
                  </button>`
                : ''
            }
            <button id="lose-retry" type="button" class="w-full min-h-[48px] px-4 py-2 rounded-xl bg-red-700 hover:bg-red-600 border border-red-400/60 gothic-btn text-white font-semibold text-sm cursor-pointer">
              Retry Stage
            </button>
            <button id="lose-levels" type="button" class="w-full min-h-[48px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 gothic-btn text-slate-200 font-semibold text-sm cursor-pointer">
              World Map
            </button>
          </div>
        </div>
      </div>
    `;

    UiDomHelper.attachHoverAudio(root);

    const reviveBtn = root.querySelector('#lose-revive-ad') as HTMLButtonElement | null;
    if (reviveBtn) {
      reviveBtn.onclick = () => {
        AdManager.getInstance().showRewardedAd(
          'extra_vampire',
          () => {
            root.innerHTML = '';
            this.gameScene.grantReviveExtraVampire();
            UiDomHelper.showToast('Revived with +1 Blast Baron!', 'success');
          },
          (msg) => UiDomHelper.showToast(msg, 'error')
        );
      };
    }

    const skipBtn = root.querySelector('#lose-skip-ad') as HTMLButtonElement | null;
    if (skipBtn) {
      skipBtn.onclick = () => {
        AdManager.getInstance().showRewardedAd(
          'skip_level',
          () => {
            if (this.gameScene.skipLevelWithReward()) {
              UiDomHelper.showToast('Stage skipped (1★ awarded)!', 'success');
            }
          },
          (msg) => UiDomHelper.showToast(msg, 'error')
        );
      };
    }

    (root.querySelector('#lose-retry') as HTMLButtonElement).onclick = () => {
      this.guardAction(() => {
        AudioManager.getInstance().playUiClick();
        this.gameScene.restartLevel();
      });
    };
    (root.querySelector('#lose-levels') as HTMLButtonElement).onclick = () => {
      this.guardAction(() => {
        AudioManager.getInstance().playUiClick();
        this.gameScene.goToSceneWithTransition('WorldMapScene');
      });
    };
  }

  // ---- Hidden Debug & QA Mode ----

  private toggleDebugPanel(): void {
    this.debugVisible = !this.debugVisible;
    const dbgRoot = document.getElementById('hud-debug-root');
    if (!dbgRoot) return;
    if (!this.debugVisible) {
      dbgRoot.innerHTML = '';
      return;
    }

    dbgRoot.innerHTML = `
      <div id="debug-panel" class="fixed top-28 sm:top-20 right-3 z-40 w-64 rounded-xl bg-[#090d16]/95 border border-emerald-500/60 p-3 text-xs text-slate-200 shadow-2xl pointer-events-auto space-y-2">
        <div class="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <span class="font-mono-num font-bold text-emerald-400">QA DEBUG MODE</span>
          <button id="dbg-close" type="button" class="px-2 py-1 rounded bg-slate-800 text-slate-300 cursor-pointer">✕</button>
        </div>
        <div id="dbg-metrics" class="font-mono-num text-[11px] text-slate-300">FPS: -- · Bodies: --</div>
        <div class="grid grid-cols-1 gap-1.5">
          <button id="dbg-unlock" type="button" class="py-1.5 px-2 rounded bg-slate-800 hover:bg-slate-700 text-left cursor-pointer">Unlock All ${GameConfig.TOTAL_LEVELS} Levels</button>
          <button id="dbg-skip" type="button" class="py-1.5 px-2 rounded bg-slate-800 hover:bg-slate-700 text-left cursor-pointer">Skip Level (Win Now)</button>
          <button id="dbg-adfail" type="button" class="py-1.5 px-2 rounded bg-slate-800 hover:bg-slate-700 text-left cursor-pointer">Toggle Simulated Ad Failure</button>
          <button id="dbg-autotest" type="button" class="py-1.5 px-2 rounded bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-left cursor-pointer">Run 200-Stage Solvability Check</button>
          <button id="dbg-uitest" type="button" class="py-1.5 px-2 rounded bg-sky-800 hover:bg-sky-700 text-white font-semibold text-left cursor-pointer">Test UI Buttons (Viewport &amp; Wiring)</button>
        </div>
        <div id="dbg-output" class="text-[11px] text-amber-300 font-mono-num"></div>
      </div>
    `;

    this.refreshDebugStats();

    (dbgRoot.querySelector('#dbg-close') as HTMLButtonElement).onclick = () => this.toggleDebugPanel();
    (dbgRoot.querySelector('#dbg-unlock') as HTMLButtonElement).onclick = () => {
      SaveManager.getInstance().unlockAllLevelsForDebug();
      (dbgRoot.querySelector('#dbg-output') as HTMLElement).textContent = `Unlocked 1..${GameConfig.TOTAL_LEVELS}`;
    };
    (dbgRoot.querySelector('#dbg-skip') as HTMLButtonElement).onclick = () => {
      this.gameScene.forceWinForDebug();
    };
    let simFail = false;
    (dbgRoot.querySelector('#dbg-adfail') as HTMLButtonElement).onclick = () => {
      simFail = !simFail;
      AdManager.getInstance().setSimulatedFailure(simFail ? 'no_ad_available' : null);
      (dbgRoot.querySelector('#dbg-output') as HTMLElement).textContent = `Sim Ad Fail: ${simFail ? 'ON' : 'OFF'}`;
    };
    (dbgRoot.querySelector('#dbg-autotest') as HTMLButtonElement).onclick = () => {
      let passed = 0;
      const samples = 200;
      for (let i = 1; i <= samples; i++) {
        const lv = Math.min(GameConfig.TOTAL_LEVELS, i * 5);
        const bp = LevelGenerator.getLevel(lv);
        if (LevelGenerator.validateSolvability(bp)) passed++;
      }
      (dbgRoot.querySelector('#dbg-output') as HTMLElement).textContent = `Validated ${passed}/${samples} sampled stages`;
    };
    (dbgRoot.querySelector('#dbg-uitest') as HTMLButtonElement).onclick = () => {
      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('#ui-overlay button')).filter((b) => {
        const style = window.getComputedStyle(b);
        return style.display !== 'none' && style.visibility !== 'hidden' && b.offsetParent !== null;
      });
      let wired = 0;
      let inViewport = 0;
      for (const b of buttons) {
        if (typeof b.onclick === 'function') wired++;
        const rect = b.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && rect.left >= 0 && rect.top >= 0 && rect.right <= window.innerWidth + 2 && rect.bottom <= window.innerHeight + 2) {
          inViewport++;
        }
      }
      (dbgRoot.querySelector('#dbg-output') as HTMLElement).textContent =
        `UI Test: ${wired}/${buttons.length} wired · ${inViewport}/${buttons.length} in viewport`;
    };
  }

  private refreshDebugStats(): void {
    const el = document.getElementById('dbg-metrics');
    if (!el || !this.gameScene) return;
    const m = this.gameScene.getDebugMetrics();
    el.textContent = `FPS: ${m.fps} · Bodies: ${m.bodyCount}`;
  }
}
