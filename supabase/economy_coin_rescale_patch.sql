-- economy.sql-ийг (болон түүний дараа economy_replay_points_patch.sql-ийг
-- ажиллуулсан бол түүнийг ч) аль хэдийн ажиллуулсан хэрэглэгчид зориулсан
-- нэмэлт: coin-ийг давхрын хүнд/хөнгөнөөс хамааруулж бутархай болгоно.
-- Хялбар давхар = 0.3, дунд = 0.5, хүнд = 0.7 coin; цэвэр ялалт бол 2 дахин
-- (жиш: хүнд давхрыг цэвэр дийлбэл 1.4). Анх удаа болон дахин давахад адилхан.
--
-- record_floor_win-ийн буцаах төрөл (int -> numeric) өөрчлөгдсөн тул
-- эхлээд DROP хийх шаардлагатай (Postgres CREATE OR REPLACE-ээр буцаах
-- төрлийг шууд солиход зөвшөөрдөггүй).
-- Supabase Dashboard -> SQL Editor-т ажиллуулна уу.

alter table user_points alter column balance type numeric(12, 2) using balance::numeric;

drop function if exists record_floor_win(uuid, int, boolean);

create or replace function record_floor_win(p_category_id uuid, p_floor_index int, p_flawless boolean)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_difficulty text;
  v_base numeric;
  v_points numeric;
begin
  insert into tower_progress (user_id, category_id, highest_cleared_floor, updated_at)
  values (auth.uid(), p_category_id, p_floor_index, now())
  on conflict (user_id, category_id) do update
    set highest_cleared_floor = greatest(tower_progress.highest_cleared_floor, excluded.highest_cleared_floor),
        updated_at = now();

  select difficulty into v_difficulty
  from tower_floors
  where category_id = p_category_id and floor_index = p_floor_index;

  v_base := case v_difficulty
    when 'easy' then 0.3
    when 'hard' then 0.7
    else 0.5 -- 'normal' болон тодорхойгүй тохиолдол
  end;
  v_points := v_base * (case when p_flawless then 2 else 1 end);

  insert into user_points (user_id, balance, updated_at)
  values (auth.uid(), v_points, now())
  on conflict (user_id) do update set balance = user_points.balance + v_points, updated_at = now();

  return v_points;
end;
$$;

grant execute on function record_floor_win(uuid, int, boolean) to authenticated;
