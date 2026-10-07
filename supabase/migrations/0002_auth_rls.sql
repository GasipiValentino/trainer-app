-- =============================================================================
-- 0002 · Autorización
-- Regla de oro: toda fila se valida contra auth.uid() en la base. La UI solo
-- oculta; la base decide. El rol nunca viene del cliente.
-- =============================================================================

create schema if not exists private;
grant usage on schema private to authenticated;

-- ------------------------------------------------------------------ helpers
-- security definer: leen tablas sin pasar por RLS (evita recursión) y solo
-- devuelven booleanos/ids relativos al usuario autenticado.

create or replace function private.is_teacher() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles
                 where id = (select auth.uid()) and role = 'teacher');
$$;

-- ¿El usuario autenticado es profesor activo de este alumno?
create or replace function private.teaches(p_student uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.teacher_students
                 where teacher_id = (select auth.uid())
                   and student_id = p_student and status = 'active');
$$;

-- ¿El usuario autenticado ES este alumno?
create or replace function private.is_self(p_student uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.student_profiles
                 where id = p_student and user_id = (select auth.uid())
                   and status = 'active');
$$;

create or replace function private.can_view_student(p_student uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.teaches(p_student) or private.is_self(p_student);
$$;

-- ¿Hay un vínculo activo profesor↔alumno entre el usuario y otro usuario?
create or replace function private.connected(p_other uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.teacher_students ts
    join public.student_profiles sp on sp.id = ts.student_id
    where ts.status = 'active' and sp.status = 'active'
      and ( (ts.teacher_id = (select auth.uid()) and sp.user_id = p_other)
         or (ts.teacher_id = p_other and sp.user_id = (select auth.uid())) ));
$$;

create or replace function private.owns_routine(p_routine uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.routines
                 where id = p_routine and teacher_id = (select auth.uid()));
$$;

create or replace function private.can_view_routine(p_routine uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.owns_routine(p_routine) or exists (
    select 1 from public.student_routines sr
    join public.student_profiles sp on sp.id = sr.student_id
    where sr.routine_id = p_routine and sp.user_id = (select auth.uid())
      and sp.status = 'active');
$$;

create or replace function private.routine_of_day(p_day uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select routine_id from public.routine_days where id = p_day;
$$;

create or replace function private.student_of_workout(p_workout uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select student_id from public.workouts where id = p_workout;
$$;

-- Ejercicio utilizable: global, propio, o del profesor del alumno.
create or replace function private.can_view_exercise_owner(p_owner uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_owner is null
      or p_owner = (select auth.uid())
      or exists (select 1 from public.teacher_students ts
                 join public.student_profiles sp on sp.id = ts.student_id
                 where ts.teacher_id = p_owner and ts.status = 'active'
                   and sp.user_id = (select auth.uid()));
$$;

-- Primer segmento de una ruta de Storage como uuid, o NULL si no lo es.
create or replace function private.path_student(p_name text) returns uuid
language sql immutable set search_path = '' as $$
  select case when split_part(p_name, '/', 1) ~* '^[0-9a-f-]{36}$'
              then split_part(p_name, '/', 1)::uuid end;
$$;

grant execute on all functions in schema private to authenticated;

-- ----------------------------------------------------------------- permisos
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- El rol y el email no se pueden editar desde el cliente.
revoke update on public.profiles from authenticated;
grant update (first_name, last_name, avatar_url) on public.profiles to authenticated;
revoke insert, delete on public.profiles from authenticated;

-- De un mensaje solo se puede actualizar read_at.
revoke update on public.messages from authenticated;
grant update (read_at) on public.messages to authenticated;

-- Altas/bajas de alumnos e invitaciones solo vía RPC.
revoke insert, delete on public.student_profiles from authenticated;
revoke insert, update, delete on public.teacher_students from authenticated;
revoke insert, update, delete on public.invitations from authenticated;
revoke insert, delete on public.teacher_profiles from authenticated;

-- --------------------------------------------------------------------- RLS
alter table public.profiles          enable row level security;
alter table public.teacher_profiles  enable row level security;
alter table public.student_profiles  enable row level security;
alter table public.teacher_students  enable row level security;
alter table public.invitations       enable row level security;
alter table public.exercises         enable row level security;
alter table public.routines          enable row level security;
alter table public.routine_days      enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.student_routines  enable row level security;
alter table public.workouts          enable row level security;
alter table public.workout_sets      enable row level security;
alter table public.measurements      enable row level security;
alter table public.progress_photos   enable row level security;
alter table public.checkins          enable row level security;
alter table public.notes             enable row level security;
alter table public.calendar_events   enable row level security;
alter table public.messages          enable row level security;
alter table public.alert_reviews     enable row level security;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.connected(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- teacher_profiles
create policy teacher_profiles_select on public.teacher_profiles for select to authenticated
  using (user_id = (select auth.uid()) or private.connected(user_id));
create policy teacher_profiles_update on public.teacher_profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- student_profiles
create policy student_profiles_select on public.student_profiles for select to authenticated
  using (private.can_view_student(id));
create policy student_profiles_update on public.student_profiles for update to authenticated
  using (private.teaches(id)) with check (private.teaches(id));

-- teacher_students
create policy teacher_students_select on public.teacher_students for select to authenticated
  using (teacher_id = (select auth.uid()) or private.is_self(student_id));

-- invitations
create policy invitations_select on public.invitations for select to authenticated
  using (teacher_id = (select auth.uid()) and private.teaches(student_id));

-- exercises
create policy exercises_select on public.exercises for select to authenticated
  using (private.can_view_exercise_owner(teacher_id));
create policy exercises_insert on public.exercises for insert to authenticated
  with check (teacher_id = (select auth.uid()) and private.is_teacher());
create policy exercises_update on public.exercises for update to authenticated
  using (teacher_id = (select auth.uid())) with check (teacher_id = (select auth.uid()));
create policy exercises_delete on public.exercises for delete to authenticated
  using (teacher_id = (select auth.uid()));

-- routines
create policy routines_select on public.routines for select to authenticated
  using (private.can_view_routine(id));
create policy routines_insert on public.routines for insert to authenticated
  with check (teacher_id = (select auth.uid()) and private.is_teacher());
create policy routines_update on public.routines for update to authenticated
  using (teacher_id = (select auth.uid())) with check (teacher_id = (select auth.uid()));
create policy routines_delete on public.routines for delete to authenticated
  using (teacher_id = (select auth.uid()));

-- routine_days
create policy routine_days_select on public.routine_days for select to authenticated
  using (private.can_view_routine(routine_id));
create policy routine_days_write on public.routine_days for all to authenticated
  using (private.owns_routine(routine_id)) with check (private.owns_routine(routine_id));

-- routine_exercises
create policy routine_exercises_select on public.routine_exercises for select to authenticated
  using (private.can_view_routine(private.routine_of_day(routine_day_id)));
create policy routine_exercises_write on public.routine_exercises for all to authenticated
  using (private.owns_routine(private.routine_of_day(routine_day_id)))
  with check (
    private.owns_routine(private.routine_of_day(routine_day_id))
    and exists (select 1 from public.exercises e where e.id = exercise_id
                and (e.teacher_id is null or e.teacher_id = (select auth.uid()))));

-- student_routines
create policy student_routines_select on public.student_routines for select to authenticated
  using (private.can_view_student(student_id));
create policy student_routines_write on public.student_routines for all to authenticated
  using (private.teaches(student_id))
  with check (private.teaches(student_id) and private.owns_routine(routine_id));

-- workouts: el alumno registra los suyos; el profesor puede ver y registrar.
create policy workouts_select on public.workouts for select to authenticated
  using (private.can_view_student(student_id));
create policy workouts_write on public.workouts for all to authenticated
  using (private.can_view_student(student_id))
  with check (private.can_view_student(student_id)
              and (routine_id is null or private.can_view_routine(routine_id)));

-- workout_sets
create policy workout_sets_all on public.workout_sets for all to authenticated
  using (private.can_view_student(private.student_of_workout(workout_id)))
  with check (private.can_view_student(private.student_of_workout(workout_id)));

-- measurements: el profesor registra; el alumno consulta.
create policy measurements_select on public.measurements for select to authenticated
  using (private.can_view_student(student_id));
create policy measurements_write on public.measurements for all to authenticated
  using (private.teaches(student_id)) with check (private.teaches(student_id));

-- progress_photos
create policy progress_photos_select on public.progress_photos for select to authenticated
  using (private.can_view_student(student_id));
create policy progress_photos_insert on public.progress_photos for insert to authenticated
  with check (private.can_view_student(student_id));
create policy progress_photos_delete on public.progress_photos for delete to authenticated
  using (private.can_view_student(student_id));

-- checkins: los completa el alumno; el profesor los lee.
create policy checkins_select on public.checkins for select to authenticated
  using (private.can_view_student(student_id));
create policy checkins_insert on public.checkins for insert to authenticated
  with check (private.is_self(student_id));
create policy checkins_update on public.checkins for update to authenticated
  using (private.is_self(student_id)) with check (private.is_self(student_id));

-- notes: privadas del profesor, el alumno nunca las ve.
create policy notes_all on public.notes for all to authenticated
  using (teacher_id = (select auth.uid()) and private.teaches(student_id))
  with check (teacher_id = (select auth.uid()) and private.teaches(student_id));

-- calendar_events
create policy calendar_select on public.calendar_events for select to authenticated
  using (teacher_id = (select auth.uid())
         or (student_id is not null and private.is_self(student_id)));
create policy calendar_write on public.calendar_events for all to authenticated
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid()) and private.is_teacher()
              and (student_id is null or private.teaches(student_id)));

-- messages: solo entre profesor y sus alumnos.
create policy messages_select on public.messages for select to authenticated
  using (sender_id = (select auth.uid()) or receiver_id = (select auth.uid()));
create policy messages_insert on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and private.connected(receiver_id));
create policy messages_mark_read on public.messages for update to authenticated
  using (receiver_id = (select auth.uid())) with check (receiver_id = (select auth.uid()));

-- alert_reviews
create policy alert_reviews_all on public.alert_reviews for all to authenticated
  using (teacher_id = (select auth.uid()) and private.teaches(student_id))
  with check (teacher_id = (select auth.uid()) and private.teaches(student_id));

-- ------------------------------------------------------------------ storage
insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

create policy progress_photos_obj_select on storage.objects for select to authenticated
  using (bucket_id = 'progress-photos'
         and private.can_view_student(private.path_student(name)));
create policy progress_photos_obj_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'progress-photos'
              and private.can_view_student(private.path_student(name)));
create policy progress_photos_obj_delete on storage.objects for delete to authenticated
  using (bucket_id = 'progress-photos'
         and private.can_view_student(private.path_student(name)));

-- ----------------------------------------------------------------- realtime
alter publication supabase_realtime add table public.messages;
