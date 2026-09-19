-- Оноо / Дэлгүүр / Инвентар / Армор систем (v5 BRD-ийн Points, урьд нь
-- хойшлуулж байсан, одоо "armor" item болгож хэрэгжүүлж байна).
--
-- Ажиллуулах дараалал: classrooms.sql, achievements.sql-ийг ажиллуулсны
-- дараа ЭНЭ файлыг ажиллуулна. Үүний дараа duels_v2_patch.sql (эсвэл шинэ
-- суулгалт бол шинэчлэгдсэн duels.sql)-ийг ажиллуулна — тэр файл энэ дэх
-- user_points хүснэгтийг ашигладаг.
--
-- Оноо farm хийхээс сэргийлэх: давхар анх удаа дийлэхэд л (аль хэдийн
-- дийлсэн давхрыг дахин давахад биш) оноо олгоно — доорх record_floor_win
-- харна уу. Achievement бүрт нэг л удаа (unique constraint-аар хамгаалагдсан)
-- оноо олгоно. Duel ялалт бүрт (2 удаа тоглогч бодитоор өрсөлдсөний эцэст)
-- оноо олгоно.
--
-- Supabase Dashboard -> SQL Editor-т ажиллуулна уу.

-- 1) Coin (numeric — давхрын хүнд/хөнгөнөөс хамаарсан бутархай дүн өгдөг
-- тул int биш numeric байх ёстой).
create table if not exists user_points (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance numeric(12, 2) not null default 0,
  updated_at timestamptz not null default now()
);

alter table user_points enable row level security;

create policy "user_points_owner_select" on user_points
  for select using (auth.uid() = user_id);
-- Санаатайгаар INSERT/UPDATE policy алга — оноо зөвхөн SECURITY DEFINER
-- RPC/trigger-үүдээр л нэмэгдэнэ/хасагдана, шууд client бичиж чадахгүй.

-- 2) Дэлгүүрийн эдлэл (admin удирдана)
create table if not exists shop_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  icon text not null default '🛡️',
  armor_points int not null default 1 check (armor_points >= 0),
  price int not null check (price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3) Тоглогчийн эзэмшдэг эдлэлүүд
-- shop_items-ийн доорх SELECT policy-с өмнө үүсгэх ёстой (тэнд ашиглагдана).
create table if not exists user_inventory (
  user_id uuid references auth.users(id) on delete cascade,
  item_id uuid references shop_items(id) on delete cascade,
  acquired_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

alter table shop_items enable row level security;
alter table user_inventory enable row level security;

-- Идэвхтэй бүх эдлэл, эсвэл хэдийнэ эзэмшсэн (админ идэвхгүй болгосон ч)
-- эдлэлээ хэн ч харж болно. user_inventory-ийн policy эргээд shop_items-ийг
-- лавладаггүй тул mutual recursion үүсэхгүй (classrooms.sql-д гарсан алдаа
-- давтагдахгүй).
create policy "shop_items_visible_select" on shop_items
  for select using (
    is_active = true
    or exists (select 1 from user_inventory ui where ui.item_id = shop_items.id and ui.user_id = auth.uid())
  );

create policy "user_inventory_owner_select" on user_inventory
  for select using (auth.uid() = user_id);
-- INSERT зөвхөн shop_purchase_item RPC-ээр хийгдэнэ.

-- 4) Идэвхжүүлсэн эдлэл — user_profiles (classrooms.sql-д үүссэн) дээр нэг багана.
alter table user_profiles add column if not exists equipped_item_id uuid references shop_items(id);

