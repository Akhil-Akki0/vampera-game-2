import Phaser from 'phaser';
import { VAMPIRE_TYPES, VampireTypeId } from '../data/VampireTypes';
import { AudioManager } from '../systems/AudioManager';
import { DeviceScaler } from '../systems/DeviceScaler';
import { SaveManager } from '../systems/SaveManager';
import { TutorialSystem } from '../systems/TutorialSystem';
import { TransitionHelper } from '../utils/TransitionHelper';
import { UiDomHelper } from '../utils/UiDomHelper';

/**
 * VampireIntroScene displays an illustrated spotlight introduction BEFORE a level
 * whenever a vampire type is encountered for the very first time.
 */
export class VampireIntroScene extends Phaser.Scene {
  private levelId = 1;
  private vampireId: VampireTypeId = 'dracula';
  private portraitImg: Phaser.GameObjects.Image | null = null;

  constructor() {
    super({ key: 'VampireIntroScene' });
  }

  init(data?: { levelId?: number; vampireId?: VampireTypeId }): void {
    this.levelId = data?.levelId ?? 1;
    this.vampireId = data?.vampireId ?? 'dracula';
  }

  create(): void {
    const v = VAMPIRE_TYPES[this.vampireId];
    SaveManager.getInstance().markVampireIntroSeen(this.vampireId);
    AudioManager.getInstance().playUnlockFanfare();

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x07090e, 0x07090e, 0x260c18, 0x260c18, 1);
    bg.fillRect(0, 0, 1600, 900);
    bg.fillStyle(v.color, 0.16);
    bg.fillCircle(420, 440, 250);
    bg.lineStyle(4, 0xfbbf24, 0.45);
    bg.strokeCircle(420, 440, 250);

    if (this.textures.exists(`vamp_${this.vampireId}`)) {
      this.portraitImg = this.add.image(420, 430, `vamp_${this.vampireId}`).setScale(3.2).setDepth(5);
    }

    const overlay = UiDomHelper.getOverlay('VampireIntroScene');
    const pipBar = (val: number) =>
      Array.from({ length: 5 }, (_, i) => `<span class="inline-block w-4 h-2.5 rounded-sm ${i < val ? 'bg-amber-400' : 'bg-slate-800'}"></span>`).join(' ');

    overlay.innerHTML = `
      <div class="w-full h-full flex items-center justify-center md:justify-end p-3 sm:p-8 safe-area-hud pointer-events-auto">
        <div class="w-full max-w-xl rounded-2xl gothic-panel p-4 sm:p-7 shadow-2xl space-y-3 max-h-[92vh] overflow-y-auto">
          <div class="text-xs font-mono-num uppercase tracking-[0.22em] text-amber-400 font-bold">
            New Vampire Awakened · Stage ${this.levelId}
          </div>
          <div class="flex items-center gap-3">
            <span class="md:hidden w-7 h-7 rounded-full border-2 border-amber-300 shrink-0" style="background:${v.colorHex}"></span>
            <div>
              <h1 class="font-display text-2xl sm:text-4xl font-black text-white leading-tight">${v.name}</h1>
              <div class="text-xs text-red-300 font-semibold">${v.title} — ${v.abilityName}</div>
            </div>
          </div>
          <p class="text-xs sm:text-sm italic text-slate-300">"${v.backstory}"</p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div class="p-3 rounded-xl bg-[#0c101b] border border-slate-800">
              <div class="font-bold text-amber-300 uppercase tracking-wider text-[10px] mb-1">What It Does</div>
              <div class="text-slate-200 leading-relaxed">${v.whatItDoes}</div>
            </div>
            <div class="p-3 rounded-xl bg-[#0c101b] border border-slate-800">
              <div class="font-bold text-sky-300 uppercase tracking-wider text-[10px] mb-1">Best Against</div>
              <div class="text-slate-200 leading-relaxed">${v.bestAgainst}</div>
            </div>
          </div>

          <div class="p-3 rounded-xl bg-[#0c101b] border border-amber-900/40 flex items-center gap-3">
            <div class="shrink-0 w-20 h-12 rounded-lg bg-[#07090e] flex items-center justify-center">
              ${TutorialSystem.renderGestureIllustration(v.gestureType === 'drag' ? 'swipe' : 'tap', true)}
            </div>
            <div class="text-xs">
              <div class="font-bold text-emerald-300 uppercase tracking-wider text-[10px]">How To Use It</div>
              <div class="text-slate-200">${v.howToUse}</div>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-4 text-xs pt-1">
            <div><span class="text-slate-400 mr-1.5">Power</span>${pipBar(v.stats.power)}</div>
            <div><span class="text-slate-400 mr-1.5">Speed</span>${pipBar(v.stats.speed)}</div>
            <div><span class="text-slate-400 mr-1.5">Special</span>${pipBar(v.stats.special)}</div>
          </div>

          <button id="vintro-try-btn" type="button" class="w-full min-h-[52px] px-6 py-3 rounded-xl bg-red-700 hover:bg-red-600 border-2 border-amber-400/80 gothic-btn text-white font-display font-bold text-base sm:text-lg cursor-pointer">
            Try ${v.name} in Stage ${this.levelId} →
          </button>
        </div>
      </div>
    `;

    const proceed = () => {
      AudioManager.getInstance().playUiClick();
      TransitionHelper.transitionTo(
        this,
        'GameScene',
        { levelId: this.levelId, highlightPractice: true },
        'bat-swarm',
        260
      );
    };

    (overlay.querySelector('#vintro-try-btn') as HTMLButtonElement).onclick = proceed;
    DeviceScaler.getInstance().setBackHandler(proceed);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      DeviceScaler.getInstance().setBackHandler(null);
      UiDomHelper.clearOverlay('VampireIntroScene');
      this.portraitImg?.destroy();
      this.portraitImg = null;
    });
  }

  update(time: number): void {
    if (this.portraitImg) {
      this.portraitImg.y = 430 + Math.sin(time * 0.004) * 12;
    }
  }
}
