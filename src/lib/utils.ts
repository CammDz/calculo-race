// Utilidades: CSV, QR-join URL, almacenamiento local, debounce.

export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = String(v ?? '');
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n');
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]): void {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function joinUrlWithCode(code: string): string {
  const base = `${window.location.origin}/unirse`;
  return `${base}?codigo=${encodeURIComponent(code)}`;
}

const TEAM_KEY = 'calculo-race-team';

export interface SavedTeam {
  teamId: string;
  gameId: string;
  code: string;
  name: string;
  shipColor: string;
}

export function saveTeam(t: SavedTeam): void {
  try {
    localStorage.setItem(TEAM_KEY, JSON.stringify(t));
  } catch {
    /* almacenamiento no disponible */
  }
}

export function loadTeam(): SavedTeam | null {
  try {
    const raw = localStorage.getItem(TEAM_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedTeam;
  } catch {
    return null;
  }
}

export function clearTeam(): void {
  try {
    localStorage.removeItem(TEAM_KEY);
  } catch {
    /* noop */
  }
}
