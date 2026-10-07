-- =============================================================================
-- Datos de DEMOSTRACIÓN — solo desarrollo.
-- Crea 1 profesor + 5 alumnos con 8 semanas de historial relativo a hoy.
-- Los alumnos se dan de alta pasando por el flujo REAL de invitación
-- (trigger private.handle_new_user), así el seed también lo ejercita.
--
-- Credenciales de desarrollo (todas con la misma contraseña):
--   profesor@example.com             → profesor (Marcos Fernández)
--   lucas.ferreyra@example.com       → alumno
--   martin.ruiz@example.com          → alumno
--   sofia.mendez@example.com         → alumno
--   lucia.pereyra@example.com        → alumno
--   valentina.rios@example.com       → alumno
--   Contraseña: Trainer-demo-2026
--
-- Es idempotente: si el profesor ya existe, no hace nada.
-- Para regenerar: correr 99_reset_demo.sql y luego este archivo.
-- =============================================================================

create or replace function pg_temp.seed_user(p_email text, p_password text, p_meta jsonb)
returns uuid language plpgsql as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change_token, reauthentication_token)
  values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    p_email, extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', p_meta, now() - interval '60 days', now(),
    '', '', '', '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider,
                               last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_id::text,
          jsonb_build_object('sub', v_id::text, 'email', p_email, 'email_verified', true),
          'email', now(), now(), now());
  return v_id;
end $$;

-- Ejercicio de la biblioteca global por nombre.
create or replace function pg_temp.ex(p_name text) returns uuid
language sql as $$ select id from public.exercises where teacher_id is null and name = p_name $$;

create or replace function pg_temp.add_ex(
  p_day uuid, p_pos int, p_name text, p_sets int, p_reps text, p_kg numeric,
  p_rpe numeric default null, p_rest int default null, p_superset text default null,
  p_prog text default null, p_notes text default null)
returns void language sql as $$
  insert into public.routine_exercises
    (routine_day_id, exercise_id, position, sets, reps, weight_kg, rpe_target,
     rest_seconds, superset_group, progression, notes)
  values (p_day, pg_temp.ex(p_name), p_pos, p_sets, p_reps, p_kg, p_rpe,
          p_rest, p_superset, p_prog, p_notes);
$$;

-- Registra un entrenamiento completo de un día de rutina, escalando cargas.
create or replace function pg_temp.log_workout(
  p_student uuid, p_routine uuid, p_day uuid, p_at timestamptz, p_factor numeric, p_rpe numeric)
returns void language plpgsql as $$
declare
  v_w uuid;
  re record;
  i int;
  v_reps int;
begin
  insert into public.workouts (student_id, routine_id, routine_day_id, started_at, completed_at)
  values (p_student, p_routine, p_day, p_at, p_at + interval '55 minutes')
  returning id into v_w;

  for re in select * from public.routine_exercises where routine_day_id = p_day order by position loop
    v_reps := coalesce(nullif(regexp_replace(split_part(re.reps, '-', 1), '\D', '', 'g'), '')::int, 10);
    for i in 1..re.sets loop
      insert into public.workout_sets
        (workout_id, exercise_id, routine_exercise_id, set_number, weight_kg, reps, rpe, completed)
      values (v_w, re.exercise_id, re.id, i,
              case when re.weight_kg is null then null
                   else round(re.weight_kg * p_factor / 2.5) * 2.5 end,
              v_reps, p_rpe, true);
    end loop;
  end loop;
end $$;

do $$
declare
  tz       constant text := 'America/Argentina/Buenos_Aires';
  pw       constant text := 'Trainer-demo-2026';
  today    date := (now() at time zone tz)::date;
  monday   date := date_trunc('week', (now() at time zone tz))::date;
  t        uuid;
  st       record;
  sid      uuid;
  uid      uuid;
  r_fuerza uuid; r_recomp uuid; r_grasa uuid; r_salud uuid;
  d1 uuid; d2 uuid; d3 uuid;
  days     uuid[];
  d        int;
  day_date date;
  n        int;
  progress numeric;
  ids      jsonb := '{}';
