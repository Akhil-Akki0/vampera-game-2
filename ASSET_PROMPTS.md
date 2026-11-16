# BLOODLINE: Vampire vs Zombies — Art & Asset Prompts

All assets listed below are optional at runtime: the procedural Canvas2D generator (`src/utils/TextureGenerator.ts`), parallax backdrop renderer (`src/utils/WorldBackdrop.ts`), and Web Audio synthesizer (`src/systems/AudioManager.ts`) automatically cover any missing file with zero errors.
Drop finished files into `public/assets/images/`, `public/assets/audio/`, or `public/assets/video/` matching `src/data/AssetManifest.ts`. Follow `ART_STYLE_GUIDE.md` for line weight and palette consistency.

---

## Global Style Prefix (Copy Into Every Image Prompt)
> *Hand-painted 2D cartoon gothic game art, bold expressive silhouette, clean #07090e 3px dark ink outlines, saturated jewel tones, crisp top-right moonlight rim light, cel-shaded depth, charming spooky fantasy mobile game style, crisp readability on a 5-inch phone screen, centered, no text, no watermarks.*

---

## 1. Vampire Characters (`96×96 px` Single OR `672×96 px` 7-Frame Animation Strip, Transparent PNG)

For animated sprite sheets, use a horizontal strip of 7 equal `96×96` frames:
`[0: Idle]` · `[1: Aim Pull]` · `[2: Flying]` · `[3: Ability Burst]` · `[4: Impact Hit]` · `[5: Victory Smirk]` · `[6: Dizzy Defeat]`

1. **Count Dracula** — `public/assets/images/vampires/dracula.png`
   - *Base Prompt:* Compact round heroic vampire mascot, sharp black widow's peak hair, high crimson-and-black velvet cape collar, glowing ruby eyes, mischievous fang smirk, facing right, isolated on transparent background.
   - *Sheet Prompt Add-on:* 7-frame horizontal animation strip (96x96 per cell): idle cape sway, slingshot aim grin, determined flight pose, heavy impact dive aura, squashed hit stun, triumphant fang laugh, dizzy stars pose.

2. **Bat Form** — `public/assets/images/vampires/bat_form.png`
   - *Base Prompt:* Plump stylized violet vampire bat creature, oversized pointed ears, spread leathery purple wings, glowing lavender eyes, tiny sharp fangs, isolated on transparent background.
   - *Sheet Prompt Add-on:* 7-frame horizontal sprite sheet (96x96 cells): wings-folded idle, tense sling crouch, fast wingbeat flight, glowing triple-split burst, hit squash, victory loop, dizzy flop.

3. **Speed Fang** — `public/assets/images/vampires/speed_fang.png`
   - *Base Prompt:* Sleek electric-cyan vampire sprinter with swept-back midnight hair, streamlined sapphire cape, glowing neon-blue visor glow, sharp aerodynamic silhouette, isolated on transparent background.

4. **Blast Baron** — `public/assets/images/vampires/blast_baron.png`
   - *Base Prompt:* Volcanic crimson-and-charcoal bomb vampire with sizzling lit fuse atop his head, brass goggles on forehead, glowing amber eyes, ember-trimmed cloak, wicked grin, isolated on transparent background.

5. **Storm Caller** — `public/assets/images/vampires/storm_caller.png`
   - *Base Prompt:* Mystical violet-cloaked vampire sorcerer with small leather bat wings, swirling emerald-cyan eyes, silver tempest hair, glowing wind runes, isolated on transparent background.

6. **Shadow Drop** — `public/assets/images/vampires/shadow_drop.png`
   - *Base Prompt:* Hooded obsidian ninja-vampire wrapped in midnight slate bandages, glowing rose-crimson slit eyes, heavy iron boots for plunging slams, isolated on transparent background.

7. **Ice Fang** — `public/assets/images/vampires/ice_fang.png`
   - *Base Prompt:* Frost-touched pale azure vampire with crystalline icicle collar spikes, frosty silver eyebrows, glowing ice-white eyes, cold mist breath, isolated on transparent background.

8. **Thunder Bat** — `public/assets/images/vampires/thunder_bat.png`
   - *Base Prompt:* Fierce golden-amber armored storm bat-vampire with crackling electric wingtips, glowing yellow eyes, bronze lightning crest, isolated on transparent background.

9. **Blood Mage** — `public/assets/images/vampires/blood_mage.png`
   - *Base Prompt:* Arcane vampire warlock wearing deep burgundy pointed cowl adorned with a glowing crimson teardrop ruby, floating red magic wisps, glowing rose eyes, isolated on transparent background.

