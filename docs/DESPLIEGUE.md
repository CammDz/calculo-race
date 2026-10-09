# Guía de despliegue paso a paso (Cloudflare Pages + Supabase)

> Para una persona con conocimientos básicos de programación, sin experiencia administrando servidores. No necesitas comprar ni configurar ningún servidor: usamos servicios gestionados con planes gratuitos.

## Parte 1 — Crear el proyecto en Supabase (15 min)

1. Entra a https://supabase.com y crea una cuenta (puedes usar GitHub).
2. Crea un **New project**: nombre `calculo-race`, contraseña de base de datos (guárdala), región más cercana (p. ej. `South America (São Paulo)`).
3. Espera ~2 minutos a que el proyecto esté en verde ("Active").
4. Ve a **SQL Editor → New query**, pega el contenido de `supabase/migrations/001_schema.sql` y pulsa **Run**. Repite si hay errores de partición (las sentencias usan `if not exists`, son seguras de re-ejecutar).
5. En **SQL Editor → New query**, pega `supabase/seed.sql` y pulsa **Run**. Verifica en **Table Editor → questions** que haya 44 filas.
6. Ve a **Project Settings → API** y copia:
   - `Project URL` → será `VITE_SUPABASE_URL`
   - `anon public` key → será `VITE_SUPABASE_ANON_KEY`
7. Ve a **Authentication → Users → Add user → Create new user**: correo y contraseña del profesor. El docente entra luego en `/admin` con esas credenciales.
8. Ve a **Database → Replication** y activa Realtime para las tablas `games`, `teams`, `answers` (interruptor de cada tabla). Sin esto, la clasificación en vivo no se actualiza sola.
9. (Opcional pero recomendado) Instala Supabase CLI y despliega la validación de respuestas en servidor:
   ```bash
   npm install -g supabase
   supabase login
   supabase link --project-ref TU_PROJECT_REF
   supabase functions deploy submit-answer
   ```
   Sin este paso los estudiantes no pueden enviar respuestas: la app llama a la función sin alternativa. **Despliégala antes de jugar con estudiantes reales.**

## Parte 2 — Subir el código a GitHub (10 min)

1. Crea un repositorio vacío en https://github.com/new (p. ej. `calculo-race`), sin README inicial.
2. En tu PC, dentro de la carpeta del proyecto:
   ```bash
   git init
   git add .
   git commit -m "Cálculo Race v1.0"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/calculo-race.git
   git push -u origin main
   ```
3. Comprueba en GitHub que estén los archivos (nunca subas `.env`: ya está en `.gitignore`).

## Parte 3 — Publicar el frontend en Cloudflare Pages (10 min)

1. Entra a https://dash.cloudflare.com → regístrate gratis → **Workers & Pages → Create → Pages → Connect to Git**.
2. Autoriza GitHub y elige el repositorio `calculo-race`.
3. Configuración de compilación:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `/` (raíz)
4. En **Environment variables (Production)** añade:
   - `VITE_SUPABASE_URL` = tu Project URL
   - `VITE_SUPABASE_ANON_KEY` = tu clave `anon` (es pública y segura gracias a RLS; **nunca** pongas aquí la `service_role`).
5. Pulsa **Save and Deploy**. En ~2 minutos tendrás una URL como `https://calculo-race.pages.dev`. **No inventes la URL: usa la que Cloudflare te asigne.**
6. El archivo `public/_redirects` ya incluye la regla SPA (`/* → /index.html 200`) para que las rutas React funcionen al recargar.
7. Cada `git push` a `main` redespliega automáticamente.

## Parte 4 — Probar una partida completa (10 min)

1. Abre `https://TU_SITIO.pages.dev/admin`, inicia sesión, crea una partida (8 equipos) y copia el **código** o muestra el **QR**.
2. Desde celulares (o ventanas de incógnito) abre `/unirse?codigo=XXXXXX`, registra 2+ equipos.
3. Pulsa **Iniciar carrera**, responde preguntas, comprueba que la tabla se mueve en vivo.
4. Pulsa **Siguiente pregunta**, luego **Finalizar** y verifica el podio y la descarga CSV.
5. Si alguna pantalla muestra "Servicio no disponible", revisa que las variables de entorno estén definidas y que el deploy sea posterior a ellas.

## Errores comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| Pantalla "Servicio no disponible" | Faltan variables en Cloudflare o deploy anterior a ellas | Añade `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en Pages → Settings → Environment variables y pulsa Retry deployment |
| La tabla no se actualiza sola | Realtime desactivado | Activa Realtime para `games`, `teams`, `answers` en Database → Replication |
| "No tienes permiso" al crear partida | Sesión expirada o RLS | Cierra sesión y entra de nuevo en `/admin` |
| QR no abre la sala | URL con código distinto | Regenera el QR desde el panel (usa la URL pública de Cloudflare) |
| `npm run build` falla | Node desactualizado | Usa Node 18+ (`node --version`) |
