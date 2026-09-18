-- Leaderboard-ийг категори (цамхаг) тус бүрээр шүүх боломжтой болгох.
-- Supabase Dashboard -> SQL Editor-т ажиллуулна уу.
--
-- p_category_id NULL бол өмнөх шиг бүх категори нийлүүлсэн нийт дүн,
-- аль нэг category_id ирвэл зөвхөн тухайн цамхгийн дийлсэн давхраар эрэмбэлнэ.

drop function if exists get_leaderboard(int);

create or replace function get_leaderboard(p_category_id uuid default null, p_limit int default 20)
returns table (
  user_id uuid,
  display_name text,
  total_floors_cleared bigint,
  rank bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    u.id as user_id,
    split_part(u.email::text, '@', 1) as display_name,
    coalesce(sum(greatest(tp.highest_cleared_floor + 1, 0)), 0) as total_floors_cleared,
    rank() over (order by coalesce(sum(greatest(tp.highest_cleared_floor + 1, 0)), 0) desc) as rank
  from auth.users u
  left join tower_progress tp
    on tp.user_id = u.id
    and (p_category_id is null or tp.category_id = p_category_id)
  group by u.id, u.email
  having coalesce(sum(greatest(tp.highest_cleared_floor + 1, 0)), 0) > 0
  order by total_floors_cleared desc
  limit p_limit;
$$;

grant execute on function get_leaderboard(uuid, int) to authenticated;
