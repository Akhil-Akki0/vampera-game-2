# BLOODLINE: Vampire vs Zombies — Art Style Guide

A single visual bible so every character, fortress block, UI button, loading video, and parallax world looks like it was painted by the same studio team — optimized for 5-inch phones up to 4K monitors.

---

## 1. Visual Pillar
- **Mood:** *Charming Dark Gothic Cartoon* — spooky moonlit silhouettes warmed by lantern glow, ruby blood accents, and whimsical undead slapstick. Never sterile, never flat geometric shapes, never photorealistic grime.
- **Readability First (Mobile 5" Rule):** Players judge projectile arcs and structural weak points in under 1 second on a 5-inch landscape phone. Foreground silhouettes must pop cleanly from background scenery through value contrast and rim lighting.

---

## 2. Color Palettes (10 Worlds + Combat Signifiers)

| World | Sky Top | Sky Bottom | Fog & Moonlight Rim | Primary Accent | Hazard Signifier |
|---|---|---|---|---|---|
| 1. Haunted Graveyard | `#070a15` | `#1c2640` | `#cbd5e1` (cool silver) | `#b91c1c` (crimson) | Wrought iron / fog |
| 2. Dark Forest | `#04100d` | `#123026` | `#6ee7b7` (emerald mist) | `#34d399` | Fireflies / wind |
| 3. Vampire Castle | `#12060f` | `#361327` | `#fda4af` (candle rose) | `#e11d48` | Stone battlements |
| 4. Frozen Tundra | `#091828` | `#1e435f` | `#bae6fd` (glacial cyan) | `#38bdf8` | Slippery ice |
| 5. Desert Ruins | `#1b1008` | `#4f2a15` | `#fde68a` (amber dusk) | `#f59e0b` | Wind gusts |
| 6. Swamp of Souls | `#04120c` | `#113d2e` | `#a7f3d0` (sickly teal) | `#10b981` | Falling moss rocks |
| 7. Volcano Lair | `#160405` | `#521210` | `#fdba74` (magma orange) | `#f97316` | Falling magma boulders |
| 8. Haunted Town | `#090e1c` | `#1c2a48` | `#fef08a` (street lantern) | `#eab308` | Thunder & rain |
| 9. Sky Fortress | `#0c132d` | `#24346a` | `#e0f2fe` (ozone white) | `#60a5fa` | High altitude gusts |
| 10. Cursed Underworld | `#0d0418` | `#341152` | `#d8b4fe` (soul violet) | `#a855f7` | Arcane lightning |

### Gameplay Color Coding (Reserve Bright Colors for Interactive Elements)
- **Vampire Projectiles:** Deep ruby `#dc2626`, royal purple `#7c3aed`, electric cyan `#0ea5e9`, ember orange `#ea580c`, arcane rose `#9f1239`, gilded gold `#eab308`.
- **Zombie Targets:** Saturated cemetery greens `#4f7d47`–`#65a30d` so enemies stand out even inside brown wood or grey stone bunkers.
- **Hazards:** Explosive Barrels (`#dc2626` + `#facc15` warning band), TNT Crates (`#b45309` + warm spark), Steel Spikes (`#94a3b8` specular glint).

---

## 3. Shape Language & Line Weights
- **Vampires (Attackers):** Sharp triangles, pointed ears, swept-back capes, crisp angular fangs, round energetic core silhouette for clean physics rolling and instant identification.
- **Zombies (Defenders):** Squishy, asymmetrical lumpy shapes, droopy heavy brows, crooked boxy jawlines, bulky shields/helmets (`heavy rectangle + blunt studs`).
- **Destructible Materials:**
  - *Wood:* Warm oak grain lines, bevelled planks, brass nail heads.
  - *Stone:* Chiseled granite bevels, hairline mortar cracks, cool highlight edge.
  - *Glass & Ice:* High specular diagonal sheen (`45°` white streak), crisp translucent cyan/blue tint.
- **Ink Outlines (at `1x` logical `1600×900` space):**
  - Characters & Pickups: **`2.5px – 3.5px`** deep ink `#07090e` (never pure muddy gray).
  - Structural Blocks: **`2.0px`** dark outline slightly darker than the material fill.
  - Background Parallax Layers: **No dark ink outlines (`0px`)** — separate shapes strictly via tonal value.

---

## 4. Shading, Lighting & Parallax Value Separation
- **Directional Rim Light:** Top-right moonlight / moonburst rim highlight (`1.5px–2.5px` crisp edge light on every vampire, zombie, and rooftop edge) + soft bottom-left core shadow (`multiply` tint).
- **Parallax Layer Rules (5–6 Layers per World):**
  1. `layer0_sky` (scroll `0.02x`): Smooth vertical night sky gradient + large stylized moon. Value contrast `< 20%`.
  2. `layer1_mountain` (scroll `0.06x`): Distant mountain ridges/spires tinted 70% toward sky color.
  3. `layer2_far` (scroll `0.15x`): Far castles, pine ridges, or ruins (`50%` atmospheric haze).
  4. `layer2b_lightshafts` (scroll `0.22x`): Subtle diagonal moonlight / lantern shafts (`alpha <= 0.12`).
  5. `layer3_mid` (scroll `0.36x`): Rolling silhouette hills, cathedrals, windmills, twisted trees.
  6. `layer4_near` (scroll `0.62x`): Fences, gravestones, lamp posts framed softly below skyline (`alpha 0.65`).
  7. `layer5_ground` (scroll `1.0x`): Rich grass/crypt rim trim along `GROUND_Y = 780`, high contrast against sky so landing points are unmistakable.
- **Rule of Thumb:** Background contrast never exceeds **35% luminance delta** between adjacent midground shapes; foreground physics actors span **70%–95% luminance contrast**.

---

## 5. UI Chrome & Mobile Touch Grammar
- **Panel Chrome:** Carved obsidian-slate gradient (`#181c28` -> `#0b0e15`) with hammered gothic gold border (`#ca8a04 / 0.55`) and subtle inner top rim (`1px rgba(255,255,255,0.12)`).
- **Button Hit Areas:** Minimum **`48×48 dp`** (`min-h-[48px] min-w-[48px]`) everywhere in menus, Pause, Shop, World Map, Codex, and HUD.
- **Zero Clutter:** Corner buttons use crisp inline vector icons + optional desktop/tablet labels (`hidden sm:inline`), keeping 70%+ of the viewport completely open for aiming.
- **Typography:**
  - *Display / Headers:* Cinzel Bold (`--font-display`), uppercase tracking only on tiny eyebrows (`10–11px`).
  - *Numbers / Scores / Timers:* Space Grotesk Tabular Numbers (`font-mono-num`).
  - *Body / Intros:* Inter (`12–15px`) at `#e2e8f0` over dark panels (WCAG `> 7:1` contrast).

---

## 6. Swapping Assets Without Touching Code
1. Export transparent PNGs matching dimensions in `ASSET_PROMPTS.md`.
2. Drop files under `public/assets/images/...` using paths listed in `src/data/AssetManifest.ts`.
3. Add `public/assets/video/loading.mp4` (`1280×720` or `1920×1080`, H.264 MP4, `<= 4 MB`, `muted`-friendly no-audio-required intro animation).
4. Any missing image or video silently falls back to the procedural Canvas2D / logo renderer with zero console errors.
