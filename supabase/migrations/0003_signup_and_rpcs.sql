-- =============================================================================
-- 0003 · Registro, alumnos e invitaciones
-- =============================================================================

-- ------------------------------------------------------- alta de usuario
-- El rol lo decide el servidor:
--   · con invitation_token válido para ese email  → student (vinculado)
--   · con invitation_token inválido               → error (no se crea cuenta)
--   · sin token                                   → teacher
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_token  text := new.raw_user_meta_data ->> 'invitation_token';
  v_inv    public.invitations%rowtype;
  v_sp     public.student_profiles%rowtype;
begin
  if v_token is not null and length(v_token) > 0 then
    select * into v_inv from public.invitations
     where token_hash = encode(extensions.digest(v_token, 'sha256'), 'hex')
       and status = 'pending' and expires_at > now()
       and lower(email) = lower(new.email)
     for update;

    if v_inv.id is null then
      raise exception 'INVALID_INVITATION' using errcode = 'P0001';
    end if;

    select * into v_sp from public.student_profiles where id = v_inv.student_id for update;
    if v_sp.user_id is not null then
      raise exception 'INVITATION_ALREADY_USED' using errcode = 'P0001';
    end if;

    insert into public.profiles (id, role, first_name, last_name, email)
    values (new.id, 'student', v_sp.first_name, v_sp.last_name, new.email);

    update public.student_profiles
       set user_id = new.id, status = 'active'
     where id = v_sp.id;

    update public.invitations
       set status = 'accepted', accepted_at = now()
     where id = v_inv.id;
  else
    insert into public.profiles (id, role, first_name, last_name, email)
    values (new.id, 'teacher',
            coalesce(trim(new.raw_user_meta_data ->> 'first_name'), ''),
            coalesce(trim(new.raw_user_meta_data ->> 'last_name'), ''),
            new.email);
    insert into public.teacher_profiles (user_id) values (new.id);
  end if;
  return new;
end $$;