---

## 2. Zombie Enemies (`96×96 px`–`160×160 px`, Optional 5-Frame Strip `[Idle, Groan, Lunging, Crushed, KO]`)

1. **Ghoul** — `public/assets/images/zombies/normal.png` (`96×96`)
   - *Prompt:* Goofy slouching cemetery green zombie, tattered slate vest, uneven bloodthirsty yellow-and-red eyes, crooked tomb teeth, facing left, transparent background.
2. **Crypt Knight** — `public/assets/images/zombies/armored.png` (`96×96`)
   - *Prompt:* Heavy zombie knight wearing dented iron spiked burial helmet, moss-green skin, glowing red eyes under visor, rusty shoulder plates, transparent background.
3. **Bloat Fiend** — `public/assets/images/zombies/fat.png` (`112×112`)
   - *Prompt:* Huge bulky glutton zombie, bruised moss-green flesh, ripped suspender trousers, triple chin, drooling crooked fang jaw, transparent background.
4. **Prowler** — `public/assets/images/zombies/runner.png` (`96×96`)
   - *Prompt:* Hyperactive lime-green runner zombie wearing tattered red headband, feral glowing eyes, snarling teeth, hunched sprinting posture, transparent background.
5. **Buckler Dead** — `public/assets/images/zombies/shield.png` (`104×104`)
   - *Prompt:* Stalwart zombie sentinel holding an oversized spiked iron tomb-door buckler shield facing left against incoming projectiles, transparent background.
6. **Banshee Shrieker** — `public/assets/images/zombies/screamer.png` (`96×96`)
   - *Prompt:* Wild-haired pale teal banshee zombie with floating lavender hair wisps, wide screaming mouth emitting violet sonic rings, tattered burial shroud, transparent background.
7. **Overlord Baron (Boss)** — `public/assets/images/zombies/boss.png` (`160×160`)
   - *Prompt:* Massive hulking Zombie Overlord Baron wearing jagged hammered gold crown with glowing blood ruby, crimson tattered royal cape, scarred dark-green skin, fiery eyes, transparent background.

---

## 3. Structural Blocks, Hazards & Pickups (Transparent PNG)

- **Wood Block (`128×32`):** `public/assets/images/blocks/wood.png` — *Weathered dark oak cemetery plank with brass nails, woodgrain bevels, cartoon gothic style.*
- **Stone Slab (`128×32`):** `public/assets/images/blocks/stone.png` — *Chiseled midnight granite tomb slab with moss accents and bevel highlights.*
- **Glass Pane (`128×32`):** `public/assets/images/blocks/glass.png` — *Translucent frosty pale-blue cathedral glass pane with lead border and diagonal specular shine.*
- **Ice Block (`128×32`):** `public/assets/images/blocks/ice.png` — *Translucent glowing cyan glacier block with sharp crystalline highlights.*
- **TNT Crate (`72×72`):** `public/assets/images/hazards/tnt.png` — *Banded wooden dynamite crate with stitched beige TNT banner and glowing spark fuse.*
- **Explosive Barrel (`64×80`):** `public/assets/images/hazards/barrel.png` — *Rusty iron band powder keg painted crimson with yellow hazard band.*
- **Hanging Coffin (`96×48`):** `public/assets/images/hazards/coffin.png` — *Hexagonal mahogany coffin with silver cross emblem and brass handles.*
- **Grave Spikes (`128×32`):** `public/assets/images/hazards/spikes.png` — *Row of gleaming sharp steel crypt spikes mounted on dark iron baseplate.*
- **Blood Drop Icon (`64×64`):** `public/assets/images/ui/blood_drop.png` — *Glossy faceted ruby-red blood droplet gem with warm rim highlight.*
- **Smoke Puff (`96×96`):** `public/assets/images/fx/smoke_puff.png` — *Soft layered charcoal-black swirling smoke cloud puff.*

---

## 4. World Backgrounds (5-Layer Seamless Parallax Sets per World, `1600×900`)

For each world `N` (`1..10`), optional PNG layers load lazily only when entering that world (`public/assets/images/worlds/world_N_far.png`, `world_N_mid.png`):
- **Layer 0 (Sky + Moon, opaque):** Vertical gothic twilight gradient + stylized moon (no hard outlines, `<20%` contrast).
- **Layer 1 (Far Mountains/Peaks, transparent):** Atmospheric misty peaks (`world_N_far.png`).
- **Layer 2 (Mid Structures/Silhouettes, transparent):** Cathedrals, dead trees, pyramids, battlements (`world_N_mid.png`).
- **Layer 3 (Near Foreground Silos, transparent):** Crooked iron fences, headstones, glowing lanterns (`alpha 0.65`).
- **Layer 4 (Ground Turf & Dirt Strip, opaque at y=780):** High-contrast top trim separating sky from solid ground.

