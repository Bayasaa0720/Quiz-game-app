-- economy.sql-ийг аль хэдийн ажиллуулсан хэрэглэгчид зориулсан нэмэлт:
-- аль хэдийн дийлсэн давхрыг дахин давахад ч бага (1) оноо олгоно (өмнө нь 0
-- байсан). record_floor_win-ийн буцаах төрөл (int) өөрчлөгдөөгүй тул
-- шууд CREATE OR REPLACE хийж болно — DROP FUNCTION хэрэггүй.
-- Supabase Dashboard -> SQL Editor-т ажиллуулна уу.

create or replace function record_floor_win(p_category_id uuid, p_floor_index int, p_flawless boolean)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_highest int;
  v_points int := 0;
begin
  select highest_cleared_floor into v_old_highest
  from tower_progress where user_id = auth.uid() and category_id = p_category_id;

  insert into tower_progress (user_id, category_id, highest_cleared_floor, updated_at)
  values (auth.uid(), p_category_id, p_floor_index, now())
  on conflict (user_id, category_id) do update
    set highest_cleared_floor = greatest(tower_progress.highest_cleared_floor, excluded.highest_cleared_floor),
        updated_at = now();

  if v_old_highest is null or p_floor_index > v_old_highest then
    v_points := 5 + (case when p_flawless then 5 else 0 end);
  else
    -- Аль хэдийн дийлсэн давхрыг дахин давсан ч бага зэрэг урамшуулна
    -- (farm хийж болохуйц хэмжээнд биш, зөвхөн дасгал хийсний тэмдэг).
    v_points := 1;
  end if;

  insert into user_points (user_id, balance, updated_at)
  values (auth.uid(), v_points, now())
  on conflict (user_id) do update set balance = user_points.balance + v_points, updated_at = now();

  return v_points;
end;
$$;

grant execute on function record_floor_win(uuid, int, boolean) to authenticated;
