-- =============================================================================
-- Tests de autorización (RLS + RPCs) contra la base real.
-- Ejecuta consultas como `authenticated` con el JWT de cada usuario, igual que
-- la API. Crea fixtures temporales (Profesor B + alumno) y los borra al final.
-- Requiere el seed demo (profesor@example.com y sus alumnos).
-- Resultado: una fila por test con pass = true/false.
-- =============================================================================

drop table if exists pg_temp.results;
create temp table results (n serial, test text, pass boolean, detail text);
grant all on results to authenticated, anon;
grant usage on sequence results_n_seq to authenticated, anon;

-- ------------------------------------------------------------- fixtures
drop table if exists pg_temp.ctx;
create temp table ctx as
select
  (select id from auth.users where email = 'profesor@example.com')        as t_a,
  gen_random_uuid()                                                        as t_b,
  (select id from public.student_profiles where email = 'lucas.ferreyra@example.com') as s_lucas,
  (select user_id from public.student_profiles where email = 'lucas.ferreyra@example.com') as u_lucas,
  (select id from public.student_profiles where email = 'martin.ruiz@example.com') as s_martin,
  (select user_id from public.student_profiles where email = 'martin.ruiz@example.com') as u_martin,
  null::uuid as s_b, null::uuid as u_b, null::uuid as r_a, null::uuid as r_b,
  (select w.id from public.workouts w join public.student_profiles sp on sp.id = w.student_id
    where sp.email = 'martin.ruiz@example.com' order by w.started_at desc limit 1) as w_martin;
grant select on ctx to authenticated;

-- Profesor B (alta real: el trigger lo crea como teacher).
insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', t_b, 'authenticated', 'authenticated',
       'rls-test-teacher-b@example.com', '{"first_name":"Profesor","last_name":"B"}', now(), now()
from ctx;

-- Alumno de B, activado por invitación real.
with sp as (
  insert into public.student_profiles (first_name, last_name, email)
  values ('Alumno', 'De B', 'rls-test-student-b@example.com') returning id
)
update ctx set s_b = (select id from sp);
insert into public.teacher_students (teacher_id, student_id) select t_b, s_b from ctx;
insert into public.invitations (teacher_id, student_id, email, token_hash)
select t_b, s_b, 'rls-test-student-b@example.com',
       encode(extensions.digest('rls-test-token', 'sha256'), 'hex') from ctx;
update ctx set u_b = gen_random_uuid();
insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', u_b, 'authenticated', 'authenticated',
       'rls-test-student-b@example.com', '{"invitation_token":"rls-test-token"}', now(), now()
from ctx;

update ctx set r_a = (select id from public.routines where teacher_id = ctx.t_a limit 1);
with r as (insert into public.routines (teacher_id, name) select t_b, 'Rutina secreta de B' from ctx returning id)
update ctx set r_b = (select id from r);
insert into public.measurements (student_id, weight) select s_b, 70 from ctx;
insert into public.notes (teacher_id, student_id, content) select t_b, s_b, 'Nota privada de B' from ctx;

-- Registro con invitación inválida debe fallar.
do $$ begin
  insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
          'rls-test-intruder@example.com', '{"invitation_token":"token-falso"}', now(), now());
  insert into results (test, pass, detail) values ('Registro con invitación falsa es rechazado', false, 'se creó la cuenta');
exception when others then
  insert into results (test, pass, detail) values ('Registro con invitación falsa es rechazado', true, sqlerrm);
end $$;

insert into results (test, pass, detail)
select 'Alumno de B quedó activo vía invitación',
       (select status = 'active' and user_id = ctx.u_b from public.student_profiles where id = ctx.s_b), ''
from ctx;
insert into results (test, pass, detail)
select 'Registro sin invitación crea rol teacher (no el que pida el cliente)',
       (select role = 'teacher' from public.profiles where id = ctx.t_b), '' from ctx;

-- =================================================== como PROFESOR A
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', t_a, 'role', 'authenticated')::text, false) from ctx;