1. **Haunted Graveyard:** Indigo starry mist, distant gothic spire peaks, rolling mausoleum hills, crooked iron fences & tombstones.
2. **Dark Forest:** Emerald twilight haze, towering gnarled pine peaks, mossy hollow hills, tangled brambles & firefly bushes.
3. **Vampire Castle:** Burgundy moonlit clouds, towering battlement spires, arched stone viaducts, wall candelabras.
4. **Frozen Tundra:** Borealis slate sky, jagged glacier peaks, wind-carved snowdrifts, frosted pine silhouettes.
5. **Desert Ruins:** Amber dusk haze, sunken pyramids & sphinx silhouettes, sculpted sand dunes, cracked obelisks.
6. **Swamp of Souls:** Sickly emerald-teal fog, cypress silhouettes, bubbling bog banks, glowing marsh reeds.
7. **Volcano Lair:** Crimson ash sky, erupting basalt caldera, glowing lava falls, charred obsidian spires.
8. **Haunted Town:** Storm-blue night clouds, crooked Victorian gables, cobblestone rooftops, warm glowing street lanterns.
9. **Sky Fortress:** Electric indigo storm clouds, floating chained citadel islands, brass lightning rods, storm cloud ledges.
10. **Cursed Underworld:** Royal purple abyssal sky, jagged bone spires, purple soul-fire cauldrons, obsidian demon arches.

---

## 5. World Map & Level Path Art (`1600×900` & `96×96` Nodes)
- **World Map Parchment (`1600×900`):** `public/assets/images/world_map.png` — *Hand-painted gothic fantasy cartography world map seen from angled top-down view showing 10 distinct connected biomes linked by a winding cobblestone road, warm candlelight vignettes, no text or numbers.*
- **Level Node Badges (`96×96`):** Locked Crypt Padlock Stone, Unlocked Crimson Wax Seal, Cleared 3-Star Gold Medallion, Boss Skull Emblem.

---

## 6. UI Buttons, Panels & Gestures (`256×88` / `512×512`)
- **UI Button Plaque Set (Normal / Hover / Pressed / Disabled):** *Hand-painted dark slate & hammered antique gold gothic plaque button with subtle bevel highlight and rivet corners, transparent background, no text.*
- **UI 9-Slice Modal Frame:** *Carved obsidian stone window with wrought-iron corner filigree and warm inner border glow.*
- **In-Game HUD Icon Set (`64×64` each):** Look Around Eye, Sound On/Off Speaker, Restart Arrow, Pause Bars, Skip Fast-Forward Arrow, Book/Codex, Scroll Hint.
- **Tutorial Gesture Hand (`128×128`):** *Stylized cartoon gloved vampire hand pointing/dragging/tapping with glowing gold motion ring, transparent background.*

---

## 7. Loading Video Storyboard, App Icon & Play Store Screenshots
- **Loading Intro Video (`public/assets/video/loading.mp4`):**
  - *Spec:* `1280×720` or `1920×1080`, `24/30 fps`, H.264 MP4, 4–6 seconds seamless loop, `< 4 MB`, silent/muted-friendly.
  - *Video Generation Prompt:* *Hand-painted 2D cartoon gothic animated intro: camera swoops through moonlit cemetery mist over crooked wrought-iron gates toward Count Dracula perched on a glowing stone crossbow pedestal, his crimson cape fluttering in the night wind as bats burst toward a shadowy zombie castle under a huge harvest moon; leave calm dark space at bottom 15% for loading bar, no text.*
- **App Icon (`1024×1024`, Android Adaptive Foreground + Background):**
  - *Prompt:* Bold iconic close-up face-off emblem: cartoon Count Dracula with glowing ruby eyes grinning beside a snarling comical green zombie under a luminous moon framed by gothic iron trim, crisp readability at 48dp, no text.
- **Play Store Feature Graphic (`1024×500`) & Screenshots (`1920×1080` Landscape):**
  1. Slingshot aiming dotted golden arc toward an exploding timber cemetery fortress.
  2. Bat Form splitting mid-air into three purple bats shattering glass panes.
  3. Overlord Baron Boss stage under purple lightning storm.
  4. Vampire Codex & 10-Biome World Map progression screen.
