import Phaser from 'phaser';
import { VAMPIRE_ORDER, VAMPIRE_TYPES, VampireTypeId } from '../data/VampireTypes';
import { ZOMBIE_TYPES, ZombieTypeId } from '../data/ZombieTypes';

function hexCss(num: number): string {
  return `#${num.toString(16).padStart(6, '0')}`;
}

/**
 * Procedural Fallback Renderer:
 * Generates hand-painted cartoon gothic Canvas2D sprites for any asset key
 * not supplied by an external PNG in /public/assets, so the game always renders
 * rich characters, particles, and illustrated map art out of the box.
 */
export class TextureGenerator {
  static generateAll(scene: Phaser.Scene): void {
    this.ensureUtilityParticles(scene);
    for (const vt of VAMPIRE_ORDER) {
      this.ensureVampireTexture(scene, vt);
    }
    const zTypes: ZombieTypeId[] = ['normal', 'armored', 'fat', 'runner', 'shield', 'screamer', 'boss'];
    for (const zt of zTypes) {
      this.ensureZombieTexture(scene, zt);
    }
    this.ensureFxAndMapFallbacks(scene);
  }

  private static ensureUtilityParticles(scene: Phaser.Scene): void {
    if (!scene.textures.exists('particle_dot')) {
      const dot = scene.make.graphics({ x: 0, y: 0 });
      dot.fillStyle(0xffffff, 1);
      dot.fillCircle(8, 8, 7);
      dot.generateTexture('particle_dot', 16, 16);
      dot.destroy();
    }
    if (!scene.textures.exists('particle_shard')) {
      const rect = scene.make.graphics({ x: 0, y: 0 });
      rect.fillStyle(0xffffff, 1);
      rect.fillRect(0, 0, 14, 8);
      rect.generateTexture('particle_shard', 14, 8);
      rect.destroy();
    }
    if (!scene.textures.exists('sky_bat')) {
      const bat = scene.make.graphics({ x: 0, y: 0 });
      bat.fillStyle(0x090b10, 1);
      bat.beginPath();
      bat.moveTo(16, 10);
      bat.lineTo(4, 2);
      bat.lineTo(0, 12);
      bat.lineTo(10, 14);
      bat.lineTo(16, 18);
      bat.lineTo(22, 14);
      bat.lineTo(32, 12);
      bat.lineTo(28, 2);
      bat.closePath();
      bat.fillPath();
      bat.generateTexture('sky_bat', 32, 20);
      bat.destroy();
    }
  }

  private static ensureVampireTexture(scene: Phaser.Scene, type: VampireTypeId): void {
    const key = `vamp_${type}`;
    if (scene.textures.exists(key)) return;

    const size = 96;
    const tex = scene.textures.createCanvas(key, size, size);
    if (!tex) return;
    const ctx = tex.getContext();
    const cx = size / 2;
    const cy = size / 2 + 4;
    const meta = VAMPIRE_TYPES[type];

    // Drop shadow halo
    const aura = ctx.createRadialGradient(cx, cy, 8, cx, cy, 42);
    aura.addColorStop(0, `${meta.colorHex}55`);
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, size, size);

