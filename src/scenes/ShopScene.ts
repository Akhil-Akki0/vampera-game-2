import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { VAMPIRE_SKINS } from '../data/VampireTypes';
import { WORLDS } from '../data/WorldConfig';
import { AudioManager } from '../systems/AudioManager';
import { DeviceScaler } from '../systems/DeviceScaler';
import { SaveManager } from '../systems/SaveManager';
import { TransitionHelper } from '../utils/TransitionHelper';
import { UiDomHelper } from '../utils/UiDomHelper';
import { WorldBackdrop } from '../utils/WorldBackdrop';

/**
 * ShopScene lets players spend earned Coins on vampire skins and tactical power-ups.
 */
export class ShopScene extends Phaser.Scene {
  private backdrop: WorldBackdrop | null = null;

  constructor() {
    super({ key: 'ShopScene' });
  }

  create(): void {
    const save = SaveManager.getInstance();
    this.backdrop = new WorldBackdrop(this, WORLDS[2], save.getSettings().graphicsQuality);
    UiDomHelper.setBodyState('title');
    this.renderUi();

    DeviceScaler.getInstance().setBackHandler(() => {
      AudioManager.getInstance().playUiClick();
      TransitionHelper.transitionTo(this, 'MenuScene', undefined, 'fade', 250);
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      DeviceScaler.getInstance().setBackHandler(null);
      this.backdrop?.destroy();
      this.backdrop = null;
      UiDomHelper.clearOverlay('ShopScene');
    });
  }

  update(_time: number, delta: number): void {
    this.backdrop?.update(Math.min(0.05, delta / 1000));
  }

