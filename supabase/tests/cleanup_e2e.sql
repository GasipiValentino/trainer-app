-- Borra los datos creados por los tests E2E (sufijo e2e-… / "E2E …").
-- Profesor
delete from public.routines where name like 'E2E Rutina %';
delete from public.student_profiles where email like 'e2e-%@example.com';
delete from auth.users where email like 'e2e-%@example.com';
-- Alumno (Lucas): entrenos de hoy, check-in y mensajes de prueba
delete from public.workouts w using public.student_profiles sp
 where sp.id = w.student_id and sp.email = 'lucas.ferreyra@example.com'
   and (w.notes like 'Nota E2E%' or (w.completed_at is null and w.started_at > now() - interval '1 day'));
delete from public.checkins where notes like 'Check-in E2E%';
delete from public.messages where content like 'Mensaje alumno E2E%' or content like 'Hola desde E2E%';