-- 5) Давхар дийлэхэд tower_progress-ийг сервер талд бичиж, давхрын хүнд/
-- хөнгөнөөс хамаарсан coin олгоно (Battle.jsx цаашид шууд tower_progress
-- бичихээ больж, зөвхөн энэ RPC-ийг дуудна). Хялбар=0.3, дунд=0.5, хүнд=0.7
-- — гэхдээ энэ бол зөвхөн АНХ УДАА тухайн давхрыг дийлэхэд; дахин давахад
-- үүний 1/10-ийг л олгоно. Цэвэр ялалт бол аль ч тохиолдолд 2 дахин.
--
-- Farm хийхээс сэргийлэх: coin ЗӨВХӨН admin-ын баталгаажуулсан (is_global =
-- true) цамхагт л олгоно. Хувь хэрэглэгчийн өөрийн үүсгэсэн цамхаг (өөрөө
-- хялбар асуулт зохиогоод хязгааргүй "анх удаагийн" давхар үүсгэж болдог)
-- дэвшил хадгалагдсаар байх ч coin өгөхгүй.
create or replace function record_floor_win(p_category_id uuid, p_floor_index int, p_flawless boolean)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_highest int;
  v_is_global boolean;
  v_difficulty text;
  v_base numeric;
  v_points numeric := 0;
begin
  select highest_cleared_floor into v_old_highest
  from tower_progress where user_id = auth.uid() and category_id = p_category_id;

  insert into tower_progress (user_id, category_id, highest_cleared_floor, updated_at)
  values (auth.uid(), p_category_id, p_floor_index, now())
  on conflict (user_id, category_id) do update
    set highest_cleared_floor = greatest(tower_progress.highest_cleared_floor, excluded.highest_cleared_floor),
        updated_at = now();

  select is_global into v_is_global from categories where id = p_category_id;

  if v_is_global then
    select difficulty into v_difficulty
    from tower_floors
    where category_id = p_category_id and floor_index = p_floor_index;

    v_base := case v_difficulty
      when 'easy' then 0.3
      when 'hard' then 0.7
      else 0.5 -- 'normal' болон тодорхойгүй тохиолдол
    end;

    if v_old_highest is null or p_floor_index > v_old_highest then
      v_points := v_base; -- анх удаа дийлж байна
    else
      v_points := v_base / 10; -- дахин давалт
    end if;
    v_points := v_points * (case when p_flawless then 2 else 1 end);

    insert into user_points (user_id, balance, updated_at)
    values (auth.uid(), v_points, now())
    on conflict (user_id) do update set balance = user_points.balance + v_points, updated_at = now();
  end if;

  return v_points;
end;
$$;

grant execute on function record_floor_win(uuid, int, boolean) to authenticated;

-- 6) Achievement авахад автоматаар coin олгох (trigger) — хүнд/хөнгөнөөр нь
-- ялгаатай хэмжээгээр. user_achievements upsert(ignoreDuplicates) ашигладаг
-- тул давхар insert хийгдэхгүй, тиймээс trigger ч давхар өдөхгүй.
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
    when 'first_floor' then 15      -- хялбар — эхний алхам
    when 'flawless_floor' then 20   -- дунд зэрэг — анхаарал шаардана
    when 'duel_first_win' then 25   -- дунд-хүнд — жинхэнэ өрсөлдөгчийг ялах хэрэгтэй
    when 'tower_complete' then 30   -- хүнд — бүтэн цамхаг дийлэх хэрэгтэй
    when 'leaderboard_top1' then 30 -- хүнд — #1 байр авах хэрэгтэй
    else 15
  end;

  insert into user_points (user_id, balance, updated_at)
  values (new.user_id, v_points, now())
  on conflict (user_id) do update set balance = user_points.balance + v_points, updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_award_points_for_achievement on user_achievements;
create trigger trg_award_points_for_achievement
  after insert on user_achievements
  for each row execute function award_points_for_achievement();