-- Auth (supabase_auth_admin) es quien inserta en auth.users y dispara el trigger.
grant usage on schema private to supabase_auth_admin;
grant execute on function private.handle_new_user() to supabase_auth_admin;
revoke execute on function private.handle_new_user() from authenticated, public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------- crear alumno
-- Opción B: el profesor crea el registro (sin cuenta, sin contraseña).
-- El alumno activa su acceso luego con la invitación (opción A).
create or replace function public.create_student(
  p_first_name     text,
  p_last_name      text,
  p_email          text,
  p_birth_date     date    default null,
  p_phone          text    default null,
  p_goal           text    default null,
  p_level          text    default null,
  p_height_cm      numeric default null,
  p_initial_weight numeric default null,
  p_notes          text    default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if not private.is_teacher() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if exists (select 1 from public.student_profiles sp
             join public.teacher_students ts on ts.student_id = sp.id
             where ts.teacher_id = v_uid and ts.status = 'active'
               and lower(sp.email) = lower(trim(p_email))) then
    raise exception 'DUPLICATE_STUDENT' using errcode = 'P0001';
  end if;

  insert into public.student_profiles
    (first_name, last_name, email, birth_date, phone, goal, level,
     height_cm, initial_weight, notes, status)
  values
    (trim(p_first_name), coalesce(trim(p_last_name), ''), lower(trim(p_email)),
     p_birth_date, nullif(trim(p_phone), ''), nullif(trim(p_goal), ''), p_level,
     p_height_cm, p_initial_weight, nullif(trim(p_notes), ''), 'pending')
  returning id into v_id;

  insert into public.teacher_students (teacher_id, student_id) values (v_uid, v_id);

  if p_initial_weight is not null then
    insert into public.measurements (student_id, weight, created_by)
    values (v_id, p_initial_weight, v_uid);
  end if;

  return v_id;
end $$;

-- ------------------------------------------------------ crear invitación
-- Devuelve el token en claro UNA vez. En la base queda solo el hash.
create or replace function public.create_invitation(p_student_id uuid)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
  v_sp    public.student_profiles%rowtype;
begin
  if not private.teaches(p_student_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select * into v_sp from public.student_profiles where id = p_student_id;
  if v_sp.user_id is not null then
    raise exception 'ALREADY_ACTIVE' using errcode = 'P0001';
  end if;

  update public.invitations set status = 'revoked'
   where student_id = p_student_id and status = 'pending';

  insert into public.invitations (teacher_id, student_id, email, token_hash)
  values (auth.uid(), p_student_id, v_sp.email,
          encode(extensions.digest(v_token, 'sha256'), 'hex'));

  return v_token;
end $$;

-- ------------------------------------------- leer invitación (pre-registro)
-- Accesible sin sesión: solo devuelve lo necesario para la pantalla de alta.
create or replace function public.get_invitation(p_token text)
returns table (email text, student_first_name text, teacher_name text)
language sql stable security definer set search_path = '' as $$
  select i.email, sp.first_name, trim(p.first_name || ' ' || p.last_name)
    from public.invitations i
    join public.student_profiles sp on sp.id = i.student_id
    join public.profiles p on p.id = i.teacher_id
   where i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
     and i.status = 'pending' and i.expires_at > now()
     and sp.user_id is null;
$$;

-- --------------------------------------------------- desvincular alumno
-- No borra datos históricos: termina el vínculo y archiva al alumno.
create or replace function public.unlink_student(p_student_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.teaches(p_student_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  update public.teacher_students
     set status = 'ended', ended_at = now()
   where teacher_id = auth.uid() and student_id = p_student_id;

  update public.student_routines set status = 'cancelled'
   where student_id = p_student_id and status = 'active';

  update public.invitations set status = 'revoked'
   where student_id = p_student_id and status = 'pending';

  update public.student_profiles set status = 'archived'
   where id = p_student_id;
end $$;

-- ------------------------------------------------------ asignar rutina
-- Cierra la rutina activa anterior y activa la nueva en una sola operación.
create or replace function public.assign_routine(
  p_student_id uuid, p_routine_id uuid,
  p_start_date date default current_date, p_sessions_per_week smallint default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_weeks smallint;
begin
  if not private.teaches(p_student_id) or not private.owns_routine(p_routine_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  update public.student_routines set status = 'completed', end_date = coalesce(end_date, current_date)
   where student_id = p_student_id and status = 'active';

  select duration_weeks into v_weeks from public.routines where id = p_routine_id;

  insert into public.student_routines (student_id, routine_id, start_date, end_date, sessions_per_week)
  values (p_student_id, p_routine_id, p_start_date,
          case when v_weeks is not null then p_start_date + (v_weeks * 7 - 1) end,
          coalesce(p_sessions_per_week,
                   (select count(*)::smallint from public.routine_days where routine_id = p_routine_id)))
  returning id into v_id;
  return v_id;
end $$;

-- -------------------------------------------------------- duplicar rutina
create or replace function public.duplicate_routine(p_routine_id uuid)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_new uuid;
  d record;
  v_day uuid;
begin
  if not private.owns_routine(p_routine_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  insert into public.routines (teacher_id, name, description, duration_weeks, student_note)
  select teacher_id, name || ' (copia)', description, duration_weeks, student_note
    from public.routines where id = p_routine_id
  returning id into v_new;

  for d in select * from public.routine_days where routine_id = p_routine_id order by position loop
    insert into public.routine_days (routine_id, position, name)
    values (v_new, d.position, d.name) returning id into v_day;

    insert into public.routine_exercises
      (routine_day_id, exercise_id, position, superset_group, sets, reps,
       weight_kg, rpe_target, rest_seconds, progression, notes)
    select v_day, exercise_id, position, superset_group, sets, reps,
           weight_kg, rpe_target, rest_seconds, progression, notes
      from public.routine_exercises where routine_day_id = d.id;
  end loop;

  return v_new;
end $$;

-- --------------------------------------------- marcar mensajes como leídos
create or replace function public.mark_thread_read(p_other uuid)
returns void
language sql security invoker set search_path = '' as $$
  update public.messages set read_at = now()
   where receiver_id = auth.uid() and sender_id = p_other and read_at is null;
$$;

-- ----------------------------------------------------------- permisos RPC
revoke execute on all functions in schema public from public, anon;
grant execute on function public.create_student(text, text, text, date, text, text, text, numeric, numeric, text) to authenticated;
grant execute on function public.create_invitation(uuid) to authenticated;
grant execute on function public.unlink_student(uuid) to authenticated;
grant execute on function public.assign_routine(uuid, uuid, date, smallint) to authenticated;
grant execute on function public.duplicate_routine(uuid) to authenticated;
grant execute on function public.mark_thread_read(uuid) to authenticated;
grant execute on function public.get_invitation(text) to anon, authenticated;
