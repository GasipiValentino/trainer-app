-- =============================================================================
-- 0005 · Eliminación de cuenta desde la app (requisito App Store 5.1.1(v)).
--   · Alumno   → se borran su perfil de alumno y todos sus datos.
--   · Profesor → se borran sus rutinas, agenda, notas y mensajes; los alumnos
--                que nunca activaron cuenta (solo existían para él) también.
--                Los alumnos con cuenta propia conservan sus datos.
-- =============================================================================

create or replace function public.delete_my_account()
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid  uuid := auth.uid();
  v_role text;
begin
  if v_uid is null then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select role into v_role from public.profiles where id = v_uid;

  if v_role = 'student' then
    delete from public.student_profiles where user_id = v_uid;
  elsif v_role = 'teacher' then
    delete from public.student_profiles sp
     where sp.user_id is null
       and exists (select 1 from public.teacher_students ts
                   where ts.student_id = sp.id and ts.teacher_id = v_uid)
       and not exists (select 1 from public.teacher_students ts
                       where ts.student_id = sp.id and ts.teacher_id <> v_uid);
  end if;

  -- Cascada: profiles → teacher_profiles, teacher_students, routines, notas,
  -- eventos, mensajes, ejercicios propios, alert_reviews.
  delete from auth.users where id = v_uid;
end $$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