insert into results (test, pass, detail)
select 'A ve solo sus 5 alumnos', count(*) = 5, count(*)::text from public.student_profiles;
insert into results (test, pass, detail)
select 'A no puede leer alumno de B por ID', count(*) = 0, '' from public.student_profiles where id = (select s_b from ctx);
insert into results (test, pass, detail)
select 'A no puede leer mediciones de B', count(*) = 0, '' from public.measurements where student_id = (select s_b from ctx);
insert into results (test, pass, detail)
select 'A no puede leer notas de B', count(*) = 0, '' from public.notes where student_id = (select s_b from ctx);
insert into results (test, pass, detail)
select 'A no puede leer rutinas de B', count(*) = 0, '' from public.routines where id = (select r_b from ctx);
insert into results (test, pass, detail)
select 'A no ve el perfil de usuario de B ni de su alumno', count(*) = 0, ''
from public.profiles where id in ((select t_b from ctx), (select u_b from ctx));

with u as (update public.student_profiles set notes = 'hack' where id = (select s_b from ctx) returning 1)
insert into results (test, pass, detail) select 'A no puede editar alumno de B', count(*) = 0, '' from u;

do $$ begin
  insert into public.measurements (student_id, weight) values ((select s_b from ctx), 99);
  insert into results (test, pass, detail) values ('A no puede medir alumno de B', false, 'insert permitido');
exception when others then
  insert into results (test, pass, detail) values ('A no puede medir alumno de B', true, sqlerrm);
end $$;

do $$ begin
  perform public.create_invitation((select s_b from ctx));
  insert into results (test, pass, detail) values ('A no puede invitar al alumno de B', false, 'rpc permitida');
exception when others then
  insert into results (test, pass, detail) values ('A no puede invitar al alumno de B', true, sqlerrm);
end $$;

do $$ begin
  perform public.assign_routine((select s_b from ctx), (select r_a from ctx));
  insert into results (test, pass, detail) values ('A no puede asignar rutina al alumno de B', false, 'rpc permitida');
exception when others then
  insert into results (test, pass, detail) values ('A no puede asignar rutina al alumno de B', true, sqlerrm);
end $$;

do $$ begin
  perform public.unlink_student((select s_b from ctx));
  insert into results (test, pass, detail) values ('A no puede desvincular alumno de B', false, 'rpc permitida');
exception when others then
  insert into results (test, pass, detail) values ('A no puede desvincular alumno de B', true, sqlerrm);
end $$;

do $$ begin
  insert into public.messages (sender_id, receiver_id, content)
  values ((select t_a from ctx), (select u_b from ctx), 'hola');
  insert into results (test, pass, detail) values ('A no puede escribirle al alumno de B', false, 'insert permitido');
exception when others then
  insert into results (test, pass, detail) values ('A no puede escribirle al alumno de B', true, sqlerrm);
end $$;

do $$ begin
  insert into public.calendar_events (teacher_id, student_id, title, start_at, type)
  values ((select t_a from ctx), (select s_b from ctx), 'x', now(), 'presencial');
  insert into results (test, pass, detail) values ('A no puede agendar al alumno de B', false, 'insert permitido');
exception when others then
  insert into results (test, pass, detail) values ('A no puede agendar al alumno de B', true, sqlerrm);
end $$;

do $$ begin
  insert into public.routines (teacher_id, name) values ((select t_b from ctx), 'suplantación');
  insert into results (test, pass, detail) values ('A no puede crear rutinas a nombre de B', false, 'insert permitido');
exception when others then
  insert into results (test, pass, detail) values ('A no puede crear rutinas a nombre de B', true, sqlerrm);
end $$;

-- Positivos: A sí opera sobre sus alumnos.
do $$ begin
  insert into public.measurements (student_id, weight) values ((select s_lucas from ctx), 123.4);
  insert into results (test, pass, detail) values ('A sí puede medir a su alumno', true, '');
exception when others then
  insert into results (test, pass, detail) values ('A sí puede medir a su alumno', false, sqlerrm);
