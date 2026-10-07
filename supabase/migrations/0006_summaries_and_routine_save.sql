-- =============================================================================
-- 0006 · Resúmenes por alumno y guardado atómico de rutinas
-- Ambas funciones son SECURITY INVOKER: corren con los permisos del usuario,
-- así que RLS decide qué alumnos/rutinas ve o modifica.
-- =============================================================================

-- ------------------------------------------------------ resumen por alumno
-- Una fila por alumno visible (profesor: los suyos; alumno: él mismo) con
-- los agregados que usan el dashboard, la lista, el perfil y las alertas.
-- Evita traer miles de filas de entrenamientos/series al servidor web.
create or replace function public.student_summaries(p_student uuid default null)
returns table (
  id                uuid,
  user_id           uuid,
  first_name        text,
  last_name         text,
  email             text,
  goal              text,
  level             text,
  birth_date        date,
  status            text,
  created_at        timestamptz,
  workout_dates     date[],
  last_workout_at   timestamptz,
  routine           jsonb,
  weights           jsonb,
  last_measured_on  date,
  last_checkin      jsonb,
  lifts             jsonb,
  reviewed          jsonb
)
language sql stable security invoker set search_path = '' as $$
  select
    sp.id, sp.user_id, sp.first_name, sp.last_name, sp.email, sp.goal, sp.level,
    sp.birth_date, sp.status, sp.created_at,

    -- Fechas locales de entrenos completados (últimas 14 semanas).
    coalesce((
      select array_agg((w.started_at at time zone 'America/Argentina/Buenos_Aires')::date order by w.started_at)
        from public.workouts w
       where w.student_id = sp.id and w.completed_at is not null
         and w.started_at >= now() - interval '98 days'), '{}'),

    (select max(w.started_at) from public.workouts w
      where w.student_id = sp.id and w.completed_at is not null),

    (select jsonb_build_object(
              'id', r.id, 'name', r.name, 'duration_weeks', r.duration_weeks,
              'sessions_per_week', sr.sessions_per_week,
              'start_date', sr.start_date, 'end_date', sr.end_date)
       from public.student_routines sr
       join public.routines r on r.id = sr.routine_id
      where sr.student_id = sp.id and sr.status = 'active'),

    coalesce((
      select jsonb_agg(jsonb_build_object('d', m.date, 'w', m.weight) order by m.date)
        from public.measurements m
       where m.student_id = sp.id and m.weight is not null
         and m.date >= current_date - 400), '[]'::jsonb),

    (select max(m.date) from public.measurements m where m.student_id = sp.id),

    (select to_jsonb(c) - 'student_id'
       from public.checkins c
      where c.student_id = sp.id
      order by c.week_start desc limit 1),

    -- Mejores cargas por ejercicio: primera marca, mejor marca (y cuándo), y
    -- mejor marca previa a los últimos 7 días (para detectar récords nuevos).
    coalesce((
      select jsonb_agg(jsonb_build_object(
               'exercise_id', x.exercise_id, 'name', e.name,
               'first', x.first_kg, 'first_at', x.first_at,
               'best', x.best_kg, 'best_at', x.best_at,
               'prev_best', x.prev_best, 'sessions', x.sessions)
             order by x.sessions desc, x.best_kg desc)
        from (
          select s.exercise_id,
                 (array_agg(s.kg order by s.at))[1]                      as first_kg,
                 min(s.at)                                               as first_at,
                 max(s.kg)                                               as best_kg,
                 (array_agg(s.at order by s.kg desc, s.at))[1]           as best_at,
                 max(s.kg) filter (where s.at < now() - interval '7 days') as prev_best,
                 count(*)                                                as sessions
            from (
              select ws.exercise_id, w.started_at as at, max(ws.weight_kg) as kg
                from public.workout_sets ws
                join public.workouts w on w.id = ws.workout_id
               where w.student_id = sp.id and w.completed_at is not null
                 and ws.completed and ws.weight_kg is not null and ws.weight_kg > 0
               group by ws.exercise_id, w.id, w.started_at
            ) s
           group by s.exercise_id
        ) x
        join public.exercises e on e.id = x.exercise_id), '[]'::jsonb),

    coalesce((
      select jsonb_agg(ar.alert_key)
        from public.alert_reviews ar
       where ar.student_id = sp.id and ar.teacher_id = (select auth.uid())), '[]'::jsonb)

  from public.student_profiles sp
  where sp.status <> 'archived'
    and (p_student is null or sp.id = p_student);
