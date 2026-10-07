-- Borra SOLO los datos demo (usuarios @example.com y todo lo que cuelga de ellos).
-- No toca la biblioteca global de ejercicios ni usuarios reales.
delete from public.student_profiles
 where id in (select ts.student_id from public.teacher_students ts
              join public.profiles p on p.id = ts.teacher_id
              where p.email like '%@example.com');
delete from auth.users where email like '%@example.com';
