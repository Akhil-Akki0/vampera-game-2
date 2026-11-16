import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { WORLDS } from '../data/WorldConfig';
import { AudioManager } from '../systems/AudioManager';
import { DeviceScaler } from '../systems/DeviceScaler';
import { SaveManager } from '../systems/SaveManager';
import { TransitionHelper } from '../utils/TransitionHelper';
import { UiDomHelper } from '../utils/UiDomHelper';
import { WorldBackdrop } from '../utils/WorldBackdrop';

/**
 * LevelSelectScene displays the 100 stages inside a World along a winding
 * S-curve trail (4 pages of 25 levels), with stars, boss skulls, locks,
 * Continue shortcut, and direct Go-to-level jump.
 */
export class LevelSelectScene extends Phaser.Scene {
  private backdrop: WorldBackdrop | null = null;
  private worldId = 1;
  private page = 0;

  constructor() {
    super({ key: 'LevelSelectScene' });
  }

  init(data?: { worldId?: number }): void {
    const save = SaveManager.getInstance();
    this.worldId = data?.worldId ?? save.getState().selectedWorld ?? 1;
    this.page = 0;
  }

  create(): void {
    const save = SaveManager.getInstance();
    const world = WORLDS[Math.max(0, Math.min(9, this.worldId - 1))];
    AudioManager.getInstance().setWorldTheme(world);

    this.backdrop = new WorldBackdrop(this, world, save.getSettings().graphicsQuality);
    UiDomHelper.setBodyState('title');
    this.renderUi();

    DeviceScaler.getInstance().setBackHandler(() => {
      AudioManager.getInstance().playUiClick();
      TransitionHelper.transitionTo(this, 'WorldMapScene', undefined, 'fade', 240);
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      DeviceScaler.getInstance().setBackHandler(null);
      this.backdrop?.destroy();
      this.backdrop = null;
      UiDomHelper.clearOverlay('LevelSelectScene');
    });
  }

  update(_time: number, delta: number): void {
    this.backdrop?.update(Math.min(0.05, delta / 1000));
  }

