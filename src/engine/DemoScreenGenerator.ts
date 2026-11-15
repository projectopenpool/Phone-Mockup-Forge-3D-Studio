// Generates crisp, high-resolution procedural mobile app UI screenshots on an offscreen HTML5 Canvas
// Used as default screen textures before the user uploads custom screenshots, or as sample screenshots.

const screenCache = new Map<string, HTMLCanvasElement>();

export function getDemoScreenCanvas(variant: number, width = 720, height = 1560): HTMLCanvasElement {
  const key = `${variant % 10}_${width}x${height}`;
  const cached = screenCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const v = ((variant % 10) + 10) % 10;
  const s = width / 360; // scale factor relative to 360x780 logical points

  ctx.save();
  ctx.scale(s, s);
  const W = 360;
  const H = height / s;

  // Themes per variant
  const themes = [
    { bg: '#0A0E17', card: '#131B2E', accent: '#6366F1', accent2: '#22D3EE', text: '#F8FAFC', muted: '#94A3B8', title: 'PulsePay Pro', sub: 'Net Worth · $148,920.40' },
    { bg: '#090D16', card: '#141C2B', accent: '#10B981', accent2: '#34D399', text: '#F8FAFC', muted: '#94A3B8', title: 'Kinetix Run', sub: 'VO2 Max · 58.4 ml/kg' },
    { bg: '#FAF8F5', card: '#FFFFFF', accent: '#0F172A', accent2: '#F97316', text: '#0F172A', muted: '#64748B', title: 'Chronos Tasks', sub: 'Today · 6 Deep Work Blocks' },
    { bg: '#110C1D', card: '#1C1430', accent: '#A855F7', accent2: '#EC4899', text: '#FAF5FF', muted: '#C084FC', title: 'SonicWave Spatial', sub: 'Lossless 24-bit / 192kHz' },
    { bg: '#0C131F', card: '#162032', accent: '#38BDF8', accent2: '#818CF8', text: '#F0F9FF', muted: '#7DD3FC', title: 'AeroFlight Live', sub: 'SFO → HND · Gate G9' },
    { bg: '#F4F6F9', card: '#FFFFFF', accent: '#2563EB', accent2: '#06B6D4', text: '#0F172A', muted: '#64748B', title: 'CloudOps Metric', sub: '99.998% Uptime · 14ms' },
    { bg: '#0D1117', card: '#161B22', accent: '#F59E0B', accent2: '#EF4444', text: '#F9FAFB', muted: '#9CA3AF', title: 'Lumen RAW Studio', sub: 'ISO 100 · 35mm f/1.4' },
    { bg: '#FDFBF7', card: '#F4EFE6', accent: '#059669', accent2: '#D97706', text: '#1C1917', muted: '#78716C', title: 'Verdant Kitchen', sub: 'Macro Balance · 2,150 kcal' },
    { bg: '#090A0F', card: '#121521', accent: '#8B5CF6', accent2: '#14B8A6', text: '#F3F4F6', muted: '#9CA3AF', title: 'VaultX DeFi', sub: '24h Yield +12.4% APY' },
    { bg: '#0F172A', card: '#1E293B', accent: '#F43F5E', accent2: '#FB923C', text: '#F8FAFC', muted: '#94A3B8', title: 'Domus SmartHome', sub: '8 Rooms Active · 21.5°C' },
  ];

  const t = themes[v];

  // Background fill
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle top glow
  const grad = ctx.createRadialGradient(W * 0.7, 80, 10, W * 0.5, 120, 260);
  grad.addColorStop(0, t.accent + '44');
  grad.addColorStop(1, t.bg + '00');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 360);

  // Status bar
  ctx.fillStyle = t.text;
  ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('9:41', 26, 30);

  // Signal / Wifi / Battery icons
  ctx.fillRect(W - 68, 22, 3, 8);
  ctx.fillRect(W - 63, 20, 3, 10);
  ctx.fillRect(W - 58, 18, 3, 12);
  ctx.strokeStyle = t.text;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(W - 44, 19, 20, 11);
  ctx.fillRect(W - 42, 21, 14, 7);

  // Header Area
  ctx.fillStyle = t.muted;
  ctx.font = '500 11px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(t.title.toUpperCase(), 24, 72);

  ctx.fillStyle = t.text;
  ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(t.sub, 24, 100);

  // Avatar circle on top right
  ctx.fillStyle = t.accent;
  ctx.beginPath();
  ctx.arc(W - 38, 84, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 12px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('AK', W - 38, 88);
  ctx.textAlign = 'left';

  // Primary Hero Card
  roundRect(ctx, 20, 122, W - 40, 178, 20);
  const cardGrad = ctx.createLinearGradient(20, 122, W - 20, 300);
  cardGrad.addColorStop(0, t.card);
  cardGrad.addColorStop(1, t.accent + '28');
  ctx.fillStyle = cardGrad;
  ctx.fill();
  ctx.strokeStyle = t.accent + '40';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Chart inside Hero Card
  ctx.fillStyle = t.muted;
  ctx.font = '500 11px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('LIVE PERFORMANCE INDEX', 38, 150);

  ctx.fillStyle = t.accent2;
  ctx.font = '700 13px "JetBrains Mono", monospace';
  ctx.fillText('+28.4%', W - 92, 150);

  // Smooth Bézier sparkline
  ctx.beginPath();
  const pts = [
    [38, 250],
    [85, 225],
    [130, 238],
    [175, 192],
    [225, 205],
    [275, 168],
    [W - 38, 156],
  ];
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const xc = (pts[i - 1][0] + pts[i][0]) / 2;
    const yc = (pts[i - 1][1] + pts[i][1]) / 2;
    ctx.quadraticCurveTo(pts[i - 1][0], pts[i - 1][1], xc, yc);
  }
  ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
  ctx.strokeStyle = t.accent;
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // Area fill under sparkline
  ctx.lineTo(W - 38, 280);
  ctx.lineTo(38, 280);
  ctx.closePath();
  const areaGrad = ctx.createLinearGradient(0, 155, 0, 280);
  areaGrad.addColorStop(0, t.accent + '55');
  areaGrad.addColorStop(1, t.accent + '00');
  ctx.fillStyle = areaGrad;
  ctx.fill();

  // Two Metric Bento Boxes
  const boxW = (W - 52) / 2;
  for (let col = 0; col < 2; col++) {
    const bx = 20 + col * (boxW + 12);
    roundRect(ctx, bx, 316, boxW, 108, 18);
    ctx.fillStyle = t.card;
    ctx.fill();

    ctx.fillStyle = col === 0 ? t.accent : t.accent2;
    ctx.beginPath();
    ctx.arc(bx + 26, 344, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = t.muted;
    ctx.font = '500 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(col === 0 ? 'Velocity Score' : 'Active Streak', bx + 18, 378);

    ctx.fillStyle = t.text;
    ctx.font = '700 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(col === 0 ? '98.4%' : '42 Days', bx + 18, 405);
  }

  // Activity List Rows
  ctx.fillStyle = t.text;
  ctx.font = '700 15px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Recent Activity', 24, 456);

  const rowLabels = [
    ['Automated Portfolio Rebalance', '+$2,410.00', t.accent],
    ['Cloud GPU Cluster Sync', '1.2 ms', t.accent2],
    ['Encrypted Backup Verified', '100% OK', '#10B981'],
    ['Weekly Milestone Reached', 'Level 14', '#F59E0B'],
  ];

  rowLabels.forEach((row, idx) => {
    const ry = 472 + idx * 62;
    roundRect(ctx, 20, ry, W - 40, 52, 14);
    ctx.fillStyle = t.card;
    ctx.fill();

    ctx.fillStyle = String(row[2]);
    ctx.beginPath();
    ctx.arc(44, ry + 26, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = t.text;
    ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(String(row[0]), 66, ry + 24);

    ctx.fillStyle = t.muted;
    ctx.font = '400 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Synced automatically · Just now', 66, ry + 40);

    ctx.fillStyle = t.text;
    ctx.font = '700 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(String(row[1]), W - 34, ry + 30);
    ctx.textAlign = 'left';
  });

  // Bottom Navigation Pill
  roundRect(ctx, 36, H - 64, W - 72, 44, 22);
  ctx.fillStyle = t.card;
  ctx.fill();
  ctx.strokeStyle = t.accent + '44';
  ctx.stroke();

  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i === 0 ? t.accent : t.muted;
    ctx.beginPath();
    ctx.arc(82 + i * 65, H - 42, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Home indicator bar
  roundRect(ctx, W / 2 - 55, H - 12, 110, 4, 2);
  ctx.fillStyle = t.muted;
  ctx.fill();

  ctx.restore();
  screenCache.set(key, canvas);
  return canvas;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
