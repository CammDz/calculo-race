import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminListQuestions } from '../services/gameService';
import type { Question } from '../types';

export function QuestionsAdminPage() {
  const [qs, setQs] = useState<Question[]>([]);
  const [filter, setFilter] = useState<string>('todos');
  const [query, setQuery] = useState('');

  useEffect(() => {
    adminListQuestions().then(setQs).catch(() => undefined);
  }, []);

  const visible = qs.filter((q) => {
    if (filter !== 'todos' && String(q.level) !== filter) return false;
    if (query && !`${q.statement} ${q.topic}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="grid">
      <section className="card">
        <div className="row space-between">
          <h2>Banco de preguntas ({visible.length})</h2>
          <Link className="btn ghost small" to="/admin/panel">Volver</Link>
        </div>
        <p>40+ preguntas verificadas con 4 opciones, respuesta única, explicación y dificultad. En producción se editan en Supabase con RLS de profesor.</p>
        <div className="row">
          <select className="select" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filtrar por nivel" style={{ maxWidth: 220 }}>
            <option value="todos">Todos los niveles</option>
            <option value="1">Nivel 1 · Despegue</option>
            <option value="2">Nivel 2 · Polares</option>
            <option value="3">Nivel 3 · L&apos;Hôpital</option>
            <option value="4">Nivel 4 · Final</option>
          </select>
          <input className="input" placeholder="Buscar por tema o enunciado…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ maxWidth: 320 }} />
        </div>
        <div className="grid mt">
          {visible.map((q) => (
            <article key={q.id} className="card">
              <span className="badge blue">N{q.level} · {q.topic} · {q.difficulty}</span>
              <p className="question-text mt">{q.statement}</p>
              <ul style={{ margin: '8px 0', paddingLeft: 18 }}>
                {q.options.map((o) => (
                  <li key={o.id} style={{ color: o.id === q.correctOptionId ? 'var(--green)' : 'var(--muted)' }}>{o.id}. {o.text}</li>
                ))}
              </ul>
              <p className="hint">Explicación: {q.explanation}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