$$;

revoke execute on function public.student_summaries(uuid) from public, anon;
grant execute on function public.student_summaries(uuid) to authenticated;

-- --------------------------------------------------- guardado de rutina
-- Recibe la rutina completa del editor y la sincroniza en una transacción:
-- actualiza lo que existe (por id), inserta lo nuevo y borra lo quitado.
-- Conservar los ids mantiene el vínculo con el historial de entrenamientos.
create or replace function public.save_routine(p jsonb)
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_id       uuid := nullif(p ->> 'id', '')::uuid;
  v_day      uuid;
  v_ex       uuid;
  d          jsonb;
  e          jsonb;
  i          int := 0;
  j          int;
  keep_days  uuid[] := '{}';
  keep_ex    uuid[];
begin
  if v_id is null then
    insert into public.routines (teacher_id, name, description, duration_weeks, student_note)
    values (auth.uid(), p ->> 'name', nullif(p ->> 'description', ''),
            nullif(p ->> 'duration_weeks', '')::smallint, nullif(p ->> 'student_note', ''))
    returning id into v_id;
  else
    update public.routines
       set name = p ->> 'name',
           description = nullif(p ->> 'description', ''),
           duration_weeks = nullif(p ->> 'duration_weeks', '')::smallint,
           student_note = nullif(p ->> 'student_note', '')
     where id = v_id;
    if not found then
      raise exception 'FORBIDDEN' using errcode = '42501';
    end if;
  end if;

  for d in select value from jsonb_array_elements(coalesce(p -> 'days', '[]'::jsonb)) loop
    v_day := nullif(d ->> 'id', '')::uuid;
    if v_day is not null and exists (select 1 from public.routine_days where id = v_day and routine_id = v_id) then
      update public.routine_days set name = d ->> 'name', position = i where id = v_day;
    else
      insert into public.routine_days (routine_id, position, name)
      values (v_id, i, d ->> 'name') returning id into v_day;
    end if;
    keep_days := keep_days || v_day;

    keep_ex := '{}';
    j := 0;
    for e in select value from jsonb_array_elements(coalesce(d -> 'exercises', '[]'::jsonb)) loop
      v_ex := nullif(e ->> 'id', '')::uuid;
      if v_ex is not null and exists (select 1 from public.routine_exercises where id = v_ex and routine_day_id = v_day) then
        update public.routine_exercises
           set exercise_id    = (e ->> 'exercise_id')::uuid,
               position       = j,
               superset_group = nullif(e ->> 'superset_group', ''),
               sets           = (e ->> 'sets')::smallint,
               reps           = e ->> 'reps',
               weight_kg      = nullif(e ->> 'weight_kg', '')::numeric,
               rpe_target     = nullif(e ->> 'rpe_target', '')::numeric,
               rest_seconds   = nullif(e ->> 'rest_seconds', '')::smallint,
               progression    = nullif(e ->> 'progression', ''),
               notes          = nullif(e ->> 'notes', '')
         where id = v_ex;
      else
        insert into public.routine_exercises
          (routine_day_id, exercise_id, position, superset_group, sets, reps,
           weight_kg, rpe_target, rest_seconds, progression, notes)
        values (v_day, (e ->> 'exercise_id')::uuid, j, nullif(e ->> 'superset_group', ''),
                (e ->> 'sets')::smallint, e ->> 'reps',
                nullif(e ->> 'weight_kg', '')::numeric, nullif(e ->> 'rpe_target', '')::numeric,
                nullif(e ->> 'rest_seconds', '')::smallint, nullif(e ->> 'progression', ''),
                nullif(e ->> 'notes', ''))
        returning id into v_ex;
      end if;
      keep_ex := keep_ex || v_ex;
      j := j + 1;
    end loop;

    delete from public.routine_exercises where routine_day_id = v_day and not (id = any (keep_ex));
    i := i + 1;
  end loop;

  delete from public.routine_days where routine_id = v_id and not (id = any (keep_days));
  return v_id;
end $$;

revoke execute on function public.save_routine(jsonb) from public, anon;
grant execute on function public.save_routine(jsonb) to authenticated;
