-- =============================================================================
-- 0009 · INSERT … RETURNING en routines
-- La política de SELECT usaba private.can_view_routine(id), que consulta
-- routines: en un INSERT … RETURNING esa consulta no ve la fila recién
-- insertada y el RETURNING fallaba con "violates row-level security".
-- El dueño se resuelve por columna (además es más barato); los alumnos
-- siguen pasando por can_view_routine.
-- =============================================================================
drop policy routines_select on public.routines;
create policy routines_select on public.routines for select to authenticated
  using (teacher_id = (select auth.uid()) or private.can_view_routine(id));
