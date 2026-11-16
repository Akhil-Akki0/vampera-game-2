import { AudioManager } from './AudioManager';
import { SaveManager } from './SaveManager';

export interface TutorialStep {
  title: string;
  caption: string;
  gesture: 'swipe' | 'release' | 'tap' | 'win';
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: '1. Drag Back to Aim',
    caption: 'Pull the vampire back on the crossbow to stretch the band and aim your arc.',
    gesture: 'swipe',
  },
  {
    title: '2. Release to Launch',
    caption: 'Let go to launch into the undead fortress. Farther pullback means more power!',
    gesture: 'release',
  },
  {
    title: '3. Tap Mid-Air for Power',
    caption: 'Tap anywhere (or the Ability button) while flying to unleash a vampire’s special power.',
    gesture: 'tap',
  },
  {
    title: '4. Destroy All Zombies to Win',
    caption: 'Smash walls and drop hazards on every zombie before your vampires run out!',
    gesture: 'win',
  },
];

/**
 * TutorialSystem provides:
 * - Illustrated Level 1 onboarding overlay with animated hand-gesture demonstrations
 * - Replayable "How to Play" modal (including HUD button legend & Replay Tutorial option)
 * - One-time tooltip bubbles for HUD controls saved in SaveManager
 */
export class TutorialSystem {
  static showFirstTimeLevelTutorial(onDone?: () => void): void {
    const save = SaveManager.getInstance();
    if (save.getSettings().tutorialSeen) {
      onDone?.();
      return;
    }

    const existing = document.getElementById('tutorial-modal');
    if (existing) existing.remove();

    let stepIdx = 0;
    const modal = document.createElement('div');
    modal.id = 'tutorial-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'How to Play Tutorial');
    modal.className = 'fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/75 pointer-events-auto';

    const renderStep = () => {
      const step = TUTORIAL_STEPS[stepIdx];
      const gestureSvg = this.renderGestureIllustration(step.gesture);
      const isLast = stepIdx === TUTORIAL_STEPS.length - 1;

      modal.innerHTML = `
        <div class="w-full max-w-md rounded-2xl gothic-panel p-5 sm:p-6 text-center shadow-2xl">
          <div class="text-[11px] font-mono-num uppercase tracking-widest text-amber-400">
            Crypt Training · ${stepIdx + 1}/${TUTORIAL_STEPS.length}
          </div>
          <h2 class="font-display text-xl sm:text-2xl font-bold text-white mt-1">${step.title}</h2>
          <div class="my-4 p-4 rounded-xl bg-[#090c14] border border-amber-900/40 flex items-center justify-center">
            ${gestureSvg}
          </div>
          <p class="text-sm text-slate-200 leading-relaxed">${step.caption}</p>
          <div class="mt-5 flex items-center gap-2.5">
            <button id="tut-skip-btn" type="button" class="min-h-[48px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 gothic-btn text-slate-300 text-xs font-semibold cursor-pointer">
              Skip
            </button>
            <button id="tut-next-btn" type="button" class="flex-1 min-h-[48px] px-4 py-2 rounded-xl bg-red-700 hover:bg-red-600 border border-amber-400/70 gothic-btn text-white text-sm font-bold cursor-pointer">
              ${isLast ? 'Start Hunting!' : 'Next →'}
            </button>
          </div>
        </div>
      `;

      (modal.querySelector('#tut-skip-btn') as HTMLButtonElement).onclick = () => {
        AudioManager.getInstance().playUiClick();
        save.updateSettings({ tutorialSeen: true });
        modal.remove();
        onDone?.();
      };
      (modal.querySelector('#tut-next-btn') as HTMLButtonElement).onclick = () => {
        AudioManager.getInstance().playUiClick();
        if (isLast) {
          save.updateSettings({ tutorialSeen: true });
          modal.remove();
          onDone?.();
        } else {
          stepIdx += 1;
          renderStep();
        }
      };
    };

    document.body.appendChild(modal);
    renderStep();
  }