  private renderUi(): void {
    const save = SaveManager.getInstance();
    const state = save.getState();

    const skinsHtml = VAMPIRE_SKINS.map((skin) => {
      const owned = state.unlockedSkins.includes(skin.id);
      const equipped = state.equippedSkin === skin.id;
      return `
        <div class="p-4 rounded-xl gothic-panel border ${equipped ? 'border-amber-400' : 'border-slate-700'} flex flex-col justify-between gap-3">
          <div>
            <div class="flex items-center justify-between gap-2">
              <span class="font-display font-bold text-white">${skin.name}</span>
              <span class="w-4 h-4 rounded-full border border-white/40" style="background:${skin.tintHex}"></span>
            </div>
            <p class="text-xs text-slate-400 mt-1">${skin.description}</p>
          </div>
          <button
            data-skin-id="${skin.id}"
            type="button"
            class="min-h-[42px] w-full px-3 py-2 rounded-lg font-semibold text-xs gothic-btn cursor-pointer ${
              equipped
                ? 'bg-emerald-700 border border-emerald-400 text-white'
                : owned
                  ? 'bg-slate-700 hover:bg-slate-600 border border-slate-500 text-white'
                  : 'bg-amber-600 hover:bg-amber-500 border border-amber-300 text-slate-950'
            }"
          >
            ${equipped ? 'Equipped' : owned ? 'Equip' : `Buy · ${skin.cost} Coins`}
          </button>
        </div>
      `;
    }).join('');

    const powerItems: Array<{ key: 'extraVampire' | 'biggerBlast' | 'launchShield'; name: string; desc: string; cost: number }> = [
      {
        key: 'extraVampire',
        name: 'Extra Vampire',
        desc: 'Summons an extra Count Dracula into your slingshot queue mid-level.',
        cost: GameConfig.POWERUP_COSTS.extraVampire,
      },
      {
        key: 'biggerBlast',
        name: 'Bigger Blast',
        desc: 'Boosts Blast Baron, TNT, and Barrel explosion radius & damage for 1 level.',
        cost: GameConfig.POWERUP_COSTS.biggerBlast,
      },
      {
        key: 'launchShield',
        name: 'Launch Shield',
        desc: 'Wraps your next launched vampire in an impact shield for 1.45x smash power & hunger bite protection.',
        cost: GameConfig.POWERUP_COSTS.launchShield,
      },
    ];

    const powersHtml = powerItems
      .map(
        (p) => `
        <div class="p-4 rounded-xl gothic-panel flex flex-col justify-between gap-3">
          <div>
            <div class="flex items-center justify-between">
              <span class="font-display font-bold text-white">${p.name}</span>
              <span class="font-mono-num text-xs px-2 py-0.5 rounded bg-slate-800 text-amber-300">Owned: ${state.powerUps[p.key]}</span>
            </div>
            <p class="text-xs text-slate-400 mt-1">${p.desc}</p>
          </div>
          <button data-power-key="${p.key}" type="button" class="min-h-[42px] w-full px-3 py-2 rounded-lg bg-red-700 hover:bg-red-600 border border-red-400/60 gothic-btn text-white font-semibold text-xs cursor-pointer">
            Buy +1 · ${p.cost} Coins
          </button>
        </div>
      `
      )
      .join('');

    const overlay = UiDomHelper.getOverlay('ShopScene');
    overlay.innerHTML = `
      <div class="w-full h-full flex flex-col p-4 sm:p-6 safe-area-hud pointer-events-auto bg-[#07090e]/75 overflow-hidden">
        <div class="flex items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div class="flex items-center gap-3">
            <button id="shop-back-btn" type="button" class="min-h-[44px] px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 gothic-btn text-white text-sm font-semibold cursor-pointer">← Menu</button>
            <h1 class="font-display text-2xl sm:text-3xl font-bold text-white">Crypt Shop</h1>
          </div>
          <div class="px-4 py-2 rounded-lg gothic-panel border-amber-500/40 text-sm">
            <span class="text-amber-400 font-semibold">Coins:</span>
            <span class="font-mono-num font-bold text-white ml-1">${state.coins}</span>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto pt-4 pb-6 space-y-6 max-w-5xl mx-auto w-full">
          <section>
            <h2 class="font-display text-lg font-bold text-amber-200 mb-3">Vampire Skins</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">${skinsHtml}</div>
          </section>

          <section>
            <h2 class="font-display text-lg font-bold text-amber-200 mb-3">Tactical Power-Ups</h2>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">${powersHtml}</div>
          </section>
        </div>
      </div>
    `;

    UiDomHelper.attachHoverAudio(overlay);

    (overlay.querySelector('#shop-back-btn') as HTMLButtonElement).onclick = () => {
      AudioManager.getInstance().playUiClick();
      TransitionHelper.transitionTo(this, 'MenuScene', undefined, 'fade', 250);
    };

    overlay.querySelectorAll<HTMLButtonElement>('button[data-skin-id]').forEach((btn) => {
      btn.onclick = () => {
        const skinId = btn.dataset.skinId!;
        const skin = VAMPIRE_SKINS.find((s) => s.id === skinId);
        if (!skin) return;
        const st = save.getState();
        if (st.unlockedSkins.includes(skinId)) {
          st.equippedSkin = skinId;
          save.persist();
          AudioManager.getInstance().playUiClick();
          this.renderUi();
        } else if (save.spendCoins(skin.cost)) {
          st.unlockedSkins.push(skinId);
          st.equippedSkin = skinId;
          save.persist();
          AudioManager.getInstance().playCoinPickup();
          UiDomHelper.showToast(`Unlocked & equipped ${skin.name}!`, 'success');
          this.renderUi();
        } else {
          UiDomHelper.showToast('Not enough coins!', 'error');
        }
      };
    });

    overlay.querySelectorAll<HTMLButtonElement>('button[data-power-key]').forEach((btn) => {
      btn.onclick = () => {
        const key = btn.dataset.powerKey as 'extraVampire' | 'biggerBlast' | 'launchShield';
        const cost = GameConfig.POWERUP_COSTS[key];
        if (save.spendCoins(cost)) {
          save.getState().powerUps[key] += 1;
          save.persist();
          AudioManager.getInstance().playCoinPickup();
          UiDomHelper.showToast('Power-Up purchased!', 'success');
          this.renderUi();
        } else {
          UiDomHelper.showToast('Not enough coins!', 'error');
        }
      };
    });
  }
}