  private renderUi(): void {
    const save = SaveManager.getInstance();
    const state = save.getState();
    const world = WORLDS[Math.max(0, Math.min(9, this.worldId - 1))];
    const perPage = 25;
    const totalPages = Math.ceil(GameConfig.LEVELS_PER_WORLD / perPage);
    const startLv = world.levelStart + this.page * perPage;
    const endLv = Math.min(world.levelEnd, startLv + perPage - 1);
    const continueLv = Math.max(1, Math.min(state.currentLevel || 1, state.unlockedLevel));

    const pageTabsHtml = Array.from({ length: totalPages }, (_, idx) => {
      const pStart = world.levelStart + idx * perPage;
      const pEnd = Math.min(world.levelEnd, pStart + perPage - 1);
      const active = idx === this.page;
      return `
        <button data-page="${idx}" type="button" class="min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-mono-num font-bold gothic-btn cursor-pointer whitespace-nowrap ${
          active ? 'bg-red-700 border border-red-400 text-white' : 'bg-[#111726] text-slate-300 hover:bg-slate-800 border border-slate-700'
        }">
          ${pStart}–${pEnd}
        </button>
      `;
    }).join('');

    // Arrange levels into winding S-curve rows (alternating L->R and R->L)
    const rows: string[] = [];
    const cols = 5;
    const allLevels: number[] = [];
    for (let lv = startLv; lv <= endLv; lv++) allLevels.push(lv);

    for (let r = 0; r < Math.ceil(allLevels.length / cols); r++) {
      const slice = allLevels.slice(r * cols, (r + 1) * cols);
      const ordered = r % 2 === 1 ? [...slice].reverse() : slice;
      const nodes = ordered
        .map((lv) => {
          const unlocked = lv <= state.unlockedLevel;
          const rec = state.levels[lv];
          const stars = rec?.stars ?? 0;
          const isBoss = lv % GameConfig.BOSS_INTERVAL === 0;
          const starStr = unlocked ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '🔒';

          return `
            <button
              data-level="${lv}"
              type="button"
              class="min-h-[76px] p-2.5 rounded-2xl border gothic-btn flex flex-col items-center justify-center gap-1 cursor-pointer ${
                unlocked
                  ? isBoss
                    ? 'bg-red-950/95 hover:bg-red-900 border-amber-400 text-white'
                    : 'bg-[#111726]/95 hover:bg-[#1a2338] border-slate-500 text-white'
                  : 'bg-[#0b0f18]/85 border-slate-800 text-slate-500'
              }"
            >
              <div class="font-mono-num text-base font-bold">${lv}${isBoss ? ' 💀' : ''}</div>
              <div class="text-xs tracking-wider ${stars > 0 ? 'text-yellow-300' : 'text-slate-500'}">${starStr}</div>
            </button>
          `;
        })
        .join('');

      const arrow = r % 2 === 0 ? '→' : '←';
      rows.push(`
        <div class="relative p-2 rounded-xl border border-amber-900/30 bg-[#0b0f18]/45">
          <div class="text-[10px] font-mono-num uppercase tracking-widest text-amber-400/70 mb-1.5 text-center">
            Trail Segment ${r + 1} ${arrow}
          </div>
          <div class="grid grid-cols-3 sm:grid-cols-5 gap-2.5">${nodes}</div>
        </div>
      `);
    }

    const overlay = UiDomHelper.getOverlay('LevelSelectScene');
    overlay.innerHTML = `
      <div class="w-full h-full flex flex-col p-4 sm:p-6 safe-area-hud pointer-events-auto bg-[#07090e]/70 overflow-hidden">
        <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div class="flex items-center gap-3">
            <button id="ls-back-btn" type="button" class="min-h-[44px] px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 gothic-btn text-white text-sm font-semibold cursor-pointer whitespace-nowrap">
              ← Worlds
            </button>
            <div>
              <h1 class="font-display text-xl sm:text-2xl font-bold text-white">World ${world.id}: ${world.name}</h1>
              <div class="text-xs text-slate-400">${world.subtitle} · ${world.weatherEffectLabel}</div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <div class="flex items-center gap-1.5 gothic-panel rounded-lg p-1">
              <label for="ls-jump-input" class="sr-only">Go to stage</label>
              <input id="ls-jump-input" type="number" min="1" max="${GameConfig.TOTAL_LEVELS}" placeholder="Stage #" class="w-24 px-2 py-1.5 bg-transparent text-sm text-white font-mono-num focus:outline-none" />
              <button id="ls-jump-btn" type="button" class="min-h-[36px] px-3 rounded bg-red-700 hover:bg-red-600 text-white text-xs font-semibold cursor-pointer whitespace-nowrap">Go</button>
            </div>
            <button id="ls-continue-btn" type="button" class="min-h-[44px] px-3.5 py-2 rounded-lg bg-red-700 hover:bg-red-600 border border-red-400/70 gothic-btn text-white text-xs sm:text-sm font-semibold cursor-pointer whitespace-nowrap">
              Continue Lv ${continueLv}
            </button>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 py-3">
          ${pageTabsHtml}
        </div>

        <div class="flex-1 overflow-y-auto pb-4">
          <div class="space-y-3 max-w-4xl mx-auto">
            ${rows.join('')}
          </div>
        </div>
      </div>
    `;

    UiDomHelper.attachHoverAudio(overlay);

    (overlay.querySelector('#ls-back-btn') as HTMLButtonElement).onclick = () => {
      AudioManager.getInstance().playUiClick();
      TransitionHelper.transitionTo(this, 'WorldMapScene', undefined, 'fade', 240);
    };

    (overlay.querySelector('#ls-continue-btn') as HTMLButtonElement).onclick = () => {
      AudioManager.getInstance().playUiClick();
      TransitionHelper.launchStageWithIntroCheck(this, continueLv);
    };

    overlay.querySelectorAll<HTMLButtonElement>('button[data-page]').forEach((btn) => {
      btn.onclick = () => {
        AudioManager.getInstance().playUiClick();
        this.page = Number(btn.dataset.page);
        this.renderUi();
      };
    });

    overlay.querySelectorAll<HTMLButtonElement>('button[data-level]').forEach((btn) => {
      btn.onclick = () => {
        const lv = Number(btn.dataset.level);
        if (lv > state.unlockedLevel) {
          UiDomHelper.showToast(`Stage ${lv} is locked! Beat earlier stages first.`, 'info');
          return;
        }
        AudioManager.getInstance().playUiClick();
        TransitionHelper.launchStageWithIntroCheck(this, lv);
      };
    });

    const jumpInput = overlay.querySelector('#ls-jump-input') as HTMLInputElement;
    (overlay.querySelector('#ls-jump-btn') as HTMLButtonElement).onclick = () => {
      const n = Math.floor(Number(jumpInput.value));
      if (!Number.isFinite(n) || n < 1) {
        UiDomHelper.showToast('Enter a valid stage number.', 'error');
        return;
      }
      if (n > state.unlockedLevel) {
        UiDomHelper.showToast(`Stage ${n} is locked (highest unlocked: ${state.unlockedLevel}).`, 'error');
        return;
      }
      AudioManager.getInstance().playUiClick();
      TransitionHelper.launchStageWithIntroCheck(this, n);
    };
  }
}