  static showHowToPlayModal(options?: { onReplayTutorial?: () => void }): void {
    const existing = document.getElementById('info-modal');
    if (existing) existing.remove();

    AudioManager.getInstance().playPopupOpen(true);
    const modal = document.createElement('div');
    modal.id = 'info-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'How to Play');
    modal.className = 'fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/80 pointer-events-auto';

    const stepsHtml = TUTORIAL_STEPS.map(
      (s) => `
      <div class="p-3 rounded-xl bg-[#0c101b] border border-slate-800 flex items-center gap-3">
        <div class="shrink-0 w-16 h-12 rounded-lg bg-[#07090e] flex items-center justify-center overflow-hidden">
          ${this.renderGestureIllustration(s.gesture, true)}
        </div>
        <div>
          <div class="font-display text-sm font-bold text-amber-300">${s.title}</div>
          <div class="text-xs text-slate-300 leading-snug">${s.caption}</div>
        </div>
      </div>`
    ).join('');

    modal.innerHTML = `
      <div class="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl gothic-panel p-5 sm:p-6 shadow-2xl">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 class="font-display text-xl font-bold text-white">How to Play</h2>
          <button id="how-close-x" type="button" aria-label="Close" class="min-w-[48px] min-h-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 gothic-btn text-slate-200 font-bold cursor-pointer">✕</button>
        </div>

        <div class="mt-4 space-y-2.5">${stepsHtml}</div>

        <div class="mt-4 p-3.5 rounded-xl bg-[#101524] border border-amber-900/40 text-xs text-slate-300 space-y-1.5">
          <div class="font-display text-sm font-bold text-white mb-1">In-Game Buttons</div>
          <div><strong class="text-amber-300">Look Around (Eye):</strong> Zoom out or drag across the fortress to plan your shot.</div>
          <div><strong class="text-amber-300">Special Power (Bolt):</strong> Appears mid-flight when a vampire has an active ability.</div>
          <div><strong class="text-amber-300">Hint &amp; Skip (Ad):</strong> Watch a quick video for a golden aim arc or to skip a tough stage.</div>
          <div><strong class="text-amber-300">Hungry Zombies:</strong> Stranded vampires attract nearby undead—finish fast before they bite your bonus!</div>
        </div>

        <div class="mt-5 flex flex-wrap gap-2.5">
          ${
            options?.onReplayTutorial
              ? `<button id="how-replay-tut" type="button" class="flex-1 min-h-[48px] px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 border border-amber-300 gothic-btn text-slate-950 font-bold text-sm cursor-pointer">Replay Tutorial</button>`
              : ''
          }
          <button id="how-done-btn" type="button" class="flex-1 min-h-[48px] px-4 py-2 rounded-xl bg-red-700 hover:bg-red-600 border border-red-400/60 gothic-btn text-white font-semibold text-sm cursor-pointer">Got It</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => {
      AudioManager.getInstance().playPopupOpen(false);
      modal.remove();
    };
    (modal.querySelector('#how-close-x') as HTMLButtonElement).onclick = close;
    (modal.querySelector('#how-done-btn') as HTMLButtonElement).onclick = close;
    const replayBtn = modal.querySelector('#how-replay-tut') as HTMLButtonElement | null;
    if (replayBtn && options?.onReplayTutorial) {
      replayBtn.onclick = () => {
        AudioManager.getInstance().playUiClick();
        SaveManager.getInstance().updateSettings({ tutorialSeen: false });
        modal.remove();
        options.onReplayTutorial!();
      };
    }
  }

  static showTooltipOnce(id: string, anchorEl: HTMLElement | null, text: string): void {
    if (!anchorEl) return;
    if (!SaveManager.getInstance().markTooltipSeen(id)) return;

    const existing = document.getElementById('hud-first-tooltip');
    if (existing) existing.remove();

    const rect = anchorEl.getBoundingClientRect();
    const tip = document.createElement('div');
    tip.id = 'hud-first-tooltip';
    tip.className =
      'fixed z-40 max-w-[220px] px-3 py-2 rounded-xl gothic-tooltip text-xs text-amber-100 pointer-events-auto cursor-pointer';
    tip.textContent = text;

    const top = Math.min(window.innerHeight - 70, rect.bottom + 8);
    const left = Math.max(12, Math.min(window.innerWidth - 232, rect.left));
    tip.style.top = `${top}px`;
    tip.style.left = `${left}px`;
    document.body.appendChild(tip);

    const dismiss = () => tip.remove();
    tip.onclick = dismiss;
    window.setTimeout(dismiss, 4200);
  }

  static renderGestureIllustration(gesture: 'swipe' | 'release' | 'tap' | 'win', compact = false): string {
    const size = compact ? 'w-14 h-10' : 'w-52 h-24';
    if (gesture === 'swipe') {
      return `
        <svg viewBox="0 0 180 84" class="${size}" aria-hidden="true">
          <line x1="110" y1="36" x2="54" y2="54" stroke="#ef4444" stroke-width="4" stroke-dasharray="5 5"/>
          <circle cx="110" cy="36" r="14" fill="#b91c1c" stroke="#fde68a" stroke-width="2"/>
          <g class="animate-gesture-swipe">
            <circle cx="110" cy="40" r="10" fill="#fef3c7" opacity="0.9"/>
            <path d="M106 42 L114 42 L114 62 L106 62 Z" fill="#fef3c7" opacity="0.85"/>
          </g>
        </svg>`;
    }
    if (gesture === 'release') {
      return `
        <svg viewBox="0 0 180 84" class="${size}" aria-hidden="true">
          <path d="M26 62 Q90 8 156 54" fill="none" stroke="#fde68a" stroke-width="3" stroke-dasharray="6 5"/>
          <circle cx="128" cy="32" r="12" fill="#b91c1c" stroke="#fff" stroke-width="2"/>
          <polygon points="154,52 142,46 146,58" fill="#fde68a"/>
        </svg>`;
    }
    if (gesture === 'tap') {
      return `
        <svg viewBox="0 0 180 84" class="${size}" aria-hidden="true">
          <circle cx="90" cy="40" r="24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-dasharray="4 4"/>
          <circle cx="90" cy="40" r="14" fill="#6d28d9" stroke="#fde68a" stroke-width="2"/>
          <g class="animate-gesture-tap" style="transform-origin: 94px 48px;">
            <circle cx="94" cy="48" r="11" fill="#fef3c7" opacity="0.88"/>
          </g>
        </svg>`;
    }
    return `
      <svg viewBox="0 0 180 84" class="${size}" aria-hidden="true">
        <circle cx="58" cy="46" r="16" fill="#4f7d47" stroke="#07090e" stroke-width="2"/>
        <circle cx="122" cy="46" r="16" fill="#4f7d47" stroke="#07090e" stroke-width="2"/>
        <text x="90" y="34" text-anchor="middle" fill="#fde047" font-size="20" font-weight="bold">★ ★ ★</text>
      </svg>`;
  }
}
