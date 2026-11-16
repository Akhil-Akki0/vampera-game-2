import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { WORLDS } from '../data/WorldConfig';
import { AudioManager } from '../systems/AudioManager';
import { DeviceScaler } from '../systems/DeviceScaler';
import { SaveManager } from '../systems/SaveManager';
import { TransitionHelper } from '../utils/TransitionHelper';
import { UiDomHelper } from '../utils/UiDomHelper';

const MAP_POINTS: Array<{ x: number; y: number }> = [
  { x: 185, y: 630 },
  { x: 350, y: 455 },
  { x: 545, y: 585 },
  { x: 740, y: 390 },
  { x: 940, y: 560 },
  { x: 1135, y: 370 },
  { x: 1320, y: 585 },
  { x: 1510, y: 400 },
  { x: 1705, y: 270 },
  { x: 1900, y: 470 },
];

/**
 * WorldMapScene renders an illustrated fantasy map canvas with 10 glowing world
 * nodes connected along a winding gothic road, fogged/chained locked territories,
 * animated player vampire avatar, camera pan/zoom, Continue shortcut, and Go-to-level.
 */
export class WorldMapScene extends Phaser.Scene {
  private avatar!: Phaser.GameObjects.Image;
  private pathGfx!: Phaser.GameObjects.Graphics;
  private isDragging = false;
  private dragStartX = 0;
  private camStartX = 0;

  constructor() {
    super({ key: 'WorldMapScene' });
  }

