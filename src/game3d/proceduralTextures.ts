import * as THREE from 'three';

/**
 * Procedural texture generator for AAA road asphalt, curbs, building facades,
 * water surfaces, tunnel linings, highway signage and weather particles.
 */
export class ProceduralTextures {
  private static asphaltTexture: THREE.CanvasTexture | null = null;
  private static waterTexture: THREE.CanvasTexture | null = null;
  private static concreteTexture: THREE.CanvasTexture | null = null;
  private static smokeTexture: THREE.CanvasTexture | null = null;

  public static getAsphaltTexture(): THREE.CanvasTexture {
    if (this.asphaltTexture) return this.asphaltTexture;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Base dark grey asphalt
    ctx.fillStyle = '#1e2126';
    ctx.fillRect(0, 0, size, size);

    // Fine aggregate gravel grain
    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 32;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    // Subtle dark tar seal streaks & tyre wear lines
    ctx.strokeStyle = 'rgba(12, 14, 18, 0.35)';
    ctx.lineWidth = 5;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      const y = Math.random() * size;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(size * 0.3, y + Math.random() * 24 - 12, size * 0.7, y + Math.random() * 24 - 12, size, y);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 50);
    this.asphaltTexture = tex;
    return tex;
  }

  public static getWaterTexture(): THREE.CanvasTexture {
    if (this.waterTexture) return this.waterTexture;

    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Deep turquoise water base
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, 0, size, size);

    // Wave ripples
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 18; i++) {
      ctx.beginPath();
      const y = (i / 18) * size;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(size * 0.25, y + 8, size * 0.75, y - 8, size, y);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 8);
    this.waterTexture = tex;
    return tex;
  }

  public static getConcreteTexture(): THREE.CanvasTexture {
    if (this.concreteTexture) return this.concreteTexture;

    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(0, 0, size, size);

    // Concrete speckles
    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 40;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    this.concreteTexture = tex;
    return tex;
  }

  public static getSmokeParticleTexture(): THREE.CanvasTexture {
    if (this.smokeTexture) return this.smokeTexture;

    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(40, 40, 45, 0.9)');
    grad.addColorStop(0.4, 'rgba(60, 60, 65, 0.5)');
    grad.addColorStop(0.8, 'rgba(80, 80, 85, 0.15)');
    grad.addColorStop(1, 'rgba(100, 100, 105, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const tex = new THREE.CanvasTexture(canvas);
    this.smokeTexture = tex;
    return tex;
  }

  public static getHighwaySignTexture(title: string, subtitle: string, arrowDir: 'left' | 'right' | 'straight' = 'right'): THREE.CanvasTexture {
    const w = 512;
    const h = 256;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    // Green highway sign background
    ctx.fillStyle = '#15803d'; // Forest Highway Green
    ctx.fillRect(0, 0, w, h);

    // White reflective border
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 14;
    ctx.strokeRect(10, 10, w - 20, h - 20);

    // Inner subtle border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 3;
    ctx.strokeRect(22, 22, w - 44, h - 44);

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText(title, 40, 95);

    ctx.font = '600 32px sans-serif';
    ctx.fillStyle = '#fef08a'; // Yellow accent text
    ctx.fillText(subtitle, 40, 160);

    // Arrow
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px sans-serif';
    const arrowSymbol = arrowDir === 'left' ? '⬅' : (arrowDir === 'straight' ? '⬆' : '➡');
    ctx.fillText(arrowSymbol, w - 100, 135);

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  public static getBuildingTexture(seed: number = 0): THREE.CanvasTexture {
    const w = 256;
    const h = 512;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    const baseHues = ['#1f242d', '#2b303c', '#181b22', '#262930'];
    ctx.fillStyle = baseHues[seed % baseHues.length];
    ctx.fillRect(0, 0, w, h);

    const cols = 8;
    const rows = 18;
    const winW = 18;
    const winH = 16;
    const padX = (w - cols * winW) / (cols + 1);
    const padY = (h - rows * winH) / (rows + 1);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = padX + c * (winW + padX);
        const y = padY + r * (winH + padY);

        const isLit = Math.random() > 0.45;
        if (isLit) {
          const warm = Math.random() > 0.3;
          ctx.fillStyle = warm ? 'rgba(255, 225, 150, 0.85)' : 'rgba(180, 220, 255, 0.85)';
        } else {
          ctx.fillStyle = 'rgba(25, 35, 45, 0.9)';
        }
        ctx.fillRect(x, y, winW, winH);

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, winW, winH);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }
}
