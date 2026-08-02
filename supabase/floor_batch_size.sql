-- Давхар бүрт багтах асуултын тоог 10-аас 5 болгож өөрчлөх.
-- ЧУХАЛ: энэ нь БҮХ цамхагт хамаарна (зөвхөн CS2 биш) — ажиллуулсны дараа
-- Admin Dashboard-с бүх ангиллыг дахин materialize хийх шаардлагатай бөгөөд
-- энэ нь тухайн ангилал бүрийн БҮХ тоглогчийн прогрессыг дахин эхлүүлнэ.
-- Supabase Dashboard -> SQL Editor-т ажиллуулна уу.

create or replace function regenerate_tower_floors(p_category_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  is_caller_admin boolean;
  lvl text;
  q record;
  batch uuid[];
  fidx integer := 0;
begin
  select exists(select 1 from app_admins where user_id = auth.uid())
    into is_caller_admin;

  if not is_caller_admin then
    raise exception 'Зөвхөн admin давхар materialize хийх эрхтэй';
  end if;

  delete from tower_floors where category_id = p_category_id;

  foreach lvl in array array['easy', 'normal', 'hard']
  loop
    batch := array[]::uuid[];

    for q in
      select id from quiz_items
      where category_id = p_category_id and difficulty = lvl
      order by id
    loop
      batch := batch || q.id;
      if array_length(batch, 1) = 5 then
        insert into tower_floors (category_id, floor_index, difficulty, question_ids, enemy_hp)
        values (p_category_id, fidx, lvl, batch, array_length(batch, 1) * 10);
        fidx := fidx + 1;
        batch := array[]::uuid[];
      end if;
    end loop;

    if array_length(batch, 1) > 0 then
      insert into tower_floors (category_id, floor_index, difficulty, question_ids, enemy_hp)
      values (p_category_id, fidx, lvl, batch, array_length(batch, 1) * 10);
      fidx := fidx + 1;
    end if;
  end loop;

  update tower_progress set highest_cleared_floor = -1, updated_at = now()
  where category_id = p_category_id;
end;
$$;
