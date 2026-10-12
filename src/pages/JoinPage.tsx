import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { validateRoomCode, validateTeamName, normalizeRoomCode, isColorTaken, firstFreeColor } from '../lib/gameLogic';
import { getGameByCode, joinTeam, listTeams } from '../services/gameService';
import { getSupabase } from '../lib/supabase';
import { SHIP_COLORS } from '../types';
import { saveTeam } from '../lib/utils';
import { Ship } from '../components/Ship';

export function JoinPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [code, setCode] = useState(params.get('codigo') ?? '');
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(SHIP_COLORS[1]);
  const [takenColors, setTakenColors] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const codeError = useMemo(() => (code.trim() ? validateRoomCode(code) : null), [code]);

  // Colores en uso en la sala (en vivo): no se pueden repetir para que cada
  // nave se distinga en la pista. Si el elegido se ocupa, se salta al libre.
  useEffect(() => {
    const c = normalizeRoomCode(code);
    if (c.length !== 6 || validateRoomCode(code)) { setTakenColors([]); return; }
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    (async () => {
      try {
        const game = await getGameByCode(c);
        if (!game || cancelled) return;
        const teams = await listTeams(game.id);
        if (cancelled) return;
        const taken = teams.map((t) => t.shipColor);
        setTakenColors(taken);
        setColor((prev) => (isColorTaken(prev, taken) ? (firstFreeColor(SHIP_COLORS, taken) ?? prev) : prev));
        const sb = getSupabase();
        if (sb) {
          const ch = sb.channel(`join-colors-${game.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'teams', filter: `game_id=eq.${game.id}` }, async () => {
              try {
                const fresh = await listTeams(game.id);
                if (cancelled) return;
                const tk = fresh.map((t) => t.shipColor);
                setTakenColors(tk);
                setColor((prev) => (isColorTaken(prev, tk) ? (firstFreeColor(SHIP_COLORS, tk) ?? prev) : prev));
              } catch { /* el envío validará de nuevo */ }
            })
            .subscribe();
          cleanup = () => { sb.removeChannel(ch); };
        }
      } catch { /* sala aún no localizable: el envío mostrará el error */ }
    })();
    return () => { cancelled = true; cleanup?.(); };
  }, [code]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cErr = validateRoomCode(code);
    if (cErr) { setError(cErr); return; }
    const nErr = validateTeamName(name);
    if (nErr) { setError(nErr); return; }
    if (isColorTaken(color, takenColors)) { setError('Ese color de nave ya está en uso por otro equipo. Elige otro color.'); return; }
    setBusy(true);
    try {
      const game = await getGameByCode(normalizeRoomCode(code));
      if (!game) { setError('Sala no encontrada. Revisa el código o pide el QR al profesor.'); return; }
      if (game.status === 'finished') { setError('Esta partida ya terminó.'); return; }
      const team = await joinTeam(game.id, name, color);
      saveTeam({ teamId: team.id, gameId: game.id, code: game.code, name: team.name, shipColor: team.shipColor });
      navigate(`/sala/${game.id}`, { state: { teamId: team.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo ingresar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid">
      <section className="card">
        <h2>Ingresar a la sala</h2>
        <p>Escribe el código de 6 caracteres, nombra tu equipo y elige el color de tu nave.</p>
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="code">Código de partida</label>
            <input id="code" className="input code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={7} inputMode="text" autoComplete="off" placeholder="ABC123" />
            {codeError && <span className="hint">{codeError}</span>}
          </div>
          <div className="field">
            <label htmlFor="team">Nombre del equipo</label>
            <input id="team" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} placeholder="p. ej. Integrales Veloces" autoComplete="off" />
          </div>
          <div className="field">
            <label>Color de la nave</label>
            <div className="color-grid" role="radiogroup" aria-label="Color de nave">
              {SHIP_COLORS.map((c) => {
                const taken = isColorTaken(c, takenColors);
                return (
                  <button
                    type="button"
                    key={c}
                    className={`color-btn ${taken ? 'taken' : ''}`}
                    style={{ background: taken ? undefined : c }}
                    aria-pressed={color === c}
                    aria-label={taken ? `Nave ${c} en uso por otro equipo` : `Nave ${c}`}
                    title={taken ? 'En uso por otro equipo' : `Nave ${c}`}
                    disabled={taken}
                    onClick={() => setColor(c)}
                  >
                    {taken ? <span aria-hidden="true">✕</span> : null}
                  </button>
                );
              })}
            </div>
            {takenColors.length >= SHIP_COLORS.length && (
              <span className="hint">Todos los colores están en uso en esta sala.</span>
            )}
            <div className="row mt"><Ship color={color} size={44} /><span className="hint">Vista previa de tu nave</span></div>
          </div>
          {error && <div className="error" role="alert">{error}</div>}
          <button className="btn mt" disabled={busy} type="submit">{busy ? 'Ingresando…' : 'Unirme a la carrera'}</button>
        </form>
      </section>
    </div>
  );
}
