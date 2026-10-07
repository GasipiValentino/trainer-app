-- =============================================================================
-- 0001 · Esquema base
-- Modelo: profesor → alumno (vía teacher_students, preparado para N profesores)
-- Todos los datos de entrenamiento cuelgan de student_profiles.id, no del
-- usuario de auth, para que el profesor pueda cargar un alumno antes de que
-- este acepte la invitación.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- utilidades
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ------------------------------------------------------------------ usuarios
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        text not null check (role in ('teacher', 'student')),
  first_name  text not null default '',
  last_name   text not null default '',
  email       text not null,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.teacher_profiles (
  user_id         uuid primary key references public.profiles (id) on delete cascade,
  bio             text,
  phone           text,
  specialization  text,
  onboarding_done boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger teacher_profiles_updated_at before update on public.teacher_profiles
  for each row execute function public.set_updated_at();

-- user_id es NULL mientras el alumno no aceptó la invitación.
create table public.student_profiles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid unique references public.profiles (id) on delete set null,
  first_name      text not null check (length(trim(first_name)) > 0),
  last_name       text not null default '',
  email           text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  birth_date      date check (birth_date > '1900-01-01'),  -- 'no futura' se valida en la app (CHECK debe ser inmutable)
  phone           text,
  height_cm       numeric(5,1) check (height_cm > 0 and height_cm < 300),
  initial_weight  numeric(5,1) check (initial_weight > 0 and initial_weight < 500),
  goal            text,
  level           text check (level in ('principiante', 'intermedio', 'avanzado')),
  notes           text,
  status          text not null default 'pending' check (status in ('pending', 'active', 'archived')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger student_profiles_updated_at before update on public.student_profiles
  for each row execute function public.set_updated_at();

-- Relación profesor ↔ alumno. Hoy: un profesor principal activo por alumno.
create table public.teacher_students (
  teacher_id  uuid not null references public.profiles (id) on delete cascade,
  student_id  uuid not null references public.student_profiles (id) on delete cascade,
  is_primary  boolean not null default true,
  status      text not null default 'active' check (status in ('active', 'ended')),
  created_at  timestamptz not null default now(),
  ended_at    timestamptz,
  primary key (teacher_id, student_id)
);
create unique index teacher_students_one_primary
  on public.teacher_students (student_id) where is_primary and status = 'active';
create index teacher_students_student on public.teacher_students (student_id);

-- Se guarda solo el hash SHA-256 del token; el token en claro se muestra una vez.
create table public.invitations (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references public.profiles (id) on delete cascade,
  student_id  uuid not null references public.student_profiles (id) on delete cascade,
  email       text not null,
  token_hash  text not null unique,
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  expires_at  timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);
create index invitations_student on public.invitations (student_id);

-- ---------------------------------------------------------------- ejercicios
-- teacher_id NULL = biblioteca global.
create table public.exercises (
  id            uuid primary key default gen_random_uuid(),
  teacher_id    uuid references public.profiles (id) on delete cascade,
  name          text not null check (length(trim(name)) > 0),
  muscle_group  text not null,
  equipment     text,
  instructions  text,
  video_url     text,
  created_at    timestamptz not null default now()
);
create index exercises_teacher on public.exercises (teacher_id);

-- ------------------------------------------------------------------- rutinas
create table public.routines (
  id              uuid primary key default gen_random_uuid(),
  teacher_id      uuid not null references public.profiles (id) on delete cascade,
  name            text not null check (length(trim(name)) > 0),
  description     text,
  duration_weeks  smallint check (duration_weeks between 1 and 52),
  student_note    text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index routines_teacher on public.routines (teacher_id);
create trigger routines_updated_at before update on public.routines
  for each row execute function public.set_updated_at();

create table public.routine_days (
  id          uuid primary key default gen_random_uuid(),
  routine_id  uuid not null references public.routines (id) on delete cascade,
  position    smallint not null default 0,
  name        text not null
);
create index routine_days_routine on public.routine_days (routine_id);

create table public.routine_exercises (
  id              uuid primary key default gen_random_uuid(),
  routine_day_id  uuid not null references public.routine_days (id) on delete cascade,
  exercise_id     uuid not null references public.exercises (id) on delete restrict,
  position        smallint not null default 0,
  superset_group  text,                        -- 'A', 'B'… agrupa superseries
  sets            smallint not null default 3 check (sets between 1 and 20),
  reps            text not null default '10',  -- '6', '8-10', '30 s'
  weight_kg       numeric(6,2) check (weight_kg >= 0),
  rpe_target      numeric(3,1) check (rpe_target between 1 and 10),
  rest_seconds    smallint check (rest_seconds between 0 and 900),
  progression     text,                        -- '+2,5 kg por semana si RPE ≤ 8'
  notes           text
);
create index routine_exercises_day on public.routine_exercises (routine_day_id);
create index routine_exercises_exercise on public.routine_exercises (exercise_id);

create table public.student_routines (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.student_profiles (id) on delete cascade,
  routine_id   uuid not null references public.routines (id) on delete cascade,
  assigned_at  timestamptz not null default now(),
  start_date   date not null default current_date,
  end_date     date,
  sessions_per_week smallint check (sessions_per_week between 1 and 14),
  status       text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  check (end_date is null or end_date >= start_date)
);
create unique index student_routines_one_active
  on public.student_routines (student_id) where status = 'active';
create index student_routines_routine on public.student_routines (routine_id);
create index student_routines_student on public.student_routines (student_id);

-- ------------------------------------------------------------ entrenamientos
create table public.workouts (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.student_profiles (id) on delete cascade,
  routine_id      uuid references public.routines (id) on delete set null,
  routine_day_id  uuid references public.routine_days (id) on delete set null,
  started_at      timestamptz not null default now(),
  completed_at    timestamptz,
  notes           text,
  check (completed_at is null or completed_at >= started_at)
);
create index workouts_student_started on public.workouts (student_id, started_at desc);
create index workouts_routine on public.workouts (routine_id);
create index workouts_routine_day on public.workouts (routine_day_id);

create table public.workout_sets (
  id                   uuid primary key default gen_random_uuid(),
  workout_id           uuid not null references public.workouts (id) on delete cascade,
  exercise_id          uuid not null references public.exercises (id) on delete restrict,
  routine_exercise_id  uuid references public.routine_exercises (id) on delete set null,
  set_number           smallint not null check (set_number between 1 and 50),
  weight_kg            numeric(6,2) check (weight_kg >= 0),
  reps                 smallint check (reps between 0 and 500),
  rpe                  numeric(3,1) check (rpe between 1 and 10),
  completed            boolean not null default false,
  notes                text,
  unique (workout_id, exercise_id, set_number)
);
create index workout_sets_exercise on public.workout_sets (exercise_id);
create index workout_sets_routine_exercise on public.workout_sets (routine_exercise_id);

-- --------------------------------------------------------------- mediciones
create table public.measurements (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.student_profiles (id) on delete cascade,
  date         date not null default current_date,
  weight       numeric(5,1) check (weight > 0 and weight < 500),
  body_fat     numeric(4,1) check (body_fat > 0 and body_fat < 80),
  muscle_mass  numeric(5,1) check (muscle_mass > 0 and muscle_mass < 300),
  chest        numeric(5,1) check (chest > 0 and chest < 300),
  waist        numeric(5,1) check (waist > 0 and waist < 300),
  hips         numeric(5,1) check (hips > 0 and hips < 300),
  arm          numeric(5,1) check (arm > 0 and arm < 150),
  thigh        numeric(5,1) check (thigh > 0 and thigh < 200),
  notes        text,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index measurements_student_date on public.measurements (student_id, date desc);
create index measurements_created_by on public.measurements (created_by);

create table public.progress_photos (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.student_profiles (id) on delete cascade,
  date         date not null default current_date,
  front_path   text,
  side_path    text,
  back_path    text,
  created_at   timestamptz not null default now()
);
create index progress_photos_student on public.progress_photos (student_id, date desc);

-- ---------------------------------------------------------------- check-ins
create table public.checkins (
  id                uuid primary key default gen_random_uuid(),
  student_id        uuid not null references public.student_profiles (id) on delete cascade,
  week_start        date not null,                 -- lunes de la semana
  energy            smallint not null check (energy between 1 and 5),
  sleep             smallint not null check (sleep between 1 and 5),
  stress            smallint not null check (stress between 1 and 5),
  pain              smallint not null check (pain between 1 and 5),
  motivation        smallint not null check (motivation between 1 and 5),
  workouts_done     smallint check (workouts_done between 0 and 14),
  workouts_planned  smallint check (workouts_planned between 0 and 14),
  notes             text,
  created_at        timestamptz not null default now(),
  unique (student_id, week_start)
);

-- ------------------------------------------------- notas privadas del profesor
create table public.notes (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references public.profiles (id) on delete cascade,
  student_id  uuid not null references public.student_profiles (id) on delete cascade,
  content     text not null check (length(trim(content)) > 0),
  created_at  timestamptz not null default now()
);
create index notes_student on public.notes (student_id, created_at desc);
create index notes_teacher on public.notes (teacher_id);

-- -------------------------------------------------------------------- agenda
create table public.calendar_events (
  id           uuid primary key default gen_random_uuid(),
  teacher_id   uuid not null references public.profiles (id) on delete cascade,
  student_id   uuid references public.student_profiles (id) on delete cascade,
  title        text not null check (length(trim(title)) > 0),
  description  text,
  start_at     timestamptz not null,
  end_at       timestamptz,
  type         text not null check (type in ('presencial', 'online', 'evaluacion', 'tarea', 'otro')),
  created_at   timestamptz not null default now(),
  check (end_at is null or end_at >= start_at)
);
create index calendar_events_teacher_start on public.calendar_events (teacher_id, start_at);
create index calendar_events_student_start on public.calendar_events (student_id, start_at);

-- ---------------------------------------------------------------- mensajería
create table public.messages (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references public.profiles (id) on delete cascade,
  receiver_id  uuid not null references public.profiles (id) on delete cascade,
  content      text not null check (length(trim(content)) between 1 and 4000),
  read_at      timestamptz,
  created_at   timestamptz not null default now(),
  check (sender_id <> receiver_id)
);
create index messages_pair on public.messages (sender_id, receiver_id, created_at desc);
create index messages_receiver on public.messages (receiver_id, created_at desc);
create index messages_receiver_unread on public.messages (receiver_id) where read_at is null;

-- ------------------------------------------------- alertas marcadas revisadas
-- "Marcar como revisado y volver": la alerta sale de la cola hasta que cambie.
create table public.alert_reviews (
  teacher_id   uuid not null references public.profiles (id) on delete cascade,
  student_id   uuid not null references public.student_profiles (id) on delete cascade,
  alert_key    text not null,
  reviewed_at  timestamptz not null default now(),
  primary key (teacher_id, student_id, alert_key)
);
create index alert_reviews_student on public.alert_reviews (student_id);

-- Las tablas nacen con RLS activado; las políticas llegan en 0002.
alter table public.profiles enable row level security;
alter table public.teacher_profiles enable row level security;
alter table public.student_profiles enable row level security;
alter table public.teacher_students enable row level security;
alter table public.invitations enable row level security;
alter table public.exercises enable row level security;
alter table public.routines enable row level security;
alter table public.routine_days enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.student_routines enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_sets enable row level security;
alter table public.measurements enable row level security;
alter table public.progress_photos enable row level security;
alter table public.checkins enable row level security;
alter table public.notes enable row level security;
alter table public.calendar_events enable row level security;
alter table public.messages enable row level security;
alter table public.alert_reviews enable row level security;
