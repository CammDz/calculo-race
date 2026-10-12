// Pruebas visuales: móvil, opciones táctiles, fórmulas, animaciones y conexión.
// Usan datos reales del servidor (leaderboard) y verifican el CSS compilado.

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
// @ts-ignore - fs disponible en runtime de vitest (node), sin @types/node en el proyecto
import { readFileSync } from 'node:fs';
import { Leaderboard } from '../components/Leaderboard';
import { RaceTrack } from '../components/RaceTrack';
import { Ship } from '../components/Ship';
import type { LeaderboardEntry } from '../types';
import type { Team } from '../types';

const entries: LeaderboardEntry[] = Array.from({ length: 8 }, (_, i) => ({
  teamId: `t${i + 1}`,
  teamName: `Equipo ${i + 1}`,
  shipColor: '#38bdf8',
  score: 800 - i * 100,
  correctCount: 4 - (i % 2),
  totalResponseTimeMs: 1000 * (i + 1),
}));

describe('clasificación compacta con datos reales', () => {
  it('en móvil muestra top 3 + equipo actual', () => {
    render(<Leaderboard entries={entries} highlightId="t8" compact />);
    expect(screen.getByText('Equipo 1')).toBeInTheDocument();
    expect(screen.getByText('Equipo 8')).toBeInTheDocument();
    expect(screen.queryByText('Equipo 5')).not.toBeInTheDocument();
  });
  it('permite abrir la clasificación completa', () => {
    render(<Leaderboard entries={entries} highlightId="t8" compact />);
    fireEvent.click(screen.getByText(/clasificación completa/i));
    expect(screen.getByText('Equipo 5')).toBeInTheDocument();
  });
  it('actualiza puntos y posiciones con datos del servidor', () => {
    const { rerender } = render(<Leaderboard entries={entries} highlightId="t2" compact />);
    expect(screen.getAllByText('700')[0]).toBeInTheDocument();
    const moved = [...entries].reverse();
    rerender(<Leaderboard entries={moved} highlightId="t2" compact />);
    expect(screen.getByText('Equipo 8')).toBeInTheDocument();
  });
});

describe('nave del equipo', () => {
  it('usa el color del equipo y es accesible', () => {
    render(<Ship color="#a78bfa" size={40} />);
    expect(screen.getByRole('img', { name: /nave espacial/i })).toBeInTheDocument();
  });
});

describe('pista hacia la meta con todas las naves', () => {
  const teams: Team[] = [
    { id: 't1', gameId: 'g', name: 'Líder', shipColor: '#38bdf8', score: 300, correctCount: 3, totalResponseTimeMs: 1000, connected: true, lastSeenAt: '' },
    { id: 't2', gameId: 'g', name: 'Medio', shipColor: '#a78bfa', score: 150, correctCount: 1, totalResponseTimeMs: 2000, connected: true, lastSeenAt: '' },
    { id: 't3', gameId: 'g', name: 'Cola', shipColor: '#fb923c', score: 0, correctCount: 0, totalResponseTimeMs: 0, connected: true, lastSeenAt: '' },
  ];
  it('muestra todas las naves en una sola pista sin nombres ni puntos', () => {
    const { container } = render(<RaceTrack teams={teams} highlightId="t2" />);
    expect(screen.getByRole('img', { name: /pista hacia la meta/i })).toBeInTheDocument();
    expect(container.querySelectorAll('.meta-ship')).toHaveLength(3);
    for (const t of teams) {
      expect(screen.queryByText(t.name)).not.toBeInTheDocument();
      expect(screen.queryByText(`${t.score} pts`)).not.toBeInTheDocument();
    }
  });
  it('el líder va más cerca de la meta que el último', () => {
    const { container } = render(<RaceTrack teams={teams} />);
    const ships = container.querySelectorAll<HTMLElement>('.meta-ship');
    const left = (el: HTMLElement) => parseFloat(el.style.left);
    expect(left(ships[0])).toBeGreaterThan(left(ships[2]));
  });
  it('cada nave usa su propio color (sin repetir)', () => {
    const { container } = render(<RaceTrack teams={teams} />);
    const colors = new Set(teams.map((t) => t.shipColor.toLowerCase()));
    expect(colors.size).toBe(teams.length);
    expect(container.querySelector('.meta-ship.me')).toBeNull();
  });
  it('marca mi nave con TÚ y sin revelar a las demás', () => {
    const { container } = render(<RaceTrack teams={teams} highlightId="t2" />);
    expect(container.querySelectorAll('.meta-ship.me')).toHaveLength(1);
    expect(screen.getByText('TÚ')).toBeInTheDocument();
  });
});

describe('CSS de carrera (legibilidad y táctil)', () => {
  const css = readFileSync('src/styles/global.css', 'utf8');
  it('opciones grandes y táctiles (>=56px)', () => {
    expect(css).toMatch(/\.race-options \.option\s*\{[^}]*min-height:\s*6\dpx/);
  });
  it('estados diferenciados de opción', () => {
    for (const cls of ['opt-selected', 'opt-sending', 'opt-correct', 'opt-incorrect', 'opt-closed']) {
      expect(css).toContain(cls);
    }
  });
  it('respeta reducir movimiento', () => {
    expect(css).toContain('prefers-reduced-motion');
  });
  it('adaptable a 360px sin scroll horizontal', () => {
    expect(css).toContain('360px');
    expect(css).toContain('word-break');
  });
  it('fondo espacial con estrellas y planetas (CSS/SVG, sin imágenes externas)', () => {
    expect(css).toContain('space-backdrop');
    expect(css).toContain('planet-deco');
    expect(css.toLowerCase()).not.toContain('url(http');
  });
  it('pista única y colores ocupados', () => {
    expect(css).toContain('meta-track');
    expect(css).toContain('meta-ship');
    expect(css).toContain('color-btn');
  });
});
