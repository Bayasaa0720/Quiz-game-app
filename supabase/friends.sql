-- Friend систем: хүсэлт илгээх/хүлээн авах, найзын жагсаалт + харьцуулалт.
-- Дахин ажиллуулахад аюулгүй (policy/функц бүр DROP IF EXISTS-ийн ард орсон).
-- Supabase Dashboard -> SQL Editor-т ажиллуулна уу.

create table if not exists friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references auth.users(id) on delete cascade,
  addressee_id uuid references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

alter table friendships enable row level security;

-- Хоёр талын хэн ч өөрт хамаарах мөрийг харж болно.
drop policy if exists "friendships_participant_select" on friendships;
create policy "friendships_participant_select" on friendships
  for select using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Зөвхөн өөрөөс хүсэлт илгээж болно.
drop policy if exists "friendships_requester_insert" on friendships;
create policy "friendships_requester_insert" on friendships
  for insert with check (auth.uid() = requester_id);

-- Хүлээн авагч л 'pending' -> 'accepted' болгож болно.
drop policy if exists "friendships_addressee_update" on friendships;
create policy "friendships_addressee_update" on friendships
  for update using (auth.uid() = addressee_id) with check (auth.uid() = addressee_id);

-- Хоёр тал хэн ч мөрийг устгаж болно (цуцлах/цуцалгах/найзаас хасах).
drop policy if exists "friendships_participant_delete" on friendships;
create policy "friendships_participant_delete" on friendships
  for delete using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Имэйлээр хэрэглэгч хайх (зөвхөн @ өмнөх нэрийг харуулна, бүтэн имэйл задруулахгүй).
drop function if exists search_users_by_email(text);
create or replace function search_users_by_email(p_query text)
returns table (user_id uuid, display_name text)
language sql
security definer
set search_path = public
stable
as $$
  select u.id, split_part(u.email::text, '@', 1) as display_name
  from auth.users u
  where u.email ilike '%' || p_query || '%'
    and u.id <> auth.uid()
  order by u.email
  limit 10;
$$;

grant execute on function search_users_by_email(text) to authenticated;

-- Хэрэглэгчдийн (найзуудын) явцын статистик, харьцуулахад ашиглана.
drop function if exists get_user_stats(uuid[]);
create or replace function get_user_stats(p_user_ids uuid[])
returns table (user_id uuid, display_name text, total_floors_cleared bigint)
language sql
security definer
set search_path = public
stable
as $$
  select
    u.id,
    split_part(u.email::text, '@', 1) as display_name,
    coalesce(sum(greatest(tp.highest_cleared_floor + 1, 0)), 0) as total_floors_cleared
  from auth.users u
  left join tower_progress tp on tp.user_id = u.id
  where u.id = any(p_user_ids)
  group by u.id, u.email;
$$;

grant execute on function get_user_stats(uuid[]) to authenticated;