begin
  if exists (select 1 from auth.users where email = 'profesor@example.com') then
    raise notice 'Seed demo ya aplicado: no se modifica nada.';
    return;
  end if;

  -- ---------------------------------------------------------------- profesor
  t := pg_temp.seed_user('profesor@example.com', pw,
                         '{"first_name":"Marcos","last_name":"Fernández"}');
  update public.teacher_profiles
     set specialization = 'Fuerza e hipertrofia', phone = '+54 11 5555-0100',
         bio = 'Entrenador personal. Presencial y online.', onboarding_done = true
   where user_id = t;

  -- ----------------------------------------------------------------- alumnos
  for st in select * from (values
    ('lucas',     'Lucas',     'Ferreyra', 'lucas.ferreyra@example.com', date '1996-04-12', 'Fuerza',        'avanzado',     178.0, 79.8, '+54 11 5555-0101', 'Quiere competir en powerlifting el año que viene.'),
    ('martin',    'Martín',    'Ruiz',     'martin.ruiz@example.com',    date '1995-02-20', 'Recomposición', 'intermedio',   181.0, 84.0, '+54 11 5555-0102', 'Trabaja en turnos rotativos.'),
    ('sofia',     'Sofía',     'Méndez',   'sofia.mendez@example.com',   date '1990-09-03', 'Bajar grasa',   'intermedio',   165.0, 68.5, '+54 11 5555-0103', null),
    ('lucia',     'Lucía',     'Pereyra',  'lucia.pereyra@example.com',  date '1984-11-27', 'Salud general', 'principiante', 160.0, 61.0, '+54 11 5555-0104', 'Dolor lumbar ocasional, evitar carga axial pesada.'),
    ('valentina', 'Valentina', 'Ríos',     'valentina.rios@example.com', date '1999-06-15', 'Hipertrofia',   'intermedio',   168.0, 58.0, '+54 11 5555-0105', null)
  ) as v(k, first_name, last_name, email, birth, goal, lvl, height, w0, phone, notes)
  loop
    insert into public.student_profiles
      (first_name, last_name, email, birth_date, phone, goal, level, height_cm, initial_weight, notes, created_at)
    values (st.first_name, st.last_name, st.email, st.birth, st.phone, st.goal, st.lvl,
            st.height, st.w0, st.notes, now() - interval '60 days')
    returning id into sid;
    insert into public.teacher_students (teacher_id, student_id, created_at)
    values (t, sid, now() - interval '60 days');
    insert into public.invitations (teacher_id, student_id, email, token_hash)
    values (t, sid, st.email, encode(extensions.digest('seed-' || st.email, 'sha256'), 'hex'));
    -- Alta real vía invitación: el trigger vincula y activa al alumno.
    uid := pg_temp.seed_user(st.email, pw, jsonb_build_object('invitation_token', 'seed-' || st.email));
    ids := ids || jsonb_build_object(st.k, sid);
  end loop;

  -- ----------------------------------------------------------------- rutinas
  insert into public.routines (teacher_id, name, description, duration_weeks, student_note)
  values (t, 'Fuerza · Bloque 2', 'Bloque de fuerza con progresión lineal.', 4,
          'si el hombro molesta en el press, cambiá a mancuernas con agarre neutro.')
  returning id into r_fuerza;
  insert into public.routine_days (routine_id, position, name) values (r_fuerza, 0, 'Tren superior') returning id into d1;
  insert into public.routine_days (routine_id, position, name) values (r_fuerza, 1, 'Tren inferior') returning id into d2;
  insert into public.routine_days (routine_id, position, name) values (r_fuerza, 2, 'Full body liviano') returning id into d3;
  perform pg_temp.add_ex(d1, 0, 'Press banca', 4, '6', 80, 8, 120, null, '+2,5 kg por semana si RPE ≤ 8');
  perform pg_temp.add_ex(d1, 1, 'Dominadas lastradas', 4, '5', 10, 8, 120, null, '+1 repetición por semana');
  perform pg_temp.add_ex(d1, 2, 'Remo con mancuerna', 3, '10', 32, null, 75, 'A');
  perform pg_temp.add_ex(d1, 3, 'Press militar', 3, '8', 40, null, 75, 'A');
  perform pg_temp.add_ex(d2, 0, 'Sentadilla trasera', 4, '5', 105, 8, 105, null, '+2,5 kg por semana si RPE ≤ 8', 'bajá en 3 segundos y pausá abajo. Hoy no vayas al fallo.');
  perform pg_temp.add_ex(d2, 1, 'Peso muerto rumano', 3, '8', 100, 7, 120);
  perform pg_temp.add_ex(d2, 2, 'Sentadilla búlgara', 3, '10', 20, 7, 90);
  perform pg_temp.add_ex(d2, 3, 'Curl femoral acostado', 3, '12', 35, null, 60);
  perform pg_temp.add_ex(d2, 4, 'Elevación de talones de pie', 3, '15', 60, null, 60);
  perform pg_temp.add_ex(d2, 5, 'Plancha', 3, '45 s', null, null, 45);
  perform pg_temp.add_ex(d3, 0, 'Peso muerto', 3, '5', 135, 7, 150);
  perform pg_temp.add_ex(d3, 1, 'Press inclinado con mancuernas', 3, '10', 26, 7, 90);
  perform pg_temp.add_ex(d3, 2, 'Jalón al pecho', 3, '10', 60, 7, 90);
  perform pg_temp.add_ex(d3, 3, 'Paseo del granjero', 3, '30 m', 32, null, 60);

  insert into public.routines (teacher_id, name, description, duration_weeks)
  values (t, 'Recomposición · Fase 1', 'Full body 3 días con énfasis en técnica.', 6)
  returning id into r_recomp;
  insert into public.routine_days (routine_id, position, name) values (r_recomp, 0, 'Full body A') returning id into d1;
  insert into public.routine_days (routine_id, position, name) values (r_recomp, 1, 'Full body B') returning id into d2;
  perform pg_temp.add_ex(d1, 0, 'Sentadilla trasera', 4, '6', 95, 8, 120, null, '+2,5 kg por semana si RPE ≤ 8');
  perform pg_temp.add_ex(d1, 1, 'Press banca', 4, '8', 70, 8, 120);
  perform pg_temp.add_ex(d1, 2, 'Remo con barra', 3, '10', 60, 7, 90);
  perform pg_temp.add_ex(d1, 3, 'Plancha', 3, '40 s', null, null, 45);
  perform pg_temp.add_ex(d2, 0, 'Peso muerto rumano', 4, '8', 90, 8, 120);
  perform pg_temp.add_ex(d2, 1, 'Press militar', 3, '8', 37.5, 8, 90);
  perform pg_temp.add_ex(d2, 2, 'Jalón al pecho', 3, '10', 60, 7, 90);
  perform pg_temp.add_ex(d2, 3, 'Estocadas con mancuernas', 3, '10', 18, 7, 75);

  insert into public.routines (teacher_id, name, description, duration_weeks)
  values (t, 'Pérdida de grasa · Circuitos', 'Circuitos metabólicos 3 días.', 8)
  returning id into r_grasa;
  insert into public.routine_days (routine_id, position, name) values (r_grasa, 0, 'Circuito A') returning id into d1;
  insert into public.routine_days (routine_id, position, name) values (r_grasa, 1, 'Circuito B') returning id into d2;
  perform pg_temp.add_ex(d1, 0, 'Sentadilla goblet', 3, '12', 20, 7, 30, 'A');
  perform pg_temp.add_ex(d1, 1, 'Remo con mancuerna', 3, '12', 16, 7, 30, 'A');
  perform pg_temp.add_ex(d1, 2, 'Swing con kettlebell', 3, '15', 16, 7, 60, 'A');
  perform pg_temp.add_ex(d2, 0, 'Hip thrust', 3, '12', 60, 7, 45, 'A');
  perform pg_temp.add_ex(d2, 1, 'Flexiones de brazos', 3, '10', null, 7, 45, 'A');
  perform pg_temp.add_ex(d2, 2, 'Remo ergómetro', 3, '250 m', null, null, 60, 'A');

  insert into public.routines (teacher_id, name, description, duration_weeks)
  values (t, 'Salud general', 'Movilidad, fuerza básica y core.', 8)
  returning id into r_salud;
  insert into public.routine_days (routine_id, position, name) values (r_salud, 0, 'Día A') returning id into d1;
  insert into public.routine_days (routine_id, position, name) values (r_salud, 1, 'Día B') returning id into d2;
  perform pg_temp.add_ex(d1, 0, 'Sentadilla a cajón', 3, '10', null, 6, 60);
  perform pg_temp.add_ex(d1, 1, 'Remo en polea baja', 3, '12', 30, 6, 60);
  perform pg_temp.add_ex(d1, 2, 'Dead bug', 3, '10', null, null, 45);
  perform pg_temp.add_ex(d2, 0, 'Puente de glúteos', 3, '12', null, 6, 45);
  perform pg_temp.add_ex(d2, 1, 'Press de hombros con mancuernas', 3, '10', 6, 6, 60);
  perform pg_temp.add_ex(d2, 2, 'Pallof press', 3, '10', 10, null, 45);

  -- ------------------------------------------------------------ asignaciones
  insert into public.student_routines (student_id, routine_id, assigned_at, start_date, end_date, sessions_per_week)
  values
    ((ids->>'lucas')::uuid,     r_fuerza, now() - interval '15 days', monday - 14, monday + 13, 4),
    ((ids->>'valentina')::uuid, r_fuerza, now() - interval '15 days', monday - 14, monday + 13, 4),
    ((ids->>'martin')::uuid,    r_recomp, now() - interval '50 days', monday - 49, monday - 49 + 41, 3),
    ((ids->>'sofia')::uuid,     r_grasa,  now() - interval '50 days', monday - 49, monday - 49 + 55, 3),
    ((ids->>'lucia')::uuid,     r_salud,  now() - interval '50 days', monday - 49, monday - 49 + 55, 4);

  -- ----------------------------------------------------------- entrenamientos
  -- 8 semanas hacia atrás. Patrones por día de semana (isodow 1=lun).
  for d in reverse 55..1 loop
    day_date := today - d;
    progress := (55 - d)::numeric / 54;   -- 0 → 1 a lo largo del período

    -- Lucas: 4/semana, progresa fuerte (sentadilla 100 → 112).
    if extract(isodow from day_date) in (1, 3, 5, 6) then
      select array_agg(id order by position) into days from public.routine_days where routine_id = r_fuerza;
      perform pg_temp.log_workout((ids->>'lucas')::uuid, r_fuerza,
        days[1 + (d % 3)], (day_date + time '07:05') at time zone tz,
        0.952 + 0.115 * progress, 7.5);
    end if;

    -- Valentina: 4/semana, progresa moderado.
    if extract(isodow from day_date) in (1, 2, 4, 5) then
      select array_agg(id order by position) into days from public.routine_days where routine_id = r_fuerza;
      perform pg_temp.log_workout((ids->>'valentina')::uuid, r_fuerza,
        days[1 + (d % 3)], (day_date + time '18:10') at time zone tz,
        0.55 + 0.05 * progress, 8);
    end if;

    -- Martín: 3/semana pero dejó de registrar hace 8 días.
    if extract(isodow from day_date) in (1, 3, 5) and d >= 8 and d % 4 <> 0 then
      select array_agg(id order by position) into days from public.routine_days where routine_id = r_recomp;
      perform pg_temp.log_workout((ids->>'martin')::uuid, r_recomp,
        days[1 + (d % 2)], (day_date + time '20:00') at time zone tz,
        0.95 + 0.06 * least(progress * 1.4, 1), 8);
    end if;

    -- Sofía: 3/semana, constante pero sin cambios de carga.
    if extract(isodow from day_date) in (2, 4, 6) then
      select array_agg(id order by position) into days from public.routine_days where routine_id = r_grasa;
      perform pg_temp.log_workout((ids->>'sofia')::uuid, r_grasa,
        days[1 + (d % 2)], (day_date + time '09:30') at time zone tz, 1.0, 7);
    end if;

    -- Lucía: venía 4/semana y cayó a 2 en las últimas dos semanas.
    if (d > 14 and extract(isodow from day_date) in (1, 2, 4, 5))
       or (d <= 14 and extract(isodow from day_date) in (1, 3) and d <> 3) then
      select array_agg(id order by position) into days from public.routine_days where routine_id = r_salud;
      perform pg_temp.log_workout((ids->>'lucia')::uuid, r_salud,
        days[1 + (d % 2)], (day_date + time '08:00') at time zone tz, 1.0, 6);
    end if;
  end loop;

  -- Lucas ya entrenó este lunes; el jueves pasado batió récord (112 kg).
  update public.workout_sets ws set weight_kg = 112
    from public.workouts w
   where ws.workout_id = w.id and w.student_id = (ids->>'lucas')::uuid
     and ws.exercise_id = pg_temp.ex('Sentadilla trasera')
     and w.started_at = (select max(started_at) from public.workouts w2
                          join public.workout_sets s2 on s2.workout_id = w2.id
                         where w2.student_id = (ids->>'lucas')::uuid
                           and s2.exercise_id = pg_temp.ex('Sentadilla trasera'))
     and ws.set_number = 1;

  -- -------------------------------------------------------------- mediciones
  for n in 0..4 loop
    day_date := today - 56 + n * 14;
    insert into public.measurements (student_id, date, weight, body_fat, waist, chest, arm, thigh, created_by) values
      ((ids->>'lucas')::uuid,     day_date, 79.8 - n * 0.35, 16 - n * 0.5, 85 - n * 0.75, 102, 37.5 + n * 0.2, 58, t),
      ((ids->>'martin')::uuid,    day_date, case when n >= 3 then 82.1 else 84.0 - n * 0.65 end, 22 - n * 0.75, 92 - n, 104, 36, 60, t),
      ((ids->>'sofia')::uuid,     day_date, 68.5 - case when n >= 1 then 0.5 else 0 end, 28, 78, 92, 29, 56, t),
      ((ids->>'lucia')::uuid,     day_date, 61.0 + (n % 2) * 0.2, null, 74, null, null, null, t),
      ((ids->>'valentina')::uuid, day_date, 58.0 + n * 0.35, 21, 66, 86, 27.5 + n * 0.2, 53 + n * 0.3, t);
  end loop;

  -- ---------------------------------------------------------------- check-ins
  for n in 1..6 loop
    insert into public.checkins (student_id, week_start, energy, sleep, stress, pain, motivation,
                                 workouts_done, workouts_planned, notes, created_at)
    select v.sid, monday - n * 7, v.e, v.s, v.st, v.p, v.m, v.done, v.plan, v.note,
           ((monday - n * 7 + 6) + time '20:14') at time zone tz
    from (values
      ((ids->>'lucas')::uuid,     5, 4, 2, 1, 5, 4, 4, null::text),
      ((ids->>'valentina')::uuid, 4, 4, 2, 1, 4, 4, 4, null),
      ((ids->>'sofia')::uuid,     3, 4, 3, 1, 3, 3, 3, case when n = 1 then 'La balanza no se mueve, me desanima un poco.' end),
      ((ids->>'lucia')::uuid,
         case when n = 1 then 2 else 4 end, case when n = 1 then 2 else 4 end,
         case when n = 1 then 4 else 2 end, 1, case when n = 1 then 3 else 4 end,
         case when n = 1 then 2 else 4 end, 4,
         case when n = 1 then 'Semana muy pesada en el trabajo, dormí poco y no llegué a entrenar el jueves ni el viernes.' end),
      ((ids->>'martin')::uuid,    3, 3, 3, 2, 3, 3, 3, null)
    ) as v(sid, e, s, st, p, m, done, plan, note)
    -- Martín no respondió el último check-in.
    where not (v.sid = (ids->>'martin')::uuid and n = 1);
  end loop;

  -- ------------------------------------------------------------------ agenda
  insert into public.calendar_events (teacher_id, student_id, title, description, start_at, end_at, type)
  select t, x.sid, x.title, x.descr,
         ((monday + x.dow) + x.hhmm) at time zone tz,
         case when x.mins is null then null else ((monday + x.dow) + x.hhmm + make_interval(mins => x.mins)) at time zone tz end,
         x.kind
  from (values
    (0, time '07:00', 60, (ids->>'lucas')::uuid,     'Tren superior', null::text, 'presencial'),
    (0, time '12:00', 60, (ids->>'valentina')::uuid, 'Full body', null, 'presencial'),
    (0, time '18:00', 30, (ids->>'sofia')::uuid,     'Revisión semanal', null, 'online'),
    (1, time '07:00', 60, (ids->>'lucas')::uuid,     'Tren inferior', null, 'presencial'),
    (1, time '08:30', 45, (ids->>'martin')::uuid,    'Evaluación y mediciones', null, 'evaluacion'),
    (1, time '12:00', 60, (ids->>'valentina')::uuid, 'Full body', null, 'presencial'),
    (1, time '16:00', null, null,                    'Ajustar rutina de Sofía', null, 'tarea'),
    (1, time '18:00', 30, (ids->>'sofia')::uuid,     'Revisión de plan', null, 'online'),
    (2, time '09:00', 60, (ids->>'lucia')::uuid,     'Movilidad y core', null, 'presencial'),
    (2, time '19:00', 30, (ids->>'martin')::uuid,    'Llamada de seguimiento', null, 'online'),
    (3, time '07:00', 60, (ids->>'lucas')::uuid,     'Tren superior', null, 'presencial'),
    (3, time '18:30', 60, (ids->>'valentina')::uuid, 'Tren inferior', null, 'presencial'),
    (4, time '08:00', 45, (ids->>'lucia')::uuid,     'Evaluación', null, 'evaluacion'),
    (4, time '17:00', 30, (ids->>'sofia')::uuid,     'Check-in semanal', null, 'online'),
    (5, time '10:00', 40, (ids->>'lucas')::uuid,     'Full body liviano', 'Por tu cuenta', 'online')
  ) as x(dow, hhmm, mins, sid, title, descr, kind);

  -- -------------------------------------------------------------- mensajes
  select user_id into uid from public.student_profiles where id = (ids->>'lucas')::uuid;
  insert into public.messages (sender_id, receiver_id, content, created_at, read_at) values
    (uid, t, 'Hoy salió 112 en sentadilla 💪', now() - interval '5 days', now() - interval '5 days'),
    (t, uid, '¡Tremendo el récord del jueves! Hoy cuidá la técnica en la bajada, no hace falta ir al fallo.', now() - interval '1 day', null);

  select user_id into uid from public.student_profiles where id = (ids->>'martin')::uuid;
  insert into public.messages (sender_id, receiver_id, content, created_at, read_at) values
    (t, uid, 'Martín, ¿cómo venís? No veo entrenamientos registrados desde el lunes pasado.', now() - interval '3 days', now() - interval '2 days'),
    (uid, t, 'Perdón, cambié de turno en el trabajo. Esta semana retomo.', now() - interval '2 hours', null);

  select user_id into uid from public.student_profiles where id = (ids->>'lucia')::uuid;
  insert into public.messages (sender_id, receiver_id, content, created_at, read_at) values
    (uid, t, '¿Podemos pasar la evaluación del viernes a la tarde?', now() - interval '5 hours', null);

  -- ------------------------------------------------------------------ notas
  insert into public.notes (teacher_id, student_id, content, created_at) values
    (t, (ids->>'martin')::uuid, 'Turnos rotativos: proponer rutina de 2 días si no logra sostener 3.', now() - interval '20 days'),
    (t, (ids->>'lucas')::uuid,  'Buena técnica en sentadilla. Revisar bracing en peso muerto.', now() - interval '10 days'),
    (t, (ids->>'lucia')::uuid,  'Evitar carga axial pesada por dolor lumbar.', now() - interval '45 days');

  raise notice 'Seed demo creado. Profesor: profesor@example.com';
end $$;
