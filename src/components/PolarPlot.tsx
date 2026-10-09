// Gráfica polar ligera en SVG (alternativa a Plotly.js, optimizada para móviles).
// Decisión documentada: Plotly (~3 MB) penaliza celulares de gama baja; este
// componente dibuja cardioides/círculos/rosas/espirales con <100 líneas.

import { useMemo } from 'react';

export function PolarPlot({ kind, label }: { kind: 'circle' | 'cardioid' | 'rose' | 'spiral' | 'line'; label: string }) {
  const path = useMemo(() => buildPath(kind), [kind]);
  return (
    <figure style={{ margin: '12px 0 0' }}>
      <svg viewBox="0 0 200 200" width="100%" height="auto" role="img" aria-label={label} style={{ maxWidth: 320, display: 'block', margin: '0 auto', background: 'rgba(6,10,40,.6)', borderRadius: 14, border: '1px solid rgba(148,163,255,.3)' }}>
        {/* ejes */}
        <line x1="10" y1="100" x2="190" y2="100" stroke="#3b4a8f" strokeWidth="1" />
        <line x1="100" y1="10" x2="100" y2="190" stroke="#3b4a8f" strokeWidth="1" />
        <circle cx="100" cy="100" r="70" fill="none" stroke="#3b4a8f" strokeWidth="1" strokeDasharray="4 4" />
        <circle cx="100" cy="100" r="40" fill="none" stroke="#3b4a8f" strokeWidth="1" strokeDasharray="4 4" />
        <path d={path} fill="none" stroke="#e8b09f" strokeWidth="2.5" strokeLinejoin="round" />
        <circle cx="100" cy="100" r="3" fill="#38bdf8" />
        <text x="104" y="30" fill="#a9b4d8" fontSize="9">θ=π/2</text>
        <text x="162" y="104" fill="#a9b4d8" fontSize="9">θ=0</text>
      </svg>
      <figcaption className="hint center">{label} · gráfica ilustrativa</figcaption>
    </figure>
  );
}

function polarToXY(r: number, theta: number, scale: number): [number, number] {
  return [100 + r * scale * Math.cos(theta), 100 - r * scale * Math.sin(theta)];
}

function buildPath(kind: string): string {
  const pts: string[] = [];
  const push = (r: number, th: number, scale: number) => {
    const [x, y] = polarToXY(r, th, scale);
    pts.push(`${pts.length === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
  };
  if (kind === 'circle') {
    for (let i = 0; i <= 120; i++) { const th = (i / 120) * Math.PI * 2; push(4, th, 16); }
  } else if (kind === 'cardioid') {
    for (let i = 0; i <= 160; i++) { const th = (i / 160) * Math.PI * 2; push(2 + 2 * Math.cos(th), th, 15); }
  } else if (kind === 'rose') {
    for (let i = 0; i <= 240; i++) { const th = (i / 240) * Math.PI * 2; push(3 * Math.sin(2 * th), th, 20); }
  } else if (kind === 'spiral') {
    for (let i = 0; i <= 160; i++) { const th = (i / 160) * Math.PI * 4; const r = th; push(r, th, 5); }
  } else {
    for (let i = 0; i <= 60; i++) { const th = (i / 60) * Math.PI; push(5 * Math.cos(th), th, 12); }
  }
  return pts.join(' ') + ' Z';
}
