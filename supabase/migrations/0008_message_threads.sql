-- =============================================================================
-- 0008 · Conversaciones
-- Una fila por contacto con el que hay vínculo activo (profesor ↔ alumno),
-- con el último mensaje y los no leídos. SECURITY INVOKER: RLS de messages y
-- profiles decide qué se ve.
-- =============================================================================
create or replace function public.message_threads()
returns table (
  other_id      uuid,
  first_name    text,
  last_name     text,
  role          text,
  last_content  text,
  last_at       timestamptz,
  last_from_me  boolean,
  unread        int
)
language sql stable security invoker set search_path = '' as $$
  with me as (select auth.uid() as uid),
  contacts as (
    -- Perfiles visibles = yo + mis contactos (profiles_select usa private.connected).
    select p.id, p.first_name, p.last_name, p.role
      from public.profiles p
     where p.id <> (select uid from me)
  ),
  last_msg as (
    select distinct on (case when m.sender_id = (select uid from me) then m.receiver_id else m.sender_id end)
           case when m.sender_id = (select uid from me) then m.receiver_id else m.sender_id end as other_id,
           m.content, m.created_at, m.sender_id = (select uid from me) as from_me
      from public.messages m
     order by case when m.sender_id = (select uid from me) then m.receiver_id else m.sender_id end, m.created_at desc
  ),
  unread as (
    select m.sender_id as other_id, count(*)::int as n
      from public.messages m
     where m.receiver_id = (select uid from me) and m.read_at is null
     group by m.sender_id
  )
  select c.id, c.first_name, c.last_name, c.role,
         l.content, l.created_at, l.from_me, coalesce(u.n, 0)
    from contacts c
    left join last_msg l on l.other_id = c.id
    left join unread u on u.other_id = c.id
   order by l.created_at desc nulls last, c.first_name;
$$;

revoke execute on function public.message_threads() from public, anon;
grant execute on function public.message_threads() to authenticated;
