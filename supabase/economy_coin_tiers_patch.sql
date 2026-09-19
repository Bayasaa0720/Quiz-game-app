-- economy_coin_rescale_patch.sql-ийг аль хэдийн ажиллуулсан хэрэглэгчид
-- зориулсан нэмэлт:
-- - Анх удаа давхар дийлэхэд авах coin нь дахин давахад авах coin-оос
--   10 дахин их болно (өмнө нь ялгаагүй байсан).
-- - Achievement бүрийн coin хүнд/хөнгөнөөр ялгарч, бага зэрэг өсдөг болно.
--
-- Хоёр функцийн буцаах төрөл өөрчлөгдөөгүй тул DROP хэрэггүй, шууд
-- CREATE OR REPLACE хийж болно.
-- Supabase Dashboard -> SQL Editor-т ажиллуулна уу.

create or replace function record_floor_win(p_category_id uuid, p_floor_index int, p_flawless boolean)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_highest int;
  v_difficulty text;
  v_base numeric;
  v_points numeric;
begin
  select highest_cleared_floor into v_old_highest
  from tower_progress where user_id = auth.uid() and category_id = p_category_id;

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
    else 0.5
  end;

  if v_old_highest is null or p_floor_index > v_old_highest then
    v_points := v_base;
  else
    v_points := v_base / 10;
  end if;
  v_points := v_points * (case when p_flawless then 2 else 1 end);

  insert into user_points (user_id, balance, updated_at)
  values (auth.uid(), v_points, now())
  on conflict (user_id) do update set balance = user_points.balance + v_points, updated_at = now();

  return v_points;
end;
$$;

grant execute on function record_floor_win(uuid, int, boolean) to authenticated;

create or replace function award_points_for_achievement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points numeric;
begin
  v_points := case new.achievement_id
    when 'first_floor' then 15
    when 'flawless_floor' then 20
    when 'duel_first_win' then 25
    when 'tower_complete' then 30
    when 'leaderboard_top1' then 30
    else 15
  end;

  insert into user_points (user_id, balance, updated_at)
  values (new.user_id, v_points, now())
  on conflict (user_id) do update set balance = user_points.balance + v_points, updated_at = now();
  return new;
end;
$$;
