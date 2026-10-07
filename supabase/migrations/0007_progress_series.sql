-- =============================================================================
-- 0007 · Series de progreso (D4, E3)
-- Agregadas en Postgres para no traer series sueltas (límite de filas de la
-- API). SECURITY INVOKER: RLS filtra al alumno visible.
-- =============================================================================

-- Por semana (lunes local): sesiones completadas y volumen (kg × reps).
create or replace function public.student_weekly_stats(p_student uuid, p_from date)
returns table (week_start date, sessions int, volume numeric)
language sql stable security invoker set search_path = '' as $$
  with w as (
    select w.id,
           date_trunc('week', (w.started_at at time zone 'America/Argentina/Buenos_Aires'))::date as wk
      from public.workouts w
     where w.student_id = p_student and w.completed_at is not null
       and (w.started_at at time zone 'America/Argentina/Buenos_Aires')::date >= p_from
  )
  select w.wk,
         count(distinct w.id)::int,
         coalesce(sum(ws.weight_kg * ws.reps) filter (where ws.completed), 0)
    from w
    left join public.workout_sets ws on ws.workout_id = w.id
   group by w.wk
   order by w.wk;
$$;

-- Mejor carga por sesión de un ejercicio.
create or replace function public.student_exercise_series(p_student uuid, p_exercise uuid, p_from date)
returns table (day date, best_kg numeric)
language sql stable security invoker set search_path = '' as $$
  select (w.started_at at time zone 'America/Argentina/Buenos_Aires')::date, max(ws.weight_kg)
    from public.workouts w
    join public.workout_sets ws on ws.workout_id = w.id
   where w.student_id = p_student and w.completed_at is not null
     and ws.exercise_id = p_exercise and ws.completed and ws.weight_kg is not null
     and (w.started_at at time zone 'America/Argentina/Buenos_Aires')::date >= p_from
   group by w.id, w.started_at
   order by w.started_at;
$$;

revoke execute on function public.student_weekly_stats(uuid, date) from public, anon;
revoke execute on function public.student_exercise_series(uuid, uuid, date) from public, anon;
grant execute on function public.student_weekly_stats(uuid, date) to authenticated;
grant execute on function public.student_exercise_series(uuid, uuid, date) to authenticated;