    // Bat wings for Bat Form, Storm Caller, and Thunder Bat
    if (type === 'bat' || type === 'storm' || type === 'thunder') {
      ctx.fillStyle = type === 'thunder' ? '#854d0e' : type === 'storm' ? '#31105c' : '#3b0764';
      ctx.strokeStyle = '#07090e';
      ctx.lineWidth = 2.5;
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + dir * 12, cy);
        ctx.quadraticCurveTo(cx + dir * 38, cy - 28, cx + dir * 44, cy - 10);
        ctx.lineTo(cx + dir * 32, cy + 12);
        ctx.lineTo(cx + dir * 18, cy + 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    // High gothic collar + cape body
    const capeGrad = ctx.createLinearGradient(cx, cy - 30, cx, cy + 32);
    capeGrad.addColorStop(0, hexCss(meta.capeColor));
    capeGrad.addColorStop(1, '#090b10');
    ctx.fillStyle = capeGrad;
    ctx.strokeStyle = '#07090e';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(cx - 26, cy - 8);
    ctx.lineTo(cx - 22, cy - 32);
    ctx.lineTo(cx, cy - 14);
    ctx.lineTo(cx + 22, cy - 32);
    ctx.lineTo(cx + 26, cy - 8);
    ctx.lineTo(cx + 20, cy + 28);
    ctx.lineTo(cx - 20, cy + 28);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Rim-lit head gradient
    const faceGrad = ctx.createRadialGradient(cx - 6, cy - 8, 4, cx, cy, 24);
    faceGrad.addColorStop(0, '#ffffff');
    faceGrad.addColorStop(0.55, hexCss(meta.skinColor));
    faceGrad.addColorStop(1, hexCss(meta.capeColor));
    ctx.fillStyle = faceGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Widow's peak hair + distinctive character silhouette accents
    ctx.fillStyle = hexCss(meta.hairColor);
    ctx.beginPath();
    ctx.arc(cx, cy - 2, 20, Math.PI * 1.04, Math.PI * 1.96);
    ctx.lineTo(cx, cy - 5);
    ctx.closePath();
    ctx.fill();

    // Character-specific accessories
    if (type === 'bomb') {
      // Top fuse & ember spark on Blast Baron
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 20);
      ctx.quadraticCurveTo(cx + 8, cy - 34, cx + 14, cy - 30);
      ctx.stroke();
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(cx + 15, cy - 30, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'mage') {
      // Crimson mage hood gem
      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 18);
      ctx.lineTo(cx + 5, cy - 12);
      ctx.lineTo(cx, cy - 6);
      ctx.lineTo(cx - 5, cy - 12);
      ctx.closePath();
      ctx.fill();
    } else if (type === 'speed') {
      // Swept blue lightning visor band
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(cx - 17, cy - 9, 34, 5);
    }

    // Glowing eyes + stern brows
    ctx.fillStyle = hexCss(meta.eyeColor);
    ctx.shadowColor = hexCss(meta.eyeColor);
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(cx - 7, cy - 1, 3.6, 0, Math.PI * 2);
    ctx.arc(cx + 7, cy - 1, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Fangs & smirk
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy + 6, 8, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy + 7);
    ctx.lineTo(cx - 4.5, cy + 14);
    ctx.lineTo(cx - 2, cy + 7);
    ctx.moveTo(cx + 2, cy + 7);
    ctx.lineTo(cx + 4.5, cy + 14);
    ctx.lineTo(cx + 7, cy + 7);
    ctx.fill();

