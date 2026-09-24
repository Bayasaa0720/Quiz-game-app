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

-- Зөвхөн өөрөөс, зөвхөн 'pending' төлөвтэй хүсэлт илгээж болно. status-ыг
-- WITH CHECK-д шалгаагүй бол хэрэглэгч insert хийхдээ шууд
-- status:'accepted' гэж бичээд нөгөө талын зөвшөөрөлгүйгээр "найз" болчихдог
-- цоорхойтой байсныг эндээс хаав (зөвшөөрөх нь зөвхөн addressee_update-аар).
drop policy if exists "friendships_requester_insert" on friendships;
create policy "friendships_requester_insert" on friendships
  for insert with check (auth.uid() = requester_id and status = 'pending');

-- Хүлээн авагч л 'pending' -> 'accepted' болгож болно.
drop policy if exists "friendships_addressee_update" on friendships;
create policy "friendships_addressee_update" on friendships
  for update using (auth.uid() = addressee_id) with check (auth.uid() = addressee_id);

-- Хоёр тал хэн ч мөрийг устгаж болно (цуцлах/цуцалгах/найзаас хасах).
drop policy if exists "friendships_participant_delete" on friendships;
create policy "friendships_participant_delete" on friendships
  for delete using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Имэйл ЭСВЭЛ nickname (user_profiles.display_name)-ээр хэрэглэгч хайх.
-- Имэйлээр олдвол зөвхөн @ өмнөх нэрийг харуулна (бүтэн имэйл задруулахгүй);
-- nickname тохируулсан бол харин display_name-ийг шууд харуулна.
drop function if exists search_users_by_email(text);
create or replace function search_users_by_email(p_query text)
returns table (user_id uuid, display_name text)
language sql
security definer
set search_path = public
stable
as $$
  select u.id, coalesce(up.display_name, split_part(u.email::text, '@', 1)) as display_name
  from auth.users u
  left join user_profiles up on up.user_id = u.id
  where (u.email ilike '%' || p_query || '%' or up.display_name ilike '%' || p_query || '%')
    and u.id <> auth.uid()
  order by coalesce(up.display_name, u.email)
  limit 10;
$$;

grant execute on function search_users_by_email(text) to authenticated;

-- Хэрэглэгчдийн (найзуудын) явцын статистик, харьцуулахад ашиглана.
-- Тохируулсан nickname байвал түүнийг, эсрэг тохиолдолд имэйлээс гаргасан
-- нэрийг харуулна (search_users_by_email-тай ижил дүрэм).
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
    coalesce(up.display_name, split_part(u.email::text, '@', 1)) as display_name,
    coalesce(sum(greatest(tp.highest_cleared_floor + 1, 0)), 0) as total_floors_cleared
  from auth.users u
  left join user_profiles up on up.user_id = u.id
  left join tower_progress tp on tp.user_id = u.id
  where u.id = any(p_user_ids)
  group by u.id, u.email, up.display_name;
$$;

grant execute on function get_user_stats(uuid[]) to authenticated;

-- Profile > Тохиргоо > "Дуэлийн урилга": нээлттэй queue (duel_find_match,
-- duels.sql) хайхад намайг олоход зөвшөөрөгдсөн этгээд ('everyone' эсвэл
-- зөвхөн 'friends'). Найздаа шууд урих (duel_challenge_friend) үргэлж
-- боломжтой хэвээр — энэ тохиргоо зөвхөн нээлттэй хайлтад нөлөөлнө.
alter table user_profiles add column if not exists duel_invite_permission text not null default 'everyone';
alter table user_profiles drop constraint if exists user_profiles_duel_invite_permission_check;
alter table user_profiles add constraint user_profiles_duel_invite_permission_check
  check (duel_invite_permission in ('everyone', 'friends'));

drop function if exists update_duel_invite_permission(text);
create or replace function update_duel_invite_permission(p_permission text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_permission not in ('everyone', 'friends') then
    raise exception 'Буруу утга: %', p_permission;
  end if;
  update user_profiles set duel_invite_permission = p_permission where user_id = auth.uid();
end;
$$;

grant execute on function update_duel_invite_permission(text) to authenticated;
