-- Leaderboard: нийт дийлсэн давхрын тоогоор хэрэглэгчдийг эрэмбэлэх
-- Supabase Dashboard -> SQL Editor-т ажиллуулна уу.

create or replace function get_leaderboard(p_limit int default 20)
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
  left join tower_progress tp on tp.user_id = u.id
  group by u.id, u.email
  having coalesce(sum(greatest(tp.highest_cleared_floor + 1, 0)), 0) > 0
  order by total_floors_cleared desc
  limit p_limit;
$$;

grant execute on function get_leaderboard(int) to authenticated;
