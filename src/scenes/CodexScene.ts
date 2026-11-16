import Phaser from 'phaser';
import { VAMPIRE_ORDER, VAMPIRE_TYPES } from '../data/VampireTypes';
import { WORLDS } from '../data/WorldConfig';
import { ZOMBIE_TYPES, ZombieTypeId } from '../data/ZombieTypes';
import { AudioManager } from '../systems/AudioManager';
import { DeviceScaler } from '../systems/DeviceScaler';
import { SaveManager } from '../systems/SaveManager';
import { TransitionHelper } from '../utils/TransitionHelper';
import { UiDomHelper } from '../utils/UiDomHelper';
import { WorldBackdrop } from '../utils/WorldBackdrop';

const ZOMBIE_ORDER: ZombieTypeId[] = ['normal', 'armored', 'fat', 'runner', 'shield', 'screamer', 'boss'];

/**
 * CodexScene displays the full Vampire Collection (9) and Zombie Bestiary (7),
 * showing locked/unlocked states, stats, backstories, and tactical hints.
 */
export class CodexScene extends Phaser.Scene {
  private backdrop: WorldBackdrop | null = null;
  private activeTab: 'vampires' | 'zombies' = 'vampires';

  constructor() {
    super({ key: 'CodexScene' });
  }

  create(): void {
    const save = SaveManager.getInstance();
    this.backdrop = new WorldBackdrop(this, WORLDS[0], save.getSettings().graphicsQuality);
    UiDomHelper.setBodyState('title');
    this.renderUi();

    const goBack = () => {
      AudioManager.getInstance().playUiClick();
      TransitionHelper.transitionTo(this, 'MenuScene', undefined, 'fade', 250);
    };
    DeviceScaler.getInstance().setBackHandler(goBack);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      DeviceScaler.getInstance().setBackHandler(null);
      this.backdrop?.destroy();
      this.backdrop = null;
      UiDomHelper.clearOverlay('CodexScene');
    });
  }

  update(_time: number, delta: number): void {
    this.backdrop?.update(Math.min(0.05, delta / 1000));
  }

  private renderUi(): void {
    const state = SaveManager.getInstance().getState();
    const overlay = UiDomHelper.getOverlay('CodexScene');

    const pipBar = (n: number) =>
      Array.from({ length: 5 }, (_, i) => `<span class="inline-block w-3 h-2 rounded-sm ${i < n ? 'bg-amber-400' : 'bg-slate-800'}"></span>`).join(' ');

    const vampireCards = VAMPIRE_ORDER.map((id) => {
      const v = VAMPIRE_TYPES[id];
      const unlocked = state.unlockedLevel >= v.unlockLevel || state.seenVampireIntros.includes(id);
      return `
        <div class="p-4 rounded-2xl gothic-panel ${unlocked ? '' : 'opacity-75'} flex flex-col justify-between gap-2.5">
          <div>
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2.5">
                <span class="w-4 h-4 rounded-full border border-white/40 shrink-0" style="background:${v.colorHex}"></span>
                <div>
                  <div class="font-display font-bold text-white text-base">${v.name}</div>
                  <div class="text-[11px] text-red-300 font-semibold">${v.abilityName}</div>
                </div>
              </div>
              <span class="font-mono-num text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 ${unlocked ? 'text-emerald-300' : 'text-amber-300'}">
                ${unlocked ? 'Unlocked' : `Lv ${v.unlockLevel}`}
              </span>
            </div>
            <p class="text-xs italic text-slate-400 mt-2">"${v.backstory}"</p>
            <div class="mt-2 text-xs text-slate-200"><strong class="text-amber-300">Power:</strong> ${v.whatItDoes}</div>
            <div class="mt-1 text-xs text-slate-300"><strong class="text-sky-300">Best vs:</strong> ${v.bestAgainst}</div>
          </div>
          <div class="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>PWR ${pipBar(v.stats.power)}</span>
            <span>SPD ${pipBar(v.stats.speed)}</span>
            <span>SPL ${pipBar(v.stats.special)}</span>
          </div>
        </div>
      `;
    }).join('');

    const zombieCards = ZOMBIE_ORDER.map((id) => {
      const z = ZOMBIE_TYPES[id];
      return `
        <div class="p-4 rounded-2xl gothic-panel flex flex-col justify-between gap-2">
          <div class="flex items-center justify-between gap-2">
            <div>
              <div class="font-display font-bold text-white text-base">${z.name}</div>
              <div class="text-[11px] text-emerald-300 font-mono-num">HP ${z.maxHp} · +${z.points} pts</div>
            </div>
            <span class="w-5 h-5 rounded-full border border-black" style="background:#${z.color.toString(16).padStart(6, '0')}"></span>
          </div>
          <p class="text-xs text-slate-300 leading-relaxed">${z.description}</p>
        </div>
      `;
    }).join('');

    overlay.innerHTML = `
      <div class="w-full h-full flex flex-col p-4 sm:p-6 safe-area-hud pointer-events-auto bg-[#07090e]/80 overflow-hidden">
        <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div class="flex items-center gap-3">
            <button id="codex-back-btn" type="button" class="min-h-[48px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 gothic-btn text-white text-sm font-semibold cursor-pointer">← Menu</button>
            <h1 class="font-display text-2xl sm:text-3xl font-bold text-white">Vampire Codex</h1>
          </div>
          <div class="flex items-center gap-2">
            <button id="codex-tab-vamp" type="button" class="min-h-[48px] px-4 py-2 rounded-xl border gothic-btn text-xs sm:text-sm font-bold cursor-pointer ${
              this.activeTab === 'vampires' ? 'bg-red-700 border-amber-400 text-white' : 'bg-[#101524] border-slate-700 text-slate-300'
            }">Vampires (${VAMPIRE_ORDER.length})</button>
            <button id="codex-tab-zomb" type="button" class="min-h-[48px] px-4 py-2 rounded-xl border gothic-btn text-xs sm:text-sm font-bold cursor-pointer ${
              this.activeTab === 'zombies' ? 'bg-emerald-800 border-amber-400 text-white' : 'bg-[#101524] border-slate-700 text-slate-300'
            }">Undead (${ZOMBIE_ORDER.length})</button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto py-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            ${this.activeTab === 'vampires' ? vampireCards : zombieCards}
          </div>
        </div>
      </div>
    `;

    UiDomHelper.attachHoverAudio(overlay);

    (overlay.querySelector('#codex-back-btn') as HTMLButtonElement).onclick = () => {
      AudioManager.getInstance().playUiClick();
      TransitionHelper.transitionTo(this, 'MenuScene', undefined, 'fade', 250);
    };
    (overlay.querySelector('#codex-tab-vamp') as HTMLButtonElement).onclick = () => {
      AudioManager.getInstance().playUiClick();
      this.activeTab = 'vampires';
      this.renderUi();
    };
    (overlay.querySelector('#codex-tab-zomb') as HTMLButtonElement).onclick = () => {
      AudioManager.getInstance().playUiClick();
      this.activeTab = 'zombies';
      this.renderUi();
    };
  }
}
