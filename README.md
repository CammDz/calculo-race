# Cálculo Race — Resuelve, avanza y conquista la carrera

Carrera matemática multijugador (6–10 equipos) para clases de cálculo multivariable: límites, coordenadas polares, regla de L'Hôpital y un problema final. Cada equipo pilota una nave desde su celular; las respuestas correctas la hacen avanzar. Partida de **15:00 exactos** con cronómetro de servidor, puntuación validada en backend y clasificación en tiempo real.

## Tecnologías

- **Frontend:** React 18 + TypeScript + Vite 5, React Router, CSS moderno responsive (360 px sin scroll horizontal).
- **Iconos:** lucide-react. **QR:** qrcode.react. **Gráficas polares:** componente SVG propio (alternativa ligera a Plotly.js, documentada en `src/components/PolarPlot.tsx`: Plotly pesa ~3 MB y penaliza celulares de gama baja).
- **Backend:** Supabase (PostgreSQL + Auth + Realtime) y Edge Function `submit-answer` (Deno) para validar respuestas y puntuar en servidor.
- **Pruebas:** Vitest + React Testing Library (27 pruebas).

## Requisitos

- Node.js 18+ y npm.
- Cuenta gratuita de Supabase y Cloudflare (solo para producción).

## Ejecución local

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # compila a dist/
npm run preview  # sirve dist/ localmente
npm test         # ejecuta las 27 pruebas (vitest run)
```

Configura `.env` a partir de `.env.example` con las credenciales de tu proyecto Supabase (obligatorias).

## Supabase: crear proyecto, migraciones y profesor

1. Crea el proyecto en https://supabase.com (ver guía detallada en `docs/DESPLIEGUE.md`).
2. Ejecuta en **SQL Editor**: `supabase/migrations/001_schema.sql` y luego `supabase/seed.sql` (44 preguntas verificadas).
3. Activa **Realtime** para `games`, `teams`, `answers` (Database → Replication).
4. Crea el profesor en **Authentication → Users → Add user**. Inicia sesión en `/admin`.
5. Despliega la función de puntuación segura (requiere Supabase CLI):
   ```bash
   supabase link --project-ref TU_REF
   supabase functions deploy submit-answer
   ```

## Variables de entorno

Copia `.env.example` a `.env`:

| Variable | Dónde obtenerla | Uso |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API | Cliente web (pública, protegida por RLS) |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API | Cliente web (pública, protegida por RLS) |

La `service_role` **solo** vive como secreto del servidor (`supabase secrets set ...`), jamás en el frontend ni en Cloudflare Pages. Sin variables configuradas, la app muestra un mensaje de "Servicio no disponible" sin exponer secretos.

## Estructura

```
src/
  components/  # Layout, Ship (SVG propio), Hud, PolarPlot, RoomQr, Leaderboard
  pages/       # Home, Join, Waiting, Race, Podium, Teacher*, QuestionsAdmin
  hooks/       # useLiveGame (realtime), useTeacherAuth
  lib/         # gameLogic (reglas puras), supabase, utils
  data/        # questions.ts (banco verificado)
  services/    # gameService (API Supabase + Edge Function)
  tests/       # gameLogic, simulation (8 equipos), ui
supabase/
  migrations/001_schema.sql  # esquema + RLS + vista pública sin respuestas
  functions/submit-answer/   # validación y puntuación en servidor
  seed.sql                   # 44 preguntas (generado desde src/data)
public/  docs/
```

## Reglas clave implementadas

- **Cronómetro:** `elapsed = elapsedSecBase + (ahoraServidor − serverStartedAt)`; la **pausa** congela `elapsedSec` y pone `serverStartedAt = null` (el tiempo pausado no consume los 15:00); recargas y reconexiones recuperan desde la BD; la Edge Function rechaza respuestas fuera de ventana.
- **Puntos:** 100/150/200/300 por nivel (configurables) + bonus de rapidez hasta 20 pts; 0 por error o silencio; una respuesta por equipo/pregunta (idempotente); desempate por correctas y luego tiempo acumulado.
- **Seguridad:** RLS en todas las tablas, vista `public_questions` sin `correct_option_id`, respuestas correctas jamás expuestas al cliente, códigos de 6 caracteres, CSV solo con datos de la propia sala.

## Despliegue

Guía paso a paso para principiantes en `docs/DESPLIEGUE.md`. Resumen: Cloudflare Pages con comando `npm run build`, salida `dist`, variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`; cada `git push` redespliega.
