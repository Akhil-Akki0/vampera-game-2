import assert from 'node:assert/strict';
import test from 'node:test';
import { GameConfig } from './config/GameConfig';
import { ASSET_MANIFEST } from './data/AssetManifest';
import { VAMPIRE_ORDER, VAMPIRE_TYPES } from './data/VampireTypes';
import { getWorldForLevel, WORLDS } from './data/WorldConfig';
import { ZOMBIE_TYPES, ZombieTypeId } from './data/ZombieTypes';
import { LevelGenerator } from './systems/LevelGenerator';
import { SaveManager } from './systems/SaveManager';
import {
  calculateImpactDamage,
  calculateStarRating,
  clampDragVector,
  computeBlastEffect,
  evaluateMatchOutcome,
} from './utils/PhysicsRules';
import { SeededRNG } from './utils/SeededRNG';

function createMockStorage() {
  const map = new Map<string, string>();
  return {
    getItem(k: string) {
      return map.get(k) ?? null;
    },
    setItem(k: string, v: string) {
      map.set(k, v);
    },
    removeItem(k: string) {
      map.delete(k);
    },
  };
}

test('Roster & AssetManifest cover all 9 vampires and 7 zombies', () => {
  assert.equal(VAMPIRE_ORDER.length, 9);
  for (const vt of VAMPIRE_ORDER) {
    assert.ok(VAMPIRE_TYPES[vt], `Missing VampireType ${vt}`);
    assert.ok(
      ASSET_MANIFEST.some((a) => a.key === `vamp_${vt}`),
      `Missing AssetManifest entry for vamp_${vt}`
    );
  }

  const expectedZombies: ZombieTypeId[] = ['normal', 'armored', 'fat', 'runner', 'shield', 'screamer', 'boss'];
  for (const zt of expectedZombies) {
    assert.ok(ZOMBIE_TYPES[zt], `Missing ZombieType ${zt}`);
    assert.ok(
      ASSET_MANIFEST.some((a) => a.key === `zomb_${zt}`),
      `Missing AssetManifest entry for zomb_${zt}`
    );
  }

  // Verify handcrafted stages showcase Storm Caller, Screamer, and Blood Mage
  assert.ok(LevelGenerator.getLevel(8).vampires.includes('storm'));
  assert.ok(LevelGenerator.getLevel(16).zombies.some((z) => z.type === 'screamer'));
  assert.ok(LevelGenerator.getLevel(19).vampires.includes('mage'));
});

test('SeededRNG produces identical deterministic sequences per level seed', () => {
  const a = new SeededRNG(42, 0);
  const b = new SeededRNG(42, 0);
  const c = new SeededRNG(43, 0);

  const seqA = Array.from({ length: 10 }, () => a.next());
  const seqB = Array.from({ length: 10 }, () => b.next());
  const seqC = Array.from({ length: 10 }, () => c.next());

  assert.deepEqual(seqA, seqB);
  assert.notDeepEqual(seqA, seqC);
});

test('LevelGenerator supplies handcrafted levels 1..20 and deterministic valid levels up to 1000+', () => {
  for (let lv = 1; lv <= 20; lv++) {
    const bp = LevelGenerator.getLevel(lv);
    assert.equal(bp.id, lv);
    assert.ok(bp.vampires.length >= 1, `Level ${lv} must have vampires`);
    assert.ok(bp.zombies.length >= 1, `Level ${lv} must have zombies`);
    assert.ok(LevelGenerator.validateSolvability(bp), `Handcrafted level ${lv} failed validation`);
  }

  const lv250A = LevelGenerator.getLevel(250);
  const lv250B = LevelGenerator.getLevel(250);
  assert.deepEqual(lv250A, lv250B);
  assert.equal(lv250A.isBoss, true);
  assert.ok(lv250A.zombies.some((z) => z.type === 'boss'));

  for (let lv = 21; lv <= GameConfig.TOTAL_LEVELS; lv += 7) {
    const bp = LevelGenerator.getLevel(lv);
    assert.ok(LevelGenerator.validateSolvability(bp), `Procedural level ${lv} failed solvability`);
  }

  const lv1005 = LevelGenerator.getLevel(1005);
  assert.equal(lv1005.id, 1005);
  assert.ok(LevelGenerator.validateSolvability(lv1005));
});

test('WorldConfig transitions cleanly every 100 levels with weather & time tendencies', () => {
  assert.equal(WORLDS.length, 10);
  for (const w of WORLDS) {
    assert.ok(w.weatherEffectLabel.length > 0);
    assert.ok(w.ambientAudioKind.length > 0);
  }
  assert.equal(getWorldForLevel(1).world.id, 1);
  assert.equal(getWorldForLevel(100).world.id, 1);
  assert.equal(getWorldForLevel(101).world.id, 2);
  assert.equal(getWorldForLevel(301).world.id, 4);
  assert.equal(getWorldForLevel(1000).world.id, 10);

  const loopInfo = getWorldForLevel(1001);
  assert.equal(loopInfo.world.id, 1);
  assert.equal(loopInfo.loopCycle, 1);
  assert.ok(loopInfo.difficultyMultiplier > getWorldForLevel(1).difficultyMultiplier);
});