  create(): void {
    const save = SaveManager.getInstance();
    const state = save.getState();
    const activeWorld = WORLDS[Math.max(0, Math.min(9, state.selectedWorld - 1))];
    AudioManager.getInstance().setWorldTheme(activeWorld);
    UiDomHelper.setBodyState('title');

    this.cameras.main.setBounds(0, 0, 2120, GameConfig.WORLD_HEIGHT);
    this.cameras.main.setZoom(1);

    // Illustrated background art (loaded PNG or TextureGenerator parchment map)
    this.add.image(800, 450, 'world_map_bg').setDisplaySize(2120, 900).setDepth(0);

    // Draw biome land emblems, connecting winding path, glowing nodes, and fog chains
    this.pathGfx = this.add.graphics().setDepth(2);
    this.drawIllustratedMap();

    // Animated Vampire player avatar hovering on current world node
    const curPt = MAP_POINTS[activeWorld.id - 1] ?? MAP_POINTS[0];
    this.avatar = this.add.image(curPt.x, curPt.y - 52, 'vamp_dracula').setScale(0.75).setDepth(10);
    this.tweens.add({
      targets: this.avatar,
      y: curPt.y - 62,
      duration: 950,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Center camera around selected world
    this.cameras.main.scrollX = Phaser.Math.Clamp(curPt.x - GameConfig.WORLD_WIDTH / 2, 0, 520);

    // Drag to pan & wheel to zoom
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.isDragging = true;
      this.dragStartX = p.x;
      this.camStartX = this.cameras.main.scrollX;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.isDragging || !p.isDown) return;
      const dx = (this.dragStartX - p.x) / this.cameras.main.zoom;
      this.cameras.main.scrollX = Phaser.Math.Clamp(this.camStartX + dx, 0, 520);
    });
    this.input.on('pointerup', () => {
      this.isDragging = false;
    });
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _gx: unknown, _gy: unknown, dy: number) => {
      this.cameras.main.setZoom(Phaser.Math.Clamp(this.cameras.main.zoom - dy * 0.0007, 0.82, 1.25));
    });

    this.renderOverlayUi();

    DeviceScaler.getInstance().setBackHandler(() => {
      AudioManager.getInstance().playUiClick();
      TransitionHelper.transitionTo(this, 'MenuScene', undefined, 'curtain', 250);
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      DeviceScaler.getInstance().setBackHandler(null);
      UiDomHelper.clearOverlay('WorldMapScene');
    });
  }

  private drawIllustratedMap(): void {
    const save = SaveManager.getInstance();
    const g = this.pathGfx;
    g.clear();

    // Winding cobblestone road outline + path
    g.lineStyle(18, 0x090b10, 0.85);
    g.beginPath();
    g.moveTo(MAP_POINTS[0].x, MAP_POINTS[0].y);
    for (let i = 1; i < MAP_POINTS.length; i++) {
      g.lineTo(MAP_POINTS[i].x, MAP_POINTS[i].y);
    }
    g.strokePath();

    g.lineStyle(8, 0x92400e, 0.75);
    g.beginPath();
    g.moveTo(MAP_POINTS[0].x, MAP_POINTS[0].y);
    for (let i = 1; i < MAP_POINTS.length; i++) {
      g.lineTo(MAP_POINTS[i].x, MAP_POINTS[i].y);
    }
    g.strokePath();

    // Interactive world nodes on canvas
    WORLDS.forEach((w, idx) => {
      const pt = MAP_POINTS[idx];
      const unlocked = save.isWorldUnlocked(w.id);
      const accentNum = Number.parseInt(w.accentHex.replace('#', ''), 16);

      // Biome backdrop medallion
      g.fillStyle(unlocked ? accentNum : 0x1e293b, unlocked ? 0.25 : 0.35);
      g.fillCircle(pt.x, pt.y, 76);

      // Stone ring node
      g.fillStyle(unlocked ? 0x111827 : 0x090d16, 1);
      g.lineStyle(4, unlocked ? accentNum : 0x475569, 1);
      g.fillCircle(pt.x, pt.y, 38);
      g.strokeCircle(pt.x, pt.y, 38);

      if (!unlocked) {
        // Fog & lock chain overlay
        g.fillStyle(0x94a3b8, 0.16);
        g.fillCircle(pt.x, pt.y, 58);
        g.lineStyle(3, 0x64748b, 0.9);
        g.lineBetween(pt.x - 28, pt.y - 22, pt.x + 28, pt.y + 22);
        g.lineBetween(pt.x + 28, pt.y - 22, pt.x - 28, pt.y + 22);
      }

      const stars = save.getTotalStarsForWorld(w.id);
      const label = this.add
        .text(pt.x, pt.y + 52, `${w.id}. ${w.name}`, {
          fontFamily: 'Cinzel, Georgia, serif',
          fontSize: '16px',
          fontStyle: 'bold',
          color: unlocked ? '#ffffff' : '#94a3b8',
          stroke: '#07090e',
          strokeThickness: 5,
        })
        .setOrigin(0.5)
        .setDepth(6);
      void label;

      this.add
        .text(pt.x, pt.y + 72, unlocked ? `★ ${stars} · Lv ${w.levelStart}-${w.levelEnd}` : '🔒 Locked', {
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '13px',
          color: unlocked ? '#fde047' : '#64748b',
          stroke: '#07090e',
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setDepth(6);

      // Clickable zone right on the map node
      const zone = this.add.circle(pt.x, pt.y, 44, 0xffffff, 0.001).setDepth(12).setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => {
        this.selectWorld(w.id);
      });
    });
  }

  private selectWorld(worldId: number): void {
    const save = SaveManager.getInstance();
    if (!save.isWorldUnlocked(worldId)) {
      const req = (worldId - 1) * GameConfig.LEVELS_PER_WORLD + 1;
      UiDomHelper.showToast(`Clear Stage ${req - 1} to unlock World ${worldId}!`, 'info');
      return;
    }

    AudioManager.getInstance().playUiClick();
    save.setSelectedWorld(worldId);
    const dest = MAP_POINTS[worldId - 1];
    this.tweens.killTweensOf(this.avatar);
    this.tweens.add({
      targets: this.avatar,
      x: dest.x,
      y: dest.y - 52,
      duration: 240,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        TransitionHelper.transitionTo(this, 'LevelSelectScene', { worldId }, 'fade', 240);
      },
    });
  }

  private renderOverlayUi(): void {
    const save = SaveManager.getInstance();
    const state = save.getState();
    const continueLv = Math.max(1, Math.min(state.currentLevel || 1, state.unlockedLevel));

    const worldButtonsHtml = WORLDS.map((w) => {
      const unlocked = save.isWorldUnlocked(w.id);
      const stars = save.getTotalStarsForWorld(w.id);
      const active = w.id === state.selectedWorld;
      return `
        <button
          data-world-id="${w.id}"
          type="button"
          class="min-h-[42px] px-3 py-1.5 rounded-lg border gothic-btn text-left cursor-pointer flex items-center gap-2 shrink-0 ${
            unlocked
              ? active
                ? 'bg-red-900/95 border-amber-400 text-white'
                : 'bg-[#111726]/95 hover:bg-[#192236] border-slate-600 text-white'
              : 'bg-[#0b0f18]/90 border-slate-800 text-slate-500'
          }"
        >
          <span class="font-display text-xs font-bold whitespace-nowrap">${w.id}. ${w.name}</span>
          <span class="font-mono-num text-[11px] ${unlocked ? 'text-yellow-300' : 'text-slate-600'}">${unlocked ? `★${stars}` : '🔒'}</span>
        </button>
      `;
    }).join('');

    const overlay = UiDomHelper.getOverlay('WorldMapScene');
    overlay.innerHTML = `
      <div class="w-full h-full flex flex-col justify-between p-3 sm:p-5 safe-area-hud pointer-events-none">
        <div class="flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
          <div class="flex items-center gap-2.5">
            <button id="wm-back-btn" type="button" class="min-h-[44px] px-4 py-2 rounded-lg bg-[#0e131f]/95 hover:bg-slate-800 border border-slate-600 gothic-btn text-white text-sm font-semibold cursor-pointer whitespace-nowrap">
              ← Menu
            </button>
            <div class="px-3.5 py-2 rounded-lg gothic-panel">
              <h1 class="font-display text-lg sm:text-xl font-bold text-white leading-tight">Gothic World Map</h1>
              <div class="text-[11px] text-slate-400">Drag map to pan · Click a glowing realm node</div>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <div class="flex items-center gap-1.5 gothic-panel rounded-lg p-1">
              <label for="wm-jump-input" class="sr-only">Go to level</label>
              <input id="wm-jump-input" type="number" min="1" max="${GameConfig.TOTAL_LEVELS}" placeholder="Go to lv..." class="w-24 px-2 py-1.5 bg-transparent text-sm text-white font-mono-num focus:outline-none" />
              <button id="wm-jump-btn" type="button" class="min-h-[36px] px-3 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold cursor-pointer whitespace-nowrap">Go</button>
            </div>
            <button id="wm-continue-btn" type="button" class="min-h-[44px] px-4 py-2 rounded-lg bg-red-700 hover:bg-red-600 border border-red-400/70 gothic-btn text-white text-sm font-semibold cursor-pointer whitespace-nowrap">
              Continue (Lv ${continueLv})
            </button>
          </div>
        </div>

        <!-- Bottom World Selector Strip (fast mobile + keyboard navigation synced with illustrated map) -->
        <div class="pointer-events-auto flex items-center gap-2 overflow-x-auto pb-1">
          ${worldButtonsHtml}
        </div>
      </div>
    `;

    UiDomHelper.attachHoverAudio(overlay);

    (overlay.querySelector('#wm-back-btn') as HTMLButtonElement).onclick = () => {
      AudioManager.getInstance().playUiClick();
      TransitionHelper.transitionTo(this, 'MenuScene', undefined, 'curtain', 250);
    };

    (overlay.querySelector('#wm-continue-btn') as HTMLButtonElement).onclick = () => {
      AudioManager.getInstance().playUiClick();
      TransitionHelper.launchStageWithIntroCheck(this, continueLv);
    };

    const jumpInput = overlay.querySelector('#wm-jump-input') as HTMLInputElement;
    (overlay.querySelector('#wm-jump-btn') as HTMLButtonElement).onclick = () => {
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

    overlay.querySelectorAll<HTMLButtonElement>('button[data-world-id]').forEach((btn) => {
      btn.onclick = () => {
        const id = Number(btn.dataset.worldId);
        this.selectWorld(id);
      };
    });
  }
}
