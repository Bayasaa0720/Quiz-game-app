-- Leaderboard: категори (цамхаг) тус бүрээр, эсвэл бүгдийг нийлүүлж
-- дийлсэн давхрын тоогоор хэрэглэгчдийг эрэмбэлэх.
--
-- ЭНЭ ФАЙЛ ЦААШИД ГАНЦ ЭХ СУРВАЛЖ (single source of truth) — хуучин
-- leaderboard_by_category.sql-ийн агуулгыг үүнд нэгтгэсэн тул тэр файл
-- цаашид хэрэггүй. Логик өөрчлөгдөх бүрт энд шууд edit хийж, дараа нь
-- Supabase SQL Editor-т энэ файлыг бүхэлд нь дахин ажиллуулна — DROP
-- FUNCTION IF EXISTS байгаа тул дахин ажиллуулахад үргэлж аюулгүй.
--
-- p_category_id NULL бол бүх категори нийлүүлсэн нийт дүн, аль нэг
-- category_id ирвэл зөвхөн тухайн цамхгийн дийлсэн давхраар эрэмбэлнэ.
-- Supabase Dashboard -> SQL Editor-т ажиллуулна уу.

drop function if exists get_leaderboard(int);
drop function if exists get_leaderboard(uuid, int);

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
