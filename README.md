# Trainer

Plataforma para personal trainers y sus alumnos. Next.js 16 (App Router) + Supabase (Postgres, Auth, RLS, Storage).

## Levantar en local

```bash
npm install
cp .env.example .env.local   # completar con la URL y la publishable key del proyecto Supabase
npm run dev                  # http://localhost:3000
```

En Supabase → Authentication → URL Configuration: Site URL `http://localhost:3000` y Redirect URL `http://localhost:3000/**`.

## Estructura

| Carpeta | Qué hay |
|---|---|
| `design/screens/` | UI (D1–D8 profesor, E1–E4 alumno). |
| `supabase/migrations/` | Esquema, RLS y RPCs, en orden. |
| `supabase/seed/` | Biblioteca de ejercicios y datos demo (solo desarrollo). |
| `supabase/tests/rls_permissions.sql` | Tests de autorización contra la base (40 casos). |
| `src/app/` | Rutas: `(auth)`, `invite/[token]`, `teacher/*`, `student/*`. |
| `src/lib/auth/` | Sesión, rol (leído de la base) y permisos centralizados. |
| `src/lib/validation/` | Esquemas zod compartidos cliente/servidor. |
| `src/lib/data/` | Acceso a datos (server-only). |
| `src/components/ui/` | Piezas base calcadas del diseño. |

## Seguridad en 3 capas

1. `src/proxy.ts`: sin sesión no se entra a `/teacher` ni `/student`.
2. Layouts y server actions: `requireRole()` con el rol de `profiles.role`.
3. Postgres RLS: cada fila se valida contra `auth.uid()`. Es la que manda.

El rol lo asigna la base al registrarse: con invitación válida → alumno; sin invitación → profesor.

## Datos demo

Usuarios y contraseña de desarrollo documentados en `supabase/seed/02_demo.sql`.
Para regenerar: `99_reset_demo.sql` y luego `01_exercises.sql` + `02_demo.sql`.