test('SaveManager handles persistence, corruption fallback, ambientVolume, daily reward, and win unlocks', () => {
  const storage = createMockStorage();
  storage.setItem('bloodline_phaser_save_v2', '{corrupt json!!!');
  const mgr = new SaveManager(storage);
  assert.equal(mgr.getState().unlockedLevel, 1);
  assert.equal(mgr.getState().settings.disableInterstitials, true);
  assert.equal(mgr.getState().settings.ambientVolume, 0.55);

  mgr.updateSettings({ ambientVolume: 0.8 });
  assert.equal(mgr.getSettings().ambientVolume, 0.8);

  const daily1 = mgr.claimDailyReward('2026-11-16');
  assert.equal(daily1, GameConfig.DAILY_REWARD_COINS);
  const daily2 = mgr.claimDailyReward('2026-11-16');
  assert.equal(daily2, 0);

  const winRes = mgr.recordWin(100, 4500, 3, 4, true, 3);
  assert.ok(winRes.coinsEarned > 0);
  assert.equal(mgr.getState().unlockedLevel, 101);
  assert.equal(mgr.isWorldUnlocked(2), true);
  assert.equal(mgr.getTotalStarsForWorld(1), 3);

  const reloaded = new SaveManager(storage);
  assert.equal(reloaded.getState().unlockedLevel, 101);
  assert.equal(reloaded.getState().levels[100].stars, 3);
  assert.equal(reloaded.getSettings().ambientVolume, 0.8);
});

test('PhysicsRules accurately clamp drag, compute impact/blast damage, stars, and win/loss', () => {
  const clamped = clampDragVector(-250, 0, 135, 0.145);
  assert.ok(Math.abs(clamped.clampedDx - -135) < 0.01);
  assert.ok(clamped.vx > 0);
  assert.equal(clamped.powerRatio, 1);

  assert.equal(calculateImpactDamage(1.0, 1.0, 1.0), 0);
  assert.ok(calculateImpactDamage(10.0, 1.5, 1.0) > calculateImpactDamage(10.0, 1.5, 1.6));

  const hit = computeBlastEffect(500, 500, 540, 500, 200, 180, 0.25);
  assert.equal(hit.hit, true);
  assert.ok(hit.damage > 100);
  assert.ok(hit.fx > 0);

  assert.equal(calculateStarRating(4200, [1000, 2500, 4000]), 3);
  assert.equal(calculateStarRating(2600, [1000, 2500, 4000]), 2);
  assert.equal(calculateStarRating(900, [1000, 2500, 4000]), 1);

  assert.equal(
    evaluateMatchOutcome({ aliveZombies: 0, activeVampireInFlight: false, queuedVampiresCount: 1, settledMs: 900 }),
    'won'
  );
  assert.equal(
    evaluateMatchOutcome({ aliveZombies: 2, activeVampireInFlight: false, queuedVampiresCount: 0, settledMs: 1400 }),
    'lost'
  );
  assert.equal(
    evaluateMatchOutcome({ aliveZombies: 2, activeVampireInFlight: true, queuedVampiresCount: 0, settledMs: 2000 }),
    'continue'
  );
});

import { getCoreImageAssets, getWorldAssets } from './data/AssetManifest';
import { DeviceScaler } from './systems/DeviceScaler';

test('VampireTypes include rich Codex backstory/usage/stats and AssetManifest supports lazy world loading', () => {
  for (const vt of VAMPIRE_ORDER) {
    const meta = VAMPIRE_TYPES[vt];
    assert.ok(meta.title.length > 0);
    assert.ok(meta.backstory.length > 10);
    assert.ok(meta.whatItDoes.length > 10);
    assert.ok(meta.howToUse.length > 10);
    assert.ok(meta.bestAgainst.length > 5);
    assert.ok(meta.stats.power >= 1 && meta.stats.power <= 5);
    assert.ok(meta.stats.speed >= 1 && meta.stats.speed <= 5);
    assert.ok(meta.stats.special >= 1 && meta.stats.special <= 5);
  }

  const coreAssets = getCoreImageAssets();
  assert.ok(coreAssets.length >= 16);
  assert.ok(coreAssets.every((a) => a.worldId === undefined));

  const w3Assets = getWorldAssets(3);
  assert.equal(w3Assets.length, 2);
  assert.ok(w3Assets.every((a) => a.worldId === 3));
});

test('SaveManager tracks daily level skips, zombie intros, tooltips, and DeviceScaler caps DPR', () => {
  const storage = createMockStorage();
  const mgr = new SaveManager(storage);

  assert.equal(mgr.hasSeenVampireIntro('bat'), false);
  assert.equal(mgr.markVampireIntroSeen('bat'), true);
  assert.equal(mgr.markVampireIntroSeen('bat'), false);
  assert.equal(mgr.hasSeenVampireIntro('bat'), true);

  assert.equal(mgr.markZombieIntroSeen('armored'), true);
  assert.equal(mgr.markZombieIntroSeen('armored'), false);

  assert.equal(mgr.markTooltipSeen('look_around'), true);
  assert.equal(mgr.markTooltipSeen('look_around'), false);

  const today = '2026-11-16';
  assert.equal(mgr.getRemainingSkipsToday(today), GameConfig.SKIP_LEVEL_DAILY_LIMIT);
  for (let i = 1; i <= GameConfig.SKIP_LEVEL_DAILY_LIMIT; i++) {
    assert.equal(mgr.recordLevelSkip(i, today), true);
  }
  assert.equal(mgr.canSkipLevelToday(today), false);
  assert.equal(mgr.recordLevelSkip(99, today), false);
  // Skipping stage 1..5 unlocked stage 6 and awarded 1 star each
  assert.equal(mgr.getState().unlockedLevel, 6);
  assert.equal(mgr.getState().levels[5].stars, 1);

  const dpr = DeviceScaler.getInstance().getRecommendedDpr();
  assert.ok(dpr >= 1 && dpr <= GameConfig.MAX_DPR);
});