end $$;
insert into results (test, pass, detail)
select 'A sí ve las notas de sus alumnos', count(*) >= 3, count(*)::text from public.notes;

-- Regresión 0009: INSERT … RETURNING de una rutina propia.
do $$ declare v uuid; begin
  insert into public.routines (teacher_id, name) values ((select t_a from ctx), 'RLS test rutina') returning id into v;
  delete from public.routines where id = v;
  insert into results (test, pass, detail) values ('A sí puede crear una rutina (INSERT … RETURNING)', true, '');
exception when others then
  insert into results (test, pass, detail) values ('A sí puede crear una rutina (INSERT … RETURNING)', false, sqlerrm);
end $$;


-- Etapas 4–6: RPCs, Storage y series
insert into results (test, pass, detail)
select 'A: resúmenes solo de sus alumnos', count(*) = 5, count(*)::text from public.student_summaries();
insert into results (test, pass, detail)
select 'A: resumen del alumno de B vacío', count(*) = 0, '' from public.student_summaries((select s_b from ctx));
insert into results (test, pass, detail)
select 'A: conversaciones sin contactos de B', count(*) = 0, ''
from public.message_threads() where other_id in ((select t_b from ctx), (select u_b from ctx));
do $$ begin
  perform public.save_routine(jsonb_build_object('id', (select r_b from ctx), 'name', 'pisada', 'days', '[]'::jsonb));
  insert into results (test, pass, detail) values ('A no puede sobrescribir la rutina de B (save_routine)', false, 'rpc permitida');
exception when others then
  insert into results (test, pass, detail) values ('A no puede sobrescribir la rutina de B (save_routine)', true, sqlerrm);
end $$;
do $$ begin
  perform public.duplicate_routine((select r_b from ctx));
  insert into results (test, pass, detail) values ('A no puede duplicar la rutina de B', false, 'rpc permitida');
exception when others then
  insert into results (test, pass, detail) values ('A no puede duplicar la rutina de B', true, sqlerrm);
end $$;
do $$ begin
  insert into storage.objects (bucket_id, name) values ('progress-photos', (select s_b from ctx)::text || '/x-front.jpg');
  insert into results (test, pass, detail) values ('A no puede subir fotos al alumno de B', false, 'insert permitido');
exception when others then
  insert into results (test, pass, detail) values ('A no puede subir fotos al alumno de B', true, sqlerrm);
end $$;
do $$ begin
  insert into public.workouts (student_id) values ((select s_b from ctx));
  insert into results (test, pass, detail) values ('A no puede registrar entrenos al alumno de B', false, 'insert permitido');
exception when others then
  insert into results (test, pass, detail) values ('A no puede registrar entrenos al alumno de B', true, sqlerrm);
end $$;

-- =================================================== como ALUMNO Lucas
select set_config('request.jwt.claims', json_build_object('sub', u_lucas, 'role', 'authenticated')::text, false) from ctx;

insert into results (test, pass, detail)
select 'Alumno ve solo su propio perfil de alumno', count(*) = 1, count(*)::text from public.student_profiles;
insert into results (test, pass, detail)
select 'Alumno no puede leer a otro alumno (Martín)', count(*) = 0, ''
from public.student_profiles where id = (select s_martin from ctx);
insert into results (test, pass, detail)
select 'Alumno no puede leer entrenamientos de otro', count(*) = 0, ''
from public.workouts where student_id = (select s_martin from ctx);
insert into results (test, pass, detail)
select 'Alumno no puede leer mediciones de otro', count(*) = 0, ''
from public.measurements where student_id = (select s_martin from ctx);
insert into results (test, pass, detail)
select 'Alumno no ve notas privadas del profesor', count(*) = 0, count(*)::text from public.notes;
insert into results (test, pass, detail)
select 'Alumno ve sus propios entrenamientos', count(*) > 0, count(*)::text from public.workouts;
insert into results (test, pass, detail)
select 'Alumno ve solo la rutina asignada', count(*) = 1, count(*)::text from public.routines;
insert into results (test, pass, detail)
select 'Alumno ve el perfil de su profesor', count(*) = 1, '' from public.profiles where id = (select t_a from ctx);