    tex.refresh();
  }

  private static ensureZombieTexture(scene: Phaser.Scene, type: ZombieTypeId): void {
    const key = `zomb_${type}`;
    if (scene.textures.exists(key)) return;

    const meta = ZOMBIE_TYPES[type];
    const size = type === 'boss' ? 140 : 96;
    const tex = scene.textures.createCanvas(key, size, size);
    if (!tex) return;
    const ctx = tex.getContext();
    const cx = size / 2;
    const cy = size / 2 + 4;
    const r = type === 'boss' ? 42 : type === 'fat' ? 28 : 22;

    // Soft rim shadow
    const grad = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.25, r * 0.15, cx, cy, r);
    grad.addColorStop(0, '#86efac');
    grad.addColorStop(0.5, hexCss(meta.color));
    grad.addColorStop(1, '#142615');

    ctx.fillStyle = grad;
    ctx.strokeStyle = '#0b140c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Tattered clothes collar at bottom
    ctx.fillStyle = type === 'boss' ? '#450a0a' : '#334155';
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.55, r * 0.72, Math.PI, 0);
    ctx.fill();
    ctx.stroke();

    // Glowing blood-thirsty eyes
    const eyeSpread = r * 0.34;
    const eyeY = cy - r * 0.15;
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(cx - eyeSpread, eyeY, r * 0.21, 0, Math.PI * 2);
    ctx.arc(cx + eyeSpread, eyeY, r * 0.17, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(cx - eyeSpread, eyeY, r * 0.1, 0, Math.PI * 2);
    ctx.arc(cx + eyeSpread, eyeY, r * 0.08, 0, Math.PI * 2);
    ctx.fill();

    // Gnarled mouth + crooked teeth + green drool
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(cx - r * 0.36, cy + r * 0.2, r * 0.72, r * 0.25);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(cx - r * 0.22, cy + r * 0.2, r * 0.14, r * 0.13);
    ctx.fillRect(cx + r * 0.08, cy + r * 0.32, r * 0.14, r * 0.13);
    ctx.fillStyle = '#a3e635';
    ctx.fillRect(cx + r * 0.18, cy + r * 0.44, 4, 8);

    // Archetype gear
    if (type === 'armored') {
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(cx, cy - r * 0.14, r * 1.05, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy - r * 1.15);
      ctx.lineTo(cx, cy - r * 1.5);
      ctx.lineTo(cx + 6, cy - r * 1.15);
      ctx.fill();
    } else if (type === 'runner') {
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(cx - r * 0.92, cy - r * 0.56, r * 1.84, r * 0.24);
    } else if (type === 'shield') {
      ctx.fillStyle = '#475569';
      ctx.fillRect(cx - r * 1.24, cy - r * 0.85, r * 0.42, r * 1.7);
      ctx.strokeRect(cx - r * 1.24, cy - r * 0.85, r * 0.42, r * 1.7);
    } else if (type === 'screamer') {
      // Wispy banshee hair & wide screaming mouth ring
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy + r * 0.28, r * 0.3, 0, Math.PI * 2);
      ctx.stroke();
    } else if (type === 'boss') {
      // Golden spiked crown
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.65, cy - r * 0.72);
      ctx.lineTo(cx - r * 0.5, cy - r * 1.3);
      ctx.lineTo(cx - r * 0.18, cy - r * 0.92);
      ctx.lineTo(cx, cy - r * 1.42);
      ctx.lineTo(cx + r * 0.18, cy - r * 0.92);
      ctx.lineTo(cx + r * 0.5, cy - r * 1.3);
      ctx.lineTo(cx + r * 0.65, cy - r * 0.72);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(cx, cy - r * 0.96, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    tex.refresh();
  }

  private static ensureFxAndMapFallbacks(scene: Phaser.Scene): void {
    if (!scene.textures.exists('fx_smoke')) {
      const tex = scene.textures.createCanvas('fx_smoke', 96, 96);
      if (tex) {
        const ctx = tex.getContext();
        const puffs = [
          { x: 48, y: 48, r: 30, a: 0.75 },
          { x: 34, y: 54, r: 22, a: 0.65 },
          { x: 62, y: 52, r: 22, a: 0.65 },
          { x: 48, y: 34, r: 20, a: 0.55 },
        ];
        for (const p of puffs) {
          const g = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, p.r);
          g.addColorStop(0, `rgba(17, 20, 28, ${p.a})`);
          g.addColorStop(1, 'rgba(17, 20, 28, 0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
        tex.refresh();
      }
    }

    if (!scene.textures.exists('fx_blood_drop')) {
      const tex = scene.textures.createCanvas('fx_blood_drop', 64, 64);
      if (tex) {
        const ctx = tex.getContext();
        const g = ctx.createRadialGradient(28, 36, 4, 32, 36, 22);
        g.addColorStop(0, '#fca5a5');
        g.addColorStop(0.45, '#dc2626');
        g.addColorStop(1, '#450a0a');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(32, 8);
        ctx.bezierCurveTo(48, 28, 52, 42, 32, 56);
        ctx.bezierCurveTo(12, 42, 16, 28, 32, 8);
        ctx.fill();
        tex.refresh();
      }
    }

    if (!scene.textures.exists('world_map_bg')) {
      const tex = scene.textures.createCanvas('world_map_bg', 1600, 900);
      if (tex) {
        const ctx = tex.getContext();
        const grad = ctx.createLinearGradient(0, 0, 1600, 900);
        grad.addColorStop(0, '#0c1222');
        grad.addColorStop(0.5, '#171326');
        grad.addColorStop(1, '#1c0f1d');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1600, 900);

        // Illustrated gothic parchment landmass & mountain silhouettes
        ctx.fillStyle = 'rgba(255,245,215,0.04)';
        for (let i = 0; i < 6; i++) {
          ctx.beginPath();
          ctx.ellipse(260 + i * 240, 440 + (i % 2 === 0 ? -90 : 80), 210, 160, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = 'rgba(251,191,36,0.12)';
        ctx.lineWidth = 4;
        ctx.strokeRect(24, 24, 1552, 852);
        tex.refresh();
      }
    }
  }
}