-- 7) Дэлгүүрээс худалдаж авах / идэвхжүүлэх
create or replace function shop_purchase_item(p_item_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_price int;
  v_active boolean;
  v_balance int;
begin
  select price, is_active into v_price, v_active from shop_items where id = p_item_id;
  if v_price is null then
    raise exception 'Ийм эдлэл алга';
  end if;
  if not v_active then
    raise exception 'Энэ эдлэл дэлгүүрт байхгүй болсон байна';
  end if;
  if exists (select 1 from user_inventory where user_id = auth.uid() and item_id = p_item_id) then
    raise exception 'Та энэ эдлэлийг аль хэдийн худалдаж авсан байна';
  end if;

  select balance into v_balance from user_points where user_id = auth.uid();
  if coalesce(v_balance, 0) < v_price then
    raise exception 'Оноо хүрэлцэхгүй байна';
  end if;

  update user_points set balance = balance - v_price, updated_at = now() where user_id = auth.uid();
  insert into user_inventory (user_id, item_id) values (auth.uid(), p_item_id);

  return coalesce(v_balance, 0) - v_price;
end;
$$;

grant execute on function shop_purchase_item(uuid) to authenticated;

create or replace function equip_item(p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_item_id is not null and not exists (select 1 from user_inventory where user_id = auth.uid() and item_id = p_item_id) then
    raise exception 'Танд энэ эдлэл алга';
  end if;
  update user_profiles set equipped_item_id = p_item_id where user_id = auth.uid();
end;
$$;

grant execute on function equip_item(uuid) to authenticated;

-- Тухайн тоглогчийн одоо идэвхжүүлсэн армор (Battle.jsx эхлэхдээ дуудна).
create or replace function get_my_equipped_armor()
returns table(item_id uuid, name text, icon text, armor_points int)
language sql
security definer
set search_path = public
stable
as $$
  select si.id, si.name, si.icon, si.armor_points
  from user_profiles up
  join shop_items si on si.id = up.equipped_item_id
  where up.user_id = auth.uid();
$$;

grant execute on function get_my_equipped_armor() to authenticated;

-- 8) Admin: дэлгүүрийн эдлэл удирдах
create or replace function admin_list_shop_items()
returns setof shop_items
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not exists (select 1 from app_admins where user_id = auth.uid()) then
    raise exception 'Зөвхөн админ эрхтэй';
  end if;
  return query select * from shop_items order by price asc;
end;
$$;

grant execute on function admin_list_shop_items() to authenticated;

create or replace function admin_upsert_shop_item(
  p_id uuid, p_name text, p_description text, p_icon text,
  p_armor_points int, p_price int, p_is_active boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not exists (select 1 from app_admins where user_id = auth.uid()) then
    raise exception 'Зөвхөн админ эрхтэй';
  end if;

  if p_id is null then
    insert into shop_items (name, description, icon, armor_points, price, is_active)
    values (p_name, p_description, p_icon, p_armor_points, p_price, p_is_active)
    returning id into v_id;
  else
    update shop_items set
      name = p_name, description = p_description, icon = p_icon,
      armor_points = p_armor_points, price = p_price, is_active = p_is_active
    where id = p_id
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

grant execute on function admin_upsert_shop_item(uuid, text, text, text, int, int, boolean) to authenticated;

create or replace function admin_delete_shop_item(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from app_admins where user_id = auth.uid()) then
    raise exception 'Зөвхөн админ эрхтэй';
  end if;
  delete from shop_items where id = p_id;
end;
$$;

grant execute on function admin_delete_shop_item(uuid) to authenticated;

-- 9) Анхны жишээ 3 эдлэл (хоосон дэлгүүр үлдэхээс сэргийлнэ; admin дараа нь
-- Admin dashboard-аас засаж/нэмж/устгаж болно). Хүснэгт хоосон үед л нэмнэ.
insert into shop_items (name, description, icon, armor_points, price, is_active)
select * from (values
  ('Арьсан хуяг', 'Тулаан бүрд 1 удаагийн буруу хариултаас хамгаална.', '🛡️', 1, 40, true),
  ('Төмөр хуяг', 'Тулаан бүрд 2 удаагийн буруу хариултаас хамгаална.', '🛡️', 2, 90, true),
  ('Драконы хуяг', 'Тулаан бүрд 3 удаагийн буруу хариултаас хамгаална.', '🛡️', 3, 160, true)
) as v(name, description, icon, armor_points, price, is_active)
where not exists (select 1 from shop_items);