do $$ begin
  update public.profiles set role = 'teacher' where id = (select u_lucas from ctx);
  insert into results (test, pass, detail)
  select 'Alumno no puede cambiarse el rol',
         (select role = 'student' from public.profiles where id = (select u_lucas from ctx)), 'update sin error';
exception when others then
  insert into results (test, pass, detail) values ('Alumno no puede cambiarse el rol', true, sqlerrm);
end $$;

do $$ begin
  perform public.create_student('X', 'Y', 'x@example.com');
  insert into results (test, pass, detail) values ('Alumno no puede crear alumnos', false, 'rpc permitida');
exception when others then
  insert into results (test, pass, detail) values ('Alumno no puede crear alumnos', true, sqlerrm);
end $$;

do $$ begin
  insert into public.routines (teacher_id, name) values ((select u_lucas from ctx), 'Mi rutina');
  insert into results (test, pass, detail) values ('Alumno no puede crear rutinas', false, 'insert permitido');
exception when others then
  insert into results (test, pass, detail) values ('Alumno no puede crear rutinas', true, sqlerrm);
end $$;

do $$ begin
  insert into public.measurements (student_id, weight) values ((select s_lucas from ctx), 50);
  insert into results (test, pass, detail) values ('Alumno no puede cargar mediciones', false, 'insert permitido');
exception when others then
  insert into results (test, pass, detail) values ('Alumno no puede cargar mediciones', true, sqlerrm);
end $$;

do $$ begin
  insert into public.checkins (student_id, week_start, energy, sleep, stress, pain, motivation)
  values ((select s_martin from ctx), current_date, 5, 5, 1, 1, 5);
  insert into results (test, pass, detail) values ('Alumno no puede hacer check-in por otro', false, 'insert permitido');
exception when others then
  insert into results (test, pass, detail) values ('Alumno no puede hacer check-in por otro', true, sqlerrm);
end $$;

do $$ begin
  insert into public.workouts (student_id) values ((select s_martin from ctx));
  insert into results (test, pass, detail) values ('Alumno no puede registrar entreno de otro', false, 'insert permitido');
exception when others then
  insert into results (test, pass, detail) values ('Alumno no puede registrar entreno de otro', true, sqlerrm);
end $$;

do $$ begin
  insert into public.messages (sender_id, receiver_id, content)
  values ((select u_lucas from ctx), (select u_martin from ctx), 'hola');
  insert into results (test, pass, detail) values ('Alumno no puede escribirle a otro alumno', false, 'insert permitido');
exception when others then
  insert into results (test, pass, detail) values ('Alumno no puede escribirle a otro alumno', true, sqlerrm);
end $$;

do $$ begin
  insert into public.messages (sender_id, receiver_id, content)
  values ((select u_martin from ctx), (select t_a from ctx), 'suplantando');
  insert into results (test, pass, detail) values ('Alumno no puede enviar mensajes como otro', false, 'insert permitido');
exception when others then
  insert into results (test, pass, detail) values ('Alumno no puede enviar mensajes como otro', true, sqlerrm);
end $$;

do $$ begin
  insert into public.checkins (student_id, week_start, energy, sleep, stress, pain, motivation)
  values ((select s_lucas from ctx), date '2000-01-03', 4, 4, 2, 1, 4);
  insert into results (test, pass, detail) values ('Alumno sí puede hacer su check-in', true, '');
exception when others then
  insert into results (test, pass, detail) values ('Alumno sí puede hacer su check-in', false, sqlerrm);
end $$;

do $$ begin
  insert into public.messages (sender_id, receiver_id, content)
  values ((select u_lucas from ctx), (select t_a from ctx), 'Test de permisos');
  insert into results (test, pass, detail) values ('Alumno sí puede escribirle a su profesor', true, '');
