// Nave espacial en SVG propio (sin imágenes remotas).
export function Ship({ color, size = 40 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Nave espacial del equipo">
      <ellipse cx="32" cy="52" rx="14" ry="4" fill={color} opacity="0.35" />
      <path d="M32 4 C44 16 46 34 32 50 C18 34 20 16 32 4 Z" fill={color} stroke="#0a1030" strokeWidth="2" />
      <ellipse cx="32" cy="26" rx="7" ry="9" fill="#0a1030" opacity="0.85" />
      <ellipse cx="32" cy="26" rx="4.5" ry="6" fill="#dff3ff" opacity="0.9" />
      <path d="M20 36 L12 46 L20 44 Z" fill="#fb923c" />
      <path d="M44 36 L52 46 L44 44 Z" fill="#fb923c" />
      <path d="M28 50 L32 58 L36 50 Z" fill="#facc15" />
    </svg>
  );
}

export function Planet({ size = 90 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Planeta decorativo">
      <circle cx="50" cy="50" r="30" fill="#1b2763" stroke="#38bdf8" strokeWidth="2" />
      <path d="M24 44 Q50 30 78 46" stroke="#a78bfa" strokeWidth="3" fill="none" opacity="0.9" />
      <path d="M22 58 Q50 74 80 56" stroke="#e8b09f" strokeWidth="3" fill="none" opacity="0.9" />
      <ellipse cx="50" cy="50" rx="46" ry="12" fill="none" stroke="#fb923c" strokeWidth="2" opacity="0.7" transform="rotate(-18 50 50)" />
    </svg>
  );
}
