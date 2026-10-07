-- =============================================================================
-- 0004 · Rendimiento de RLS
-- Las políticas "for all" se sumaban a las de SELECT y se evaluaban dos veces.
-- Se separan en insert/update/delete. La semántica de permisos no cambia.
-- =============================================================================

create index invitations_teacher on public.invitations (teacher_id);

-- routine_days
drop policy routine_days_write on public.routine_days;
create policy routine_days_insert on public.routine_days for insert to authenticated
  with check (private.owns_routine(routine_id));
create policy routine_days_update on public.routine_days for update to authenticated
  using (private.owns_routine(routine_id)) with check (private.owns_routine(routine_id));
create policy routine_days_delete on public.routine_days for delete to authenticated
  using (private.owns_routine(routine_id));

-- routine_exercises
drop policy routine_exercises_write on public.routine_exercises;
create policy routine_exercises_insert on public.routine_exercises for insert to authenticated
  with check (
    private.owns_routine(private.routine_of_day(routine_day_id))
    and exists (select 1 from public.exercises e where e.id = exercise_id
                and (e.teacher_id is null or e.teacher_id = (select auth.uid()))));
create policy routine_exercises_update on public.routine_exercises for update to authenticated
  using (private.owns_routine(private.routine_of_day(routine_day_id)))
  with check (
    private.owns_routine(private.routine_of_day(routine_day_id))
    and exists (select 1 from public.exercises e where e.id = exercise_id
                and (e.teacher_id is null or e.teacher_id = (select auth.uid()))));
create policy routine_exercises_delete on public.routine_exercises for delete to authenticated
  using (private.owns_routine(private.routine_of_day(routine_day_id)));

-- student_routines
drop policy student_routines_write on public.student_routines;
create policy student_routines_insert on public.student_routines for insert to authenticated
  with check (private.teaches(student_id) and private.owns_routine(routine_id));
create policy student_routines_update on public.student_routines for update to authenticated
  using (private.teaches(student_id))
  with check (private.teaches(student_id) and private.owns_routine(routine_id));
create policy student_routines_delete on public.student_routines for delete to authenticated
  using (private.teaches(student_id));

-- workouts
drop policy workouts_write on public.workouts;
create policy workouts_insert on public.workouts for insert to authenticated
  with check (private.can_view_student(student_id)
              and (routine_id is null or private.can_view_routine(routine_id)));
create policy workouts_update on public.workouts for update to authenticated
  using (private.can_view_student(student_id))
  with check (private.can_view_student(student_id)
              and (routine_id is null or private.can_view_routine(routine_id)));
create policy workouts_delete on public.workouts for delete to authenticated
  using (private.can_view_student(student_id));

-- measurements
drop policy measurements_write on public.measurements;
create policy measurements_insert on public.measurements for insert to authenticated
  with check (private.teaches(student_id));
create policy measurements_update on public.measurements for update to authenticated
  using (private.teaches(student_id)) with check (private.teaches(student_id));
create policy measurements_delete on public.measurements for delete to authenticated
  using (private.teaches(student_id));

-- calendar_events
drop policy calendar_write on public.calendar_events;
create policy calendar_insert on public.calendar_events for insert to authenticated
  with check (teacher_id = (select auth.uid()) and private.is_teacher()
              and (student_id is null or private.teaches(student_id)));
create policy calendar_update on public.calendar_events for update to authenticated
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid())
              and (student_id is null or private.teaches(student_id)));
create policy calendar_delete on public.calendar_events for delete to authenticated
  using (teacher_id = (select auth.uid()));