exception when others then
  insert into results (test, pass, detail) values ('Alumno sí puede escribirle a su profesor', false, sqlerrm);
end $$;


-- Etapas 4–6 (alumno)
insert into results (test, pass, detail)
select 'Alumno: resumen solo propio', count(*) = 1 and bool_and(id = (select s_lucas from ctx)), count(*)::text from public.student_summaries();
insert into results (test, pass, detail)
select 'Alumno: única conversación = su coach', count(*) = 1 and bool_and(other_id = (select t_a from ctx)), count(*)::text from public.message_threads();
do $$ begin
  insert into public.workout_sets (workout_id, exercise_id, set_number, weight_kg, reps, completed)
  values ((select w_martin from ctx), (select id from public.exercises where teacher_id is null limit 1), 49, 10, 1, true);
  insert into results (test, pass, detail) values ('Alumno no puede agregar series a entrenos de otro', false, 'insert permitido');
exception when others then
  insert into results (test, pass, detail) values ('Alumno no puede agregar series a entrenos de otro', true, sqlerrm);
end $$;
do $$ begin
  insert into storage.objects (bucket_id, name) values ('progress-photos', (select s_martin from ctx)::text || '/x-front.jpg');
  insert into results (test, pass, detail) values ('Alumno no puede subir fotos a otro alumno', false, 'insert permitido');
exception when others then
  insert into results (test, pass, detail) values ('Alumno no puede subir fotos a otro alumno', true, sqlerrm);
end $$;
-- La subida se deshace con una excepción controlada (Storage no permite DELETE directo).
do $$ begin
  insert into storage.objects (bucket_id, name) values ('progress-photos', (select s_lucas from ctx)::text || '/rls-test-front.jpg');
  raise exception 'INSERT_OK';
exception when others then
  insert into results (test, pass, detail) values ('Alumno sí puede subir sus fotos', sqlerrm = 'INSERT_OK', sqlerrm);
end $$;
do $$ begin
  perform public.save_routine(jsonb_build_object('name', 'mía', 'days', '[]'::jsonb));
  insert into results (test, pass, detail) values ('Alumno no puede crear rutinas vía save_routine', false, 'rpc permitida');
exception when others then
  insert into results (test, pass, detail) values ('Alumno no puede crear rutinas vía save_routine', true, sqlerrm);
end $$;
do $$ begin
  perform public.assign_routine((select s_lucas from ctx), (select r_a from ctx));
  insert into results (test, pass, detail) values ('Alumno no puede asignarse rutinas', false, 'rpc permitida');
exception when others then
  insert into results (test, pass, detail) values ('Alumno no puede asignarse rutinas', true, sqlerrm);
end $$;

-- =================================================== como PROFESOR B
select set_config('request.jwt.claims', json_build_object('sub', t_b, 'role', 'authenticated')::text, false) from ctx;
insert into results (test, pass, detail)
select 'B ve solo su alumno', count(*) = 1, count(*)::text from public.student_profiles;
insert into results (test, pass, detail)
select 'B no ve entrenamientos de alumnos de A', count(*) = 0, count(*)::text from public.workouts;

-- =================================================== sin sesión (anon)
reset role;
set role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', false);
do $$ begin
  perform count(*) from public.student_profiles;
  insert into results (test, pass, detail) values ('Anónimo no puede leer alumnos', false, 'select permitido');
exception when others then
  insert into results (test, pass, detail) values ('Anónimo no puede leer alumnos', true, sqlerrm);
end $$;

-- ------------------------------------------------------------- limpieza
reset role;
select set_config('request.jwt.claims', '', false);
delete from public.messages where content = 'Test de permisos';
delete from public.checkins where week_start = date '2000-01-03';
delete from public.measurements where weight = 123.4 and student_id = (select s_lucas from ctx);
delete from public.student_profiles where id = (select s_b from ctx);
delete from auth.users where email like 'rls-test-%@example.com';

select n, pass, test, left(detail, 80) as detail from results order by n;
